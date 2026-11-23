import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { shade } from '../lib/colors.js';

/**
 * De grote telknop.
 * - Telt direct bij het neerdrukken (pointerdown): elke tik telt, ook als je vinger iets verschuift.
 * - De knop verandert niet van vorm bij indrukken (alleen een kleine schaal-animatie), zodat tikken niet "mist".
 * - Golf-effect op de plek waar je tikt; het getal springt bij elke tik opnieuw, ook bij heel snel tikken.
 * - Met het toetsenbord (Enter/Spatie) werkt hij ook.
 */
const CounterButton = forwardRef(function CounterButton({ value, color, disabled, label, onAdd }, ref) {
  const btn = useRef(null);
  const num = useRef(null);
  const [pressed, setPressed] = useState(false);

  // Het getal laten springen (omhoog of omlaag). Start de animatie elke keer opnieuw.
  const pop = (dir = 'up') => {
    const el = num.current;
    if (!el || !el.animate) return;
    el.animate(
      dir === 'up'
        ? [{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }]
        : [{ transform: 'scale(1)' }, { transform: 'scale(0.86)' }, { transform: 'scale(1)' }],
      { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.3)' },
    );
  };
  useImperativeHandle(ref, () => ({ pop }));

  const ripple = (x, y) => {
    const b = btn.current;
    if (!b || !b.animate) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const dot = document.createElement('span');
    dot.className = 'pointer-events-none absolute rounded-full bg-white';
    Object.assign(dot.style, { width: `${size}px`, height: `${size}px`, left: `${x - r.left - size / 2}px`, top: `${y - r.top - size / 2}px` });
    b.appendChild(dot);
    const a = dot.animate([{ transform: 'scale(0)', opacity: 0.32 }, { transform: 'scale(1)', opacity: 0 }], { duration: 550, easing: 'cubic-bezier(.2,.7,.3,1)' });
    a.onfinish = () => dot.remove();
  };

  const count = () => { if (disabled) return; onAdd(); pop('up'); };

  const onPointerDown = (e) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); // geen focus-rand, geen tekstselectie, geen vertraging
    setPressed(true);
    ripple(e.clientX, e.clientY);
    count();
  };
  const release = () => setPressed(false);

  const bg = color ? `linear-gradient(135deg, ${color} 0%, ${shade(color, 20)} 100%)` : undefined;

  return (
    <button
      ref={btn}
      type="button"
      disabled={disabled}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onClick={(e) => { if (e.detail === 0) count(); }} // alleen toetsenbord; muis/aanraking telt al bij neerdrukken
      onContextMenu={(e) => e.preventDefault()}
      className={`counter-btn relative flex-1 overflow-hidden select-none rounded-[2.5rem] text-white flex items-center justify-center
        bg-gradient-to-br from-blue-500 to-indigo-700 ring-1 ring-white/20 dark:ring-white/10
        outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:opacity-60 disabled:cursor-not-allowed
        ${pressed ? 'is-pressed' : ''}`}
      style={{ background: bg }}
    >
      {/* zachte glans bovenaan */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.28),transparent_70%)]" />
      <span ref={num} className="count-text relative font-black tabular-nums tracking-tighter leading-none drop-shadow-lg will-change-transform">
        {value}
      </span>
    </button>
  );
});

export default CounterButton;
