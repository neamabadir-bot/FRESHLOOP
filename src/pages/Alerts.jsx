// In-app list of expiry alerts (3 days before + on the expiry day).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, CalendarClock, Loader2, TriangleAlert } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { useNotifications } from '../notifications.jsx';
import { TopBar } from '../components/ui.jsx';
import { formatDate } from '../lib/format.js';

export default function Alerts() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { refresh, setUnread } = useNotifications();
  const navigate = useNavigate();
  const [list, setList] = useState(null);

  useEffect(() => {
    refresh()
      .then((d) => setList(d?.notifications ?? []))
      .catch(() => setList([]));
  }, [refresh]);

  const markAll = async () => {
    await api('/notifications/read', { method: 'POST', body: {} });
    setList((l) => l.map((n) => ({ ...n, read_at: n.read_at || 'now' })));
    setUnread(0);
  };

  const open = async (n) => {
    if (!n.read_at) {
      api('/notifications/read', { method: 'POST', body: { ids: [n.id] } }).then(() => refresh().catch(() => {}));
    }
    if (!n.removed_at) navigate(`/items/${n.item_id}`);
  };

  const hasUnread = list?.some((n) => !n.read_at);

  return (
    <main className="screen">
      <TopBar title={t('alertsTitle')}>
        {hasUnread && (
          <button className="link-btn" type="button" onClick={markAll}>{t('markAllRead')}</button>
        )}
      </TopBar>

      {!user.notifications_enabled && (
        <div className="info warn" style={{ marginBottom: 12 }}>
          <BellOff size={18} />
          <span>{t('alertsOff')}</span>
        </div>
      )}

      {!list ? (
        <div className="loading" style={{ minHeight: 160 }}><Loader2 className="spin" /></div>
      ) : list.length === 0 ? (
        <div className="empty">
          <CalendarClock size={30} />
          <p>{t('noAlerts')}</p>
        </div>
      ) : (
        <div className="list">
          {list.map((n) => (
            <button key={n.id} type="button" className={`notif ${n.read_at ? '' : 'unread'}`} onClick={() => open(n)}>
              <span className={`ic ${n.kind}`}>
                {n.kind === 'expiry_day' ? <TriangleAlert size={18} /> : <CalendarClock size={18} />}
              </span>
              <span style={{ flex: 1 }}>
                {t(`n_${n.kind}`, { item: n.item_name })}
                <time>
                  {formatDate(n.created_at, lang)}
                  {n.removed_at ? ` · ${t('removedLabel')}` : ''}
                </time>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
