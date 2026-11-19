// PostCSS: Tailwind + omzettingen zodat de CSS ook werkt in oudere browsers
// (zoals de ingebouwde browser van Samsung-tv's).
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// `inset: 0` -> top/right/bottom/left
const expandInset = () => ({
  postcssPlugin: 'compat-inset',
  Declaration: {
    inset(decl) {
      const [t, r = t, b = t, l = r] = decl.value.trim().split(/\s+/);
      decl.cloneBefore({ prop: 'top', value: t });
      decl.cloneBefore({ prop: 'right', value: r });
      decl.cloneBefore({ prop: 'bottom', value: b });
      decl.cloneBefore({ prop: 'left', value: l });
      decl.remove();
    },
  },
});
expandInset.postcss = true;

// `rgb(255 255 255 / 0.5)` -> `rgba(255, 255, 255, 0.5)` (oude kleurnotatie)
const ALPHA = String.raw`(var\([^()]*\)|[\d.]+%?)`;
const RGB_SPACE = new RegExp(String.raw`rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*${ALPHA}\s*)?\)`, 'g');
const toAlpha = (a) => (a.endsWith('%') ? String(parseFloat(a) / 100) : a);
const legacyColors = () => ({
  postcssPlugin: 'compat-rgb',
  Declaration(decl) {
    if (!decl.value.includes('rgb(')) return;
    decl.value = decl.value.replace(RGB_SPACE, (_, r, g, b, a) =>
      (a === undefined ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${toAlpha(a)})`));
  },
});
legacyColors.postcss = true;

// `:is(.dark .x)` en `:where(.a > .b)` -> zonder :is/:where (oude browsers negeren die hele regel)
const unwrapSelectors = () => ({
  postcssPlugin: 'compat-selectors',
  Rule(rule) {
    let sel = rule.selector;
    let prev;
    do {
      prev = sel;
      sel = sel.replace(/:(?:is|where)\(([^(),]*(?:\([^()]*\)[^(),]*)*)\)/g, '$1');
    } while (sel !== prev);
    rule.selector = sel;
  },
});
unwrapSelectors.postcss = true;

// flex/grid `gap` ook als `grid-gap` (oudere grid-ondersteuning)
const gridGap = () => ({
  postcssPlugin: 'compat-gap',
  Declaration: {
    gap(decl) { decl.cloneBefore({ prop: 'grid-gap' }); },
  },
});
gridGap.postcss = true;

export default {
  plugins: [tailwindcss(), expandInset(), legacyColors(), unwrapSelectors(), gridGap(), autoprefixer()],
};
