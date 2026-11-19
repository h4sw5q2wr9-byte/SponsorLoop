// Kleurenpalet voor klassen
export const PALETTE = [
  '#ef4444', '#f97316', '#facc15', '#84cc16', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b',
];

export const colorAt = (i) => PALETTE[i % PALETTE.length];

/** Maakt een hex-kleur donkerder met `percent` procent (voor de verloopknop). */
export function shade(hex, percent) {
  const n = parseInt(hex.replace('#', ''), 16);
  const d = Math.round(2.55 * percent);
  const c = (v) => Math.max(0, Math.min(255, v - d));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
