// ══════════════════════════════════════════════════
// EMOJİ REAKSİYONLARI
// ══════════════════════════════════════════════════

function toggleReaction(msgId, emoji, scope, convId) {
  let msg = null;
  if (scope === 'global') msg = gm.find(m => m.id === msgId);
  else { const c = convs[convId]; if (c) msg = c.msgs.find(m => m.id === msgId); }
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const idx = msg.reactions[emoji].indexOf(me.name);
  if (idx >= 0) msg.reactions[emoji].splice(idx, 1); else msg.reactions[emoji].push(me.name);
  if (!msg.reactions[emoji].length) delete msg.reactions[emoji];
  if (scope === 'global') rG(); else rDM(convs[convId]);
}

function buildReactions(msg, scope, convId) {
  if (!msg.reactions || !Object.keys(msg.reactions).length) return '';
  let html = '<div class="reactions">';
  Object.entries(msg.reactions).forEach(([emoji, users]) => {
    if (!users.length) return;
    const mine = users.includes(me.name);
    const names = users.join(', ');
    html += `<span class="rxn${mine ? ' mine' : ''}" title="${esc(names)}" onclick="toggleReaction(${msg.id},'${emoji}','${scope}','${convId || ''}')">${emoji}<span class="rxn-cnt">${users.length}</span></span>`;
  });
  html += '</div>'; return html;
}

function showEmojiPicker(el, msgId, scope, convId) {
  document.querySelectorAll('.emoji-picker').forEach(p => p.remove());
  const picker = document.createElement('div'); picker.className = 'emoji-picker';
  EMOJIS.forEach(emoji => {
    const s = document.createElement('span'); s.textContent = emoji;
    s.onclick = (e) => { e.stopPropagation(); toggleReaction(msgId, emoji, scope, convId); picker.remove(); };
    picker.appendChild(s);
  });
  el.style.position = 'relative'; el.appendChild(picker);
  setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 10);
}

// ══════════════════════════════════════════════════
// YANIT (GLOBAL)
// ══════════════════════════════════════════════════

function setGReply(msg) {
  gReplyTo = { id: msg.id, name: msg.name, text: msg.text, isAnon: msg.isAnon };
  q('#gReplyName').textContent = '↩ ' + msg.name + ' yanıtlanıyor';
  q('#gReplyText').textContent = msg.text.substring(0, 80) + (msg.text.length > 80 ? '…' : '');
  q('#gReplyBar').classList.add('show');
  q('#gInp').focus();
}
function clearGReply() { gReplyTo = null; q('#gReplyBar').classList.remove('show'); }

// ══════════════════════════════════════════════════
// GLOBAL CHAT GÖNDER
// ══════════════════════════════════════════════════

function gk(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sg(); } }

function sg() {
  if (isMuted(me.name)) { toast('Susturuldunuz, mesaj gönderemezsiniz.', 'e'); return; }
  const inp = q('#gInp'), txt = inp.value.trim(); if (!txt) return;
  const m = {
    id: Date.now(), name: isAnon ? me.anonId : me.name, realName: me.name,
    text: txt, isAnon, isMe: true, isAdmin: me.isAdmin && !isAnon,
    time: new Date(), recalled: false, edited: false, reactions: {},
    replyTo: gReplyTo ? { ...gReplyTo } : null
  };
  gm.push(m);
  mld.push({ who: m.name, real: me.name, isAnon, text: txt, time: new Date() });
  clearGReply(); inp.value = ''; inp.style.height = '42px'; rG(); sbot('gMsgs');
  // Firebase'e gönder (gerçek zamanlı senkronizasyon)
  if (typeof sendToFirestore === 'function') sendToFirestore(m);
}

