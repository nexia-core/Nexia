// ══════════════════════════════════════════════════
// js/features/channels.js
// ══════════════════════════════════════════════════

const _chPalette = ['#F97316','#a855f7','#22c55e','#00c8ff','#ff6b6b','#ffaa00','#34d47a','#c084fc'];
function _chColor(idx) { return _chPalette[idx % _chPalette.length]; }

function rChannels() {
  const el = q('#channelList'); if (!el) return; el.innerHTML = '';
  const cb = q('#chCreateBtn'); if (cb) cb.style.display = me?.isAdmin ? '' : 'none';
  channels.forEach((ch, idx) => {
    const isMember = ch.members.includes(me?.name || '') || me?.isAdmin;
    const isActive = activeChannel?.id === ch.id;
    const lastMsg = ch.msgs.filter(m => !m.isSys).slice(-1)[0];
    const lastTxt = lastMsg ? (lastMsg.text || (lastMsg.mediaType === 'image' ? '📷 Fotoğraf' : lastMsg.mediaType === 'video' ? '🎥 Video' : '[medya]')) : null;
    const subtitle = lastTxt
      ? `${esc(lastMsg.from)}: ${esc(lastTxt.substring(0, 40))}`
      : (ch.desc || 'Henüz mesaj yok');
    const timeStr = lastMsg ? ft(lastMsg.time) : '';
    const unread = isActive ? 0 : (ch.unread || 0);
    const avContent = ch.photo
      ? `<img src="${ch.photo}" style="width:100%;height:100%;object-fit:cover;">`
      : (ch.emoji || ch.name[0]?.toUpperCase() || '#');
    const d = document.createElement('div');
    d.className = 'channel-item' + (isActive ? ' on' : '');
    d.innerHTML = `
      <div class="ch-av" style="background:${_chColor(idx)}">${avContent}</div>
      <div class="ch-body">
        <div class="ch-item-top">
          <span class="ch-item-name">${esc(ch.name)}</span>
          <span class="ch-item-time">${timeStr}</span>
        </div>
        <div class="ch-item-bot">
          <span class="ch-item-sub">${subtitle}</span>
          ${unread ? `<span class="ch-badge">${unread}</span>` : ''}
        </div>
      </div>`;
    d.onclick = () => {
      ch.unread = 0;
      if (!isMember && !me?.isAdmin) { joinChannel(ch.id, null); } else { openChannel(ch.id); }
    };
    el.appendChild(d);
  });
  const si = q('#chSearchInp');
  if (si && si.value) filterChSearch(si.value);
}

function filterChSearch(val) {
  const v = val.toLowerCase();
  document.querySelectorAll('#channelList .channel-item').forEach(item => {
    const name = item.querySelector('.ch-item-name')?.textContent.toLowerCase() || '';
    item.style.display = name.includes(v) ? '' : 'none';
  });
}

function joinChannel(id, e) {
  if (e) e.stopPropagation();
  const ch = channels.find(c => c.id === id); if (!ch) return;
  if (!ch.members.includes(me.name)) {
    ch.members.push(me.name);
    ch.msgs.push({ id: Date.now(), from: 'sistem', text: me.name + ' odaya katıldı.', isSys: true, time: new Date() });
    toast(ch.name + ' odasına katıldın! 🏠', 's');
    addNotif('🏠', 'Odaya Katıldın', ch.name + ' odasına başarıyla katıldın', () => { sw('ch'); openChannel(id); });
  }
  rChannels(); openChannel(id);
}

function backToChannels() {
  const pch = q('#pch'); if (pch) pch.classList.remove('ch-room-open');
  activeChannel = null; rChannels();
}

