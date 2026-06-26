// symbols.js — юнгианская база: архетипы и соответствия символов.
// Используется и локальным движком трактовки, и как контекст для Claude.

export const ARCHETYPES = {
  shadow: {
    key: 'shadow',
    name: 'Тень',
    gloss: 'вытесненное, непризнанное в себе — то, что мы не хотим видеть, но что несёт энергию.',
    question: 'Что в твоей жизни просит признания, если это появилось именно сейчас?'
  },
  anima: {
    key: 'anima',
    name: 'Анима',
    gloss: 'женское, чувствующее, связующее начало в психике; образ души.',
    question: 'Какое чувство или отношение ты сейчас держишь на расстоянии?'
  },
  animus: {
    key: 'animus',
    name: 'Анимус',
    gloss: 'мужское, действующее, разграничивающее начало; внутренний голос убеждений.',
    question: 'Какое решение или действие давно ждёт твоей воли?'
  },
  self: {
    key: 'self',
    name: 'Самость',
    gloss: 'центр целостности, к которому стягивается личность; ось «я».',
    question: 'Что для тебя сейчас означало бы быть целым, а не разорванным?'
  },
  greatMother: {
    key: 'greatMother',
    name: 'Великая Мать',
    gloss: 'питающее и поглощающее начало: забота, дом, корни — и зависимость, растворение.',
    question: 'Где ты сейчас нуждаешься в опоре, а где — в том, чтобы отделиться?'
  },
  wiseOldMan: {
    key: 'wiseOldMan',
    name: 'Мудрый Старец',
    gloss: 'архетип смысла и направляющего знания; внутренний наставник.',
    question: 'Какой совет ты бы дал себе сам, если бы доверял своей зрелости?'
  },
  trickster: {
    key: 'trickster',
    name: 'Трикстер',
    gloss: 'нарушитель правил, который ломает застывший порядок и открывает новое.',
    question: 'Какое правило в твоей жизни стоило бы нарушить, чтобы сдвинуться с места?'
  },
  persona: {
    key: 'persona',
    name: 'Персона',
    gloss: 'маска для мира, социальная роль; полезна, пока не подменяет лицо.',
    question: 'Где ты играешь роль, в которой тебе тесно?'
  },
  hero: {
    key: 'hero',
    name: 'Герой',
    gloss: 'импульс преодоления и инициации; выход за прежние границы.',
    question: 'Какой вызов ты обходишь стороной, хотя готов к нему больше, чем думаешь?'
  },
  child: {
    key: 'child',
    name: 'Божественное Дитя',
    gloss: 'новое, уязвимое и потенциальное начало; росток будущего.',
    question: 'Что новое в тебе ещё слишком хрупко, чтобы показать миру, но просит защиты?'
  }
}

