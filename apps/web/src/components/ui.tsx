import { useEffect, useState, type ReactNode } from 'react';
import { AppError } from '../data/model';

// ---------------------------------------------------------------------------
// Íconos (trazo, 24 × 24)
// ---------------------------------------------------------------------------
const PATHS: Record<string, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" />,
  close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  play: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  bookmarkFill: <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />,
  share: <><path d="M4 12v8h16v-8" /><path d="M12 3v12" /><path d="M7 8l5-5 5 5" /></>,
  muted: <><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l5 6" /><path d="M22 9l-5 6" /></>,
  sound: <><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8.5a5 5 0 0 1 0 7" /><path d="M19.5 6a8.5 8.5 0 0 1 0 12" /></>,
  star: <path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5 9.4 9z" />,
  starFill: <path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5 9.4 9z" fill="currentColor" />,
  check: <path d="M5 12l5 5 9-10" />,
  clock: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  inbox: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></>,
  menu: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" /></>,
  account: <><path d="M4 7h16v12H4z" /><path d="M4 11h16" /><path d="M8 3h8" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  upload: <><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  shield: <><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  store: <><path d="M3 9l2-5h14l2 5" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chevron: <path d="M9 5l7 7-7 7" />,
  trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
  edit: <><path d="M4 20h4L20 8l-4-4L4 16z" /></>,
  fast: <><path d="M4 6l7 6-7 6z" /><path d="M13 6l7 6-7 6z" /></>,
  reset: <><path d="M4 4v6h6" /><path d="M5 15a8 8 0 1 0 2-8.5L4 10" /></>,
};

export function Icon({ name, size = 22, stroke = 2 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Avisos (toasts)
// ---------------------------------------------------------------------------
type ToastMsg = { id: number; text: string; kind: 'ok' | 'error' };
let toastListener: ((t: ToastMsg) => void) | null = null;
let toastSeq = 0;

export function toast(text: string, kind: 'ok' | 'error' = 'ok') {
  toastListener?.({ id: ++toastSeq, text, kind });
}

/** Ejecuta una acción del backend y muestra el error de negocio si lo hay. */
export function attempt(fn: () => void, success?: string): boolean {
  try {
    fn();
    if (success) toast(success);
    return true;
  } catch (error) {
    toast(error instanceof AppError ? error.message : 'Algo salió mal. Intenta de nuevo.', 'error');
    if (!(error instanceof AppError)) console.error(error);
    return false;
  }
}

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    toastListener = setMsg;
    return () => {
      toastListener = null;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), msg.kind === 'error' ? 4200 : 2600);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div className={`toast ${msg.kind === 'error' ? 'error' : ''}`} role={msg.kind === 'error' ? 'alert' : 'status'} key={msg.id}>
      <Icon name={msg.kind === 'error' ? 'close' : 'check'} size={18} stroke={2.6} />
      <span>{msg.text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas pequeñas
// ---------------------------------------------------------------------------
export function Header({ title, onBack, right, kicker }: { title?: string; onBack?: () => void; right?: ReactNode; kicker?: string }) {
  return (
    <div className="header">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="Volver">
          <Icon name="back" />
        </button>
      )}
      <div className="grow stack gap-4">
        {kicker && <span className="label">{kicker}</span>}
        {title && <h1 className="ellipsis">{title}</h1>}
      </div>
      {right}
    </div>
  );
}

export function Sheet({ children, onClose, label, night }: { children: ReactNode; onClose: () => void; label: string; night?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className={`sheet ${night ? 'night' : ''}`} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button onClick={() => onChange(Math.max(min, value - 1))} aria-label="Uno menos" disabled={value <= min}>−</button>
      <output aria-live="polite">{value}</output>
      <button className="plus" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Uno más" disabled={value >= max}>+</button>
    </div>
  );
}

export function Perforation() {
  return (
    <div className="perforation" aria-hidden="true">
      <span />
    </div>
  );
}

export function Stars({ value, size = 14, color = 'var(--brasa-texto)' }: { value: number; size?: number; color?: string }) {
  return (
    <span className="row gap-4" aria-label={`${value} de 5`} style={{ color, gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name={n <= value ? 'starFill' : 'star'} size={size} stroke={1.6} />
      ))}
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="stack gap-8 center" style={{ padding: '36px 12px', textAlign: 'center' }}>
      <span className="display h3">{title}</span>
      {body && <span className="muted small" style={{ maxWidth: 280, lineHeight: 1.45 }}>{body}</span>}
      {action}
    </div>
  );
}

/** Re-renderiza cada `ms` para cuentas regresivas y horas relativas. */
export function useTick(ms = 30_000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
