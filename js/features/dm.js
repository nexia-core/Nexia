// ══════════════════════════════════════════════════
// DM BAŞLAT
// ══════════════════════════════════════════════════

function startDm(targetName, forceAnon, note = '') {
  const targetReal = aReg[targetName] || targetName;
  const ex = Object.keys(convs).find(k => {
    const c = convs[k];
    return !c.isGroup && ((c.fromReal === me.name && c.toReal === targetReal) || (c.fromReal === targetReal && c.toReal === me.name));
  });
  if (ex) { openC(ex); sw('d'); toast('Zaten bir sohbetiniz var', 'w'); return; }
  const id = 'c' + Date.now(), fromDisp = forceAnon ? me.anonId : me.name;
  convs[id] = { id, from: fromDisp, fromReal: me.name, to: targetName, toReal: targetReal, status: 'pending', msgs: [], fromAnon: forceAnon, toAnon: false, note, isGroup: false };
  addNotif('💬', 'Yeni Sohbet İsteği', (forceAnon ? 'Anonim' : me.name) + ' sana istek gönderdi', () => { sw('d'); openC(id); });
  rDL(); sw('d'); toast((forceAnon ? 'Anonim olarak ' : '') + targetReal + ' kişisine istek gönderildi', 's');
}

function ondm(preTarget) {
  if (preTarget) { openDmModeModal(preTarget); return; }
  const targets = Object.values(codes).filter(c => c.name && c.name !== me.name && !c.banned).map(c => c.name);
  if (!targets.length) { toast('Başka kullanıcı yok', 'w'); return; }
  const overlay = document.createElement('div'); overlay.className = 'prof-overlay op'; overlay.style.zIndex = '6000';
  const box = document.createElement('div'); box.className = 'prof-card'; box.style.width = '280px';
  let html = `<div style="font-size:16px;font-weight:700;margin-bottom:14px;">Sohbet İsteği Gönder</div>`;
  targets.forEach(n => {
    const avc = avColor(n, false), p = profiles[n] || {};
    const actDot = p.actStatus === 'hidden'
      ? '<div style="width:6px;height:6px;border-radius:50%;background:var(--t3);"></div>'
      : '<div style="width:6px;height:6px;border-radius:50%;background:var(--gn);"></div>';
    const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : n[0].toUpperCase();
    html += `<div class="di" style="margin-bottom:6px;padding:9px 11px;" onclick="pickDmUser('${esc(n)}',this.closest('.prof-overlay'))"><div class="av ${avc}" style="flex-shrink:0;">${inner}</div><div class="di-i"><div class="din">${esc(n)}</div><div class="dip" style="display:flex;align-items:center;gap:4px;">${actDot}${p.actStatus === 'hidden' ? 'Gizli' : 'Aktif'}</div></div></div>`;
  });
  html += `<button class="prof-btn pb-close" style="margin-top:6px;" onclick="this.closest('.prof-overlay').remove()">İptal</button>`;
  box.innerHTML = html; overlay.appendChild(box);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function pickDmUser(name, overlayEl) { if (overlayEl) overlayEl.remove(); openDmModeModal(name); }

// ══════════════════════════════════════════════════
// DM LİSTESİ
// ══════════════════════════════════════════════════

function rDL() {
  const el = q('#dmList'); el.innerHTML = '';
  const mc = Object.values(convs).filter(c => c.isGroup ? c.members.includes(me.name) : (c.fromReal === me.name || c.toReal === me.name || me.isAdmin));
  if (!mc.length) { el.innerHTML = '<div style="padding:12px;color:var(--t3);font-size:12px;">Henüz sohbet yok.</div>'; return; }
  mc.forEach(c => {
    const ot = c.isGroup ? c.name : (c.fromReal === me.name ? c.to : c.from);
    const last = c.msgs.filter(m => !m.isSys).slice(-1)[0];
    const prev = last ? last.text.substring(0, 26) + (last.text.length > 26 ? '…' : '') : (c.status === 'pending' ? 'Bekleyen istek' : 'Henüz mesaj yok');
    const p = c.isGroup ? null : (profiles[c.fromReal === me.name ? c.toReal : c.fromReal] || {});
    const avc = avColor(ot, false);
    const inner = c.isGroup ? '👥' : (p && p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : ot[0]?.toUpperCase() || '?');
    const d = document.createElement('div'); d.className = 'di' + (activeDm?.id === c.id ? ' on' : '');
    d.onclick = () => openC(c.id);
    d.innerHTML = `<div class="av ${avc}" style="overflow:hidden;">${inner}</div>
    <div class="di-i"><div class="din">${esc(ot)}</div><div class="dip">${esc(prev)}</div></div>
    ${c.isGroup ? '<span class="grp-tag">GRUP</span>' : (c.status === 'pending' && c.toReal === me.name ? '<span class="ptag">İstek</span>' : '')}`;
    el.appendChild(d);
  });
}

// ══════════════════════════════════════════════════
// KONUŞMA AÇ
// ══════════════════════════════════════════════════

function openC(id) {
  const c = convs[id]; if (!c) return; activeDm = c; rDL();
  const el = q('#dconv');

  // Bekleyen istek — alıcı görünümü
  if (!c.isGroup && c.status === 'pending' && c.toReal === me.name) {
    const noteHTML = c.note ? `<div class="req-note-card"><div class="req-note-lbl">📝 Not</div><div class="req-note-txt">${esc(c.note)}</div></div>` : '';
    el.innerHTML = `<div class="dch"><div class="av avg">${c.from[0]?.toUpperCase()}</div><div><div class="dcn">${esc(c.from)}</div><div class="dcs">sohbet isteği gönderdi</div></div></div>
    ${noteHTML}<div style="flex:1;overflow-y:auto;padding:14px;"><div class="rcard"><h4>${esc(c.from)} sana istek gönderdi</h4>
    <p>${c.fromAnon ? '⚠️ Anonim modda istek attı.' : 'Kabul edersen mesajlaşabilirsiniz.'}</p>
    <div class="ra-wrap"><button class="ra rok" onclick="acc('${id}')">✓ Kabul Et</button><button class="ra rno" onclick="rej('${id}')">✕ Reddet</button></div></div></div>`;
    return;
  }

  // Bekleyen istek — gönderen görünümü
  if (!c.isGroup && c.status === 'pending' && c.fromReal === me.name) {
    el.innerHTML = `<div class="dch"><div class="av avg">${c.to[0]?.toUpperCase()}</div><div><div class="dcn">${esc(c.to)}</div><div class="dcs">bekleniyor...</div></div></div>
    <div class="empty"><div class="eico">⏳</div><div>${esc(c.to)} onaylamasını bekliyor</div></div>`;
    return;
  }

  rAC(c);
}

function acc(id) {
  convs[id].status = 'active'; rDL(); rAC(convs[id]);
  toast('Sohbet başladı!', 's');
  addNotif('✅', 'Sohbet Kabul Edildi', convs[id].toReal + ' isteği kabul etti', () => { sw('d'); openC(id); });
}

function rej(id) {
  delete convs[id]; activeDm = null; rDL();
  q('#dconv').innerHTML = '<div class="empty"><div class="eico">💬</div><div>Sohbet seç</div></div>';
  toast('İstek reddedildi', 'w');
}

// ══════════════════════════════════════════════════
// AKTİF KONUŞMA RENDER
// ══════════════════════════════════════════════════

function rAC(c) {
  const el = q('#dconv');
  const ot = c.isGroup ? c.name : (c.fromReal === me.name ? c.to : c.from);
  const otReal = c.isGroup ? null : (c.fromReal === me.name ? c.toReal : c.fromReal);
  const ma = c.isGroup ? false : (c.fromReal === me.name ? c.fromAnon : c.toAnon);
  const p = otReal ? profiles[otReal] : null; const avc = avColor(ot, false);
  const inner = c.isGroup ? '👥' : (p && p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : ot[0]?.toUpperCase());
  const memberInfo = c.isGroup ? `<div class="dcs">${c.members.join(', ')}</div>` : '';
  el.innerHTML = `
    <div class="dch"><div class="av ${avc}" style="overflow:hidden;">${inner}</div>
    <div><div class="dcn">${esc(ot)}</div>${memberInfo}${!c.isGroup ? `<div class="dcs">Aktif sohbet</div>` : ''}</div>
    ${!c.isGroup ? `<div class="dmat ${ma ? 'on' : ''}" onclick="togDa('${c.id}')"><div class="adot" style="${ma ? 'background:var(--an)' : ''}"></div><span>${ma ? 'Anonim: Açık' : 'Anonim: Kapalı'}</span></div>` : ''}</div>
    <div class="msgs" id="dmm-${c.id}"></div>
    <div class="reply-bar" id="dReplyBar-${c.id}">
      <div style="width:3px;height:100%;background:var(--ac);border-radius:2px;flex-shrink:0;"></div>
      <div class="reply-bar-inner"><div class="reply-bar-name" id="dReplyName-${c.id}">—</div><div class="reply-bar-text" id="dReplyText-${c.id}">—</div></div>
      <span class="reply-bar-close" onclick="clearDReply('${c.id}')">✕</span>
    </div>
    <div class="cw">
      <div class="dm-input-row">
        <button class="media-btn" onclick="openMediaPicker('${c.id}')" title="Fotoğraf/Video">📎</button>
        <textarea class="ci ${ma ? 'am' : ''}" id="dmi-${c.id}" placeholder="${ma ? 'Anonim olarak...' : (esc(ot) + ' kişisine yaz...')}" onkeydown="dk(event,'${c.id}')" oninput="autoResize(this)" style="flex:1;"></textarea>
        <button class="sb ${ma ? 'a' : 'n'}" onclick="sD('${c.id}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
      </div>
      <div class="hint ${ma ? 'am' : ''}">${ma ? me.anonId + ' olarak görünürsün' : 'Enter → gönder · Shift+Enter → yeni satır'}</div>
    </div>`;
  rDM(c);
}

// ══════════════════════════════════════════════════
// DM MESAJLARI RENDER
// ══════════════════════════════════════════════════

function rDM(c) {
  const el = document.getElementById('dmm-' + c.id); if (!el) return; el.innerHTML = '';
  if (!c.msgs.length) { el.appendChild(mkS('Sohbet başladı!')); return; }
  c.msgs.forEach(m => {
    if (m.isSys) { el.appendChild(mkS(m.text)); return; }
    const isMe = m.fromReal === me.name, avc = avColor(m.from, m.isAnon), nc = m.isAnon ? 'an' : (isMe ? 'me' : '');
    let rev = ''; if (me.isAdmin && m.isAnon) { const r = aReg[m.from] || m.fromReal || '?'; rev = `<span class="rpill" onclick="ri(this,'${esc(r)}')">👁</span>`; }
    const p = profiles[m.fromReal] || {};
    const inner = m.isAnon ? '?' : (p.photo ? `<img src="${p.photo}" alt=""/>` : m.from[0]?.toUpperCase() || '?');
    let replyHTML = '';
    if (m.replyTo && !m.recalled) {
      replyHTML = `<div class="reply-quote ${m.replyTo.isAnon ? 'an-quote' : ''}" onclick="scrollToDMsg('${c.id}',${m.replyTo.id})"><div class="reply-quote-name ${m.replyTo.isAnon ? 'an' : ''}">${esc(m.replyTo.name)}</div><div class="reply-quote-text">${esc(m.replyTo.text || '[medya]')}</div></div>`;
    }
    let mediaHTML = '';
    if (!m.recalled && m.mediaType === 'image' && m.mediaData) mediaHTML = `<img class="msg-img" src="${m.mediaData}" alt="" onclick="openLightbox(this.src)"/>`;
    else if (!m.recalled && m.mediaType === 'video' && m.mediaData) mediaHTML = `<video class="msg-video" src="${m.mediaData}" controls></video>`;
    let textContent = '';
    if (m.recalled) textContent = `<div class="mx recalled">🚫 Bu mesaj geri alındı.</div>`;
    else if (m.editing && isMe) textContent = `<div class="edit-wrap"><textarea class="edit-inp" id="edit-${m.id}">${esc(m.text)}</textarea><div class="edit-btns"><button class="edit-ok" onclick="saveEdit(${m.id},'dm','${c.id}')">Kaydet</button><button class="edit-cancel" onclick="cancelEdit(${m.id},'dm','${c.id}')">İptal</button></div></div>`;
    else textContent = `${replyHTML}${m.text ? `<div class="mx ${m.isAnon ? 'an' : ''}">${t2h(m.text)}</div>` : ''}${mediaHTML}${m.edited ? '<span class="edited-tag">(düzenlendi)</span>' : ''}${m.text && !m.mediaType ? `<button class="translate-btn" onclick="translateMsg(${m.id},'dm','${c.id}')">🌐 Çevir</button>` : ''}${m.translatedText ? `<div class="translated-text">🇹🇷 ${esc(m.translatedText)}</div>` : ''}`;
    const reactHTML = (!m.recalled && !m.editing) ? buildReactions(m, 'dm', c.id) : '';
    const isLastMine = isMe && !m.recalled && c.msgs.filter(x => x.fromReal === me.name && !x.recalled).slice(-1)[0]?.id === m.id;
    const seenHTML = isLastMine && c.status === 'active' ? '<div class="seen-tag"> Görüldü</div>' : '';
    const d = document.createElement('div'); d.className = 'msg'; d.dataset.msgId = m.id; d.id = 'dmsg-' + c.id + '-' + m.id;
    d.innerHTML = `<div class="msg-av ${avc}" onclick="showProfile('${esc(m.from)}',${m.isAnon})">${inner}</div>
    <div class="mb"><div class="mh"><span class="mn ${nc}" onclick="showProfile('${esc(m.from)}',${m.isAnon})">${esc(m.from)}</span>${rev}<span class="mt">${ft(m.time)}</span></div>${textContent}${reactHTML}${seenHTML}</div>
    ${!m.recalled && !m.editing ? `<div class="msg-actions"><button class="mac" onclick="showEmojiPicker(this.closest('.msg-actions'),${m.id},'dm','${c.id}')">😊</button><button class="mac" onclick="setDReply(convs['${c.id}'],convs['${c.id}'].msgs.find(x=>x.id===${m.id}))">↩</button>${isMe || me.isAdmin ? `<button class="mac" onclick="showCtx(event,${m.id},'${c.id}','dm')">⋯</button>` : ''}</div>` : ''}`;
    if ((isMe || me.isAdmin) && !m.recalled && !m.editing) d.addEventListener('contextmenu', e => { e.preventDefault(); showCtx(e, m.id, c.id, 'dm'); });
    el.appendChild(d);
  });
  sbot('dmm-' + c.id);
}

function scrollToDMsg(cid, id) {
  const el = document.getElementById('dmsg-' + cid + '-' + id); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.background = 'var(--ac-d)'; setTimeout(() => el.style.background = '', 1500);
}

// ══════════════════════════════════════════════════
// DM YANIT
// ══════════════════════════════════════════════════

function setDReply(c, msg) {
  dmReplies[c.id] = { id: msg.id, name: msg.from, text: msg.text, isAnon: msg.isAnon };
  const nameEl = document.getElementById('dReplyName-' + c.id);
  const textEl = document.getElementById('dReplyText-' + c.id);
  const bar = document.getElementById('dReplyBar-' + c.id);
  if (nameEl) nameEl.textContent = '↩ ' + msg.from + ' yanıtlanıyor';
  if (textEl) textEl.textContent = (msg.text || '[medya]').substring(0, 80);
  if (bar) bar.classList.add('show');
  const inp = document.getElementById('dmi-' + c.id); if (inp) inp.focus();
}

function clearDReply(cid) { delete dmReplies[cid]; const bar = document.getElementById('dReplyBar-' + cid); if (bar) bar.classList.remove('show'); }

// ══════════════════════════════════════════════════
// DM GÖNDER
// ══════════════════════════════════════════════════

function togDa(id) { const c = convs[id]; if (c.fromReal === me.name) c.fromAnon = !c.fromAnon; else c.toAnon = !c.toAnon; rAC(c); }
function dk(e, id) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sD(id); } }

