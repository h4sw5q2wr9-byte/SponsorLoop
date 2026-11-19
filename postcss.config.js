import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// `inset` werkt niet in oudere browsers (o.a. tv's): zet het om naar top/right/bottom/left.
const expandInset = () => ({
  postcssPlugin: 'expand-inset',
  Declaration: {
    inset(decl) {
      const v = decl.value.trim().split(/\s+/);
      const [t, r = t, b = t, l = r] = v;
      decl.cloneBefore({ prop: 'top', value: t });
      decl.cloneBefore({ prop: 'right', value: r });
      decl.cloneBefore({ prop: 'bottom', value: b });
      decl.cloneBefore({ prop: 'left', value: l });
      decl.remove();
    },
  },
});
expandInset.postcss = true;

export default { plugins: [tailwindcss(), expandInset(), autoprefixer()] };
