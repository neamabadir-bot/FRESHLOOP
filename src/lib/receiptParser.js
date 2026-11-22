// Turns the raw OCR text of a supermarket receipt into a list of candidate food products.
// The result is always shown to the user for review – nothing is added without confirmation.

// Lines containing these words are totals, payments or store details, not products.
const IGNORE_WORDS = [
  'total', 'subtotal', 'sum', 'tax', 'vat', 'change', 'cash', 'card', 'credit', 'visa', 'mastercard',
  'payment', 'paid', 'balance', 'discount', 'tel', 'phone', 'receipt', 'invoice', 'date', 'time',
  'thank', 'www', 'http', 'cashier', 'branch', 'items', 'qty', 'amount due', 'saving', 'tender',
  'סה"כ', 'סה״כ', 'סהכ', 'לתשלום', 'מע"מ', 'מע״מ', 'מעמ', 'עודף', 'מזומן', 'אשראי', 'ויזה', 'כרטיס',
  'תשלום', 'הנחה', 'טלפון', 'טל:', 'טל.', 'תאריך', 'שעה', 'קופה', 'קופאי', 'תודה', 'חשבונית', 'קבלה',
  'ח.פ', 'עוסק', 'סניף', 'פריטים', 'חיסכון', 'מבצע',
];

const PRICE_RE = /-?\d{1,5}[.,]\d{2}(?!\d)/g;
const QTY_X_RE = /(\d+(?:[.,]\d+)?)\s*[xX×*]\s*|\s*[xX×*]\s*(\d+(?:[.,]\d+)?)/;
const WEIGHT_RE = /(\d+(?:[.,]\d+)?)\s*(kg|ק"ג|ק״ג|קג|ק''ג)(?![a-z])/i;
const LETTER_RE = /[A-Za-z֐-׿]/g;

const toNumber = (s) => Number(String(s).replace(',', '.'));
const isIgnored = (line) => {
  const lower = line.toLowerCase();
  return IGNORE_WORDS.some((w) => lower.includes(w));
};
const letterCount = (s) => (s.match(LETTER_RE) || []).length;

function cleanName(s) {
  return s
    .replace(WEIGHT_RE, ' ')
    .replace(QTY_X_RE, ' ')
    .replace(PRICE_RE, ' ')
    .replace(/\b\d{5,}\b/g, ' ') // barcodes / item codes
    .replace(/[₪$€|_~=<>{}[\]\\]/g, ' ')
    .replace(/\b(ils|nis)\b/gi, ' ')
    .replace(/^[\s\d.,:;*#-]+|[\s.,:;*#-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * @param {string} text Raw OCR text.
 * @returns {{ store: string|null, items: Array<{name:string, quantity:number, unit:string, price:number|null}> }}
 */
export function parseReceipt(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let store = null;
  const items = [];
  let pendingName = null; // product name printed on its own line, price on the next line

  const readQuantity = (qtyMatch, weightMatch) =>
    weightMatch
      ? { quantity: toNumber(weightMatch[1]), unit: 'kg' }
      : { quantity: toNumber(qtyMatch[1] ?? qtyMatch[2]) || 1, unit: 'pcs' };

  for (const line of lines) {
    const prices = line.match(PRICE_RE) || [];
    const ignored = isIgnored(line);

    // Store name: first line with real words, before any product was found.
    if (!store && !items.length && !prices.length && !ignored && letterCount(line) >= 3) {
      store = cleanName(line) || null;
      continue;
    }
    if (ignored) {
      pendingName = null;
      continue;
    }

    const qtyMatch = line.match(QTY_X_RE);
    const weightMatch = line.match(WEIGHT_RE);
    const name = cleanName(line);
    const price = prices.length ? toNumber(prices[prices.length - 1]) : null;

    // A line like "2 x 4.50  9.00" with no product name: it belongs to the name line just above it,
    // or (if that line already had a price) updates the previous product.
    if (letterCount(name) < 2) {
      if (price !== null && price >= 0) {
        // OCR sometimes garbles the "x" (e.g. "2 x 4.90" -> "2 א 0"), so fall back to a leading count.
        const leading = line.match(/^(\d{1,2})\s/);
        const q = qtyMatch || weightMatch
          ? readQuantity(qtyMatch, weightMatch)
          : { quantity: leading ? Number(leading[1]) : 1, unit: 'pcs' };
        if (pendingName) items.push({ name: pendingName, ...q, price });
        else if (items.length && (qtyMatch || weightMatch)) Object.assign(items[items.length - 1], q, { price });
      }
      pendingName = null;
      continue;
    }

    // Product lines are expected to carry a price; a name without one may get it on the next line.
    if (price === null) {
      pendingName = name.slice(0, 120);
      continue;
    }
    pendingName = null;
    if (price < 0) continue; // discount line

    const q = qtyMatch || weightMatch ? readQuantity(qtyMatch, weightMatch) : { quantity: 1, unit: 'pcs' };
    items.push({ name: name.slice(0, 120), ...q, price });
  }

  return { store, items };
}
