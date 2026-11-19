import { X } from 'lucide-react';

/** Basis voor alle pop-ups. `dim` = donkere achtergrond (voor belangrijke meldingen). */
export default function Modal({ open, onClose, children, dim = false, z = 'z-50', className = 'max-w-sm' }) {
  if (!open) return null;
  return (
    <div
      className={`fixed inset-0 ${z} flex items-center justify-center p-4 animate-fade-in ${dim ? 'bg-slate-900/60 backdrop-blur-sm' : 'bg-slate-900/20 backdrop-blur-md'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={`bg-white dark:bg-slate-800 w-full ${className} rounded-[2rem] shadow-2xl p-6 border border-white/50 dark:border-slate-700 relative overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar animate-zoom-in`}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, icon, onClose, children }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
        {icon}
        {title}
      </h3>
      <div className="flex gap-1">
        {children}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Sluiten"
            className="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Rond icoon bovenaan een melding */
export function ModalIcon({ children, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-500',
  };
  return (
    <div className="flex justify-center mb-6">
      <div className={`p-4 rounded-full animate-pulse-scale ${tones[tone]}`}>{children}</div>
    </div>
  );
}
