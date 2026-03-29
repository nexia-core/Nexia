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
  const adminBypass = me.isAdmin && !forceAnon;
  convs[id] = { id, from: fromDisp, fromReal: me.name, to: targetName, toReal: targetReal, status: adminBypass ? 'accepted' : 'pending', msgs: [], fromAnon: forceAnon, toAnon: false, note, isGroup: false };
  if (typeof fbSaveConv === 'function') fbSaveConv(convs[id]);
  if (!adminBypass) addNotif('💬', 'Yeni Sohbet İsteği', (forceAnon ? 'Anonim' : me.name) + ' sana istek gönderdi', () => { sw('d'); openC(id); });
  rDL(); sw('d'); openC(id);
  toast(adminBypass ? targetReal + ' ile sohbet açıldı' : (forceAnon ? 'Anonim olarak ' : '') + targetReal + ' kişisine istek gönderildi', 's');
}

function ondm(preTarget) {
  if (preTarget) { openDmModeModal(preTarget); return; }
  const overlay = document.createElement('div'); overlay.className = 'prof-overlay op'; overlay.style.zIndex = '6000';
  const box = document.createElement('div'); box.className = 'prof-card'; box.style.width = '300px';
  box.innerHTML = `
    <div style="font-size:16px;font-weight:700;margin-bottom:12px;">Sohbet İsteği Gönder</div>
    <input id="_dmSearchInp" class="ci" placeholder="🔍 İsim ara..." style="width:100%;margin-bottom:10px;border-radius:8px;padding:9px 12px;font-size:13px;box-sizing:border-box;" oninput="_filterDmSearch(this.value)"/>
    <div id="_dmSearchRes" style="min-height:48px;max-height:240px;overflow-y:auto;">
      <div style="color:var(--t3);font-size:13px;padding:4px 2px;">Aramak için yazmaya başla...</div>
    </div>
    <button class="prof-btn pb-close" style="margin-top:10px;" onclick="this.closest('.prof-overlay').remove()">İptal</button>`;
  overlay.appendChild(box);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('_dmSearchInp')?.focus(), 60);
}

