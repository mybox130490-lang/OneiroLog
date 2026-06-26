// Nav.jsx — шапка с брендом, ролью пользователя и вкладками навигации.

import { useEntries, usePersonalSymbols } from '../state/store.js'

const TABS = [
  { key: 'today', label: 'Сегодня', icon: '✶' },
  { key: 'patterns', label: 'Паттерны', icon: '◍' },
  { key: 'exercises', label: 'Упражнения', icon: '➶' },
  { key: 'timeline', label: 'Лента', icon: '☰' },
  { key: 'dream', label: 'Сон во сне', icon: '☾' },
  { key: 'collective', label: 'Мир', icon: '✺' },
  { key: 'symbols', label: 'Словарь', icon: '✦' },
  { key: 'settings', label: 'Настройки', icon: '⚙' }
]

// Роль определяется по числу записей и наличию личных символов.
export function computeRole(entriesCount, symbolsCount) {
  if (entriesCount >= 30 || symbolsCount >= 5) {
    return { key: 'master', label: 'Мастер сновидений', hint: 'настраивает символы, читает свои циклы' }
  }
  if (entriesCount >= 7) {
    return { key: 'researcher', label: 'Исследователь', hint: 'изучает паттерны, экспериментирует с фокусом' }
  }
  return { key: 'beginner', label: 'Начинающий', hint: 'учится замечать' }
}

export default function Nav({ screen, setScreen }) {
  const { entries } = useEntries()
  const { symbols } = usePersonalSymbols()
  const role = computeRole(entries.length, Object.keys(symbols).length)

  return (
    <header className="nav">
      <div className="nav-top">
        <div className="brand">
          <span className="brand-mark" aria-hidden>◯</span>
          <div>
            <div className="brand-name">OneiroLog</div>
            <div className="brand-sub">Снотворец · жизнь как сон, который можно прочитать</div>
          </div>
        </div>
        <div className="role" title={role.hint}>
          <span className={`role-dot role-${role.key}`} />
          {role.label}
        </div>
      </div>
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${screen === t.key ? 'tab-active' : ''}`}
            onClick={() => setScreen(t.key)}
          >
            <span className="tab-icon" aria-hidden>{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}
