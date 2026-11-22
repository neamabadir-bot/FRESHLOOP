// FRESHLOOP REST API. createApp(db) is exported separately from index.js so tests can use an in-memory DB.
import express from 'express';
import { hashPassword, verifyPassword, signToken, requireAuth } from './auth.js';
import { itemStatus, dueAlertKinds, todayISO } from './expiry.js';

export const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'pack'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    notifications_enabled: !!u.notifications_enabled,
    language: u.language,
  };
}

function withStatus(item, today) {
  return { ...item, ...itemStatus(item, today) };
}

/** Validates item fields. `partial` = only validate fields that are present (for PATCH). */
function validateItem(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('name')) {
    const name = String(body.name ?? '').trim();
    if (!name || name.length > 120) return { error: 'invalid_name' };
    out.name = name;
  }
  if (!partial || has('quantity')) {
    const q = body.quantity === undefined ? 1 : Number(body.quantity);
    if (!Number.isFinite(q) || q < 0 || q > 100000) return { error: 'invalid_quantity' };
    out.quantity = q;
  }
  if (!partial || has('unit')) {
    const unit = body.unit ?? 'pcs';
    if (!UNITS.includes(unit)) return { error: 'invalid_unit' };
    out.unit = unit;
  }
  if (!partial || has('price')) {
    const p = body.price === null || body.price === '' || body.price === undefined ? null : Number(body.price);
    if (p !== null && (!Number.isFinite(p) || p < 0)) return { error: 'invalid_price' };
    out.price = p;
  }
  if (!partial || has('expiry_date')) {
    const d = body.expiry_date || null;
    if (d !== null && (!DATE_RE.test(d) || Number.isNaN(Date.parse(d)))) return { error: 'invalid_expiry_date' };
    out.expiry_date = d;
  }
  if (!partial || has('expiry_type')) {
    const t = body.expiry_type ?? 'use_by';
    if (!['use_by', 'best_before'].includes(t)) return { error: 'invalid_expiry_type' };
    out.expiry_type = t;
  }
  return { value: out };
}

/** Creates any due expiry alerts for the user (only if they chose to receive notifications). */
export function generateAlerts(db, userId, today = todayISO()) {
  const user = db.prepare('SELECT notifications_enabled FROM users WHERE id = ?').get(userId);
  if (!user || !user.notifications_enabled) return 0;
  const items = db
    .prepare('SELECT * FROM items WHERE user_id = ? AND removed_at IS NULL AND expiry_date IS NOT NULL')
    .all(userId);
  const insert = db.prepare(
    'INSERT OR IGNORE INTO notifications (user_id, item_id, kind, expiry_date) VALUES (?, ?, ?, ?)'
  );
  let created = 0;
  for (const item of items) {
    for (const kind of dueAlertKinds(item, today)) {
      created += Number(insert.run(userId, item.id, kind, item.expiry_date).changes);
    }
  }
  return created;
}

