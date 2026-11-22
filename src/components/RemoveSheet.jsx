// "Product finished" – mark as consumed or thrown away; the reason is optional (spec section 6).
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n.jsx';
import { Sheet } from './ui.jsx';

const THROWN_REASONS = ['expired', 'spoiled', 'too_much', 'forgot', 'disliked', 'other'];

/** `initialType` is 'consumed' | 'thrown' (sheet open) or null (closed). */
export default function RemoveSheet({ initialType, onClose, onConfirm, busy }) {
  const { t } = useI18n();
  const [type, setType] = useState(initialType);
  const [reason, setReason] = useState(null);
  useEffect(() => {
    setType(initialType);
    setReason(null);
  }, [initialType]);

  return (
    <Sheet open={!!initialType} onClose={onClose} title={t('finished')}>
      <div className="segmented" style={{ marginBottom: 16 }}>
        <button type="button" className={type === 'consumed' ? 'on' : ''} onClick={() => setType('consumed')}>{t('markConsumed')}</button>
        <button type="button" className={type === 'thrown' ? 'on' : ''} onClick={() => setType('thrown')}>{t('markThrown')}</button>
      </div>
      {type === 'thrown' && (
        <div className="field" style={{ marginBottom: 18 }}>
          <label>{t('reasonOptional')}</label>
          <div className="chips">
            {THROWN_REASONS.map((r) => (
              <button key={r} type="button" className={`chip ${reason === r ? 'on' : ''}`} onClick={() => setReason(reason === r ? null : r)}>
                {t(`r_${r}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="btn-row">
        <button className="btn secondary" type="button" onClick={onClose}>{t('cancel')}</button>
        <button className="btn" type="button" disabled={busy} onClick={() => onConfirm(type, type === 'thrown' ? reason : null)}>
          {t('confirm')}
        </button>
      </div>
    </Sheet>
  );
}
