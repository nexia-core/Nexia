// ══════════════════════════════════════════════════
// js/admin/panel.js — Admin Paneli
// ══════════════════════════════════════════════════

/** Admin panelini yenile (tüm bölümler) */
function rA() { rIbx(); rUT(); rSpy(); rAL(); rOG(); rML(); rStats(); }

// ──────────────────────────────────────────────────
// BÖLÜM NAVİGASYONU
// ──────────────────────────────────────────────────
function openAdminSection(sec) {
  document.querySelectorAll('.admin-nav-card').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.admin-sub-view').forEach(v => v.style.display = 'none');
  document.querySelector('.jarvis-card') && (document.querySelector('.jarvis-card').style.display = 'none');
  const el = document.getElementById('adminSec-' + sec);
  if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.gap = '16px'; }
  document.querySelector('.adml').scrollTop = 0;
}

function backToAdminMain() {
  document.querySelectorAll('.admin-sub-view').forEach(v => v.style.display = 'none');
  document.querySelectorAll('.admin-nav-card').forEach(c => c.style.display = 'flex');
  const jc = document.querySelector('.jarvis-card');
  if (jc) jc.style.display = '';
  document.querySelector('.adml').scrollTop = 0;
}

// ──────────────────────────────────────────────────
// DUYURU YAYINLA
// ──────────────────────────────────────────────────

function sann() {
  const txt = q('#annTxt').value.trim();
  if (!txt) { toast('Duyuru metni boş olamaz', 'w'); return; }
  gm.push({ id: Date.now(), type: 'ann', text: txt, time: new Date() });
  q('#annTxt').value = '';
  rG();
  toast('Duyuru yayınlandı! 📢', 's');
  addNotif('📢', 'Yeni Duyuru', txt.substring(0, 60), () => sw('g'));
}

