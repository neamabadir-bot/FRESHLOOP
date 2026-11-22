// Product page: details, expiry explanation, "how much is left?" check,
// quantity updates, editing, and marking the product as consumed / thrown away.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CalendarPlus, Info, Loader2, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { useNotifications } from '../notifications.jsx';
import ItemForm from '../components/ItemForm.jsx';
import RemoveSheet from '../components/RemoveSheet.jsx';
import { Sheet, StatusBadge, TopBar, useToast } from '../components/ui.jsx';
import { daysText, formatDate, qtyText } from '../lib/format.js';

function ExpiryInfo({ item }) {
  const { t } = useI18n();
  if (!item.expiry_date) {
    return (
      <div className="info">
        <CalendarPlus size={18} />
        <span>{t('noDateInfo')}</span>
      </div>
    );
  }
  if (item.expiry_type === 'use_by') {
    const past = item.days_left < 0;
    return (
      <div className={`info ${past ? 'alert' : item.status === 'fresh' ? '' : 'warn'}`}>
        {past ? <AlertTriangle size={18} /> : <Info size={18} />}
        <span>{past ? t('infoUseByPast') : t('infoUseBy')}</span>
      </div>
    );
  }
  return (
    <div className={`info ${item.status === 'fresh' ? '' : 'warn'}`}>
      <Info size={18} />
      <span>{t('infoBestBefore')}</span>
    </div>
  );
}

export default function ItemDetail() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useNotifications();
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(0);
  const [editing, setEditing] = useState(false);
  const [removeType, setRemoveType] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/items/${id}`)
      .then((d) => {
        setItem(d.item);
        setQty(d.item.quantity);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <main className="screen">
        <TopBar title="" back />
        <div className="empty">{t('noResults')}</div>
      </main>
    );
  }
  if (!item) return <div className="loading"><Loader2 className="spin" /></div>;

  const needsCheck = item.status === 'expiring' || item.status === 'needs_check';
  const step = item.unit === 'pcs' || item.unit === 'pack' ? 1 : item.unit === 'kg' || item.unit === 'L' ? 0.25 : 50;
  const round = (n) => Math.max(0, Math.round(n * 100) / 100);

  const saveQuantity = async () => {
    if (Number(qty) === 0) {
      // Nothing left: ask whether it was used or thrown away.
      setRemoveType('consumed');
      return;
    }
    setBusy(true);
    try {
      const d = await api(`/items/${item.id}`, { method: 'PATCH', body: { quantity: Number(qty), checked: true } });
      setItem(d.item);
      toast(t('saved'));
      refresh().catch(() => {});
    } catch {
      toast(t('err_generic'));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (values) => {
    setBusy(true);
    setError(null);
    try {
      const d = await api(`/items/${item.id}`, { method: 'PATCH', body: values });
      setItem(d.item);
      setQty(d.item.quantity);
      setEditing(false);
      toast(t('saved'));
    } catch {
      setError(t('err_generic'));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async (type, reason) => {
    setBusy(true);
    try {
      await api(`/items/${item.id}/remove`, { method: 'POST', body: { type, reason } });
      toast(t('removedToast'));
      refresh().catch(() => {});
      navigate('/inventory', { replace: true });
    } catch {
      toast(t('err_generic'));
      setBusy(false);
    }
  };

  const deleteItem = async () => {
    if (!window.confirm(t('deleteConfirm'))) return;
    await api(`/items/${item.id}`, { method: 'DELETE' });
    refresh().catch(() => {});
    navigate('/inventory', { replace: true });
  };

  return (
    <main className="screen">
      <TopBar title="" back>
        <button className="icon-btn" type="button" onClick={() => setEditing(true)} aria-label={t('edit')}>
          <Pencil size={18} />
        </button>
      </TopBar>

      <div className="stack">
        <div className="detail-head">
          <div className={`avatar ${item.status}`}>{item.name.charAt(0).toUpperCase()}</div>
          <div>
            <h2>{item.name}</h2>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <StatusBadge item={item} />
              <span className="muted small">{qtyText(item, t)}</span>
            </div>
          </div>
        </div>

        <ExpiryInfo item={item} />

        {/* Quantity check – highlighted when the product is close to / past its date (spec section 7). */}
        <section className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{needsCheck ? t('checkTitle') : t('updateQuantity')}</h3>
          {needsCheck && (
            <p className="muted small" style={{ marginTop: 4 }}>
              {item.status === 'needs_check' ? t('checkSubExpired') : t('checkSub')}
            </p>
          )}
          <div className="stepper" style={{ marginTop: 14 }}>
            <button type="button" onClick={() => setQty(round(Number(qty) - step))} aria-label="-">
              <Minus size={18} />
            </button>
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} aria-label={t('quantity')} />
            <button type="button" onClick={() => setQty(round(Number(qty) + step))} aria-label="+">
              <Plus size={18} />
            </button>
            <span className="muted" style={{ minWidth: 36 }}>{t(`u_${item.unit}`)}</span>
          </div>
          <button className="btn" style={{ marginTop: 14 }} type="button" disabled={busy || qty === ''} onClick={saveQuantity}>
            {needsCheck ? t('confirmAmount') : t('save')}
          </button>
        </section>

        <section className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>{t('details')}</h3>
          <dl className="kv">
            <dt>{t('expiryDate')}</dt>
            <dd>{item.expiry_date ? `${formatDate(item.expiry_date, lang)} · ${daysText(item, t)}` : '—'}</dd>
            <dt>{t('dateType')}</dt>
            <dd>{t(item.expiry_type === 'use_by' ? 'useBy' : 'bestBefore')}</dd>
            {item.price != null && (
              <>
                <dt>{t('price').replace(/\s*\(.*\)/, '')}</dt>
                <dd>₪{Number(item.price).toFixed(2)}</dd>
              </>
            )}
            <dt>{t('added')}</dt>
            <dd>{formatDate(item.created_at, lang)} · {item.source === 'receipt' ? t('fromReceipt') : t('addedManually')}</dd>
            {item.last_checked_at && (
              <>
                <dt>{t('lastChecked')}</dt>
                <dd>{formatDate(item.last_checked_at, lang)}</dd>
              </>
            )}
          </dl>
        </section>

        <section>
          <div className="section-head" style={{ marginTop: 8 }}>
            <h3>{t('finished')}</h3>
          </div>
          <div className="btn-row">
            <button className="btn soft" type="button" onClick={() => setRemoveType('consumed')}>{t('markConsumed')}</button>
            <button className="btn amber" type="button" onClick={() => setRemoveType('thrown')}>{t('markThrown')}</button>
          </div>
          <button className="btn danger" style={{ marginTop: 10 }} type="button" onClick={deleteItem}>
            <Trash2 size={18} /> {t('deleteMistake')}
          </button>
        </section>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title={t('editProduct')}>
        <ItemForm initial={item} onSubmit={saveEdit} submitLabel={t('save')} busy={busy} error={error} />
      </Sheet>

      <RemoveSheet initialType={removeType} onClose={() => setRemoveType(null)} onConfirm={confirmRemove} busy={busy} />
    </main>
  );
}
