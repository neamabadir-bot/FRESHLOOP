import { describe, expect, it } from 'vitest';
import { daysUntil, dueAlertKinds, itemStatus } from '../server/expiry.js';

const TODAY = '2026-11-22';

describe('daysUntil', () => {
  it('counts whole days, across months', () => {
    expect(daysUntil('2026-11-25', TODAY)).toBe(3);
    expect(daysUntil('2026-12-01', TODAY)).toBe(9);
    expect(daysUntil('2026-11-20', TODAY)).toBe(-2);
  });
});

describe('itemStatus', () => {
  it('is no_date without an expiry date', () => {
    expect(itemStatus({ expiry_date: null }, TODAY)).toEqual({ status: 'no_date', days_left: null });
  });
  it('is fresh with more than 3 days left', () => {
    expect(itemStatus({ expiry_date: '2026-11-26' }, TODAY).status).toBe('fresh');
  });
  it('is expiring 3 days before the date', () => {
    expect(itemStatus({ expiry_date: '2026-11-25' }, TODAY).status).toBe('expiring');
    expect(itemStatus({ expiry_date: '2026-11-23' }, TODAY).status).toBe('expiring');
  });
  it('needs a check on the expiry day and after it (never auto-removed)', () => {
    expect(itemStatus({ expiry_date: TODAY }, TODAY).status).toBe('needs_check');
    expect(itemStatus({ expiry_date: '2026-11-01' }, TODAY)).toEqual({ status: 'needs_check', days_left: -21 });
  });
});

describe('dueAlertKinds', () => {
  it('sends the 3-day alert only before the expiry day', () => {
    expect(dueAlertKinds({ expiry_date: '2026-11-26' }, TODAY)).toEqual([]);
    expect(dueAlertKinds({ expiry_date: '2026-11-25' }, TODAY)).toEqual(['three_days']);
    expect(dueAlertKinds({ expiry_date: TODAY }, TODAY)).toEqual(['expiry_day']);
  });
  it('sends nothing for removed items or items without a date', () => {
    expect(dueAlertKinds({ expiry_date: TODAY, removed_at: '2026-11-21' }, TODAY)).toEqual([]);
    expect(dueAlertKinds({ expiry_date: null }, TODAY)).toEqual([]);
  });
});
