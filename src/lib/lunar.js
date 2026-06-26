// lunar.js — точный расчёт фазы Луны без внешних API.
// Используются формулы Жана Мееуса («Astronomical Algorithms»): низкоточная
// долгота Солнца (гл. 25) и долгота Луны с главными периодическими членами (гл. 47).
// Фаза определяется по элонгации Луны от Солнца — это учитывает реальные колебания
// орбиты (точность по времени фазы — лучше нескольких часов), а не линейную модель.

const SYNODIC = 29.53058867 // средний синодический месяц, дней
const DEG = Math.PI / 180

const PHASES = [
  { key: 'new', name: 'Новолуние', guidance: 'Время замысла и тишины. Хорошо начинать незаметное, не требуя сразу плодов.' },
  { key: 'waxing_crescent', name: 'Растущий серп', guidance: 'Первые ростки намерения. Поддержи начатое маленьким ежедневным шагом.' },
  { key: 'first_quarter', name: 'Первая четверть', guidance: 'Точка сопротивления и решения. Преодолей первую преграду, не отступай.' },
  { key: 'waxing_gibbous', name: 'Растущая Луна', guidance: 'Набор силы. Доводи начатое, уточняй детали, не разбрасывайся.' },
  { key: 'full', name: 'Полнолуние', guidance: 'Пик и ясность. Всё проявлено — заметь, что созрело и что переполнено.' },
  { key: 'waning_gibbous', name: 'Убывающая Луна', guidance: 'Время благодарности и отдачи. Поделись тем, что накопил.' },
  { key: 'last_quarter', name: 'Последняя четверть', guidance: 'Отпускание и пересмотр. Что пора завершить или простить?' },
  { key: 'waning_crescent', name: 'Убывающий серп', guidance: 'Покой и очищение. Отдохни, освободи место перед новым циклом.' }
]

function julianDay(date) {
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime()
  return t / 86400000 + 2440587.5
}
function norm360(x) {
  x %= 360
  return x < 0 ? x + 360 : x
}

// Истинная долгота Солнца (Meeus, гл. 25), градусы.
function sunLongitude(T) {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M)
  return norm360(L0 + C)
}

// Главные периодические члены долготы Луны: [коэф. ×1e-6°, D, M, M', F].
const MOON_TERMS = [
  [6288774, 0, 0, 1, 0], [1274027, 2, 0, -1, 0], [658314, 2, 0, 0, 0],
  [213618, 0, 0, 2, 0], [-185116, 0, 1, 0, 0], [-114332, 0, 0, 0, 2],
  [58793, 2, 0, -2, 0], [57066, 2, -1, -1, 0], [53322, 2, 0, 1, 0],
  [45758, 2, -1, 0, 0], [-40923, 0, 1, -1, 0], [-34720, 1, 0, 0, 0],
  [-30383, 0, 1, 1, 0], [15327, 2, 0, 0, -2], [-12528, 0, 0, 1, 2],
  [10980, 0, 0, 1, -2], [10675, 4, 0, -1, 0], [10034, 0, 0, 3, 0],
  [8548, 4, 0, -2, 0], [-7888, 2, 1, -1, 0], [-6766, 2, 1, 0, 0],
  [-5163, 1, 0, -1, 0], [4987, 1, 1, 0, 0], [4036, 2, -1, 1, 0],
  [3994, 2, 0, 2, 0], [3861, 4, 0, 0, 0], [3665, 2, 0, -3, 0]
]

// Долгота Луны (Meeus, гл. 47), градусы.
function moonLongitude(T) {
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T ** 3) / 538841 - (T ** 4) / 65194000
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T ** 3) / 545868 - (T ** 4) / 113065000
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T ** 3) / 24490000
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T ** 3) / 69699 - (T ** 4) / 14712000
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - (T ** 3) / 3526000 + (T ** 4) / 863310000
  const E = 1 - 0.002516 * T - 0.0000074 * T * T
  let sum = 0
  for (const [coeff, d, m, mp, f] of MOON_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG
    let term = coeff * Math.sin(arg)
    const am = Math.abs(m)
    if (am === 1) term *= E
    else if (am === 2) term *= E * E
    sum += term
  }
  return norm360(Lp + sum / 1e6)
}