// Global medya
function onGMediaFile(e) {
  if (isMuted(me.name)) { toast('Susturuldunuz.', 'e'); return; }
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 50 * 1024 * 1024) { toast("Dosya 50MB'dan büyük", 'e'); return; }
  const isVideo = file.type.startsWith('video/');
  const reader = new FileReader();
  reader.onload = ev => {
    const url = ev.target.result, mt = isVideo ? 'video' : 'image';
    const m = { id: Date.now(), name: isAnon ? me.anonId : me.name, realName: me.name, text: '', isAnon, isMe: true, time: new Date(), recalled: false, edited: false, reactions: {}, replyTo: null, mediaType: mt, mediaData: url, mediaName: file.name };
    gm.push(m);
    mld.push({ who: m.name, real: me.name, isAnon, text: `[${isVideo ? 'Video' : 'Fotoğraf'}]`, time: new Date() });
    rG(); sbot('gMsgs'); toast(isVideo ? 'Video gönderildi 🎥' : 'Fotoğraf paylaşıldı 📸', 's');
  };
  reader.readAsDataURL(file);
}

// ══════════════════════════════════════════════════
// GLOBAL CHAT RENDER
// ══════════════════════════════════════════════════

function rG() {
  const el = q('#gMsgs'); el.innerHTML = '';
  gm.forEach(m => {
    if (m.type === 'sys') { el.appendChild(mkS(m.text)); return; }
    if (m.type === 'ann') {
      const d = document.createElement('div'); d.className = 'ann';
      d.innerHTML = `<div class="ann-lbl">📢 DUYURU</div><div>${esc(m.text)}</div>`;
      el.appendChild(d); return;
    }
    if (m.type === 'poll') { el.appendChild(buildPollEl(m)); return; }

    const isMe = m.realName === me.name;
    const nc = m.isAnon ? 'an' : (m.isAdmin ? 'adm' : (isMe ? 'me' : ''));
    const avc = avColor(m.name, m.isAnon);
    const init = m.isAnon ? '?' : getInner(m.name, false);
    let rev = '';
    if (me.isAdmin && m.isAnon) {
      const r = aReg[m.name] || m.realName || '?';
      rev = `<span class="rpill" onclick="ri(this,'${esc(r)}')">👁</span>`;
    }

    let replyHTML = '';
    if (m.replyTo && !m.recalled) {
      replyHTML = `<div class="reply-quote ${m.replyTo.isAnon ? 'an-quote' : ''}" onclick="scrollToMsg(${m.replyTo.id})"><div class="reply-quote-name ${m.replyTo.isAnon ? 'an' : ''}">${esc(m.replyTo.name)}</div><div class="reply-quote-text">${esc(m.replyTo.text)}</div></div>`;
    }

    let textContent = '';
    if (m.recalled) {
      textContent = me.isAdmin
        ? `<div class="mx recalled">🚫 Geri alındı — <span style="color:var(--wn);font-style:normal;">orijinal: ${t2h(m.text)}</span></div>`
        : `<div class="mx recalled">🚫 Bu mesaj geri alındı.</div>`;
    } else if (m.editing && isMe) {
      textContent = `<div class="edit-wrap"><textarea class="edit-inp" id="edit-${m.id}">${esc(m.text)}</textarea><div class="edit-btns"><button class="edit-ok" onclick="saveEdit(${m.id},'global',null)">Kaydet</button><button class="edit-cancel" onclick="cancelEdit(${m.id},'global',null)">İptal</button></div></div>`;
    } else {
      let mediaHTML = '';
      if (m.mediaType === 'image' && m.mediaData) mediaHTML = `<img class="msg-img" src="${m.mediaData}" alt="" onclick="openLightbox(this.src)"/>`;
      else if (m.mediaType === 'video' && m.mediaData) mediaHTML = `<video class="msg-video" src="${m.mediaData}" controls></video>`;
      textContent = `${replyHTML}${m.text ? `<div class="mx ${m.isAnon ? 'an' : ''}" id="mtxt-${m.id}">${t2h(m.text)}</div>` : ''}${mediaHTML}${m.edited ? '<span class="edited-tag">(düzenlendi)</span>' : ''}${m.text && !m.mediaType ? `<button class="translate-btn" onclick="translateMsg(${m.id},'global',null)">🌐 Çevir</button>` : ''}${m.translatedText ? `<div class="translated-text">🇹🇷 ${esc(m.translatedText)}</div>` : ''}`;
    }

    const reactHTML = (!m.recalled && !m.editing) ? buildReactions(m, 'global', null) : '';
    const d = document.createElement('div'); d.className = 'msg'; d.dataset.msgId = m.id; d.id = 'msg-' + m.id;
    d.innerHTML = `<div class="msg-av ${avc}" onclick="showProfile('${esc(m.name)}',${m.isAnon})">${init}</div>
    <div class="mb"><div class="mh"><span class="mn ${nc}" onclick="showProfile('${esc(m.name)}',${m.isAnon})">${esc(m.name)}</span>${rev}<span class="mt">${ft(m.time)}</span></div>${textContent}${reactHTML}</div>
    ${!m.recalled && !m.editing ? `<div class="msg-actions"><button class="mac" title="Tepki ver" onclick="showEmojiPicker(this.closest('.msg-actions'),${m.id},'global',null)">😊</button><button class="mac" title="Yanıtla" onclick="setGReply(gm.find(x=>x.id===${m.id}))">↩</button>${isMe || me.isAdmin ? `<button class="mac" title="Daha fazla" onclick="showCtx(event,${m.id},null,'global')">⋯</button>` : ''}${me.isAdmin && isMuted(m.realName) ? `<button class="mac" style="color:var(--gn)" title="Sesi aç" onclick="unmuteUser('${esc(m.realName)}')">🔇</button>` : ''}</div>` : ''}`;
    if (!m.recalled && !m.editing) d.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (isMe || me.isAdmin) {
        // Kendi mesajı veya admin → eski ctx menüsü (düzenle, sil vb.)
        showCtx(e, m.id, null, 'global');
      } else {
        // Başkasının mesajı → şikayet menüsü
        _reportTargetId   = String(m.id);
        _reportTargetText = m.text ? m.text.substring(0, 100) : '';
        const menu = q('#reportMenu');
        if (!menu) return;
        menu.style.display = 'block';
        menu.style.left = Math.min(e.clientX, window.innerWidth  - 180) + 'px';
        menu.style.top  = Math.min(e.clientY, window.innerHeight - 120) + 'px';
      }
    });
    el.appendChild(d);
  });
  sbot('gMsgs');
}

