/** @type {import('tailwindcss').Config} */
export default {
  // '.dark &' = ouderwetse notatie (zonder :is()), werkt ook in oude browsers
  darkMode: ['variant', '.dark &'],
  content: ['./index.html', './stream.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
};
