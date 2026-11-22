import { describe, expect, it } from 'vitest';
import { parseReceipt } from '../src/lib/receiptParser.js';

describe('parseReceipt', () => {
  it('reads store, products, quantities and prices and skips totals/payment lines', () => {
    const text = `
      FRESH MARKET
      12 Herzl St, Tel Aviv
      Date: 21/11/2026  Time: 18:42
      Milk 3% 1L            6.90
      Eggs L 12            14.90
      2 x Yogurt            9.80
      Tomatoes 1.25 kg      8.70
      SUBTOTAL             40.30
      VISA                 40.30
      Thank you!
    `;
    const { store, items } = parseReceipt(text);
    expect(store).toBe('FRESH MARKET');
    expect(items).toEqual([
      { name: 'Milk 3% 1L', quantity: 1, unit: 'pcs', price: 6.9 },
      { name: 'Eggs L 12', quantity: 1, unit: 'pcs', price: 14.9 },
      { name: 'Yogurt', quantity: 2, unit: 'pcs', price: 9.8 },
      { name: 'Tomatoes', quantity: 1.25, unit: 'kg', price: 8.7 },
    ]);
  });

  it('handles Hebrew receipts and a quantity line below the product', () => {
    const text = `
      סופר השכונה
      חלב 3% 1 ליטר  6.90
      לחם אחיד   7.50
      גבינה לבנה
      3 X 4.90  14.70
      הנחה  -2.00
      סה"כ לתשלום  27.10
    `;
    const { store, items } = parseReceipt(text);
    expect(store).toBe('סופר השכונה');
    expect(items.map((i) => i.name)).toEqual(['חלב 3% 1 ליטר', 'לחם אחיד', 'גבינה לבנה']);
    // "גבינה לבנה" has no price on its own line; the "3 X 4.90 14.70" line below completes it.
    expect(items[2]).toEqual({ name: 'גבינה לבנה', quantity: 3, unit: 'pcs', price: 14.7 });
    expect(items[1]).toMatchObject({ quantity: 1, price: 7.5 });
  });

  it('recovers a quantity line that OCR garbled (real Tesseract output)', () => {
    const text = 'FRESH MARKET\nTomatoes 1.25 kg 8.70\nYogurt\n\n2 ‏א‎ 0 9.80\nDish soap 11.90\nTOTAL 66.50';
    const { items } = parseReceipt(text);
    expect(items.map((i) => i.name)).toEqual(['Tomatoes', 'Yogurt', 'Dish soap']);
    expect(items[1]).toEqual({ name: 'Yogurt', quantity: 2, unit: 'pcs', price: 9.8 });
  });

  it('ignores barcodes and returns an empty list for empty input', () => {
    expect(parseReceipt('7290000000123 Bananas 5.40').items[0].name).toBe('Bananas');
    expect(parseReceipt('')).toEqual({ store: null, items: [] });
  });
});
