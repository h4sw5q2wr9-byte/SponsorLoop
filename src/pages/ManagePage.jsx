import { useMemo, useState } from 'react';
import { BarChart3, CircleHelp, ArrowRightLeft, Layers, Moon, Pencil, Plus, Search, Sun, Target, Trash2, Trophy } from 'lucide-react';
import StatsChart from '../components/StatsChart.jsx';
import { cleanGoal, standings } from '../lib/standings.js';

const glass = 'bg-white/75 backdrop-blur-xl dark:bg-slate-800 dark:backdrop-blur-none border border-white/50 dark:border-slate-700';
const iconBtn = 'p-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md';

export default function ManagePage({
  classes, sortedClasses, goal, goalPct, theme,
  onGoalChange, onAddClass, onEdit, onDelete, onDeleteAll, onOpenHelp, onOpenData, onToggleTheme,
}) {
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [chartMode, setChartMode] = useState('bar');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => sortedClasses.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [sortedClasses, search],
  );
  const barData = useMemo(() => {
    const byLaps = [...classes].sort((a, b) => b.laps - a.laps);
    return showAll ? byLaps : byLaps.slice(0, 6);
  }, [classes, showAll]);
  const rankOf = useMemo(() => new Map(standings(classes).list.map((c) => [c.name, c.rank])), [classes]);
  const stackData = useMemo(() => classes.filter((c) => c.laps > 0).sort((a, b) => b.laps - a.laps), [classes]);

  const add = () => { if (onAddClass(newName)) setNewName(''); };
  const tab = (id) => `px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${chartMode === id
    ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white'
    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`;

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar animate-fade-in">
      <div className="max-w-2xl md:max-w-3xl mx-auto p-4 pb-28">
        {/* Kop */}
        <div className={`sticky top-0 z-20 flex justify-between items-center mb-6 px-4 py-3 rounded-2xl shadow-sm ${glass}`}>
          <h2 className="text-2xl font-black tracking-tight">Beheer</h2>
          <div className="flex gap-2">
            <button type="button" onClick={onOpenHelp} className={iconBtn} aria-label="Help"><CircleHelp size={24} /></button>
            <button type="button" onClick={onDeleteAll} aria-label="Alles verwijderen"
              className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all border border-red-100 dark:border-red-900/30 shadow-sm">
              <Trash2 size={24} />
            </button>
            <button type="button" onClick={onOpenData} className={iconBtn} aria-label="Data & Beheer"><ArrowRightLeft size={24} /></button>
            <button type="button" onClick={onToggleTheme} aria-label="Thema wisselen"
              className={`${iconBtn} !text-slate-600 dark:!text-yellow-400`}>
              {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
            </button>
          </div>
        </div>

        {/* Schooldoel */}
        <div className={`${glass} p-4 rounded-3xl shadow-sm mb-6 flex items-center gap-4`}>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl"><Target size={24} /></div>
          <div className="flex-1">
            <label htmlFor="goal" className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-wider">School Doel</label>
            <input id="goal" type="number" inputMode="numeric" placeholder="Stel aantal rondes in..." value={goal || ''}
              onChange={(e) => onGoalChange(cleanGoal(e.target.value))}
              className="w-full bg-transparent font-bold text-lg placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none" />
          </div>
          {goal ? <span className="text-2xl font-black">{goalPct}%</span> : null}
        </div>

        {/* Statistieken */}
        <div className={`${glass} p-6 rounded-3xl shadow-sm mb-6`}>
          <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 p-1.5 rounded-lg"><Trophy size={20} /></span>
              Statistieken
            </h3>
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
              <button type="button" onClick={() => setChartMode('stack')} className={tab('stack')}><Layers size={14} /> Stapel</button>
              <button type="button" onClick={() => setChartMode('bar')} className={tab('bar')}><BarChart3 size={14} /> Balken</button>
            </div>
          </div>
          <StatsChart data={chartMode === 'stack' ? stackData : barData} isDark={theme === 'dark'} mode={chartMode} />
          {chartMode === 'bar' && classes.length > 6 && (
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setShowAll(!showAll)}
                className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-5 py-2.5 rounded-xl transition-colors">
                {showAll ? 'Toon Minder' : `Toon Alles (${classes.length})`}
              </button>
            </div>
          )}
        </div>

        {/* Nieuwe klas */}
        <div className={`${glass} p-2 rounded-3xl shadow-sm mb-6 flex gap-2`}>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Nieuwe klas naam..."
            className="flex-1 bg-transparent px-4 py-3 font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal outline-none" />
          <button type="button" onClick={add} disabled={!newName.trim()} aria-label="Klas toevoegen"
            className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none">
            <Plus size={24} />
          </button>
        </div>

        {/* Zoeken */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek in lijst..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" />
        </div>

        {/* Klassenlijst */}
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className={`${glass} p-4 rounded-2xl flex items-center shadow-sm transition-all hover:scale-[1.01]`}>
              <div className="font-black w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 border shadow-inner"
                style={{ backgroundColor: `${c.color}20`, color: c.color, borderColor: `${c.color}40` }}>
                {c.laps}
              </div>
              <div className="flex-1 ml-4 min-w-0">
                <h3 className="font-bold text-lg truncate">{c.name}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{c.laps === 1 ? '1 ronde' : `${c.laps} rondes`} · plaats {rankOf.get(c.name)}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                <button type="button" onClick={() => onEdit(c)} aria-label={`${c.name} bewerken`}
                  className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors">
                  <Pencil size={20} />
                </button>
                <button type="button" onClick={() => onDelete(c.id)} aria-label={`${c.name} verwijderen`}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={`text-center p-10 ${glass} rounded-3xl !border-dashed !border-slate-300 dark:!border-slate-700`}>
              <p className="text-slate-400 dark:text-slate-500 font-medium">{search ? 'Geen klassen gevonden' : 'Nog geen klassen. Voeg er eentje toe!'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
