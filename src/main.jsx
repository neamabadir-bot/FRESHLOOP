import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n.jsx';
import { AuthProvider } from './auth.jsx';
import { NotificationsProvider } from './notifications.jsx';
import { ToastProvider } from './components/ui.jsx';
import './styles.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
