// interpret.js — оркестратор трактовки.
// Порядок: безопасность (вето) → живой Claude (если включён) → локальный движок.
// Трактовка НЕ предсказывает будущее: она называет архетипы и задаёт вопросы.

import { extractEntities } from './extract.js'
import { matchSymbols, archetypesFromMatches, ARCHETYPES } from './symbols.js'
import { assessSafety } from './safety.js'
import { callLLM, extractJSON } from './claude.js'
import { oracleNote } from './lunar.js'

const SYSTEM_PROMPT = `Ты — «Снотворец», юнгианский толкователь. Тебе дают запись дня обычного человека.
Отнесись к ней КАК К СНУ и растолкуй по К.-Г. Юнгу.

Правила:
- Никаких предсказаний будущего, гороскопов, гаданий. Только язык смыслов и направления внимания.
- Опирайся на архетипы: Тень, Анима, Анимус, Самость, Великая Мать, Мудрый Старец, Трикстер, Персона, Герой, Божественное Дитя.
- Тон тёплый, уважительный, без эзотерического пафоса и без клинических диагнозов.
- Не патологизируй, не пугай. Подсвечивай ресурс и свободу выбора.
- Учитывай личный словарь символов пользователя, если он передан: его значения важнее общих.

ФОРМАТ ОТВЕТА — ТОЛЬКО простой человеческий текст с разделами в квадратных скобках.
Категорически НИКАКОГО JSON, НИКАКИХ фигурных скобок и кавычек-ключей. Строго так:

[ТРАКТОВКА]
2–4 абзаца живой трактовки, абзацы разделяй пустой строкой.

[АРХЕТИПЫ]
Название архетипа — почему он проявлен (по одной строке на архетип)

[ОБРАЗЫ]
Образ — что он значит здесь (по одной строке на образ)

[ВОПРОСЫ]
- вопрос 1
- вопрос 2
- вопрос 3`

function buildUserMessage(text, entities, personalSymbols, oracle) {
  const lines = []
  lines.push('ЗАПИСЬ ДНЯ:\n' + text.trim())

  const top = (arr, n = 6) => arr.slice(0, n).map((x) => x.word).join(', ')
  const e = entities
  const parts = []
  if (e.objects.length) parts.push('объекты: ' + top(e.objects))
  if (e.characters.length) parts.push('персонажи: ' + top(e.characters))
  if (e.places.length) parts.push('места: ' + top(e.places))
  if (e.colors.length) parts.push('цвета: ' + top(e.colors))
  if (e.actions.length) parts.push('действия: ' + top(e.actions))
  if (e.emotions.length) parts.push('эмоции: ' + e.emotions.slice(0, 6).map((x) => x.word).join(', '))
  if (parts.length) lines.push('\nВЫДЕЛЕННЫЕ ОБРАЗЫ:\n' + parts.join('\n'))

  const personalKeys = Object.keys(personalSymbols || {})
  if (personalKeys.length) {
    lines.push(
      '\nЛИЧНЫЙ СЛОВАРЬ СИМВОЛОВ (приоритет над общими значениями):\n' +
        personalKeys.map((k) => `${k} = ${personalSymbols[k].meaning}`).join('\n')
    )
  }
  if (oracle) lines.push('\nКОНТЕКСТ ОРАКУЛА (учитывай мягко, как фон):\n' + oracle.text)

  return lines.join('\n')
}

// ——— РАЗБОР ОТВЕТА ИИ ———
// Основной формат — текст с разделами [ТРАКТОВКА]/[АРХЕТИПЫ]/[ОБРАЗЫ]/[ВОПРОСЫ].
// Устойчив к обрыву ответа. Если вдруг пришёл JSON — аккуратно парсим его,
// а битый/обрезанный JSON НЕ показываем сырым (возвращаем null → локальный фоллбэк).

