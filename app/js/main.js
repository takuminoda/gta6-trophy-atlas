// main.js — boot, URL-driven screenshot states, event wiring and the render loop.
import { createState, loadSaved, saveState, applyDemo, isEarned, toggleEarned,
  setCounter, exportPayload, parseImport } from './store.js';
import { visibleTrophies } from './filters.js';
import { renderHeader, renderAudit, renderChips, renderIndex, renderDetail,
  renderRoadmap, renderMissables, renderSave } from './views.js';

const byId = (id) => document.getElementById(id);
const els = {
  progressLabel: byId('progress-label'), progressFill: byId('progress-fill'),
  gradeBreakdown: byId('grade-breakdown'), spoilerState: byId('spoiler-state'),
  savedNote: byId('saved-note'), audit: byId('audit'), chips: byId('chips'),
  search: byId('search'), gradeFilter: byId('grade-filter'), spoilerToggle: byId('spoiler-toggle'),
  tabs: byId('tabs'), tabStatus: byId('tab-status'), summary: byId('list-summary'),
  list: byId('trophy-list'), detail: byId('detail-pane'), roadmap: byId('view-roadmap'),
  missables: byId('view-missables'), save: byId('view-save'), importInput: byId('import-input'),
  footerSources: byId('footer-sources'),
};
const views = { checklist: byId('view-checklist'), roadmap: els.roadmap, missables: els.missables, save: els.save };

let data = { trophies: [], stages: [] };
let state = createState();

const handlers = {
  select(id) { state.selectedId = id; renderAll(); },
  toggle(id) { toggleEarned(state, id); saveState(state); renderAll(); },
  reveal(id) {
    if (!state.revealed.includes(id)) state.revealed.push(id);
    renderAll();
  },
  count(id, value) {
    const trophy = data.trophies.find((item) => item.id === id);
    setCounter(state, id, value, trophy.target);
    saveState(state);
    renderAll();
  },
};

function readUrl() {
  const params = new URLSearchParams(location.search);
  const hash = location.hash.replace('#', '');
  return {
    demo: params.get('demo') === '1',
    spoiler: params.get('spoiler'),
    trophy: params.get('trophy'),
    kind: params.get('kind'),
    grade: params.get('grade'),
    query: params.get('q'),
    view: ['checklist', 'roadmap', 'missables', 'save'].includes(hash)
      ? hash : (['checklist', 'roadmap', 'missables', 'save'].includes(params.get('view'))
        ? params.get('view') : 'checklist'),
  };
}

function findTrophy(token) {
  if (!token) return null;
  return data.trophies.find((item) => String(item.id) === token)
    || data.trophies.find((item) => item.name.toLowerCase() === token.toLowerCase())
    || null;
}

function showView(view) {
  for (const [name, node] of Object.entries(views)) node.hidden = name !== view;
  for (const tab of els.tabs.querySelectorAll('.tab')) tab.classList.toggle('active', tab.dataset.view === view);
  const messages = {
    checklist: 'CHECKLIST · PROGRESS SAVED LOCALLY',
    roadmap: 'ALL 55 PLACED ON THE ROUTE',
    missables: 'WINDOWS + SOURCES CHECKED',
    save: 'LOCAL STORAGE · EXPORT / IMPORT',
  };
  els.tabStatus.textContent = state.demo
    ? `PREVIEW · ${state.earnedIds.length}/55 · NOTHING WRITTEN`
    : messages[view];
}

function renderAll() {
  renderHeader(els, data, state);
  renderAudit(els.audit, data);
  renderChips(els.chips, data.trophies, state, (kind) => { state.kind = kind; renderAll(); });
  const visible = visibleTrophies(data.trophies, state);
  if (!data.trophies.some((trophy) => trophy.id === state.selectedId)) state.selectedId = visible[0]?.id ?? null;
  const selected = data.trophies.find((trophy) => trophy.id === state.selectedId) || null;
  renderIndex(els, visible, data.trophies, state, handlers);
  renderDetail(els.detail, selected, state, handlers);
  renderRoadmap(els.roadmap, data, state);
  renderMissables(els.missables, data, state);
  renderSave(els.save, data, state);
  showView(state.view);
  if (document.activeElement !== els.search) els.search.value = state.query;
  els.gradeFilter.value = state.grade;
  els.spoilerToggle.checked = state.spoiler;
}

function setSpoiler(value) {
  state.spoiler = value;
  saveState(state);
  renderAll();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(exportPayload(state), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(url);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const parsed = parseImport(await file.text());
    state.earnedIds = parsed.earnedIds;
    state.counters = parsed.counters;
    if (typeof parsed.spoiler === 'boolean') state.spoiler = parsed.spoiler;
    saveState(state);
    renderAll();
  } catch (error) {
    window.alert(`Import failed: ${error.message}`);
  }
  els.importInput.value = '';
}

function wireEvents() {
  els.search.addEventListener('input', () => { state.query = els.search.value; renderAll(); });
  els.gradeFilter.addEventListener('change', () => { state.grade = els.gradeFilter.value; renderAll(); });
  els.spoilerToggle.addEventListener('change', () => setSpoiler(els.spoilerToggle.checked));
  els.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (!tab) return;
    const view = tab.dataset.view;
    if (location.hash !== `#${view}`) location.hash = view;
    else { state.view = view; renderAll(); }
  });
  window.addEventListener('hashchange', () => {
    const view = location.hash.replace('#', '');
    if (['checklist', 'roadmap', 'missables', 'save'].includes(view)) {
      state.view = view;
      renderAll();
    }
  });
  for (const button of document.querySelectorAll('[data-action="export"]')) {
    button.addEventListener('click', exportProgress);
  }
  for (const button of document.querySelectorAll('[data-action="import"]')) {
    button.addEventListener('click', () => els.importInput.click());
  }
  els.importInput.addEventListener('change', () => importProgress(els.importInput.files[0]));
  els.save.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.textContent.includes('Export')) exportProgress();
    if (button.textContent.includes('Import')) els.importInput.click();
    if (button.textContent.includes('Clear') && window.confirm('Clear all saved progress in this browser?')) {
      state.earnedIds = [];
      state.counters = {};
      saveState(state);
      renderAll();
    }
  });
}

async function boot() {
  const url = readUrl();
  state = url.demo ? applyDemo(createState()) : loadSaved();
  if (url.spoiler === '0') state.spoiler = false;
  if (url.spoiler === '1') state.spoiler = true;
  if (url.kind) state.kind = url.kind;
  if (url.grade) state.grade = url.grade;
  if (url.query) state.query = url.query;
  state.view = url.view;

  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    els.list.textContent = `Could not load data/trophies.json (${error.message}). Serve app/ over HTTP.`;
    return;
  }
  const wanted = findTrophy(url.trophy);
  if (wanted) state.selectedId = wanted.id;
  els.footerSources.textContent = `${data.sourceCount} SOURCES · READ ${data.sourcesRead}`;
  wireEvents();
  renderAll();
}

boot();
