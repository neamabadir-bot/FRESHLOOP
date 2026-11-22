import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import ItemForm from '../components/ItemForm.jsx';
import { TopBar, useToast } from '../components/ui.jsx';

export default function AddItem() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (values) => {
    setBusy(true);
    setError(null);
    try {
      const { item } = await api('/items', { method: 'POST', body: values });
      toast(t('saved'));
      navigate(`/items/${item.id}`, { replace: true });
    } catch {
      setError(t('err_generic'));
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <TopBar title={t('addProduct')} back />
      <ItemForm onSubmit={submit} submitLabel={t('save')} busy={busy} error={error} />
    </main>
  );
}
