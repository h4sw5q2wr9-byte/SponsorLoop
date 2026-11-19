import { useState } from 'react';
import { ChevronDown, RotateCcw, Trophy } from 'lucide-react';
import Button from '../components/Button.jsx';
import Background from '../components/Background.jsx';
import { shade } from '../lib/colors.js';
import { goalPercent, totalLaps } from '../lib/standings.js';

const glass = 'bg-white/75 backdrop-blur-xl dark:bg-slate-800 dark:backdrop-blur-none border border-white/50 dark:border-slate-700';
const label = 'uppercase text-slate-500 dark:text-slate-400 font-extrabold tracking-widest';

export default function TrackerPage({ classes, sortedClasses, goal, selected, onSelect, onAdd, onUndo }) {
  const [anim, setAnim] = useState(null); // 'up' | 'down'
  const total = totalLaps(classes);
  const pct = goalPercent(total, goal);
  const canUndo = !!selected && selected.laps > 0;

  const flash = (dir) => { setAnim(dir); setTimeout(() => setAnim(null), 200); };
  const add = () => { if (selected) { flash('up'); onAdd(); } };
  const undo = () => { if (selected) { flash('down'); onUndo(); } };

  return (
    <div className="flex flex-col min-h-full w-full max-w-lg mx-auto p-4 pb-28 md:max-w-none md:flex-row md:gap-6 landscape:max-w-none landscape:flex-row landscape:gap-6 animate-fade-in">
      <Background />

      {/* Klaskeuze + (op brede schermen) totaal */}
      <div className="flex-none mb-3 md:w-72 md:mb-0 md:flex md:flex-col landscape:w-72 landscape:mb-0 landscape:flex landscape:flex-col z-10">
        <div className={`w-full ${glass} rounded-3xl shadow-lg shadow-blue-500/5 relative flex items-center h-16 transition-transform hover:scale-[1.01]`}>
          <Trophy className="absolute left-5 pointer-events-none text-blue-600 dark:text-blue-400" size={24} />
          <select
            value={selected?.id || ''}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full bg-transparent font-bold text-xl py-4 pl-14 pr-12 outline-none text-slate-700 dark:text-slate-100 appearance-none rounded-2xl truncate cursor-pointer"
          >
            {sortedClasses.length === 0 && <option>Geen klassen</option>}
            {sortedClasses.map((c) => (
              <option key={c.id} value={c.id} className="text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800">{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-5 pointer-events-none text-slate-400" size={24} />
        </div>

        <div className={`hidden md:flex landscape:flex flex-col mt-4 ${glass} rounded-3xl p-6 shadow-lg shadow-blue-500/5 flex-1 justify-center`}>
          <div>
          <div className="flex justify-between items-center mb-4">
            <span className={`text-xs ${label}`}>Totaal School</span>
            <span className="text-3xl font-black tabular-nums">{total}</span>
          </div>
          <div className="h-px w-full bg-slate-200/50 dark:bg-slate-700/50 my-2" />
          <div className="flex justify-between items-center mb-6">
            <span className={`text-xs ${label}`}>School Doel</span>
            {goal
              ? <span className="text-3xl font-black tabular-nums">{goal}</span>
              : <span className="text-sm font-medium text-slate-400 dark:text-slate-600 italic">Geen ingesteld</span>}
          </div>
          {goal && (
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}
            className="w-full rounded-2xl border border-slate-200/50 dark:border-slate-700/50 text-slate-400">
            <RotateCcw size={18} /> <span className="text-sm font-bold">Herstel</span>
          </Button>
          </div>
        </div>
      </div>

      {/* De grote telknop */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col relative pb-2 md:pb-0 landscape:pb-0 z-10">
        <button
          type="button"
          onClick={add}
          disabled={!selected}
          className="group relative touch-none w-full h-full rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-700 shadow-[0_20px_50px_-12px_rgba(59,130,246,0.5)] dark:shadow-[0_20px_50px_-12px_rgba(30,58,138,0.5)] active:shadow-inner text-white flex flex-col items-center justify-center transition-all duration-100 active:scale-[0.98] border-b-[6px] border-r-[4px] border-blue-800/30 active:border-0 active:translate-y-1 overflow-hidden select-none ring-4 ring-white/20 dark:ring-slate-700"
          style={{
            minHeight: '45vh',
            background: selected ? `linear-gradient(135deg, ${selected.color} 0%, ${shade(selected.color, 20)} 100%)` : undefined,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.25),transparent_70%)]" />
          <span className={`text-[min(35vw,25vh)] font-black tabular-nums tracking-tighter leading-none drop-shadow-lg ${anim === 'up' ? 'animate-pop' : ''} ${anim === 'down' ? 'animate-pop-down' : ''}`}>
            {selected?.laps || 0}
          </span>
        </button>
      </div>

      {/* Mobiel: herstel + totaal */}
      <div className="flex-none mt-2 space-y-3 pb-2 md:hidden landscape:hidden z-10">
        <div className="flex justify-center">
          <Button variant="ghost" onClick={undo} disabled={!canUndo}
            className="text-slate-400 py-1 rounded-full px-6 backdrop-blur-sm">
            <RotateCcw size={18} /> <span className="text-sm font-semibold">Foutje herstellen</span>
          </Button>
        </div>
        <div className={`${glass} rounded-3xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden`}>
          {goal && (
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="flex flex-col">
            <span className={`text-[10px] ${label} mb-1`}>Totaal School</span>
            <span className="text-3xl font-black leading-none">{total}</span>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-4" />
          <div className="flex flex-col items-end min-w-0">
            <span className={`text-[10px] ${label} mb-1`}>School Doel</span>
            {goal
              ? <span className="text-3xl font-black leading-none">{goal}</span>
              : <span className="text-sm font-medium text-slate-400 italic">Geen doel</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
