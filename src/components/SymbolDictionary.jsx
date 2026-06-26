// SymbolDictionary.jsx — личный мифологический профиль (Улучшение 5).
// Личные значения символов перекрывают общую базу при толковании.
// Две дороги к личному смыслу:
//   • Автоопределение — приложение показывает, с какими чувствами образ у тебя соседствует.
//   • Мастер — 2-3 вопроса-зацепки, чтобы поймать твой смысл по реакции, а не «головой».

import { useState, useMemo } from 'react'
import { useEntries, usePersonalSymbols } from '../state/store.js'
import { SYMBOLS, lookupSymbol } from '../lib/symbols.js'
import { findSymbolCandidates, analyzeSymbol, insightSentence } from '../lib/symbolInsight.js'

const VALENCES = [
  { v: 'resource', label: 'ресурс / тепло' },
  { v: 'neutral', label: 'нейтрально' },
  { v: 'negative', label: 'тень / сжатие' }
]

function valDot(v) {
  return v === 'negative' ? 'val-neg' : v === 'resource' ? 'val-res' : 'val-neu'
}

// ——— Мастер обнаружения символа ———
function SymbolDiscovery({ word, insight, onSave, onClose }) {
  const base = lookupSymbol(word)
  const [completion, setCompletion] = useState('')
  const [memory, setMemory] = useState('')
  const [valence, setValence] = useState(insight?.leaning || 'neutral')

  function save() {
    const meaning = completion.trim()
    if (!meaning) return
    const full = memory.trim() ? `${meaning}. Связано с: ${memory.trim()}` : meaning
    onSave(word, full, valence)
  }

  return (
    <div className="discovery">
      <div className="discovery-head">
        <span className="discovery-word">«{word}»</span>
        <button className="x" onClick={onClose} title="Закрыть">×</button>
      </div>

      {/* что говорит общая база и твои данные */}
      <div className="insight-box">
        {base && <p className="insight-base">Архетипически: {base.meaning}</p>}
        {insight && insightSentence(insight) && (
          <p className="insight-data">📊 {insightSentence(insight)}</p>
        )}
        {insight?.coEmotions?.length > 1 && (
          <div className="chips small-chips">
            {insight.coEmotions.map((e, i) => (
              <span key={i} className={`chip chip-emotion`}>{e.word}<i className="chip-count">{e.count}</i></span>
            ))}
          </div>
        )}
      </div>

      {/* вопросы-зацепки */}
      <div className="discovery-q">
        <label>1. Закончи, не раздумывая: «{word} для меня — это…»</label>
        <input
          autoFocus
          placeholder="первое честное слово или фраза"
          value={completion}
          onChange={(e) => setCompletion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </div>

      <div className="discovery-q">
        <label>2. Первое или самое сильное воспоминание с этим образом? <span className="opt">(можно пропустить)</span></label>
        <input
          placeholder="когда ты впервые остро это почувствовал"
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
        />
      </div>

      <div className="discovery-q">
        <label>3. Что ближе, когда представляешь «{word}»?</label>
        <div className="valence-pick">
          {VALENCES.map((vl) => (
            <button
              key={vl.v}
              className={`vp ${valence === vl.v ? 'vp-on' : ''} vp-${vl.v}`}
              onClick={() => setValence(vl.v)}
            >
              {vl.label}
            </button>
          ))}
        </div>
        {insight?.leaning && insight.leaning !== 'neutral' && (
          <p className="muted small hint-pre">подсказка по твоим данным уже выбрана — поправь, если не так</p>
        )}
      </div>

      <div className="row gap">
        <button className="btn btn-primary small" onClick={save} disabled={!completion.trim()}>
          Сохранить мой символ
        </button>
        <button className="btn btn-ghost small" onClick={onClose}>Отмена</button>
      </div>
    </div>
  )
}

export default function SymbolDictionary() {
  const { entries } = useEntries()
  const { symbols, setPersonalSymbol, removePersonalSymbol } = usePersonalSymbols()
  const [root, setRoot] = useState('')
  const [meaning, setMeaning] = useState('')
  const [valence, setValence] = useState('neutral')
  const [showBase, setShowBase] = useState(false)
  const [discovering, setDiscovering] = useState(null) // { word, insight }

  const candidates = useMemo(() => findSymbolCandidates(entries, symbols, 3), [entries, symbols])
  const personalEntries = Object.entries(symbols)

  function add() {
    if (!root.trim() || !meaning.trim()) return
    setPersonalSymbol(root, meaning, valence)
    setRoot(''); setMeaning(''); setValence('neutral')
  }

  function handleSaved(word, m, v) {
    setPersonalSymbol(word, m, v)
    setDiscovering(null)
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Личный словарь символов</h1>
        <p className="muted">
          «Собака для тебя — верность, а для другого — опасность». Свой смысл не определяют головой —
          его узнаю́т по реакции и по тому, с чем образ у тебя соседствует. Снотворец помогает поймать его.
        </p>
      </div>

      {/* активный мастер */}
      {discovering && (
        <div className="card discovery-card">
          <SymbolDiscovery
            word={discovering.word}
            insight={discovering.insight}
            onSave={handleSaved}
            onClose={() => setDiscovering(null)}
          />
        </div>
      )}

      {/* кандидаты на определение */}
      <div className="card">
        <div className="block-title">Образы, которые просят определения</div>
        {candidates.length > 0 ? (
          <>
            <p className="muted small">
              Эти образы повторяются в твоих записях, но смысл для тебя ещё не зафиксирован.
            </p>
            <div className="candidates">
              {candidates.map((c) => (
                <div key={c.word} className="candidate">
                  <div className="cand-main">
                    <span className="cand-word">{c.word}</span>
                    <span className="cand-insight">{insightSentence(c.insight)}</span>
                  </div>
                  <button
                    className="btn btn-primary small"
                    onClick={() => setDiscovering({ word: c.word, insight: c.insight })}
                  >
                    Разобрать
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted small">
            Пока нет образов, которые повторялись бы 3+ раз — авто-подсказки появятся, когда накопится история записей.
            А разобрать любой символ по вопросам можно прямо сейчас: впиши его в форме ниже и нажми «Разобрать по вопросам».
          </p>
        )}
      </div>

      {/* мои символы */}
      {personalEntries.length > 0 && (
        <div className="card">
          <div className="block-title">Мои символы ({personalEntries.length})</div>
          <ul className="sym-list">
            {personalEntries.map(([k, v]) => (
              <li key={k}>
                <span className={`val-dot ${valDot(v.valence)}`} />
                <b>{k}</b> — {v.meaning}
                <button className="x" onClick={() => removePersonalSymbol(k)} title="Удалить">×</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ручное добавление */}
      <div className="card">
        <div className="block-title">Добавить вручную</div>
        <div className="sym-form">
          <input placeholder="символ (например: собака)" value={root} onChange={(e) => setRoot(e.target.value)} />
          <input placeholder="что он значит для тебя" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
          <select value={valence} onChange={(e) => setValence(e.target.value)}>
            {VALENCES.map((v) => <option key={v.v} value={v.v}>{v.label}</option>)}
          </select>
          <button className="btn btn-primary small" onClick={add}>Добавить</button>
        </div>
        <button
          className="btn btn-ghost small discover-link"
          disabled={!root.trim()}
          onClick={() => setDiscovering({ word: root.trim().toLowerCase(), insight: analyzeSymbol(entries, root.trim()) })}
        >
          {root.trim() ? `✦ Разобрать «${root.trim()}» по вопросам →` : '✦ Впиши символ выше — и разбери его по вопросам'}
        </button>
      </div>

      {/* базовый сонник */}
      <div className="card">
        <button className="btn btn-ghost small" onClick={() => setShowBase((s) => !s)}>
          {showBase ? 'Скрыть' : 'Показать'} базовый сонник ({Object.keys(SYMBOLS).length} символов)
        </button>
        {showBase && (
          <ul className="sym-list base">
            {Object.entries(SYMBOLS).slice(0, 40).map(([k, s]) => (
              <li key={k}><b>{s.label}</b> — {s.meaning}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
