import { describe, expect, it } from 'vitest';
import { staleCodes, toIssue } from '../scripts/maintenance.mjs';

describe('melding → GitHub-issue', () => {
  it('maakt een duidelijke titel en tekst', () => {
    const i = toIssue({ type: 'probleem', message: 'Knop doet niks\nop het digibord', name: 'Juf Anna', info: 'Browser: X', createdAt: 0 });
    expect(i.title).toBe('🐞 Probleem: Knop doet niks');
    expect(i.label).toBe('bug');
    expect(i.body).toContain('> Knop doet niks\n> op het digibord');
    expect(i.body).toContain('Juf Anna');
    expect(i.body).toContain('Technische info');
  });
  it('ideeën krijgen het label idee, zonder naam = anoniem', () => {
    const i = toIssue({ type: 'idee', message: 'Meer confetti!' });
    expect(i.title).toBe('💡 Idee: Meer confetti!');
    expect(i.label).toBe('idee');
    expect(i.body).toContain('anoniem');
  });
  it('lange titels worden ingekort en @/# werken niet', () => {
    const i = toIssue({ type: 'idee', message: `@iemand zie #12 ${'x'.repeat(100)}` });
    expect(i.title.length).toBeLessThanOrEqual(80);
    expect(i.title).not.toMatch(/@iemand/);
    expect(i.body).not.toMatch(/#12/);
  });
});

describe('oude Live Sync-codes opruimen', () => {
  const now = 10 * 86400000;
  it('alleen codes die langer dan een dag niet actief zijn', () => {
    const sessions = { ACTIEF: { seenAt: now - 60000 }, OUD: { seenAt: now - 2 * 86400000 }, LEEG: {}, NIEUW: { updatedAt: now - 1000 } };
    expect(staleCodes(sessions, now).sort()).toEqual(['LEEG', 'OUD']);
    expect(staleCodes(null, now)).toEqual([]);
  });
});
