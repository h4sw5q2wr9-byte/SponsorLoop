import { CheckCircle2, Download, Loader2, Upload } from 'lucide-react';
import Modal, { ModalHeader } from '../components/Modal.jsx';

const tile = 'group flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border transition-all active:scale-95 shadow-sm hover:shadow-md';
const tileIcon = 'p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm group-hover:scale-110 transition-all';

export function DataModal({ open, onClose, onImport, onExport, liveCode, onOpenSync }) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="Data & Beheer" onClose={onClose} />
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={onImport}
          className={`${tile} bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600`}>
          <div className={`${tileIcon} text-blue-500 dark:text-blue-400`}><Upload size={24} /></div>
          <span className="font-bold">Importeren</span>
        </button>
        <button type="button" onClick={onExport}
          className={`${tile} bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600`}>
          <div className={`${tileIcon} text-slate-500 dark:text-slate-400`}><Download size={24} /></div>
          <span className="font-bold">Exporteren</span>
        </button>
      </div>
      <button type="button" onClick={onOpenSync}
        className="mt-4 w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all active:scale-95 shadow-sm">
        <span className={`w-2.5 h-2.5 rounded-full ${liveCode ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-500'}`} />
        <span className="font-bold text-sm">Live Sync</span>
        <span className="ml-auto text-xs font-bold text-slate-400 tabular-nums">{liveCode || 'Uit'}</span>
      </button>
      <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-8 font-medium">Tip: Maak regelmatig een backup.</p>
    </Modal>
  );
}

/** Laadscherm / succesmelding bij importeren en exporteren */
export function StatusOverlay({ status, message }) {
  if (status === 'idle') return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl flex flex-col items-center min-w-[200px] animate-zoom-in">
        {status === 'loading' ? (
          <>
            <Loader2 className="text-blue-600 dark:text-blue-400 mb-4 animate-spin" size={32} />
            <span className="font-bold text-slate-600 dark:text-slate-300">Even geduld...</span>
          </>
        ) : (
          <>
            <div className="mb-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-full animate-zoom-in">
              <CheckCircle2 size={28} />
            </div>
            <span className="font-bold text-slate-800 dark:text-white text-lg">{message}</span>
          </>
        )}
      </div>
    </div>
  );
}