// ──────────────────────────────────────────────────
// GELEN KUTUSU
// ──────────────────────────────────────────────────
function rIbx() {
  const el = q('#ibx'); if (!el) return; el.innerHTML = '';
  const unr = inbox.filter(m => !m.read).length;
  const ibCnt = q('#ibCnt'); if (ibCnt) ibCnt.textContent = inbox.length + ' mesaj' + (unr ? ' · ' + unr + ' okunmadı' : '');
  if (!inbox.length) { el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Henüz mesaj yok.</div>'; return; }
  [...inbox].reverse().forEach(m => {
    m.read = true;
    const realId = m.isAnon ? (aReg[m.from] || m.fromReal || '?') : m.fromReal;
    const anonBadge = m.isAnon ? `<span class="ib-anon-badge">anonim</span><span class="ib-real">👁 ${esc(realId)}</span>` : '';
    const d = document.createElement('div'); d.className = 'ib-item';
    d.innerHTML = `<div class="ib-h"><span class="ib-from">${esc(m.from)}</span>${anonBadge}<span class="ib-t">${ft(m.time)}</span></div>
    <div class="ib-msg">${esc(m.text)}</div>
    ${m.reply ? `<div class="ib-rep">↩ Yanıtın: ${esc(m.reply)}</div>` : ''}
    <div class="ib-ri"><input placeholder="Yanıt yaz..." id="ir-${m.id}"/><button class="ts tb2" onclick="repI('${m.id}')">Yanıtla</button></div>`;
    el.appendChild(d);
  });
}

function repI(mid) {
  const inp = document.getElementById('ir-' + mid); if (!inp) return;
  const txt = inp.value.trim(); if (!txt) return;
  const m = inbox.find(x => x.id === mid); if (!m) return;
  m.reply = txt; inp.value = ''; rIbx(); rMyW();
  toast('Yanıt gönderildi', 's');
  addNotif('↩', 'Admin Yanıtladı', txt.substring(0, 60), () => sw('w'));
}

// ──────────────────────────────────────────────────
// KULLANICI TABLOSU
// ──────────────────────────────────────────────────
function rUT() {
  const tb = q('#utbody'); if (!tb) return; tb.innerHTML = '';
  Object.entries(codes).forEach(([code, info]) => {
    const tr = document.createElement('tr');
    let status = '';
    if (info.banned) status = '<span class="sban">⛔ Engelli</span>';
    else if (info.muted) status = '<span class="smute">🔇 Susturulmuş</span>';
    else status = `<span class="sok">${esc(info.name)}</span>`;
    tr.innerHTML = `<td><span class="uname-link" onclick="openUserDetail('${esc(info.name)}')">${esc(info.name)}<span class="uname-link-icon">🔍</span></span></td>
    <td><span class="cv">${esc(code)}</span></td><td>${status}</td>
    <td style="display:flex;gap:4px;flex-wrap:wrap;">
      <button class="ts tw" onclick="oPw('${code}')">🔑 Şifre</button>
      ${info.banned ? `<button class="ts tg" onclick="ub('${code}')">✓ Engel Kaldır</button>` : `<button class="ts td" onclick="bn('${code}')">⛔ Engelle</button>`}
      ${info.muted ? `<button class="ts tg" onclick="unmuteUser('${esc(info.name)}')">🔊 Sesi Aç</button>` : `<button class="ts tw" onclick="muteUser('${esc(info.name)}')">🔇 Sustur</button>`}
    </td>`;
    tb.appendChild(tr);
  });
}

function bn(code) { codes[code].banned = true; if (typeof fbSaveSingleCode === 'function') fbSaveSingleCode(code, codes[code]); toast(codes[code].name + ' engellendi', 'e'); rUT(); }
function ub(code) { codes[code].banned = false; if (typeof fbSaveSingleCode === 'function') fbSaveSingleCode(code, codes[code]); toast('Engel kaldırıldı', 's'); rUT(); }
function oPw(code) { pwT = code; q('#pwDesc').textContent = codes[code].name + ' için yeni kod belirle.'; q('#pwNew').value = ''; om('mdlPw'); }
function doPw() {
  const nc = q('#pwNew').value.trim().toUpperCase();
  if (!nc || nc.length < 3) { toast('En az 3 karakter', 'w'); return; }
  if (codes[nc]) { toast('Bu kod zaten var', 'w'); return; }
  codes[nc] = { ...codes[pwT] };
  if (typeof fbSaveSingleCode === 'function') fbSaveSingleCode(nc, codes[nc]);
  if (typeof fbDeleteCode     === 'function') fbDeleteCode(pwT);
  delete codes[pwT]; pwT = null;
  cm('mdlPw'); rUT(); toast('Kod değiştirildi: ' + nc, 's');
}

function addC() {
  const inp = q('#ncInp'), code = inp.value.trim().toUpperCase();
  if (!code || code.length < 3) { toast('En az 3 karakter', 'w'); return; }
  if (codes[code]) { toast('Bu kod zaten var', 'w'); return; }
  const name = prompt('Bu koda atanacak öğrenci adı:', '');
  if (!name || !name.trim()) { toast('İsim gerekli', 'w'); return; }
  codes[code] = { name: name.trim(), banned: false, firstLogin: true, muted: false };
  if (typeof fbSaveSingleCode === 'function') fbSaveSingleCode(code, codes[code]);
  inp.value = ''; rUT(); toast('Kod eklendi: ' + code, 's');
}

// ──────────────────────────────────────────────────
// SPY (Sohbet İzleme)
// ──────────────────────────────────────────────────
function rSpy() {
  const el = q('#spyP'); if (!el) return; el.innerHTML = '';
  const all = Object.values(convs);
  if (!all.length) { el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Henüz sohbet yok.</div>'; return; }
  all.forEach(c => {
    const d = document.createElement('div'); d.className = 'spy-c';
    const label = c.isGroup ? '👥 ' + c.name : (c.fromReal + ' ↔ ' + c.toReal);
    d.innerHTML = `<div class="spy-h" onclick="togSpy(this,'${c.id}')">
      <div class="spy-p">${esc(label)}</div>
      <span class="spy-cnt">${c.msgs.filter(m => !m.isSys).length} mesaj</span>
      <span class="spy-st ${c.status}">${c.status === 'active' ? 'Aktif' : 'Bekliyor'}</span>
      <span style="color:var(--t3);font-size:16px;margin-left:7px;transition:transform .2s" class="sarr">›</span>
    </div><div class="spy-bd" id="sb-${c.id}"></div>`;
    el.appendChild(d);
  });
}

function togSpy(h, id) {
  const arr = h.querySelector('.sarr'), bd = document.getElementById('sb-' + id);
  const op = bd.classList.toggle('op');
  arr.style.transform = op ? 'rotate(90deg)' : '';
  if (!op || bd.childNodes.length) return;
  const c = convs[id]; bd.innerHTML = '';
  const msgs = c.msgs.filter(m => !m.isSys);
  if (!msgs.length) { bd.innerHTML = '<div style="color:var(--t3);font-size:12px;">Mesaj yok.</div>'; return; }
  msgs.forEach(m => {
    const r = m.isAnon ? (aReg[m.from] || m.fromReal) : m.fromReal;
    const d = document.createElement('div'); d.className = 'spy-m';
    d.innerHTML = `<span class="spy-w ${m.isAnon ? 'an' : ''}">${esc(m.from)}${m.isAnon ? ' (' + esc(r) + ')' : ''}</span><span class="spy-tx">${esc(m.text || '[medya]')}</span><span class="spy-t">${ft(m.time)}</span>`;
    bd.appendChild(d);
  });
}

// ──────────────────────────────────────────────────
// ANONİM LİSTE
// ──────────────────────────────────────────────────
function rAL() {
  const el = q('#anoL'); if (!el) return; el.innerHTML = '';
  const e = Object.entries(aReg);
  if (!e.length) { el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Henüz anonim mesaj yok.</div>'; return; }
  e.forEach(([aid, real]) => {
    const cnt = [...gm, ...Object.values(convs).flatMap(c => c.msgs)].filter(m => (m.name || m.from) === aid).length;
    const d = document.createElement('div'); d.className = 'ali';
    d.innerHTML = `<span class="ali-id">${esc(aid)}</span><span style="color:var(--t3)">→</span><span class="ali-r">${esc(real)}</span><span class="ali-c">${cnt} mesaj</span>`;
    el.appendChild(d);
  });
}

// ──────────────────────────────────────────────────
// ONLİNE KULLANICILAR
// ──────────────────────────────────────────────────
function rOG() {
  const el = q('#og'); if (!el) return; el.innerHTML = '';
  Object.keys(onl).forEach(n => {
    const d = document.createElement('div'); d.className = 'op2';
    d.innerHTML = `<div class="odot"></div>${esc(n)}`;
    el.appendChild(d);
  });
  if (!Object.keys(onl).length) el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Aktif kullanıcı yok.</div>';
}

// ──────────────────────────────────────────────────
// MESAJ LOGU
// ──────────────────────────────────────────────────
function rML() {
  const el = q('#mlog'); if (!el) return; el.innerHTML = '';
  [...mld].reverse().slice(0, 40).forEach(m => {
    const f = BAD.some(k => m.text.toLowerCase().includes(k));
    const d = document.createElement('div'); d.className = 'mli';
    d.innerHTML = `<span class="mli-w ${m.isAnon ? 'an' : ''}">${esc(m.who)}</span>${m.isAnon ? `<span style="font-size:10px;color:var(--t3);">(${esc(m.real)})</span>` : ''}<span class="mli-m">${esc(m.text)}</span><span class="mli-t">${ft(m.time)}</span>${f ? '<span class="flag">⚠ Şüpheli</span>' : ''}`;
    el.appendChild(d);
  });
}

// ──────────────────────────────────────────────────
// KULLANICI DETAYI
// ──────────────────────────────────────────────────
function openUserDetail(name) {
  const p = profiles[name] || {};
  const avc = avColor(name, false);
  const inner = p.photo ? `<img src="${p.photo}" alt=""/>` : name[0]?.toUpperCase() || '?';
  const _aupHav = q('#aupHav'); if (_aupHav) { _aupHav.className = 'aup-hav ' + avc; _aupHav.innerHTML = inner; }
  const _aupHTitle = q('#aupHTitle'); if (_aupHTitle) _aupHTitle.textContent = name;
  const cEntry = Object.entries(codes).find(([, v]) => v.name === name);
  const code = cEntry ? cEntry[0] : '—', banned = cEntry ? cEntry[1].banned : false, muted = cEntry ? cEntry[1].muted : false;
  q('#aupHSub').textContent = banned ? '⛔ Engelli' : muted ? '🔇 Susturulmuş' : 'Aktif kullanıcı';

  const body = q('#aupBody'); if (!body) return; body.innerHTML = '';

  // Temel bilgiler
  const s1 = document.createElement('div'); s1.innerHTML = `<div class="aup-sec-label">Temel Bilgiler</div>`;
  const grid = document.createElement('div'); grid.className = 'aup-grid';
  [['Kod', code], ['Durum', banned ? '⛔ Engelli' : muted ? '🔇 Susturulmuş' : '✅ Aktif'], ['Aktiflik', (p.actStatus === 'hidden' ? '⚫ Gizli' : '🟢 Aktif')], ['Sınıf', p.cls || '—'], ['Yaş', p.age || '—'], ['Cinsiyet', p.gender || '—']].forEach(([l, v]) => {
    const cell = document.createElement('div'); cell.className = 'aup-cell';
    cell.innerHTML = `<div class="aup-cell-lbl">${l}</div><div class="aup-cell-val">${esc(String(v))}</div>`;
    grid.appendChild(cell);
  });
  s1.appendChild(grid);
  if (p.bio) { const bd = document.createElement('div'); bd.style.marginTop = '8px'; bd.innerHTML = `<div class="aup-sec-label" style="margin-bottom:5px;">Biyografi</div><div class="aup-bio-box">${esc(p.bio)}</div>`; s1.appendChild(bd); }
  body.appendChild(s1);

  // Anonim kimlikler
  const anonIds = Object.entries(aReg).filter(([, rn]) => rn === name).map(([aid]) => aid);
  if (anonIds.length) {
    const s2 = document.createElement('div'); s2.innerHTML = `<div class="aup-sec-label" style="margin-top:14px;">Anonim Kimlikleri (${anonIds.length})</div>`;
    const list = document.createElement('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:5px;';
    anonIds.forEach(aid => {
      const cnt = [...gm, ...Object.values(convs).flatMap(c => c.msgs)].filter(m => (m.name || m.from) === aid).length;
      const item = document.createElement('div'); item.className = 'aup-anon-item';
      item.innerHTML = `<span class="aup-anon-id">${esc(aid)}</span><span style="font-size:12px;color:var(--t2);">anonim kimlik</span><span class="aup-anon-cnt">${cnt} mesaj</span>`;
      list.appendChild(item);
    });
    s2.appendChild(list); body.appendChild(s2);
  }

  // Sohbetler
  const userConvs = Object.values(convs).filter(c => c.isGroup ? c.members?.includes(name) : (c.fromReal === name || c.toReal === name));
  if (userConvs.length) {
    const s3 = document.createElement('div'); s3.innerHTML = `<div class="aup-sec-label" style="margin-top:14px;">Sohbetler (${userConvs.length})</div>`;
    userConvs.forEach(c => {
      const peer = c.isGroup ? c.name : (c.fromReal === name ? c.toReal : c.fromReal);
      const convEl = document.createElement('div'); convEl.className = 'aup-conv'; convEl.style.marginBottom = '6px';
      const headEl = document.createElement('div'); headEl.className = 'aup-conv-head';
      headEl.innerHTML = `<div class="aup-conv-peer">${c.isGroup ? '👥 ' + esc(c.name) : esc(name) + ' ↔ ' + esc(peer)}</div><span class="aup-conv-cnt">${c.msgs.filter(m => !m.isSys).length} mesaj</span><span class="aup-conv-badge ${c.status}">${c.status === 'active' ? 'Aktif' : 'Bekliyor'}</span><span class="aup-conv-arrow">›</span>`;
      const msgsEl = document.createElement('div'); msgsEl.className = 'aup-conv-msgs';
      headEl.onclick = () => {
        const open = msgsEl.classList.toggle('op');
        headEl.querySelector('.aup-conv-arrow').style.transform = open ? 'rotate(90deg)' : '';
        if (!open || msgsEl.childNodes.length) return;
        const msgs = c.msgs.filter(m => !m.isSys);
        if (!msgs.length) { msgsEl.innerHTML = '<div style="color:var(--t3);font-size:12px;">Mesaj yok.</div>'; return; }
        msgs.forEach(m => {
          const row = document.createElement('div'); row.className = 'aup-msg-row';
          const realSender = m.isAnon ? (aReg[m.from] || m.fromReal) : m.fromReal;
          row.innerHTML = `<span class="aup-msg-who ${m.isAnon ? 'an' : ''}">${esc(m.from)}${m.isAnon ? ` <span style="color:var(--t3);font-size:10px;">(${esc(realSender)})</span>` : ''}</span><span class="aup-msg-txt">${esc(m.recalled ? '[geri alındı]' : (m.text || '[medya]'))}</span><span class="aup-msg-t">${ft(m.time)}</span>`;
          msgsEl.appendChild(row);
        });
      };
      convEl.appendChild(headEl); convEl.appendChild(msgsEl); s3.appendChild(convEl);
    });
    body.appendChild(s3);
  }

  // NEXUS Sohbet Kayıtları
  if (typeof getNexusLogs === 'function') {
    var nxLogs = getNexusLogs(name);
    if (nxLogs.length) {
      var s4 = document.createElement('div');
      s4.innerHTML = '<div class="aup-sec-label" style="margin-top:14px;">⚡ NEXUS Sohbetleri (' + nxLogs.length + ')</div>';
      var nxBox = document.createElement('div');
      nxBox.className = 'aup-nx-box';
      nxLogs.forEach(function(log) {
        var modeLabel = log.m === 'pro' ? '💎' : (log.m === 'think' ? '🧠' : '⚡');
        var timeStr = '';
        try { var d = new Date(log.t); timeStr = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}); } catch(e) {}
        var row = document.createElement('div');
        row.className = 'aup-nx-row';
        row.innerHTML = '<div class="aup-nx-meta"><span class="aup-nx-mode">' + modeLabel + '</span><span class="aup-nx-time">' + esc(timeStr) + '</span></div>'
          + '<div class="aup-nx-user"><span class="aup-nx-who">👤 ' + esc(name) + '</span>' + esc(log.u) + '</div>'
          + '<div class="aup-nx-bot"><span class="aup-nx-who">⚡ NEXUS</span>' + esc(log.b).substring(0, 300) + (log.b.length > 300 ? '...' : '') + '</div>';
        nxBox.appendChild(row);
      });
      s4.appendChild(nxBox);
      body.appendChild(s4);
    }
  }

  om('aupOverlay'); q('#aupOverlay').onclick = e => { if (e.target === q('#aupOverlay')) cm('aupOverlay'); };
}


// ══════════════════════════════════════════════════
// GOOGLE KULLANICI YÖNETİMİ
// ══════════════════════════════════════════════════

let _googleUsers = [];

function initAdminGoogleUsers() {
  if (typeof fbListenAllUsers !== 'function') return;
  fbListenAllUsers(users => {
    _googleUsers = users;
    rPendingUsers();
    rGoogleUsers();
    rPendingDeletions();
  });
}

function rPendingDeletions() {
  const el  = q('#pendingDeletionList'); if (!el) return;
  const cnt = q('#pendingDeletionCnt');
  const list = _googleUsers.filter(u => u.deletionPending);
  if (cnt) cnt.textContent = list.length + ' kişi';
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Silinme talebi yok ✅</div>';
    return;
  }
  el.innerHTML = '';
  list.forEach(u => {
    const reqAt  = u.deletionRequestedAt ? new Date(u.deletionRequestedAt) : null;
    const daysLeft = reqAt ? Math.max(0, 7 - Math.floor((Date.now() - reqAt.getTime()) / 86400000)) : 7;
    const dateStr  = reqAt ? reqAt.toLocaleDateString('tr-TR') : '?';
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd);flex-wrap:wrap;';
    d.innerHTML = `
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:14px;">${esc(u.nickname || u.email)}</div>
        <div style="font-size:12px;color:var(--t3);margin-top:2px;">Neden: ${esc(u.deletionReason || 'Belirtilmedi')} · Talep: ${dateStr} · <strong style="color:var(--dg)">${daysLeft} gün kaldı</strong></div>
      </div>
      <button onclick="adminCancelDeletion('${u.uid}')" style="padding:5px 10px;border-radius:7px;border:1px solid var(--gn);background:transparent;color:var(--gn);font-size:12px;cursor:pointer;">İptal Et</button>
      <button onclick="adminExecuteDeletion('${u.uid}')" style="padding:5px 10px;border-radius:7px;border:none;background:var(--dg);color:#fff;font-size:12px;cursor:pointer;">Sil</button>`;
    el.appendChild(d);
  });
}