function scrollToMsg(id) {
  const el = document.getElementById('msg-' + id); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.background = 'var(--ac-d)'; setTimeout(() => el.style.background = '', 1500);
}

function ri(el, r) {
  const p = el.parentNode; el.remove();
  const s = document.createElement('span'); s.className = 'rpop'; s.textContent = '→ ' + r; p.appendChild(s);
}

// ══════════════════════════════════════════════════
// DÜZENLEME
// ══════════════════════════════════════════════════

function startEdit(msgId, scope, convId) {
  if (scope === 'global') {
    const m = gm.find(x => x.id === msgId); if (!m || m.realName !== me.name) return;
    m.editing = true; rG();
    setTimeout(() => { const el = document.getElementById('edit-' + msgId); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 50);
  } else {
    const c = convs[convId]; if (!c) return;
    const m = c.msgs.find(x => x.id === msgId); if (!m || m.fromReal !== me.name) return;
    m.editing = true; rDM(c);
    setTimeout(() => { const el = document.getElementById('edit-' + msgId); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 50);
  }
}

function saveEdit(msgId, scope, convId) {
  if (scope === 'global') {
    const m = gm.find(x => x.id === msgId); if (!m) return;
    const inp = document.getElementById('edit-' + msgId); if (!inp) return;
    const txt = inp.value.trim(); if (!txt) return;
    m.text = txt; m.edited = true; m.editing = false; rG(); toast('Mesaj düzenlendi', 's');
  } else {
    const c = convs[convId]; if (!c) return;
    const m = c.msgs.find(x => x.id === msgId); if (!m) return;
    const inp = document.getElementById('edit-' + msgId); if (!inp) return;
    const txt = inp.value.trim(); if (!txt) return;
    m.text = txt; m.edited = true; m.editing = false; rDM(c); toast('Mesaj düzenlendi', 's');
  }
}

function cancelEdit(msgId, scope, convId) {
  if (scope === 'global') { const m = gm.find(x => x.id === msgId); if (m) m.editing = false; rG(); }
  else { const c = convs[convId]; if (!c) return; const m = c.msgs.find(x => x.id === msgId); if (m) m.editing = false; rDM(c); }
}

// ══════════════════════════════════════════════════
// SABİTLEME
// ══════════════════════════════════════════════════

function pinMsg(id) {
  pinnedMsgId = id;
  const m = gm.find(x => x.id === id); if (!m) return;
  const bar = q('#pinnedBar'), txt = q('#pinnedText'), close = q('#pinnedClose');
  bar.style.display = 'flex'; txt.textContent = m.text || '[medya]';
  if (me.isAdmin) close.style.display = '';
  toast('Mesaj sabitlendi 📌', 's');
}

function unpinMsg() {
  pinnedMsgId = null;
  q('#pinnedBar').style.display = 'none';
  toast('Sabitleme kaldırıldı', 'w');
}

function scrollToPinned() {
  if (!pinnedMsgId) return;
  const el = document.getElementById('msg-' + pinnedMsgId); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.background = 'var(--ac-d)'; setTimeout(() => el.style.background = '', 1500);
}

// ══════════════════════════════════════════════════
// ÇEVİRİ
// ══════════════════════════════════════════════════

const TR_DICT = {
  'hello': 'merhaba', 'hi': 'merhaba', 'how are you': 'nasılsın', 'good': 'iyi', 'bad': 'kötü',
  'what': 'ne', 'where': 'nerede', 'when': 'ne zaman', 'who': 'kim', 'why': 'neden', 'how': 'nasıl',
  'yes': 'evet', 'no': 'hayır', 'thanks': 'teşekkürler', 'thank you': 'teşekkür ederim',
  'please': 'lütfen', 'sorry': 'özür dilerim', 'ok': 'tamam', 'bye': 'hoşça kal',
  'tomorrow': 'yarın', 'today': 'bugün', 'school': 'okul', 'class': 'sınıf', 'test': 'sınav',
  'homework': 'ödev', 'teacher': 'öğretmen', 'friend': 'arkadaş', 'book': 'kitap',
  'math': 'matematik', 'science': 'fen', 'english': 'ingilizce', 'history': 'tarih',
  'help': 'yardım', 'learn': 'öğren', 'study': 'çalış', 'read': 'oku', 'write': 'yaz',
  'come': 'gel', 'go': 'git', 'see': 'gör', 'do': 'yap', 'make': 'yap', 'have': 'sahip ol',
  'i': 'ben', 'you': 'sen', 'we': 'biz', 'they': 'onlar', 'he': 'o', 'she': 'o',
  'am': 'im', 'is': 'dir', 'are': 'dir', 'was': 'di', 'were': 'di',
  'the': '', 'a': '', 'an': '', 'and': 've', 'or': 'veya', 'but': 'ama', 'with': 'ile',
};

function translateMsg(msgId, scope, convId) {
  let msg = null;
  if (scope === 'global') msg = gm.find(m => m.id === msgId);
  else { const c = convs[convId]; if (c) msg = c.msgs.find(m => m.id === msgId); }
  if (!msg || !msg.text) return;
  if (msg.translatedText) { msg.translatedText = null; if (scope === 'global') rG(); else rDM(convs[convId]); return; }
  let txt = msg.text.toLowerCase();
  const trChars = ['ş', 'ğ', 'ü', 'ö', 'ç', 'ı'];
  const isTr = trChars.some(c => txt.includes(c)) || ['bir', 'bu', 've', 'için', 'olan', 'ile', 'de', 'da', 'den', 'dan', 'ise'].some(w => txt.split(' ').includes(w));
  if (isTr) {
    msg.translatedText = '(Zaten Türkçe: ' + msg.text.substring(0, 60) + (msg.text.length > 60 ? '…' : '') + ')';
  } else {
    let translated = txt;
    Object.entries(TR_DICT).forEach(([en, tr]) => { if (tr) translated = translated.replace(new RegExp('\\b' + en + '\\b', 'gi'), tr); });
    translated = translated.charAt(0).toUpperCase() + translated.slice(1);
    msg.translatedText = translated;
  }
  if (scope === 'global') rG(); else rDM(convs[convId]);
  toast('Çevrildi 🌐', 's');
}

// ══════════════════════════════════════════════════
// ANKETLER
// ══════════════════════════════════════════════════

function publishPoll() {
  const q2 = q('#pollQ').value.trim(); if (!q2) { toast('Soru boş olamaz', 'w'); return; }
  const opts = [...document.querySelectorAll('#pollOpts .poll-create-opt input')].map(i => i.value.trim()).filter(Boolean);
  if (opts.length < 2) { toast('En az 2 seçenek gerekli', 'w'); return; }
  const poll = { id: 'poll' + Date.now(), question: q2, options: opts.map(o => ({ text: o, voters: [] })), time: new Date() };
  polls.push(poll);
  gm.push({ id: Date.now(), type: 'poll', pollId: poll.id, time: new Date() });
  q('#pollQ').value = ''; document.querySelectorAll('#pollOpts .poll-create-opt input').forEach(i => i.value = '');
  rG(); toast('Anket yayınlandı!', 's');
  addNotif('📊', 'Yeni Anket', 'Admin bir anket oluşturdu', () => sw('g'));
}

function addPollOpt() {
  const wrap = q('#pollOpts'); const div = document.createElement('div'); div.className = 'poll-create-opt';
  div.innerHTML = `<input placeholder="Seçenek ${wrap.children.length + 1}"/><button class="poll-rm-opt" onclick="rmPollOpt(this)">−</button>`;
  wrap.appendChild(div);
}

function rmPollOpt(btn) { const wrap = q('#pollOpts'); if (wrap.children.length > 2) btn.parentElement.remove(); else toast('En az 2 seçenek gerekli', 'w'); }

function votePoll(pollId, optIdx) {
  const poll = polls.find(p => p.id === pollId); if (!poll) return;
  poll.options.forEach(o => { const i = o.voters.indexOf(me.name); if (i >= 0) o.voters.splice(i, 1); });
  poll.options[optIdx].voters.push(me.name); rG();
}

function buildPollEl(m) {
  const poll = polls.find(p => p.id === m.pollId);
  const wrap = document.createElement('div'); wrap.className = 'msg'; wrap.style.alignItems = 'flex-start';
  if (!poll) { wrap.innerHTML = '<div style="color:var(--t3);font-size:12px;">Anket bulunamadı.</div>'; return wrap; }
  const total = poll.options.reduce((s, o) => s + o.voters.length, 0);
  const myVote = poll.options.findIndex(o => o.voters.includes(me.name));
  let optsHTML = '';
  poll.options.forEach((o, i) => {
    const pct = total ? Math.round(o.voters.length / total * 100) : 0;
    optsHTML += `<div class="poll-option" onclick="votePoll('${poll.id}',${i})"><div class="poll-opt-bar${myVote === i ? ' voted' : ''}"><div class="poll-opt-fill" style="width:${pct}%"></div><span class="poll-opt-label">${esc(o.text)}</span></div><span class="poll-opt-pct">${pct}%</span></div>`;
  });
  wrap.innerHTML = `<div class="av avo" style="flex-shrink:0;">📊</div>
  <div class="mb"><div class="mh"><span class="mn adm">Admin</span><span class="mt">${ft(m.time)}</span></div>
  <div class="poll-block"><div class="poll-question">${esc(poll.question)}</div><div class="poll-options">${optsHTML}</div><div class="poll-footer">${total} oy${myVote >= 0 ? ' · oyladınız ✓' : ''}</div></div></div>`;
  return wrap;
}

// ══════════════════════════════════════════════════


// ══════════════════════════════════════════════════
// GRUP SOHBET
// ══════════════════════════════════════════════════

function openGrpModal() {
  const list = q('#grpMemberList'); list.innerHTML = '';
  Object.values(codes).filter(c => c.name !== me.name && !c.banned).forEach(c => {
    const item = document.createElement('div'); item.className = 'member-item';
    item.innerHTML = `<input type="checkbox" id="grpchk-${esc(c.name)}" value="${esc(c.name)}"/><label for="grpchk-${esc(c.name)}">${esc(c.name)}</label>`;
    list.appendChild(item);
  });
  q('#grpName').value = ''; om('grpModal');
}

function createGroup() {
  const name = q('#grpName').value.trim(); if (!name) { toast('Grup adı gerekli', 'w'); return; }
  const checked = [...document.querySelectorAll('#grpMemberList input:checked')].map(i => i.value);
  if (checked.length < 1) { toast('En az 1 üye seç', 'w'); return; }
  const members = [me.name, ...checked];
  const id = 'grp' + Date.now();
  convs[id] = { id, name, members, memberReals: members, from: me.name, fromReal: me.name, to: name, toReal: name, status: 'active', msgs: [{ id: Date.now(), from: 'sistem', fromReal: 'sistem', text: `${me.name} grubu oluşturdu.`, isAnon: false, isSys: true, time: new Date() }], fromAnon: false, toAnon: false, note: '', isGroup: true };
  checked.forEach(m => addNotif('👥', 'Gruba Eklendi', me.name + ' seni "' + name + '" grubuna ekledi', () => { sw('d'); openC(id); }));
  cm('grpModal'); rDL(); sw('d'); openC(id); toast('Grup oluşturuldu!', 's');
}

// ══════════════════════════════════════════════════
// SUSTURMA
// ══════════════════════════════════════════════════

function muteUser(name) {
  const entry = Object.values(codes).find(c => c.name === name); if (!entry) return;
  entry.muted = true; toast(name + ' susturuldu', 'w'); rA(); rUT();
}

function unmuteUser(name) {
  const entry = Object.values(codes).find(c => c.name === name); if (!entry) return;
  entry.muted = false; toast(name + ' susturmadan çıkarıldı', 's'); rA(); rUT(); rG();
}

// ══════════════════════════════════════════════════
// BAĞLAM MENÜSÜ (SAĞ TIK)
// ══════════════════════════════════════════════════

let _ctxEl = null;

function showCtx(e, msgId, convId, scope) {
  removeCtx();
  const menu = document.createElement('div'); menu.className = 'ctx-menu'; menu.id = 'ctxMenu';
  let msg = null;
  if (scope === 'global') msg = gm.find(m => m.id === msgId);
  else { const c = convs[convId]; if (c) msg = c.msgs.find(m => m.id === msgId); }
  const isMe = msg && (msg.realName === me.name || msg.fromReal === me.name);

  // Kopyala
  const copyBtn = document.createElement('div'); copyBtn.className = 'ctx-item'; copyBtn.innerHTML = '📋 Kopyala';
  copyBtn.onclick = () => { if (msg && msg.text) navigator.clipboard.writeText(msg.text).then(() => toast('Kopyalandı', 's')); removeCtx(); };
  menu.appendChild(copyBtn);

  // Sabitle (admin + global)
  if (me.isAdmin && scope === 'global' && msg && !msg.recalled) {
    const pinBtn = document.createElement('div'); pinBtn.className = 'ctx-item pin';
    pinBtn.innerHTML = pinnedMsgId === msg.id ? '📌 Sabitlemeyi Kaldır' : '📌 Sabitle';
    pinBtn.onclick = () => { if (pinnedMsgId === msg.id) unpinMsg(); else pinMsg(msg.id); removeCtx(); };
    menu.appendChild(pinBtn);
  }

  // Çevir
  if (msg && msg.text && !msg.recalled) {
    const trBtn = document.createElement('div'); trBtn.className = 'ctx-item'; trBtn.innerHTML = '🌐 Türkçeye Çevir';
    trBtn.onclick = () => { translateMsg(msg.id, scope, convId); removeCtx(); };
    menu.appendChild(trBtn);
  }

  // Yanıtla
  const replyBtn = document.createElement('div'); replyBtn.className = 'ctx-item'; replyBtn.innerHTML = '↩ Yanıtla';
  replyBtn.onclick = () => { if (scope === 'global' && msg) setGReply(msg); else if (scope === 'dm' && msg) { const c = convs[convId]; if (c) setDReply(c, msg); } removeCtx(); };
  menu.appendChild(replyBtn);

  // Düzenle
  if (isMe && msg && !msg.recalled && !msg.mediaType) {
    const editBtn = document.createElement('div'); editBtn.className = 'ctx-item'; editBtn.innerHTML = '✏️ Düzenle';
    editBtn.onclick = () => { startEdit(msgId, scope, convId); removeCtx(); };
    menu.appendChild(editBtn);
  }

  // Geri al / Sil
  const recallBtn = document.createElement('div'); recallBtn.className = 'ctx-item danger'; recallBtn.innerHTML = me.isAdmin ? '🗑️ Sil' : '🚫 Geri Al';
  recallBtn.onclick = () => { recallMsg(msgId, convId, scope); removeCtx(); };
  menu.appendChild(recallBtn);

  // Sustur (admin)
  if (me.isAdmin && msg) {
    const realSender = msg.realName || msg.fromReal;
    if (realSender && realSender !== me.name) {
      const muteBtn = document.createElement('div'); muteBtn.className = 'ctx-item'; muteBtn.innerHTML = isMuted(realSender) ? '🔊 Sesi Aç' : '🔇 Sustur';
      muteBtn.onclick = () => { isMuted(realSender) ? unmuteUser(realSender) : muteUser(realSender); removeCtx(); };
      menu.appendChild(muteBtn);
    }
  }

  let x = e.clientX, y = e.clientY;
  document.body.appendChild(menu);
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  if (x + mw > window.innerWidth) x = window.innerWidth - mw - 8;
  if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
  menu.style.left = x + 'px'; menu.style.top = y + 'px'; _ctxEl = menu;
  setTimeout(() => document.addEventListener('click', removeCtx, { once: true }), 10);
}

function removeCtx() { if (_ctxEl) { _ctxEl.remove(); _ctxEl = null; } }

function recallMsg(msgId, convId, scope) {
  if (scope === 'global') {
    const m = gm.find(x => x.id === msgId); if (!m) return; m.recalled = true; rG(); toast('Mesaj geri alındı', 'w');
  } else {
    const c = convs[convId]; if (!c) return; const m = c.msgs.find(x => x.id === msgId); if (!m) return;
    m.recalled = true; if (m.mediaData) m.mediaData = null; rDM(c); toast('Mesaj geri alındı', 'w');
  }
}

// ══════════════════════════════════════════════════
// LIGHTBOX
// ══════════════════════════════════════════════════

function openLightbox(src) {
  if (src && src.startsWith('data:application/pdf')) { toast('PDF görüntülenemez, indirin', 'w'); return; }
  q('#lbImg').src = src; q('#lightbox').classList.add('op');
}