function _filterDmSearch(val) {
  const res = document.getElementById('_dmSearchRes'); if (!res) return;
  const v = val.trim().toLowerCase();
  if (!v) { res.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:4px 2px;">Aramak için yazmaya başla...</div>'; return; }
  const targets = Object.values(codes).filter(c => c.name && c.name !== me.name && !c.banned && c.name.toLowerCase().includes(v));
  if (!targets.length) { res.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:4px 2px;">Kullanıcı bulunamadı</div>'; return; }
  res.innerHTML = '';
  targets.forEach(c => {
    const n = c.name, avc = avColor(n, false), p = profiles[n] || {};
    const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : n[0].toUpperCase();
    const actDot = p.actStatus === 'hidden'
      ? '<div style="width:6px;height:6px;border-radius:50%;background:var(--t3);"></div>'
      : '<div style="width:6px;height:6px;border-radius:50%;background:var(--gn);"></div>';
    const d = document.createElement('div'); d.className = 'di'; d.style.cssText = 'margin-bottom:4px;padding:8px 10px;cursor:pointer;border-radius:8px;';
    d.innerHTML = `<div class="av ${avc}" style="flex-shrink:0;">${inner}</div><div class="di-i"><div class="din">${esc(n)}</div><div class="dip" style="display:flex;align-items:center;gap:4px;">${actDot}${p.actStatus === 'hidden' ? 'Gizli' : 'Aktif'}</div></div>`;
    d.onclick = () => { document.querySelector('.prof-overlay')?.remove(); openDmModeModal(n); };
    res.appendChild(d);
  });
}

function pickDmUser(name, overlayEl) { if (overlayEl) overlayEl.remove(); openDmModeModal(name); }

// ══════════════════════════════════════════════════
// DM LİSTESİ
// ══════════════════════════════════════════════════

function filterDmSearch(val) {
  const v = val.toLowerCase().trim();
  document.querySelectorAll('#dmList .di').forEach(d => {
    const name = d.querySelector('.din')?.textContent?.toLowerCase() || '';
    d.style.display = (!v || name.includes(v)) ? '' : 'none';
  });
}

function renderIncomingPanel() {
  const panel = q('#dmIncomingPanel'); if (!panel) return;
  const badge = q('#dmReqBadge');
  const pending = Object.values(convs).filter(c => !c.isGroup && c.status === 'pending' && c.toReal === me.name);
  if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? 'inline-flex' : 'none'; }
  if (!panel.style || panel.style.display === 'none') return;
  if (!pending.length) {
    panel.innerHTML = '<div style="padding:12px;color:var(--t3);font-size:12px;text-align:center;">Bekleyen istek yok.</div>';
    return;
  }
  panel.innerHTML = pending.map(c => `
    <div class="dm-req-item" onclick="openC('${c.id}');closeIncomingPanel()">
      <div class="av avg" style="width:34px;height:34px;font-size:13px;flex-shrink:0;">${c.from[0]?.toUpperCase() || '?'}</div>
      <div class="dm-req-info">
        <div class="dm-req-name">${esc(c.from)}</div>
        <div class="dm-req-sub">${c.fromAnon ? 'Anonim istek' : 'Sohbet isteği'}</div>
      </div>
      <div class="dm-req-btns">
        <button onclick="event.stopPropagation();acc('${c.id}');renderIncomingPanel();rDL()" class="ra rok" style="padding:4px 10px;font-size:11px;">✓</button>
        <button onclick="event.stopPropagation();rej('${c.id}');renderIncomingPanel();rDL()" class="ra rno" style="padding:4px 10px;font-size:11px;">✕</button>
      </div>
    </div>`).join('');
}

function toggleIncomingPanel() {
  const panel = q('#dmIncomingPanel'); if (!panel) return;
  const sent = q('#dmSentPanel'); if (sent) sent.style.display = 'none';
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
  if (!isOpen) renderIncomingPanel();
}

function closeIncomingPanel() {
  const panel = q('#dmIncomingPanel'); if (panel) panel.style.display = 'none';
}

function renderSentPanel() {
  const panel = q('#dmSentPanel'); if (!panel) return;
  const badge = q('#dmSentBadge');
  const sent = Object.values(convs).filter(c => !c.isGroup && c.status === 'pending' && c.fromReal === me.name);
  if (badge) { badge.textContent = sent.length; badge.style.display = sent.length ? 'inline-flex' : 'none'; }
  if (!panel.style || panel.style.display === 'none') return;
  if (!sent.length) {
    panel.innerHTML = '<div style="padding:12px;color:var(--t3);font-size:12px;text-align:center;">Gönderilmiş bekleyen istek yok.</div>';
    return;
  }
  panel.innerHTML = sent.map(c => `
    <div class="dm-req-item">
      <div class="av avg" style="width:34px;height:34px;font-size:13px;flex-shrink:0;">${c.to[0]?.toUpperCase() || '?'}</div>
      <div class="dm-req-info">
        <div class="dm-req-name">${esc(c.to)}</div>
        <div class="dm-req-sub">Yanıt bekleniyor...</div>
      </div>
      <div class="dm-req-btns">
        <button onclick="rej('${c.id}');renderSentPanel();rDL()" class="ra rno" style="padding:4px 10px;font-size:11px;" title="İsteği Geri Al">✕</button>
      </div>
    </div>`).join('');
}

function toggleSentPanel() {
  const panel = q('#dmSentPanel'); if (!panel) return;
  const incoming = q('#dmIncomingPanel'); if (incoming) incoming.style.display = 'none';
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
  if (!isOpen) renderSentPanel();
}

function closeSentPanel() {
  const panel = q('#dmSentPanel'); if (panel) panel.style.display = 'none';
}

function rDL() {
  const el = q('#dmList'); if (!el) return; el.innerHTML = '';
  const mc = Object.values(convs).filter(c => c.isGroup ? c.members.includes(me.name) : (c.fromReal === me.name || c.toReal === me.name || me.isAdmin));
  // Update incoming badge
  const pending = mc.filter(c => !c.isGroup && c.status === 'pending' && c.toReal === me.name);
  const badge = q('#dmReqBadge');
  if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? 'inline-flex' : 'none'; }
  // Update sent badge
  const sentPending = mc.filter(c => !c.isGroup && c.status === 'pending' && c.fromReal === me.name);
  const sentBadge = q('#dmSentBadge');
  if (sentBadge) { sentBadge.textContent = sentPending.length; sentBadge.style.display = sentPending.length ? 'inline-flex' : 'none'; }
  if (!mc.length) { el.innerHTML = '<div style="padding:12px;color:var(--t3);font-size:12px;">Henüz sohbet yok.</div>'; return; }
  mc.forEach(c => {
    // Gelen istekler panelinde gösteriliyor, listede tekrar gösterme
    if (!c.isGroup && c.status === 'pending' && c.toReal === me.name) return;
    const ot = c.isGroup ? c.name : (c.fromReal === me.name ? c.to : c.from);
    const last = c.msgs.filter(m => !m.isSys).slice(-1)[0];
    const hasDraft = !c.isGroup && _dmDrafts[c.id];
    const prev = hasDraft
      ? '📝 ' + _dmDrafts[c.id].substring(0, 24) + (_dmDrafts[c.id].length > 24 ? '…' : '')
      : (last ? ((last.text || (last.mediaType === 'image' ? '📷 Fotoğraf' : last.mediaType === 'video' ? '🎥 Video' : '[medya]'))).substring(0, 26) + ((last.text || '').length > 26 ? '…' : '') : (c.status === 'pending' ? 'Bekleyen istek' : 'Henüz mesaj yok'));
    const p = c.isGroup ? null : (profiles[c.fromReal === me.name ? c.toReal : c.fromReal] || {});
    const avc = avColor(ot, false);
    const inner = c.isGroup ? '👥' : (p && p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : ot[0]?.toUpperCase() || '?');
    const d = document.createElement('div'); d.className = 'di' + (activeDm?.id === c.id ? ' on' : '');
    d.onclick = () => openC(c.id);
    const otR = c.isGroup ? null : (c.fromReal === me.name ? c.toReal : c.fromReal);
    const avClick = !c.isGroup && otR ? `onclick="event.stopPropagation();showProfile('${esc(otR)}',false)" style="overflow:hidden;cursor:pointer;flex-shrink:0;"` : `style="overflow:hidden;flex-shrink:0;"`;
    const timeStr = last?.time ? ft(last.time) : '';
    const reqBadge = !c.isGroup && c.status === 'pending' && c.toReal === me.name ? '<div class="di-badge">!</div>' : '';
    const muteIcon = !c.isGroup && isDmMuted(c.id) ? '<span class="di-mute-icon">🔕</span>' : '';
    d.innerHTML = `<div class="av ${avc}" ${avClick}>${inner}</div>
    <div class="di-i"><div class="din">${esc(ot)}${muteIcon}</div><div class="dip ${hasDraft ? 'di-draft' : ''}">${esc(prev)}</div></div>
    <div class="di-right">${timeStr ? `<span class="di-time">${timeStr}</span>` : ''}${reqBadge}</div>`;
    el.appendChild(d);
  });
  // Re-apply search filter if active
  const si = q('#dmSearchInp');
  if (si && si.value) filterDmSearch(si.value);
}

