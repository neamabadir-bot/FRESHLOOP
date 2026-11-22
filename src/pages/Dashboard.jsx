// Home dashboard (spec section 11, first version): products needing attention,
// the inventory, and the main actions for adding and updating products.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CalendarPlus, Leaf, Loader2, PenLine, ScanLine } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { useNotifications } from '../notifications.jsx';
import { ItemRow } from '../components/ui.jsx';

export default function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { unread, setUnread } = useNotifications();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/dashboard')
      .then((d) => {
        setData(d);
        setUnread(d.unread_notifications);
      })
      .catch((e) => setError(e.code));
  }, [setUnread]);

  const open = (item) => navigate(`/items/${item.id}`);

  return (
    <main className="screen">
      <header className="topbar">
        <span className="brand">
          <img src="/icon.svg" alt="" />
          FRESHLOOP
        </span>
        <div className="spacer" />
        <Link to="/alerts" className="icon-btn" aria-label={t('navAlerts')}>
          <Bell size={20} />
          {unread > 0 && <span className="dot" />}
        </Link>
      </header>

      <section className="hero">
        <h2>{t('hello', { name: user.name.split(' ')[0] })}</h2>
        <p>{t('dashSub')}</p>
        <div className="stats">
          <Link to="/inventory" className="stat">
            <b>{data?.counts.total ?? '–'}</b>
            <span>{t('statItems')}</span>
          </Link>
          <Link to="/inventory?filter=expiring" className="stat warn">
            <b>{data?.counts.expiring ?? '–'}</b>
            <span>{t('statExpiring')}</span>
          </Link>
          <Link to="/inventory?filter=needs_check" className="stat alert">
            <b>{data?.counts.needs_check ?? '–'}</b>
            <span>{t('statNeedsCheck')}</span>
          </Link>
        </div>
      </section>

      <div className="actions" style={{ marginTop: 16 }}>
        <Link to="/scan" className="action primary">
          <span className="ic"><ScanLine size={22} /></span>
          <b>{t('scanReceipt')}</b>
          <span>{t('scanReceiptSub')}</span>
        </Link>
        <Link to="/items/new" className="action">
          <span className="ic"><PenLine size={22} /></span>
          <b>{t('addManually')}</b>
          <span>{t('addManuallySub')}</span>
        </Link>
      </div>

      {error && <div className="error" style={{ marginTop: 16 }}>{t(`err_${error}`) === `err_${error}` ? t('err_generic') : t(`err_${error}`)}</div>}
      {!data && !error && (
        <div className="loading" style={{ minHeight: 160 }}><Loader2 className="spin" /></div>
      )}

      {data && (
        <>
          <div className="section-head">
            <h3>{t('needsAttention')}</h3>
          </div>
          {data.attention.length ? (
            <div className="list">
              {data.attention.map((i) => <ItemRow key={i.id} item={i} onClick={() => open(i)} />)}
            </div>
          ) : (
            <div className="empty">
              <Leaf size={30} />
              <p>{data.counts.total ? t('allGood') : t('emptyInventory')}</p>
            </div>
          )}

          {data.no_date.length > 0 && (
            <>
              <div className="section-head">
                <h3>{t('missingDates')}</h3>
                <Link to="/inventory?filter=no_date">{t('seeAll')}</Link>
              </div>
              <div className="info" style={{ marginBottom: 8 }}>
                <CalendarPlus size={18} />
                <span>{t('missingDatesSub')}</span>
              </div>
              <div className="list">
                {data.no_date.map((i) => <ItemRow key={i.id} item={i} onClick={() => open(i)} />)}
              </div>
            </>
          )}

          {data.inventory.length > 0 && (
            <>
              <div className="section-head">
                <h3>{t('yourInventory')}</h3>
                <Link to="/inventory">{t('seeAll')}</Link>
              </div>
              <div className="list">
                {data.inventory.map((i) => <ItemRow key={i.id} item={i} onClick={() => open(i)} />)}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
