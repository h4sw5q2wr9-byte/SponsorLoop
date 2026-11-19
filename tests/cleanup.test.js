import { describe, expect, it } from 'vitest';
import { staleCodes } from '../scripts/cleanup-sessions.mjs';

describe('Firebase opruimen', () => {
  const now = 10 * 86400000;
  it('verwijdert alleen codes die langer dan een dag niet actief zijn', () => {
    const sessions = {
      ACTIEF: { seenAt: now - 60000 },
      OUD: { seenAt: now - 2 * 86400000 },
      ZONDERTIJD: { classes: [] },
      ALLEENUPDATE: { updatedAt: now - 1000 },
    };
    expect(staleCodes(sessions, now).sort()).toEqual(['OUD', 'ZONDERTIJD']);
  });
  it('werkt met een lege database', () => {
    expect(staleCodes(null, now)).toEqual([]);
  });
});
