// patterns.js — кросс-дневная аналитика записей.
// Это сердце механики развития: повторяющийся образ = указатель на колею,
// в которой застряло сознание. Бот подсвечивает колею.

import { extractEntities, BLIND_ZONE_CATEGORIES, categoryMentioned } from './extract.js'
import { moonPhase, moonPhase4 } from './lunar.js'

const DAY = 86400000

function parseDay(d) {
  // 'YYYY-MM-DD' → миллисекунды UTC полуночи
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function dayDiff(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / DAY)
}

const WEEKDAYS = [
  { name: 'воскресенье', phrase: 'по воскресеньям' }, // getUTCDay: 0 = Sun
  { name: 'понедельник', phrase: 'по понедельникам' },
  { name: 'вторник', phrase: 'по вторникам' },
  { name: 'среда', phrase: 'по средам' },
  { name: 'четверг', phrase: 'по четвергам' },
  { name: 'пятница', phrase: 'по пятницам' },
  { name: 'суббота', phrase: 'по субботам' }
]

function weekdayIndex(d) {
  return new Date(parseDay(d)).getUTCDay()
}

// Гарантируем, что у записи есть entities (на старых записях могло не быть).
function ensureEntities(entry) {
  if (entry.entities && entry.entities.vector) return entry.entities
  return extractEntities(entry.text || '')
}

function aggregate(entries, picker) {
  const map = new Map()
  for (const e of entries) {
    const ent = ensureEntities(e)
    const items = picker(ent) || []
    for (const it of items) {
      const key = it.word
      if (!key) continue
      if (!map.has(key)) {
        map.set(key, { word: key, count: 0, weight: 0, category: it.category || 'other', days: new Set(), valence: it.valence })
      }
      const rec = map.get(key)
      rec.count += it.count || 1
      rec.weight += it.weight || it.count || 1
      rec.days.add(e.date)
    }
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight)
}

// Самый длинный непрерывный ряд дат (календарных дней подряд).
function longestRun(daySet) {
  const dates = [...daySet].sort()
  let best = { len: 0, start: null, end: null }
  let cur = { len: 0, start: null, end: null }
  let prev = null
  for (const d of dates) {
    if (prev && dayDiff(prev, d) === 1) {
      cur.len += 1
      cur.end = d
    } else {
      cur = { len: 1, start: d, end: d }
    }
    if (cur.len > best.len) best = { ...cur }
    prev = d
  }
  return best
}

// Цикл по дню недели: образ всплывает в один и тот же день недели.
function weekdayCycle(daySet) {
  const dates = [...daySet]
  if (dates.length < 3) return null
  const counts = {}
  for (const d of dates) {
    const wd = weekdayIndex(d)
    counts[wd] = (counts[wd] || 0) + 1
  }
  let bestWd = null, bestCount = 0
  for (const wd of Object.keys(counts)) {
    if (counts[wd] > bestCount) { bestCount = counts[wd]; bestWd = Number(wd) }
  }
  // цикл считаем значимым, если ≥3 совпадений и это ≥60% появлений образа
  if (bestCount >= 3 && bestCount / dates.length >= 0.6) {
    return { weekday: bestWd, phrase: WEEKDAYS[bestWd].phrase, count: bestCount }
  }
  return null
}

export function directionIndex(entries) {
  let negative = 0, neutral = 0, resource = 0
  for (const e of entries) {
    const v = e.valence || ensureEntities(e).valence
    if (v === 'negative') negative += 1
    else if (v === 'resource') resource += 1
    else neutral += 1
  }
  const total = entries.length || 1
  const score = (resource - negative) / total // -1..1
  return {
    negative, neutral, resource, total: entries.length,
    negativePct: Math.round((negative / total) * 100),
    neutralPct: Math.round((neutral / total) * 100),
    resourcePct: Math.round((resource / total) * 100),
    score: Math.round(score * 100) / 100
  }
}

