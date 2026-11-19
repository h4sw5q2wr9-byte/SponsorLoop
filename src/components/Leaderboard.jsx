import { useMemo } from 'react';
import { standings } from '../lib/standings.js';

const MEDAL = ['bg-amber-400 text-white', 'bg-slate-400 text-white', 'bg-amber-700 text-white'];

/** Ranglijst naast de telknop (grote schermen). Tik op een klas om die te kiezen. */
export default function Leaderboard({ classes, selectedId, onSelect }) {
  const rows = useMemo(() => {
    const ids = new Map(classes.map((c) => [c.name, c.id]));
    return standings(classes).list.map((c) => ({ ...c, id: ids.get(c.name) }));
  }, [classes]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <span className="text-xs uppercase text-slate-500 dark:text-slate-400 font-extrabold tracking-widest mb-3 px-1">Ranglijst</span>
      <ul className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 -mx-1 px-1 pb-1">
        {rows.map((c) => {
          const active = c.id === selectedId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-left transition-all active:scale-[.98] ${active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'}`}
              >
                <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-black tabular-nums ${c.rank <= 3 && !active
                  ? MEDAL[c.rank - 1]
                  : active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                  {c.rank}
                </span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="flex-1 min-w-0 truncate font-bold text-sm">{c.name}</span>
                <span className="font-black tabular-nums">{c.laps}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