async function adminCancelDeletion(uid) {
  if (!confirm('Bu kullanıcının silme talebini iptal etmek istediğine emin misin?')) return;
  if (typeof fbCancelDeletion === 'function') await fbCancelDeletion(uid);
}

async function adminExecuteDeletion(uid) {
  if (!confirm('Bu hesabı KALICI olarak silmek istediğine emin misin? Bu işlem geri alınamaz!')) return;
  if (typeof fbDeleteUserDoc === 'function') await fbDeleteUserDoc(uid);
}

function rPendingUsers() {
  const el  = q('#pendingUsersList'); if (!el) return;
  const cnt = q('#pendingCnt');
  const pending = _googleUsers.filter(u => u.status === 'pending');
  if (cnt) cnt.textContent = pending.length + ' kişi';
  if (!pending.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Bekleyen üye yok ✅</div>';
    return;
  }
  el.innerHTML = '';
  pending.forEach(u => {
    const d = document.createElement('div'); d.className = 'mli'; d.style.cssText = 'gap:8px;flex-wrap:wrap;align-items:center;';
    const schoolBadge = u.school === 'Erkek İHL'
      ? '<span class="school-badge erkek">Erkek İHL</span>'
      : '<span class="school-badge kiz">Kız İHL</span>';
    d.innerHTML = `
      ${u.photoURL ? `<img src="${esc(u.photoURL)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" referrerpolicy="no-referrer"/>` : '<div style="width:32px;height:32px;border-radius:50%;background:var(--sf3);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">?</div>'}
      <span class="mli-w">${esc(u.nickname || '?')}</span>
      ${schoolBadge}
      <span style="font-size:11px;color:var(--t3);">${esc(u.email || '')}</span>
      <span style="margin-left:auto;display:flex;gap:6px;">
        <button class="ts tg" onclick="adminApproveUser('${esc(u.uid)}')">✓ Onayla</button>
        <button class="ts td" onclick="adminBanUser('${esc(u.uid)}')">✕ Reddet</button>
      </span>`;
    el.appendChild(d);
  });
}

