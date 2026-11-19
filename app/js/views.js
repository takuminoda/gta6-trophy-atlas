// views.js — all rendering: audit strip, chapter index, cited guide, roadmap, missables, save.
import { CHIPS, GRADES, BUCKET_ORDER, chapterBucket, chipCount, gradeCounts } from './filters.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function hiddenStory(trophy, state) {
  return state.spoiler && trophy.kind === 'story' && !state.earnedIds.includes(trophy.id)
    && !state.revealed.includes(trophy.id);
}

function gradePill(trophy) { return el('span', `grade grade-${trophy.grade}`, trophy.grade.slice(0, 4).toUpperCase()); }

// Every [n] in a written step becomes a link to that trophy's own source list.
function appendCited(parent, text, trophy) {
  const pattern = /\[(\d+)\]/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const source = trophy.sources[Number(match[1]) - 1];
    const cite = el('a', 'cite', match[0]);
    if (source) {
      cite.href = source.url;
      cite.title = `${source.name} · read ${source.read}`;
      cite.target = '_blank';
      cite.rel = 'noopener noreferrer';
    }
    parent.append(cite);
    cursor = match.index + match[0].length;
  }
  parent.append(document.createTextNode(text.slice(cursor)));
}

function sourceChips(trophy) {
  const wrap = el('span', 'src-chips');
  trophy.sources.slice(0, 3).forEach((source, index) => {
    const link = el('a', 'src-chip', String(index + 1));
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `${source.name} (${source.read})`;
    wrap.append(link);
  });
  return wrap;
}

export function renderHeader(els, data, state) {
  const trophies = data.trophies;
  const earned = trophies.filter((trophy) => state.earnedIds.includes(trophy.id));
  const total = gradeCounts(trophies);
  const got = gradeCounts(earned);
  els.progressLabel.textContent = `${earned.length} / ${trophies.length}`;
  els.progressFill.style.width = `${Math.round(earned.length / trophies.length * 100)}%`;
  els.gradeBreakdown.replaceChildren();
  GRADES.forEach((grade) => {
    const cell = el('span', '', '');
    cell.append(el('b', '', ` ${got[grade]}/${total[grade]} `), document.createTextNode(`${grade[0].toUpperCase()}  `));
    els.gradeBreakdown.append(cell);
  });
  els.spoilerState.textContent = state.spoiler ? 'SPOILERS ON' : 'SPOILERS OFF';
  els.spoilerState.classList.toggle('off', !state.spoiler);
  els.savedNote.textContent = state.demo ? 'Saved in this browser · preview' : 'Saved in this browser';
}

export function renderAudit(container, data) {
  const trophies = data.trophies;
  const grades = gradeCounts(trophies);
  const missable = trophies.filter((trophy) => trophy.missable).length;
  const unknown = trophies.filter((trophy) => trophy.uncertain).length;
  const cells = [
    ['Official trophies', `${trophies.length}`, 'good'],
    ['Grade split', `${grades.platinum}P · ${grades.gold}G · ${grades.silver}S · ${grades.bronze}B`, ''],
    ['Cited guides', `${trophies.filter((t) => t.sources.length && t.guide.trim()).length}/${trophies.length}`, 'good'],
    ['Distinct sources', `${data.sourceCount} named guides`, ''],
    ['Possibly missable', `${missable} flagged`, 'hot'],
    ['Triggers not pinned', `${unknown} unconfirmed`, 'hot'],
    ['Sources read', data.sourcesRead, ''],
  ];
  container.replaceChildren();
  for (const [label, value, tone] of cells) {
    const cell = el('div', `audit-cell ${tone}`);
    cell.append(el('span', 'k', label), el('span', 'v', value));
    container.append(cell);
  }
}

export function renderChips(container, trophies, state, onPick) {
  container.replaceChildren();
  for (const [key, label] of CHIPS) {
    const chip = el('button', `chip${key === state.kind ? ' active' : ''}${key === 'missable' ? ' hot' : ''}`);
    chip.type = 'button';
    chip.append(document.createTextNode(label), el('b', '', String(chipCount(trophies, state, key))));
    chip.addEventListener('click', () => onPick(key));
    container.append(chip);
  }
}

