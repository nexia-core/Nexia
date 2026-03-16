// ══════════════════════════════════════════════════
// js/admin/panel.js — Admin Paneli
// ══════════════════════════════════════════════════

/** Admin panelini yenile (tüm bölümler) */
function rA() { rIbx(); rUT(); rSpy(); rAL(); rOG(); rML(); rStats(); checkBirthdays(); }

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
  const el = q('#ibx'); el.innerHTML = '';
  const unr = inbox.filter(m => !m.read).length;
  q('#ibCnt').textContent = inbox.length + ' mesaj' + (unr ? ' · ' + unr + ' okunmadı' : '');
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
  const tb = q('#utbody'); tb.innerHTML = '';
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

function bn(code) { codes[code].banned = true; toast(codes[code].name + ' engellendi', 'e'); rUT(); }
function ub(code) { codes[code].banned = false; toast('Engel kaldırıldı', 's'); rUT(); }
function oPw(code) { pwT = code; q('#pwDesc').textContent = codes[code].name + ' için yeni kod belirle.'; q('#pwNew').value = ''; om('mdlPw'); }
function doPw() {
  const nc = q('#pwNew').value.trim().toUpperCase();
  if (!nc || nc.length < 3) { toast('En az 3 karakter', 'w'); return; }
  if (codes[nc]) { toast('Bu kod zaten var', 'w'); return; }
  codes[nc] = { ...codes[pwT] }; delete codes[pwT]; pwT = null;
  cm('mdlPw'); rUT(); toast('Kod değiştirildi: ' + nc, 's');
}

function addC() {
  const inp = q('#ncInp'), code = inp.value.trim().toUpperCase();
  if (!code || code.length < 3) { toast('En az 3 karakter', 'w'); return; }
  if (codes[code]) { toast('Bu kod zaten var', 'w'); return; }
  const name = prompt('Bu koda atanacak öğrenci adı:', '');
  if (!name || !name.trim()) { toast('İsim gerekli', 'w'); return; }
  codes[code] = { name: name.trim(), banned: false, firstLogin: true, muted: false };
  inp.value = ''; rUT(); toast('Kod eklendi: ' + code, 's');
}

// ──────────────────────────────────────────────────
// SPY (Sohbet İzleme)
// ──────────────────────────────────────────────────
function rSpy() {
  const el = q('#spyP'); el.innerHTML = '';
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
  const el = q('#anoL'); el.innerHTML = '';
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
  const el = q('#og'); el.innerHTML = '';
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
  const el = q('#mlog'); el.innerHTML = '';
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
  q('#aupHav').className = 'aup-hav ' + avc; q('#aupHav').innerHTML = inner; q('#aupHTitle').textContent = name;
  const cEntry = Object.entries(codes).find(([, v]) => v.name === name);
  const code = cEntry ? cEntry[0] : '—', banned = cEntry ? cEntry[1].banned : false, muted = cEntry ? cEntry[1].muted : false;
  q('#aupHSub').textContent = banned ? '⛔ Engelli' : muted ? '🔇 Susturulmuş' : 'Aktif kullanıcı';

  const body = q('#aupBody'); body.innerHTML = '';

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

  om('aupOverlay'); q('#aupOverlay').onclick = e => { if (e.target === q('#aupOverlay')) cm('aupOverlay'); };
}