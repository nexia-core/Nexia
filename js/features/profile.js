// ══════════════════════════════════════════════════
// js/features/profile.js — Profil Kartı + Profil Sayfası
// ══════════════════════════════════════════════════

// ─── Profil Kartı (Popup — eski sistem) ──────────

function openProfileCard(name) {
  const target = name || me.name;
  const p = profiles[target] || {}; const avc = avColor(target, false);
  const msgCount = [...gm, ...Object.values(convs).flatMap(c => c.msgs)]
    .filter(m => (m.realName || m.fromReal) === target && !m.isSys).length;
  const chCount = channels.filter(ch => ch.members.includes(target)).length;
  const frCount = target === me.name ? friends.length : 0;
  const inner = p.photo
    ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
    : target[0]?.toUpperCase() || '?';

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#F97316';
  q('#procardBanner').style.background = `linear-gradient(135deg,${accent}30,${accent}10)`;
  q('#procardAv').className = 'procard-avatar ' + avc;
  q('#procardAv').innerHTML = inner;
  q('#procardName').textContent = target;
  q('#procardTag').textContent = (p.cls ? p.cls + ' · ' : '') + (p.gender || '') + (p.orientation ? ' · ' + p.orientation : '');
  q('#procardBio').textContent = p.bio || 'Biyografi yok.';
  q('#procardStats').innerHTML = `
    <div class="procard-stat"><div class="procard-stat-val">${msgCount}</div><div class="procard-stat-lbl">Mesaj</div></div>
    <div class="procard-stat"><div class="procard-stat-val">${chCount}</div><div class="procard-stat-lbl">Oda</div></div>
    <div class="procard-stat"><div class="procard-stat-val">${target === me.name ? frCount : '—'}</div><div class="procard-stat-lbl">Arkadaş</div></div>`;

  const infoRow = q('#procardInfoRow'); infoRow.innerHTML = '';
  if (p.age) infoRow.innerHTML += `<div class="procard-chip">🎂 ${esc(p.age)} yaş</div>`;
  if (p.cls) infoRow.innerHTML += `<div class="procard-chip">🏫 ${esc(p.cls)}</div>`;
  if (p.actStatus === 'hidden') infoRow.innerHTML += `<div class="procard-chip">⚫ Gizli</div>`;
  else infoRow.innerHTML += `<div class="procard-chip" style="color:var(--gn)">🟢 Aktif</div>`;
  if (p.link) {
    const dl = p.link.replace(/^https?:\/\/(www\.)?/,'').substring(0,32);
    infoRow.innerHTML += `<a class="procard-chip pp-link" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">🔗 ${esc(dl)}</a>`;
  }

  om('procardOverlay');
  q('#procardOverlay').onclick = e => { if (e.target === q('#procardOverlay')) cm('procardOverlay'); };
}

function openMyProfileCard() { cm('psett'); openProfileCard(me.name); }

function shareProfileCard() {
  const target = q('#procardName').textContent;
  const p = profiles[target] || {};
  const msgCount = [...gm, ...Object.values(convs).flatMap(c => c.msgs)]
    .filter(m => (m.realName || m.fromReal) === target && !m.isSys).length;
  const text = `🎓 Nexia Profil Kartı\n━━━━━━━━━━━━━━━\n👤 ${target}\n${p.cls ? '🏫 Sınıf: ' + p.cls + '\n' : ''}${p.age ? '🎂 Yaş: ' + p.age + '\n' : ''}${p.bio ? '💬 ' + p.bio + '\n' : ''}📊 Toplam ${msgCount} mesaj\n━━━━━━━━━━━━━━━\nNexia ile paylaşıldı`;
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Profil kartı kopyalandı! 📋', 's'));
  else toast('Kopyalanamadı', 'e');
}


// ═══════════════════════════════════════════════════
// PROFİL SAYFASI (WhatsApp tarzı)
// ═══════════════════════════════════════════════════

