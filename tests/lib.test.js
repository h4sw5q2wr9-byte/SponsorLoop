import { describe, expect, it } from 'vitest';
import { standings, goalPercent, totalLaps } from '../src/lib/standings.js';
import { parseBackup, toBackup, backupFilename } from '../src/lib/backup.js';
import { shade, colorAt, PALETTE } from '../src/lib/colors.js';
import { newCode } from '../src/lib/firebase.js';

describe('standings', () => {
  it('sorteert op rondes en geeft gelijke rondes dezelfde plaats', () => {
    const st = standings([
      { name: 'A', laps: 10 }, { name: 'B', laps: 30 }, { name: 'C', laps: 30 }, { name: 'D', laps: 5 },
    ], 100);
    expect(st.list.map((c) => [c.name, c.rank])).toEqual([['B', 1], ['C', 1], ['A', 3], ['D', 4]]);
    expect(st.total).toBe(75);
    expect(st.max).toBe(30);
    expect(st.pct).toBe(75);
  });
  it('werkt zonder klassen of doel', () => {
    const st = standings([], null);
    expect(st).toMatchObject({ total: 0, max: 1, pct: null, list: [] });
  });
  it('totaal en doelpercentage (max 100%)', () => {
    expect(totalLaps([{ laps: 3 }, { laps: 4 }])).toBe(7);
    expect(goalPercent(150, 100)).toBe(100);
    expect(goalPercent(10, null)).toBe(0);
  });
});

describe('backup', () => {
  it('export en import geven dezelfde data terug', () => {
    const classes = [{ id: 'x', name: 'Groep 5', laps: 4, color: '#ef4444' }];
    const { classes: back, goal } = parseBackup(JSON.stringify(toBackup(classes, 500)));
    expect(goal).toBe(500);
    expect(back[0]).toMatchObject({ name: 'Groep 5', laps: 4, color: '#ef4444' });
    expect(back[0].id).toBeTruthy();
  });
  it('accepteert een losse lijst en vult ontbrekende velden aan', () => {
    const { classes } = parseBackup(JSON.stringify([{ name: ' SO 3 ', laps: '7' }, {}]));
    expect(classes[0]).toMatchObject({ name: 'SO 3', laps: 7, color: colorAt(0) });
    expect(classes[1].name).toBe('Klas 2');
  });
  it('geeft fouten bij onbruikbare bestanden', () => {
    expect(() => parseBackup('geen json')).toThrow();
    expect(() => parseBackup('"tekst"')).toThrow();
  });
  it('bestandsnaam bevat datum en tijd', () => {
    expect(backupFilename(new Date(2026, 4, 1, 9, 5, 7))).toMatch(/^sponsorloop-backup-\d{4}-\d{2}-\d{2}-09-05-07\.json$/);
  });
});

describe('kleuren en codes', () => {
  it('shade maakt een kleur donkerder', () => {
    expect(shade('#ffffff', 20)).toBe('#cccccc');
    expect(shade('#000000', 20)).toBe('#000000');
    expect(colorAt(PALETTE.length)).toBe(PALETTE[0]);
  });
  it('codes hebben 5 tekens zonder verwarrende letters', () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^[A-HJKMNP-Z2-9]{5}$/);
  });
});

import { detectOldBrowser } from '../src/lib/browser.js';

describe('oude browser herkennen', () => {
  const modern = { hasModules: true, hasResizeObserver: true, supports: () => true };
  it('moderne browser is niet oud', () => { expect(detectOldBrowser(modern)).toBe(false); });
  it('zonder modules, ResizeObserver of nieuwe kleurnotatie is oud', () => {
    expect(detectOldBrowser({ ...modern, hasModules: false })).toBe(true);
    expect(detectOldBrowser({ ...modern, hasResizeObserver: false })).toBe(true);
    expect(detectOldBrowser({ ...modern, supports: () => false })).toBe(true);
  });
});

import { applyEvent } from '../src/lib/liveFeed.js';

describe('live feed (Firebase streaming)', () => {
  const start = { classes: [{ name: 'A', laps: 1 }, { name: 'B', laps: 2 }], schoolGoal: 10, seenAt: 1 };
  it('put op de root vervangt alles', () => {
    expect(applyEvent(start, 'put', { path: '/', data: { classes: [] } })).toEqual({ classes: [] });
    expect(applyEvent(start, 'put', { path: '/', data: null })).toBe(null);
  });
  it('put op een pad wijzigt één waarde', () => {
    const r = applyEvent(start, 'put', { path: '/classes/1/laps', data: 5 });
    expect(r.classes[1].laps).toBe(5);
    expect(start.classes[1].laps).toBe(2); // origineel ongewijzigd
  });
  it('patch voegt samen', () => {
    expect(applyEvent(start, 'patch', { path: '/', data: { seenAt: 9 } })).toMatchObject({ seenAt: 9, schoolGoal: 10 });
  });
  it('verwijderde klas valt uit de lijst', () => {
    expect(applyEvent(start, 'put', { path: '/classes/0', data: null }).classes).toEqual([{ name: 'B', laps: 2 }]);
  });
});

import { buildUpdate, sessionUrl } from '../src/lib/firebase.js';

