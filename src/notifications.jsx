// Keeps the unread alert count up to date and shows new alerts as system notifications
// (when the user enabled alerts and allowed notifications on this device).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import { useI18n } from './i18n.jsx';

const POLL_MS = 60_000;
const SHOWN_KEY = 'freshloop.shownAlerts';
const DEVICE_KEY = 'freshloop.deviceNotifications';

const NotificationsContext = createContext(null);

const readJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

export const deviceNotificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const deviceNotificationsOn = () =>
  deviceNotificationsSupported() && Notification.permission === 'granted' && readJSON(DEVICE_KEY, false);
export const setDeviceNotifications = (on) => writeJSON(DEVICE_KEY, on);

async function showSystemNotification(title, body, url) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, { body, icon: '/icon.svg', data: { url } });
    new Notification(title, { body, icon: '/icon.svg' });
  } catch {
    /* notifications not available */
  }
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return null;
    const data = await api('/notifications');
    setUnread(data.unread);
    if (deviceNotificationsOn()) {
      const shown = new Set(readJSON(SHOWN_KEY, []));
      for (const n of data.notifications) {
        if (n.read_at || shown.has(n.id)) continue;
        shown.add(n.id);
        showSystemNotification('FRESHLOOP', t(`n_${n.kind}`, { item: n.item_name }), `/items/${n.item_id}`);
      }
      writeJSON(SHOWN_KEY, [...shown].slice(-300));
    }
    return data;
  }, [user, t]);

  useEffect(() => {
    if (!user) return;
    refresh().catch(() => {});
    const id = setInterval(() => refresh().catch(() => {}), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh().catch(() => {});
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refresh]);

  return <NotificationsContext.Provider value={{ unread, setUnread, refresh }}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
