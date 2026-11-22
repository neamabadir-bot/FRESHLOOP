import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { useI18n } from './i18n.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setLang } = useI18n();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const applyUser = useCallback(
    (u) => {
      setUser(u);
      if (u?.language) setLang(u.language);
    },
    [setLang]
  );

  useEffect(() => {
    if (!getToken()) return;
    api('/me')
      .then((d) => applyUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [applyUser]);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('freshloop:logout', onLogout);
    return () => window.removeEventListener('freshloop:logout', onLogout);
  }, []);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token);
    applyUser(d.user);
  };

  const register = async (name, email, password, language) => {
    const d = await api('/auth/register', { method: 'POST', body: { name, email, password, language } });
    setToken(d.token);
    applyUser(d.user);
  };

  const updateUser = async (patch) => {
    const d = await api('/me', { method: 'PATCH', body: patch });
    applyUser(d.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
