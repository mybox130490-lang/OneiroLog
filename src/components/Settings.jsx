// Settings.jsx — ключ Claude, модель, слой-оракул, приватность, экспорт/очистка.

import { useState } from 'react'
import { useSettings, exportAll, clearAll } from '../state/store.js'
import { MODELS, OPENROUTER_MODELS, PROVIDERS, testConnection } from '../lib/claude.js'
import { moonPhase } from '../lib/lunar.js'

export default function Settings() {
  const { settings, saveSettings } = useSettings()
  const [confirmClear, setConfirmClear] = useState(false)
  const [test, setTest] = useState(null) // { state: 'busy'|'ok'|'err', msg }
  const moon = moonPhase()

  const isOR = settings.provider === 'openrouter'

  async function checkConnection() {
    setTest({ state: 'busy' })
    try {
      const model = isOR ? settings.openrouterModel : settings.model
      const r = await testConnection({ provider: settings.provider, apiKey: settings.apiKey, model })
      setTest({ state: 'ok', msg: 'Связь есть! Ответ модели: «' + (r.text || '…').slice(0, 40) + '»' })
    } catch (e) {
      setTest({ state: 'err', msg: e.message })
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snotvorets-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Настройки</h1>
        <p className="muted">Всё хранится только в этом браузере. Ничего не уходит на сервер без твоего согласия.</p>
      </div>

      <div className="card">
        <div className="block-title">Имя</div>
        <input
          className="full"
          placeholder="как тебя называть"
          value={settings.userName}
          onChange={(e) => saveSettings({ userName: e.target.value })}
        />
      </div>

      <div className="card">
        <label className="toggle">
          <input type="checkbox" checked={settings.useAI} onChange={(e) => saveSettings({ useAI: e.target.checked })} />
          <span>Живой ИИ (Claude) для трактовок</span>
        </label>
        <p className="muted small">
          Выключено — работает офлайн-движок на локальной базе символов. Включено — текст записи
          отправляется в Anthropic для более глубокой трактовки.
        </p>

        {settings.useAI && (
          <div className="ai-config">
            <label className="field">
              <span>Провайдер</span>
              <select
                value={settings.provider}
                onChange={(e) => { saveSettings({ provider: e.target.value }); setTest(null) }}
              >
                {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>

            <label className="field">
              <span>{isOR ? 'API-ключ OpenRouter' : 'API-ключ Anthropic'}</span>
              <input
                type="password"
                placeholder={isOR ? 'sk-or-…' : 'sk-ant-…'}
                value={settings.apiKey}
                onChange={(e) => { saveSettings({ apiKey: e.target.value }); setTest(null) }}
              />
            </label>

            {isOR ? (
              <label className="field">
                <span>Модель (слаг OpenRouter)</span>
                <input
                  list="or-models"
                  placeholder="anthropic/claude-sonnet-4.6"
                  value={settings.openrouterModel}
                  onChange={(e) => { saveSettings({ openrouterModel: e.target.value }); setTest(null) }}
                />
                <datalist id="or-models">
                  {OPENROUTER_MODELS.map((m) => <option key={m} value={m} />)}
                </datalist>
              </label>
            ) : (
              <label className="field">
                <span>Модель</span>
                <select value={settings.model} onChange={(e) => { saveSettings({ model: e.target.value }); setTest(null) }}>
                  {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
            )}

            <div className="row gap">
              <button className="btn btn-ghost small" onClick={checkConnection} disabled={!settings.apiKey || test?.state === 'busy'}>
                {test?.state === 'busy' ? 'Проверяю…' : 'Проверить связь'}
              </button>
              {test?.state === 'ok' && <span className="test-ok">✓ {test.msg}</span>}
              {test?.state === 'err' && <span className="test-err">✕ {test.msg}</span>}
            </div>

            <p className="caveat">
              ⚠️ Ключ хранится в localStorage браузера и отправляется напрямую из браузера.
              Это нормально для личного локального использования, но не для публичного хостинга.
              {isOR && ' OpenRouter: слаг модели можно вписать любой (например anthropic/claude-opus-4.8).'}
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <label className="toggle">
          <input type="checkbox" checked={settings.oracleLayer} onChange={(e) => saveSettings({ oracleLayer: e.target.checked })} />
          <span>Слой-оракул (лунные циклы)</span>
        </label>
        <p className="muted small">
          Добавляет к трактовке мягкое напутствие с учётом фазы Луны. Сейчас: <b>{moon.name}</b>, освещённость {moon.illumination}%.
        </p>
      </div>

      <div className="card">
        <div className="block-title">Тема оформления</div>
        <div className="mode-switch">
          {[
            { v: 'cosmos', label: '🌌 Космос' },
            { v: 'glass', label: '☁️ Небо' },
            { v: 'eink', label: '📖 Бумага' }
          ].map((b) => (
            <button
              key={b.v}
              className={(settings.theme || 'cosmos') === b.v ? 'seg seg-on' : 'seg'}
              onClick={() => saveSettings({ theme: b.v })}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="muted small">
          «Космос» — тёмная. «Небо» — светлый матовый стеклянный интерфейс. «Бумага» — спокойный вид
          электронной книги (e-ink). Любую можно вернуть в один клик.
        </p>
      </div>

      <div className="card">
        <div className="block-title">Данные</div>
        <div className="row gap">
          <button className="btn btn-ghost small" onClick={download}>Скачать бэкап (JSON)</button>
          {!confirmClear ? (
            <button className="btn btn-ghost small danger" onClick={() => setConfirmClear(true)}>Удалить всё</button>
          ) : (
            <span className="row gap">
              <span className="muted small">Точно удалить все записи?</span>
              <button className="btn btn-ghost small danger" onClick={() => { clearAll(); setConfirmClear(false) }}>Да, удалить</button>
              <button className="btn btn-ghost small" onClick={() => setConfirmClear(false)}>Отмена</button>
            </span>
          )}
        </div>
      </div>

      <div className="card about">
        <div className="block-title">О проекте</div>
        <p className="muted small">
          «Снотворец» — не гадание, а тренажёр внимания с юнгианской оптикой. Он не предсказывает будущее,
          а показывает, куда смотрит твоё сознание, — чтобы ты мог этим управлять. Если в записи звучит острая
          боль, приложение отложит символы и мягко вернёт тебя к живой помощи.
        </p>
      </div>
    </div>
  )
}
