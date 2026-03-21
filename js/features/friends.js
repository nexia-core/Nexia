// ══════════════════════════════════════════════════
// js/features/friends.js
// ══════════════════════════════════════════════════

function rFriends() {
  const fEl = q('#friendsList'), aEl = q('#allUsersList');
  if (!fEl || !aEl) return;
  fEl.innerHTML = '';

  if (me?.isAdmin) {
    q('#frH1').textContent = '👥 Sistemdeki Tüm Kullanıcılar';
    q('#frH2').style.display = 'none';
    aEl.style.display = 'none';
    
    Object.values(codes).filter(c => c.name && c.name !== me.name).forEach(c => {
      const name = c.name;
      const p = profiles[name] || {}; const avc = avColor(name, false);
      const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>` : name[0]?.toUpperCase() || '?';
      const d = document.createElement('div'); d.className = 'friend-item';
      d.innerHTML = `<div class="av ${avc}" style="flex-shrink:0;overflow:hidden;cursor:pointer;" onclick="showProfile('${esc(name)}',false)">${inner}</div>
      <div class="friend-info"><div class="friend-name" style="cursor:pointer;" onclick="showProfile('${esc(name)}',false)">${esc(name)} ${c.banned ? '🚫' : ''}</div><div class="friend-cls">${esc(p.cls || 'Öğrenci')}</div></div>
      <div class="friend-actions">
        <button class="ts tb2" onclick="startDm('${esc(name)}',false)">Mesaj Gönder</button>
      </div>`;
      fEl.appendChild(d);
    });
    return;
  }

  if (!friends.length) {
    fEl.innerHTML = '<div class="friends-empty">Henüz arkadaş eklemedin.<br>Aşağıdan kullanıcı ekleyebilirsin.</div>';
  } else {
    friends.forEach(name => {
      const p = profiles[name] || {}; const avc = avColor(name, false);
      const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>` : name[0]?.toUpperCase() || '?';
      const d = document.createElement('div'); d.className = 'friend-item';
      d.innerHTML = `<div class="av ${avc}" style="flex-shrink:0;overflow:hidden;cursor:pointer;" onclick="showProfile('${esc(name)}',false)">${inner}</div>
      <div class="friend-info"><div class="friend-name" style="cursor:pointer;" onclick="showProfile('${esc(name)}',false)">${esc(name)}</div><div class="friend-cls">${esc(p.cls || 'Sınıf belirtilmemiş')}</div></div>
      <div class="friend-actions">
        <button class="friend-btn msg" onclick="startDm('${esc(name)}',false)">💬</button>
        <button class="friend-btn rm" onclick="removeFriend('${esc(name)}')">✕</button>
      </div>`;
      fEl.appendChild(d);
    });
  }

  // Tüm kullanıcılar
  aEl.innerHTML = '';
  const others = Object.values(codes).filter(c => c.name && c.name !== me.name && !c.banned).map(c => c.name);
  if (!others.length) { aEl.innerHTML = '<div class="friends-empty">Başka kullanıcı yok.</div>'; return; }
  others.forEach(name => {
    const p = profiles[name] || {}; const avc = avColor(name, false);
    const isFr = friends.includes(name);
    const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>` : name[0]?.toUpperCase() || '?';
    const d = document.createElement('div'); d.className = 'friend-item';
    d.innerHTML = `<div class="av ${avc}" style="flex-shrink:0;overflow:hidden;cursor:pointer;" onclick="showProfile('${esc(name)}',false)">${inner}</div>
    <div class="friend-info"><div class="friend-name" style="cursor:pointer;" onclick="showProfile('${esc(name)}',false)">${esc(name)}</div><div class="friend-cls">${esc(p.cls || '')} ${p.actStatus === 'hidden' ? '⚫' : '🟢'}</div></div>
    <button class="add-friend-btn${isFr ? ' added' : ''}" onclick="toggleFriend('${esc(name)}',this)">${isFr ? '✓ Arkadaş' : '+ Ekle'}</button>`;
    aEl.appendChild(d);
  });
}

function toggleFriend(name, btn) {
  const idx = friends.indexOf(name);
  if (idx >= 0) {
    friends.splice(idx, 1);
    btn.textContent = '+ Ekle'; btn.classList.remove('added');
    toast('Arkadaşlıktan çıkarıldı', 'w');
  } else {
    friends.push(name);
    btn.textContent = '✓ Arkadaş'; btn.classList.add('added');
    toast(name + ' arkadaş listene eklendi 👥', 's');
  }
  const fEl = q('#friendsList'); if (fEl) rFriends();
}

function removeFriend(name) {
  const i = friends.indexOf(name);
  if (i >= 0) friends.splice(i, 1);
  rFriends(); toast('Arkadaşlıktan çıkarıldı', 'w');
}