// ══════════════════════════════════════════════════
// KONUŞMA AÇ
// ══════════════════════════════════════════════════

function openC(id) {
  const c = convs[id]; if (!c) return; activeDm = c; rDL();
  if (window.innerWidth <= 640) q('.dml')?.classList.add('dm-conv-open');
  const el = q('#dconv');

  // Bekleyen istek — alıcı görünümü
  if (!c.isGroup && c.status === 'pending' && c.toReal === me.name) {
    const noteHTML = c.note ? `<div class="req-note-card"><div class="req-note-lbl">📝 Not</div><div class="req-note-txt">${esc(c.note)}</div></div>` : '';
    el.innerHTML = `<div class="dch"><div class="av avg">${c.from[0]?.toUpperCase() || '?'}</div><div><div class="dcn">${esc(c.from)}</div><div class="dcs">sohbet isteği gönderdi</div></div></div>
    ${noteHTML}<div style="flex:1;overflow-y:auto;padding:14px;"><div class="rcard"><h4>${esc(c.from)} sana istek gönderdi</h4>
    <p>${c.fromAnon ? '⚠️ Anonim modda istek attı.' : 'Kabul edersen mesajlaşabilirsiniz.'}</p>
    <div class="ra-wrap"><button class="ra rok" onclick="acc('${id}')">✓ Kabul Et</button><button class="ra rno" onclick="rej('${id}')">✕ Reddet</button></div></div></div>`;
    return;
  }

  // Bekleyen istek — gönderen görünümü
  if (!c.isGroup && c.status === 'pending' && c.fromReal === me.name) {
    el.innerHTML = `<div class="dch"><div class="av avg">${c.to[0]?.toUpperCase() || '?'}</div><div><div class="dcn">${esc(c.to)}</div><div class="dcs">bekleniyor...</div></div></div>
    <div class="empty"><div class="eico">⏳</div><div>${esc(c.to)} onaylamasını bekliyor</div></div>`;
    return;
  }

  rAC(c);
}