export function renderIndex(els, visible, trophies, state, handlers) {
  els.summary.textContent = `${visible.length} shown / ${trophies.length} · ${state.earnedIds.length} earned · click a row for its cited guide`;
  const list = els.list;
  list.replaceChildren();
  for (const bucket of BUCKET_ORDER) {
    const rows = visible.filter((trophy) => chapterBucket(trophy) === bucket);
    if (!rows.length) continue;
    const head = el('div', 'group-head');
    head.append(document.createTextNode(bucket), el('span', '', `${rows.length} trophies`));
    list.append(head);
    for (const trophy of rows) {
      const hidden = hiddenStory(trophy, state);
      const earned = state.earnedIds.includes(trophy.id);
      const card = el('div', `trophy-card${earned ? ' earned' : ''}${state.selectedId === trophy.id ? ' selected' : ''}`);
      card.tabIndex = 0;
      const check = el('button', 'check');
      check.type = 'button';
      check.title = earned ? 'Mark as not earned' : 'Mark as earned';
      check.addEventListener('click', (event) => { event.stopPropagation(); handlers.toggle(trophy.id); });
      const main = el('div', 'card-main');
      const top = el('div', 'card-top');
      top.append(el('span', `name${hidden ? ' hidden-story' : ''}`,
        hidden ? 'Story trophy — hidden until earned' : trophy.name), gradePill(trophy));
      const desc = el('div', 'desc', hidden
        ? 'Hidden until earned · use Reveal to peek at your own risk'
        : trophy.description);
      const meta = el('div', 'card-meta');
      meta.append(el('span', 'tag', `STAGE ${trophy.stage} · ${trophy.chapter}`));
      if (trophy.missable) meta.append(el('span', 'tag warn', 'POSSIBLY MISSABLE'));
      if (trophy.uncertain) meta.append(el('span', 'tag unknown', 'TRIGGER NOT PINNED'));
      if (hidden) {
        const reveal = el('button', 'reveal', 'REVEAL');
        reveal.type = 'button';
        reveal.addEventListener('click', (event) => { event.stopPropagation(); handlers.reveal(trophy.id); });
        meta.append(reveal);
      }
      main.append(top, desc, meta);
      const right = el('div', 'card-right');
      right.append(sourceChips(trophy));
      card.append(check, main, right);
      card.addEventListener('click', () => handlers.select(trophy.id));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlers.select(trophy.id); }
      });
      list.append(card);
    }
  }
}

function stepper(trophy, state, handlers) {
  if (trophy.target < 5 || trophy.target > 1000 || trophy.grade === 'platinum') return null;
  const value = Math.min(trophy.target, state.counters[trophy.id] || 0);
  const box = el('div', 'stepper');
  const head = el('div', 'stepper-head');
  const label = el('strong', '', '');
  label.append(document.createTextNode(`${value} / ${trophy.target} `), el('em', '', trophy.count));
  const buttons = el('div', 'stepper-buttons');
  const minus = el('button', '', '−');
  const plus = el('button', '', '+');
  minus.type = 'button'; plus.type = 'button';
  minus.addEventListener('click', () => handlers.count(trophy.id, value - 1));
  plus.addEventListener('click', () => handlers.count(trophy.id, value + 1));
  buttons.append(minus, plus);
  head.append(label, buttons);
  const track = el('div', 'stepper-track');
  const fill = el('span');
  fill.style.width = `${Math.round(value / trophy.target * 100)}%`;
  track.append(fill);
  box.append(head, track, el('div', 'stepper-note', 'Partial progress is saved in this browser. + / − also marks the trophy at the target.'));
  return box;
}

const MISSABLE_TEXT = {
  28: 'POSSIBLY MISSABLE — the morning after Chapter 1’s Down to Earth, follow Lucia to the balcony and accept her meditation. That scene is gone after Chapter 1. GTABase and PowerPyx flag it, but neither confirms the trophy needs it, so do it [1][2].',
  44: 'POSSIBLY MISSABLE — a one-off Ocean Beach cocktail scene whose exact trigger is still unconfirmed. No source confirms it repeats after the story, so try it early [1][2].',
};

function guideSection(trophy) {
  const steps = el('div', '');
  for (const raw of trophy.guide.split('\n')) {
    const match = raw.match(/^\s*(\d+)\.\s*(.*)$/);
    const row = el('p', 'guide-step');
    row.append(el('span', 'num', `${match ? match[1] : '•'}.`));
    const body = el('span', '');
    appendCited(body, match ? match[2] : raw, trophy);
    row.append(body);
    steps.append(row);
  }
  return steps;
}