function openChannel(id) {
  const ch = channels.find(c => c.id === id); if (!ch) return;
  activeChannel = ch; rChannels();
  const pch = q('#pch'); if (pch) pch.classList.add('ch-room-open');
  const wrap = q('#channelMsgsWrap'); if (!wrap) return;
  const adminBtn = me?.isAdmin ? `<button onclick="openChannelEdit('${ch.id}')" style="margin-left:auto;background:var(--sf2);border:1px solid var(--bd2);color:var(--t2);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:13px;" title="Odayı Düzenle">✏️</button>` : '';
  wrap.innerHTML = `
    <div class="ch-header">
      <span style="font-size:20px;">${ch.photo ? `<img src="${ch.photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">` : (ch.emoji || '#')}</span>
      <div><div class="ch-header-name">${esc(ch.name)}</div><div class="ch-header-members">${ch.members.length} üye${ch.desc ? ' · ' + esc(ch.desc) : ''}</div></div>
      ${adminBtn}
    </div>
    <div class="msgs" id="chMsgs-${ch.id}"></div>
    <div class="cw">
      <div class="cr">
        <textarea class="ci" id="chInp-${ch.id}" placeholder="${esc(ch.name)} odasına yaz..." onkeydown="chKey(event,'${ch.id}')" oninput="autoResize(this)"></textarea>
        <button class="sb n" onclick="sendChMsg('${ch.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>`;
  rChMsgs(ch);
}

function rChMsgs(ch) {
  const el = document.getElementById('chMsgs-' + ch.id); if (!el) return; el.innerHTML = '';
  ch.msgs.forEach(m => {
    if (m.isSys) { el.appendChild(mkS(m.text)); return; }
    const p = profiles[m.from] || {}; const avc = avColor(m.from, false);
    const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : m.from[0]?.toUpperCase() || '?';
    const isMe = m.from === me.name;
    const d = document.createElement('div'); d.className = 'msg';
    d.innerHTML = `<div class="av ${avc}" style="flex-shrink:0;overflow:hidden;cursor:pointer;" onclick="showProfile('${esc(m.from)}',false)">${inner}</div>
    <div class="mb"><div class="mh"><span class="mn${isMe ? ' me' : ''}" style="cursor:pointer;" onclick="showProfile('${esc(m.from)}',false)">${esc(m.from)}</span><span class="mt">${ft(m.time)}</span></div>
    <div class="mx">${t2h(m.text)}</div></div>`;
    el.appendChild(d);
  });
  sbot('chMsgs-' + ch.id);
}

function sendChMsg(id) {
  const ch = channels.find(c => c.id === id); if (!ch) return;
  if (!ch.members.includes(me.name) && !me.isAdmin) { toast('Bu odada üye değilsin', 'e'); return; }
  const inp = document.getElementById('chInp-' + id); if (!inp) return;
  const txt = inp.value.trim(); if (!txt) return;
  if (isMuted(me.name)) { toast('Susturuldunuz', 'e'); return; }
  ch.msgs.push({ id: Date.now(), from: me.name, text: txt, time: new Date() });
  // Diğer üyeler için okunmamış sayacı artır
  if (activeChannel?.id !== ch.id) { ch.unread = (ch.unread || 0) + 1; }
  inp.value = ''; inp.style.height = '42px'; rChMsgs(ch); rChannels();
}

function chKey(e, id) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChMsg(id); } }

// ── KANAL EMOJİ SEÇİCİ ──────────────────────────────
const _CH_EMOJIS = ['💬','🏠','📚','⚽','🎵','🎨','🔬','💻','🎮','🍕','🌍','🚀','❤️','🔥','⚡','🌙','🎯','📢','🏆','🎭','💡','🌸','🐾','🎓','🏋️','🎸','📷','🌊'];

function openChEmojiPicker(inputId, btnId) {
  // Diğer açık picker'ları kapat
  document.querySelectorAll('.ch-emoji-picker').forEach(p => p.style.display = 'none');
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  const picker = btn?.parentElement?.querySelector('.ch-emoji-picker');
  if (!picker || !btn || !inp) return;
  if (picker.childElementCount === 0) {
    // "Yok" butonu
    const none = document.createElement('span');
    none.textContent = '✕';
    none.title = 'Emoji yok';
    none.style.cssText = 'color:var(--t3);font-size:14px;font-weight:700;';
    none.onclick = ev => {
      ev.stopPropagation();
      inp.value = '';
      btn.textContent = '#';
      picker.style.display = 'none';
    };
    picker.appendChild(none);
    _CH_EMOJIS.forEach(e => {
      const s = document.createElement('span');
      s.textContent = e;
      s.onclick = ev => {
        ev.stopPropagation();
        inp.value = e;
        btn.textContent = e;
        picker.style.display = 'none';
      };
      picker.appendChild(s);
    });
  }
  picker.style.display = picker.style.display === 'none' ? 'grid' : 'none';
  setTimeout(() => document.addEventListener('click', function _close(e) {
    if (!e.target.closest('.ch-emoji-picker') && e.target.id !== btnId) {
      picker.style.display = 'none';
      document.removeEventListener('click', _close);
    }
  }), 10);
}

