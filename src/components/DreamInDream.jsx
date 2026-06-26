// DreamInDream.jsx — два иммерсивных режима:
//  • «Сон во сне» — месячная рекурсивная трактовка (этап жизни как единый сон).
//  • «Сон наяву» (/dream_now) — трактовка текущей реальности как части сна.

import { useState, useMemo } from 'react'
import { useEntries, useSettings, usePersonalSymbols, todayISO } from '../state/store.js'
import { analyzePatterns } from '../lib/patterns.js'
import { extractEntities } from '../lib/extract.js'
import { interpretEntry } from '../lib/interpret.js'
import Interpretation from './Interpretation.jsx'

function currentMonth() {
  return todayISO().slice(0, 7)
}

export default function DreamInDream() {
  const { entries } = useEntries()
  const { settings } = useSettings()
  const { symbols } = usePersonalSymbols()
  const [tab, setTab] = useState('month')

  // ——— Сон во сне (месяц) ———
  const [month, setMonth] = useState(currentMonth())
  const [monthResult, setMonthResult] = useState(null)
  const [monthBusy, setMonthBusy] = useState(false)
  const monthEntries = useMemo(() => entries.filter((e) => e.date.startsWith(month)), [entries, month])

  async function readMonth() {
    if (monthEntries.length < 3) return
    setMonthBusy(true)
    setMonthResult(null)
    const p = analyzePatterns(monthEntries, {})
    const imgs = p.topImages.map((x) => x.word).join(', ')
    const emos = p.topEmotions.map((x) => x.word).join(', ')
    const snippets = monthEntries.slice(0, 3).map((e) => `«${e.text.slice(0, 80)}»`).join('; ')
    const text =
      `Это сводный сон целого месяца (${month}). За месяц чаще всего повторялись образы: ${imgs || '—'}. ` +
      `Главные чувства: ${emos || '—'}. Фрагменты дней: ${snippets}. ` +
      `Колеи внимания: ${p.streaks.map((s) => s.text).join('; ') || 'явных нет'}. ` +
      `Прочитай весь месяц как один большой сон и скажи, какой жизненный этап он описывает.`
    const synthetic = { date: month + '-15', text, entities: extractEntities(text), valence: p.direction.score < -0.2 ? 'negative' : p.direction.score > 0.2 ? 'resource' : 'neutral' }
    try {
      const r = await interpretEntry(synthetic, { settings, personalSymbols: symbols })
      setMonthResult(r)
    } finally {
      setMonthBusy(false)
    }
  }

  // ——— Сон наяву (/dream_now) ———
  const [nowText, setNowText] = useState('')
  const [nowResult, setNowResult] = useState(null)
  const [nowBusy, setNowBusy] = useState(false)

  async function readNow() {
    if (nowText.trim().length < 3) return
    setNowBusy(true)
    setNowResult(null)
    const entry = { date: todayISO(), text: nowText.trim(), mode: 'dream_now', entities: extractEntities(nowText) }
    try {
      const r = await interpretEntry(entry, { settings, personalSymbols: symbols })
      setNowResult(r)
    } finally {
      setNowBusy(false)
    }
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Сон во сне</h1>
        <p className="muted">Реальность — тоже текст. Его можно прочитать целым месяцем или прямо сейчас.</p>
      </div>

      <div className="mode-switch">
        <button className={tab === 'month' ? 'seg seg-on' : 'seg'} onClick={() => setTab('month')}>☾ Месяц как сон</button>
        <button className={tab === 'now' ? 'seg seg-on' : 'seg'} onClick={() => setTab('now')}>👁 Сон наяву</button>
      </div>

      {tab === 'month' ? (
        <div className="card">
          <div className="row between wrap">
            <label className="date-field">
              месяц&nbsp;
              <input type="month" value={month} max={currentMonth()} onChange={(e) => setMonth(e.target.value)} />
            </label>
            <span className="muted small">{monthEntries.length} записей в месяце</span>
          </div>
          <p className="muted">
            Раз в месяц Снотворец читает все заметки как единый «сон сна» и даёт трактовку жизненного этапа.
          </p>
          <button className="btn btn-primary" onClick={readMonth} disabled={monthBusy || monthEntries.length < 3}>
            {monthBusy ? 'Читаю месяц…' : monthEntries.length < 3 ? 'Нужно хотя бы 3 записи в месяце' : 'Прочитать месяц как сон'}
          </button>
          {monthBusy && <div className="shimmer" />}
          <Interpretation result={monthResult} />
        </div>
      ) : (
        <div className="card">
          <p className="muted">
            Посмотри вокруг — взгляд из окна, предметы на столе, свет. Опиши, что видишь прямо сейчас,
            и Снотворец растолкует это как часть сна.
          </p>
          <textarea
            value={nowText}
            onChange={(e) => setNowText(e.target.value)}
            placeholder="за окном серое небо и одинокий кран, на столе остывший чай…"
            rows={4}
          />
          <button className="btn btn-primary" onClick={readNow} disabled={nowBusy}>
            {nowBusy ? 'Толкую…' : 'Растолковать как сон наяву'}
          </button>
          {nowBusy && <div className="shimmer" />}
          <Interpretation result={nowResult} />
        </div>
      )}
    </div>
  )
}