function sourceSection(trophy) {
  const list = el('div', 'source-list');
  trophy.sources.forEach((source, index) => {
    const row = el('div', 'source-row');
    const link = el('a', '', source.name);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    row.append(el('span', 'num', `[${index + 1}]`), link, el('span', 'read', source.read));
    list.append(row);
  });
  return list;
}

export function renderDetail(container, trophy, state, handlers) {
  container.replaceChildren();
  if (!trophy) { container.append(el('p', 'desc', 'Pick a trophy to read its cited guide.')); return; }
  const hidden = hiddenStory(trophy, state);
  const head = el('div', 'detail-head');
  const titleWrap = el('div', '');
  titleWrap.append(el('h2', '', hidden ? 'Hidden story trophy' : trophy.name));
  titleWrap.append(el('p', 'detail-sub', `${trophy.kind.toUpperCase()} · ${trophy.chapter} · STAGE ${trophy.stage}`));
  head.append(titleWrap, gradePill(trophy));
  const official = el('div', 'official-box');
  official.append(el('div', 'official-label', 'OFFICIAL DESCRIPTION · PLAYSTATION'));
  official.append(el('p', '', hidden
    ? 'Earn this trophy to reveal its official description, or use Reveal in the index.'
    : trophy.description));
  container.append(head, official);
  const counter = stepper(trophy, state, handlers);
  if (counter) container.append(counter);
  container.append(el('div', 'section-label', 'HOW TO GET IT · IN OUR OWN WORDS'));
  container.append(guideSection(trophy));
  if (trophy.missable) {
    const box = el('div', 'callout warn');
    box.append(el('b', '', 'MISSABLE?'));
    const text = el('span', '');
    appendCited(text, MISSABLE_TEXT[trophy.id] || trophy.guide.split('\n')[1] || trophy.guide, trophy);
    box.append(text);
    container.append(box);
  }
  if (trophy.uncertain) {
    const box = el('div', 'callout unknown');
    box.append(el('b', '', 'NOT PINNED DOWN'));
    const text = el('span', '');
    const line = trophy.guide.split('\n').find((part) => /unconfirmed|not confirmed|not name/.test(part)) || trophy.guide;
    appendCited(text, line.replace(/^\d+\.\s*/, ''), trophy);
    box.append(text);
    container.append(box);
  }
  container.append(el('div', 'section-label', `SOURCES · READ ${trophy.sources[0].read}`));
  container.append(sourceSection(trophy));
  const actions = el('div', 'detail-actions');
  const toggle = el('button', 'btn primary', state.earnedIds.includes(trophy.id) ? '✓ Earned — undo' : 'Mark earned');
  toggle.type = 'button';
  toggle.addEventListener('click', () => handlers.toggle(trophy.id));
  actions.append(toggle);
  container.append(actions);
}

export function renderRoadmap(container, data, state) {
  container.replaceChildren();
  const intro = el('div', 'roadmap-intro');
  const facts = [
    ['55', 'trophies placed on one route'], ['5', 'ordered stages'], ['1', 'playthrough · no New Game+'],
    ['0', 'online trophies'], ['15', 'manual saves + 1 auto'],
  ];
  for (const [number, label] of facts) {
    const box = el('div', 'intro-box');
    box.append(el('strong', '', `${number} `), document.createTextNode(label));
    intro.append(box);
  }
  container.append(intro);
  const grid = el('div', 'stage-grid');
  for (const stage of data.stages) {
    const card = el('section', 'stage-card');
    card.append(el('h3', '', `${stage.id}. ${stage.title}`));
    card.append(el('div', 'stage-meta', `${stage.where} · ${stage.hours}`));
    card.append(el('p', 'stage-focus', stage.focus));
    card.append(el('div', 'stage-counts', stage.counts));
    for (const id of stage.trophyIds) {
      const trophy = data.trophies.find((item) => item.id === id);
      const row = el('div', `stage-item${trophy.missable ? ' hot' : ''}`);
      row.append(el('span', 'n', String(trophy.id).padStart(2, '0')));
      row.append(el('span', 'nm', hiddenStory(trophy, state) ? 'Hidden story trophy' : trophy.name));
      row.append(gradePill(trophy));
      card.append(row);
    }
    grid.append(card);
  }
  container.append(grid);
}