export function moonPhase(date = new Date()) {
  const T = (julianDay(date) - 2451545.0) / 36525
  // элонгация Луны от Солнца: 0° — новолуние, 180° — полнолуние
  const elong = norm360(moonLongitude(T) - sunLongitude(T))
  const fraction = elong / 360
  const illumination = (1 - Math.cos(elong * DEG)) / 2
  const age = fraction * SYNODIC
  const idx = Math.floor(((fraction + 1 / 16) % 1) * 8) % 8
  const phase = PHASES[idx]

  return {
    age: Math.round(age * 10) / 10,
    fraction,
    illumination: Math.round(illumination * 100),
    ...phase
  }
}

// Элонгация Луны от Солнца в градусах (0=новолуние, 180=полнолуние).
function elongationDeg(date) {
  const T = (julianDay(date) - 2451545.0) / 36525
  return norm360(moonLongitude(T) - sunLongitude(T))
}
function signedDeg(a, target) {
  let d = (a - target) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}
// Ближайший момент, когда элонгация пересекает targetDeg по возрастанию.
function nextCrossing(fromMs, targetDeg) {
  const stepMs = 6 * 3600 * 1000
  let prevT = fromMs
  let prev = signedDeg(elongationDeg(new Date(prevT)), targetDeg)
  for (let t = fromMs + stepMs; t <= fromMs + 45 * 86400000; t += stepMs) {
    const cur = signedDeg(elongationDeg(new Date(t)), targetDeg)
    if (prev < 0 && cur >= 0 && cur - prev < 180) {
      let lo = prevT, hi = t
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (signedDeg(elongationDeg(new Date(mid)), targetDeg) < 0) lo = mid
        else hi = mid
      }
      return (lo + hi) / 2
    }
    prevT = t; prev = cur
  }
  return null
}

// Ближайшие новолуние и полнолуние + сколько дней до них.
export function nextPhases(fromDate = new Date()) {
  const fromMs = fromDate instanceof Date ? fromDate.getTime() : new Date(fromDate).getTime()
  const newMoon = nextCrossing(fromMs, 0)
  const full = nextCrossing(fromMs, 180)
  const day = 86400000
  return {
    newMoon,
    full,
    daysToNew: newMoon ? Math.round((newMoon - fromMs) / day) : null,
    daysToFull: full ? Math.round((full - fromMs) / day) : null
  }
}

// Огрублённая фаза до 4 корзин — для группировки записей и поиска закономерностей
// (восьми фаз слишком много при небольшой истории).
export function moonPhase4(date = new Date()) {
  const f = moonPhase(date).fraction
  if (f < 0.125 || f >= 0.875) return { key: 'new', name: 'Новолуние', glyph: '🌑', fraction: f }
  if (f < 0.375) return { key: 'waxing', name: 'Растущая Луна', glyph: '🌓', fraction: f }
  if (f < 0.625) return { key: 'full', name: 'Полнолуние', glyph: '🌕', fraction: f }
  return { key: 'waning', name: 'Убывающая Луна', glyph: '🌗', fraction: f }
}

// Короткое «напутствие оракула» — комбинирует фазу Луны с направленностью дня.
export function oracleNote(date, directionScore = 0) {
  const m = moonPhase(date)
  let tone
  if (directionScore > 0.25) tone = 'Твой внутренний свет сейчас на стороне ресурса — опирайся на него.'
  else if (directionScore < -0.25) tone = 'Сейчас тебя тянет в тень — это не приговор, а указатель, куда направить заботу.'
  else tone = 'Ты в равновесии — хорошее время мягко выбрать направление.'
  return {
    moon: m,
    text: `${m.name} (освещённость ${m.illumination}%). ${m.guidance} ${tone}`
  }
}
