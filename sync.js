// Live sync via Firebase Realtime Database (REST, geen SDK nodig).
(function () {
  var DB = (window.SL_DB_URL || '').replace(/\/$/, '');
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
             set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
             del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var code = ls.get('sponsorloop_live_code'), last = null, timer, ok = true;

  function newCode() {
    var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }
  function send() {
    if (!code || !last) return;
    fetch(DB + '/sessions/' + code + '.json', { method: 'PUT', body: JSON.stringify(last), keepalive: true })
      .then(function (r) { ok = r.ok; ui(); }).catch(function () { ok = false; ui(); clearTimeout(timer); timer = setTimeout(send, 3000); });
  }
  window.sponsorloopSync = function (classes, goal) {
    last = { classes: classes.map(function (c) { return { name: c.name, laps: c.laps, color: c.color }; }),
             schoolGoal: goal || null, updatedAt: Date.now() };
    clearTimeout(timer); timer = setTimeout(send, 200);
  };

  // ---- UI: zwevende knop + paneel ----
  var btn = document.createElement('button'), panel = document.createElement('div');
  btn.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;border:0;border-radius:99px;padding:10px 16px;font:700 14px Inter,sans-serif;background:#4f46e5;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.3)';
  panel.style.cssText = 'position:fixed;right:12px;bottom:60px;z-index:9999;width:260px;border-radius:16px;padding:16px;font:500 14px Inter,sans-serif;background:#fff;color:#0f172a;box-shadow:0 8px 30px rgba(0,0,0,.35);display:none';
  var B = 'display:block;width:100%;margin-top:8px;padding:10px;border:0;border-radius:10px;font:700 14px Inter,sans-serif;cursor:pointer;';
  function ui() {
    btn.textContent = code ? (ok ? '● LIVE ' : '○ offline ') + code : 'Live sync';
    btn.style.background = code ? (ok ? '#16a34a' : '#dc2626') : '#4f46e5';
    var stream = new URL('stream.html' + (code ? '?code=' + code : ''), location.href).href;
    panel.innerHTML = code
      ? '<div style="opacity:.7">Code voor de stream-PC:</div><div style="font:800 34px monospace;letter-spacing:4px;margin:4px 0">' + code + '</div>' +
        '<a href="' + stream + '" target="_blank" style="' + B + 'background:#e0e7ff;color:#3730a3;text-align:center;text-decoration:none">Open stream-pagina</a>' +
        '<button id="sl-stop" style="' + B + 'background:#fee2e2;color:#991b1b">Stop sync</button>'
      : '<div style="opacity:.7">Stuur de stand live naar een andere PC.</div>' +
        '<button id="sl-start" style="' + B + 'background:#4f46e5;color:#fff">Start sync</button>' +
        '<a href="' + new URL('stream.html', location.href).href + '" target="_blank" style="' + B + 'background:#e0e7ff;color:#3730a3;text-align:center;text-decoration:none">Naar stream-pagina (code invoeren)</a>';
    var st = panel.querySelector('#sl-start'), sp = panel.querySelector('#sl-stop');
    if (st) st.onclick = function () { code = newCode(); ls.set('sponsorloop_live_code', code); send(); ui(); };
    if (sp) sp.onclick = function () { code = null; ls.del('sponsorloop_live_code'); ui(); };
  }
  btn.onclick = function () { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; };
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(panel); document.body.appendChild(btn); ui(); });
})();
