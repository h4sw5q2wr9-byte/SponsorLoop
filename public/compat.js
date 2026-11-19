/* Terugval voor flexbox `gap` in oude browsers (o.a. Samsung-tv's).
   Doet niets in browsers die het wel ondersteunen. Bewust ES5. */
(function () {
  function supportsFlexGap() {
    var d = document.createElement('div');
    d.style.display = 'flex'; d.style.flexDirection = 'column'; d.style.rowGap = '1px';
    d.appendChild(document.createElement('div')); d.appendChild(document.createElement('div'));
    document.body.appendChild(d);
    var ok = d.scrollHeight === 1;
    d.parentNode.removeChild(d);
    return ok;
  }

  var MEDIA = {
    sm: '(min-width: 640px)', md: '(min-width: 768px)', lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)', landscape: '(orientation: landscape)', portrait: '(orientation: portrait)'
  };
  var RANK = { sm: 1, md: 2, lg: 3, xl: 4, landscape: 5, portrait: 5 };
  var GAP = /^gap(-[xy])?-(\d+(?:\.\d+)?|px)$/;
  var MARGIN_X = /(^|:)-?(m|mx|ml|mr)-/;
  var MARGIN_Y = /(^|:)-?(m|my|mt|mb)-/;

  function size(v) { return v === 'px' ? '1px' : (parseFloat(v) * 0.25) + 'rem'; }
  function mq(q) { return window.matchMedia ? window.matchMedia(q).matches : false; }

  // Bepaal de actieve gap-waarde van een element (rekening houdend met lg:, landscape: enz.)
  function gapOf(el) {
    var cls = (el.getAttribute('class') || '').split(/\s+/), best = null, bestScore = -1;
    for (var i = 0; i < cls.length; i++) {
      var parts = cls[i].split(':'), base = parts.pop(), m = GAP.exec(base);
      if (!m) continue;
      var ok = true, score = parts.length * 10;
      for (var j = 0; j < parts.length; j++) {
        if (!MEDIA[parts[j]] || !mq(MEDIA[parts[j]])) { ok = false; break; }
        score += RANK[parts[j]];
      }
      if (ok && score >= bestScore) { best = { axis: m[1] || '', value: size(m[2]) }; bestScore = score; }
    }
    return best;
  }

  function apply() {
    var els = document.querySelectorAll('[class*="gap-"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], cs = window.getComputedStyle(el);
      if (cs.display !== 'flex' && cs.display !== 'inline-flex') continue;
      var gap = gapOf(el), col = cs.flexDirection.indexOf('column') === 0, first = true;
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (c.getAttribute('data-gapfix')) { c.style.marginLeft = ''; c.style.marginTop = ''; c.removeAttribute('data-gapfix'); }
        if (!gap || window.getComputedStyle(c).display === 'none' || c.style.position === 'absolute') continue;
        var cc = c.getAttribute('class') || '';
        if (window.getComputedStyle(c).position === 'absolute') continue;
        if (first) { first = false; continue; }
        if (col && gap.axis !== '-x' && !MARGIN_Y.test(cc)) { c.style.marginTop = gap.value; c.setAttribute('data-gapfix', '1'); }
        if (!col && gap.axis !== '-y' && !MARGIN_X.test(cc)) { c.style.marginLeft = gap.value; c.setAttribute('data-gapfix', '1'); }
      }
    }
  }

  function start() {
    if (supportsFlexGap() && !/[?&]forcegap/.test(location.search)) return;
    document.documentElement.className += ' no-flexgap';
    var t = null;
    function schedule() { clearTimeout(t); t = setTimeout(apply, 30); }
    schedule();
    if (window.MutationObserver) {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].type === 'attributes' && list[i].attributeName === 'style') continue;
          schedule(); return;
        }
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', schedule);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
