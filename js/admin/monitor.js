// ══════════════════════════════════════════════════
// js/admin/monitor.js — Giriş Monitörü & Oturum
// ══════════════════════════════════════════════════

if (typeof loginHistory    === 'undefined') var loginHistory    = [];
if (typeof activeSessions  === 'undefined') var activeSessions  = {};
if (typeof frozenAccounts  === 'undefined') var frozenAccounts  = new Set();

// ─────────────────────────────────────────────────
// GİRİŞ KAYDI  (auth.js _securityOnLogin'den dolaylı çağrılır)
// ─────────────────────────────────────────────────
function recordLogin(name, code, isAdmin) {
  const entry = {
    id:     'l' + Date.now(),
    name, code, isAdmin,
    time:   new Date(),
    device: navigator.userAgent.substring(0, 80),
  };
  loginHistory.unshift(entry);
  if (loginHistory.length > 100) loginHistory.pop();

  activeSessions[name] = {
    name, loginTime: new Date(), lastActive: new Date(),
    device: entry.device,
  };
}

// ─────────────────────────────────────────────────
// NOT: Oturum zamanlayıcısı auth.js → _sessionStart() içinde
// yönetilir. Burada sadece activeSessions güncellenir.
// ─────────────────────────────────────────────────

// ─────────────────────────────────────────────────
// MONİTÖR RENDER — ANA FONKSİYON
// ─────────────────────────────────────────────────
function rMonitor() {
  rLoginHistory();
  rActiveSessions();
  rFrozenList();
  rReportsList();
  rSecurityFeed();
  renderFreezeRequests('freezeRequestsList');
}

// ─────────────────────────────────────────────────
// GİRİŞ GEÇMİŞİ
// ─────────────────────────────────────────────────
function rLoginHistory() {
  const el = q('#loginHistoryList'); if (!el) return;
  el.innerHTML = '';
  if (!loginHistory.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Henüz giriş kaydı yok.</div>';
    return;
  }
  loginHistory.slice(0, 30).forEach(entry => {
    const d = document.createElement('div'); d.className = 'mon-entry';
    const frozen = frozenAccounts.has(entry.name);
    d.innerHTML = `
      <div class="mon-entry-main">
        <span class="mon-name ${entry.isAdmin ? 'adm' : ''}">${esc(entry.name)}</span>
        <span class="mon-code">${esc(entry.code)}</span>
        <span class="mon-time">${ft(entry.time)} — ${entry.time.toLocaleDateString('tr-TR')}</span>
      </div>
      <div class="mon-entry-device">${esc(entry.device)}</div>
      ${!entry.isAdmin ? `<div class="mon-entry-actions">
        ${frozen
          ? `<button class="ts tg" onclick="unfreezeAccount('${esc(entry.name)}')">❄️ Çöz</button>`
          : `<button class="ts tw" onclick="freezeAccount('${esc(entry.name)}')">🔒 Dondur</button>`}
        <button class="ts td" onclick="forceLogout('${esc(entry.name)}')">⏏ Çıkart</button>
      </div>` : ''}`;
    el.appendChild(d);
  });
}

// ─────────────────────────────────────────────────
// AKTİF OTURUMLAR
// ─────────────────────────────────────────────────
function rActiveSessions() {
  const el = q('#activeSessionsList'); if (!el) return;
  el.innerHTML = '';
  const sessions = Object.values(activeSessions);
  if (!sessions.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Aktif oturum yok.</div>';
    return;
  }
  sessions.forEach(s => {
    const mins = Math.floor((Date.now() - new Date(s.loginTime).getTime()) / 60000);
    const d = document.createElement('div'); d.className = 'mon-session';
    d.innerHTML = `
      <div class="mon-session-dot"></div>
      <div class="mon-session-info">
        <span class="mon-name">${esc(s.name)}</span>
        <span class="mon-time">${mins} dakikadır aktif · Son eylem: ${ft(s.lastActive)}</span>
      </div>
      <button class="ts td" onclick="forceLogout('${esc(s.name)}')">⏏ Çıkart</button>`;
    el.appendChild(d);
  });
}