function acc(id) {
  const c = convs[id]; if (!c) return;
  c.status = 'active'; rDL(); rAC(c);
  if (typeof fbSaveConv === 'function') fbSaveConv(c);
  toast('Sohbet başladı!', 's');
  addNotif('✅', 'Sohbet Kabul Edildi', c.toReal + ' isteği kabul etti', () => { sw('d'); openC(id); });
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
  const inner = c.isGroup ? '👥' : (p && p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : ot[0]?.toUpperCase() || '?');
  const memberInfo = c.isGroup ? `<div class="dcs">${c.members.join(', ')}</div>` : '';
  const profClick = !c.isGroup && otReal ? `onclick="showProfile('${esc(otReal)}',false)" style="overflow:hidden;cursor:pointer;"` : `style="overflow:hidden;"`;
  const muteIcon = !c.isGroup && isDmMuted(c.id) ? '🔕' : '🔔';
  const pm = c.pinnedMsg && c.pinnedMsg.id != null ? c.pinnedMsg : null;
  const pinnedBar = pm ? `<div class="dm-pinned-bar" onclick="scrollToDMsg('${c.id}',${pm.id})"><span class="dm-pinned-icon">📌</span><div class="dm-pinned-body"><div class="dm-pinned-from">${esc(pm.from||'')}</div><div class="dm-pinned-text">${esc(pm.text||'')}</div></div><button class="dm-pinned-close" onclick="event.stopPropagation();unpinDmMsg('${c.id}')">✕</button></div>` : '';
  el.innerHTML = `
    <div class="dch"><div class="av ${avc}" ${profClick}>${inner}</div>
    <div style="flex:1;min-width:0;"><div class="dcn"${!c.isGroup && otReal ? ` onclick="showProfile('${esc(otReal)}',false)" style="cursor:pointer;"` : ''}>${esc(ot)}</div>${memberInfo}${!c.isGroup ? `<div class="dcs" id="dcs-${c.id}">Aktif sohbet</div>` : ''}</div>
    ${!c.isGroup ? `<button class="dch-action-btn" onclick="openDmMediaGallery('${c.id}')" title="Medya Galerisi"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>` : ''}
    ${!c.isGroup ? `<button class="dch-action-btn" id="dmMuteBtn-${c.id}" onclick="openDmMuteMenu('${c.id}')" title="Sessiz Al" style="font-size:15px;">${muteIcon}</button>` : ''}
    ${!c.isGroup ? `<div class="dmat ${ma ? 'on' : ''}" onclick="togDa('${c.id}')"><div class="adot" style="${ma ? 'background:var(--an)' : ''}"></div><span>${ma ? 'Anonim: Açık' : 'Anonim: Kapalı'}</span></div>` : ''}</div>
    ${pinnedBar}
    <div class="msgs" id="dmm-${c.id}"></div>
    <div class="reply-bar" id="dReplyBar-${c.id}">
      <div style="width:3px;height:100%;background:var(--ac);border-radius:2px;flex-shrink:0;"></div>
      <div class="reply-bar-inner"><div class="reply-bar-name" id="dReplyName-${c.id}">—</div><div class="reply-bar-text" id="dReplyText-${c.id}">—</div></div>
      <span class="reply-bar-close" onclick="clearDReply('${c.id}')">✕</span>
    </div>
    <div class="cw">
      <div class="dm-input-row">
        <button class="media-btn" onclick="openMediaPicker('${c.id}')" title="Fotoğraf/Video">📎</button>
        <textarea class="ci ${ma ? 'am' : ''}" id="dmi-${c.id}" placeholder="${ma ? 'Anonim olarak...' : (esc(ot) + ' kişisine yaz...')}" onkeydown="dk(event,'${c.id}')" oninput="autoResize(this);onDmTyping('${c.id}');saveDmDraft('${c.id}',this.value)" style="flex:1;"></textarea>
        <button class="sb ${ma ? 'a' : 'n'}" onclick="sD('${c.id}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
      </div>
      <div class="hint ${ma ? 'am' : ''}">${ma ? me.anonId + ' olarak görünürsün' : 'Enter → gönder · Shift+Enter → yeni satır'}</div>
    </div>`;
  rDM(c);
  // Taslak varsa geri yükle
  if (_dmDrafts[c.id]) {
    const draftInp = document.getElementById('dmi-' + c.id);
    if (draftInp) { draftInp.value = _dmDrafts[c.id]; autoResize(draftInp); }
  }
}

