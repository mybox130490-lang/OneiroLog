// PatternsPanel.jsx — экран «Паттерны».
// Сначала показывает мыльный пузырь с плавающими словами.
// Лопнул пузырь → раскрывается кросс-дневная аналитика.

import { useMemo, useState } from 'react'
import { useEntries, useSettings } from '../state/store.js'
import { analyzePatterns, plural } from '../lib/patterns.js'
import { moonPhase, nextPhases } from '../lib/lunar.js'
import PatternBubble from './PatternBubble.jsx'
import LunarChart from './LunarChart.jsx'

const PERIODS = [
  { key: '7', label: '7 дней', days: 7 },
  { key: '30', label: '30 дней', days: 30 },
  { key: 'all', label: 'всё время', days: null }
]

function DirectionBar({ d }) {
  return (
    <div className="dir">
      <div className="dir-bar">
        <span className="seg-neg" style={{ width: d.negativePct + '%' }} title={`негатив ${d.negativePct}%`} />
        <span className="seg-neu" style={{ width: d.neutralPct + '%' }} title={`нейтрально ${d.neutralPct}%`} />
        <span className="seg-res" style={{ width: d.resourcePct + '%' }} title={`ресурс ${d.resourcePct}%`} />
      </div>
      <div className="dir-legend">
        <span><i className="dot neg" /> тень {d.negativePct}%</span>
        <span><i className="dot neu" /> нейтрально {d.neutralPct}%</span>
        <span><i className="dot res" /> ресурс {d.resourcePct}%</span>
      </div>
    </div>
  )
}