// Соответствия: корень символа → архетип + смысл + персональный вопрос.
// meaning — короткое юнгианское толкование; не предсказание, а направление взгляда.
export const SYMBOLS = {
  змея: { label: 'Змея', archetype: 'shadow', meaning: 'трансформация, инстинкт, то, что пугает и одновременно лечит; сброс старой кожи.' },
  тень: { label: 'Тень', archetype: 'shadow', meaning: 'непрожитая, отвергнутая часть тебя, ищущая контакта.' },
  кровь: { label: 'Кровь', archetype: 'shadow', meaning: 'жизненная сила и жертва; что-то живое требует платы или признания.' },
  волк: { label: 'Волк', archetype: 'shadow', meaning: 'дикая, не прирученная часть психики; голод и витальность.' },
  паук: { label: 'Паук', archetype: 'greatMother', meaning: 'плетущая судьбу мать-творец; сеть связей, в которой можно расти или застрять.' },

  вода: { label: 'Вода', archetype: 'anima', meaning: 'бессознательное, чувства, текучесть; глубина, в которую страшно и нужно войти.' },
  море: { label: 'Море', archetype: 'anima', meaning: 'безбрежное бессознательное, материнская стихия эмоций.' },
  река: { label: 'Река', archetype: 'self', meaning: 'течение жизни, направление, которому стоит довериться.' },
  дождь: { label: 'Дождь', archetype: 'anima', meaning: 'высвобождение чувств, очищение, оплакивание и обновление.' },
  луна: { label: 'Луна', archetype: 'anima', meaning: 'женское, циклическое, интуитивное; ритм, который не подчиняется воле.' },

  дорога: { label: 'Дорога', archetype: 'self', meaning: 'путь индивидуации; вопрос направления и выбора.' },
  путь: { label: 'Путь', archetype: 'self', meaning: 'движение к себе; важно — кто и зачем идёт.' },
  мост: { label: 'Мост', archetype: 'self', meaning: 'переход между этапами, связь берегов сознания и бессознательного.' },
  лестница: { label: 'Лестница', archetype: 'self', meaning: 'движение между уровнями психики — вверх к смыслу или вниз к корням.' },
  поезд: { label: 'Поезд', archetype: 'self', meaning: 'заданный путь, коллективное движение; успеваешь ли ты на свой?' },

  дверь: { label: 'Дверь', archetype: 'hero', meaning: 'порог, возможность перехода; что ждёт по ту сторону — и почему она закрыта.' },
  ключ: { label: 'Ключ', archetype: 'hero', meaning: 'доступ к скрытому, разрешение войти в неизвестное.' },
  окно: { label: 'Окно', archetype: 'persona', meaning: 'точка зрения, граница между внутренним и внешним; на что ты смотришь.' },
  стекло: { label: 'Стекло', archetype: 'persona', meaning: 'прозрачная преграда: видно, но не дотянуться; хрупкость границы.' },
  зеркало: { label: 'Зеркало', archetype: 'self', meaning: 'встреча с собой, вопрос подлинности и самоузнавания.' },

  дом: { label: 'Дом', archetype: 'self', meaning: 'психика как целое; разные комнаты — разные части тебя.' },
  стена: { label: 'Стена', archetype: 'shadow', meaning: 'граница, защита или тупик; что она отделяет.' },
  комната: { label: 'Комната', archetype: 'self', meaning: 'отдельная область психики; что в ней хранится.' },
  замок: { label: 'Замок', archetype: 'persona', meaning: 'то, что заперто и охраняется; доступ ограничен — кем и зачем.' },

  огонь: { label: 'Огонь', archetype: 'hero', meaning: 'либидо, страсть, преображающая энергия; греет или разрушает.' },
  свет: { label: 'Свет', archetype: 'self', meaning: 'сознание, ясность, прозрение.' },
  солнце: { label: 'Солнце', archetype: 'self', meaning: 'центр, мужской принцип сознания, источник жизни.' },
  звезда: { label: 'Звезда', archetype: 'self', meaning: 'дальний ориентир, надежда, призвание.' },

  лес: { label: 'Лес', archetype: 'shadow', meaning: 'бессознательное, где легко заблудиться и где живут инстинкты.' },
  гора: { label: 'Гора', archetype: 'hero', meaning: 'цель, испытание, восхождение к большей точке зрения.' },
  дерево: { label: 'Дерево', archetype: 'self', meaning: 'рост, связь корней и кроны, ось личности.' },
  цветок: { label: 'Цветок', archetype: 'child', meaning: 'раскрытие, уязвимая красота, расцвет нового.' },

  птица: { label: 'Птица', archetype: 'self', meaning: 'дух, послание, стремление к свободе и высоте.' },
  кошка: { label: 'Кошка', archetype: 'anima', meaning: 'независимая женская энергия, интуиция, тайна.' },
  кот: { label: 'Кот', archetype: 'anima', meaning: 'своевольная интуитивная сторона, гуляющая сама по себе.' },
  собака: { label: 'Собака', archetype: 'animus', meaning: 'верность, инстинкт, проводник; преданность — кому и чему.' },
  рыба: { label: 'Рыба', archetype: 'self', meaning: 'содержание глубин, всплывающее в сознание; обновление.' },
  конь: { label: 'Конь', archetype: 'hero', meaning: 'витальная сила и влечение, несущие тебя; справляешься ли с поводьями.' },

  зеркальце: { label: 'Зеркало', archetype: 'self', meaning: 'самоузнавание.' },
  телефон: { label: 'Телефон', archetype: 'persona', meaning: 'связь и зависимость от чужого взгляда; чей звонок ты ждёшь.' },
  экран: { label: 'Экран', archetype: 'persona', meaning: 'посредник реальности, за которым легко спрятать лицо.' },
  деньги: { label: 'Деньги', archetype: 'persona', meaning: 'энергия обмена и ценности; чего ты на самом деле хочешь под этим.' },
  часы: { label: 'Часы', archetype: 'wiseOldMan', meaning: 'время, конечность, ритм; на что оно тратится.' },

  мать: { label: 'Мать', archetype: 'greatMother', meaning: 'исток, забота и зависимость; питающее и поглощающее.' },
  отец: { label: 'Отец', archetype: 'animus', meaning: 'закон, структура, авторитет; внутренний порядок.' },
  ребёнок: { label: 'Ребёнок', archetype: 'child', meaning: 'новое начало, спонтанность, уязвимость, будущее.' },
  старик: { label: 'Старик', archetype: 'wiseOldMan', meaning: 'мудрость, итог, направляющий смысл.' },
  старуха: { label: 'Старуха', archetype: 'greatMother', meaning: 'тёмная мудрость, завершение цикла, ведьма-целительница.' },
  незнакомец: { label: 'Незнакомец', archetype: 'shadow', meaning: 'непознанная часть тебя, приходящая под чужим лицом.' },
  женщина: { label: 'Женщина', archetype: 'anima', meaning: 'образ души, чувствующее начало.' },
  мужчина: { label: 'Мужчина', archetype: 'animus', meaning: 'действующее, разграничивающее начало.' },

  дорога_дом: { label: 'Дом', archetype: 'self', meaning: 'возвращение к себе.' }
}