function detectHeader(line) {
  const m = line.trim().match(/^[#*>\[\s]*(тракт[а-яё]*|архетип[а-яё]*|образ[а-яё]*|символ[а-яё]*|вопрос[а-яё]*)[#*>\]\s:]*$/i)
  if (!m) return null
  const w = m[1].toLowerCase()
  if (w.startsWith('тракт')) return 'paragraphs'
  if (w.startsWith('архетип')) return 'archetypes'
  if (w.startsWith('образ') || w.startsWith('символ')) return 'symbols'
  if (w.startsWith('вопрос')) return 'questions'
  return null
}

function stripBullet(s) {
  return s.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').replace(/\*\*/g, '').trim()
}

function parseNamed(line) {
  const l = stripBullet(line)
  if (!l) return null
  const parts = l.split(/\s+[—–-]\s+|:\s+/)
  if (parts.length >= 2) return { name: parts[0].trim(), gloss: parts.slice(1).join(' — ').trim() }
  return { name: l, gloss: '' }
}

function parseSectioned(text) {
  const lines = text.split('\n')
  const buf = { paragraphs: [], archetypes: [], symbols: [], questions: [] }
  let cur = 'paragraphs' // до первого заголовка всё считаем трактовкой
  let sawHeader = false
  for (const line of lines) {
    const h = detectHeader(line)
    if (h) { cur = h; sawHeader = true; continue }
    buf[cur].push(line)
  }
  const paragraphs = buf.paragraphs.join('\n').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  const archetypes = buf.archetypes.map(parseNamed).filter(Boolean)
  const symbols = buf.symbols.map(parseNamed).filter(Boolean).map((x) => ({ label: x.name, meaning: x.gloss }))
  const questions = buf.questions.map(stripBullet).filter(Boolean)
  return { paragraphs, archetypes, symbols, questions, sawHeader }
}

export function parseLLMResponse(raw) {
  if (!raw) return null
  const trimmed = raw.trim()

  // защита: если модель всё же прислала JSON
  if (trimmed.startsWith('{') || trimmed.includes('"paragraphs"')) {
    const json = extractJSON(trimmed)
    if (json && Array.isArray(json.paragraphs) && json.paragraphs.length) {
      return {
        paragraphs: json.paragraphs,
        archetypes: (json.archetypes || []).map((a) => ({ name: a.name, gloss: a.why || a.gloss || '' })),
        symbols: json.symbols || [],
        questions: json.questions || []
      }
    }
    return null // битый/обрезанный JSON — пусть решает вызывающий
  }

  const sec = parseSectioned(trimmed)
  if (sec.paragraphs.length === 0 && !sec.sawHeader) {
    // совсем без структуры — берём весь текст как трактовку
    return { paragraphs: trimmed.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean), archetypes: [], symbols: [], questions: [] }
  }
  const { sawHeader, ...rest } = sec
  return rest
}

// ——— ЛОКАЛЬНЫЙ ДВИЖОК (fallback) ———

const OPENERS = [
  'Если прочитать сегодняшний день как сон, первым в глаза бросается',
  'Возьмём этот день как сновидение. Сильнее всего звучит',
  'В образности дня яснее всего проступает'
]

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length]
}

function seedFrom(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return h
}