function rGoogleUsers() {
  const el  = q('#googleUsersList'); if (!el) return;
  const cnt = q('#googleUsersCnt');
  const approved = _googleUsers.filter(u => u.status !== 'pending' && !u.isAdmin);
  if (cnt) cnt.textContent = _googleUsers.length + ' üye';

  // Arama kutusu
  let searchEl = q('#googleUsersSearch');
  if (!searchEl) {
    searchEl = document.createElement('input');
    searchEl.id = 'googleUsersSearch';
    searchEl.className = 'sett-inp';
    searchEl.placeholder = '🔍 İsim, e-posta veya okul ara...';
    searchEl.style.cssText = 'width:100%;margin-bottom:10px;font-size:13px;';
    searchEl.oninput = rGoogleUsers;
    el.parentElement.insertBefore(searchEl, el);
  }
  const q2 = (searchEl.value || '').toLowerCase().trim();

  const filtered = approved.filter(u =>
    !q2 ||
    (u.nickname || '').toLowerCase().includes(q2) ||
    (u.email || '').toLowerCase().includes(q2) ||
    (u.school || '').toLowerCase().includes(q2)
  );

  if (!filtered.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;">' + (q2 ? 'Sonuç bulunamadı.' : 'Henüz üye yok.') + '</div>';
    return;
  }
  el.innerHTML = '';
  filtered.forEach(u => {
    const d = document.createElement('div'); d.className = 'mli gu-row'; d.style.cssText = 'gap:8px;flex-wrap:wrap;align-items:center;';
    const statusColor = u.status === 'approved' ? 'var(--gn)' : 'var(--dg)';
    const statusTxt   = u.status === 'approved' ? '✅ Onaylı' : '⛔ Banlı';
    const schoolBadge = u.school === 'Şehit Akın Sertçelik AİHL'
      ? '<span class="school-badge erkek">Şehit Akın</span>'
      : u.school === 'Ataşehir Kız AİHL' ? '<span class="school-badge kiz">Ataşehir Kız</span>' : '';
    const avatarHtml = u.photoURL
      ? `<img src="${esc(u.photoURL)}" class="gu-avatar" referrerpolicy="no-referrer" onclick="openGoogleUserDetail('${esc(u.uid)}')" style="cursor:pointer;"/>`
      : `<div class="gu-avatar gu-avatar-ph" onclick="openGoogleUserDetail('${esc(u.uid)}')" style="cursor:pointer;">${(u.nickname||'?')[0].toUpperCase()}</div>`;
    d.innerHTML = `
      ${avatarHtml}
      <span class="mli-w gu-name" onclick="openGoogleUserDetail('${esc(u.uid)}')" style="cursor:pointer;">${esc(u.nickname || '?')}</span>
      ${schoolBadge}
      <span style="font-size:11px;color:${statusColor};">${statusTxt}</span>
      <span style="font-size:11px;color:var(--t3);">${esc(u.email || '')}</span>
      <span style="margin-left:auto;display:flex;gap:6px;">
        ${u.status === 'banned'
          ? `<button class="ts tg" onclick="adminApproveUser('${esc(u.uid)}')">✓ Çöz</button>`
          : `<button class="ts td" onclick="adminBanUser('${esc(u.uid)}')">⛔ Banla</button>`}
        <button class="ts tw" onclick="adminDeleteUser('${esc(u.uid)}')">🗑 Sil</button>
      </span>`;
    el.appendChild(d);
  });
}

