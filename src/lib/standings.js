/** Geldig schooldoel (heel getal > 0) of null. Alles anders (0, negatief, tekst, NaN) = geen doel. */
export function cleanGoal(value) {
  const n = typeof value === 'number' ? value : parseInt(String(value == null ? '' : value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 1000000) : null;
}

// Berekent de ranglijst. Gelijke rondes = gelijke plaats (1, 1, 3, ...).
export function standings(classes = [], rawGoal = null) {
  const goal = cleanGoal(rawGoal);
  const list = classes
    .map((c) => ({ name: c.name, laps: Number(c.laps) || 0, color: c.color }))
    .sort((a, b) => b.laps - a.laps ||
      String(a.name).localeCompare(String(b.name), 'nl', { numeric: true }));
  list.forEach((c) => { c.rank = 1 + list.filter((o) => o.laps > c.laps).length; });
  const total = list.reduce((s, c) => s + c.laps, 0);
  const max = Math.max(1, list.length ? list[0].laps : 0);
  const pct = goal ? Math.min(100, Math.round((total / goal) * 100)) : null;
  return { list, total, max, goal: goal || null, pct };
}

export const totalLaps = (classes) => classes.reduce((s, c) => s + (Number(c.laps) || 0), 0);
export const goalPercent = (total, goal) => { const g = cleanGoal(goal); return g ? Math.min(100, Math.round((total / g) * 100)) : 0; };
