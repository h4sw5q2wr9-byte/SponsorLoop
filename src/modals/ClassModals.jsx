import { AlertTriangle, Trash2 } from 'lucide-react';
import Button from '../components/Button.jsx';
import Modal, { ModalHeader, ModalIcon } from '../components/Modal.jsx';
import { PALETTE } from '../lib/colors.js';

const fieldLabel = 'block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2 tracking-wider';
const field = 'w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-5 py-3 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none';

export function EditClassModal({ value, onChange, onSave, onClose }) {
  return (
    <Modal open={!!value} onClose={onClose}>
      {value && (
        <>
          <ModalHeader title="Klas Bewerken" onClose={onClose} />
          <div className="space-y-5">
            <div>
              <label className={fieldLabel} htmlFor="edit-name">Naam</label>
              <input id="edit-name" type="text" value={value.name} className={field}
                onChange={(e) => onChange({ ...value, name: e.target.value })} />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="edit-laps">Aantal Rondes</label>
              <input id="edit-laps" type="number" inputMode="numeric" value={value.laps} className={`${field} text-center text-2xl`}
                onChange={(e) => onChange({ ...value, laps: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
            </div>
            <div>
              <span className={fieldLabel}>Kleur</span>
              <div className="flex flex-wrap gap-3">
                {PALETTE.map((c) => (
                  <button key={c} type="button" aria-label={`Kleur ${c}`} onClick={() => onChange({ ...value, color: c })}
                    className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-95 ${value.color === c ? 'border-slate-600 dark:border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <Button size="lg" onClick={onSave} className="w-full mt-4 py-4 rounded-2xl">Opslaan</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function DeleteClassModal({ open, onCancel, onConfirm }) {
  return (
    <Modal open={open} onClose={onCancel}>
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Klas Verwijderen?</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Dit kan niet ongedaan worden gemaakt.</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1 rounded-2xl py-3 !border-none !bg-slate-100 dark:!bg-slate-700">Nee, toch niet</Button>
        <Button variant="danger" onClick={onConfirm} className="flex-1 rounded-2xl py-3 !border-none">Ja, weg ermee</Button>
      </div>
    </Modal>
  );
}

export function DeleteAllModal({ open, onCancel, onConfirm }) {
  return (
    <Modal open={open} onClose={onCancel}>
      <ModalIcon tone="red"><Trash2 size={24} /></ModalIcon>
      <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">Alles Verwijderen?</h3>
      <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
        <strong>Alle</strong> klassen en rondes worden gewist. Heb je een backup?
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1 rounded-2xl py-3 !border-none !bg-slate-100 dark:!bg-slate-700">Annuleren</Button>
        <Button onClick={onConfirm} className="flex-1 rounded-2xl py-3 !bg-red-600 hover:!bg-red-700 !shadow-red-200 dark:!shadow-none">Alles Wissen</Button>
      </div>
    </Modal>
  );
}

export function DuplicateNameModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalIcon tone="orange"><AlertTriangle size={24} /></ModalIcon>
      <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">Dubbele Naam!</h3>
      <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">Deze klas bestaat al. Kies een andere naam.</p>
      <Button onClick={onClose} className="w-full rounded-2xl py-3 !bg-orange-500 hover:!bg-orange-600 !shadow-orange-100 dark:!shadow-none">Begrepen</Button>
    </Modal>
  );
}
