// DiaryEntry.jsx — экран «Сегодня»: ввод записи дня и её трактовка.
// Поддерживает свободный поток, режим анкеты и голосовой ввод (Web Speech API).

import { useState, useRef, useEffect, useMemo } from 'react'
import { useEntries, useSettings, usePersonalSymbols, todayISO } from '../state/store.js'
import { extractEntities } from '../lib/extract.js'
import { interpretEntry } from '../lib/interpret.js'
import { moonPhase, moonPhase4, nextPhases } from '../lib/lunar.js'
import Interpretation from './Interpretation.jsx'

const GUIDED_QUESTIONS = [
  { key: 'memorable', q: 'Что ярче всего запомнилось сегодня?' },
  { key: 'feeling', q: 'Какое чувство было главным?' },
  { key: 'image', q: 'Какой образ, цвет или звук всплывает, когда вспоминаешь день?' },
  { key: 'unsaid', q: 'Что осталось недосказанным или странным?' }
]

function useSpeech(onText) {
  const recRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    const rec = new SR()
    rec.lang = 'ru-RU'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      let chunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) chunk += e.results[i][0].transcript
      }
      if (chunk) onText(chunk.trim() + ' ')
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.stop() } catch {} }
  }, [onText])

  const toggle = () => {
    const rec = recRef.current
    if (!rec) return
    if (listening) { rec.stop(); setListening(false) }
    else { try { rec.start(); setListening(true) } catch {} }
  }
  return { listening, supported, toggle }
}

export default function DiaryEntry() {
  const { addEntry, updateEntry } = useEntries()
  const { settings } = useSettings()
  const { symbols } = usePersonalSymbols()

  const [mode, setMode] = useState('free') // free | guided
  const [text, setText] = useState('')
  const [answers, setAnswers] = useState({})
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [sleep, setSleep] = useState(0) // 0 = не указано, 1-5
  const [energy, setEnergy] = useState(0)

  const appendText = (chunk) => setText((t) => (t ? t + ' ' : '') + chunk)
  const speech = useSpeech(appendText)

  const moon = useMemo(() => ({ p: moonPhase4(date), ill: moonPhase(date).illumination }), [date])
  const np = useMemo(() => nextPhases(new Date(date)), [date])
  const fmtRu = (ms) => new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  function buildText() {
    if (mode === 'free') return text.trim()
    return GUIDED_QUESTIONS
      .filter((g) => (answers[g.key] || '').trim())
      .map((g) => `${g.q} ${answers[g.key].trim()}`)
      .join('\n')
  }

  async function handleInterpret() {
    const fullText = buildText()
    if (fullText.length < 3) {
      setError('Напиши хотя бы пару слов о дне.')
      return
    }
    setError('')
    setBusy(true)
    setResult(null)

    const entities = extractEntities(fullText)
    const entry = {
      date,
      text: fullText,
      mode,
      answers: mode === 'guided' ? answers : undefined,
      entities,
      valence: entities.valence,
      sleep: sleep || undefined,
      energy: energy || undefined
    }
    const saved = addEntry(entry)

    try {
      const interp = await interpretEntry(saved, { settings, personalSymbols: symbols })
      updateEntry(saved.id, { interpretation: interp })
      setResult(interp)
    } catch (e) {
      setError('Не удалось получить трактовку: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setText('')
    setAnswers({})
    setResult(null)
    setError('')
    setDate(todayISO())
    setSleep(0)
    setEnergy(0)
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Запиши свой день</h1>
        <p className="muted">
          Что запомнилось, что почувствовалось — без порядка и оценок. Снотворец прочтёт это как сон.
        </p>
      </div>

      <div className="card">
        <div className="row between wrap">
          <div className="mode-switch">
            <button className={mode === 'free' ? 'seg seg-on' : 'seg'} onClick={() => setMode('free')}>
              Свободный поток
            </button>
            <button className={mode === 'guided' ? 'seg seg-on' : 'seg'} onClick={() => setMode('guided')}>
              Анкета-подсказка
            </button>
          </div>
          <label className="date-field">
            дата&nbsp;
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <div className="moon-now entry-moon">
          <div>{moon.p.glyph} {moon.p.name} · освещённость {moon.ill}%</div>
          {(np.daysToFull != null || np.daysToNew != null) && (
            <div className="moon-next">
              {np.daysToFull != null && <span>🌕 полнолуние {fmtRu(np.full)} (через {np.daysToFull} дн.)</span>}
              {np.daysToNew != null && <span>🌑 новолуние {fmtRu(np.newMoon)} (через {np.daysToNew} дн.)</span>}
            </div>
          )}
        </div>

        <div className="se-row">
          <div className="se-field">
            <span className="se-label">😴 Качество сна</span>
            <div className="se-dots">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={`se-dot ${sleep >= n ? 'on' : ''}`} onClick={() => setSleep(sleep === n ? 0 : n)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="se-field">
            <span className="se-label">⚡ Энергия</span>
            <div className="se-dots">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={`se-dot ${energy >= n ? 'on' : ''}`} onClick={() => setEnergy(energy === n ? 0 : n)}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {mode === 'free' ? (
          <div className="input-area">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="видел чёрную кошку, устал, за окном сверкала вывеска…"
              rows={6}
            />
            {speech.supported && (
              <button
                className={`mic ${speech.listening ? 'mic-on' : ''}`}
                onClick={speech.toggle}
                title="Голосовой ввод"
                type="button"
              >
                {speech.listening ? '● запись…' : '🎙 надиктовать'}
              </button>
            )}
          </div>
        ) : (
          <div className="guided">
            {GUIDED_QUESTIONS.map((g) => (
              <div key={g.key} className="guided-q">
                <label>{g.q}</label>
                <input
                  value={answers[g.key] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [g.key]: e.target.value }))}
                  placeholder="…"
                />
              </div>
            ))}
            {speech.supported && (
              <button className={`mic ${speech.listening ? 'mic-on' : ''}`} onClick={speech.toggle} type="button">
                {speech.listening ? '● запись… (добавится в «Свободный поток»)' : '🎙 надиктовать'}
              </button>
            )}
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="row gap">
          <button className="btn btn-primary" onClick={handleInterpret} disabled={busy}>
            {busy ? 'Толкую…' : 'Растолковать день'}
          </button>
          {(result || text || Object.keys(answers).length > 0) && (
            <button className="btn btn-ghost" onClick={reset} disabled={busy}>Новая запись</button>
          )}
          {!settings.useAI && (
            <span className="muted small">движок: локальная база символов · включить живой ИИ — в Настройках</span>
          )}
        </div>
      </div>

      {busy && (
        <div className="card thinking">
          <div className="shimmer" />
          <p className="muted">Снотворец вслушивается в образы дня…</p>
        </div>
      )}

      <Interpretation result={result} />
    </div>
  )
}