function ChipRow({ title, items, kind }) {
  if (!items || items.length === 0) return null
  return (
    <div className="chip-row">
      <div className="block-title">{title}</div>
      <div className="chips">
        {items.map((it, i) => (
          <span key={i} className={`chip chip-${kind}`}>
            {it.word}<i className="chip-count">{it.count}</i>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PatternsPanel({ onExercise }) {
  const { entries } = useEntries()
  const { settings } = useSettings()
  const [period, setPeriod] = useState('all')
  const [popped, setPopped] = useState(false)

  const periodDays = PERIODS.find((p) => p.key === period)?.days
  const patterns = useMemo(() => analyzePatterns(entries, { periodDays }), [entries, periodDays])
  const ready = entries.length >= 3

  const trendArrow = patterns.trend
    ? patterns.trend.direction === 'up' ? '↗ к ресурсу'
      : patterns.trend.direction === 'down' ? '↘ к тени'
        : '→ ровно'
    : null

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Паттерны внимания</h1>
        <p className="muted">
          Повторяющийся образ — это колея, в которой застряло сознание. Вот твоя колея. Лопни пузырь, чтобы её увидеть.
        </p>
      </div>

      <div className="period-switch">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={period === p.key ? 'seg seg-on' : 'seg'}
            onClick={() => { setPeriod(p.key); setPopped(false) }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!popped ? (
        <div className="bubble-stage">
          <PatternBubble words={patterns.bubbleWords} ready={ready} light={settings.theme === 'eink'} onPop={() => setPopped(true)} />
          <p className="muted center">
            {ready
              ? `Внутри ${patterns.bubbleWords.length} образов за период · ${patterns.count} ${plural(patterns.count, 'запись', 'записи', 'записей')}`
              : `Пока ${entries.length} ${plural(entries.length, 'запись', 'записи', 'записей')}. Запиши ещё — образов станет больше.`}
          </p>
        </div>
      ) : (
        <div className="analytics">
          <div className="stat-strip">
            <div className="stat">
              <div className="stat-num">{patterns.habitStreak}</div>
              <div className="stat-lab">{plural(patterns.habitStreak, 'день', 'дня', 'дней')} подряд</div>
            </div>
            <div className="stat">
              <div className="stat-num">{patterns.count}</div>
              <div className="stat-lab">записей в периоде</div>
            </div>
            <div className="stat">
              <div className="stat-num">{patterns.direction.score > 0 ? '+' : ''}{patterns.direction.score}</div>
              <div className="stat-lab">индекс направленности</div>
            </div>
            {trendArrow && (
              <div className="stat">
                <div className="stat-num small">{trendArrow}</div>
                <div className="stat-lab">динамика</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="block-title">Индекс направленности сознания</div>
            <DirectionBar d={patterns.direction} />
          </div>

          <div className="card">
            <ChipRow title="Топ образов" items={patterns.topImages} kind="image" />
            <ChipRow title="Топ чувств" items={patterns.topEmotions} kind="emotion" />
            <ChipRow title="Топ действий" items={patterns.topActions} kind="action" />
          </div>

          {(patterns.streaks.length > 0 || patterns.cycles.length > 0) && (
            <div className="card">
              <div className="block-title">Колеи и циклы</div>
              <ul className="streaks">
                {patterns.streaks.map((s, i) => (
                  <li key={'s' + i}><span className="streak-dot" /> {s.text}</li>
                ))}
                {patterns.cycles.map((c, i) => (
                  <li key={'c' + i}><span className="cycle-dot" /> {c.text}</li>
                ))}
              </ul>
            </div>
          )}

          {patterns.blindZones.length > 0 && (
            <div className="card blindzones">
              <div className="block-title">Слепые зоны — о чём ты почти не говоришь</div>
              <p className="muted small">
                Это не упрёк. То, что сознание обходит молчанием, часто точнее любого образа.
              </p>
              <div className="chips">
                {patterns.blindZones.map((z, i) => (
                  <span key={i} className="chip chip-blind">{z.label}{z.rare ? ' · редко' : ''}</span>
                ))}
              </div>
            </div>
          )}

          {patterns.lunar?.enough && (
            <div className="card lunar-card">
              <div className="block-title">Луна · закономерности по фазам</div>
              <div className="moon-now">
                Сейчас: {moonPhase().name}, освещённость {moonPhase().illumination}%
                {(() => {
                  const np = nextPhases()
                  const fmt = (ms) => new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
                  return (
                    <div className="moon-next">
                      {np.daysToFull != null && <span>🌕 полнолуние {fmt(np.full)} (через {np.daysToFull} дн.)</span>}
                      {np.daysToNew != null && <span>🌑 новолуние {fmt(np.newMoon)} (через {np.daysToNew} дн.)</span>}
                    </div>
                  )
                })()}
              </div>
              <div className="moon-grid">
                {patterns.lunar.phases.map((p) => (
                  <div key={p.key} className={`moon-cell ${p.count === 0 ? 'dim' : ''}`}>
                    <div className="moon-glyph">{p.glyph}</div>
                    <div className="moon-name">{p.name}</div>
                    <div className="moon-meta">{p.count} {plural(p.count, 'запись', 'записи', 'записей')}</div>
                    {p.count > 0 && (
                      <div className="moon-bar">
                        <span className="seg-neg" style={{ width: p.negPct + '%' }} />
                        <span className="seg-res" style={{ width: p.resPct + '%' }} />
                      </div>
                    )}
                    {p.topEmotion && <div className="moon-emo">чаще: {p.topEmotion}</div>}
                    {(p.avgSleep != null || p.avgEnergy != null) && (
                      <div className="moon-se">
                        {p.avgSleep != null && <span>😴{p.avgSleep}</span>}
                        {p.avgEnergy != null && <span>⚡{p.avgEnergy}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <LunarChart phases={patterns.lunar.phases} />

              {patterns.lunar.notes.length > 0 && (
                <ul className="streaks">
                  {patterns.lunar.notes.map((n, i) => (
                    <li key={i}><span className="cycle-dot" /> {n}</li>
                  ))}
                </ul>
              )}

              {patterns.lunar.imageLinks?.length > 0 && (
                <div className="moon-links">
                  <div className="block-title">Образы и фазы</div>
                  <ul className="streaks">
                    {patterns.lunar.imageLinks.map((l, i) => (
                      <li key={i}><span className="streak-dot" /> {l.text}</li>
                    ))}
                  </ul>
                </div>
              )}

              {patterns.lunar.notes.length === 0 && (patterns.lunar.imageLinks?.length || 0) === 0 && (
                <p className="muted small">Явных перекосов по фазам пока нет — закономерности проявятся с историей.</p>
              )}
            </div>
          )}

          <div className="row gap center">
            <button className="btn btn-primary" onClick={onExercise}>Собрать упражнение из этого</button>
            <button className="btn btn-ghost" onClick={() => setPopped(false)}>Свернуть пузырь заново</button>
          </div>
        </div>
      )}
    </div>
  )
}