// Серия дней подряд с записями, заканчивающаяся последней записью.
export function habitStreak(entries) {
  if (!entries.length) return 0
  const days = [...new Set(entries.map((e) => e.date))].sort().reverse()
  let streak = 1
  for (let i = 1; i < days.length; i++) {
    if (dayDiff(days[i], days[i - 1]) === 1) streak += 1
    else break
  }
  return streak
}

// Закономерности по фазам Луны: направленность и частые чувства в каждой фазе.
const PHASE_ORDER = ['new', 'waxing', 'full', 'waning']
export function analyzeLunar(entries) {
  if (entries.length < 4) return { enough: false, phases: [], notes: [] }

  const acc = {}
  PHASE_ORDER.forEach((k) => (acc[k] = { neg: 0, neu: 0, res: 0, emo: new Map(), img: new Map(), count: 0, name: '', glyph: '', sleepSum: 0, sleepN: 0, energySum: 0, energyN: 0 }))
  let totalNeg = 0, totalRes = 0, total = 0
  let totSleepSum = 0, totSleepN = 0, totEnergySum = 0, totEnergyN = 0
  const imgTotals = new Map() // образ → всего за период
  // пары для корреляций
  const seSleep = [], seEnergy = [] // сон↔энергия (обе заданы)
  const smSleep = [], smIllum = []  // сон↔освещённость луны (сон задан)

  for (const e of entries) {
    const ph = moonPhase4(e.date)
    const a = acc[ph.key]
    a.name = ph.name; a.glyph = ph.glyph; a.count += 1
    const ent = ensureEntities(e)
    const v = e.valence || ent.valence
    if (v === 'negative') { a.neg += 1; totalNeg += 1 }
    else if (v === 'resource') { a.res += 1; totalRes += 1 }
    else a.neu += 1
    if (typeof e.sleep === 'number') { a.sleepSum += e.sleep; a.sleepN += 1; totSleepSum += e.sleep; totSleepN += 1 }
    if (typeof e.energy === 'number') { a.energySum += e.energy; a.energyN += 1; totEnergySum += e.energy; totEnergyN += 1 }
    if (typeof e.sleep === 'number' && typeof e.energy === 'number') { seSleep.push(e.sleep); seEnergy.push(e.energy) }
    if (typeof e.sleep === 'number') { smSleep.push(e.sleep); smIllum.push(moonPhase(e.date).illumination) }
    for (const em of ent.emotions || []) a.emo.set(em.word, (a.emo.get(em.word) || 0) + 1)
    // образы (объекты/персонажи/места/цвета), по одному учёту на запись
    const imgs = [...(ent.objects || []), ...(ent.characters || []), ...(ent.places || []), ...(ent.colors || [])]
    const seen = new Set()
    for (const it of imgs) {
      if (seen.has(it.word)) continue
      seen.add(it.word)
      a.img.set(it.word, (a.img.get(it.word) || 0) + 1)
      imgTotals.set(it.word, (imgTotals.get(it.word) || 0) + 1)
    }
    total += 1
  }

  const overallNeg = totalNeg / total
  const overallRes = totalRes / total

  const phases = PHASE_ORDER.map((k) => {
    const a = acc[k]
    const top = [...a.emo.entries()].sort((x, y) => y[1] - x[1])[0]
    return {
      key: k, name: a.name || phaseName(k), glyph: a.glyph || phaseGlyph(k), count: a.count,
      negPct: a.count ? Math.round((a.neg / a.count) * 100) : 0,
      resPct: a.count ? Math.round((a.res / a.count) * 100) : 0,
      topEmotion: top ? top[0] : null,
      avgSleep: a.sleepN ? Math.round((a.sleepSum / a.sleepN) * 10) / 10 : null,
      avgEnergy: a.energyN ? Math.round((a.energySum / a.energyN) * 10) / 10 : null,
      sleepN: a.sleepN, energyN: a.energyN
    }
  })

  const ovSleep = totSleepN ? totSleepSum / totSleepN : null
  const ovEnergy = totEnergyN ? totEnergySum / totEnergyN : null

  const notes = []
  for (const p of phases) {
    if (p.count < 2) continue
    if (p.negPct / 100 - overallNeg > 0.2) {
      notes.push(`${p.glyph} Около фазы «${p.name}» у тебя заметнее тень${p.topEmotion ? ` (часто «${p.topEmotion}»)` : ''}.`)
    } else if (p.resPct / 100 - overallRes > 0.2) {
      notes.push(`${p.glyph} На фазе «${p.name}» у тебя больше ресурса${p.topEmotion ? ` (часто «${p.topEmotion}»)` : ''}.`)
    }
  }
  // сон и энергия по фазам
  for (const p of phases) {
    if (ovSleep != null && p.avgSleep != null && p.sleepN >= 2) {
      if (ovSleep - p.avgSleep >= 0.6) notes.push(`${p.glyph} На фазе «${p.name}» сон обычно хуже (≈${p.avgSleep}/5).`)
      else if (p.avgSleep - ovSleep >= 0.6) notes.push(`${p.glyph} На фазе «${p.name}» сон обычно лучше (≈${p.avgSleep}/5).`)
    }
    if (ovEnergy != null && p.avgEnergy != null && p.energyN >= 2) {
      if (ovEnergy - p.avgEnergy >= 0.6) notes.push(`${p.glyph} На фазе «${p.name}» энергии меньше (≈${p.avgEnergy}/5).`)
      else if (p.avgEnergy - ovEnergy >= 0.6) notes.push(`${p.glyph} На фазе «${p.name}» энергии больше (≈${p.avgEnergy}/5).`)
    }
  }

  // ——— связки «образ ↔ фаза» ———
  // образ считается привязанным к фазе, если в ней он встречается заметно чаще
  // ожидаемого (доля внутри фазы ≥ 1.8× средней доли) и набралось хотя бы 2 раза.
  const imageLinks = []
  for (const [word, totalCount] of imgTotals) {
    if (totalCount < 3) continue
    const rateAll = totalCount / total
    let best = null
    for (const k of PHASE_ORDER) {
      const a = acc[k]
      if (!a.count) continue
      const inPhase = a.img.get(word) || 0
      if (inPhase < 2) continue
      const rateP = inPhase / a.count
      if (rateP >= 1.8 * rateAll && (!best || inPhase > best.inPhase)) {
        best = { phase: k, inPhase }
      }
    }
    if (best) {
      imageLinks.push({
        word,
        phase: best.phase,
        name: phaseName(best.phase),
        glyph: phaseGlyph(best.phase),
        inPhase: best.inPhase,
        total: totalCount,
        text: `${phaseGlyph(best.phase)} «${word}» чаще на фазе «${phaseName(best.phase)}» (${best.inPhase} из ${totalCount})`
      })
    }
  }
  imageLinks.sort((a, b) => b.inPhase - a.inPhase)

  // ——— корреляции ———
  const correlations = {
    sleepEnergy: pearson(seSleep, seEnergy),
    sleepMoon: pearson(smSleep, smIllum)
  }
  if (correlations.sleepEnergy != null && seSleep.length >= 4 && Math.abs(correlations.sleepEnergy) >= 0.4) {
    notes.push(correlations.sleepEnergy > 0
      ? `🔗 Сон и энергия связаны: чем лучше спишь, тем больше сил (r=${correlations.sleepEnergy}).`
      : `🔗 Сон и энергия в противофазе (r=${correlations.sleepEnergy}).`)
  }
  if (correlations.sleepMoon != null && smSleep.length >= 4 && Math.abs(correlations.sleepMoon) >= 0.4) {
    notes.push(correlations.sleepMoon < 0
      ? `🌕 Сон хуже к полнолунию — заметна связь с луной (r=${correlations.sleepMoon}).`
      : `🌑 Сон лучше к полнолунию (r=${correlations.sleepMoon}).`)
  }

  return { enough: true, phases, notes, imageLinks: imageLinks.slice(0, 5), correlations }
}

