# Sponsorloop Tracker – Project history

How the Sponsorloop Tracker grew from a school web page into a complete, tested system with live sync, a reveal show,
an embeddable scoreboard and its own maintenance. Written by Tijn van Kemenade, with Claude (Claude Code) as the
developer, between 19 and 22 November 2026.

- **Site:** https://h4sw5q2wr9-byte.github.io/SponsorLoop/
- **Repository:** https://github.com/h4sw5q2wr9-byte/SponsorLoop
- **Handbook:** [`Sponsorloop-Tracker-Handleiding.pdf`](Sponsorloop-Tracker-Handleiding.pdf) (9 pages, Dutch)

---

## 1. Where it started

The tracker was built a few years earlier for school with Google AI Studio and hosted on Netlify. Used at the school's
sponsored run for two years, it let you pick a class and tap a big button to count laps. Data was stored only in the
browser (localStorage), with import/export as a backup.

**The question:** *"Can it send the current standings to another PC, so we can show it on a livestream?"*

**The obstacle:** only the built files were left (one minified `index-BwzW1wGV.js` of 565 KB). The source code was gone.

---

## 2. Timeline

### Phase 1: Live Sync (19 Nov, afternoon)
| Step | What happened |
|---|---|
| First idea | A small Node relay server + overlay page. Worked, but needed a PC running a server. |
| Better idea (Tijn) | GitHub Pages + **Firebase** + a short code: start sync on the tracker, enter the code on the other screen. |
| New repo | `SponsorLoop` created, published with GitHub Pages, Firebase Realtime Database connected. |
| Patching the bundle | Since there was no source, a tiny hook was patched into the minified JS so the app reports every change. |
| Live Sync menu | Moved into *Data & Beheer* in the app's own style; the floating "LIVE" label removed again (it spoiled the look). |

