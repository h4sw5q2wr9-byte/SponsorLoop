// Herkent oudere browsers (bijv. de ingebouwde browser van Samsung-tv's).
// Moet bepaald worden vóórdat polyfills ontbrekende functies aanvullen.

/** Puur te testen: geef de omgeving mee. */
export function detectOldBrowser(env) {
  const { hasModules, hasResizeObserver, supports } = env;
  if (!hasModules || !hasResizeObserver) return true;
  if (supports && !supports('color', 'rgb(0 0 0 / 50%)')) return true;
  return false;
}

export const isOldBrowser = typeof window === 'undefined' ? false : detectOldBrowser({
  hasModules: typeof HTMLScriptElement !== 'undefined' && 'noModule' in HTMLScriptElement.prototype,
  hasResizeObserver: typeof window.ResizeObserver === 'function',
  supports: window.CSS && typeof window.CSS.supports === 'function' ? (p, v) => window.CSS.supports(p, v) : null,
});
