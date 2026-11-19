// Alles wat in localStorage staat. De sleutels zijn gelijk aan de oude versie,
// zodat bestaande data gewoon blijft werken.
import { colorAt } from './colors.js';

export const KEYS = {
  classes: 'sponsorloop_classes',
  goal: 'sponsorloop_goal',
  theme: 'sponsorloop_theme',
  introSeen: 'sponsorloop_intro_seen',
  liveCode: 'sponsorloop_live_code',
  liveSeen: 'sponsorloop_live_seen', // laatste keer dat Live Sync actief was
};

export const DEFAULT_CLASSES = [
  { id: '1', name: 'Groep 5', laps: 6, color: colorAt(6) },
  { id: '2', name: 'Groep 6', laps: 12, color: colorAt(2) },
  { id: '3', name: 'Groep 7', laps: 24, color: colorAt(4) },
];

export function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* privé-modus e.d. */ }
}

export function loadClasses() {
  const raw = read(KEYS.classes);
  if (!raw) return DEFAULT_CLASSES;
  try {
    return JSON.parse(raw).map((c, i) => ({ ...c, color: c.color || colorAt(i) }));
  } catch {
    return [];
  }
}

export function loadGoal() {
  const raw = read(KEYS.goal);
  return raw ? parseInt(raw, 10) || null : null;
}

export function loadTheme() {
  return read(KEYS.theme) ||
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
