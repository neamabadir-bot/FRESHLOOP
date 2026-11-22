// Personal settings: name, the choice to receive alerts (spec section 4), language, log out.
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { LANGUAGES, useI18n } from '../i18n.jsx';
import {
  deviceNotificationsOn,
  deviceNotificationsSupported,
  setDeviceNotifications,
  useNotifications,
} from '../notifications.jsx';
import { Switch, TopBar, useToast } from '../components/ui.jsx';

export default function Settings() {
  const { t, setLang, lang } = useI18n();
  const { user, updateUser, logout } = useAuth();
  const { refresh } = useNotifications();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [deviceOn, setDeviceOn] = useState(deviceNotificationsOn());
  const [denied, setDenied] = useState(deviceNotificationsSupported() && Notification.permission === 'denied');

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === user.name) return;
    await updateUser({ name: name.trim() });
    toast(t('saved'));
  };

  const toggleAlerts = async (on) => {
    await updateUser({ notifications_enabled: on });
    refresh().catch(() => {});
  };

  const toggleDevice = async (on) => {
    if (on && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') {
        setDenied(p === 'denied');
        return;
      }
    }
    setDeviceNotifications(on);
    setDeviceOn(on);
    if (on) refresh().catch(() => {});
  };

  const changeLang = (code) => {
    setLang(code);
    updateUser({ language: code }).catch(() => {});
  };

  return (
    <main className="screen">
      <TopBar title={t('settingsTitle')} />
      <div className="stack">
        <section className="card">
          <form className="stack" onSubmit={saveName}>
            <div className="field">
              <label htmlFor="name">{t('name')}</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
            </div>
            <div className="field">
              <label>{t('email')}</label>
              <div className="muted">{user.email}</div>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="setting">
            <div className="txt">
              <b>{t('notifications')}</b>
              <span>{t('notificationsSub')}</span>
            </div>
            <Switch checked={user.notifications_enabled} onChange={toggleAlerts} label={t('notifications')} />
          </div>
          {deviceNotificationsSupported() && user.notifications_enabled && (
            <div className="setting">
              <div className="txt">
                <b>{t('phoneNotifications')}</b>
                <span>{denied ? t('permissionDenied') : t('phoneNotificationsSub')}</span>
              </div>
              <Switch checked={deviceOn} onChange={toggleDevice} label={t('phoneNotifications')} />
            </div>
          )}
        </section>

        <section className="card">
          <div className="field">
            <label>{t('language')}</label>
            <div className="segmented">
              {LANGUAGES.map((l) => (
                <button key={l.code} type="button" className={lang === l.code ? 'on' : ''} onClick={() => changeLang(l.code)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <button className="btn danger" type="button" onClick={logout}>
          <LogOut size={18} className="flip-rtl" /> {t('logout')}
        </button>
      </div>
    </main>
  );
}
