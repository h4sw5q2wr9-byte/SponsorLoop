// Live Sync: stuurt de stand naar Firebase Realtime Database (REST, geen SDK nodig).
// Geopend via "Data & Beheer" -> "Live Sync".
(function () {
  var FALLBACK_DB = 'https://sponsorloop-1eb58-default-rtdb.europe-west1.firebasedatabase.app';
  var DB = window.SL_DB_URL && !/VUL-HIER/.test(window.SL_DB_URL) ? window.SL_DB_URL : FALLBACK_DB;
  DB = DB.replace(/\/$/, '');

  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // Sync staat altijd UIT bij het openen; de vorige code wordt alleen onthouden om te kunnen hervatten.
  var code = null;
  var prevCode = ls.get('sponsorloop_live_code');
  var last = null;          // laatste stand uit de app
  var status = 'idle';      // idle | sending | ok | error
  var lastOkAt = 0, timer = null, beat = null, open = false, showInfo = false, copied = false;

  function newCode() {
    var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }
  function streamUrl(c) { return new URL('stream.html' + (c ? '?code=' + c : ''), location.href).href; }

  function send() {
    clearTimeout(timer);
    if (!code || !last) return;
    if (status !== 'ok') { status = 'sending'; render(); }
    var body = Object.assign({}, last, { seenAt: Date.now() });
    fetch(DB + '/sessions/' + code + '.json', { method: 'PUT', body: JSON.stringify(body) })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        status = 'ok'; lastOkAt = Date.now(); render();
      })
      .catch(function () { status = 'error'; render(); timer = setTimeout(send, 3000); });
  }

  // Wordt door de app aangeroepen bij elke wijziging.
  window.sponsorloopSync = function (classes, goal) {
    last = {
      classes: classes.map(function (c) { return { name: c.name, laps: c.laps, color: c.color }; }),
      schoolGoal: goal || null,
      updatedAt: Date.now()
    };
    clearTimeout(timer); timer = setTimeout(send, 200);
  };
  window.sponsorloopCode = function () { return code; };
  window.sponsorloopOpenSync = function () { open = true; showInfo = false; render(); };

  function start(reuse) { code = reuse && prevCode ? prevCode : newCode(); prevCode = code; ls.set('sponsorloop_live_code', code); status = 'sending'; startBeat(); send(); }
  function stop() {
    var old = code; code = null; prevCode = null; status = 'idle'; ls.del('sponsorloop_live_code'); stopBeat();
    if (old) fetch(DB + '/sessions/' + old + '.json', { method: 'DELETE' }).catch(function () {});
  }
  // Hartslag: elke 15 s, zodat de stream-pagina weet dat de tracker nog online is.
  function startBeat() { stopBeat(); beat = setInterval(send, 15000); }
  function stopBeat() { clearInterval(beat); beat = null; }

  // ---------- UI ----------
  var root = document.createElement('div');
  var svg = function (d, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var I = {
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
    radio: function (s) { return svg('<path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2"/><circle cx="12" cy="12" r="2"/>', s); },
    ext: svg('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', 18),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', 18)
  };
  var btnBase = 'font-bold transition-all active:scale-95 flex items-center justify-center gap-2 w-full rounded-2xl py-3 ';
  var C = {
    primary: btnBase + 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20',
    secondary: btnBase + 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
    danger: btnBase + 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40',
    icon: 'p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 '
  };

  function statusChip() {
    var m = {
      ok: ['bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', 'bg-green-500 animate-pulse', 'Live'],
      sending: ['bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', 'bg-blue-500 animate-pulse', 'Verbinden'],
      error: ['bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', 'bg-red-500', 'Geen verbinding'],
      idle: ['bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400', 'bg-slate-400', 'Uit']
    }[status];
    return '<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ' + m[0] + '"><span class="w-2 h-2 rounded-full ' + m[1] + '"></span>' + m[2] + '</span>';
  }

  function infoHtml() {
    return '<div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-6 text-sm text-blue-900 dark:text-blue-100 font-medium leading-relaxed space-y-2">' +
      '<p class="font-black">Werkwijze</p>' +
      '<p><strong>1.</strong> Start de synchronisatie. Er verschijnt een code van vijf tekens.</p>' +
      '<p><strong>2.</strong> Open de stream-pagina op het andere apparaat en voer de code in.</p>' +
      '<p><strong>3.</strong> Wijzigingen in de tracker worden binnen enkele seconden doorgegeven.</p>' +
      '<p class="text-xs opacity-75">Alleen klasnamen, rondes, kleuren en het schooldoel worden gedeeld. Bij het stoppen worden de gedeelde gegevens verwijderd. Live Sync staat standaard uit.</p>' +
      '</div>';
  }

  function render() {
    var err = status === 'error';

    var modal = '';
    if (open) {
      var body;
      if (!code) {
        body =
          '<div class="flex justify-center mb-5"><div class="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 animate-pulse-scale">' + I.radio(28) + '</div></div>' +
          '<p class="text-slate-500 dark:text-slate-400 text-center mb-6 font-medium">Deel de actuele stand met een tweede scherm, bijvoorbeeld voor een livestream.</p>' +
          '<div class="flex flex-col gap-3">' +
          (prevCode
            ? '<button data-a="resume" class="' + C.primary + '">' + I.radio(18) + ' Hervatten met code ' + prevCode + '</button>' +
              '<button data-a="start" class="' + C.secondary + '">Nieuwe code aanmaken</button>'
            : '<button data-a="start" class="' + C.primary + '">' + I.radio(18) + ' Synchronisatie starten</button>') +
          '<a href="' + streamUrl() + '" target="_blank" rel="noopener" class="' + C.secondary + '">' + I.ext + ' Stream-pagina openen</a>' +
          '</div>';
      } else {
        var when = lastOkAt ? new Date(lastOkAt).toLocaleTimeString('nl-NL') : '—';
        body =
          '<div class="flex justify-center mb-4">' + statusChip() + '</div>' +
          '<p class="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-extrabold tracking-widest text-center mb-2">Code</p>' +
          '<div class="flex justify-center gap-1.5 mb-3">' +
          code.split('').map(function (ch) {
            return '<span class="w-11 h-14 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-2xl font-black text-slate-900 dark:text-white">' + ch + '</span>';
          }).join('') + '</div>' +
          '<p class="text-xs text-center text-slate-400 dark:text-slate-500 font-medium mb-6">' +
          (err ? 'Geen verbinding met de server. Er wordt opnieuw geprobeerd.' : 'Laatste update: ' + when) + '</p>' +
          '<div class="flex flex-col gap-3">' +
          '<a href="' + streamUrl(code) + '" target="_blank" rel="noopener" class="' + C.primary + '">' + I.ext + ' Stream-pagina openen</a>' +
          '<button data-a="copy" class="' + C.secondary + '">' + I.copy + (copied ? ' Gekopieerd!' : ' Link kopiëren') + '</button>' +
          '<button data-a="stop" class="' + C.danger + '">Synchronisatie stoppen</button>' +
          '</div>';
      }
      modal =
        '<div data-a="close-bg" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md">' +
        '<div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur w-full max-w-sm rounded-[2rem] shadow-2xl p-6 border border-white dark:border-slate-700 max-h-[90vh] overflow-y-auto no-scrollbar">' +
        '<div class="flex justify-between items-center mb-6">' +
        '<h3 class="text-xl font-black text-slate-900 dark:text-white">Live Sync</h3>' +
        '<div class="flex gap-1">' +
        '<button data-a="info" aria-label="Uitleg" class="' + C.icon + (showInfo ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-700' : 'text-slate-400') + '">' + I.info + '</button>' +
        '<button data-a="close" aria-label="Sluiten" class="' + C.icon + 'text-slate-400">' + I.x + '</button>' +
        '</div></div>' +
        (showInfo ? infoHtml() : '') + body +
        '</div></div>';
    }
    root.innerHTML = modal;
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-a]');
    if (!t) return;
    var a = t.getAttribute('data-a');
    if (a === 'close-bg' && t !== e.target) return; // klik binnen het venster
    if (navigator.vibrate) navigator.vibrate(10);
    if (a === 'close' || a === 'close-bg') open = false;
    else if (a === 'info') showInfo = !showInfo;
    else if (a === 'start') start(false);
    else if (a === 'resume') start(true);
    else if (a === 'stop') stop();
    else if (a === 'copy') {
      var url = streamUrl(code);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).catch(function () { prompt('Kopieer deze link:', url); });
      copied = true; setTimeout(function () { copied = false; render(); }, 1500);
    }
    render();
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(root);
    render();
  });
})();
