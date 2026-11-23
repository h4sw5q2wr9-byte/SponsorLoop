import { useState } from 'react';
import { Copy, ExternalLink, Info, KeyRound, Radio } from 'lucide-react';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { CONTACT } from '../lib/config.js';
import { claimFixedCode } from '../lib/fixedCode.js';

const btn = 'font-bold transition-all active:scale-95 flex items-center justify-center gap-2 w-full rounded-2xl py-3';
const C = {
  primary: `${btn} bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20`,
  secondary: `${btn} bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600`,
  danger: `${btn} bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40`,
};
const STATUS = {
  ok: ['bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', 'bg-green-500 animate-pulse', 'Live'],
  sending: ['bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', 'bg-blue-500 animate-pulse', 'Verbinden'],
  error: ['bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', 'bg-red-500', 'Geen verbinding'],
  unavailable: ['bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300', 'bg-orange-500', 'Niet beschikbaar'],
  denied: ['bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300', 'bg-orange-500', 'Andere tracker'],
  idle: ['bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400', 'bg-slate-400', 'Uit'],
};

const streamUrl = (code) => new URL(`stream.html${code ? `?code=${code}` : ''}`, location.href).href;

export default function LiveSyncModal({ open, onClose, sync, onReport }) {
  const [info, setInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const { code, prevCode, fixed, status, lastOkAt, start, stop } = sync;
  const [fixedOpen, setFixedOpen] = useState(false);
  const [fixedCode, setFixedCode] = useState('');
  const [pin, setPin] = useState('');
  const [fixedBusy, setFixedBusy] = useState(false);
  const [fixedError, setFixedError] = useState('');

  const useFixed = async () => {
    setFixedBusy(true); setFixedError('');
    try {
      const { code: c } = await claimFixedCode(fixedCode, pin);
      setPin(''); setFixedOpen(false);
      start(false, c);
    } catch (e) {
      setFixedError(e.message);
    } finally {
      setFixedBusy(false);
    }
  };
  const field = 'w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500';
  const [chipBg, dot, label] = STATUS[status];

  const copy = async () => {
    const url = streamUrl(code);
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Kopieer deze link:', url); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="Live Sync" onClose={onClose}>
        <button type="button" onClick={() => setInfo(!info)} aria-label="Uitleg"
          className={`p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${info ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-700' : 'text-slate-400'}`}>
          <Info size={20} strokeWidth={2.5} />
        </button>
      </ModalHeader>

      {info && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-6 text-sm text-blue-900 dark:text-blue-100 font-medium space-y-1.5">
          <p><strong>1.</strong> Start sync, je krijgt een code.</p>
          <p><strong>2.</strong> Open de stream-pagina op het andere scherm.</p>
          <p><strong>3.</strong> Vul de code in. Klaar!</p>
        </div>
      )}

      {!code ? (
        <>
          <div className="flex justify-center mb-5">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 animate-pulse-scale"><Radio size={28} /></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-6 font-medium">Laat de stand live zien op een ander scherm.</p>
          <div className="flex flex-col gap-3">
            {prevCode ? (
              <>
                <button type="button" onClick={() => start(true)} className={C.primary}><Radio size={18} /> Verder met {prevCode}</button>
                <button type="button" onClick={() => start(false)} className={C.secondary}>Nieuwe code</button>
              </>
            ) : (
              <button type="button" onClick={() => start(false)} className={C.primary}><Radio size={18} /> Start Sync</button>
            )}
            <a href={streamUrl()} target="_blank" rel="noopener noreferrer" className={C.secondary}><ExternalLink size={18} /> Stream-pagina</a>
          </div>
          {/* Optioneel: vaste code met pincode (bijv. voor een embed op een website) */}
          <div className="mt-4 text-center">
            {!fixedOpen ? (
              <button type="button" onClick={() => setFixedOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                <KeyRound size={14} /> Vaste code gebruiken
              </button>
            ) : (
              <div className="text-left bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Vaste code (bijv. voor een website). Met dezelfde pincode kan een ander apparaat de code overnemen. Na 2 dagen zonder gebruik vervalt de code.</p>
                <input value={fixedCode} onChange={(e) => setFixedCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={12} placeholder="CODE (5–12 tekens)" aria-label="Vaste code" className={`${field} tracking-widest uppercase`} />
                <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" maxLength={64} autoComplete="off"
                  placeholder="Pincode (min. 6 tekens)" aria-label="Pincode" className={field} />
                {fixedError && <p className="text-xs font-bold text-red-500">{fixedError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setFixedOpen(false); setFixedError(''); }} className={`${C.secondary} !py-2 text-sm`}>Annuleren</button>
                  <button type="button" onClick={useFixed} disabled={fixedBusy || fixedCode.length < 5 || pin.length < 6} className={`${C.primary} !py-2 text-sm disabled:opacity-50`}>
                    {fixedBusy ? 'Bezig…' : 'Verbinden'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-center gap-2 mb-4">
            {fixed && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"><KeyRound size={12} /> Vaste code</span>}
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${chipBg}`}>
              <span className={`w-2 h-2 rounded-full ${dot}`} />{label}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {code.split('').map((ch, i) => (
              <span key={i} className={`${code.length > 6 ? 'w-7 h-10 text-lg' : 'w-11 h-14 text-2xl'} flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-black text-slate-900 dark:text-white`}>{ch}</span>
            ))}
          </div>
          <p className="text-xs text-center text-slate-400 dark:text-slate-500 font-medium mb-6">
            {status === 'unavailable' ? `Live Sync is even niet beschikbaar. Tellen gaat gewoon door. Blijft dit zo? Meld het hieronder of neem contact op met ${CONTACT}.` : status === 'denied' ? 'Deze code hoort bij een ander apparaat. Stop en kies een nieuwe code.' : status === 'error' ? 'Geen verbinding, opnieuw proberen…' : `Laatste update: ${lastOkAt ? new Date(lastOkAt).toLocaleTimeString('nl-NL') : '—'}`}
          </p>
          {status === 'unavailable' && onReport && (
            <button type="button" onClick={onReport} className="w-full mb-3 text-sm font-bold text-orange-600 dark:text-orange-300 underline">Probleem melden</button>
          )}
          <div className="flex flex-col gap-3">
            <a href={streamUrl(code)} target="_blank" rel="noopener noreferrer" className={C.primary}><ExternalLink size={18} /> Stream-pagina</a>
            <button type="button" onClick={copy} className={C.secondary}><Copy size={18} /> {copied ? 'Gekopieerd!' : 'Link kopiëren'}</button>
            <button type="button" onClick={stop} className={C.danger}>Stop Sync</button>
          </div>
        </>
      )}
    </Modal>
  );
}