// ── ADMIN KANAL DÜZENLE ──────────────────────────────
let _editingChId = null;

function openChannelEdit(id) {
  const ch = channels.find(c => c.id === id); if (!ch) return;
  _editingChId = id;
  q('#chEditName').value = ch.name || '';
  q('#chEditDesc').value = ch.desc || '';
  const editEmoji = ch.emoji || '💬';
  q('#chEditEmoji').value = editEmoji;
  const editEmojiBtn = q('#chEditEmojiBtn');
  if (editEmojiBtn) editEmojiBtn.textContent = editEmoji;
  // Önizleme
  const prev = q('#chEditAvPreview');
  if (ch.photo) {
    prev.innerHTML = `<img src="${ch.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"><div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:18px;opacity:0;transition:opacity .2s;" class="photo-overlay">📷</div>`;
  } else {
    prev.innerHTML = (ch.emoji || '💬') + '<div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:18px;opacity:0;transition:opacity .2s;" class="photo-overlay">📷</div>';
  }
  om('chEditModal');
}

function onChEditPhoto(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const ch = channels.find(c => c.id === _editingChId); if (!ch) return;
    ch.photo = ev.target.result;
    const prev = q('#chEditAvPreview');
    prev.innerHTML = `<img src="${ch.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"><div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:18px;opacity:0;transition:opacity .2s;" class="photo-overlay">📷</div>`;
  };
  reader.readAsDataURL(file);
}

function saveChannelEdit() {
  const ch = channels.find(c => c.id === _editingChId); if (!ch) return;
  const name = q('#chEditName').value.trim();
  if (!name) { toast('Oda adı boş olamaz', 'e'); return; }
  ch.name = name;
  ch.desc = q('#chEditDesc').value.trim();
  const emojiVal = (q('#chEditEmoji')?.value || '').trim();
  if (emojiVal) ch.emoji = emojiVal;
  cm('chEditModal');
  rChannels();
  if (activeChannel?.id === _editingChId) openChannel(_editingChId);
  toast('Oda güncellendi ✓', 's');
}

function deleteChannel() {
  const ch = channels.find(c => c.id === _editingChId); if (!ch) return;
  if (!confirm(`"${ch.name}" odasını silmek istediğinizden emin misiniz?`)) return;
  const idx = channels.findIndex(c => c.id === _editingChId);
  if (idx !== -1) channels.splice(idx, 1);
  cm('chEditModal');
  backToChannels();
  toast('Oda silindi', 's');
}

function createChannelPrompt() {
  const ni = document.getElementById('chCreateName');
  const ei = document.getElementById('chCreateEmoji');
  if (ni) ni.value = '';
  if (ei) ei.value = '💬';
  om('chCreateModal');
  setTimeout(() => ni?.focus(), 150);
}

function saveNewChannel() {
  const name = (document.getElementById('chCreateName')?.value || '').trim();
  if (!name) { toast('Oda adı boş olamaz', 'e'); return; }
  const emoji = (document.getElementById('chCreateEmoji')?.value || '').trim() || '💬';
  const id = 'ch' + Date.now();
  channels.push({ id, name, desc: '', emoji, members: [me.name], msgs: [{ id: Date.now(), from: 'sistem', text: me.name + ' odayı oluşturdu.', isSys: true, time: new Date() }] });
  cm('chCreateModal');
  rChannels();
  toast('Oda oluşturuldu: ' + name, 's');
}