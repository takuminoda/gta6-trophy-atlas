// store.js — progress state: localStorage persistence, export/import and demo seeding.
export const STORAGE_KEY = 'leonida-trophy-atlas:v1';

// Thirteen trophies the ?demo=1 preview marks as earned: the twelve story trophies plus
// the 100% Gold, so the screenshots show a real mid-run state.
export const DEMO_EARNED_IDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const EXPORT_FORMAT = 'leonida-trophy-atlas/progress/v1';

export function createDefaultState() {
  return {
    earnedIds: [],
    spoiler: true,
    kind: 'all',
    grade: 'all',
    query: '',
    missableOnly: false,
    view: 'checklist',
    selectedId: null,
    demo: false,
  };
}

// Read the saved checklist. Only the ticks and the spoiler preference survive a reload;
// filters and the selected trophy are session state.
export function loadPersistedState() {
  const state = createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return state;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earnedIds)) {
      state.earnedIds = saved.earnedIds.filter((id) => Number.isInteger(id));
    }
    if (typeof saved.spoiler === 'boolean') state.spoiler = saved.spoiler;
  } catch {
    // A missing or unreadable store is not fatal: start from an empty checklist.
  }
  return state;
}

export function persistState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ earnedIds: state.earnedIds, spoiler: state.spoiler }),
    );
  } catch {
    // Private browsing or a full store: the checklist still works for this session.
  }
}

export function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore: nothing to clear.
  }
}

// Demo mode is a preview only — it never writes to localStorage.
export function applyDemoState(state) {
  state.demo = true;
  state.earnedIds = [...DEMO_EARNED_IDS];
}

export function isEarned(state, id) {
  return state.earnedIds.includes(id);
}

export function setEarned(state, id, earned) {
  const has = state.earnedIds.includes(id);
  if (earned && !has) state.earnedIds.push(id);
  if (!earned && has) state.earnedIds = state.earnedIds.filter((value) => value !== id);
}

export function toggleEarned(state, id) {
  setEarned(state, id, !isEarned(state, id));
}

export function earnedCount(state) {
  return state.earnedIds.length;
}

export function buildExportPayload(state) {
  return {
    format: EXPORT_FORMAT,
    earnedIds: [...state.earnedIds].sort((a, b) => a - b),
    exportedAt: new Date().toISOString(),
  };
}

// Accept either this app's export or a bare array of trophy ids.
export function parseImportedPayload(text) {
  const raw = JSON.parse(text);
  const ids = Array.isArray(raw) ? raw : raw && raw.earnedIds;
  if (!Array.isArray(ids)) throw new Error('No earnedIds array found in that file.');
  const clean = ids.filter((id) => Number.isInteger(id));
  if (clean.length !== ids.length) throw new Error('The file holds values that are not trophy ids.');
  return clean;
}
