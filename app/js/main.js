// main.js — boot, URL params, event wiring and the render loop.
import {
  createDefaultState,
  loadPersistedState,
  persistState,
  applyDemoState,
  toggleEarned,
  buildExportPayload,
  parseImportedPayload,
} from './store.js';
import { applyFilters, summarize } from './filters.js';
import {
  renderKindChips,
  renderTrophyList,
  renderDetailPane,
  renderDetailView,
  renderRoadmap,
  renderMissables,
} from './views.js';

const els = {
  progressFill: document.getElementById('progress-fill'),
  progressLabel: document.getElementById('progress-label'),
  demoBadge: document.getElementById('demo-badge'),
  search: document.getElementById('search'),
  kindChips: document.getElementById('kind-chips'),
  gradeFilter: document.getElementById('grade-filter'),
  missableFilter: document.getElementById('missable-filter'),
  spoilerToggle: document.getElementById('spoiler-toggle'),
  exportBtn: document.getElementById('export-btn'),
  importBtn: document.getElementById('import-btn'),
  importInput: document.getElementById('import-input'),
  tabs: document.getElementById('tabs'),
  list: document.getElementById('trophy-list'),
  listSummary: document.getElementById('list-summary'),
  detailPane: document.getElementById('detail-pane'),
  roadmap: document.getElementById('view-roadmap'),
  detailView: document.getElementById('view-detail'),
  missables: document.getElementById('view-missables'),
  views: {
    checklist: document.getElementById('view-checklist'),
    roadmap: document.getElementById('view-roadmap'),
    detail: document.getElementById('view-detail'),
    missables: document.getElementById('view-missables'),
  },
};

let data = { trophies: [], stages: [] };
let state = createDefaultState();

const handlers = {
  onSelect(id) {
    state.selectedId = id;
    renderAll();
  },
  onToggle(id) {
    toggleEarned(state, id);
    if (!state.demo) persistState(state);
    renderAll();
  },
  onOpenDetail(id) {
    state.selectedId = id;
    state.view = 'detail';
    renderAll();
  },
  onBack() {
    state.view = 'checklist';
    renderAll();
  },
};

function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    demo: params.get('demo') === '1',
    view: params.get('view') || 'checklist',
    trophy: params.get('trophy'),
    spoiler: params.get('spoiler'),
  };
}

function findTrophy(token) {
  const raw = String(token).trim();
  const byId = data.trophies.find((trophy) => trophy.id === Number(raw));
  if (byId) return byId;
  const lower = raw.toLowerCase();
  return (
    data.trophies.find((trophy) => trophy.name.toLowerCase() === lower) ??
    data.trophies.find((trophy) => trophy.name.toLowerCase().includes(lower)) ??
    null
  );
}

function showFatal(message) {
  els.list.replaceChildren();
  const p = document.createElement('p');
  p.className = 'missables-note';
  p.textContent = message;
  els.list.append(p);
}

function showView(view) {
  for (const [name, node] of Object.entries(els.views)) {
    node.hidden = name !== view;
  }
  for (const tab of els.tabs.querySelectorAll('.tab')) {
    const tabView = tab.dataset.view;
    const active = view === 'detail' ? tabView === 'checklist' : tabView === view;
    tab.classList.toggle('active', active);
  }
}

function renderProgress() {
  const total = data.trophies.length || 55;
  const earned = state.earnedIds.length;
  const percent = total ? Math.round((earned / total) * 100) : 0;
  els.progressFill.style.width = `${percent}%`;
  els.progressLabel.textContent = `${earned} / ${total} earned (${percent}%)`;
  els.demoBadge.hidden = !state.demo;
}

function renderSummary(visible) {
  const counts = summarize(data.trophies, state);
  els.listSummary.innerHTML = `Showing <strong>${counts.shown}</strong> of <strong>${counts.total}</strong> trophies · <strong>${counts.earnedShown}</strong> earned in this filter · <strong>${counts.missable}</strong> flagged missable`;
}

function renderAll() {
  const visible = applyFilters(data.trophies, state);
  if (state.selectedId == null || !data.trophies.some((trophy) => trophy.id === state.selectedId)) {
    state.selectedId = visible.length ? visible[0].id : null;
  }
  const selected = data.trophies.find((trophy) => trophy.id === state.selectedId) ?? null;

  renderKindChips(els.kindChips, state, (kind) => {
    state.kind = kind;
    renderAll();
  });
  renderProgress();
  renderTrophyList(els.list, visible, state, handlers);
  renderDetailPane(els.detailPane, selected, state, handlers);
  renderRoadmap(els.roadmap, data, state);
  renderMissables(els.missables, data.trophies, state);
  renderDetailView(els.detailView, selected, state, handlers);
  renderSummary(visible);
  showView(state.view);

  if (document.activeElement !== els.search) els.search.value = state.query;
  els.gradeFilter.value = state.grade;
  els.missableFilter.checked = state.missableOnly;
  els.spoilerToggle.checked = state.spoiler;
}

function wireEvents() {
  els.search.addEventListener('input', () => {
    state.query = els.search.value;
    renderAll();
  });
  els.gradeFilter.addEventListener('change', () => {
    state.grade = els.gradeFilter.value;
    renderAll();
  });
  els.missableFilter.addEventListener('change', () => {
    state.missableOnly = els.missableFilter.checked;
    renderAll();
  });
  els.spoilerToggle.addEventListener('change', () => {
    state.spoiler = els.spoilerToggle.checked;
    if (!state.demo) persistState(state);
    renderAll();
  });
  els.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (!tab) return;
    state.view = tab.dataset.view;
    renderAll();
  });
  els.exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(buildExportPayload(state), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leonida-trophy-progress.json';
    link.click();
    URL.revokeObjectURL(url);
  });
  els.importBtn.addEventListener('click', () => els.importInput.click());
  els.importInput.addEventListener('change', async () => {
    const file = els.importInput.files && els.importInput.files[0];
    if (!file) return;
    try {
      const ids = parseImportedPayload(await file.text());
      state.earnedIds = ids;
      if (!state.demo) persistState(state);
      renderAll();
    } catch (error) {
      window.alert(`Import failed: ${error.message}`);
    }
    els.importInput.value = '';
  });
}

async function boot() {
  const url = readUrlParams();
  state = url.demo ? createDefaultState() : loadPersistedState();
  if (url.demo) applyDemoState(state);
  if (url.spoiler === '0') state.spoiler = false;
  if (url.spoiler === '1') state.spoiler = true;

  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    showFatal(`Could not load data/trophies.json (${error.message}). Serve this folder over HTTP and reload.`);
    return;
  }

  const view = ['checklist', 'roadmap', 'detail', 'missables'].includes(url.view) ? url.view : 'checklist';
  state.view = view;
  const wanted = url.trophy ? findTrophy(url.trophy) : null;
  if (wanted) state.selectedId = wanted.id;

  wireEvents();
  renderAll();
}

boot();
