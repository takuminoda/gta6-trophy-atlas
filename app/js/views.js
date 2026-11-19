// views.js — every render the app draws: checklist, guide pane, roadmap, missables.
import { KIND_LABELS, GRADE_LABELS, GRADE_ORDER, countByGrade, countMissable } from './filters.js';
import { isEarned } from './store.js';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function gradePill(trophy) {
  const pill = document.createElement('span');
  pill.className = `grade grade-${trophy.grade}`;
  pill.textContent = GRADE_LABELS[trophy.grade] ?? trophy.grade;
  return pill;
}

function tag(text, extraClass = '') {
  const el = document.createElement('span');
  el.className = `tag ${extraClass}`.trim();
  el.textContent = text;
  return el;
}

// Spoiler mode hides a story trophy's name and description until it is earned.
export function isSpoilerHidden(trophy, state) {
  return Boolean(state.spoiler) && trophy.kind === 'story' && !isEarned(state, trophy.id);
}

export function renderKindChips(chipsEl, state, onPick) {
  chipsEl.replaceChildren();
  for (const kind of Object.keys(KIND_LABELS)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = kind === state.kind ? 'chip active' : 'chip';
    chip.textContent = KIND_LABELS[kind];
    chip.dataset.kind = kind;
    chip.addEventListener('click', () => onPick(kind));
    chipsEl.append(chip);
  }
}

export function renderTrophyList(listEl, trophies, state, handlers) {
  listEl.replaceChildren();
  for (const trophy of trophies) {
    const hidden = isSpoilerHidden(trophy, state);
    const earned = isEarned(state, trophy.id);
    const selected = state.selectedId === trophy.id;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'trophy-card';
    if (earned) card.classList.add('earned');
    if (selected) card.classList.add('selected');
    card.dataset.id = String(trophy.id);
    card.setAttribute('aria-label', hidden ? 'Hidden story trophy' : trophy.name);

    const check = document.createElement('span');
    check.className = 'check';
    check.setAttribute('aria-hidden', 'true');
    check.addEventListener('click', (event) => {
      event.stopPropagation();
      handlers.onToggle(trophy.id);
    });

    const main = document.createElement('span');
    main.className = 'card-main';

    const top = document.createElement('span');
    top.className = 'card-top';
    const name = document.createElement('span');
    name.className = hidden ? 'name spoiler-hidden' : 'name';
    name.textContent = hidden ? 'Hidden story trophy' : trophy.name;
    top.append(name, gradePill(trophy));

    const desc = document.createElement('span');
    desc.className = hidden ? 'desc spoiler-hidden' : 'desc';
    desc.textContent = hidden
      ? 'Earn this story trophy to reveal its name and description.'
      : trophy.description;

    const tags = document.createElement('span');
    tags.className = 'tags';
    tags.append(tag(KIND_LABELS[trophy.kind] ?? trophy.kind, 'tag-kind'));
    if (trophy.missable) tags.append(tag('Missable', 'tag-missable'));
    tags.append(tag(`Stage ${trophy.stage}`, 'tag-stage'));

    main.append(top, desc, tags);
    card.append(check, main);
    card.addEventListener('click', () => handlers.onSelect(trophy.id));
    listEl.append(card);
  }
}

// Turn "Name (https://…) · Other (https://…)" into plain links. The app itself fetches
// nothing; a source opens only when the reader follows it.
export function appendSourceLinks(container, sourceText) {
  container.replaceChildren();
  const parts = String(sourceText)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^(.*?)\((https?:\/\/[^)]+)\)(.*)$/);
    const link = document.createElement('a');
    if (match) {
      link.textContent = `${match[1].trim()}${match[3].trim() ? ' ' + match[3].trim() : ''}`.trim() || match[2];
      link.href = match[2];
    } else {
      link.textContent = part;
      link.href = part;
    }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    container.append(link);
  }
}

function metaCell(label, value) {
  const cell = document.createElement('div');
  cell.className = 'meta-cell';
  const k = document.createElement('span');
  k.className = 'k';
  k.textContent = label;
  const v = document.createElement('span');
  v.className = 'v';
  v.textContent = value;
  cell.append(k, v);
  return cell;
}

function guideBlock(trophy) {
  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'Guide';
  const text = document.createElement('p');
  text.className = 'guide-text';
  text.textContent = trophy.guide;
  return [label, text];
}

function sourceBlock(trophy) {
  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'Sources';
  const links = document.createElement('div');
  links.className = 'sources';
  appendSourceLinks(links, trophy.source);
  return [label, links];
}

export function renderDetailPane(paneEl, trophy, state, handlers) {
  paneEl.replaceChildren();
  if (!trophy) {
    const empty = document.createElement('p');
    empty.className = 'placeholder';
    empty.textContent = 'Pick a trophy on the left to read its guide.';
    paneEl.append(empty);
    return;
  }
  const hidden = isSpoilerHidden(trophy, state);
  const earned = isEarned(state, trophy.id);

  const head = document.createElement('div');
  head.className = 'detail-head';
  const title = document.createElement('h2');
  title.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  head.append(title, gradePill(trophy));

  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = hidden
    ? 'This story trophy is still hidden. Earn it to reveal the official description.'
    : trophy.description;

  const meta = document.createElement('div');
  meta.className = 'meta-grid';
  meta.append(
    metaCell('Kind', KIND_LABELS[trophy.kind] ?? trophy.kind),
    metaCell('Roadmap stage', `Stage ${trophy.stage}`),
    metaCell('Target', trophy.target || '—'),
    metaCell('Status', earned ? 'Earned' : 'Not earned yet'),
  );

  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn';
  toggle.textContent = earned ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => handlers.onToggle(trophy.id));
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'btn';
  open.textContent = 'Open full guide';
  open.addEventListener('click', () => handlers.onOpenDetail(trophy.id));
  actions.append(toggle, open);

  paneEl.append(head, desc, meta, ...guideBlock(trophy), ...sourceBlock(trophy), actions);
}

