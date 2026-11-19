/* Laat een melding zien als de app niet start (bijv. op een oude tv-browser),
   zodat je kunt zien wat er misgaat in plaats van een leeg scherm. ES5! */
(function () {
  var errors = [];
  window.onerror = function (msg, src, line) {
    errors.push(msg + (src ? ' (' + String(src).split('/').pop() + ':' + line + ')' : ''));
  };
  setTimeout(function () {
    var root = document.getElementById('root') || document.getElementById('app');
    if (root && root.children.length) return; // app draait
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;font-family:sans-serif;color:#0f172a;z-index:9999';
    box.innerHTML = '<div style="max-width:640px;text-align:center">' +
      '<h1 style="font-size:28px;margin:0 0 12px">De site kon niet starten</h1>' +
      '<p style="font-size:18px;color:#475569;margin:0 0 16px">Probeer een andere browser (bijv. Chrome of Edge).</p>' +
      '<p style="font-size:13px;color:#94a3b8;word-break:break-all">' + navigator.userAgent + '</p>' +
      (errors.length ? '<pre style="text-align:left;white-space:pre-wrap;font-size:13px;color:#b91c1c;background:#fee2e2;padding:12px;border-radius:12px">' +
        errors.join('\n').replace(/</g, '&lt;') + '</pre>' : '') +
      '</div>';
    document.body.appendChild(box);
  }, 6000);
})();
