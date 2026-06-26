// Background.jsx — фон приложения с тремя стилями (переключается в Настройках).
//   • aurora — прежнее «северное сияние» (откат к исходному виду)
//   • constellations — живое звёздное небо с линиями-созвездиями (canvas)
//   • mandala — медленно вращающаяся мандала поверх мягкого сияния (SVG)

import { useRef, useEffect } from 'react'

function Aurora() {
  return <div className="aurora" aria-hidden />
}

function Constellations() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let raf, W = 0, H = 0
    function resize() {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const N = 90
    const stars = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 1.8,
      a: 0.3 + Math.random() * 0.7,
      tw: Math.random() * 6.283,
      vx: (Math.random() - 0.5) * 0.00005,
      vy: (Math.random() - 0.5) * 0.00005
    }))
    let t = 0
    function draw() {
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy
        if (s.x < 0) s.x += 1; if (s.x > 1) s.x -= 1
        if (s.y < 0) s.y += 1; if (s.y > 1) s.y -= 1
      }
      // линии-созвездия между близкими звёздами
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = stars[i], b = stars[j]
          const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H
          const d = Math.hypot(dx, dy)
          if (d < 120) {
            ctx.beginPath()
            ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H)
            ctx.strokeStyle = `rgba(157,180,255,${0.1 * (1 - d / 120)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }
      for (const s of stars) {
        const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + s.tw)
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, 6.2832)
        ctx.fillStyle = `rgba(222,226,255,${s.a * tw})`
        ctx.shadowColor = 'rgba(157,180,255,0.8)'
        ctx.shadowBlur = 4
        ctx.fill()
        ctx.shadowBlur = 0
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="bg-canvas" aria-hidden />
}

function Mandala() {
  const C = 300
  const rings = [60, 110, 165, 225, 285]
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24)
  const petals = Array.from({ length: 16 }, (_, i) => (i * 360) / 16)
  const petals2 = Array.from({ length: 12 }, (_, i) => (i * 360) / 12)
  return (
    <div className="mandala-wrap" aria-hidden>
      <svg className="mandala mandala-spin" viewBox="0 0 600 600">
        {rings.map((r, i) => (
          <circle key={i} cx={C} cy={C} r={r} fill="none" stroke="currentColor" strokeWidth="1" />
        ))}
        {spokes.map((a, i) => (
          <line key={i} x1={C} y1={C - 30} x2={C} y2={C - 285} stroke="currentColor" strokeWidth="0.6"
            transform={`rotate(${a} ${C} ${C})`} />
        ))}
        {petals.map((a, i) => (
          <ellipse key={i} cx={C} cy={C - 165} rx="22" ry="60" fill="none" stroke="currentColor" strokeWidth="1"
            transform={`rotate(${a} ${C} ${C})`} />
        ))}
      </svg>
      <svg className="mandala mandala-spin-rev" viewBox="0 0 600 600">
        {petals2.map((a, i) => (
          <ellipse key={i} cx={C} cy={C - 105} rx="16" ry="42" fill="none" stroke="currentColor" strokeWidth="0.8"
            transform={`rotate(${a} ${C} ${C})`} />
        ))}
        <circle cx={C} cy={C} r="22" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )
}

export default function Background({ style = 'aurora' }) {
  if (style === 'constellations') return <Constellations />
  if (style === 'mandala') return <><Aurora /><Mandala /></>
  return <Aurora />
}
