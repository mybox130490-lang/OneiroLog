// Timeline.jsx — лента записей по датам с трактовками.

import { useState } from 'react'
import { useEntries } from '../state/store.js'
import { moonPhase4 } from '../lib/lunar.js'
import Interpretation from './Interpretation.jsx'

const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

function fmtDate(d) {
  const [y, m, day] = d.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, day))
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${day} ${months[m - 1]} · ${WD[date.getUTCDay()]}`
}

const VAL_CLASS = { negative: 'val-neg', resource: 'val-res', neutral: 'val-neu' }

export default function Timeline() {
  const { entries, deleteEntry } = useEntries()
  const [open, setOpen] = useState(null)

  if (entries.length === 0) {
    return (
      <div className="screen">
        <div className="screen-head"><h1>Лента</h1></div>
        <div className="card empty">Пока пусто. Начни с вкладки «Сегодня» — запиши первый день.</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Лента дней</h1>
        <p className="muted">{entries.length} записей. Нажми на день, чтобы увидеть трактовку.</p>
      </div>

      <div className="timeline">
        {entries.map((e) => {
          const isOpen = open === e.id
          const arche = e.interpretation?.archetypes || []
          return (
            <div key={e.id} className="card tl-card">
              <button className="tl-head" onClick={() => setOpen(isOpen ? null : e.id)}>
                <span className={`val-dot ${VAL_CLASS[e.valence] || 'val-neu'}`} />
                <span className="tl-date">{moonPhase4(e.date).glyph} {fmtDate(e.date)}</span>
                {e.mode === 'exercise' && <span className="tl-tag">упражнение</span>}
                <span className="tl-snippet">{e.text.slice(0, 90)}{e.text.length > 90 ? '…' : ''}</span>
                <span className="tl-toggle">{isOpen ? '−' : '+'}</span>
              </button>

              {arche.length > 0 && !isOpen && (
                <div className="archetypes mini">
                  {arche.slice(0, 4).map((a, i) => <span key={i} className="archetype-chip sm">{a.name}</span>)}
                </div>
              )}

              {isOpen && (
                <div className="tl-body">
                  <p className="tl-full">{e.text}</p>
                  {e.interpretation
                    ? <Interpretation result={e.interpretation} />
                    : <p className="muted small">Трактовка не сохранена для этой записи.</p>}
                  <button className="btn btn-ghost small danger" onClick={() => { deleteEntry(e.id); setOpen(null) }}>
                    Удалить запись
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
