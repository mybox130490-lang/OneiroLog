// PatternBubble.jsx — ★ объёмный «живой» мыльный пузырь паттернов.
// Слова — твёрдые: они не вылетают за плёнку, отталкиваются от стенок и ДАВЯТ на них,
// выпучивая мембрану в точке контакта (как груз изнутри растягивает плёнку).
// При нажатии пузырь продавливается под пальцем и лопается из точки касания.

import { useRef, useEffect, useState } from 'react'

function colorFor(p) {
  if (p.valence === 'negative') return [225, 70, 74]
  if (p.valence === 'resource') return [45, 88, 72]
  switch (p.category) {
    case 'emotion': return [285, 62, 80]
    case 'object': return [195, 68, 80]
    case 'character': return [330, 58, 82]
    case 'place': return [150, 52, 78]
    case 'color': return [55, 68, 78]
    default: return [210, 38, 88]
  }
}

function angDiff(a, b) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}
const gauss = (d, w) => Math.exp(-(d * d) / (2 * w * w))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

export default function PatternBubble({ words = [], ready = true, onPop, light = false }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const onPopRef = useRef(onPop)
  const wordsRef = useRef(words)
  const lightRef = useRef(light)
  const [size, setSize] = useState(420)
  const [hovering, setHovering] = useState(false)

  onPopRef.current = onPop
  wordsRef.current = words
  lightRef.current = light

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      setSize(Math.max(280, Math.min(480, Math.floor(w))))
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const cx = size / 2
    const cy = size / 2
    const R = size / 2 - 18
    const list = (wordsRef.current.length ? wordsRef.current : []).slice(0, 16)
    const maxW = Math.max(1, ...list.map((w) => w.weight || 1))

    const particles = list.map((w) => {
      const ang = Math.random() * Math.PI * 2
      const rad = Math.random() * R * 0.5
      const fs = 13 + (w.weight / maxW) * 18
      const [h, s, l] = colorFor(w)
      return {
        word: w.word,
        x: cx + Math.cos(ang) * rad,
        y: cy + Math.sin(ang) * rad,
        vx: (Math.random() - 0.5) * 1.4,
        vy: (Math.random() - 0.5) * 1.4,
        fs, h, s, l,
        alpha: 0.6 + (w.weight / maxW) * 0.35,
        wob: Math.random() * Math.PI * 2,
        tw: undefined, br: undefined // ширина текста и радиус габарита — измерим в draw
      }
    })

    stateRef.current = {
      cx, cy, R,
      particles,
      droplets: [],
      ripples: [],
      pressBulges: [],
      phase: 'floating',
      t: 0,
      hover: false,
      cursorAng: 0, cursorStr: 0,
      contactAng: 0, contactX: cx, contactY: cy,
      dent: 0,
      pressStart: 0,
      popStart: 0,
      popped: false,
      spin: Math.random() * Math.PI * 2
    }
  }, [size, words])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let raf
    let last = performance.now()
    const PRESS_DUR = 420
    const POP_DUR = 780

    function measure(p) {
      ctx.font = `600 ${p.fs}px "Inter", "Segoe UI", system-ui, sans-serif`
      p.tw = ctx.measureText(p.word).width
      // радиус описанной окружности габарита слова + запас
      p.br = Math.hypot(p.tw / 2, p.fs * 0.62) + 5
    }

    function radiusAt(theta, st, baseR, amp, denting, bulging) {
      let r = baseR * (1 + amp * (Math.sin(theta * 3 + st.t * 1.3) * 0.5 + Math.sin(theta * 2 - st.t * 0.8) * 0.5))
      if (bulging > 0) r += baseR * 0.06 * bulging * gauss(angDiff(theta, st.cursorAng), 0.95)
      if (denting > 0) r -= denting * gauss(angDiff(theta, st.contactAng), 0.55)
      // выпучивание стенок под напором твёрдых слов
      let bump = 0
      for (const pb of st.pressBulges) bump += pb.amt * gauss(angDiff(theta, pb.ang), 0.34)
      r += Math.min(bump, baseR * 0.18)
      return r
    }

    function buildPath(st, baseR, amp, denting, bulging) {
      const N = 110
      const pts = []
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2
        const rr = radiusAt(th, st, baseR, amp, denting, bulging)
        pts.push([st.cx + Math.cos(th) * rr, st.cy + Math.sin(th) * rr])
      }
      return pts
    }

    function tracePath(pts) {
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
    }

    function draw(now) {
      const st = stateRef.current
      if (!st) { raf = requestAnimationFrame(draw); return }
      const dt = Math.min(40, now - last) / 16.67
      last = now
      st.t += 0.016
      st.spin += 0.0026 * dt

      ctx.clearRect(0, 0, size, size)

      const pressing = st.phase === 'pressing'
      const popping = st.phase === 'popping'

      if (pressing) {
        const pt = Math.min(1, (now - st.pressStart) / PRESS_DUR)
        st.dent = st.R * 0.32 * easeOut(pt)
        if (pt >= 1) { st.phase = 'popping'; st.popStart = now }
      }
      const popT = popping ? Math.min(1, (now - st.popStart) / POP_DUR) : 0
      const popEase = popT * popT

      const targetBulge = st.hover && st.phase === 'floating' ? 1 : 0
      st.cursorStr += (targetBulge - st.cursorStr) * 0.12 * dt

      const baseR = st.R * (1 - 0.05 * (pressing ? st.dent / (st.R * 0.32) : 0)) * (1 + popEase * 0.16)
      const amp = (st.hover ? 0.02 : 0.012) + popEase * 0.12
      const denting = pressing ? st.dent : (popping ? st.R * 0.32 * (1 - popEase) : 0)

      // ——— физика слов (до отрисовки мембраны) ———
      // выпуклости от прошлых ударов мягко затухают
      for (const b of st.pressBulges) b.amt *= 0.9
      st.pressBulges = st.pressBulges.filter((b) => b.amt > 0.6)
      for (const p of st.particles) {
        if (p.tw === undefined) measure(p)
        if (popping) {
          const dx = p.x - st.contactX, dy = p.y - st.contactY
          const d = Math.hypot(dx, dy) || 1
          p.x += (dx / d) * 5 * dt + p.vx
          p.y += (dy / d) * 5 * dt + p.vy
          p.alpha *= 0.96
          continue
        }
        // дрейф + лёгкое броуновское дрожание
        p.wob += 0.02
        p.x += (p.vx + Math.cos(p.wob) * 0.12) * dt
        p.y += (p.vy + Math.sin(p.wob * 1.1) * 0.12) * dt

        // отталкивание от пальца при продавливании
        if (pressing) {
          const dx = p.x - st.contactX, dy = p.y - st.contactY
          const d = Math.hypot(dx, dy) || 1
          const force = (st.dent / st.R) * 55 / d
          p.x += (dx / d) * force * dt
          p.y += (dy / d) * force * dt
        }

        // отскок от стенки: слово подлетает ВПЛОТНУЮ к плёнке и упруго отражается
        const dx = p.x - st.cx, dy = p.y - st.cy
        const dist = Math.hypot(dx, dy) || 0.001
        const nx = dx / dist, ny = dy / dist
        const limit = baseR - p.br - 2 // край слова касается мембраны
        if (dist >= limit) {
          p.x = st.cx + nx * limit
          p.y = st.cy + ny * limit
          const dot = p.vx * nx + p.vy * ny
          if (dot > 0) { p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny } // зеркальное отражение
          p.vx *= 0.96; p.vy *= 0.96
          // плёнка выпучивается в точке удара (затухает за несколько кадров)
          st.pressBulges.push({ ang: Math.atan2(dy, dx), amt: Math.min(7 + Math.abs(dot) * 6, st.R * 0.13) })
        }
        // ограничение скорости, чтобы слова не разгонялись бесконечно
        const sp = Math.hypot(p.vx, p.vy)
        if (sp > 1.7) { p.vx *= 1.7 / sp; p.vy *= 1.7 / sp }
        if (sp < 0.25) { const k = 0.25 / (sp || 1); p.vx *= k; p.vy *= k } // и не застывали
      }

      const pts = buildPath(st, baseR, amp, denting, st.cursorStr)

      const isLight = lightRef.current

      // ——— тень/свечение под пузырём ———
      if (st.phase !== 'gone') {
        const sh = ctx.createRadialGradient(st.cx, st.cy + st.R * 0.92, st.R * 0.1, st.cx, st.cy + st.R * 0.92, st.R * 0.9)
        sh.addColorStop(0, isLight ? 'rgba(120,116,104,0.16)' : 'rgba(90,80,200,0.22)')
        sh.addColorStop(1, isLight ? 'rgba(120,116,104,0)' : 'rgba(90,80,200,0)')
        ctx.fillStyle = sh
        ctx.fillRect(0, 0, size, size)
      }

      // ——— тело пузыря ———
      if (st.phase !== 'gone') {
        const filmA = 1 - popEase
        ctx.save()
        tracePath(pts)
        ctx.clip()

        const base = ctx.createRadialGradient(st.cx - baseR * 0.25, st.cy - baseR * 0.3, baseR * 0.1, st.cx, st.cy, baseR)
        if (isLight) {
          base.addColorStop(0, `rgba(255,255,255,${0.55 * filmA})`)
          base.addColorStop(0.7, `rgba(235,232,224,${0.5 * filmA})`)
          base.addColorStop(1, `rgba(150,145,132,${0.42 * filmA})`)
        } else {
          base.addColorStop(0, `rgba(70,60,130,${0.10 * filmA})`)
          base.addColorStop(0.7, `rgba(40,30,90,${0.16 * filmA})`)
          base.addColorStop(1, `rgba(20,14,50,${0.30 * filmA})`)
        }
        ctx.fillStyle = base
        ctx.fillRect(0, 0, size, size)

        // переливающаяся плёнка — только в цветных темах
        if (!isLight) {
          ctx.globalCompositeOperation = 'lighter'
          for (let i = 0; i < 4; i++) {
            const a = st.spin * (i % 2 ? 1 : -1) + (i / 4) * Math.PI * 2
            const bx = st.cx + Math.cos(a) * baseR * 0.36
            const by = st.cy + Math.sin(a) * baseR * 0.36
            const hue = (st.t * 26 + i * 95) % 360
            const g = ctx.createRadialGradient(bx, by, 0, bx, by, baseR * 0.72)
            g.addColorStop(0, `hsla(${hue},92%,72%,${0.13 * filmA})`)
            g.addColorStop(1, `hsla(${hue},92%,72%,0)`)
            ctx.fillStyle = g
            ctx.fillRect(0, 0, size, size)
          }
          ctx.globalCompositeOperation = 'source-over'
        }

        const ish = ctx.createRadialGradient(st.cx + baseR * 0.32, st.cy + baseR * 0.36, baseR * 0.2, st.cx + baseR * 0.2, st.cy + baseR * 0.2, baseR * 1.05)
        ish.addColorStop(0, isLight ? 'rgba(120,116,104,0)' : 'rgba(10,6,30,0)')
        ish.addColorStop(1, isLight ? `rgba(120,116,104,${0.26 * filmA})` : `rgba(8,4,24,${0.4 * filmA})`)
        ctx.fillStyle = ish
        ctx.fillRect(0, 0, size, size)

        const spx = st.cx - baseR * 0.4, spy = st.cy - baseR * 0.44
        const sp2 = ctx.createRadialGradient(spx, spy, 0, spx, spy, baseR * 0.42)
        sp2.addColorStop(0, `rgba(255,255,255,${0.5 * filmA})`)
        sp2.addColorStop(0.5, `rgba(255,255,255,${0.08 * filmA})`)
        sp2.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = sp2
        ctx.fillRect(0, 0, size, size)
        ctx.beginPath()
        ctx.arc(st.cx - baseR * 0.5, st.cy - baseR * 0.34, baseR * 0.05, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${0.65 * filmA})`
        ctx.fill()

        if (denting > 4) {
          const cx2 = st.cx + Math.cos(st.contactAng) * baseR * 0.75
          const cy2 = st.cy + Math.sin(st.contactAng) * baseR * 0.75
          const dd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, baseR * 0.6)
          dd.addColorStop(0, isLight ? `rgba(120,116,104,${0.3 * filmA})` : `rgba(8,4,24,${0.33 * filmA})`)
          dd.addColorStop(1, isLight ? 'rgba(120,116,104,0)' : 'rgba(8,4,24,0)')
          ctx.fillStyle = dd
          ctx.fillRect(0, 0, size, size)
        }
        ctx.restore()

        // обод: френель + (в цветных темах) бегущая радуга по фактическому контуру
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i]
          const [x1, y1] = pts[i + 1]
          const th = (i / (pts.length - 1)) * Math.PI * 2
          const fres = 0.45 + 0.55 * gauss(angDiff(th, -2.3), 1.6)
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.lineTo(x1, y1)
          ctx.lineWidth = 2 + fres * 1.6
          if (isLight) {
            ctx.strokeStyle = `rgba(110,106,96,${(0.26 + fres * 0.3) * filmA})`
          } else {
            const hue = (i * 3.6 + st.t * 38) % 360
            ctx.strokeStyle = `hsla(${hue},95%,${70 + fres * 18}%,${(0.4 + fres * 0.5) * filmA})`
          }
          ctx.stroke()
        }
      }

      // ——— слова ———
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const p of st.particles) {
        ctx.font = `600 ${p.fs}px "Inter", "Segoe UI", system-ui, sans-serif`
        const wAlpha = Math.max(0, p.alpha) * (popping ? (1 - popEase) : 1)
        if (isLight) {
          // тёмные приглушённые слова на светлой плёнке
          ctx.shadowBlur = 0
          ctx.fillStyle = `hsla(${p.h},26%,30%,${wAlpha})`
        } else {
          ctx.shadowColor = `hsla(${p.h},${p.s}%,${p.l}%,0.9)`
          ctx.shadowBlur = 12
          ctx.fillStyle = `hsla(${p.h},${p.s}%,${p.l}%,${wAlpha})`
        }
        ctx.fillText(p.word, p.x, p.y)
        ctx.shadowBlur = 0
      }

      // ——— рябь касания ———
      for (const r of st.ripples) {
        r.life -= 0.03 * dt
        r.rad += 2.4 * dt
        if (r.life <= 0) continue
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.rad, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${0.4 * r.life})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      st.ripples = st.ripples.filter((r) => r.life > 0)

      // ——— капли при лопании ———
      if (popping) {
        if (st.droplets.length === 0) spawnDroplets(st, baseR)
        for (const d of st.droplets) {
          d.vy += 0.16 * dt
          d.x += d.vx * dt
          d.y += d.vy * dt
          d.life -= 0.02 * dt
          if (d.life <= 0) continue
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.r * d.life, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${d.hue},92%,80%,${0.72 * d.life})`
          ctx.fill()
        }
        if (popT < 0.45) {
          ctx.beginPath()
          ctx.arc(st.contactX, st.contactY, baseR * (0.5 + popT * 1.4), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - popT / 0.45)})`
          ctx.lineWidth = 3
          ctx.stroke()
        }
        if (popT >= 1 && !st.popped) {
          st.popped = true
          st.phase = 'gone'
          if (onPopRef.current) onPopRef.current()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])

  function spawnDroplets(st, R) {
    const n = 54
    for (let i = 0; i < n; i++) {
      const spread = (Math.random() - 0.5) * 2.4
      const a = st.contactAng + spread
      const speed = 2.5 + Math.random() * 5
      const r0 = R * (0.6 + Math.random() * 0.4)
      st.droplets.push({
        x: st.cx + Math.cos(a) * r0,
        y: st.cy + Math.sin(a) * r0,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1.2,
        r: 2 + Math.random() * 4.5,
        hue: (a * 57 + st.t * 38) % 360,
        life: 1
      })
    }
  }

  function playPop() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      const ac = new AC()
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.connect(g); g.connect(ac.destination)
      o.frequency.setValueAtTime(720, ac.currentTime)
      o.frequency.exponentialRampToValueAtTime(110, ac.currentTime + 0.2)
      g.gain.setValueAtTime(0.2, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.24)
      o.start(); o.stop(ac.currentTime + 0.26)
      o.onended = () => ac.close()
    } catch { /* звук не критичен */ }
  }

  function localPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function inBubble(pt, st) {
    return Math.hypot(pt.x - st.cx, pt.y - st.cy) <= st.R
  }
  function setContact(st, pt) {
    st.contactAng = Math.atan2(pt.y - st.cy, pt.x - st.cx)
    st.contactX = pt.x
    st.contactY = pt.y
  }

  function handleMove(e) {
    const st = stateRef.current
    if (!st) return
    const pt = localPoint(e)
    const inside = inBubble(pt, st)
    if (st.phase === 'floating') {
      st.hover = inside
      if (inside) st.cursorAng = Math.atan2(pt.y - st.cy, pt.x - st.cx)
      if (inside !== hovering) setHovering(inside)
    } else if (st.phase === 'pressing') {
      setContact(st, pt)
    }
  }
  function handleLeave() {
    const st = stateRef.current
    if (st && st.phase === 'floating') st.hover = false
    setHovering(false)
  }
  function handleDown(e) {
    const st = stateRef.current
    if (!st || st.phase !== 'floating') return
    const pt = localPoint(e)
    if (!inBubble(pt, st)) return
    try { canvasRef.current.setPointerCapture(e.pointerId) } catch {}
    setContact(st, pt)
    st.phase = 'pressing'
    st.pressStart = performance.now()
    st.hover = false
    st.ripples.push({ x: pt.x, y: pt.y, rad: 4, life: 1 })
    playPop()
  }

  return (
    <div ref={wrapRef} className="bubble-wrap">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size, cursor: hovering ? 'pointer' : 'default', touchAction: 'none' }}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onPointerDown={handleDown}
        role="button"
        aria-label="Лопнуть пузырь паттернов, чтобы запустить аналитику"
      />
      <div className={`bubble-hint ${hovering ? 'on' : ''}`}>
        {ready
          ? (hovering ? '✦ нажми и продави — пузырь лопнет' : 'коснись пузыря')
          : 'запиши хотя бы 3 дня — пузырь наполнится образами'}
      </div>
    </div>
  )
}
