// Browserfuncties die oudere browsers (o.a. Samsung-tv's) missen.
// Wordt als eerste geladen, vóór de rest van de app.
import ResizeObserverPolyfill from 'resize-observer-polyfill';
import './browser.js'; // eerst vastleggen of de browser oud is (vóór het aanvullen hieronder)

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverPolyfill; // nodig voor de grafieken (recharts)
}