export function renderDetailView(container, trophy, state, handlers) {
  container.replaceChildren();
  if (!trophy) {
    const empty = document.createElement('p');
    empty.className = 'placeholder';
    empty.textContent = 'No trophy selected.';
    container.append(empty);
    return;
  }
  const hidden = isSpoilerHidden(trophy, state);
  const earned = isEarned(state, trophy.id);

  const card = document.createElement('article');
  card.className = 'detail-pane';
  card.style.position = 'static';
  card.style.maxHeight = 'none';

  const head = document.createElement('div');
  head.className = 'detail-head';
  const title = document.createElement('h2');
  title.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  head.append(title, gradePill(trophy));

  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = hidden
    ? 'This story trophy is still hidden. Earn it to reveal the official description.'
    : trophy.description;

  const meta = document.createElement('div');
  meta.className = 'meta-grid';
  meta.append(
    metaCell('Kind', KIND_LABELS[trophy.kind] ?? trophy.kind),
    metaCell('Roadmap stage', `Stage ${trophy.stage}`),
    metaCell('Target', trophy.target || '—'),
    metaCell('Status', earned ? 'Earned' : 'Not earned yet'),
  );

  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'btn';
  back.textContent = 'Back to checklist';
  back.addEventListener('click', () => handlers.onBack());
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn';
  toggle.textContent = earned ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => handlers.onToggle(trophy.id));
  actions.append(back, toggle);

  card.append(head, desc, meta, ...guideBlock(trophy), ...sourceBlock(trophy), actions);
  container.append(card);
}

export function renderRoadmap(container, data, state) {
  container.replaceChildren();
  const { trophies, stages } = data;
  const counts = countByGrade(trophies);
  const missable = countMissable(trophies);
  const earned = state.earnedIds.length;

  const summary = document.createElement('div');
  summary.className = 'roadmap-summary';
  const pills = [
    `<strong>${trophies.length}</strong> trophies in total`,
    `<strong>${earned}</strong> earned so far`,
    `<strong>${trophies.length - earned}</strong> to go`,
    `<strong>${counts.platinum}</strong> platinum · <strong>${counts.gold}</strong> gold · <strong>${counts.silver}</strong> silver · <strong>${counts.bronze}</strong> bronze`,
    `<strong>${missable}</strong> flagged missable`,
  ];
  for (const html of pills) {
    const pill = document.createElement('span');
    pill.className = 'summary-pill';
    pill.innerHTML = html;
    summary.append(pill);
  }

  const grid = document.createElement('div');
  grid.className = 'roadmap';
  for (const stage of stages) {
    const items = trophies.filter((trophy) => trophy.stage === stage.id);
    const card = document.createElement('section');
    card.className = 'stage-card';
    const title = document.createElement('h3');
    title.textContent = `Stage ${stage.id} — ${stage.title}`;
    const note = document.createElement('p');
    note.className = 'stage-note';
    note.textContent = `${stage.note} ${items.length} trophy${items.length === 1 ? '' : 's'}.`;
    card.append(title, note);

    for (const trophy of items) {
      const row = document.createElement('div');
      row.className = trophy.missable ? 'stage-item is-missable' : 'stage-item';
      const name = document.createElement('span');
      name.className = 'stage-name';
      name.textContent = isSpoilerHidden(trophy, state) ? 'Hidden story trophy' : trophy.name;
      const target = document.createElement('span');
      target.className = 'stage-target';
      target.textContent = trophy.target || '';
      row.append(name, target, gradePill(trophy));
      card.append(row);
    }
    grid.append(card);
  }

  container.append(summary, grid);
}

export function renderMissables(container, trophies, state) {
  container.replaceChildren();
  const flagged = trophies.filter((trophy) => trophy.missable);

  const note = document.createElement('p');
  note.className = 'missables-note';
  note.textContent = flagged.length
    ? `Only ${flagged.length} trophy is flagged as potentially missable at launch. Everything else can be finished in post-story free roam, so the Platinum is a single playthrough.`
    : 'No trophy is flagged as missable at launch; everything can be finished in post-story free roam.';
  container.append(note);

  for (const trophy of flagged) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const title = document.createElement('h3');
    title.textContent = trophy.name;
    const why = document.createElement('p');
    why.className = 'why';
    why.textContent = trophy.guide;
    const when = document.createElement('p');
    when.className = 'when';
    when.textContent = `When it can be missed: ${trophy.target}. ${trophy.description}`;
    card.append(title, why, when);
    container.append(card);
  }

  const gated = trophies.filter((trophy) => trophy.kind === 'story');
  const gatedLabel = document.createElement('p');
  gatedLabel.className = 'section-label';
  gatedLabel.textContent = 'Chapter-gated, not missable';
  const gatedGrid = document.createElement('div');
  gatedGrid.className = 'gated-grid';
  for (const trophy of gated) {
    const row = document.createElement('div');
    row.className = 'gated-row';
    const name = document.createElement('span');
    name.className = 'gated-name';
    name.textContent = isSpoilerHidden(trophy, state) ? 'Hidden story trophy' : trophy.name;
    const target = document.createElement('span');
    target.className = 'gated-target';
    target.textContent = trophy.target || '';
    row.append(name, target, gradePill(trophy));
    gatedGrid.append(row);
  }

  const rest = document.createElement('p');
  rest.className = 'list-summary';
  rest.textContent = 'The 12 story trophies unlock as the five chapters are completed; their chapter and mission counts come from the official descriptions.';

  container.append(gatedLabel, gatedGrid, rest);
}
