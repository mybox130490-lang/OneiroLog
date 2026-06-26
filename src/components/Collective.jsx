// Collective.jsx — «Мир»: анонимный коллективный слой образов (превью).
// Карта архетипов города / страны / мира. Это демо-предпросмотр фичи, которая
// оживёт в мобильной версии, когда наберётся сообщество и появится бэкенд.

import { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { useEntries, useSettings } from '../state/store.js'
import { analyzePatterns } from '../lib/patterns.js'
import { moonPhase4 } from '../lib/lunar.js'
import worldGeo from '../assets/world-110m.json'

// Реальная карта с границами стран (для масштабов «Страна» и «Мир»).
function WorldMap({ scope, data, selected, onSelect }) {
  const config = scope === 'country'
    ? { center: [95, 64], scale: 300 }
    : { center: [12, -8], scale: 150 }
  return (
    <ComposableMap projection="geoEqualEarth" projectionConfig={config} width={800} height={420} style={{ width: '100%', height: 'auto' }}>
      <Geographies geography={worldGeo}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              className="geo-country"
              style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
            />
          ))
        }
      </Geographies>
      {data.nodes.map((n) => (
        <Marker key={n.name} coordinates={n.lonLat} onClick={() => onSelect(n)}>
          <circle r={9} className="map-ring2" />
          <circle r={4.5} className={`map-dot ${selected?.name === n.name ? 'sel' : ''}`} />
          <text textAnchor="middle" y={-11} className="map-label2">{n.image}</text>
        </Marker>
      ))}
    </ComposableMap>
  )
}

// Как коллективные образы дышат в ритме луны (демо-связь).
const MOON_COMMUNITY = [
  { key: 'new', glyph: '🌑', name: 'Новолуние', arch: 'Самость', note: 'замыслы и тишина — в сообществе всплывают образы начала и семени.' },
  { key: 'waxing', glyph: '🌓', name: 'Растущая Луна', arch: 'Герой', note: 'движение и рост — чаще «дорога», «мост», «лестница».' },
  { key: 'full', glyph: '🌕', name: 'Полнолуние', arch: 'Тень', note: 'всё обострено и проявлено — всплывают «зеркало», «огонь», «толпа».' },
  { key: 'waning', glyph: '🌗', name: 'Убывающая Луна', arch: 'Великая Мать', note: 'отпускание и отдых — «вода», «дом», «дождь».' }
]

const SCOPES = [
  { key: 'city', label: 'Город' },
  { key: 'country', label: 'Страна' },
  { key: 'world', label: 'Мир' }
]

// Демо-данные (пример того, как это будет выглядеть на реальных данных сообщества).
const DEMO = {
  city: {
    pulse: 'Этим вечером над городом чаще всего всплывает образ «запертая дверь».',
    nodes: [
      { name: 'Центр', x: 200, y: 108, image: 'зеркало', archetype: 'Самость', count: 48 },
      { name: 'Север', x: 150, y: 58, image: 'дорога', archetype: 'Самость', count: 31 },
      { name: 'Гавань', x: 300, y: 88, image: 'вода', archetype: 'Анима', count: 27 },
      { name: 'Старый город', x: 108, y: 150, image: 'запертая дверь', archetype: 'Тень', count: 39 },
      { name: 'Парк', x: 250, y: 168, image: 'дерево', archetype: 'Самость', count: 22 },
      { name: 'Запад', x: 330, y: 158, image: 'окно', archetype: 'Персона', count: 18 }
    ],
    top: [
      { image: 'запертая дверь', pct: 34, archetype: 'Тень' },
      { image: 'дорога', pct: 22, archetype: 'Самость' },
      { image: 'вода', pct: 19, archetype: 'Анима' },
      { image: 'зеркало', pct: 15, archetype: 'Самость' }
    ]
  },
  country: {
    pulse: 'По стране в этом месяце нарастает образ «дорога» — будто все куда-то в пути.',
    nodes: [
      { name: 'Москва', lonLat: [37.6, 55.75], image: 'дорога', archetype: 'Самость', count: 1240 },
      { name: 'Петербург', lonLat: [30.3, 59.94], image: 'вода', archetype: 'Анима', count: 980 },
      { name: 'Казань', lonLat: [49.1, 55.8], image: 'мост', archetype: 'Самость', count: 410 },
      { name: 'Сочи', lonLat: [39.7, 43.6], image: 'море', archetype: 'Анима', count: 330 },
      { name: 'Екатеринбург', lonLat: [60.6, 56.84], image: 'гора', archetype: 'Герой', count: 520 },
      { name: 'Новосибирск', lonLat: [82.9, 55.03], image: 'снег', archetype: 'Великая Мать', count: 300 }
    ],
    top: [
      { image: 'дорога', pct: 28, archetype: 'Самость' },
      { image: 'вода', pct: 21, archetype: 'Анима' },
      { image: 'мост', pct: 14, archetype: 'Самость' },
      { image: 'гора', pct: 12, archetype: 'Герой' }
    ]
  },
  world: {
    pulse: 'В этом месяце по миру синхронно всплывает образ «мост» — тяга соединить берега.',
    nodes: [
      { name: 'Нью-Йорк', lonLat: [-74, 40.7], image: 'высота', archetype: 'Герой', count: 9100 },
      { name: 'Лондон', lonLat: [-0.1, 51.5], image: 'туман', archetype: 'Тень', count: 8200 },
      { name: 'Берлин', lonLat: [13.4, 52.5], image: 'стена', archetype: 'Тень', count: 4300 },
      { name: 'Стамбул', lonLat: [29, 41], image: 'мост', archetype: 'Самость', count: 3900 },
      { name: 'Дели', lonLat: [77.2, 28.6], image: 'огонь', archetype: 'Герой', count: 6800 },
      { name: 'Токио', lonLat: [139.7, 35.7], image: 'толпа', archetype: 'Персона', count: 7600 },
      { name: 'Сан-Паулу', lonLat: [-46.6, -23.5], image: 'дождь', archetype: 'Анима', count: 3500 }
    ],
    top: [
      { image: 'мост', pct: 18, archetype: 'Самость' },
      { image: 'огонь', pct: 16, archetype: 'Герой' },
      { image: 'толпа', pct: 13, archetype: 'Персона' },
      { image: 'туман', pct: 11, archetype: 'Тень' }
    ]
  }
}

