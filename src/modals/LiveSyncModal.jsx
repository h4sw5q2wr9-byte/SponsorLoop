import { useState } from 'react';
import { Copy, ExternalLink, Info, Radio } from 'lucide-react';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { CONTACT } from '../lib/config.js';
import { cleanCustomCode } from '../lib/firebase.js';

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
  const [own, setOwn] = useState(null); // null = dicht, anders de getypte eigen code
  const ownCode = cleanCustomCode(own);
  const startOwn = (e) => { e.preventDefault(); if (ownCode) { start(false, ownCode); setOwn(null); } };
  const { code, prevCode, status, lastOkAt, start, stop } = sync;
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
          {own === null ? (
            <button type="button" onClick={() => setOwn('')} className="w-full mt-4 text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400">Eigen code kiezen</button>
          ) : (
            <form onSubmit={startOwn} className="mt-4">
              <input autoFocus value={own} maxLength={12} placeholder="BIJV. SPONSOR26" autoComplete="off" autoCapitalize="characters" spellCheck={false}
                onChange={(e) => setOwn(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="w-full text-center font-black tracking-[0.2em] uppercase bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-3 py-3 text-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-center text-slate-400 dark:text-slate-500 font-medium my-2">6 tot 12 letters of cijfers. Handig voor een embed: die blijft dan altijd werken.</p>
              <button type="submit" disabled={!ownCode} className={`${C.primary} disabled:opacity-50 disabled:active:scale-100`}><Radio size={18} /> Start met deze code</button>
            </form>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${chipBg}`}>
              <span className={`w-2 h-2 rounded-full ${dot}`} />{label}
            </span>
          </div>
          {code.length > 6 ? (
            <div className="mb-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-center text-2xl font-black tracking-[0.15em] text-slate-900 dark:text-white break-all">{code}</div>
          ) : (
            <div className="flex justify-center gap-1.5 mb-3">
              {code.split('').map((ch, i) => (
                <span key={i} className="w-11 h-14 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-2xl font-black text-slate-900 dark:text-white">{ch}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-center text-slate-400 dark:text-slate-500 font-medium mb-6">
            {status === 'unavailable' ? `Live Sync is even niet beschikbaar. Tellen gaat gewoon door. Blijft dit zo? Meld het hieronder of neem contact op met ${CONTACT}.` : status === 'denied' ? 'Deze code is in gebruik op een ander apparaat. Staat dat apparaat al 15 minuten uit? Stop en probeer het dan opnieuw.' : status === 'error' ? 'Geen verbinding, opnieuw proberen…' : `Laatste update: ${lastOkAt ? new Date(lastOkAt).toLocaleTimeString('nl-NL') : '—'}`}
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
