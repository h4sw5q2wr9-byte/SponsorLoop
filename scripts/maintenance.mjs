// Onderhoud, elk half uur via .github/workflows/maintenance.yml (nodig: secret FIREBASE_SERVICE_ACCOUNT):
//  1. Meldingen uit de app (Firebase /feedback) omzetten in GitHub-issues en daarna uit Firebase verwijderen.
//  2. Live Sync-codes opruimen die langer dan een dag niet actief zijn. Veilig: de echte gegevens staan
//     op het tracker-apparaat; Firebase is alleen doorgeefluik. Een actieve tracker stuurt zo nodig alles opnieuw.
import { createSign } from 'node:crypto';

const DB_URL = 'https://sponsorloop-1eb58-default-rtdb.europe-west1.firebasedatabase.app';
const MAX_PER_RUN = 10; // bescherming tegen spam
export const MAX_AGE_MS = 24 * 60 * 60 * 1000; // codes ouder dan een dag opruimen

/** Welke codes zijn verouderd? (puur, getest) */
export function staleCodes(sessions, now = Date.now(), maxAge = MAX_AGE_MS) {
  return Object.entries(sessions || {})
    .filter(([, s]) => !s || typeof s !== 'object' || !(Number(s.seenAt || s.updatedAt) > now - maxAge))
    .map(([code]) => code);
}

const TYPES = {
  idee: { emoji: '💡', label: 'Idee', ghLabel: 'idee', color: 'fbca04' },
  probleem: { emoji: '🐞', label: 'Probleem', ghLabel: 'bug', color: 'd73a4a' },
};

// Geen @-vermeldingen of #-verwijzingen laten werken (geen meldingen naar vreemden)
const defuse = (t) => String(t || '').replace(/@/g, '@​').replace(/#(\d)/g, '#​$1');

/** Maakt titel, tekst en label van één melding (puur, getest). */
export function toIssue(item) {
  const type = TYPES[item.type] || TYPES.idee;
  const firstLine = defuse(item.message).split('\n')[0].trim();
  const title = `${type.emoji} ${type.label}: ${firstLine.length > 70 ? `${firstLine.slice(0, 67)}…` : firstLine}`;
  const date = new Date(item.createdAt || Date.now()).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' });
  const quoted = defuse(item.message).split('\n').map((l) => `> ${l}`).join('\n');
  let body = `**Type:** ${type.emoji} ${type.label}\n**Van:** ${defuse(item.name) || 'anoniem'}\n**Datum:** ${date}\n\n${quoted}\n`;
  if (item.info) body += `\n<details><summary>Technische info</summary>\n\n\`\`\`\n${String(item.info).replace(/```/g, "'''")}\n\`\`\`\n</details>\n`;
  body += '\n_Automatisch aangemaakt vanuit de Sponsorloop Tracker._';
  return { title, body, label: type.ghLabel, labelColor: type.color };
}

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

async function firebaseToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`Inloggen bij Google mislukt: HTTP ${res.status}`);
  return (await res.json()).access_token;
}

async function github(path, method, body) {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function main() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.log('Geen FIREBASE_SERVICE_ACCOUNT ingesteld: niets te doen.'); return; }
  const token = await firebaseToken(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  const auth = { Authorization: `Bearer ${token}` };

  const res = await fetch(`${DB_URL}/feedback.json`, { headers: auth });
  if (!res.ok) throw new Error(`Meldingen ophalen mislukt: HTTP ${res.status}`);
  const items = Object.entries((await res.json()) || {}).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
  console.log(`${items.length} nieuwe melding(en).`);

  for (const t of Object.values(TYPES)) {
    await github('/labels', 'POST', { name: t.ghLabel, color: t.color }); // bestaat al = prima
  }
  for (const [id, item] of items.slice(0, MAX_PER_RUN)) {
    const issue = toIssue(item);
    const created = await github('/issues', 'POST', { title: issue.title, body: issue.body, labels: [issue.label, 'feedback'] });
    if (!created.ok) { console.error(`Issue maken mislukt (${created.status}) voor ${id}`); continue; }
    console.log(`Issue gemaakt: ${(await created.json()).html_url}`);
    await fetch(`${DB_URL}/feedback/${id}.json`, { method: 'DELETE', headers: auth });
  }
  if (items.length > MAX_PER_RUN) console.log(`${items.length - MAX_PER_RUN} melding(en) volgen bij de volgende ronde.`);

  // 2. Oude Live Sync-codes opruimen
  const s = await fetch(`${DB_URL}/sessions.json`, { headers: auth });
  if (!s.ok) throw new Error(`Codes ophalen mislukt: HTTP ${s.status}`);
  const sessions = (await s.json()) || {};
  const stale = staleCodes(sessions);
  console.log(`${Object.keys(sessions).length} Live Sync-code(s), ${stale.length} verouderd.`);
  if (stale.length) {
    const del = await fetch(`${DB_URL}/sessions.json`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(stale.map((c) => [c, null]))),
    });
    if (!del.ok) throw new Error(`Opruimen mislukt: HTTP ${del.status}`);
    console.log(`Opgeruimd: ${stale.join(', ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