// ─────────────────────────────────────────────────
// DONDURULMUŞ HESAPLAR
// ─────────────────────────────────────────────────
function rFrozenList() {
  const el = q('#frozenAccountsList'); if (!el) return;
  el.innerHTML = '';
  if (!frozenAccounts.size) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Dondurulmuş hesap yok ✅</div>';
    return;
  }
  frozenAccounts.forEach(name => {
    const d = document.createElement('div'); d.className = 'mon-entry';
    d.innerHTML = `
      <span class="mon-name">❄️ ${esc(name)}</span>
      <button class="ts tg" onclick="unfreezeAccount('${esc(name)}')">Çöz</button>`;
    el.appendChild(d);
  });
}

// ─────────────────────────────────────────────────
// ŞİKAYETLER LİSTESİ (20)
// ─────────────────────────────────────────────────
function rReportsList() {
  const el = q('#reportsList'); if (!el) return;
  el.innerHTML = '';
  if (!reports.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Henüz şikayet yok ✅</div>';
    return;
  }
  reports.slice(0, 30).forEach(r => {
    const d = document.createElement('div'); d.className = 'mon-entry';
    d.innerHTML = `
      <div class="mon-entry-main">
        <span class="mon-name">🚩 ${esc(r.reporter)}</span>
        <span style="font-size:11px;color:var(--dg);background:var(--dg-d);padding:1px 6px;border-radius:3px;">${esc(r.reason)}</span>
        <span class="mon-time">${ft(r.time)}</span>
      </div>
      <div class="mon-entry-device">
        <b>Şikayet edilen:</b> ${esc(r.msgAuthor)} — "${esc(r.msgText ? r.msgText.substring(0, 60) : '')}${r.msgText && r.msgText.length > 60 ? '…' : ''}"
        ${r.note ? `<br><b>Not:</b> ${esc(r.note)}` : ''}
      </div>
      <div class="mon-entry-actions">
        ${r.reviewed ? '<span style="color:var(--gn);font-size:12px;">✓ İncelendi</span>' : `<button class="ts tg" onclick="markReportReviewed('${r.id}')">✓ İncele</button>`}
        <button class="ts" style="background:var(--ac-d);color:var(--ac);" onclick="navigateToReport('${r.id}')">🔍 Mesaja Git</button>
        <button class="ts td" onclick="deleteReport('${r.id}')">🗑 Sil</button>
      </div>`;
    el.appendChild(d);
  });
}

function markReportReviewed(id) {
  const r = reports.find(x => x.id === id); if (!r) return;
  r.reviewed = true; rReportsList(); toast('Şikayet incelendi ✅', 's');
}

function deleteReport(id) {
  const idx = reports.findIndex(x => x.id === id);
  if (idx >= 0) { reports.splice(idx, 1); rReportsList(); toast('Şikayet silindi', 's'); }
}

