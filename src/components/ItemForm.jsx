// Add / edit form for a single product (manual entry, spec sections 5–6).
import { useState } from 'react';
import { useI18n } from '../i18n.jsx';

export const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'pack'];

export function ExpiryTypeToggle({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="segmented" role="radiogroup" aria-label={t('dateType')}>
      {['use_by', 'best_before'].map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {t(v === 'use_by' ? 'useBy' : 'bestBefore')}
        </button>
      ))}
    </div>
  );
}

export default function ItemForm({ initial, onSubmit, submitLabel, busy, error }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    name: initial?.name ?? '',
    quantity: initial?.quantity ?? 1,
    unit: initial?.unit ?? 'pcs',
    price: initial?.price ?? '',
    expiry_date: initial?.expiry_date ?? '',
    expiry_type: initial?.expiry_type ?? 'use_by',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...f,
      name: f.name.trim(),
      quantity: Number(f.quantity),
      price: f.price === '' ? null : Number(f.price),
      expiry_date: f.expiry_date || null,
    });
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="name">{t('productName')}</label>
        <input id="name" className="input" value={f.name} onChange={set('name')} required maxLength={120} autoFocus={!initial} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="qty">{t('quantity')}</label>
          <input id="qty" className="input" type="number" inputMode="decimal" min="0" step="any" value={f.quantity} onChange={set('quantity')} required />
        </div>
        <div className="field">
          <label htmlFor="unit">{t('unit')}</label>
          <select id="unit" className="input" value={f.unit} onChange={set('unit')}>
            {UNITS.map((u) => (
              <option key={u} value={u}>{t(`u_${u}`)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="exp">{t('expiryDate')}</label>
        <input id="exp" className="input" type="date" value={f.expiry_date} onChange={set('expiry_date')} />
        <span className="hint">{t('expiryDateHint')}</span>
      </div>
      <div className="field">
        <label>{t('dateType')}</label>
        <ExpiryTypeToggle value={f.expiry_type} onChange={set('expiry_type')} />
      </div>
      <div className="field">
        <label htmlFor="price">{t('price')}</label>
        <input id="price" className="input" type="number" inputMode="decimal" min="0" step="0.01" value={f.price} onChange={set('price')} />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn" type="submit" disabled={busy}>{submitLabel}</button>
    </form>
  );
}