export function renderMissables(container, data, state) {
  container.replaceChildren();
  const note = el('p', 'missable-intro');
  note.textContent = 'Two trophies are flagged POSSIBLY missable: one time window in Chapter 1 (PowerPyx + GTABase) and one one-off Ocean Beach scene with no confirmed trigger. Push Square lists no known missables; PowerPyx states nothing on the 100% checklist is missable. Both flags are deliberately cautious.';
  container.append(note);
  const grid = el('div', 'missable-grid');
  for (const trophy of data.trophies.filter((item) => item.missable)) {
    const card = el('article', 'flag-card');
    const head = el('div', 'flag-head');
    head.append(el('h3', '', trophy.name), gradePill(trophy));
    card.append(head);
    card.append(el('div', 'flag-window', `WINDOW / CONDITION · ${trophy.chapter} · ${trophy.count}`));
    const body = el('p', 'flag-text');
    appendCited(body, trophy.guide.split('\n').filter((line) => /missable|unconfirmed|risk|balcony| cocktail/i.test(line))
      .join(' ').replace(/^\d+\.\s*/, ''), trophy);
    card.append(body);
    const src = el('div', 'flag-sources');
    src.append(document.createTextNode('SOURCES '));
    src.append(sourceChips(trophy));
    card.append(src);
    grid.append(card);
  }
  container.append(grid);
  container.append(el('div', 'section-label', 'FIVE TRIGGERS NOT PINNED DOWN · READ BEFORE YOU GRIND'));
  const unknown = el('div', 'unknown-grid');
  for (const trophy of data.trophies.filter((item) => item.uncertain)) {
    const card = el('article', 'unknown-card');
    card.append(el('h4', '', trophy.name));
    card.append(el('p', '', trophy.count));
    const cite = el('a', 'cite', 'SOURCE [1]');
    cite.href = trophy.sources[0].url;
    cite.target = '_blank';
    cite.rel = 'noopener noreferrer';
    card.append(cite);
    unknown.append(card);
  }
  container.append(unknown);
}

export function renderSave(container, data, state) {
  container.replaceChildren();
  const grid = el('div', 'save-grid');
  const spoilerCard = el('div', 'save-card');
  spoilerCard.append(el('h3', '', 'Spoiler setting'));
  spoilerCard.append(el('p', '', 'On: story names and official descriptions stay hidden until you tick them earned. Reveal is a personal, one-off peek and is not saved. Off: everything is readable.'));
  spoilerCard.append(el('p', '', `Current state: ${state.spoiler ? 'ON — story trophies hidden' : 'OFF — full list visible'}. ${state.demo ? 'This preview never writes to storage.' : 'Changes are written immediately.'}`));
  const proofCard = el('div', 'save-card');
  proofCard.append(el('h3', '', 'Saved in this browser'));
  proofCard.append(el('p', '', 'Progress lives in localStorage under this key. Reloading the page restores ticks, partial counters and the spoiler preference — no account or network needed.'));
  proofCard.append(el('pre', '', JSON.stringify({
    key: 'leonida-atlas/v2',
    earnedIds: state.earnedIds,
    counters: state.counters,
    spoiler: state.spoiler,
  }, null, 2)));
  const actionsCard = el('div', 'save-card');
  actionsCard.append(el('h3', '', 'Export / import'));
  actionsCard.append(el('p', '', 'Export writes a JSON file with earned ids, partial counters and the spoiler setting. Import reads either that file or a plain array of ids. Progress can move between browsers with no server.'));
  const row = el('div', 'save-row');
  const exportBtn = el('button', 'btn primary', 'Export progress');
  const importBtn = el('button', 'btn', 'Import progress');
  const resetBtn = el('button', 'btn', 'Clear saved progress');
  for (const button of [exportBtn, importBtn, resetBtn]) { button.type = 'button'; row.append(button); }
  actionsCard.append(row);
  actionsCard.append(el('p', '', `Format: leonida-trophy-atlas/progress/v2 · ${data.trophies.length} trophies · ${data.sourceCount} cited sources.`));
  const helpCard = el('div', 'save-card');
  helpCard.append(el('h3', '', 'Repeatable views'));
  helpCard.append(el('p', '', 'The four screenshots were taken from this app itself: ?demo=1 selects a 17/55 preview, ?trophy=28 opens a guide, #roadmap and #missables switch tabs, and ?spoiler=0 reveals story text.'));
  helpCard.append(el('p', '', 'Every guide fact carries an inline [n] marker linked to its own dated source. Nothing in the app is fetched from the network while it runs.'));
  grid.append(spoilerCard, proofCard, actionsCard, helpCard);
  container.append(grid);
}
