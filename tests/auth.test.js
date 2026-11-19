import { afterEach, describe, expect, it, vi } from 'vitest';

describe('anoniem inloggen (Firebase)', () => {
  afterEach(() => { vi.resetModules(); vi.unstubAllGlobals(); vi.doUnmock('../src/lib/firebase.js'); });

  it('staat uit zonder API key', async () => {
    const { getAuth, authEnabled } = await import('../src/lib/firebaseAuth.js');
    expect(authEnabled()).toBe(false);
    expect(await getAuth()).toBe(null);
  });

  it('logt één keer in en hergebruikt het token', async () => {
    vi.doMock('../src/lib/firebase.js', () => ({ FIREBASE_API_KEY: 'test-key' }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ idToken: 'tok1', refreshToken: 'ref1', localId: 'uid1', expiresIn: '3600' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { getAuth } = await import('../src/lib/firebaseAuth.js');
    const [a, b] = await Promise.all([getAuth(), getAuth()]);
    expect(a).toEqual({ token: 'tok1', uid: 'uid1' });
    expect(b).toEqual(a);
    expect(await getAuth()).toEqual(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('accounts:signUp?key=test-key');
  });
});
