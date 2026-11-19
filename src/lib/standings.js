// Berekent de ranglijst. Gelijke rondes = gelijke plaats (1, 1, 3, ...).
export function standings(classes = [], goal = null) {
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
export const goalPercent = (total, goal) => (goal ? Math.min(100, Math.round((total / goal) * 100)) : 0);
