// store.js — персистентность дневника в localStorage + реактивные хуки.
// Никакие данные не уходят на сервер: всё живёт в браузере пользователя.
// (Текст записи отправляется в Anthropic только если включён живой ИИ в настройках.)

import { useSyncExternalStore, useCallback } from 'react'

const KEYS = {
  entries: 'oneirolog.entries.v1',
  settings: 'oneirolog.settings.v1',
  symbols: 'oneirolog.personalSymbols.v1',
  exercises: 'oneirolog.exercises.v1'
}

// ——— низкоуровневый доступ к localStorage ———
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Не удалось сохранить', key, e)
  }
}

// ——— простейшая шина подписок, чтобы все экраны были синхронны ———
const listeners = new Set()
function emit() {
  listeners.forEach((l) => l())
}
function subscribe(listener) {
  listeners.add(listener)
  // localStorage-события из других вкладок
  const onStorage = () => listener()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

// ====================== ЗАПИСИ ======================

export function loadEntries() {
  const list = readJSON(KEYS.entries, [])
  // сортировка по дате (новые сверху), затем по времени создания
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return (b.createdAt || '') < (a.createdAt || '') ? 1 : -1
  })
}

let entriesCache = null
function getEntriesSnapshot() {
  // useSyncExternalStore требует стабильную ссылку между эмитами
  if (entriesCache === null) entriesCache = loadEntries()
  return entriesCache
}
function invalidateEntries() {
  entriesCache = null
  emit()
}

export function addEntry(entry) {
  const list = loadEntries()
  const full = {
    id: entry.id || cryptoId(),
    createdAt: entry.createdAt || new Date().toISOString(),
    ...entry
  }
  writeJSON(KEYS.entries, [full, ...list])
  invalidateEntries()
  return full
}

export function updateEntry(id, patch) {
  const list = loadEntries().map((e) => (e.id === id ? { ...e, ...patch } : e))
  writeJSON(KEYS.entries, list)
  invalidateEntries()
}

export function deleteEntry(id) {
  const list = loadEntries().filter((e) => e.id !== id)
  writeJSON(KEYS.entries, list)
  invalidateEntries()
}

export function getEntry(id) {
  return loadEntries().find((e) => e.id === id) || null
}

export function useEntries() {
  const entries = useSyncExternalStore(subscribe, getEntriesSnapshot, getEntriesSnapshot)
  return {
    entries,
    addEntry: useCallback((e) => addEntry(e), []),
    updateEntry: useCallback((id, p) => updateEntry(id, p), []),
    deleteEntry: useCallback((id) => deleteEntry(id), [])
  }
}

// ====================== НАСТРОЙКИ ======================

const DEFAULT_SETTINGS = {
  apiKey: '',
  provider: 'anthropic', // 'anthropic' | 'openrouter'
  model: 'claude-sonnet-4-6', // модель для Anthropic
  openrouterModel: 'anthropic/claude-sonnet-4.6', // слаг модели для OpenRouter
  useAI: false, // живой ИИ по умолчанию выключен — приватность
  oracleLayer: false, // лунный/астро слой выключен по умолчанию
  bgStyle: 'constellations', // aurora | constellations | mandala
  theme: 'cosmos', // cosmos (тёмная) | glass | eink
  shareCollective: false, // анонимный обмен образами для коллективной карты
  userName: ''
}

let settingsCache = null
function getSettingsSnapshot() {
  if (settingsCache === null) {
    settingsCache = { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) }
  }
  return settingsCache
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) }
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch }
  writeJSON(KEYS.settings, next)
  settingsCache = null
  emit()
  return next
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSettingsSnapshot, getSettingsSnapshot)
  return { settings, saveSettings: useCallback((p) => saveSettings(p), []) }
}

// ====================== ЛИЧНЫЙ СЛОВАРЬ СИМВОЛОВ ======================
// { root: { meaning, valence } } — личные значения перекрывают общую базу.

let symbolsCache = null
function getSymbolsSnapshot() {
  if (symbolsCache === null) symbolsCache = readJSON(KEYS.symbols, {})
  return symbolsCache
}

export function loadPersonalSymbols() {
  return readJSON(KEYS.symbols, {})
}

export function setPersonalSymbol(root, meaning, valence = 'neutral') {
  const map = loadPersonalSymbols()
  map[root.trim().toLowerCase()] = { meaning: meaning.trim(), valence }
  writeJSON(KEYS.symbols, map)
  symbolsCache = null
  emit()
}

export function removePersonalSymbol(root) {
  const map = loadPersonalSymbols()
  delete map[root]
  writeJSON(KEYS.symbols, map)
  symbolsCache = null
  emit()
}

export function usePersonalSymbols() {
  const symbols = useSyncExternalStore(subscribe, getSymbolsSnapshot, getSymbolsSnapshot)
  return {
    symbols,
    setPersonalSymbol: useCallback((r, m, v) => setPersonalSymbol(r, m, v), []),
    removePersonalSymbol: useCallback((r) => removePersonalSymbol(r), [])
  }
}

// ====================== УПРАЖНЕНИЯ ======================
// Хранят историю заданий и замеры индекса «до/после».

export function loadExercises() {
  return readJSON(KEYS.exercises, [])
}

// Кэш снапшота: useSyncExternalStore требует стабильную ссылку между эмитами,
// иначе React уходит в бесконечный цикл и экран падает.
let exercisesCache = null
function getExercisesSnapshot() {
  if (exercisesCache === null) exercisesCache = loadExercises()
  return exercisesCache
}

export function saveExercise(ex) {
  const list = loadExercises()
  const full = { id: ex.id || cryptoId(), createdAt: new Date().toISOString(), status: 'active', ...ex }
  writeJSON(KEYS.exercises, [full, ...list])
  exercisesCache = null
  emit()
  return full
}

export function updateExercise(id, patch) {
  const list = loadExercises().map((e) => (e.id === id ? { ...e, ...patch } : e))
  writeJSON(KEYS.exercises, list)
  exercisesCache = null
  emit()
}

export function useExercises() {
  const ex = useSyncExternalStore(subscribe, getExercisesSnapshot, getExercisesSnapshot)
  return { exercises: ex, saveExercise, updateExercise }
}

// ====================== УТИЛИТЫ ======================

export function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function todayISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// Экспорт/импорт всех данных — для бэкапа.
export function exportAll() {
  return {
    entries: loadEntries(),
    settings: loadSettings(),
    personalSymbols: loadPersonalSymbols(),
    exercises: loadExercises(),
    exportedAt: new Date().toISOString()
  }
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  entriesCache = settingsCache = symbolsCache = exercisesCache = null
  emit()
}