function localInterpret(text, entities, personalSymbols) {
  const seed = seedFrom(text)
  const matches = matchSymbols(entities.vector, personalSymbols)
  const archetypes = archetypesFromMatches(matches)
  const paragraphs = []

  // Абзац 1 — что проступает
  const topSyms = matches.slice(0, 3)
  if (topSyms.length) {
    const list = topSyms
      .map((m) => `«${m.label}» (${m.meaning})`)
      .join('; ')
    paragraphs.push(`${pick(OPENERS, seed)} ${list}. В языке сна это не случайные детали, а узловые образы, через которые психика говорит с тобой.`)
  } else {
    paragraphs.push('Сегодня день говорит скорее тоном и состоянием, чем яркими образами. Это тоже сон — просто его язык сейчас ближе к настроению, чем к символу. Стоит прислушаться к тому, что осталось «между строк».')
  }

  // Абзац 2 — архетипы
  if (archetypes.length) {
    const a = archetypes[0]
    let p = `Сильнее всего проявлен архетип «${a.name}» — ${a.gloss} Его появление не диагноз, а приглашение: что-то в тебе просит внимания именно через этот образ.`
    if (archetypes[1]) p += ` Рядом слышен и «${archetypes[1].name}» — ${archetypes[1].gloss}`
    paragraphs.push(p)
  }

  // Абзац 3 — эмоциональная направленность
  const val = entities.valence
  if (val === 'negative') {
    paragraphs.push('Эмоциональный фон дня тяготеет к тени и напряжению. В юнгианской оптике это не «плохо»: тень несёт энергию, которую сознание долго не пускало. Вопрос не «как избавиться», а «что это хочет мне показать».')
  } else if (val === 'resource') {
    paragraphs.push('Сегодня много ресурса и тепла — это опора. Запомни, из чего именно складывалось это состояние: такие детали потом становятся якорями, к которым можно возвращаться сознательно.')
  } else if (entities.emotions.length) {
    paragraphs.push('Эмоциональный фон ровный, амбивалентный. Часто именно в таких «нейтральных» днях прячется самое важное — то, что мы привыкли не замечать.')
  }

  // Вопросы
  const questions = []
  if (archetypes[0]) questions.push(archetypes[0].question)
  if (topSyms[0]) {
    const a = ARCHETYPES[topSyms[0].archetype]
    if (a && a.question && a.question !== questions[0]) questions.push(a.question)
  }
  questions.push('Где в реальной жизни сегодня отзывается этот образ — и что бы изменилось, если посмотреть на него иначе?')

  return {
    source: 'local',
    paragraphs,
    archetypes: archetypes.map((a) => ({ key: a.key, name: a.name, gloss: a.gloss })),
    symbols: topSyms.map((m) => ({ label: m.label, meaning: m.meaning, personal: m.personal })),
    questions: questions.slice(0, 3)
  }
}

// ——— ГЛАВНАЯ ФУНКЦИЯ ———

export async function interpretEntry(entry, { settings = {}, personalSymbols = {} } = {}) {
  const text = entry.text || ''
  const entities = entry.entities || extractEntities(text)

  // 1. Безопасность — право вето
  const safety = assessSafety(text)
  if (safety.veto) {
    return {
      source: 'safety',
      flagged: true,
      severity: safety.severity,
      safety,
      paragraphs: [safety.message],
      archetypes: [],
      symbols: [],
      questions: []
    }
  }

  // Оракул (опционально)
  let oracle = null
  if (settings.oracleLayer) {
    const score = entities.valence === 'resource' ? 0.5 : entities.valence === 'negative' ? -0.5 : 0
    oracle = oracleNote(entry.date ? new Date(entry.date) : new Date(), score)
  }

  // 2. Живой Claude (если включён и есть ключ)
  let result = null
  if (settings.useAI && settings.apiKey) {
    try {
      const userMsg = buildUserMessage(text, entities, personalSymbols, oracle)
      const provider = settings.provider || 'anthropic'
      const model = provider === 'openrouter' ? settings.openrouterModel : settings.model
      const raw = await callLLM({
        provider,
        apiKey: settings.apiKey,
        model,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
        maxTokens: 2000,
        temperature: 0.85
      })
      const parsed = parseLLMResponse(raw)
      if (parsed && parsed.paragraphs.length) {
        result = { source: 'claude', ...parsed }
      } else {
        // не удалось разобрать (например, обрезанный JSON) — без артефактов уходим в локальный движок
        result = { ...localInterpret(text, entities, personalSymbols), aiError: 'Ответ ИИ пришёл в неполном формате — показан локальный разбор' }
      }
    } catch (e) {
      result = null
      // молча падаем на локальный движок; ошибку покажем флагом
      console.warn('Claude недоступен, используем локальный движок:', e.message)
      result = { ...localInterpret(text, entities, personalSymbols), aiError: e.message }
    }
  }

  if (!result) result = localInterpret(text, entities, personalSymbols)

  // 3. Мягкая поддержка при средней остроте (без вето)
  if (safety.flagged && !safety.veto) {
    result.flagged = true
    result.severity = safety.severity
    result.safety = safety
  }
  if (oracle) result.oracle = oracle

  return result
}
