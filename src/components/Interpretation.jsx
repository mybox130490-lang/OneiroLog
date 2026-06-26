// Interpretation.jsx — карточка трактовки (архетипы + абзацы + вопросы).
// Умеет показывать и страховочное сообщение слоя безопасности.

function ResourceLinks({ resources }) {
  return (
    <ul className="resources">
      {resources.map((r, i) => {
        const isPhone = /[\d-]{3,}/.test(r.value) && !r.value.includes('.')
        const digits = r.value.replace(/[^\d+]/g, '')
        return (
          <li key={i}>
            <span className="res-label">{r.label}:</span>{' '}
            {isPhone ? (
              <a className="res-link" href={`tel:${digits}`}>{r.value}</a>
            ) : (
              <span className="res-link">{r.value}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const SOURCE_BADGE = {
  claude: { label: 'живой ИИ', cls: 'src-ai' },
  local: { label: 'локальный движок', cls: 'src-local' },
  safety: { label: 'забота', cls: 'src-safety' }
}

export default function Interpretation({ result }) {
  if (!result) return null

  // Вето безопасности — заменяет трактовку
  if (result.source === 'safety') {
    const s = result.safety || {}
    return (
      <div className="card safety-card">
        <div className="safety-title">🤍 {s.title || 'Сделаем паузу'}</div>
        {(result.paragraphs || [s.message]).map((p, i) => (
          <p key={i} className="safety-text">{p}</p>
        ))}
        {s.resources && <ResourceLinks resources={s.resources} />}
      </div>
    )
  }

  const badge = SOURCE_BADGE[result.source] || SOURCE_BADGE.local

  return (
    <div className="card interpretation">
      <div className="interp-head">
        <span className={`src-badge ${badge.cls}`}>{badge.label}</span>
        {result.aiError && (
          <span className="ai-error" title={result.aiError}>ИИ был недоступен — показан локальный движок</span>
        )}
      </div>

      {/* мягкая поддержка при средней остроте */}
      {result.safety && result.severity === 'medium' && (
        <div className="support-banner">
          <strong>{result.safety.title}</strong>
          <p>{result.safety.message}</p>
          {result.safety.resources && <ResourceLinks resources={result.safety.resources} />}
        </div>
      )}

      {result.archetypes && result.archetypes.length > 0 && (
        <div className="archetypes">
          {result.archetypes.map((a, i) => (
            <span key={i} className="archetype-chip" title={a.gloss}>{a.name}</span>
          ))}
        </div>
      )}

      <div className="interp-body">
        {result.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {result.symbols && result.symbols.length > 0 && (
        <div className="symbols-block">
          <div className="block-title">Узловые образы</div>
          <ul>
            {result.symbols.map((s, i) => (
              <li key={i}>
                <b>{s.label}</b>{s.personal && <span className="personal-tag"> · твой символ</span>} — {s.meaning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.questions && result.questions.length > 0 && (
        <div className="questions-block">
          <div className="block-title">Вопросы, чтобы повернуть прожектор</div>
          <ul>
            {result.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {result.oracle && (
        <div className="oracle-note">☾ {result.oracle.text}</div>
      )}
    </div>
  )
}