function sD(id) {
  if (isMuted(me.name)) { toast('Susturuldunuz.', 'e'); return; }
  const c = convs[id], inp = document.getElementById('dmi-' + id); if (!inp) return;
  const txt = inp.value.trim(); if (!txt) return;
  const ma = c.isGroup ? false : (c.fromReal === me.name ? c.fromAnon : c.toAnon), dn = ma ? me.anonId : me.name;
  const replyTo = dmReplies[id] ? { ...dmReplies[id] } : null;
  c.msgs.push({ id: Date.now(), from: dn, fromReal: me.name, text: txt, isAnon: ma, isMe: true, time: new Date(), recalled: false, edited: false, reactions: {}, replyTo });
  mld.push({ who: dn, real: me.name, isAnon: ma, text: txt, time: new Date(), isDm: true });
  clearDReply(id); inp.value = ''; inp.style.height = '42px'; rDM(c);
}

// ══════════════════════════════════════════════════
// DM MEDYA
// ══════════════════════════════════════════════════

let _activeDmId = null;

function openMediaPicker(id) { _activeDmId = id; q('#mediaFileInput').value = ''; q('#mediaFileInput').click(); }

function onMediaFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const id = _activeDmId; if (!id) return;
  const c = convs[id]; if (!c) return;
  const ma = c.isGroup ? false : (c.fromReal === me.name ? c.fromAnon : c.toAnon), dn = ma ? me.anonId : me.name;
  if (file.size > 50 * 1024 * 1024) { toast("Dosya 50MB'dan büyük", 'e'); return; }
  const isVideo = file.type.startsWith('video/');
  const reader = new FileReader();
  reader.onload = ev => {
    const url = ev.target.result, mt = isVideo ? 'video' : 'image';
    c.msgs.push({ id: Date.now(), from: dn, fromReal: me.name, text: '', isAnon: ma, isMe: true, time: new Date(), recalled: false, edited: false, reactions: {}, replyTo: null, mediaType: mt, mediaData: url, mediaName: file.name });
    mld.push({ who: dn, real: me.name, isAnon: ma, text: `[${isVideo ? 'Video' : 'Fotoğraf'}]`, time: new Date(), isDm: true });
    rDM(c); toast(isVideo ? 'Video gönderildi 🎥' : 'Fotoğraf paylaşıldı 📸', 's');
  };
  reader.readAsDataURL(file);
}