### Phase 2: The stream page and the reveal
| Step | What happened |
|---|---|
| Stream page | Code entry, preview, dark/light mode, info button. |
| **Reveal show** (Tijn's idea) | Intro "Sponsorloop Tracker door Tijn van Kemenade" → top 3 podium with confetti → the rest scrolls in → final overview. |
| Feedback rounds | Long class names didn't fit (fixed), yellow text unreadable (darkened), buttons hidden during the show. |
| Two modes | **Live stand** (updates live, classes slide to their new place) and **Onthulling** (the reveal). |
| Automatic | Only the intro waits for Space/click; the rest plays by itself and slower for more suspense. |
| Exit | ✕ and cursor appear on mouse movement (no more getting "stuck" in fullscreen). |

### Phase 3: The rebuild (19 Nov, ~15:40)
The source was gone, so the whole app was **rebuilt from the minified file** as a clean **Vite + React** project:
pages, pop-ups, components, hooks and libraries in separate files. Same screens, texts and storage keys, so existing
data kept working. Added: unit tests, automatic publishing via GitHub Actions, and texts that are short and friendly
(*"not everything needs to be professional, it also has to be fun"*).

### Phase 4: The Samsung TV
The school's Samsung Frame TV showed a **blank page**: its browser is an old Chrome version.
| Problem | Fix |
|---|---|
| Modern JavaScript | `@vitejs/plugin-legacy`: old browsers automatically get a converted version with polyfills. |
| Missing colours (transparent pop-ups, black numbers) | PostCSS step converts `rgb(255 255 255 / .5)` to `rgba(...)`. |
| Dark mode and spacing ignored | Removed `:is()`/`:where()`, dark mode as `.dark &`. |
| Beheer blank | `ResizeObserver` polyfill (the chart needed it). |
| Spacing between elements | Small fallback script for flexbox `gap`. |
| Crashes | Error screens ("Oeps, er ging iets mis") instead of a blank page, and a *"Oudere browser"* warning. |

### Phase 5: Security and reliability
| Topic | Result |
|---|---|
| Firebase rules | Only valid codes, only data in the exact shape the tracker sends, the list of codes can't be read. |
| **Only the tracker can write** | Anonymous Firebase login: only the device that starts a code can change it; viewers can only watch. Tested with 11 attack scenarios, all blocked. |
| Offline | Service worker: the tracker keeps working without internet; installable as an app. |
| Self-healing sync | Absolute numbers (never "+1"), uploads one at a time in order, full resend after errors, a safety refresh every 5 minutes. |
| Clean-up | Forgotten codes are removed by the tracker itself and by a GitHub job every 30 minutes. |
| Netlify | The old Netlify site now redirects to the new site. |

### Phase 6: Feedback and maintenance
- **"Idee of probleem melden"** in the app, on the stream page and in error screens.
- Messages are stored privately in Firebase; a **GitHub Action** turns them into **GitHub issues** every 30 minutes
  (labels `idee`/`bug`), so Tijn gets an email.
- The same job removes Live Sync codes that have been inactive for more than two days.

### Phase 7: The embed (20 Nov)
- **🔗 Embed button** next to the OBS button: a ready-made `<iframe>` with the current code, for example for the
  Glazen Huis Eindhoven website.
- Compact, responsive scoreboard; tested on a different domain, on desktop and on a phone.
- **Tijn's idea:** a start screen ("Bekijk de live stand") so there's no connection until someone clicks, a
  10-minute time-out with "Opnieuw verbinden", and messages that explain *why* something doesn't work.

### Phase 7b: Own code (23 Nov)
- **Eigen code kiezen** in Live Sync (6–12 characters), so the embed never has to change.
- If the counting device breaks, another device can take over the same code after **15 minutes** of silence.
  No PIN or password: kept simple on purpose.
- Unused codes are cleaned up after **two days**.

### Phase 8: Documentation
- A 9-page Dutch **PDF handbook** with screenshots, a quick start, a checklist for the day, troubleshooting and the embed.
- A **README** for developers, with a settings table.
- This **project history**.

---

## 3. Optimizations (in numbers)

### Live Sync data per tap (what one stream screen downloads)
| Version | Bytes per tap | How |
|---|---|---|
| Start | ~1,087 | The whole stand on every tap |
| Only changes | ~111 | Only `class number → laps` sent, no echo back from Firebase (`print=silent`) |
| **Batching (Tijn's idea)** | **~22** | Taps collected for 2 seconds and sent together (20 taps → 4 messages) |

That's about **50× less data**. Class names are no longer sent per tap (**IDs instead of names**, also Tijn's idea):
with 55-character names it's still exactly 22 bytes. Names only go along on connecting or when they change.

### Other speed gains
| Improvement | Before → after |
|---|---|
| Stream screen updates | Asked every 1.5 s (polling) → Firebase **pushes** changes (streaming) |
| Idle stream screen | Constant requests → **0 requests** while nothing happens |
| Tracker start-up | 580 KB → **198 KB** (the chart only loads when opening Beheer) |
| Heartbeat | Whole stand every 15 s → **only a timestamp** every 30 s |
| Safety refresh | Whole stand → **only the numbers** every 5 minutes |
| Second visit | Everything downloaded again → loaded from the cache / offline |

### The embed (per visitor)
| Moment | Firebase |
|---|---|
| Page opens, before the click | **0 bytes, 0 connections** |
| After clicking | ~1.1 KB once |
| Per tap | ~22 bytes |
| Idle | ~160 bytes per minute |
| Other tab / out of view / 10 min | connection closes automatically |
| Too busy | calm retries after 15, 30, 60 s (no hammering) |

**Firebase free plan:** 10 GB/month is enough for tens of thousands of viewer-hours. The real limit is
**100 viewers at the same moment**; above that the Blaze plan is the simple fix (same code).

---

## 4. Testing

- **30 unit tests** (rankings with ties, import/export, sync logic, Firebase events, feedback formatting).
- **Dress rehearsal script** (`tests/e2e/event-check.cjs`) against the live site: 100 laps + reload, two live screens,
  Wi-Fi dropping, export/import on another device, the reveal with 30 classes and ties.
- **Security tests** against the real Firebase: 11 scenarios for Live Sync and 7 for feedback, all as expected.
- **Visual checks** on phone, tablet, digiboard and in a simulated old TV browser.
- **A review by ChatGPT** with 10 points; one real problem found (an old upload could overwrite a newer one) and fixed.

### Bugs found and fixed along the way
| Bug | Fix |
|---|---|
| "Offline" Live Sync on the TV | Browser cache had an old config → URL built in, versioned files |
| Animations replayed on every update | Update in place instead of rebuilding |
| Stuck in fullscreen | ✕ appears on mouse movement or touch |
| Blank screen on the Samsung TV | Legacy build, CSS conversion, polyfills |
| Undo icon broken (SVG error) | Fixed via `lucide-react` icons |
| Data deleted in Firebase while live → "Andere tracker" | Automatic full resend |
| Slow old upload could overwrite a newer stand | Uploads one at a time, in order |
| Refused live connection froze the screen | Falls back to polling, recognises "busy" |

---

## 5. Decisions worth knowing

- **Firebase is only a relay.** The real data stays on the counting device; deleting Firebase data never loses laps.
- **Live Sync is off by default** when opening the tracker (resume with the same code).
- **No paid services.** Clean-up and feedback run on GitHub Actions instead of paid Firebase functions.
- **Feedback becomes public GitHub issues**, so the form warns against personal data.
- **No school Wi-Fi mode (yet).** The embed's visitors are at home, so Firebase remains necessary. A "same
  computer" mode (tracker and beamer on one PC, no internet needed) is possible as a future addition.

---

## 6. Possible next steps

- Fix the small reveal-animation glitches on the Samsung TV (with a short video of the problem).
- "Same computer" mode via `BroadcastChannel` (no internet needed for a beamer on the counting PC).
- Show donations, e.g. € per lap.
- Blaze plan if more than ~90 people watch the embed at the same moment.
- Before each sponsored run: run the dress rehearsal and import the class list.

---

*35 commits in the `SponsorLoop` repository, from "Sponsorloop tracker with Firebase live sync" to
"Add embed to README and handbook".*
