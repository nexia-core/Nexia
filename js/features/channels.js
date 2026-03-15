// ══════════════════════════════════════════════════
// js/features/channels.js
// ══════════════════════════════════════════════════

function rChannels() {
  const el = q('#channelList'); if (!el) return; el.innerHTML = '';
  channels.forEach(ch => {
    const isMember = ch.members.includes(me?.name || '') || me?.isAdmin;
    const isActive = activeChannel?.id === ch.id;
    const d = document.createElement('div'); d.className = 'channel-item' + (isActive ? ' on' : '');
    d.innerHTML = `<span class="ch-hash">${ch.emoji || '#'}</span><span class="ch-name">${esc(ch.name)}</span>
    <span class="ch-badge">${ch.members.length}</span>
    ${(!isMember && !me?.isAdmin) ? `<button class="ch-join-btn" onclick="joinChannel('${ch.id}',event)">Katıl</button>` : ''}`;
    d.onclick = (e) => {
      if (e.target.classList.contains('ch-join-btn')) return;
      if (!isMember && !me?.isAdmin) { toast('Önce odaya katılman gerekiyor', 'w'); return; }
      openChannel(ch.id);
    };
    el.appendChild(d);
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

function openChannel(id) {
  const ch = channels.find(c => c.id === id); if (!ch) return;
  activeChannel = ch; rChannels();
  const wrap = q('#channelMsgsWrap'); if (!wrap) return;
  wrap.innerHTML = `
    <div class="ch-header">
      <span style="font-size:20px;">${ch.emoji || '#'}</span>
      <div><div class="ch-header-name">${esc(ch.name)}</div><div class="ch-header-members">${ch.members.length} üye</div></div>
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
    d.innerHTML = `<div class="av ${avc}" style="flex-shrink:0;overflow:hidden;">${inner}</div>
    <div class="mb"><div class="mh"><span class="mn${isMe ? ' me' : ''}">${esc(m.from)}</span><span class="mt">${ft(m.time)}</span></div>
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
  inp.value = ''; inp.style.height = '42px'; rChMsgs(ch);
}

function chKey(e, id) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChMsg(id); } }

function createChannelPrompt() {
  const name = prompt('Yeni oda adı:', ''); if (!name || !name.trim()) return;
  const emoji = prompt('Emoji (ör: 🎨):', '💬') || '💬';
  const id = 'ch' + Date.now();
  channels.push({ id, name: name.trim(), desc: '', emoji, members: [me.name], msgs: [{ id: Date.now(), from: 'sistem', text: me.name + ' odayı oluşturdu.', isSys: true, time: new Date() }] });
  rChannels(); toast('Oda oluşturuldu: ' + name, 's');
}