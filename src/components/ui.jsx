// Small reusable UI pieces.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n.jsx';
import { daysText, qtyText } from '../lib/format.js';

export function StatusBadge({ item }) {
  const { t } = useI18n();
  const label = item.status === 'fresh' ? daysText(item, t) : item.status === 'no_date' ? t('st_no_date') : t(`st_${item.status}`);
  return <span className={`badge ${item.status}`}>{label}</span>;
}

export function ItemRow({ item, onClick, right }) {
  const { t } = useI18n();
  const meta = [qtyText(item, t)];
  if (item.expiry_date && item.status !== 'fresh') meta.push(daysText(item, t));
  return (
    <button className="item" onClick={onClick} type="button">
      <div className={`avatar ${item.status}`}>{item.name.trim().charAt(0).toUpperCase()}</div>
      <div className="item-main">
        <div className="item-name">{item.name}</div>
        <div className="item-meta">{meta.join(' · ')}</div>
      </div>
      {right ?? <StatusBadge item={item} />}
      <ChevronRight size={18} className="flip-rtl" color="var(--ink-3)" />
    </button>
  );
}

export function TopBar({ title, back, children }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <header className="topbar">
      {back && (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t('back')} type="button">
          <ArrowLeft size={20} className="flip-rtl" />
        </button>
      )}
      <h1>{title}</h1>
      <div className="spacer" />
      {children}
    </header>
  );
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

// ---------- Toasts ----------
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef();
  const show = useCallback((m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