function navigateToReport(id) {
  const r = reports.find(x => x.id === id); if (!r) return;
  // Paneli kapat, ilgili konuşmaya git
  if (r.msgContext === 'dm' && r.msgContextId) {
    sw('d'); if (typeof openC === 'function') openC(r.msgContextId);
  } else if (r.msgContext === 'channel' && r.msgContextId) {
    sw('ch'); if (typeof openChannel === 'function') openChannel(r.msgContextId);
  } else {
    sw('g'); // global chat
  }
  // Mesajı highlight et
  setTimeout(() => {
    const el = document.querySelector(`[data-msg-id="${r.msgId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--ac)';
      el.style.borderRadius = '8px';
      setTimeout(() => { el.style.outline = ''; }, 3000);
    }
  }, 400);
  r.reviewed = true; rReportsList();
}

// ─────────────────────────────────────────────────
// GÜVENLİK OLAYI AKIŞI (26)
// ─────────────────────────────────────────────────
function rSecurityFeed() {
  const el = q('#securityFeedList'); if (!el) return;
  el.innerHTML = '';
  if (!securityEvents.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Güvenlik olayı yok ✅</div>';
    return;
  }
  securityEvents.slice(0, 20).forEach(ev => {
    const d = document.createElement('div'); d.className = 'mon-entry';
    d.innerHTML = `
      <div class="mon-entry-main">
        <span style="font-size:18px;">${ev.icon}</span>
        <span class="mon-name">${esc(ev.title)}</span>
        <span class="mon-time">${ft(ev.time)}</span>
      </div>
      <div class="mon-entry-device">${esc(ev.detail)}</div>`;
    el.appendChild(d);
  });
}

// ─────────────────────────────────────────────────
// HESAP DONDURMA
// ─────────────────────────────────────────────────
function freezeAccount(name) {
  frozenAccounts.add(name);
  const entry = Object.values(codes).find(c => c.name === name);
  if (entry) entry.banned = true;
  securityEvents.unshift({ id: 'se_' + Date.now(), icon: '❄️', title: 'Hesap Donduruldu', detail: name + ' — Admin tarafından', time: new Date() });
  toast(name + ' hesabı donduruldu ❄️', 'w');
  rMonitor(); rUT();
}

function unfreezeAccount(name) {
  frozenAccounts.delete(name);
  const entry = Object.values(codes).find(c => c.name === name);
  if (entry) entry.banned = false;
  toast(name + ' hesabı çözüldü ✅', 's');
  rMonitor(); rUT();
}

// ─────────────────────────────────────────────────
// ZORLA ÇIKIŞ
// ─────────────────────────────────────────────────
function forceLogout(name) {
  delete activeSessions[name];
  if (me && me.name === name) {
    toast('Oturumunuz yönetici tarafından sonlandırıldı.', 'e');
    setTimeout(() => location.reload(), 2000);
  }
  toast(name + ' oturumu sonlandırıldı', 'w');
  securityEvents.unshift({ id: 'se_' + Date.now(), icon: '⏏', title: 'Zorla Çıkış', detail: name, time: new Date() });
  rMonitor();
}

// ─────────────────────────────────────────────────
// ŞÜPHELI MESAJLAR
// ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────
// KİLİT İSTEKLERİ
// ─────────────────────────────────────────────────
function renderFreezeRequests(listId) {
  const el = q('#' + listId); if (!el) return;
  el.innerHTML = '';
  const pending = freezeRequests.filter(r => r.status === 'pending');
  if (!pending.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Bekleyen kilit isteği yok ✅</div>';
    return;
  }
  pending.forEach(req => {
    const d = document.createElement('div'); d.className = 'mon-entry';
    d.innerHTML = `
      <div class="mon-entry-main">
        <span class="mon-name">🔒 ${esc(req.name)}</span>
        <span class="mon-time">${ft(req.time)}</span>
      </div>
      <div class="mon-entry-device">${esc(req.reason || '')}</div>
      <div class="mon-entry-actions">
        <button class="ts tg" onclick="approveFreezeReq('${esc(req.name)}','${listId}')">❄️ Onayla</button>
        <button class="ts td" onclick="rejectFreezeReq('${esc(req.name)}','${listId}')">✕ Reddet</button>
      </div>`;
    el.appendChild(d);
  });
}

function approveFreezeReq(name, listId) {
  const r = freezeRequests.find(x => x.name === name);
  if (r) r.status = 'approved';
  freezeAccount(name);
  renderFreezeRequests(listId);
}

function rejectFreezeReq(name, listId) {
  const r = freezeRequests.find(x => x.name === name);
  if (r) r.status = 'rejected';
  toast(name + ' isteği reddedildi', 'w');
  renderFreezeRequests(listId);
}

function rSuspiciousMessages() {
  const el = q('#suspiciousMsgList'); if (!el) return;
  el.innerHTML = '';
  const sus = mld.filter(m => BAD.some(k => m.text.toLowerCase().includes(k)));
  if (!sus.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Şüpheli mesaj tespit edilmedi ✅</div>';
    return;
  }
  sus.slice(0, 20).forEach(m => {
    const d = document.createElement('div'); d.className = 'mon-entry';
    d.innerHTML = `
      <div class="mon-entry-main">
        <span class="mon-name ${m.isAnon ? 'an' : ''}">${esc(m.who)}</span>
        ${m.isAnon ? `<span class="mon-code">(${esc(m.real)})</span>` : ''}
        <span class="mon-time">${ft(m.time)}</span>
        <span class="flag">⚠ Şüpheli</span>
      </div>
      <div class="mon-entry-device">${esc(m.text)}</div>`;
    el.appendChild(d);
  });
}