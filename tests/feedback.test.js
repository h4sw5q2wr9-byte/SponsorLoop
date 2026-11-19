import { describe, expect, it } from 'vitest';
import { toIssue } from '../scripts/feedback-to-issues.mjs';

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
