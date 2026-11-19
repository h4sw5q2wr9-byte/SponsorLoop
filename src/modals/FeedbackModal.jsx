import { useState } from 'react';
import { Bug, CheckCircle2, Lightbulb, Send } from 'lucide-react';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { collectInfo, submitFeedback } from '../lib/feedback.js';

const TYPES = [
  { id: 'idee', label: 'Idee', Icon: Lightbulb, tone: 'text-amber-500' },
  { id: 'probleem', label: 'Probleem', Icon: Bug, tone: 'text-red-500' },
];

export default function FeedbackModal({ open, onClose, initialType = 'idee', extraInfo }) {
  const [type, setType] = useState(initialType);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  const close = () => { onClose(); setTimeout(() => { setState('idle'); setError(''); setMessage(''); }, 300); };
  const send = async () => {
    setState('sending'); setError('');
    try {
      await submitFeedback({ type, message, name, info: type === 'probleem' ? collectInfo(extraInfo) : '' });
      setState('sent');
    } catch (e) {
      setError(e.message); setState('idle');
    }
  };

  return (
    <Modal open={open} onClose={close} z="z-[110]">
      <ModalHeader title="Feedback" onClose={close} />
      {state === 'sent' ? (
        <div className="text-center py-4">
          <div className="inline-flex bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-full mb-4"><CheckCircle2 size={28} /></div>
          <p className="font-black text-lg mb-1">Bedankt!</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Je bericht is verstuurd.</p>
          <button type="button" onClick={close} className="w-full rounded-2xl py-3 font-bold bg-slate-100 dark:bg-slate-700">Sluiten</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(({ id, label, Icon, tone }) => (
              <button key={id} type="button" onClick={() => setType(id)}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold border-2 transition-all active:scale-95 ${type === id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-transparent bg-slate-100 dark:bg-slate-700'}`}>
                <Icon size={18} className={tone} /> {label}
              </button>
            ))}
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1500}
            placeholder={type === 'idee' ? 'Wat kan er beter of leuker?' : 'Wat ging er mis?'}
            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Naam of voornaam (mag leeg)"
            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-slate-400 font-medium">
            Je bericht (en naam) wordt openbaar op GitHub gezet, dus geen persoonlijke gegevens.
            {type === 'probleem' && ' Technische info (browser, scherm) gaat automatisch mee.'}
          </p>
          {error && <p className="text-sm font-bold text-red-500">{error}</p>}
          <button type="button" onClick={send} disabled={state === 'sending' || message.trim().length < 3}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50">
            <Send size={18} /> {state === 'sending' ? 'Versturen…' : 'Versturen'}
          </button>
        </div>
      )}
    </Modal>
  );
}