describe('zuinig versturen', () => {
  const cls = [{ name: 'A', laps: 1, color: '#f00' }, { name: 'B', laps: 2, color: '#0f0' }];
  it('eerste keer: alles', () => {
    const u = buildUpdate(null, cls, 100, 5);
    expect(u.full).toBe(true);
    expect(u.body).toMatchObject({ classes: cls, schoolGoal: 100, updatedAt: 5 });
  });
  it('daarna: alleen de gewijzigde rondes', () => {
    const prev = buildUpdate(null, cls, 100, 5).snapshot;
    const u = buildUpdate(prev, [cls[0], { ...cls[1], laps: 3 }], 100, 6);
    expect(u.full).toBe(false);
    expect(u.body).toEqual({ 'classes/1/laps': 3, updatedAt: 6, seenAt: 6 });
  });
  it('niets veranderd: niets sturen', () => {
    const prev = buildUpdate(null, cls, 100, 5).snapshot;
    expect(buildUpdate(prev, cls, 100, 6)).toBe(null);
  });
  it('klas erbij, hernoemd of andere kleur: alles opnieuw', () => {
    const prev = buildUpdate(null, cls, 100, 5).snapshot;
    expect(buildUpdate(prev, [...cls, { name: 'C', laps: 0, color: '#00f' }], 100, 6).full).toBe(true);
    expect(buildUpdate(prev, [{ ...cls[0], name: 'X' }, cls[1]], 100, 6).full).toBe(true);
  });
  it('doel gewijzigd: alleen het doel', () => {
    const prev = buildUpdate(null, cls, 100, 5).snapshot;
    expect(buildUpdate(prev, cls, 200, 6).body).toEqual({ schoolGoal: 200, updatedAt: 6, seenAt: 6 });
  });
  it('stille uploads (geen kopie terug)', () => {
    expect(sessionUrl('ABCDE', 'tok', true)).toMatch(/\?auth=tok&print=silent$/);
    expect(sessionUrl('ABCDE')).toMatch(/ABCDE\.json$/);
  });
});

describe('live feed: kleine updates', () => {
  it('patch met paden (classes/1/laps) wordt goed toegepast', () => {
    const d = { classes: [{ name: 'A', laps: 1 }, { name: 'B', laps: 2 }], updatedAt: 1 };
    const r = applyEvent(d, 'patch', { path: '/', data: { 'classes/1/laps': 7, updatedAt: 2 } });
    expect(r).toEqual({ classes: [{ name: 'A', laps: 1 }, { name: 'B', laps: 7 }], updatedAt: 2 });
  });
});

import { buildRefresh } from '../src/lib/firebase.js';

describe('veiligheids-verversing zonder namen', () => {
  const cls = [{ name: 'Een hele lange klasnaam die veel bytes kost', laps: 4, color: '#f00' }, { name: 'B', laps: 2, color: '#0f0' }];
  it('stuurt alleen aantallen, geen namen of kleuren', () => {
    const prev = buildUpdate(null, cls, 10, 1).snapshot;
    const u = buildRefresh(prev, cls, 10, 2);
    expect(u.full).toBe(false);
    expect(u.body).toEqual({ 'classes/0/laps': 4, 'classes/1/laps': 2, schoolGoal: 10, updatedAt: 2, seenAt: 2 });
    expect(JSON.stringify(u.body)).not.toContain('lange');
  });
  it('lijst veranderd of onbekend: alles sturen', () => {
    expect(buildRefresh(null, cls, 10, 2).full).toBe(true);
    const prev = buildUpdate(null, cls, 10, 1).snapshot;
    expect(buildRefresh(prev, [cls[0]], 10, 2).full).toBe(true);
  });
});

import { cleanGoal } from '../src/lib/standings.js';

describe('schooldoel opschonen', () => {
  it('ongeldig wordt geen doel', () => {
    for (const v of [0, '0', -5, '-5', 'abc', '', null, undefined, NaN, '  ', 'e']) expect(cleanGoal(v)).toBe(null);
  });
  it('geldig blijft een heel getal', () => {
    expect(cleanGoal('1000')).toBe(1000);
    expect(cleanGoal(250.7)).toBe(250);
    expect(cleanGoal(' 42 ')).toBe(42);
  });
  it('ranglijst en percentage gebruiken nooit een ongeldig doel', () => {
    expect(standings([{ name: 'A', laps: 5 }], 0)).toMatchObject({ goal: null, pct: null });
    expect(standings([{ name: 'A', laps: 5 }], 'abc')).toMatchObject({ goal: null, pct: null });
    expect(goalPercent(10, NaN)).toBe(0);
  });
});

import { cleanCustomCode } from '../src/lib/firebase.js';
describe('cleanCustomCode', () => {
  it('accepteert 6 tot 12 letters/cijfers en maakt hoofdletters', () => {
    expect(cleanCustomCode('sponsor26')).toBe('SPONSOR26');
    expect(cleanCustomCode('ab-cd ef')).toBe('ABCDEF');
    expect(cleanCustomCode('ABCDE')).toBeNull();
    expect(cleanCustomCode('ABCDEFGHIJKLM')).toBeNull();
    expect(cleanCustomCode('')).toBeNull();
  });
});
