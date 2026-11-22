// Inventory list with search and status filters, plus history of consumed / thrown products.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Package, Plus, Search } from 'lucide-react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { ItemRow, TopBar } from '../components/ui.jsx';
import { formatDate } from '../lib/format.js';

const FILTERS = ['all', 'expiring', 'needs_check', 'no_date', 'fresh'];

export default function Inventory() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'all';
  const view = params.get('view') === 'history' ? 'history' : 'active';
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    setItems(null);
    api(`/items?view=${view}`).then((d) => setItems(d.items)).catch(() => setItems([]));
  }, [view]);

  const shown = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    return items.filter(
      (i) => (view === 'history' || filter === 'all' || i.status === filter) && (!needle || i.name.toLowerCase().includes(needle))
    );
  }, [items, q, filter, view]);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <main className="screen">
      <TopBar title={t('navInventory')}>
        <Link to="/items/new" className="icon-btn" aria-label={t('addProduct')}>
          <Plus size={20} />
        </Link>
      </TopBar>

      <div className="stack">
        <div className="segmented">
          <button type="button" className={view === 'active' ? 'on' : ''} onClick={() => setParam('view', null)}>{t('tabActive')}</button>
          <button type="button" className={view === 'history' ? 'on' : ''} onClick={() => setParam('view', 'history')}>{t('tabHistory')}</button>
        </div>

        <label className="search">
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')} />
        </label>

        {view === 'active' && (
          <div className="chips" role="tablist">
            {FILTERS.map((f) => (
              <button key={f} type="button" className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setParam('filter', f === 'all' ? null : f)}>
                {f === 'all' ? t('filterAll') : t(`st_${f}`)}
              </button>
            ))}
          </div>
        )}

        {!items ? (
          <div className="loading" style={{ minHeight: 160 }}><Loader2 className="spin" /></div>
        ) : shown.length === 0 ? (
          <div className="empty">
            <Package size={30} />
            <p>{view === 'history' ? t('historyEmpty') : items.length ? t('noResults') : t('emptyInventory')}</p>
          </div>
        ) : view === 'history' ? (
          <div className="list">
            {shown.map((i) => (
              <div key={i.id} className="item">
                <div className={`avatar ${i.removal_type === 'thrown' ? 'needs_check' : ''}`}>{i.name.charAt(0).toUpperCase()}</div>
                <div className="item-main">
                  <div className="item-name">{i.name}</div>
                  <div className="item-meta">
                    {formatDate(i.removed_at, lang)}
                    {i.removal_reason ? ` · ${t(`r_${i.removal_reason}`)}` : ''}
                  </div>
                </div>
                <span className={`badge ${i.removal_type === 'thrown' ? 'needs_check' : ''}`}>{t(i.removal_type)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="list">
            {shown.map((i) => <ItemRow key={i.id} item={i} onClick={() => navigate(`/items/${i.id}`)} />)}
          </div>
        )}
      </div>
    </main>
  );
}
