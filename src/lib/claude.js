// claude.js — клиент LLM для трактовок. Два провайдера:
//   • Anthropic напрямую (api.anthropic.com)
//   • OpenRouter (openrouter.ai, OpenAI-совместимый API)
// Оба вызываются прямо из браузера. Ключ хранится в localStorage.
//
// ⚠️ Прямой вызов из браузера с ключом подходит для личного локального
// использования, но НЕ для публичного хостинга.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const API_VERSION = '2023-06-01'

// Модели для прямого Anthropic API
export const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — баланс цены и качества' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 — самые глубокие трактовки' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — быстро и дёшево' }
]

// Подсказки слагов для OpenRouter (можно вписать любой свой).
export const OPENROUTER_MODELS = [
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.5-sonnet'
]

export const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (напрямую)' },
  { id: 'openrouter', label: 'OpenRouter' }
]

export class ClaudeError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ClaudeError'
    this.status = status
  }
}

// ——— Anthropic напрямую ———
async function callAnthropic({ apiKey, model, system, messages, maxTokens = 1024, temperature = 0.8, signal }) {
  let res
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
        messages
      }),
      signal
    })
  } catch (e) {
    throw new ClaudeError('Сеть недоступна или запрос заблокирован: ' + e.message, 0)
  }
  if (!res.ok) throw await toError(res)
  const data = await res.json()
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

// ——— OpenRouter (OpenAI-совместимый) ———
async function callOpenRouter({ apiKey, model, system, messages, maxTokens = 1024, temperature = 0.8, signal }) {
  const fullMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages
  ]
  let res
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
        // необязательные заголовки ранжирования OpenRouter
        'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://oneirolog.local',
        'X-Title': 'Snotvorets / OneiroLog'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: fullMessages
      }),
      signal
    })
  } catch (e) {
    throw new ClaudeError('Сеть недоступна или запрос заблокирован: ' + e.message, 0)
  }
  if (!res.ok) throw await toError(res)
  const data = await res.json()
  const msg = data?.choices?.[0]?.message?.content
  if (Array.isArray(msg)) {
    return msg.map((p) => (typeof p === 'string' ? p : p.text || '')).join('\n').trim()
  }
  return (msg || '').trim()
}

async function toError(res) {
  let detail = ''
  try {
    const err = await res.json()
    detail = err?.error?.message || JSON.stringify(err)
  } catch {
    detail = res.statusText
  }
  return new ClaudeError(`Ошибка API (${res.status}): ${detail}`, res.status)
}

// ——— единая точка входа ———
export async function callLLM({ provider = 'anthropic', ...opts }) {
  if (!opts.apiKey) throw new ClaudeError('Не задан API-ключ', 401)
  if (!opts.model) throw new ClaudeError('Не выбрана модель', 400)
  return provider === 'openrouter' ? callOpenRouter(opts) : callAnthropic(opts)
}

// Обратная совместимость
export const callClaude = (opts) => callLLM({ provider: 'anthropic', ...opts })

// Быстрая проверка связи: крошечный запрос, чтобы убедиться, что ключ/модель/провайдер рабочие.
export async function testConnection({ provider, apiKey, model }) {
  const text = await callLLM({
    provider,
    apiKey,
    model,
    messages: [{ role: 'user', content: 'Ответь одним словом: привет' }],
    maxTokens: 16,
    temperature: 0
  })
  return { ok: true, text }
}

// Парсинг JSON из ответа модели (на случай ```json``` или текста вокруг).
export function extractJSON(text) {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}