export function createApp(db, { today = todayISO } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const getItem = (userId, id) =>
    db.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?').get(Number(id), userId);

  // ---------- Auth ----------
  app.post('/api/auth/register', (req, res) => {
    const name = String(req.body.name ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const language = ['en', 'he'].includes(req.body.language) ? req.body.language : 'en';
    if (!name) return res.status(400).json({ error: 'invalid_name' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' });
    if (password.length < 8) return res.status(400).json({ error: 'weak_password' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return res.status(409).json({ error: 'email_taken' });
    }
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (email, name, password_hash, language) VALUES (?, ?, ?, ?)')
      .run(email, name, hashPassword(password), language);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(String(req.body.password ?? ''), user.password_hash)) {
      return res.status(401).json({ error: 'wrong_credentials' });
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  });

  app.use('/api', requireAuth);

  // ---------- Profile & settings ----------
  app.get('/api/me', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    res.json({ user: publicUser(user) });
  });

  app.patch('/api/me', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    const name = req.body.name !== undefined ? String(req.body.name).trim() : user.name;
    if (!name) return res.status(400).json({ error: 'invalid_name' });
    const notif = req.body.notifications_enabled !== undefined ? (req.body.notifications_enabled ? 1 : 0) : user.notifications_enabled;
    const language = ['en', 'he'].includes(req.body.language) ? req.body.language : user.language;
    db.prepare('UPDATE users SET name = ?, notifications_enabled = ?, language = ? WHERE id = ?').run(
      name, notif, language, req.userId
    );
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)) });
  });

  // ---------- Inventory ----------
  app.get('/api/items', (req, res) => {
    const t = today();
    if (req.query.view === 'history') {
      const rows = db
        .prepare('SELECT * FROM items WHERE user_id = ? AND removed_at IS NOT NULL ORDER BY removed_at DESC LIMIT 200')
        .all(req.userId);
      return res.json({ items: rows.map((i) => withStatus(i, t)) });
    }
    const rows = db
      .prepare(
        `SELECT * FROM items WHERE user_id = ? AND removed_at IS NULL
         ORDER BY expiry_date IS NULL, expiry_date ASC, name COLLATE NOCASE`
      )
      .all(req.userId);
    res.json({ items: rows.map((i) => withStatus(i, t)) });
  });

  app.get('/api/items/:id', (req, res) => {
    const item = getItem(req.userId, req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    res.json({ item: withStatus(item, today()) });
  });

  app.post('/api/items', (req, res) => {
    const { value, error } = validateItem(req.body);
    if (error) return res.status(400).json({ error });
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO items (user_id, name, quantity, unit, price, expiry_date, expiry_type, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')`
      )
      .run(req.userId, value.name, value.quantity, value.unit, value.price, value.expiry_date, value.expiry_type);
    res.status(201).json({ item: withStatus(getItem(req.userId, lastInsertRowid), today()) });
  });

  // Update details / quantity. `checked: true` records that the user checked the remaining quantity.
  app.patch('/api/items/:id', (req, res) => {
    const item = getItem(req.userId, req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    if (item.removed_at) return res.status(409).json({ error: 'item_removed' });
    const { value, error } = validateItem(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    const next = { ...item, ...value };
    const checkedAt = req.body.checked ? now() : item.last_checked_at;
    db.prepare(
      `UPDATE items SET name = ?, quantity = ?, unit = ?, price = ?, expiry_date = ?, expiry_type = ?,
         last_checked_at = ?, updated_at = ? WHERE id = ?`
    ).run(next.name, next.quantity, next.unit, next.price, next.expiry_date, next.expiry_type, checkedAt, now(), item.id);
    if (req.body.checked) {
      // The "check the remaining quantity" alert has been handled.
      db.prepare(`UPDATE notifications SET read_at = ? WHERE item_id = ? AND kind = 'three_days' AND read_at IS NULL`).run(now(), item.id);
    }
    res.json({ item: withStatus(getItem(req.userId, item.id), today()) });
  });

  // Product finished: mark as consumed or thrown away. The reason is optional (spec section 6).
  app.post('/api/items/:id/remove', (req, res) => {
    const item = getItem(req.userId, req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    if (item.removed_at) return res.status(409).json({ error: 'item_removed' });
    const type = req.body.type;
    if (!['consumed', 'thrown'].includes(type)) return res.status(400).json({ error: 'invalid_removal_type' });
    const reason = req.body.reason ? String(req.body.reason).trim().slice(0, 200) : null;
    db.prepare('UPDATE items SET removed_at = ?, removal_type = ?, removal_reason = ?, updated_at = ? WHERE id = ?').run(
      now(), type, reason, now(), item.id
    );
    db.prepare('UPDATE notifications SET read_at = ? WHERE item_id = ? AND read_at IS NULL').run(now(), item.id);
    res.json({ item: withStatus(getItem(req.userId, item.id), today()) });
  });

  // Delete an item that was added by mistake (not counted as consumed or thrown).
  app.delete('/api/items/:id', (req, res) => {
    const item = getItem(req.userId, req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
    res.status(204).end();
  });

  // ---------- Receipts ----------
  // Called only after the user reviewed and confirmed the recognised products (spec section 5).
  app.post('/api/receipts', (req, res) => {
    const list = Array.isArray(req.body.items) ? req.body.items : [];
    if (list.length === 0) return res.status(400).json({ error: 'no_items' });
    if (list.length > 100) return res.status(400).json({ error: 'too_many_items' });
    const validated = [];
    for (const raw of list) {
      const { value, error } = validateItem(raw);
      if (error) return res.status(400).json({ error });
      validated.push(value);
    }
    db.exec('BEGIN');
    try {
      const store = req.body.store ? String(req.body.store).slice(0, 120) : null;
      const rawText = req.body.raw_text ? String(req.body.raw_text).slice(0, 20000) : null;
      const { lastInsertRowid: receiptId } = db
        .prepare('INSERT INTO receipts (user_id, store, raw_text, item_count) VALUES (?, ?, ?, ?)')
        .run(req.userId, store, rawText, validated.length);
      const insert = db.prepare(
        `INSERT INTO items (user_id, receipt_id, name, quantity, unit, price, expiry_date, expiry_type, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'receipt')`
      );
      for (const v of validated) {
        insert.run(req.userId, receiptId, v.name, v.quantity, v.unit, v.price, v.expiry_date, v.expiry_type);
      }
      db.exec('COMMIT');
      res.status(201).json({ receipt_id: Number(receiptId), added: validated.length });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });

  // ---------- Dashboard ----------
  app.get('/api/dashboard', (req, res) => {
    const t = today();
    generateAlerts(db, req.userId, t);
    const items = db
      .prepare(
        `SELECT * FROM items WHERE user_id = ? AND removed_at IS NULL
         ORDER BY expiry_date IS NULL, expiry_date ASC, name COLLATE NOCASE`
      )
      .all(req.userId)
      .map((i) => withStatus(i, t));
    const count = (s) => items.filter((i) => i.status === s).length;
    const unread = db
      .prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL')
      .get(req.userId).n;
    res.json({
      counts: {
        total: items.length,
        expiring: count('expiring'),
        needs_check: count('needs_check'),
        no_date: count('no_date'),
      },
      attention: items.filter((i) => i.status === 'needs_check' || i.status === 'expiring'),
      no_date: items.filter((i) => i.status === 'no_date').slice(0, 5),
      inventory: items.slice(0, 8),
      unread_notifications: unread,
    });
  });

  // ---------- Notifications ----------
  app.get('/api/notifications', (req, res) => {
    const t = today();
    generateAlerts(db, req.userId, t);
    const rows = db
      .prepare(
        `SELECT n.id, n.kind, n.expiry_date, n.read_at, n.created_at, n.item_id,
                i.name AS item_name, i.expiry_type, i.removed_at
         FROM notifications n JOIN items i ON i.id = n.item_id
         WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 100`
      )
      .all(req.userId);
    res.json({ notifications: rows, unread: rows.filter((r) => !r.read_at).length });
  });

  app.post('/api/notifications/read', (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : null;
    if (ids && ids.length) {
      const stmt = db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL');
      for (const id of ids) stmt.run(now(), id, req.userId);
    } else {
      db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(now(), req.userId);
    }
    res.json({ ok: true });
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  });

  return app;
}
