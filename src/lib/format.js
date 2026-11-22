// Display helpers shared by several screens.

export function formatDate(iso, lang) {
  if (!iso) return '—';
  // Dates without a time are YYYY-MM-DD; server timestamps are "YYYY-MM-DD HH:MM:SS" in UTC.
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(`${iso.replace(' ', 'T')}Z`);
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysText(item, t) {
  const d = item.days_left;
  if (d === null || d === undefined) return t('st_no_date');
  if (d > 1) return t('daysLeft', { n: d });
  if (d === 1) return t('oneDayLeft');
  if (d === 0) return t('expiresToday');
  if (d === -1) return t('expiredYesterday');
  return t('expiredDaysAgo', { n: -d });
}

export function qtyText(item, t) {
  const q = Number.isInteger(item.quantity) ? item.quantity : Number(item.quantity).toFixed(2).replace(/\.?0+$/, '');
  return `${q} ${t(`u_${item.unit}`)}`;
}

export function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