var _ppTarget = null;
var _ppTab = 'posts';
var _ppTempPostImg = null;
var _ppTempHlCover = null;
var _ppTempHlItems = [];

// ─── Ana Render ──────────────────────────────────

function renderProfilePage(name) {
  var target = name || (me ? me.name : null);
  if (!target) return;
  _ppTarget = target;

  var el = q('#profilePage');
  if (!el) return;

  var p = profiles[target] || {};
  var avc = avColor(target, false);
  var isMe = me && target === me.name;
  var isBlocked = !isMe && typeof isBlockedByMe === 'function' && isBlockedByMe(target);

  var avInner = p.photo
    ? '<img src="' + p.photo + '" alt=""/>'
    : (target[0] ? target[0].toUpperCase() : '?');

  var html = '';

  // ── Hero (Avatar + İsim) ──
  html += '<div class="pp-wa-hero">';
  html += '<div class="pp-wa-av-wrap">';
  html += '<div class="pp-avatar ' + avc + '">' + avInner + '</div>';
  if (isMe) html += '<div class="pp-wa-av-edit" onclick="openProfileSettings()" title="Fotoğrafı Düzenle">✏️</div>';
  html += '</div>';
  html += '<div class="pp-wa-name">' + esc(target) + '</div>';
  if (p.actStatus === 'hidden') {
    html += '<div class="pp-wa-online">gizli</div>';
  } else {
    html += '<div class="pp-wa-online active">çevrimiçi</div>';
  }
  html += '</div>';

  // ── Aksiyon Butonları ──
  if (isMe) {
    html += '<div class="pp-wa-own-edit">';
    html += '<button class="pp-wa-edit-btn" onclick="openProfileSettings()">✏️ Profili Düzenle</button>';
    html += '<button class="pp-wa-share-btn" onclick="shareProfileCard()">Paylaş</button>';
    html += '</div>';
  } else if (me) {
    html += '<div class="pp-wa-actions">';
    html += '<div class="pp-wa-act-item" onclick="openDmModeModal(\'' + esc(target) + '\')">';
    html += '<div class="pp-wa-act-icon">💬</div><div class="pp-wa-act-label">Mesaj</div></div>';
    html += '</div>';
  }

  // ── Bilgi Bölümleri ──
  html += '<div class="pp-wa-sections">';

  // Hakkında
  html += '<div class="pp-wa-section">';
  html += '<div class="pp-wa-section-lbl">Hakkında</div>';
  html += '<div class="pp-wa-row">';
  html += '<div class="pp-wa-row-icon">ℹ️</div>';
  html += '<div class="pp-wa-row-body">';
  html += '<div class="pp-wa-row-val">' + (p.bio ? esc(p.bio) : '<span style="opacity:.4">Henüz biyografi yok</span>') + '</div>';
  html += '<div class="pp-wa-row-lbl">Hakkında</div>';
  html += '</div>';
  if (isMe) html += '<div class="pp-wa-row-action" onclick="openProfileSettings()">✏️</div>';
  html += '</div>';
  html += '</div>';

  // Kişisel Bilgiler
  var hasInfo = p.cls || p.age || p.gender || p.orientation || p.link;
  if (hasInfo) {
    html += '<div class="pp-wa-section">';
    html += '<div class="pp-wa-section-lbl">Bilgiler</div>';
    if (p.cls) {
      html += '<div class="pp-wa-row"><div class="pp-wa-row-icon">🏫</div><div class="pp-wa-row-body"><div class="pp-wa-row-val">' + esc(p.cls) + '</div><div class="pp-wa-row-lbl">Sınıf</div></div></div>';
    }
    if (p.age) {
      html += '<div class="pp-wa-row"><div class="pp-wa-row-icon">🎂</div><div class="pp-wa-row-body"><div class="pp-wa-row-val">' + esc(p.age) + ' yaş</div><div class="pp-wa-row-lbl">Yaş</div></div></div>';
    }
    if (p.gender) {
      html += '<div class="pp-wa-row"><div class="pp-wa-row-icon">👤</div><div class="pp-wa-row-body"><div class="pp-wa-row-val">' + esc(p.gender) + (p.orientation ? ' · ' + esc(p.orientation) : '') + '</div><div class="pp-wa-row-lbl">Cinsiyet</div></div></div>';
    }
    if (p.link) {
      var dl = p.link.replace(/^https?:\/\/(www\.)?/, '').substring(0, 38);
      html += '<div class="pp-wa-row tappable" onclick="window.open(\'' + esc(p.link) + '\',\'_blank\')"><div class="pp-wa-row-icon">🔗</div><div class="pp-wa-row-body"><div class="pp-wa-row-val" style="color:var(--ac)">' + esc(dl) + '</div><div class="pp-wa-row-lbl">Bağlantı</div></div></div>';
    }
    html += '</div>';
  }

  // Engelleme (sadece başka kullanıcı)
  if (!isMe && me) {
    html += '<div class="pp-wa-section" style="margin-bottom:32px;">';
    html += '<div class="pp-wa-row tappable danger" onclick="ppToggleBlock(\'' + esc(target) + '\')">';
    html += '<div class="pp-wa-row-icon">🚫</div>';
    html += '<div class="pp-wa-row-body"><div class="pp-wa-row-val">' + (isBlocked ? esc(target) + ' engelini kaldır' : esc(target) + '\'ı engelle') + '</div></div>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>'; // pp-wa-sections

  el.innerHTML = html;

  // Mobil başlık başlığını kullanıcı adıyla güncelle
  var mobTitleEl = document.getElementById('mobTitle');
  if (mobTitleEl) mobTitleEl.textContent = target;
}


// ─── Başka Kullanıcı Profilini Aç ───────────────

function openUserProfile(name) {
  sw('pr');
  renderProfilePage(name);
}

function ppToggleBlock(name) {
  if (typeof isBlockedByMe === 'function' && isBlockedByMe(name)) {
    if (typeof unblockUser === 'function') unblockUser(name);
  } else {
    if (typeof blockUser === 'function') blockUser(name);
  }
  renderProfilePage(_ppTarget);
}

// ═══════════════════════════════════════════════════
// PROFİL BİLGİ PANELİ (Engellenenler)
// ═══════════════════════════════════════════════════

function openProfileInfoPanel() {
  renderProfileInfoPanel();
  q('#ppInfoModal').classList.add('op');
}

function closeProfileInfoPanel() {
  q('#ppInfoModal').classList.remove('op');
}

function renderProfileInfoPanel() {
  var blocked = blockedUsers[me ? me.name : ''] || [];
  var bodyHtml = '';
  if (!blocked.length) {
    bodyHtml = '<div class="ppi-empty">Hiç engellenmiş kişi yok.</div>';
  } else {
    bodyHtml = '<div class="ppi-list">';
    blocked.forEach(function(name) {
      var p = profiles[name] || {};
      var avc = avColor(name, false);
      var avInner = p.photo ? '<img src="' + p.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>' : (name[0] ? name[0].toUpperCase() : '?');
      bodyHtml += '<div class="ppi-row">'
        + '<div class="av ' + avc + '" style="width:34px;height:34px;font-size:13px;flex-shrink:0;overflow:hidden;">' + avInner + '</div>'
        + '<span class="ppi-name">' + esc(name) + '</span>'
        + '<button class="ppi-unblock-btn" onclick="unblockUser(\'' + esc(name) + '\');renderProfileInfoPanel();">Engeli Kaldır</button>'
        + '</div>';
    });
    bodyHtml += '</div>';
  }
  q('#ppInfoContent').innerHTML = bodyHtml;
}

// ─── Escape handler ──────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (q('#ppInfoModal') && q('#ppInfoModal').classList.contains('op')) closeProfileInfoPanel();
  }
});