// ══════════════════════════════════════════════════
// DM MESAJLARI RENDER
// ══════════════════════════════════════════════════

function rDM(c) {
  const el = document.getElementById('dmm-' + c.id); if (!el) return; el.innerHTML = '';
  if (!c.msgs.length) { el.appendChild(mkS('Sohbet başladı!')); return; }
  c.msgs.forEach(m => {
    if (m.isSys) { el.appendChild(mkS(m.text)); return; }
    // Engellenen kullanıcının mesajlarını gizle
    if (typeof shouldHideMessage === 'function' && shouldHideMessage(m)) return;
    const isMe = m.fromReal === me.name || (!m.fromReal && m.from === me.name), avc = avColor(m.from, m.isAnon), nc = m.isAnon ? 'an' : (isMe ? 'me' : '');
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
    else textContent = `${replyHTML}${m.text ? `<div class="mx ${m.isAnon ? 'an' : ''}">${t2h(m.text)}</div>` : ''}${mediaHTML}${m.edited ? '<span class="edited-tag">(düzenlendi)</span>' : ''}${m.translatedText ? `<div class="translated-text">🇹🇷 ${esc(m.translatedText)}</div>` : ''}`;
    const reactHTML = (!m.recalled && !m.editing) ? buildReactions(m, 'dm', c.id) : '';
    let seenHTML = '';
    if (isMe && !m.recalled && !c.isGroup) {
      if (c.status === 'active') seenHTML = '<span class="msg-tick read" title="Okundu">✓✓</span>';
      else seenHTML = '<span class="msg-tick" title="Gönderildi">✓</span>';
    }
    const d = document.createElement('div'); d.className = isMe ? 'msg msg-out' : 'msg msg-in'; d.dataset.msgId = m.id; d.id = 'dmsg-' + c.id + '-' + m.id;
    d.innerHTML = `<div class="msg-av ${avc}" onclick="showProfile('${esc(m.from)}',${m.isAnon})">${inner}</div>
    <div class="mb"><div class="mh"><span class="mn ${nc}" onclick="showProfile('${esc(m.from)}',${m.isAnon})">${esc(m.from)}</span>${rev}<span class="mt">${ft(m.time)}</span></div>${textContent}${reactHTML}${seenHTML}</div>
    ${!m.recalled && !m.editing ? `<div class="msg-actions"><button class="mac" onclick="showEmojiPicker(this.closest('.msg-actions'),${m.id},'dm','${c.id}')">😊</button><button class="mac" onclick="setDReply(convs['${c.id}'],convs['${c.id}'].msgs.find(x=>x.id===${m.id}))">↩</button>${isMe || me.isAdmin ? `<button class="mac" onclick="showCtx(event,${m.id},'${c.id}','dm')">⋯</button>` : ''}</div>` : ''}`;
    if ((isMe || me.isAdmin) && !m.recalled && !m.editing) d.addEventListener('click', e => { if (e.target.closest('button, a, img, video, .rxn, .msg-av, .mh, .emoji-picker, .reply-quote')) return; e.stopPropagation(); showCtx(e, m.id, c.id, 'dm'); });
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
  if (!c || !msg) return;
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

function togDa(id) { const c = convs[id]; if (!c) return; if (c.fromReal === me.name) c.fromAnon = !c.fromAnon; else c.toAnon = !c.toAnon; rAC(c); }
function dk(e, id) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sD(id); } }

// ── YAZIYYOR... GÖSTERGESİ ─────────────────────────
// Global durum: { convId: { who: userName, until: timestamp } }
const _dmTyping = {};

function onDmTyping(id) {
  // Sadece global durumu güncelle — UI'ı kendin için gösterme
  _dmTyping[id] = { who: me.name, until: Date.now() + 2500 };
}

// 500ms'de bir aktif konuşmanın başlığını güncelle
setInterval(function() {
  if (!activeDm) return;
  const convId = activeDm.id;
  const el = document.getElementById('dcs-' + convId); if (!el) return;
  const t = _dmTyping[convId];
  if (t && t.who !== me.name && t.until > Date.now()) {
    // Karşı taraf yazıyor
    el.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span> ' + esc(t.who) + ' yazıyor...';
  } else {
    // Yazıyor göstergesi varsa kaldır
    if (el.querySelector && el.querySelector('.typing-dots')) el.textContent = 'Aktif sohbet';
  }
}, 500);

// ── MESAJ TASLAĞИ ──────────────────────────────────
const _dmDrafts = {};
function saveDmDraft(id, val) {
  if (val.trim()) _dmDrafts[id] = val;
  else delete _dmDrafts[id];
}

// ── DM SESSİZ AL ──────────────────────────────────
function isDmMuted(convId) {
  const c = convs[convId]; if (!c || !c.mutedUntil) return false;
  return c.mutedUntil === Infinity || c.mutedUntil > Date.now();
}
function muteDmConv(convId, ms) {
  const c = convs[convId]; if (!c) return;
  c.mutedUntil = ms === Infinity ? Infinity : Date.now() + ms;
  const lbl = ms === Infinity ? 'süresiz' : (ms === 3600000 ? '1 saat' : '8 saat');
  toast('Sohbet ' + lbl + ' için sessize alındı 🔕', 's');
  const mm = document.getElementById('dmMuteDropdown'); if (mm) mm.remove();
  rDL(); if (activeDm?.id === convId) rAC(c);
}
function unmuteDmConv(convId) {
  const c = convs[convId]; if (!c) return;
  c.mutedUntil = null;
  toast('Sesi açıldı 🔔', 's');
  const mm = document.getElementById('dmMuteDropdown'); if (mm) mm.remove();
  rDL(); if (activeDm?.id === convId) rAC(c);
}
function openDmMuteMenu(convId) {
  const existing = document.getElementById('dmMuteDropdown');
  if (existing) { existing.remove(); return; }
  const muted = isDmMuted(convId);
  const menu = document.createElement('div');
  menu.id = 'dmMuteDropdown'; menu.className = 'dm-mute-menu';
  menu.innerHTML = muted
    ? `<div class="dm-mute-item" onclick="unmuteDmConv('${convId}')">🔔 Sesi Aç</div>`
    : `<div class="dm-mute-item" onclick="muteDmConv('${convId}',3600000)">🔕 1 Saat Sessiz</div>
       <div class="dm-mute-item" onclick="muteDmConv('${convId}',28800000)">🔕 8 Saat Sessiz</div>
       <div class="dm-mute-item" onclick="muteDmConv('${convId}',Infinity)">🔕 Süresiz Sessiz</div>`;
  const btn = document.getElementById('dmMuteBtn-' + convId);
  if (btn) {
    const r = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
  }
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', function _rm() {
    const m = document.getElementById('dmMuteDropdown'); if (m) m.remove();
    document.removeEventListener('click', _rm);
  }), 10);
}

