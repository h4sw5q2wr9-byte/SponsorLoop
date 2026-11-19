import { Settings, Trophy } from 'lucide-react';

const TABS = [
  { id: 'tracker', label: 'Tracker', Icon: Trophy },
  { id: 'manage', label: 'Beheer', Icon: Settings },
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 rounded-full shadow-2xl shadow-blue-900/5 dark:shadow-black/50 ring-1 ring-slate-900/5">
        {TABS.map(({ id, label, Icon }, i) => (
          <div key={id} className="flex items-center">
            {i > 0 && <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />}
            <button
              type="button"
              onClick={() => onChange(id)}
              className={`relative px-6 py-3 rounded-full flex items-center gap-2.5 transition-all duration-300 ${tab === id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
            >
              <Icon size={20} strokeWidth={tab === id ? 2.5 : 2} />
              <span className="font-bold text-sm">{label}</span>
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}
