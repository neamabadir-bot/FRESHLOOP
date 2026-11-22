// Login and registration (email + password – the first-version sign-up method in the spec).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { LANGUAGES, useI18n } from '../i18n.jsx';

export default function Auth({ mode }) {
  const { t, lang, setLang } = useI18n();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) await register(form.name.trim(), form.email.trim(), form.password, lang);
      else await login(form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      const key = `err_${err.code}`;
      setError(t(key) === key ? t('err_generic') : t(key));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="lang-switch">
        <div className="segmented">
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" className={lang === l.code ? 'on' : ''} onClick={() => setLang(l.code)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="auth-hero">
        <span className="brand">
          <img src="/icon.svg" alt="" />
          FRESHLOOP
        </span>
        <h1>{isRegister ? t('joinTitle') : t('welcomeBack')}</h1>
        <p>{t('tagline')}</p>
      </div>

      <form className="stack" onSubmit={submit} noValidate>
        {isRegister && (
          <div className="field">
            <label htmlFor="name">{t('name')}</label>
            <input id="name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">{t('email')}</label>
          <input id="email" className="input" type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">{t('password')}</label>
          <input
            id="password" className="input" type="password" value={form.password} onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : undefined}
          />
          {isRegister && <span className="hint">{t('passwordHint')}</span>}
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {isRegister ? t('register') : t('login')}
        </button>
      </form>

      <p className="auth-foot">
        {isRegister ? t('haveAccount') : t('noAccount')}{' '}
        <Link to={isRegister ? '/login' : '/register'}>{isRegister ? t('login') : t('register')}</Link>
      </p>
    </div>
  );
}