// Найти символ по корню слова (слово уже нормализовано).
export function lookupSymbol(word) {
  const w = (word || '').toLowerCase().replace(/ё/g, 'е')
  // прямое совпадение метки
  for (const key of Object.keys(SYMBOLS)) {
    const k = key.replace(/ё/g, 'е')
    if (w === k || w.startsWith(k) || k.startsWith(w)) return { key, ...SYMBOLS[key] }
  }
  return null
}

// Сопоставить вектор дня с символами и архетипами.
// personalSymbols перекрывают общую базу (Улучшение 5).
export function matchSymbols(vector, personalSymbols = {}) {
  const matched = []
  const seen = new Set()
  for (const item of vector || []) {
    const word = item.word
    if (seen.has(word)) continue

    // личный словарь имеет приоритет
    const personal = personalSymbols[word] || personalSymbols[word?.replace(/ё/g, 'е')]
    if (personal) {
      matched.push({
        word, label: word, personal: true,
        meaning: personal.meaning, valence: personal.valence,
        archetype: null, weight: item.weight || 1
      })
      seen.add(word)
      continue
    }

    const sym = lookupSymbol(word)
    if (sym) {
      matched.push({
        word, label: sym.label, archetype: sym.archetype,
        archetypeName: ARCHETYPES[sym.archetype]?.name,
        meaning: sym.meaning, weight: item.weight || 1, personal: false
      })
      seen.add(word)
    }
  }
  return matched.sort((a, b) => (b.weight || 0) - (a.weight || 0))
}

// Уникальные архетипы из набора совпадений, по убыванию веса.
export function archetypesFromMatches(matches) {
  const acc = new Map()
  for (const m of matches) {
    if (!m.archetype) continue
    acc.set(m.archetype, (acc.get(m.archetype) || 0) + (m.weight || 1))
  }
  return [...acc.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => ARCHETYPES[key])
    .filter(Boolean)
}
