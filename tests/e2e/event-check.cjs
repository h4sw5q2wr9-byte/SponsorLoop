/*
 * Generale repetitie voor de sponsorloop: test de echte site + Firebase.
 * Starten:  node tests/e2e/event-check.cjs [url]
 * (Playwright met Chromium nodig; standaard-url is de live site.)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] || 'https://h4sw5q2wr9-byte.github.io/SponsorLoop/').replace(/\/?$/, '/');
const TEST_FILE = path.join(__dirname, '..', '..', 'test-data', 'Sponsorloop_Test.json');
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`); };

async function freshTracker(ctx) {
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sponsorloop_intro_seen', 'true'); });
  await p.reload({ waitUntil: 'networkidle' });
  await p.click('text=Ik snap het, later doen');
  return p;
}
const counter = (p) => p.textContent('main .counter-btn .count-text').then(Number);
async function startSync(p) {
  await p.click('nav >> text=Beheer'); await p.click('[aria-label="Data & Beheer"]');
  await p.click('text=Live Sync'); await p.click('text=Start Sync');
  await p.waitForSelector('text=Laatste update', { timeout: 15000 });
  const code = await p.$$eval('.w-11.h-14', (e) => e.map((x) => x.textContent).join(''));
  await p.click('[aria-label="Sluiten"]'); await p.click('nav >> text=Tracker');
  return code;
}
async function stopSync(p) {
  await p.click('nav >> text=Beheer'); await p.click('[aria-label="Data & Beheer"]');
  await p.click('text=Live Sync'); await p.click('text=Stop Sync');
}

(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {});
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  ctx.on('page', (pg) => pg.on('pageerror', (e) => errors.push(e.message)));

  // 1. Betrouwbaarheid: 100 rondjes, herladen, klopt alles?
  const p = await freshTracker(ctx);
  const start = await counter(p);
  for (let i = 0; i < 100; i++) await p.click('main .counter-btn', { delay: 0 });
  const after = await counter(p);
  await p.reload({ waitUntil: 'networkidle' }); await p.click('text=Ik snap het, later doen').catch(() => {});
  const reloaded = await counter(p);
  check('100 rondjes tellen + herladen', after === start + 100 && reloaded === after, `${start} → ${after} → na herladen ${reloaded}`);
  await p.click('text=Foutje herstellen');
  check('Foutje herstellen', (await counter(p)) === after - 1);

  // 2. Live Sync met twee schermen tegelijk
  const code = await startSync(p);
  const screens = [await ctx.newPage(), await ctx.newPage()];
  for (const s of screens) { await s.goto(`${BASE}stream.html?code=${code}`); }
  await Promise.all(screens.map((s) => s.waitForSelector('[data-a="live"]', { timeout: 15000 })));
  for (const s of screens) await s.click('[data-a="live"]');
  await Promise.all(screens.map((s) => s.waitForSelector('#bdTotal')));
  const total0 = Number(await screens[0].textContent('#bdTotal'));
  for (let i = 0; i < 5; i++) await p.click('main .counter-btn');
  const want = String(total0 + 5);
  const t0 = Date.now();
  const okBoth = await Promise.all(screens.map((s) => s.waitForFunction((w) => document.getElementById('bdTotal').textContent === w, want, { timeout: 10000 }).then(() => true, () => false)));
  check('Twee schermen tegelijk live bijgewerkt', okBoth.every(Boolean), `${Date.now() - t0} ms`);

  // 3. Wifi valt weg op de tracker
  await ctx.setOffline(true);
  for (let i = 0; i < 3; i++) await p.click('main .counter-btn');
  await p.waitForTimeout(1500);
  const offlineCount = await counter(p);
  await ctx.setOffline(false);
  const okAfterWifi = await screens[0].waitForFunction((w) => document.getElementById('bdTotal').textContent === w, String(total0 + 8), { timeout: 25000 }).then(() => true, () => false);
  check('Wifi weg: doortellen + daarna automatisch bijgewerkt', okAfterWifi, `teller offline: ${offlineCount}`);

  // 4. Backup: exporteren en op een "ander apparaat" importeren
  await p.click('nav >> text=Beheer'); await p.click('[aria-label="Data & Beheer"]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Exporteren')]);
  const file = await dl.path();
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  const other = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const q = await freshTracker(other);
  await q.click('nav >> text=Beheer'); await q.click('[aria-label="Data & Beheer"]');
  const [fc] = await Promise.all([q.waitForEvent('filechooser'), q.click('text=Importeren')]);
  await fc.setFiles(file); await q.waitForTimeout(2500);
  const imported = await q.evaluate(() => JSON.parse(localStorage.getItem('sponsorloop_classes')).map(({ name, laps, color }) => ({ name, laps, color })));
  check('Export → import op ander apparaat', JSON.stringify(imported) === JSON.stringify(exported.classes), `${imported.length} klassen`);
  await other.close();
  await p.waitForTimeout(2500); // export-melding laten verdwijnen
  for (const s of screens) await s.close();
  await stopSync(p);

  // 5. Onthulling met gelijke scores en veel klassen (30)
  const many = { version: 1, schoolGoal: 2000, classes: Array.from({ length: 30 }, (_, i) => ({ name: `Klas ${i + 1} met een lange naam`, laps: [50, 50, 40][i] ?? 30 - i, color: '#3b82f6' })) };
  const tmp = path.join(require('os').tmpdir(), 'sponsorloop-30.json');
  fs.writeFileSync(tmp, JSON.stringify(many));
  await p.click('[aria-label="Sluiten"]').catch(() => {});
  await p.click('[aria-label="Data & Beheer"]');
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('text=Importeren')]);
  await fc2.setFiles(tmp); await p.waitForTimeout(3000);
  const code2 = await (async () => { await p.click('nav >> text=Tracker'); return startSync(p); })();
  const s = await ctx.newPage();
  await s.goto(`${BASE}stream.html?code=${code2}`); await s.waitForSelector('[data-a="show"]', { timeout: 15000 });
  await s.waitForTimeout(1500);
  await s.click('[data-a="show"]'); await s.waitForTimeout(800); await s.keyboard.press('Space');
  await s.waitForFunction(() => /Eindstand/.test(document.body.textContent), null, { timeout: 120000 });
  await s.waitForTimeout(2500);
  const fin = await s.evaluate(() => {
    const cards = [...document.querySelectorAll('#bdGrid > div')];
    const ranks = cards.map((c) => c.querySelector('[data-r="rank"]').textContent);
    const overflow = cards.some((c) => c.getBoundingClientRect().bottom > innerHeight + 1);
    return { n: cards.length, first3: ranks.slice(0, 3).join(','), overflow };
  });
  check('Onthulling: 30 klassen, gelijke scores, alles in beeld', fin.n === 30 && fin.first3 === '1,1,3' && !fin.overflow, `plaatsen ${fin.first3}, ${fin.n} kaarten`);
  await s.keyboard.press('Escape');
  await stopSync(p);

  check('Geen fouten in de pagina', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} test(s) mislukt` : '\nAlles geslaagd 🎉');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
