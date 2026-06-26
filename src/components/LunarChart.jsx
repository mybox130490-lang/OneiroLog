// LunarChart.jsx — график зависимости от фазы Луны:
// линии среднего сна, энергии и настроения по четырём фазам.
// Видно сразу: как сон/энергия «ходят» вместе и как они связаны с луной.

const W = 340, H = 210
const padL = 30, padR = 14, padT = 16, padB = 46
const plotW = W - padL - padR
const plotH = H - padT - padB

const SERIES = [
  { key: 'avgSleep', label: 'сон', color: '#9db4ff' },
  { key: 'avgEnergy', label: 'энергия', color: '#ffd27f' },
  { key: 'mood', label: 'настроение', color: '#7fe0d8' }
]

function xAt(i, n) {
  return n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW
}
function yAt(v) {
  return padT + ((5 - v) / 4) * plotH // шкала 1..5
}

export default function LunarChart({ phases }) {
  // настроение в шкалу 1..5: score (-1..1) → 3 + score*2
  const data = phases.map((p) => {
    const score = p.count ? (p.resPct - p.negPct) / 100 : null
    return {
      ...p,
      mood: score == null ? null : Math.max(1, Math.min(5, 3 + score * 2))
    }
  })
  const n = data.length

  const maxCount = Math.max(1, ...data.map((p) => p.count))

  return (
    <div className="lunar-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="График сна, энергии и настроения по фазам луны">
        {/* сетка и подписи шкалы */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <text x={padL - 6} y={yAt(v) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.4)">{v}</text>
          </g>
        ))}

        {/* столбики — число записей в фазе (фон) */}
        {data.map((p, i) => {
          const bh = (p.count / maxCount) * plotH
          const bw = 16
          return p.count ? (
            <rect key={i} x={xAt(i, n) - bw / 2} y={padT + plotH - bh} width={bw} height={bh}
              rx="4" fill="rgba(157,180,255,0.08)" />
          ) : null
        })}

        {/* линии метрик */}
        {SERIES.map((s) => {
          const pts = data.map((p, i) => (p[s.key] != null ? { x: xAt(i, n), y: yAt(p[s.key]) } : null)).filter(Boolean)
          if (pts.length === 0) return null
          const dPath = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')
          return (
            <g key={s.key}>
              {pts.length > 1 && <path d={dPath} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />}
              {pts.map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="3.2" fill={s.color} />
              ))}
            </g>
          )
        })}

        {/* подписи фаз (глифы) */}
        {data.map((p, i) => (
          <text key={i} x={xAt(i, n)} y={H - padB + 20} textAnchor="middle" fontSize="16">{p.glyph}</text>
        ))}
        {data.map((p, i) => (
          <text key={'n' + i} x={xAt(i, n)} y={H - padB + 36} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.45)">
            {p.count ? `${p.count} зап.` : '—'}
          </text>
        ))}
      </svg>

      <div className="chart-legend">
        {SERIES.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} /> {s.label}</span>
        ))}
      </div>
    </div>
  )
}
