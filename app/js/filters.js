// filters.js — chip groups, counts and the chapter buckets used by the index.
export const CHIPS = [
  ['all', 'All'], ['story', 'Story'], ['missable', 'Missable'],
  ['collectibles', 'Collectibles'], ['activities', 'Activities'],
  ['side', 'Side'], ['feats', 'Feats'], ['todo', 'To do'],
];
export const FEAT_KINDS = ['crime', 'combat', 'money', 'mystery', 'exploration', 'completion'];
export const GRADES = ['platinum', 'gold', 'silver', 'bronze'];

export function chipCount(trophies, state, chip) {
  if (chip === 'all') return trophies.length;
  if (chip === 'todo') return trophies.filter((trophy) => !state.earnedIds.includes(trophy.id)).length;
  if (chip === 'feats') return trophies.filter((trophy) => FEAT_KINDS.includes(trophy.kind)).length;
  if (chip === 'missable') return trophies.filter((trophy) => trophy.missable).length;
  return trophies.filter((trophy) => trophy.kind === chip).length;
}

// "Missable" and "To do" are flags, the others are kinds. Every active filter must agree.
export function passes(trophy, state) {
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind === 'todo' && state.earnedIds.includes(trophy.id)) return false;
  if (state.kind === 'feats' && !FEAT_KINDS.includes(trophy.kind)) return false;
  if (!['all', 'missable', 'todo', 'feats'].includes(state.kind) && trophy.kind !== state.kind) return false;
  const query = state.query.trim().toLowerCase();
  if (!query) return true;
  const haystack = [trophy.name, trophy.description, trophy.chapter, trophy.kind, trophy.guide,
    ...trophy.sources.map((source) => source.name)].join(' ').toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

export function visibleTrophies(trophies, state) { return trophies.filter((trophy) => passes(trophy, state)); }

export function gradeCounts(trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) counts[trophy.grade] += 1;
  return counts;
}

// Chapter buckets put the index in play order without splitting it into 40 headers.
export function chapterBucket(trophy) {
  if (trophy.chapter.startsWith('Ch.')) return trophy.chapter.split(' · ')[0].replace('Ch.', 'CHAPTER ');
  if (trophy.chapter.startsWith('Post-story')) return 'POST-STORY';
  return 'FREE ROAM / SIDE';
}

export const BUCKET_ORDER = ['CHAPTER 1', 'CHAPTER 2', 'CHAPTER 3', 'CHAPTER 4', 'CHAPTER 5', 'FREE ROAM / SIDE', 'POST-STORY'];
