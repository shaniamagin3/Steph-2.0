/**
 * Persistence.
 *
 * Everything lives on this device. There is no server, no account and no
 * network call anywhere in this app. Your weight, your measurements, your
 * journal entries and your photos never leave the browser they were entered in.
 *
 * That is a deliberate trade: it means nobody can sell or leak this data, and
 * it means clearing your browser data deletes it. Use Export regularly. The
 * Export file is the backup.
 *
 * Structured data -> localStorage (small, synchronous, easy to export).
 * Photos          -> IndexedDB (blobs; would blow the localStorage quota).
 */

import { todayIso, weekStart } from './cycle.js';
import { DEFAULT_PREFERENCES } from './planner.js';
import { DEFAULTS as PROGRAM_DEFAULTS } from './program.js';
import { setCustomMeals } from './registry.js';

const KEY = 'steph2:state:v1';
const SCHEMA_VERSION = 1;

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    profile: {
      name: '',
      sex: 'female',
      age: null,
      heightCm: null,
      weightKg: null,
      activityKey: 'light',
      proteinGPerKg: 2.0,
      fatPctOfKcal: 0.30,
      hasPcos: true,
      notes: '',
    },
    program: null,
    programSettings: { ...PROGRAM_DEFAULTS },
    preferences: { ...DEFAULT_PREFERENCES },
    customMeals: [],
    plans: {},    // weekStart ISO -> plan
    daily: {},    // ISO date -> daily entry
    weekly: {},   // weekStart ISO -> weekly check-in
    cycle: {
      periodStarts: [],
      cycleLength: 28,
      periodLength: 5,
      irregular: false,
    },
    photos: {},   // ISO date -> { front:id, side:id, back:id, weightKg, note }
    settings: {
      units: 'metric',
      theme: 'system',
      lastPlanSeed: null,
    },
  };
}

/** Deep-merge loaded state over defaults so a new field never lands undefined. */
function hydrate(loaded) {
  const base = defaultState();
  if (!loaded || typeof loaded !== 'object') return base;

  const merged = { ...base, ...loaded };
  merged.profile = { ...base.profile, ...(loaded.profile ?? {}) };
  merged.programSettings = { ...base.programSettings, ...(loaded.programSettings ?? {}) };
  merged.preferences = { ...base.preferences, ...(loaded.preferences ?? {}) };
  merged.cycle = { ...base.cycle, ...(loaded.cycle ?? {}) };
  merged.settings = { ...base.settings, ...(loaded.settings ?? {}) };
  merged.customMeals = Array.isArray(loaded.customMeals) ? loaded.customMeals : [];
  for (const k of ['plans', 'daily', 'weekly', 'photos']) {
    merged[k] = loaded[k] && typeof loaded[k] === 'object' ? loaded[k] : {};
  }
  merged.schemaVersion = SCHEMA_VERSION;
  return merged;
}

let state = defaultState();
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = hydrate(raw ? JSON.parse(raw) : null);
  } catch (err) {
    console.warn('Could not read saved data; starting fresh.', err);
    state = defaultState();
  }
  setCustomMeals(state.customMeals);
  return state;
}

export function getState() {
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    // Quota is the realistic failure here.
    console.error('Save failed', err);
    return { ok: false, error: err?.name === 'QuotaExceededError'
      ? 'Storage is full. Export your data, then delete some older photos.'
      : 'Could not save to this browser. If you are in private browsing, storage is blocked.' };
  }
}

/**
 * Mutate state through a function, persist, and notify subscribers.
 * @param {(s:any)=>void} fn
 */
export function update(fn) {
  fn(state);
  if (state.customMeals) setCustomMeals(state.customMeals);
  const result = save();
  for (const l of listeners) l(state);
  return result;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  for (const l of listeners) l(state);
}

// ---------------------------------------------------------------------------
// Convenience accessors
// ---------------------------------------------------------------------------

export function getDaily(date = todayIso()) {
  return state.daily[date] ?? null;
}

export function setDaily(date, patch) {
  return update((s) => {
    s.daily[date] = { ...(s.daily[date] ?? {}), date, ...patch, updatedAt: new Date().toISOString() };
  });
}

export function getWeekly(ws = weekStart(todayIso())) {
  return state.weekly[ws] ?? null;
}

export function setWeekly(ws, patch) {
  return update((s) => {
    s.weekly[ws] = { ...(s.weekly[ws] ?? {}), weekStart: ws, ...patch, updatedAt: new Date().toISOString() };
  });
}

export function getPlan(ws = weekStart(todayIso())) {
  return state.plans[ws] ?? null;
}

export function setPlan(ws, plan) {
  return update((s) => { s.plans[ws] = plan; });
}

export function addPeriodStart(dateIso) {
  return update((s) => {
    if (!s.cycle.periodStarts.includes(dateIso)) {
      s.cycle.periodStarts.push(dateIso);
      s.cycle.periodStarts.sort();
    }
  });
}

export function isProfileComplete(s = state) {
  const p = s.profile;
  return !!(p.age > 0 && p.heightCm > 0 && p.weightKg > 0 && p.activityKey);
}

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------

/** Everything except photo blobs, as a JSON string. */
export function exportJson() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJson(text, { merge = false } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
    return { ok: false, error: 'That does not look like a Steph 2.0 export file.' };
  }

  if (merge) {
    const incoming = hydrate(parsed);
    state = {
      ...state,
      daily: { ...state.daily, ...incoming.daily },
      weekly: { ...state.weekly, ...incoming.weekly },
      plans: { ...state.plans, ...incoming.plans },
      photos: { ...state.photos, ...incoming.photos },
      customMeals: [
        ...state.customMeals,
        ...incoming.customMeals.filter((m) => !state.customMeals.some((x) => x.id === m.id)),
      ],
    };
  } else {
    state = hydrate(parsed);
  }

  setCustomMeals(state.customMeals);
  const res = save();
  notify();
  return res.ok ? { ok: true } : res;
}

export function resetAll() {
  state = defaultState();
  localStorage.removeItem(KEY);
  setCustomMeals([]);
  notify();
}

// ---------------------------------------------------------------------------
// Photos (IndexedDB)
// ---------------------------------------------------------------------------

const DB_NAME = 'steph2-photos';
const DB_STORE = 'photos';
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(DB_STORE, mode);
    const store = t.objectStore(DB_STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export async function savePhoto(id, blob) {
  await tx('readwrite', (store) => store.put(blob, id));
  return id;
}

export async function loadPhoto(id) {
  if (!id) return null;
  return tx('readonly', (store) => store.get(id));
}

export async function deletePhoto(id) {
  if (!id) return;
  await tx('readwrite', (store) => store.delete(id));
}

/**
 * Downscale an image before storing it. Phone photos are 4-8MB each; at three
 * angles every four weeks that fills a browser quota surprisingly fast, and a
 * 1200px image is more than enough to see the change.
 */
export function downscaleImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process that image.'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image file.')); };
    img.src = url;
  });
}

/** Rough storage usage, for the warning on the Data tab. */
export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usage, quota, pct: quota ? Math.round((usage / quota) * 100) : null };
}
