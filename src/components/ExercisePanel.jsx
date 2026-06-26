// ExercisePanel.jsx — экран «Упражнения»: задания по смене фокуса + замер до/после.

import { useMemo, useState } from 'react'
import { useEntries, useExercises, todayISO } from '../state/store.js'
import { analyzePatterns } from '../lib/patterns.js'
import { generateExercises, measureExerciseEffect, randomQuests } from '../lib/exercises.js'
import { extractEntities } from '../lib/extract.js'

const KIND_LABEL = {
  counter: 'смена колеи',
  blindzone: 'слепая зона',
  observe: 'наблюдение',
  baseline: 'базовое',
  quest: 'квест'
}

export default function ExercisePanel() {
  const { entries, addEntry } = useEntries()
  const { exercises, saveExercise, updateExercise } = useExercises()
  const [drafts, setDrafts] = useState({})
  const [quests, setQuests] = useState(() => randomQuests(3))

  const patterns = useMemo(() => analyzePatterns(entries, { periodDays: 14 }), [entries])
  const suggestions = useMemo(() => generateExercises(patterns), [patterns])

  const activeIds = new Set(exercises.map((e) => e.basedOn + '|' + e.text))

  // Записать наблюдение по заданию: оно становится записью дня (попадает в Ленту и аналитику).
  function recordObservation(ex) {
    const text = (drafts[ex.id] || '').trim()
    if (text.length < 2) return
    const entities = extractEntities(text)
    const entry = addEntry({
      date: todayISO(),
      text,
      mode: 'exercise',
      exerciseFocus: ex.focus,
      entities,
      valence: entities.valence
    })
    updateExercise(ex.id, { report: text, reportedAt: new Date().toISOString(), status: 'done', entryId: entry.id })
    setDrafts((d) => ({ ...d, [ex.id]: '' }))
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Упражнения по смене фокуса</h1>
        <p className="muted">
          Маленькие задания переключают «прожектор» внимания с привычной колеи на то, что выпадает из поля зрения.
        </p>
      </div>

      <div className="card">
        <div className="block-title">Предложено по твоим паттернам</div>
        {suggestions.map((ex) => {
          const taken = activeIds.has(ex.basedOn + '|' + ex.text)
          return (
            <div key={ex.id} className="exercise">
              <div className="ex-top">
                <span className={`ex-kind kind-${ex.kind}`}>{KIND_LABEL[ex.kind] || ex.kind}</span>
                <span className="muted small">{ex.basedOn}</span>
              </div>
              <p className="ex-text">{ex.text}</p>
              <button
                className="btn btn-primary small"
                disabled={taken}
                onClick={() => saveExercise(ex)}
              >
                {taken ? 'Взято в работу' : 'Взять это задание'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="row between">
          <div className="block-title">🎯 Квесты внимания</div>
          <button className="btn btn-ghost small" onClick={() => setQuests(randomQuests(3))}>🎲 другие</button>
        </div>
        <p className="muted small">Игровые задания — развернуть «прожектор» восприятия в неожиданную сторону. От простого до маловероятного.</p>
        {quests.map((q) => {
          const taken = activeIds.has(q.basedOn + '|' + q.text)
          return (
            <div key={q.id} className="exercise">
              <div className="ex-top">
                <span className="ex-kind kind-quest">квест</span>
              </div>
              <p className="ex-text">{q.text}</p>
              <button className="btn btn-primary small" disabled={taken} onClick={() => saveExercise(q)}>
                {taken ? 'Взято в работу' : 'Взять квест'}
              </button>
            </div>
          )
        })}
      </div>

      {exercises.length > 0 && (
        <div className="card">
          <div className="block-title">Мои задания</div>
          {exercises.map((ex) => {
            const effect = measureExerciseEffect(ex, entries)
            return (
              <div key={ex.id} className={`exercise ${ex.status === 'done' ? 'ex-done' : ''}`}>
                <div className="ex-top">
                  <span className={`ex-kind kind-${ex.kind}`}>{KIND_LABEL[ex.kind] || ex.kind}</span>
                  <span className="muted small">{(ex.createdAt || '').slice(0, 10)}</span>
                </div>
                <p className="ex-text">{ex.text}</p>

                {/* запись наблюдения по заданию → попадает в Ленту и аналитику */}
                {ex.report ? (
                  <div className="ex-report">
                    <div className="ex-report-label">📝 Твоё наблюдение · {(ex.reportedAt || '').slice(0, 10)} · записано в Ленту</div>
                    <p>{ex.report}</p>
                  </div>
                ) : (
                  <div className="ex-record">
                    <textarea
                      rows={2}
                      placeholder="Запиши, что заметил, выполняя задание (это сохранится как запись дня)…"
                      value={drafts[ex.id] || ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [ex.id]: e.target.value }))}
                    />
                    <button
                      className="btn btn-primary small"
                      disabled={(drafts[ex.id] || '').trim().length < 2}
                      onClick={() => recordObservation(ex)}
                    >
                      Записать наблюдение
                    </button>
                  </div>
                )}

                {effect && effect.ready ? (
                  <div className={`effect ${effect.improved ? 'effect-up' : effect.delta < -0.05 ? 'effect-down' : ''}`}>
                    Эффект «до/после»: индекс {effect.beforeScore} → {effect.afterScore}{' '}
                    ({effect.delta > 0 ? '+' : ''}{effect.delta}).{' '}
                    {effect.improved
                      ? 'Направленность сместилась к ресурсу 🌱'
                      : effect.delta < -0.05
                        ? 'Пока качнулось в тень — это тоже данные, не провал.'
                        : 'Почти без сдвига.'}
                  </div>
                ) : (
                  <div className="muted small">
                    Замер эффекта появится, когда наберётся неделя записей после задания.
                  </div>
                )}

                <div className="row gap">
                  {ex.status !== 'done' && (
                    <button className="btn btn-ghost small" onClick={() => updateExercise(ex.id, { status: 'done' })}>
                      Отметить выполненным
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