// Географические контуры под каждый масштаб.
const MAPS = {
  world: {
    lands: [
      'M46,56 C40,42 70,40 92,46 C112,50 124,60 120,74 C128,82 122,98 108,100 C104,118 88,122 80,108 C70,120 56,112 60,98 C44,96 38,74 46,56 Z',
      'M104,128 C100,118 122,120 130,134 C140,150 134,170 124,186 C118,202 104,202 100,186 C92,168 96,148 104,128 Z',
      'M142,62 C140,54 168,54 182,62 C194,68 192,82 180,86 C172,98 152,96 150,84 C140,80 138,68 142,62 Z',
      'M176,98 C174,90 202,90 214,100 C226,110 226,132 218,152 C212,172 196,182 186,168 C176,152 170,124 176,98 Z',
      'M210,50 C218,38 272,36 312,46 C350,54 372,68 364,88 C372,104 352,118 330,114 C322,132 294,136 284,120 C258,128 226,118 218,98 C204,86 202,64 210,50 Z',
      'M312,160 C310,152 338,152 352,162 C364,170 362,188 348,194 C332,200 314,196 312,180 C306,172 308,164 312,160 Z'
    ]
  },
  country: {
    lands: ['M38,82 C58,64 130,62 202,68 C282,74 342,80 362,94 C370,106 354,120 322,120 C242,126 140,124 80,116 C46,112 32,100 38,82 Z']
  },
  city: {
    rivers: ['M56,36 C118,86 96,150 178,182 C238,206 300,196 352,214'],
    blocks: [
      { x: 118, y: 66, w: 64, h: 42 }, { x: 212, y: 118, w: 72, h: 46 },
      { x: 78, y: 150, w: 56, h: 36 }, { x: 268, y: 60, w: 50, h: 38 }
    ]
  }
}

// Образ месяца: как менялся доминирующий образ за последние месяцы.
const TIMELINE = {
  city: [['апр', 'дорога'], ['май', 'вода'], ['июн', 'окно'], ['июл', 'зеркало'], ['авг', 'дверь']],
  country: [['апр', 'снег'], ['май', 'река'], ['июн', 'дорога'], ['июл', 'море'], ['авг', 'дорога']],
  world: [['апр', 'стена'], ['май', 'туман'], ['июн', 'огонь'], ['июл', 'толпа'], ['авг', 'мост']]
}

