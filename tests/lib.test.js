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