// Коэффициент корреляции Пирсона (или null при нехватке данных).
function pearson(xs, ys) {
  const n = xs.length
  if (n < 3) return null
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return null
  return Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100
}

function phaseName(k) {
  return { new: 'Новолуние', waxing: 'Растущая Луна', full: 'Полнолуние', waning: 'Убывающая Луна' }[k]
}
function phaseGlyph(k) {
  return { new: '🌑', waxing: '🌓', full: '🌕', waning: '🌗' }[k]
}

// ——— ГЛАВНАЯ ФУНКЦИЯ ———
export function analyzePatterns(allEntries, { periodDays = null } = {}) {
  let entries = [...allEntries].sort((a, b) => (a.date < b.date ? -1 : 1))
  if (periodDays && entries.length) {
    const last = entries[entries.length - 1].date
    entries = entries.filter((e) => dayDiff(e.date, last) <= periodDays)
  }

  const empty = entries.length === 0

  const imagesAgg = aggregate(entries, (ent) => [
    ...(ent.objects || []),
    ...(ent.characters || []),
    ...(ent.places || []),
    ...(ent.colors || [])
  ])
  const emotionsAgg = aggregate(entries, (ent) => (ent.emotions || []).map((x) => ({ ...x, category: 'emotion' })))
  const actionsAgg = aggregate(entries, (ent) => ent.actions || [])

  const topImages = imagesAgg.slice(0, 5)
  const topEmotions = emotionsAgg.slice(0, 5)
  const topActions = actionsAgg.slice(0, 5)

  // Слова для пузыря: образы + эмоции, перемешанные по весу
  const bubbleWords = [...imagesAgg, ...emotionsAgg]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 18)
    .map((x) => ({ word: x.word, weight: x.weight, category: x.category, valence: x.valence }))

  // Серии и циклы по топ-образам и эмоциям
  const latest = entries.length ? entries[entries.length - 1].date : null
  const streaks = []
  const cycles = []
  for (const rec of [...topEmotions, ...topImages]) {
    const run = longestRun(rec.days)
    if (run.len >= 3) {
      const ended = latest && run.end !== latest && dayDiff(run.end, latest) >= 1
      streaks.push({
        word: rec.word,
        category: rec.category,
        len: run.len,
        start: run.start,
        end: run.end,
        ended,
        text: ended
          ? `«${rec.word}» — ${run.len} ${plural(run.len, 'день', 'дня', 'дней')} подряд, потом сменилось`
          : `«${rec.word}» — ${run.len} ${plural(run.len, 'день', 'дня', 'дней')} подряд`
      })
    }
    const cyc = weekdayCycle(rec.days)
    if (cyc) {
      cycles.push({
        word: rec.word,
        ...cyc,
        text: `«${rec.word}» всплывает ${cyc.phrase} (${cyc.count} ${plural(cyc.count, 'раз', 'раза', 'раз')})`
      })
    }
  }

  // Слепые зоны — категории, которых почти нет
  const blindZones = []
  if (entries.length >= 5) {
    for (const cat of BLIND_ZONE_CATEGORIES) {
      const mentions = entries.filter((e) => categoryMentioned(e.text || '', cat)).length
      if (mentions === 0) blindZones.push({ key: cat.key, label: cat.label, mentions: 0 })
      else if (mentions / entries.length < 0.1) blindZones.push({ key: cat.key, label: cat.label, mentions, rare: true })
    }
  }

  // Динамика направленности: первая половина vs вторая
  const dir = directionIndex(entries)
  let trend = null
  if (entries.length >= 6) {
    const mid = Math.floor(entries.length / 2)
    const first = directionIndex(entries.slice(0, mid))
    const second = directionIndex(entries.slice(mid))
    const delta = Math.round((second.score - first.score) * 100) / 100
    trend = { delta, direction: delta > 0.1 ? 'up' : delta < -0.1 ? 'down' : 'flat', first: first.score, second: second.score }
  }

  return {
    empty,
    count: entries.length,
    dateRange: entries.length ? { from: entries[0].date, to: latest } : null,
    topImages,
    topEmotions,
    topActions,
    bubbleWords,
    direction: dir,
    trend,
    streaks: streaks.slice(0, 6),
    cycles: cycles.slice(0, 4),
    blindZones,
    habitStreak: habitStreak(entries),
    lunar: analyzeLunar(entries)
  }
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

export { plural }
