import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomNav from './components/BottomNav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import TrackerPage from './pages/TrackerPage.jsx';
// Beheer (met de grote grafiekbibliotheek) pas laden wanneer nodig: de tracker start sneller.
const loadManage = () => import('./pages/ManagePage.jsx');
const ManagePage = lazy(loadManage);
import { DeleteAllModal, DeleteClassModal, DuplicateNameModal, EditClassModal } from './modals/ClassModals.jsx';
import { ExportReminderModal, HelpModal, OldBrowserModal, WelcomeModal } from './modals/InfoModals.jsx';
import { isOldBrowser } from './lib/browser.js';
import { DataModal, StatusOverlay } from './modals/DataModals.jsx';
import LiveSyncModal from './modals/LiveSyncModal.jsx';
import FeedbackModal from './modals/FeedbackModal.jsx';
import { useLiveSync } from './hooks/useLiveSync.js';
import { colorAt } from './lib/colors.js';
import { backupFilename, downloadJson, parseBackup, toBackup } from './lib/backup.js';
import { KEYS, loadClasses, loadGoal, loadTheme, read, write } from './lib/storage.js';
import { goalPercent, totalLaps } from './lib/standings.js';
import { vibrate } from './lib/haptics.js';

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('tracker');
  const [classes, setClasses] = useState(loadClasses);
  const [goal, setGoal] = useState(loadGoal);
  const [selectedId, setSelectedId] = useState(null);
  const [theme, setTheme] = useState(loadTheme);

  // Pop-ups
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [oldBrowser, setOldBrowser] = useState(false);
  const [help, setHelp] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type, extra } als het meldingsvenster open is
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const fileInput = useRef(null);

  const sync = useLiveSync(classes, goal);

  // ---------- opslaan ----------
  useEffect(() => { write(KEYS.classes, JSON.stringify(classes)); }, [classes]);
  useEffect(() => { write(KEYS.goal, goal !== null ? String(goal) : null); }, [goal]);
  useEffect(() => {
    if (!classes.some((c) => c.id === selectedId)) setSelectedId(classes[0]?.id ?? null);
  }, [classes, selectedId]);
  useEffect(() => {
    write(KEYS.theme, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
  }, [theme]);

  // Eerste keer: welkom. Daarna: herinnering om te exporteren.
  const showIntro = () => {
    if (read(KEYS.introSeen)) setReminder(true);
    else { setWelcome(true); write(KEYS.introSeen, 'true'); }
  };
  useEffect(() => {
    const t = setTimeout(() => {
      if (isOldBrowser) setOldBrowser(true); // eerst de waarschuwing, daarna de normale pop-up
      else showIntro();
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // Beheer alvast op de achtergrond laden als de app rustig is, zodat wisselen direct gaat
  useEffect(() => {
    const t = setTimeout(() => { loadManage().catch(() => {}); }, 2500);
    return () => clearTimeout(t);
  }, []);

  const sortedClasses = useMemo(() => [...classes].sort(byName), [classes]);
  const selected = classes.find((c) => c.id === selectedId) || null;
  const goalPct = goalPercent(totalLaps(classes), goal);

  // ---------- tellen ----------
  const changeLaps = useCallback((delta) => {
    if (!selectedId) return;
    vibrate(delta > 0 ? 50 : 20);
    setClasses((list) => list.map((c) => (c.id === selectedId ? { ...c, laps: Math.max(0, c.laps + delta) } : c)));
  }, [selectedId]);

  // ---------- klassen beheren ----------
  const addClass = (name) => {
    const clean = name.trim();
    if (!clean) return false;
    if (classes.some((c) => sameName(c.name, clean))) { setDuplicate(true); vibrate([50, 50]); return false; }
    vibrate(20);
    const created = { id: Date.now().toString(), name: clean, laps: 0, color: colorAt(classes.length) };
    setClasses([...classes, created]);
    if (!selectedId) setSelectedId(created.id);
    return true;
  };

  const saveEdit = () => {
    if (!editing) return;
    vibrate(20);
    if (classes.some((c) => c.id !== editing.id && sameName(c.name, editing.name))) { setDuplicate(true); return; }
    setClasses((list) => list.map((c) => (c.id === editing.id ? { ...editing, name: editing.name.trim() } : c)));
    setEditing(null);
  };

  const deleteClass = () => {
    vibrate(20);
    setClasses((list) => list.filter((c) => c.id !== deletingId));
    setDeletingId(null);
  };

  const deleteAll = () => {
    vibrate(50);
    setClasses([]);
    setConfirmDeleteAll(false);
  };

  // ---------- import / export ----------
  const flash = (message) => {
    setStatus({ state: 'success', message });
    setTimeout(() => { setStatus({ state: 'idle', message: '' }); setDataOpen(false); }, 2000);
  };

  const exportData = () => {
    setStatus({ state: 'loading', message: '' });
    setTimeout(() => {
      downloadJson(toBackup(classes, goal), backupFilename());
      vibrate(20);
      flash('Succesvol Geëxporteerd!');
    }, 600);
  };

  const importFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStatus({ state: 'loading', message: '' });
    const reader = new FileReader();
    reader.onload = () => setTimeout(() => {
      try {
        const { classes: imported, goal: importedGoal } = parseBackup(String(reader.result));
        setClasses(imported);
        if (importedGoal !== null) setGoal(importedGoal);
        setSelectedId([...imported].sort(byName)[0]?.id ?? null);
        vibrate([20, 50, 20]);
        flash('Succesvol Geïmporteerd!');
      } catch (err) {
        console.error('Import error', err);
        alert('Fout bij inlezen: bestand is ongeldig of beschadigd.');
        setStatus({ state: 'idle', message: '' });
      }
    }, 600);
    reader.readAsText(file);
  };

  const switchTab = (id) => { vibrate(10); setTab(id); };

  return (
    <>
      <main className="flex-1 overflow-y-auto relative w-full overscroll-contain no-scrollbar">
        <ErrorBoundary key={tab}>
        {tab === 'tracker' ? (
          <TrackerPage
            classes={classes}
            sortedClasses={sortedClasses}
            goal={goal}
            selected={selected}
            onSelect={(id) => { vibrate(10); setSelectedId(id); }}
            onAdd={() => changeLaps(1)}
            onUndo={() => changeLaps(-1)}
          />
        ) : (
          <Suspense fallback={<PageLoader />}>
          <ManagePage
            classes={classes}
            sortedClasses={sortedClasses}
            goal={goal}
            goalPct={goalPct}
            theme={theme}
            onGoalChange={setGoal}
            onAddClass={addClass}
            onEdit={(c) => { vibrate(10); setEditing({ ...c }); }}
            onDelete={(id) => { vibrate(10); setDeletingId(id); }}
            onDeleteAll={() => setConfirmDeleteAll(true)}
            onOpenHelp={() => setHelp(true)}
            onOpenData={() => setDataOpen(true)}
            onToggleTheme={() => { vibrate(10); setTheme((t) => (t === 'light' ? 'dark' : 'light')); }}
          />
          </Suspense>
        )}
        </ErrorBoundary>
      </main>

      <BottomNav tab={tab} onChange={switchTab} />
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={importFile} />

      <EditClassModal value={editing} onChange={setEditing} onSave={saveEdit} onClose={() => setEditing(null)} />
      <DeleteClassModal open={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={deleteClass} />
      <DeleteAllModal open={confirmDeleteAll} onCancel={() => setConfirmDeleteAll(false)} onConfirm={deleteAll} />
      <DuplicateNameModal open={duplicate} onClose={() => setDuplicate(false)} />
      <DataModal
        open={dataOpen}
        onClose={() => setDataOpen(false)}
        onImport={() => fileInput.current?.click()}
        onExport={exportData}
        liveCode={sync.code}
        onOpenSync={() => { setDataOpen(false); setSyncOpen(true); }}
      />
      <LiveSyncModal open={syncOpen} onClose={() => setSyncOpen(false)} sync={sync}
        onReport={() => { setSyncOpen(false); setFeedback({ type: 'probleem', extra: { 'Live Sync': `${sync.status} (code ${sync.code})` } }); }} />
      <FeedbackModal key={feedback ? feedback.type : 'closed'} open={!!feedback} initialType={feedback?.type} extraInfo={feedback?.extra}
        onClose={() => setFeedback(null)} />
      <OldBrowserModal open={oldBrowser} onClose={() => { setOldBrowser(false); showIntro(); }} />
      <WelcomeModal open={welcome} onClose={() => setWelcome(false)} />
      <HelpModal open={help} onClose={() => setHelp(false)} onFeedback={() => { setHelp(false); setFeedback({ type: 'idee' }); }} />
      <ExportReminderModal open={reminder} onClose={() => setReminder(false)} onExport={() => { setReminder(false); exportData(); }} />
      <StatusOverlay status={status.state} message={status.message} />
    </>
  );
}
