// Exporteren en importeren van een backup (.json)
import { colorAt } from './colors.js';

const pad = (n) => String(n).padStart(2, '0');

export function backupFilename(date = new Date()) {
  const day = date.toISOString().split('T')[0];
  const time = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return `sponsorloop-backup-${day}-${time}.json`;
}

export function toBackup(classes, goal) {
  return {
    version: 1,
    classes: classes.map(({ name, laps, color }) => ({ name, laps, color })),
    schoolGoal: goal,
  };
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let uid = 0;
const newId = () => `${Date.now()}${(uid++).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * Leest een backup in. Accepteert het eigen formaat ({ classes, schoolGoal }),
 * een losse lijst, of { data: [...] }. Gooit een fout bij onbruikbare data.
 */
export function parseBackup(text) {
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Ongeldig bestand: geen JSON'); }

  let items = [];
  let goal = null;
  if (Array.isArray(json)) items = json;
  else if (json && typeof json === 'object') {
    if (Array.isArray(json.classes)) { items = json.classes; goal = json.schoolGoal || null; }
    else if (Array.isArray(json.data)) items = json.data;
    else items = Object.values(json).filter((v) => v && typeof v === 'object');
  }
  if (!items.length && !(json && typeof json === 'object' && Object.keys(json).length === 0)) {
    throw new Error('Geen herkenbare data gevonden.');
  }

  const classes = items
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null;
      return {
        id: item.id ? String(item.id) : newId(),
        name: String(item.name || item.id || `Klas ${i + 1}`).trim(),
        laps: parseInt(item.laps, 10) || 0,
        color: item.color || colorAt(i),
      };
    })
    .filter(Boolean);
  return { classes, goal };
}
