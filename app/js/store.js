// store.js — progress state, localStorage persistence and export/import.
// Only earned ticks, partial counters and the spoiler preference are saved.
export const STORAGE_KEY = 'leonida-atlas/v2';
export const EXPORT_FORMAT = 'leonida-trophy-atlas/progress/v2';

// ?demo=1 seeds a mid-run board for repeatable screenshots; demo never writes storage.
export const DEMO_EARNED = [2, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 28, 30];
export const DEMO_COUNTERS = { 14: 38, 15: 12, 17: 17, 28: 9, 31: 24, 40: 3 };

export function createState() {
  return {
    earnedIds: [], counters: {}, spoiler: true, revealed: [],
    kind: 'all', grade: 'all', query: '', view: 'checklist',
    selectedId: 28, demo: false,
  };
}

export function loadSaved() {
  const state = createState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return state;
    if (Array.isArray(saved.earnedIds)) state.earnedIds = saved.earnedIds.filter(Number.isInteger);
    if (saved.counters && typeof saved.counters === 'object') {
      for (const [key, value] of Object.entries(saved.counters)) {
        if (Number.isInteger(Number(key)) && Number.isInteger(value)) state.counters[Number(key)] = value;
      }
    }
    if (typeof saved.spoiler === 'boolean') state.spoiler = saved.spoiler;
  } catch {
    // A corrupt store simply starts a fresh checklist.
  }
  return state;
}

export function saveState(state) {
  if (state.demo) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      earnedIds: state.earnedIds, counters: state.counters, spoiler: state.spoiler,
    }));
    return true;
  } catch {
    return false;
  }
}

export function applyDemo(state) {
  state.demo = true;
  state.earnedIds = [...DEMO_EARNED];
  state.counters = { ...DEMO_COUNTERS };
  return state;
}

export function isEarned(state, id) { return state.earnedIds.includes(id); }

export function toggleEarned(state, id) {
  state.earnedIds = isEarned(state, id)
    ? state.earnedIds.filter((value) => value !== id)
    : [...state.earnedIds, id];
}

export function setCounter(state, id, value, target) {
  const max = Math.max(0, target || 0);
  state.counters[id] = Math.min(max, Math.max(0, value));
  if (target > 0 && state.counters[id] >= target && !isEarned(state, id)) state.earnedIds.push(id);
}

export function exportPayload(state) {
  return {
    format: EXPORT_FORMAT,
    earnedIds: [...state.earnedIds].sort((a, b) => a - b),
    counters: { ...state.counters },
    spoiler: state.spoiler,
    exportedAt: new Date().toISOString(),
  };
}

// Accepts this app's export or a bare array of ids from a simpler tracker.
export function parseImport(text) {
  const raw = JSON.parse(text);
  const ids = Array.isArray(raw) ? raw : raw && raw.earnedIds;
  if (!Array.isArray(ids)) throw new Error('No earnedIds array in that file.');
  if (ids.some((id) => !Number.isInteger(id))) throw new Error('The file holds non-trophy values.');
  const counters = raw && !Array.isArray(raw) && raw.counters && typeof raw.counters === 'object'
    ? raw.counters : {};
  return { earnedIds: ids, counters, spoiler: raw && raw.spoiler };
}
