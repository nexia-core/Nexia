// ══════════════════════════════════════════════════
// TEMEL UTILS
// ══════════════════════════════════════════════════

/** DOM seçici kısayolu */
const q = s => document.querySelector(s);

/** HTML escape */
function esc(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Metni HTML'e çevir (newline → <br>) */
function t2h(s) {
  return esc(s).replace(/\n/g, '<br>');
}

/** Tarihi HH:MM formatına çevir */
function ft(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  return x.getHours().toString().padStart(2, '0') + ':' + x.getMinutes().toString().padStart(2, '0');
}

/** Elementi en alta kaydır */
function sbot(id) {
  const e = document.getElementById(id);
  if (e) e.scrollTop = e.scrollHeight;
}

/** Sistem mesajı elementi oluştur */
function mkS(t) {
  const d = document.createElement('div');
  d.className = 'sys';
  d.textContent = t;
  return d;
}

/** Toast bildirimi göster: tp = 's' (success) | 'e' (error) | 'w' (warning) */
function toast(m, tp = 's') {
  const t = q('#toast');
  t.textContent = m;
  t.className = 'toast sh ' + tp;
  setTimeout(() => t.className = 'toast', 3000);
}

/** Modal aç */
function om(id) { q('#' + id).classList.add('op'); }

/** Modal kapat */
function cm(id) { q('#' + id).classList.remove('op'); }

/** Textarea yüksekliğini içeriğe göre ayarla */
function autoResize(el) {
  el.style.height = '42px';
  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
}

/** Kullanıcı adına göre avatar renk sınıfı döndür */
function avColor(name, isAnonMsg) {
  if (isAnonMsg) return 'avp';
  const c = ['avb', 'avg', 'avo'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

/** Avatar içeriği döndür (foto varsa img, yoksa baş harf) */
function getInner(name, isAnonMsg) {
  if (isAnonMsg) return '?';
  const p = profiles[name];
  if (p && p.photo) return `<img src="${p.photo}" alt=""/>`;
  return (name[0] || '?').toUpperCase();
}

/** Kullanıcı susturulmuş mu? */
function isMuted(name) {
  const entry = Object.values(codes).find(c => c.name === name);
  return entry && entry.muted;
}

// ══════════════════════════════════════════════════
// TEMA
// ══════════════════════════════════════════════════

function applyTheme(id) {
  currentTheme = id;
  document.documentElement.setAttribute('data-theme', id === 'dark' ? '' : id);
}

function buildThemeGrid() {
  const grid = q('#themeGrid');
  grid.innerHTML = '';
  THEMES.forEach(t => {
    const sw = document.createElement('div');
    sw.className = 'theme-swatch' + (currentTheme === t.id ? ' active' : '');
    sw.style.background = t.bg;
    sw.onclick = () => { applyTheme(t.id); buildThemeGrid(); };
    sw.innerHTML = `
      <div class="theme-dot-row">
        ${t.dots.map(d => `<div class="theme-dot" style="background:${d}"></div>`).join('')}
      </div>
      <div class="theme-name" style="color:${t.ac}">${t.name}</div>`;
    grid.appendChild(sw);
  });
}

// ══════════════════════════════════════════════════
// BİLDİRİMLER
// ══════════════════════════════════════════════════

function addNotif(icon, title, sub, action) {
  notifications.unshift({ id: Date.now(), icon, title, sub, action, read: false, time: new Date() });
  renderNotifBadge();
}

function renderNotifBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = q('#notifBadge');
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function toggleNotifPanel() {
  notifOpen = !notifOpen;
  if (notifOpen) { om('notifPanel'); renderNotifList(); }
  else cm('notifPanel');
}

function renderNotifList() {
  const el = q('#notifList');
  el.innerHTML = '';
  if (!notifications.length) {
    el.innerHTML = '<div class="notif-empty">Henüz bildirim yok.</div>';
    return;
  }
  notifications.forEach(n => {
    const d = document.createElement('div');
    d.className = 'notif-item' + (n.read ? '' : ' unread');
    d.innerHTML = `
      <div class="notif-icon">${n.icon}</div>
      <div class="notif-body">
        <div class="notif-title">${esc(n.title)}</div>
        <div class="notif-sub">${esc(n.sub)}</div>
        <div class="notif-time">${ft(n.time)}</div>
      </div>`;
    d.onclick = () => {
      n.read = true;
      renderNotifBadge();
      renderNotifList();
      if (n.action) n.action();
      cm('notifPanel');
      notifOpen = false;
    };
    el.appendChild(d);
  });
}

function clearNotifs() {
  notifications = [];
  renderNotifBadge();
  renderNotifList();
}

// Bildirim paneli dışına tıklayınca kapat
document.addEventListener('click', e => {
  if (notifOpen && !e.target.closest('#notifPanel') && !e.target.closest('#notifBtn')) {
    cm('notifPanel');
    notifOpen = false;
  }
});

// ══════════════════════════════════════════════════
// PARTİKÜLLER (Lock Screen)
// ══════════════════════════════════════════════════

(function () {
  const c = q('#particles');
  if (!c) return;
  for (let i = 0; i < 35; i++) {
    const s = document.createElement('span');
    const sz = Math.random() * 3 + 1;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;animation-duration:${Math.random() * 12 + 8}s;animation-delay:${Math.random() * 8}s;`;
    c.appendChild(s);
  }
})();