// ── MESAJ SABİTLEME (DM) ──────────────────────────
function pinDmMsg(convId, msgId) {
  const c = convs[convId]; if (!c) return;
  const m = c.msgs.find(x => x.id === msgId); if (!m) return;
  c.pinnedMsg = { id: m.id, from: m.from || m.fromReal, text: m.text || (m.mediaType === 'image' ? '📷 Fotoğraf' : '🎥 Video') };
  rAC(c); toast('Mesaj sabitlendi 📌', 's');
}
function unpinDmMsg(convId) {
  const c = convs[convId]; if (!c) return;
  c.pinnedMsg = null; rAC(c); toast('Sabitleme kaldırıldı', 'w');
}

// ── MEDYA GALERİSİ ─────────────────────────────────
function openDmMediaGallery(convId) {
  const c = convs[convId]; if (!c) return;
  const media = c.msgs.filter(m => m.mediaData && !m.recalled);
  const grid = document.getElementById('dmMediaGrid'); if (!grid) return;
  grid.innerHTML = '';
  if (!media.length) {
    grid.innerHTML = '<div class="dm-media-empty">📭 Henüz medya paylaşılmadı</div>';
  } else {
    media.forEach(m => {
      const item = document.createElement('div'); item.className = 'dm-media-item';
      if (m.mediaType === 'image') {
        item.innerHTML = `<img src="${m.mediaData}" alt="" onclick="openLightbox(this.src)"/>`;
      } else {
        item.innerHTML = `<video src="${m.mediaData}" onclick="this.paused?this.play():this.pause()"></video>`;
      }
      grid.appendChild(item);
    });
  }
  om('dmMediaModal');
}

