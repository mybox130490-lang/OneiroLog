// symbolInsight.js — «обнаружение» личного смысла символа из твоей же истории.
// Идея: человек не обязан знать, что для него значит образ. Приложение смотрит,
// с какими чувствами этот образ у него обычно соседствует, и подсказывает наклон.

import { extractEntities } from './extract.js'

function entryEntities(e) {
  return e.entities && e.entities.vector ? e.entities : extractEntities(e.text || '')
}

function norm(w) {
  return (w || '').toLowerCase().replace(/ё/g, 'е')
}

// Анализ одного образа по всем записям, где он встречается.
export function analyzeSymbol(entries, word) {
  const target = norm(word)
  const matched = []
  for (const e of entries) {
    const ent = entryEntities(e)
    const has = (ent.vector || []).some((v) => norm(v.word) === target)
    if (has) matched.push({ e, ent })
  }

  const emoMap = new Map()
  let neg = 0, neu = 0, res = 0
  for (const { e, ent } of matched) {
    for (const em of ent.emotions || []) {
      if (!emoMap.has(em.word)) emoMap.set(em.word, { word: em.word, count: 0, valence: em.valence })
      emoMap.get(em.word).count += 1
    }
    const v = e.valence || ent.valence
    if (v === 'negative') neg += 1
    else if (v === 'resource') res += 1
    else neu += 1
  }

  const coEmotions = [...emoMap.values()].sort((a, b) => b.count - a.count).slice(0, 4)
  let leaning = 'neutral'
  if (res > neg && res >= neu) leaning = 'resource'
  else if (neg > res && neg >= neu) leaning = 'negative'

  return {
    word: target,
    count: matched.length,
    coEmotions,
    topEmotion: coEmotions[0] || null,
    valenceDist: { neg, neu, res },
    leaning
  }
}

// Человеческая формулировка подсказки по инсайту.
export function insightSentence(insight) {
  if (!insight || insight.count === 0) return null
  const times = `${insight.count} ${plural(insight.count, 'раз', 'раза', 'раз')}`
  if (insight.topEmotion) {
    const lean =
      insight.leaning === 'resource' ? ' — для тебя это ближе к ресурсу и теплу'
        : insight.leaning === 'negative' ? ' — для тебя это ближе к напряжению, чем к опоре'
          : ''
    return `Появлялся ${times}, и чаще всего рядом было чувство «${insight.topEmotion.word}»${lean}.`
  }
  return `Появлялся ${times}. Ярких сопутствующих чувств пока не видно — прислушайся к себе.`
}

// Кандидаты на определение: повторяющиеся образы, которых ещё нет в личном словаре.
export function findSymbolCandidates(entries, personalSymbols = {}, minCount = 3) {
  const map = new Map()
  for (const e of entries) {
    const ent = entryEntities(e)
    const imgs = [
      ...(ent.objects || []),
      ...(ent.characters || []),
      ...(ent.places || []),
      ...(ent.colors || [])
    ]
    const seen = new Set()
    for (const it of imgs) {
      if (seen.has(it.word)) continue
      seen.add(it.word)
      map.set(it.word, (map.get(it.word) || 0) + 1)
    }
  }

  const out = []
  for (const [word, count] of map) {
    if (count < minCount) continue
    if (personalSymbols[word] || personalSymbols[norm(word)]) continue
    out.push({ word, count, insight: analyzeSymbol(entries, word) })
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 8)
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