async function adminApproveUser(uid) {
  if (typeof fbApproveUser !== 'function') return;
  await fbApproveUser(uid);
  toast('Kullanıcı onaylandı ✅', 's');
}

async function adminBanUser(uid) {
  if (typeof fbBanUserByUid !== 'function') return;
  await fbBanUserByUid(uid);
  toast('Kullanıcı banlı ⛔', 'e');
}

async function adminDeleteUser(uid) {
  if (!confirm('Bu kullanıcıyı tamamen sil?')) return;
  if (typeof fbDeleteUserDoc !== 'function') return;
  await fbDeleteUserDoc(uid);
  toast('Kullanıcı silindi 🗑', 'w');
}

// ══════════════════════════════════════════════════
// GOOGLE KULLANICI DETAY PANELİ
// ══════════════════════════════════════════════════
function openGoogleUserDetail(uid) {
  const u = _googleUsers.find(x => x.uid === uid);
  if (!u) return;
  const overlay = document.getElementById('guDetailOverlay');
  if (!overlay) return;

  // Avatar
  const havEl = overlay.querySelector('.gud-avatar');
  if (havEl) {
    if (u.photoURL) {
      havEl.innerHTML = `<img src="${esc(u.photoURL)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" referrerpolicy="no-referrer"/>`;
    } else {
      havEl.innerHTML = (u.nickname||'?')[0].toUpperCase();
      havEl.className = 'gud-avatar ' + avColor(u.nickname||'A', false);
    }
  }

  // Başlık
  const hn = overlay.querySelector('.gud-name'); if (hn) hn.textContent = u.nickname || '—';
  const hs = overlay.querySelector('.gud-email'); if (hs) hs.textContent = u.email || '';

  // Body
  const body = overlay.querySelector('.gud-body'); if (!body) return;
  body.innerHTML = '';

  // — Temel Bilgiler
  const infos = [
    ['İsim', u.firstName || '—'],
    ['Soyisim', u.lastName || '—'],
    ['Okul', u.school || '—'],
    ['Cinsiyet', u.gender || '—'],
    ['Yönelim', u.orientation || '—'],
    ['Sınıf', u.cls ? u.cls + '. Sınıf' : '—'],
    ['Doğum Tarihi', u.birth || '—'],
    ['Durum', u.status === 'approved' ? '✅ Onaylı' : u.status === 'banned' ? '⛔ Banlı' : '⏳ Bekliyor'],
    ['Kayıt', u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '—'],
  ];
  const sec1 = document.createElement('div');
  sec1.innerHTML = '<div class="aup-sec-label">Temel Bilgiler</div>';
  const grid = document.createElement('div'); grid.className = 'aup-grid';
  infos.forEach(([l, v]) => {
    const c = document.createElement('div'); c.className = 'aup-cell';
    c.innerHTML = `<div class="aup-cell-lbl">${l}</div><div class="aup-cell-val">${esc(String(v))}</div>`;
    grid.appendChild(c);
  });
  sec1.appendChild(grid);
  if (u.bio) {
    const bd = document.createElement('div'); bd.style.marginTop = '10px';
    bd.innerHTML = `<div class="aup-sec-label" style="margin-bottom:5px;">Biyografi</div><div class="aup-bio-box">${esc(u.bio)}</div>`;
    sec1.appendChild(bd);
  }
  body.appendChild(sec1);

  // — Sohbetler (convs)
  const userConvs = Object.values(convs).filter(c =>
    c.isGroup ? c.members?.includes(u.nickname) : (c.fromReal === u.nickname || c.toReal === u.nickname)
  );
  if (userConvs.length) {
    const sec2 = document.createElement('div');
    sec2.innerHTML = `<div class="aup-sec-label" style="margin-top:14px;">Sohbetler (${userConvs.length})</div>`;
    userConvs.forEach(c => {
      const peer = c.isGroup ? c.name : (c.fromReal === u.nickname ? c.toReal : c.fromReal);
      const row = document.createElement('div'); row.className = 'aup-conv'; row.style.marginBottom = '6px';
      const head = document.createElement('div'); head.className = 'aup-conv-head';
      head.innerHTML = `<div class="aup-conv-peer">${c.isGroup ? '👥 ' + esc(c.name) : esc(u.nickname) + ' ↔ ' + esc(peer)}</div><span class="aup-conv-cnt">${c.msgs.filter(m=>!m.isSys).length} mesaj</span><span class="aup-conv-badge ${c.status}">${c.status==='active'?'Aktif':'Bekliyor'}</span><span class="aup-conv-arrow">›</span>`;
      const msgs = document.createElement('div'); msgs.className = 'aup-conv-msgs';
      head.onclick = () => {
        const open = msgs.classList.toggle('op');
        head.querySelector('.aup-conv-arrow').style.transform = open ? 'rotate(90deg)' : '';
        if (!open || msgs.childNodes.length) return;
        const ms = c.msgs.filter(m=>!m.isSys);
        if (!ms.length) { msgs.innerHTML = '<div style="color:var(--t3);font-size:12px;">Mesaj yok.</div>'; return; }
        ms.forEach(m => {
          const r = document.createElement('div'); r.className = 'aup-msg-row';
          r.innerHTML = `<span class="aup-msg-who ${m.isAnon?'an':''}">${esc(m.from)}</span><span class="aup-msg-txt">${esc(m.recalled?'[geri alındı]':(m.text||'[medya]'))}</span><span class="aup-msg-t">${ft(m.time)}</span>`;
          msgs.appendChild(r);
        });
      };
      row.appendChild(head); row.appendChild(msgs); sec2.appendChild(row);
    });
    body.appendChild(sec2);
  }

  // — NEXUS Geçmişi
  if (typeof getNexusLogs === 'function') {
    const nxLogs = getNexusLogs(u.nickname || u.uid);
    const sec3 = document.createElement('div');
    sec3.style.marginTop = '14px';
    sec3.innerHTML = `<div class="aup-sec-label">⚡ NEXUS Geçmişi</div>`;
    if (!nxLogs.length) {
      sec3.innerHTML += '<div style="color:var(--t3);font-size:12px;">NEXUS konuşması yok.</div>';
    } else {
      const btn = document.createElement('button');
      btn.className = 'gud-nexus-btn';
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> ${nxLogs.length} konuşmayı görüntüle →`;
      btn.onclick = () => openNexusViewer(u.nickname || u.uid, nxLogs);
      sec3.appendChild(btn);
      // Son 3 önizleme
      nxLogs.slice(-3).reverse().forEach(l => {
        const modeLabel = ({fast:'⚡ Hızlı', think:'🧠 Derin', pro:'👑 Pro'})[l.m] || '⚡';
        const row = document.createElement('div'); row.className = 'bot-hist-item'; row.style.marginTop = '6px';
        row.innerHTML = `<div class="bot-hist-meta"><span class="bot-hist-mode">${modeLabel}</span><span class="bot-hist-time">${ft(new Date(l.t))}</span></div><div class="bot-hist-q">${esc(l.u.substring(0,80))}${l.u.length>80?'…':''}</div><div class="bot-hist-a">${esc(l.b.substring(0,100))}${l.b.length>100?'…':''}</div>`;
        sec3.appendChild(row);
      });
    }
    body.appendChild(sec3);
  }

  // İşlem butonları
  const sec4 = document.createElement('div');
  sec4.style.cssText = 'display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;';
  sec4.innerHTML = u.status === 'banned'
    ? `<button class="ts tg" style="flex:1;padding:10px;" onclick="adminApproveUser('${esc(u.uid)}');closeGUDetail()">✓ Banı Kaldır</button>`
    : `<button class="ts td" style="flex:1;padding:10px;" onclick="adminBanUser('${esc(u.uid)}');closeGUDetail()">⛔ Banla</button>`;
  sec4.innerHTML += `<button class="ts tw" style="flex:1;padding:10px;" onclick="adminDeleteUser('${esc(u.uid)}');closeGUDetail()">🗑 Sil</button>`;
  body.appendChild(sec4);

  overlay.classList.add('op');
}

function closeGUDetail() {
  const o = document.getElementById('guDetailOverlay'); if (o) o.classList.remove('op');
}

function openNexusViewer(name, logs) {
  closeGUDetail();
  const overlay = document.getElementById('nexusViewerOverlay');
  if (!overlay) return;
  const title = overlay.querySelector('.nv-title'); if (title) title.textContent = name + ' — NEXUS Konuşmaları';
  const list  = overlay.querySelector('.nv-list');  if (!list)  return;
  list.innerHTML = '';
  [...logs].reverse().forEach((l, i) => {
    const modeLabel = ({fast:'⚡ Hızlı', think:'🧠 Derin', pro:'👑 Pro'})[l.m] || '⚡';
    const timeStr = (() => { try { const d=new Date(l.t); return d.toLocaleDateString('tr-TR')+' '+d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}); } catch(e){return '';} })();
    const item = document.createElement('div'); item.className = 'nv-item';
    item.innerHTML = `
      <div class="nv-item-head">
        <span class="bot-hist-mode">${modeLabel}</span>
        <span class="nv-item-num">#${logs.length - i}</span>
        <span class="bot-hist-time">${timeStr}</span>
      </div>
      <div class="nv-bubble nv-user"><span class="nv-who">👤 ${esc(name)}</span>${esc(l.u)}</div>
      <div class="nv-bubble nv-bot"><span class="nv-who">⚡ NEXUS</span>${esc(l.b)}</div>`;
    list.appendChild(item);
  });
  overlay.classList.add('op');
}

function closeNexusViewer() {
  const o = document.getElementById('nexusViewerOverlay'); if (o) o.classList.remove('op');
}