function sD(id) {
  if (isMuted(me.name)) { toast('Susturuldunuz.', 'e'); return; }
  const c = convs[id], inp = document.getElementById('dmi-' + id); if (!c || !inp) return;
  const txt = inp.value.trim(); if (!txt) return;
  // Karşılıklı engelleme kontrolü
  if (!c.isGroup) {
    const other = c.fromReal === me.name ? c.toReal : c.fromReal;
    if (other && (isBlockedByMe(other) || (blockedUsers[other] || []).includes(me.name))) {
      toast('Bu kişiyle mesajlaşamazsınız 🚫', 'e'); return;
    }
  }
  const ma = c.isGroup ? false : (c.fromReal === me.name ? c.fromAnon : c.toAnon), dn = ma ? me.anonId : me.name;
  const replyTo = dmReplies[id] ? { ...dmReplies[id] } : null;
  const newMsg = { id: Date.now(), from: dn, fromReal: me.name, text: txt, isAnon: ma, isMe: true, time: new Date(), recalled: false, edited: false, reactions: {}, replyTo };
  c.msgs.push(newMsg);
  mld.push({ who: dn, real: me.name, isAnon: ma, text: txt, time: new Date(), isDm: true });
  if (typeof fbSendDmMsg === 'function') fbSendDmMsg(id, newMsg);
  delete _dmDrafts[id];
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
  const mt = isVideo ? 'video' : 'image';
  const msgId = Date.now();

  // Önce local göster (hızlı UX)
  const reader = new FileReader();
  reader.onload = async ev => {
    const localUrl = ev.target.result;
    const newMsg = { id: msgId, from: dn, fromReal: me.name, text: '', isAnon: ma, isMe: true, time: new Date(), recalled: false, edited: false, reactions: {}, replyTo: null, mediaType: mt, mediaData: localUrl, mediaName: file.name };
    c.msgs.push(newMsg);
    mld.push({ who: dn, real: me.name, isAnon: ma, text: `[${isVideo ? 'Video' : 'Fotoğraf'}]`, time: new Date(), isDm: true });
    rDM(c); toast('Yükleniyor... 📤', 's');

    // Firebase Storage'a yükle
    if (typeof fbUploadMedia === 'function') {
      const uploadUrl = await fbUploadMedia(file, 'dm/' + id);
      if (uploadUrl) {
        newMsg.mediaUrl = uploadUrl;
        newMsg.mediaData = uploadUrl;
        // Firebase'e mesajı gönder
        if (typeof fbSendDmMsg === 'function') fbSendDmMsg(id, { ...newMsg, mediaUrl: uploadUrl });
        toast(isVideo ? 'Video gönderildi 🎥' : 'Fotoğraf paylaşıldı 📸', 's');
      } else {
        toast('Yükleme başarısız', 'e');
      }
    }
  };
  reader.readAsDataURL(file);
}

