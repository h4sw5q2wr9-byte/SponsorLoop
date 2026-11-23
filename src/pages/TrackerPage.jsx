import { useRef } from 'react';
import { ChevronDown, RotateCcw, Trophy } from 'lucide-react';
import Button from '../components/Button.jsx';
import Background from '../components/Background.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import CounterButton from '../components/CounterButton.jsx';
import { goalPercent, totalLaps } from '../lib/standings.js';

const glass = 'bg-white/75 backdrop-blur-xl dark:bg-slate-800 dark:backdrop-blur-none border border-white/50 dark:border-slate-700';
const label = 'uppercase text-slate-500 dark:text-slate-400 font-extrabold tracking-widest';
// "wide" = brede schermen en liggende telefoons: zijpaneel naast de knop
const WIDE = 'lg:flex-row landscape:flex-row';

export default function TrackerPage({ classes, sortedClasses, goal, selected, onSelect, onAdd, onUndo }) {
  const counter = useRef(null);
  const total = totalLaps(classes);
  const pct = goalPercent(total, goal);
  const canUndo = !!selected && selected.laps > 0;

  const add = () => { if (selected) onAdd(); };
  const undo = () => { if (selected) { counter.current?.pop('down'); onUndo(); } };

  return (
    <div className={`flex flex-col h-full w-full max-w-lg mx-auto p-4 pb-28 gap-3 ${WIDE} lg:max-w-none landscape:max-w-none lg:gap-6 landscape:gap-4 landscape:pb-24 lg:landscape:pb-28 animate-fade-in`}>
      <Background />

      {/* Klaskeuze + zijpaneel */}
      <div className="flex-none flex flex-col gap-4 lg:w-80 landscape:w-64 lg:landscape:w-80 min-h-0 z-10">
        <div className={`w-full ${glass} rounded-3xl shadow-lg shadow-blue-500/5 relative flex items-center h-16 shrink-0 transition-transform hover:scale-[1.01]`}>
          <Trophy className="absolute left-5 pointer-events-none text-blue-600 dark:text-blue-400" size={24} />
          <select
            value={selected?.id || ''}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Kies een klas"
            className="w-full bg-transparent font-bold text-xl py-4 pl-14 pr-12 outline-none text-slate-700 dark:text-slate-100 appearance-none rounded-3xl truncate cursor-pointer"
          >
            {sortedClasses.length === 0 && <option>Geen klassen</option>}
            {sortedClasses.map((c) => (
              <option key={c.id} value={c.id} className="text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800">{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-5 pointer-events-none text-slate-400" size={24} />
        </div>

        <div className={`hidden lg:flex landscape:flex flex-col flex-1 min-h-0 ${glass} rounded-3xl p-5 lg:p-6 shadow-lg shadow-blue-500/5`}>
          <div className="flex justify-between items-center">
            <span className={`text-xs ${label}`}>Totaal School</span>
            <span className="text-3xl font-black tabular-nums">{total}</span>
          </div>
          <div className="h-px w-full bg-slate-200/50 dark:bg-slate-700/50 my-3" />
          <div className="flex justify-between items-center">
            <span className={`text-xs ${label}`}>School Doel</span>
            {goal
              ? <span className="text-3xl font-black tabular-nums">{goal}</span>
              : <span className="text-sm font-medium text-slate-400 dark:text-slate-600 italic">Geen ingesteld</span>}
          </div>
          {goal ? (
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          {/* Ranglijst alleen op echt grote schermen (digibord, laptop) */}
          <div className="hidden lg:flex flex-col flex-1 min-h-0 mt-6">
            <Leaderboard classes={classes} selectedId={selected?.id} onSelect={onSelect} />
          </div>
          <div className="flex-1 lg:hidden" />
          <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}
            className="w-full mt-4 shrink-0 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 text-slate-400">
            <RotateCcw size={18} /> <span className="text-sm font-bold">Foutje herstellen</span>
          </Button>
        </div>
      </div>

      {/* De grote telknop */}
      <div className="flex-1 min-h-[12rem] min-w-0 flex z-10">
        <CounterButton
          ref={counter}
          value={selected?.laps || 0}
          color={selected?.color}
          disabled={!selected}
          label={selected ? `Ronde erbij voor ${selected.name}` : 'Geen klas gekozen'}
          onAdd={add}
        />
      </div>

      {/* Telefoon (rechtop): herstel + totaal */}
      <div className="flex-none space-y-3 lg:hidden landscape:hidden z-10">
        <div className="flex justify-center">
          <Button variant="ghost" onClick={undo} disabled={!canUndo} className="text-slate-400 py-1 rounded-full px-6">
            <RotateCcw size={18} /> <span className="text-sm font-semibold">Foutje herstellen</span>
          </Button>
        </div>
        <div className={`${glass} rounded-3xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden`}>
          {goal ? (
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          <div className="flex flex-col">
            <span className={`text-[10px] ${label} mb-1`}>Totaal School</span>
            <span className="text-3xl font-black leading-none tabular-nums">{total}</span>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-4" />
          <div className="flex flex-col items-end min-w-0">
            <span className={`text-[10px] ${label} mb-1`}>School Doel</span>
            {goal
              ? <span className="text-3xl font-black leading-none tabular-nums">{goal}</span>
              : <span className="text-sm font-medium text-slate-400 italic">Geen doel</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
