import { AlertTriangle, Download, Info, MessageSquarePlus, Plus, Settings, Trophy } from 'lucide-react';
import Button from '../components/Button.jsx';
import Modal, { ModalHeader, ModalIcon } from '../components/Modal.jsx';

function Step({ icon, color, title, children }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-2xl flex gap-4 items-center border border-slate-100 dark:border-slate-700/50">
      <div className={`bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm ${color}`}>{icon}</div>
      <div>
        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex items-start gap-3">
      <AlertTriangle className="text-orange-500 mt-0.5 shrink-0" size={16} />
      <p className="text-xs text-orange-800 dark:text-orange-200 font-bold leading-relaxed">{children}</p>
    </div>
  );
}

export function WelcomeModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} dim z="z-[100]" className="max-w-md !rounded-[2.5rem] !p-8">
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none" />
      <div className="relative flex flex-col items-center mb-6">
        <div className="bg-white dark:bg-slate-700 p-4 rounded-3xl shadow-lg shadow-blue-100 dark:shadow-none mb-4 border border-slate-100 dark:border-slate-600 animate-pulse-scale text-blue-600 dark:text-blue-400">
          <Trophy size={32} />
        </div>
        <h3 className="text-2xl font-black text-center text-slate-800 dark:text-white mb-2">Welkom!</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center font-medium">Rondjes tellen was nog nooit zo makkelijk.</p>
      </div>
      <div className="space-y-4 mb-8">
        <Step icon={<Settings size={20} />} color="text-blue-500" title="Stap 1: Beheer">Voeg je groepen of klassen toe.</Step>
        <Step icon={<Plus size={20} />} color="text-emerald-500" title="Stap 2: Tellen">Tik in de Tracker om rondjes te tellen.</Step>
        <Warning>Vergeet aan het einde niet te exporteren! Data staat alleen op dit apparaat.</Warning>
      </div>
      <Button size="lg" onClick={onClose} className="w-full rounded-2xl py-4">Aan de slag!</Button>
    </Modal>
  );
}

export function HelpModal({ open, onClose, onFeedback }) {
  const h = 'text-sm font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider';
  const tip = 'flex gap-3 items-start text-xs text-slate-600 dark:text-slate-300 font-medium';
  const dot = <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />;
  return (
    <Modal open={open} onClose={onClose} dim z="z-[100]" className="max-w-md !rounded-[2.5rem]">
      <ModalHeader title="Hulp & Info" onClose={onClose}
        icon={<span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl"><Info size={22} /></span>} />
      <div className="space-y-6">
        <div className="space-y-3">
          <h4 className={h}>Hoe werkt het?</h4>
          <Step icon={<Settings size={18} />} color="text-blue-500" title="1. Starten">Voeg in <strong>Beheer</strong> je klassen toe.</Step>
          <Step icon={<Plus size={18} />} color="text-emerald-500" title="2. Tellen">Kies een klas en tik op de grote knop.</Step>
        </div>
        <div className="space-y-3">
          <h4 className={h}>Handige Tips</h4>
          <ul className="space-y-2">
            <li className={tip}>{dot}<span>Te vaak getikt? Gebruik <strong>Foutje herstellen</strong>.</span></li>
            <li className={tip}>{dot}<span>Stel een <strong>School Doel</strong> in voor extra motivatie!</span></li>
            <li className={tip}>{dot}<span>Met <strong>Live Sync</strong> zie je de stand op een ander scherm.</span></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className={h}>Data</h4>
          <Warning>Data staat alleen op dit apparaat. Maak altijd een backup via Exporteren.</Warning>
        </div>
        <button type="button" onClick={onFeedback}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all">
          <MessageSquarePlus size={18} /> Idee of probleem melden
        </button>
      </div>
    </Modal>
  );
}

export function OldBrowserModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} dim z="z-[110]">
      <ModalIcon tone="orange"><AlertTriangle size={24} /></ModalIcon>
      <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">Oudere browser</h3>
      <p className="text-slate-500 dark:text-slate-400 text-center mb-6 font-medium">
        Je gebruikt een oudere versie van je browser. Update als dat kan, anders kan er soms iets misgaan.
      </p>
      <Button onClick={onClose} className="w-full rounded-2xl py-3">OK</Button>
    </Modal>
  );
}

export function ExportReminderModal({ open, onExport, onClose }) {
  return (
    <Modal open={open} onClose={onClose} dim z="z-[100]">
      <ModalIcon><Download size={24} /></ModalIcon>
      <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">Vergeet niet op te slaan!</h3>
      <p className="text-slate-500 dark:text-slate-400 text-center mb-6 font-medium">
        Exporteer aan het einde je data, dan raak je niks kwijt.
      </p>
      <div className="flex flex-col gap-3">
        <Button onClick={onExport} className="w-full rounded-2xl py-3"><Download size={18} /> Nu Exporteren</Button>
        <Button variant="ghost" onClick={onClose} className="w-full rounded-2xl py-3 text-slate-400">Ik snap het, later doen</Button>
      </div>
    </Modal>
  );
}