export default function Collective() {
  const { entries } = useEntries()
  const { settings, saveSettings } = useSettings()
  const [scope, setScope] = useState('city')
  const [selected, setSelected] = useState(null)

  const data = DEMO[scope]
  const share = !!settings.shareCollective

  const patterns = useMemo(() => analyzePatterns(entries, {}), [entries])
  const myImages = patterns.topImages.slice(0, 3).map((x) => x.word)
  const curMoon = MOON_COMMUNITY.find((m) => m.key === moonPhase4().key) || MOON_COMMUNITY[0]

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Мир · коллективные образы</h1>
        <p className="muted">
          Когда нас много, в образах проступает общее бессознательное города, страны, мира.
          Карта показывает, что чаще всего «снится» людям рядом — анонимно и без имён.
        </p>
      </div>

      <div className="card preview-banner">
        🛰 Демо-предпросмотр. Живая карта появится в мобильной версии OneiroLog, когда наберётся
        сообщество. Цифры здесь — пример того, как это будет выглядеть.
      </div>

      <div className="period-switch">
        {SCOPES.map((s) => (
          <button key={s.key} className={scope === s.key ? 'seg seg-on' : 'seg'} onClick={() => { setScope(s.key); setSelected(null) }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="collective-pulse">✦ {data.pulse}</div>
        <div className="collective-map">
          {scope === 'city' ? (
            <svg viewBox="0 0 400 240" role="img" aria-label="Карта города">
              {(MAPS.city.blocks || []).map((b, i) => (
                <rect key={'b' + i} className="map-block" x={b.x} y={b.y} width={b.w} height={b.h} rx="6" />
              ))}
              {(MAPS.city.rivers || []).map((d, i) => (
                <path key={'r' + i} className="map-river" d={d} fill="none" />
              ))}
              {data.nodes.map((n, i) => (
                <g key={n.name} className="map-node" onClick={() => setSelected(n)} style={{ cursor: 'pointer' }}>
                  <circle className="map-ring" cx={n.x} cy={n.y} r="6" style={{ animationDelay: `${i * 0.35}s` }} />
                  <circle cx={n.x} cy={n.y} r="5" className={`map-dot ${selected?.name === n.name ? 'sel' : ''}`} />
                  <text x={n.x} y={n.y - 11} textAnchor="middle" className="map-label">{n.image}</text>
                  <text x={n.x} y={n.y + 18} textAnchor="middle" className="map-sub">{n.name}</text>
                </g>
              ))}
            </svg>
          ) : (
            <WorldMap scope={scope} data={data} selected={selected} onSelect={setSelected} />
          )}
        </div>

        {selected ? (
          <div className="map-detail">
            <b>{selected.image}</b> · {selected.name} · архетип «{selected.archetype}» ·{' '}
            {selected.count.toLocaleString('ru-RU')} {pl(selected.count)}
          </div>
        ) : (
          <div className="muted small center">нажми на точку, чтобы увидеть образ места</div>
        )}
      </div>

      <div className="card">
        <div className="block-title">Топ образов {SCOPES.find((s) => s.key === scope).label.toLowerCase()}</div>
        <div className="collective-top">
          {data.top.map((t, i) => (
            <div key={i} className="ct-row">
              <span className="ct-bar" style={{ width: t.pct * 2.4 + 'px' }} />
              <span className="ct-word">{t.image}</span>
              <span className="muted small">{t.pct}% · {t.archetype}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="block-title">Образ месяца — как менялся</div>
        <p className="muted small">Доминирующий образ {SCOPES.find((s) => s.key === scope).label.toLowerCase()} по месяцам.</p>
        <div className="month-line">
          {TIMELINE[scope].map((m, i) => (
            <div className="ml-step" key={i}>
              <div className="ml-img">{m[1]}</div>
              <div className="ml-dot" />
              <div className="ml-month">{m[0]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="block-title">Луна и сообщество</div>
        <p className="muted small">Коллективные образы дышат в ритме луны. Сейчас: {curMoon.glyph} {curMoon.name} — на первый план выходит архетип «{curMoon.arch}».</p>
        <div className="moon-grid">
          {MOON_COMMUNITY.map((m) => (
            <div key={m.key} className={`moon-cell ${m.key === curMoon.key ? '' : 'dim'}`}>
              <div className="moon-glyph">{m.glyph}</div>
              <div className="moon-name">{m.name}</div>
              <div className="moon-emo">{m.arch}</div>
            </div>
          ))}
        </div>
        <p className="muted small">{curMoon.note}</p>
      </div>

      <div className="card">
        <div className="block-title">Твой вклад</div>
        <label className="toggle">
          <input type="checkbox" checked={share} onChange={(e) => saveSettings({ shareCollective: e.target.checked })} />
          <span>Делиться своими образами анонимно</span>
        </label>
        {share ? (
          <p className="muted small">
            {myImages.length
              ? <>В общий поток уходят (без привязки к тебе): {myImages.map((w, i) => <span key={i} className="chip" style={{ marginRight: 6 }}>{w}</span>)}</>
              : 'Пока у тебя мало записей — как накопятся, твои образы войдут в карту анонимно.'}
          </p>
        ) : (
          <p className="muted small">
            Включи обмен — и твои образы (только образы, без текста и имени) станут частью общей карты.
            Выключено по умолчанию: приватность прежде всего.
          </p>
        )}
      </div>
    </div>
  )
}

function pl(n) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'человек'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'человека'
  return 'человек'
}