// ══════════════════════════════════════════════════
// YÖNETİME YAZ
// ══════════════════════════════════════════════════

function wk(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sw2adm(); } }

function sw2adm() {
  const inp = q('#wInp'); if (!inp) return; const txt = inp.value.trim(); if (!txt) return;
  const sendAnon = q('#wAnonCheck').checked, dispName = sendAnon ? me.anonId : me.name;
  inbox.push({ id: 'm' + Date.now(), from: dispName, fromReal: me.name, fromAnonId: sendAnon ? me.anonId : null, isAnon: sendAnon, text: txt, time: new Date(), read: false, reply: '' });
  if (sendAnon) aReg[me.anonId] = me.name;
  inp.value = ''; inp.style.height = '42px'; rMyW(); toast('Mesajın yöneticiye iletildi', 's');
}

function rMyW() {
  const el = q('#myWmsgs'); if (!el) return; el.innerHTML = '';
  const mine = inbox.filter(m => m.fromReal === me.name);
  if (!mine.length) { el.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:8px 0;">Henüz mesaj atmadın.</div>'; return; }
  mine.forEach(m => {
    const d = document.createElement('div'); d.className = 'wmi';
    d.innerHTML = `<div class="wmi-h"><span class="wmi-from">${m.isAnon ? m.fromAnonId + ' (sen)' : 'Sen'}</span><span class="wmi-t">${ft(m.time)}</span></div><div class="wmi-msg">${esc(m.text)}</div>${m.reply ? `<div class="wmi-rep">↩ Admin: ${esc(m.reply)}</div>` : ''}`;
    el.appendChild(d);
  });
}