// ══════════════════════════════════════════════════
// YÖNETİME YAZ
// ══════════════════════════════════════════════════

function wk(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sw2adm(); } }

function sw2adm() {
  const inp = q('#wInp'), txt = inp.value.trim(); if (!txt) return;
  const sendAnon = q('#wAnonCheck').checked, dispName = sendAnon ? me.anonId : me.name;
  inbox.push({ id: 'm' + Date.now(), from: dispName, fromReal: me.name, fromAnonId: sendAnon ? me.anonId : null, isAnon: sendAnon, text: txt, time: new Date(), read: false, reply: '' });
  if (sendAnon) aReg[me.anonId] = me.name;
  inp.value = ''; inp.style.height = '42px'; rMyW(); toast('Mesajın yöneticiye iletildi', 's');
}

function rMyW() {
  const el = q('#myWmsgs'); el.innerHTML = '';
  const mine = inbox.filter(m => m.fromReal === me.name);
  if (!mine.length) { el.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:8px 0;">Henüz mesaj atmadın.</div>'; return; }
  mine.forEach(m => {
    const d = document.createElement('div'); d.className = 'wmi';
    d.innerHTML = `<div class="wmi-h"><span class="wmi-from">${m.isAnon ? m.fromAnonId + ' (sen)' : 'Sen'}</span><span class="wmi-t">${ft(m.time)}</span></div><div class="wmi-msg">${esc(m.text)}</div>${m.reply ? `<div class="wmi-rep">↩ Admin: ${esc(m.reply)}</div>` : ''}`;
    el.appendChild(d);
  });
}