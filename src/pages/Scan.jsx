// Receipt scanning (spec section 5):
// photo -> OCR (Tesseract.js, Hebrew + English, runs on the device) -> parsed products
// -> user reviews, fixes, removes non-food items, adds dates -> only then added to inventory.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, ImageUp, Loader2, Plus, ScanLine, X } from 'lucide-react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { TopBar } from '../components/ui.jsx';
import { ExpiryTypeToggle, UNITS } from '../components/ItemForm.jsx';
import { parseReceipt } from '../lib/receiptParser.js';

let rowKey = 0;
const newRow = (p = {}) => ({
  key: ++rowKey,
  name: p.name ?? '',
  quantity: p.quantity ?? 1,
  unit: p.unit ?? 'pcs',
  price: p.price ?? '',
  expiry_date: '',
  expiry_type: 'use_by',
});

/** Downscale + greyscale the photo on a canvas – faster and usually more accurate OCR. */
async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const max = 2000;
    const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((img.naturalWidth || img.width) * scale);
    canvas.height = Math.round((img.naturalHeight || img.height) * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter = 'grayscale(1) contrast(1.3)';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function Scan() {
  const { t } = useI18n();
  const [step, setStep] = useState('pick'); // pick | reading | review | done
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState([]);
  const [store, setStore] = useState('');
  const [rawText, setRawText] = useState('');
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const cameraInput = useRef();
  const galleryInput = useRef();

  const reset = () => {
    setStep('pick');
    setPreview(null);
    setRows([]);
    setStore('');
    setRawText('');
    setError(null);
    setProgress(0);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setStep('reading');
    setProgress(0);
    let worker;
    try {
      const canvas = await prepareImage(file);
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker(['heb', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(canvas);
      const parsed = parseReceipt(data.text);
      setRawText(data.text);
      setStore(parsed.store ?? '');
      setRows(parsed.items.map(newRow));
      setStep('review');
    } catch (err) {
      console.error(err);
      setError(t('ocrError'));
      setStep('pick');
    } finally {
      worker?.terminate();
    }
  };

  const update = (key, field, value) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const removeRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key));

  const confirm = async () => {
    if (rows.some((r) => !r.name.trim())) {
      setError(t('nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const items = rows.map((r) => ({
        name: r.name.trim(),
        quantity: Number(r.quantity) || 1,
        unit: r.unit,
        price: r.price === '' ? null : Number(r.price),
        expiry_date: r.expiry_date || null,
        expiry_type: r.expiry_type,
      }));
      const res = await api('/receipts', { method: 'POST', body: { store: store || null, raw_text: rawText, items } });
      setAdded(res.added);
      setStep('done');
    } catch {
      setError(t('err_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <TopBar title={step === 'review' ? t('reviewTitle') : t('scanTitle')} back={step !== 'pick'} />

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onFile} data-testid="receipt-file" />

      {step === 'pick' && (
        <div className="stack">
          <div className="dropzone">
            <div className="big-ic"><ScanLine size={34} /></div>
            <p className="muted">{t('scanIntro')}</p>
          </div>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn" type="button" onClick={() => cameraInput.current.click()}>
            <Camera size={20} /> {t('takePhoto')}
          </button>
          <button className="btn secondary" type="button" onClick={() => galleryInput.current.click()}>
            <ImageUp size={20} /> {t('chooseImage')}
          </button>
          <p className="muted small center">{t('scanTips')}</p>
        </div>
      )}

      {step === 'reading' && (
        <div className="stack">
          {preview && <img className="preview" src={preview} alt="" />}
          <div className="card stack">
            <div className="row">
              <Loader2 className="spin" size={20} color="var(--green)" />
              <b style={{ fontWeight: 600 }}>{t('reading')}</b>
              <div className="spacer" />
              <span className="muted small">{progress}%</span>
            </div>
            <div className="progress"><div style={{ width: `${Math.max(progress, 4)}%` }} /></div>
            <p className="muted small">{t('readingSub')}</p>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="stack">
          <p className="muted">{t('reviewSub')}</p>
          <div className="field">
            <label htmlFor="store">{t('store')}</label>
            <input id="store" className="input" value={store} onChange={(e) => setStore(e.target.value)} />
          </div>

          {rows.length === 0 && <div className="info warn"><span>{t('noItemsFound')}</span></div>}

          {rows.map((r) => (
            <div key={r.key} className="review-item">
              <div className="top">
                <input className="input" value={r.name} onChange={(e) => update(r.key, 'name', e.target.value)} aria-label={t('productName')} placeholder={t('productName')} />
                <button type="button" className="icon-btn" onClick={() => removeRow(r.key)} aria-label={t('remove')}>
                  <X size={18} />
                </button>
              </div>
              <div className="grid-3">
                <div>
                  <span className="mini-label">{t('quantity')}</span>
                  <input className="input" type="number" inputMode="decimal" min="0" step="any" value={r.quantity} onChange={(e) => update(r.key, 'quantity', e.target.value)} />
                </div>
                <div>
                  <span className="mini-label">{t('unit')}</span>
                  <select className="input" value={r.unit} onChange={(e) => update(r.key, 'unit', e.target.value)}>
                    {UNITS.map((u) => <option key={u} value={u}>{t(`u_${u}`)}</option>)}
                  </select>
                </div>
                <div>
                  <span className="mini-label">₪</span>
                  <input className="input" type="number" inputMode="decimal" min="0" step="0.01" value={r.price} onChange={(e) => update(r.key, 'price', e.target.value)} />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <span className="mini-label">{t('expiryDate')}</span>
                  <input className="input" type="date" value={r.expiry_date} onChange={(e) => update(r.key, 'expiry_date', e.target.value)} />
                </div>
                <div>
                  <span className="mini-label">{t('dateType')}</span>
                  <ExpiryTypeToggle value={r.expiry_type} onChange={(v) => update(r.key, 'expiry_type', v)} />
                </div>
              </div>
            </div>
          ))}

          <button className="btn secondary" type="button" onClick={() => setRows((rs) => [...rs, newRow()])}>
            <Plus size={18} /> {t('addRow')}
          </button>

          {rawText && (
            <div>
              <button className="link-btn" type="button" onClick={() => setShowText(!showText)}>
                {showText ? t('hideText') : t('showText')}
              </button>
              {showText && <pre className="raw-text" style={{ marginTop: 8 }}>{rawText}</pre>}
            </div>
          )}

          {error && <div className="error" role="alert">{error}</div>}
          <div className="sticky-foot">
            <button className="btn" type="button" disabled={busy || rows.length === 0} onClick={confirm}>
              {t('addToInventory', { n: rows.length })}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="stack center">
          <div className="success-ic"><CheckCircle2 size={44} /></div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{t('scanDone', { n: added })}</h2>
          <p className="muted">{t('scanDoneSub')}</p>
          <Link to="/inventory" className="btn">{t('goInventory')}</Link>
          <button className="btn secondary" type="button" onClick={reset}>{t('scanAgain')}</button>
        </div>
      )}
    </main>
  );
}
