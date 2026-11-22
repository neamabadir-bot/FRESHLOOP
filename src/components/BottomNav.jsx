import { NavLink } from 'react-router-dom';
import { Bell, Home, Package, ScanLine, Settings } from 'lucide-react';
import { useI18n } from '../i18n.jsx';
import { useNotifications } from '../notifications.jsx';

export default function BottomNav() {
  const { t } = useI18n();
  const { unread } = useNotifications();
  const cls = ({ isActive }) => (isActive ? 'active' : '');
  return (
    <nav className="nav" aria-label="Main">
      <NavLink to="/" end className={cls}>
        <Home size={22} />
        {t('navHome')}
      </NavLink>
      <NavLink to="/inventory" className={cls}>
        <Package size={22} />
        {t('navInventory')}
      </NavLink>
      <NavLink to="/scan" className={cls} aria-label={t('navScan')}>
        <span className="scan-btn">
          <ScanLine size={26} />
        </span>
      </NavLink>
      <NavLink to="/alerts" className={cls}>
        <Bell size={22} />
        {unread > 0 && <span className="badge-count">{unread > 9 ? '9+' : unread}</span>}
        {t('navAlerts')}
      </NavLink>
      <NavLink to="/settings" className={cls}>
        <Settings size={22} />
        {t('navSettings')}
      </NavLink>
    </nav>
  );
}
