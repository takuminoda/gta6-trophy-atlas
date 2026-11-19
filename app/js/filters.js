// filters.js — kind/grade/search/missable filtering and the counts the header shows.
export const KIND_ORDER = [
  'all',
  'story',
  'missable',
  'collectibles',
  'activities',
  'side',
  'crime',
  'money',
  'combat',
  'exploration',
  'mystery',
  'online',
];

export const KIND_LABELS = {
  all: 'All',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  side: 'Side jobs',
  crime: 'Crime',
  money: 'Money',
  combat: 'Combat',
  exploration: 'Exploration',
  mystery: 'Mystery',
  online: 'Online',
};

export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

export const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

function matchesQuery(trophy, query) {
  if (!query) return true;
  const haystack = `${trophy.name} ${trophy.description} ${trophy.kind} ${trophy.guide}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

// A trophy passes when every active filter agrees. "missable" is a flag, not a kind, so it
// is handled beside the kind filter.
export function trophyPassesFilters(trophy, state) {
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.missableOnly && !trophy.missable) return false;
  if (state.kind !== 'all') {
    if (state.kind === 'missable') {
      if (!trophy.missable) return false;
    } else if (trophy.kind !== state.kind) {
      return false;
    }
  }
  return matchesQuery(trophy, state.query);
}

export function applyFilters(trophies, state) {
  return trophies.filter((trophy) => trophyPassesFilters(trophy, state));
}

export function countByGrade(trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) counts[trophy.grade] += 1;
  return counts;
}

export function countByKind(trophies) {
  const counts = {};
  for (const trophy of trophies) counts[trophy.kind] = (counts[trophy.kind] ?? 0) + 1;
  return counts;
}

export function countMissable(trophies) {
  return trophies.filter((trophy) => trophy.missable).length;
}

export function summarize(trophies, state) {
  const shown = applyFilters(trophies, state);
  const earnedShown = shown.filter((trophy) => state.earnedIds.includes(trophy.id)).length;
  const missable = countMissable(trophies);
  return { shown: shown.length, earnedShown, total: trophies.length, earned: state.earnedIds.length, missable };
}
