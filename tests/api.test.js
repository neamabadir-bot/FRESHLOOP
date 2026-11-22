import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

const TODAY = '2026-11-22';
let app;
let auth;

async function registerUser(email = 'dana@example.com') {
  const res = await request(app).post('/api/auth/register').send({ name: 'Dana', email, password: 'password123' });
  return { Authorization: `Bearer ${res.body.token}` };
}

beforeEach(async () => {
  app = createApp(openDb(':memory:'), { today: () => TODAY });
  auth = await registerUser();
});

describe('auth', () => {
  it('registers, rejects duplicates and weak passwords, and logs in', async () => {
    const dup = await request(app).post('/api/auth/register').send({ name: 'X', email: 'DANA@example.com', password: 'password123' });
    expect(dup.status).toBe(409);
    const weak = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@example.com', password: 'short' });
    expect(weak.body.error).toBe('weak_password');
    const bad = await request(app).post('/api/auth/login').send({ email: 'dana@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
    const ok = await request(app).post('/api/auth/login').send({ email: 'dana@example.com', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.user).toMatchObject({ name: 'Dana', notifications_enabled: true });
  });

  it('protects the API', async () => {
    expect((await request(app).get('/api/items')).status).toBe(401);
  });
});

describe('inventory', () => {
  it('adds, updates, and removes items with status', async () => {
    const created = await request(app).post('/api/items').set(auth)
      .send({ name: 'Milk', quantity: 1, unit: 'L', expiry_date: '2026-11-24', expiry_type: 'use_by' });
    expect(created.status).toBe(201);
    expect(created.body.item).toMatchObject({ status: 'expiring', days_left: 2, source: 'manual' });

    const id = created.body.item.id;
    const patched = await request(app).patch(`/api/items/${id}`).set(auth).send({ quantity: 0.5, checked: true });
    expect(patched.body.item.quantity).toBe(0.5);
    expect(patched.body.item.last_checked_at).toBeTruthy();

    const removed = await request(app).post(`/api/items/${id}/remove`).set(auth).send({ type: 'thrown', reason: 'spoiled' });
    expect(removed.body.item).toMatchObject({ removal_type: 'thrown', removal_reason: 'spoiled' });

    expect((await request(app).get('/api/items').set(auth)).body.items).toHaveLength(0);
    expect((await request(app).get('/api/items?view=history').set(auth)).body.items).toHaveLength(1);
  });

  it("keeps users' inventories separate", async () => {
    const other = await registerUser('omar@example.com');
    const { body } = await request(app).post('/api/items').set(auth).send({ name: 'Bread' });
    expect((await request(app).get(`/api/items/${body.item.id}`).set(other)).status).toBe(404);
  });

  it('validates input', async () => {
    const res = await request(app).post('/api/items').set(auth).send({ name: 'X', expiry_date: '22/11/2026' });
    expect(res.body.error).toBe('invalid_expiry_date');
  });
});

describe('receipts', () => {
  it('adds only the confirmed items, marked as coming from a receipt', async () => {
    const res = await request(app).post('/api/receipts').set(auth).send({
      store: 'Fresh Market',
      items: [
        { name: 'Eggs', quantity: 12, unit: 'pcs', price: 14.9, expiry_date: '2026-12-10' },
        { name: 'Yogurt', quantity: 2, price: 9.8 },
      ],
    });
    expect(res.body.added).toBe(2);
    const items = (await request(app).get('/api/items').set(auth)).body.items;
    expect(items.map((i) => [i.name, i.source, i.status])).toEqual([
      ['Eggs', 'receipt', 'fresh'],
      ['Yogurt', 'receipt', 'no_date'],
    ]);
  });
});

describe('alerts', () => {
  it('creates a 3-day alert and an expiry-day alert once each, and never deletes the item', async () => {
    await request(app).post('/api/items').set(auth).send({ name: 'Hummus', expiry_date: '2026-11-25' });
    await request(app).post('/api/items').set(auth).send({ name: 'Cheese', expiry_date: '2026-11-22', expiry_type: 'best_before' });
    await request(app).post('/api/items').set(auth).send({ name: 'Rice', expiry_date: '2027-05-01' });

    const first = (await request(app).get('/api/notifications').set(auth)).body;
    expect(first.notifications.map((n) => [n.item_name, n.kind]).sort()).toEqual([
      ['Cheese', 'expiry_day'],
      ['Hummus', 'three_days'],
    ]);
    const again = (await request(app).get('/api/notifications').set(auth)).body;
    expect(again.notifications).toHaveLength(2);

    const dash = (await request(app).get('/api/dashboard').set(auth)).body;
    expect(dash.counts).toMatchObject({ total: 3, expiring: 1, needs_check: 1 });
  });

  it('respects the personal choice to turn alerts off', async () => {
    await request(app).patch('/api/me').set(auth).send({ notifications_enabled: false });
    await request(app).post('/api/items').set(auth).send({ name: 'Hummus', expiry_date: '2026-11-23' });
    expect((await request(app).get('/api/notifications').set(auth)).body.notifications).toHaveLength(0);
  });
});
