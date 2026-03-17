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

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#5b8cff';
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

  om('procardOverlay');
  q('#procardOverlay').onclick = e => { if (e.target === q('#procardOverlay')) cm('procardOverlay'); };
}

function openMyProfileCard() { cm('psett'); openProfileCard(me.name); }

function shareProfileCard() {
  const target = q('#procardName').textContent;
  const p = profiles[target] || {};
  const msgCount = [...gm, ...Object.values(convs).flatMap(c => c.msgs)]
    .filter(m => (m.realName || m.fromReal) === target && !m.isSys).length;
  const text = `🎓 OkulNet Profil Kartı\n━━━━━━━━━━━━━━━\n👤 ${target}\n${p.cls ? '🏫 Sınıf: ' + p.cls + '\n' : ''}${p.age ? '🎂 Yaş: ' + p.age + '\n' : ''}${p.bio ? '💬 ' + p.bio + '\n' : ''}📊 Toplam ${msgCount} mesaj\n━━━━━━━━━━━━━━━\nOkulNet ile paylaşıldı`;
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Profil kartı kopyalandı! 📋', 's'));
  else toast('Kopyalanamadı', 'e');
}


// ═══════════════════════════════════════════════════
// PROFİL SAYFASI (Instagram tarzı)
// ═══════════════════════════════════════════════════

var _ppTarget = null;      // şu an görüntülenen profil
var _ppTab = 'posts';      // aktif alt-tab: posts | highlights | stories
var _ppTempPostImg = null;  // gönderi ekleme geçici görsel
var _ppTempHlCover = null;  // öne çıkan kapak geçici
var _ppTempHlItems = [];    // öne çıkan içerik görselleri

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
  var accent = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#5b8cff';

  // İstatistikler
  var posts = (userPosts[target] || []);
  var postCount = posts.length;
  var frCount = isMe ? friends.length : 0;
  var msgCount = 0;
  try {
    msgCount = [...gm, ...Object.values(convs).flatMap(function(c){return c.msgs;})]
      .filter(function(m){return (m.realName || m.fromReal) === target && !m.isSys;}).length;
  } catch(e) {}

  var avInner = p.photo
    ? '<img src="' + p.photo + '" alt=""/>'
    : (target[0] ? target[0].toUpperCase() : '?');

  var tagParts = [];
  if (p.cls) tagParts.push(esc(p.cls));
  if (p.gender) tagParts.push(esc(p.gender));
  if (p.orientation) tagParts.push(esc(p.orientation));
  if (p.age) tagParts.push(esc(p.age) + ' yaş');
  if (p.actStatus === 'hidden') tagParts.push('Gizli');
  else tagParts.push('<span style="color:var(--gn)">Aktif</span>');

  var html = '';

  // Avatar (banner kaldırıldı)
  html += '<div class="pp-header">';
  html += '<div class="pp-avatar-standalone">';
  html += '<div class="pp-avatar ' + avc + '">' + avInner + '</div>';
  html += '</div></div>';

  // Info
  html += '<div class="pp-info">';
  html += '<div class="pp-top-row">';
  html += '<div class="pp-name">' + esc(target) + '</div>';
  if (isMe) {
    html += '<button class="pp-edit-btn" onclick="openProfileSettings()">Profili Düzenle</button>';
  }
  html += '</div>';
  html += '<div class="pp-tag">' + tagParts.join(' · ') + '</div>';
  html += '<div class="pp-bio">' + (p.bio ? esc(p.bio) : '<span style="opacity:.4">Henüz biyografi eklenmemiş</span>') + '</div>';

  // Stats
  html += '<div class="pp-stats">';
  html += '<div class="pp-stat"><div class="pp-stat-val">' + postCount + '</div><div class="pp-stat-lbl">Gönderi</div></div>';
  html += '<div class="pp-stat"><div class="pp-stat-val">' + (isMe ? frCount : '—') + '</div><div class="pp-stat-lbl">Arkadaş</div></div>';
  html += '<div class="pp-stat"><div class="pp-stat-val">' + msgCount + '</div><div class="pp-stat-lbl">Mesaj</div></div>';
  html += '</div>';
  html += '</div>';

  // Highlights bar
  html += renderHighlightsBar(target, isMe);

  // Tab bar
  html += '<div class="pp-tabs">';
  html += '<div class="pp-tab' + (_ppTab === 'posts' ? ' on' : '') + '" onclick="switchProfileTab(\'posts\')">Gönderiler</div>';
  html += '<div class="pp-tab' + (_ppTab === 'highlights' ? ' on' : '') + '" onclick="switchProfileTab(\'highlights\')">Öne Çıkanlar</div>';
  html += '<div class="pp-tab' + (_ppTab === 'stories' ? ' on' : '') + '" onclick="switchProfileTab(\'stories\')">Hikayeler</div>';
  html += '</div>';

  // Tab content
  if (_ppTab === 'posts') {
    html += renderPostsGrid(target, isMe);
  } else if (_ppTab === 'highlights') {
    html += renderHighlightsGrid(target, isMe);
  } else if (_ppTab === 'stories') {
    html += renderStoriesGrid(target);
  }

  el.innerHTML = html;
}

// ─── Highlights Bar ──────────────────────────────

function renderHighlightsBar(target, isMe) {
  var hls = highlights[target] || [];
  var html = '<div class="pp-highlights">';

  if (isMe) {
    html += '<div class="pp-hl-item" onclick="openHlModal()">';
    html += '<div class="pp-hl-ring add">+</div>';
    html += '<div class="pp-hl-name">Yeni</div></div>';
  }

  for (var i = 0; i < hls.length; i++) {
    var h = hls[i];
    var cover = h.coverImg
      ? '<img src="' + h.coverImg + '" alt=""/>'
      : '<span style="font-size:20px;">' + (h.title ? h.title[0].toUpperCase() : '?') + '</span>';
    html += '<div class="pp-hl-item" onclick="viewHighlight(\'' + esc(target) + '\',' + i + ')">';
    html += '<div class="pp-hl-ring">' + cover + '</div>';
    html += '<div class="pp-hl-name">' + esc(h.title || 'Öne Çıkan') + '</div></div>';
  }

  html += '</div>';
  return html;
}

// ─── Posts Grid ──────────────────────────────────

function renderPostsGrid(target, isMe) {
  var posts = userPosts[target] || [];
  if (posts.length === 0 && !isMe) {
    return '<div class="pp-empty"><div class="pp-empty-icon">📷</div><div class="pp-empty-text">Henüz gönderi yok</div></div>';
  }

  var html = '<div class="pp-grid">';

  if (isMe) {
    html += '<div class="pp-add-post-btn" onclick="openPostModal()">+</div>';
  }

  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var likeCount = post.likes ? post.likes.length : 0;
    html += '<div class="pp-post" onclick="viewPost(\'' + esc(target) + '\',' + i + ')">';
    html += '<img src="' + post.img + '" alt="" loading="lazy"/>';
    html += '<div class="pp-post-overlay">';
    html += '<span>❤️ ' + likeCount + '</span>';
    html += '</div></div>';
  }

  html += '</div>';
  return html;
}

// ─── Highlights Grid (tab content) ──────────────

function renderHighlightsGrid(target, isMe) {
  var hls = highlights[target] || [];
  if (hls.length === 0 && !isMe) {
    return '<div class="pp-empty"><div class="pp-empty-icon">⭐</div><div class="pp-empty-text">Henüz öne çıkan yok</div></div>';
  }
  if (hls.length === 0 && isMe) {
    return '<div class="pp-empty"><div class="pp-empty-icon">⭐</div><div class="pp-empty-text">Öne çıkan eklemek için yukarıdaki + butonunu kullan</div></div>';
  }

  var html = '<div class="pp-grid">';
  for (var i = 0; i < hls.length; i++) {
    var h = hls[i];
    var coverSrc = h.coverImg || (h.items && h.items[0] ? h.items[0].img : '');
    if (coverSrc) {
      html += '<div class="pp-post" onclick="viewHighlight(\'' + esc(target) + '\',' + i + ')">';
      html += '<img src="' + coverSrc + '" alt="" loading="lazy"/>';
      html += '<div class="pp-post-overlay"><span>' + esc(h.title || '') + '</span></div>';
      html += '</div>';
    }
  }
  html += '</div>';
  return html;
}

// ─── Stories Grid ────────────────────────────────

function renderStoriesGrid(target) {
  var myStories = stories.filter(function(s) { return s.author === target && !isStoryExpired(s); });
  if (myStories.length === 0) {
    return '<div class="pp-empty"><div class="pp-empty-icon">📖</div><div class="pp-empty-text">Aktif hikaye yok</div></div>';
  }

  var html = '<div class="pp-grid">';
  for (var i = 0; i < myStories.length; i++) {
    var s = myStories[i];
    if (s.img) {
      html += '<div class="pp-post" onclick="viewStory(\'' + esc(s.author) + '\')">';
      html += '<img src="' + s.img + '" alt="" loading="lazy"/>';
      html += '<div class="pp-post-overlay"><span>' + esc(s.title || ft(s.time)) + '</span></div>';
      html += '</div>';
    } else {
      html += '<div class="pp-post" onclick="viewStory(\'' + esc(s.author) + '\')" style="display:flex;align-items:center;justify-content:center;padding:12px;font-size:12px;color:var(--t2);text-align:center;line-height:1.4;">';
      html += esc(s.text ? s.text.substring(0, 80) : s.title || '');
      html += '</div>';
    }
  }
  html += '</div>';
  return html;
}

// ─── Tab Switching ───────────────────────────────

function switchProfileTab(tab) {
  _ppTab = tab;
  renderProfilePage(_ppTarget);
}

// ─── Başka Kullanıcı Profilini Aç ───────────────

function openUserProfile(name) {
  _ppTab = 'posts';
  sw('pr');
  renderProfilePage(name);
}

// ═══════════════════════════════════════════════════
// GÖNDERİ İŞLEMLERİ
// ═══════════════════════════════════════════════════

function openPostModal() {
  _ppTempPostImg = null;
  q('#ppAddPreview').innerHTML = '+';
  q('#ppAddPreview').classList.remove('has-img');
  q('#ppPostCaption').value = '';
  q('#ppPostFileInput').value = '';
  q('#ppAddModal').classList.add('op');
}

function closePostModal() {
  q('#ppAddModal').classList.remove('op');
  _ppTempPostImg = null;
}

function onPostImgSelect(e) {
  var file = e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast('Görsel 10MB\'dan büyük olamaz', 'e'); return; }
  var reader = new FileReader();
  reader.onload = function(ev) {
    _ppTempPostImg = ev.target.result;
    q('#ppAddPreview').innerHTML = '<img src="' + _ppTempPostImg + '" alt=""/>';
    q('#ppAddPreview').classList.add('has-img');
  };
  reader.readAsDataURL(file);
}

function publishPost() {
  if (!_ppTempPostImg) { toast('Bir görsel seç', 'w'); return; }
  if (!me) return;

  var caption = q('#ppPostCaption').value.trim();
  if (!userPosts[me.name]) userPosts[me.name] = [];

  userPosts[me.name].unshift({
    id: 'p' + Date.now(),
    img: _ppTempPostImg,
    caption: caption,
    time: new Date(),
    likes: []
  });

  closePostModal();
  _ppTab = 'posts';
  renderProfilePage(me.name);
  toast('Gönderi paylaşıldı!', 's');
}

function viewPost(target, idx) {
  var posts = userPosts[target] || [];
  var post = posts[idx];
  if (!post) return;

  var isMe = me && target === me.name;
  var p = profiles[target] || {};
  var avc = avColor(target, false);
  var avInner = p.photo
    ? '<img src="' + p.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>'
    : (target[0] ? target[0].toUpperCase() : '?');
  var liked = post.likes && post.likes.includes(me ? me.name : '');

  var html = '';
  html += '<img class="pp-modal-img" src="' + post.img + '" alt=""/>';
  html += '<div class="pp-modal-body">';
  html += '<div class="pp-modal-author">';
  html += '<div class="av ' + avc + '" style="width:32px;height:32px;font-size:13px;cursor:pointer;" onclick="openUserProfile(\'' + esc(target) + '\')">' + avInner + '</div>';
  html += '<div><div class="pp-modal-name">' + esc(target) + '</div><div class="pp-modal-time">' + ft(post.time) + '</div></div>';
  if (isMe) {
    html += '<button class="pp-modal-del" onclick="deletePost(' + idx + ')" title="Sil">🗑️</button>';
  }
  html += '</div>';
  if (post.caption) {
    html += '<div class="pp-modal-caption">' + esc(post.caption) + '</div>';
  }
  html += '<div class="pp-modal-actions">';
  html += '<button class="pp-modal-like" onclick="likePost(\'' + esc(target) + '\',' + idx + ')">' + (liked ? '❤️' : '🤍') + '</button>';
  html += '<span class="pp-modal-likes">' + (post.likes ? post.likes.length : 0) + ' beğeni</span>';
  html += '</div></div>';

  q('#ppViewCard').innerHTML = html;
  q('#ppViewModal').classList.add('op');
  q('#ppViewModal').onclick = function(e) { if (e.target === q('#ppViewModal')) closeViewModal(); };
}

function closeViewModal() {
  q('#ppViewModal').classList.remove('op');
}

function likePost(target, idx) {
  var posts = userPosts[target] || [];
  var post = posts[idx];
  if (!post || !me) return;

  if (!post.likes) post.likes = [];
  var li = post.likes.indexOf(me.name);
  if (li >= 0) post.likes.splice(li, 1);
  else post.likes.push(me.name);

  viewPost(target, idx);
  renderProfilePage(_ppTarget);
}

function deletePost(idx) {
  if (!me) return;
  var posts = userPosts[me.name] || [];
  if (!posts[idx]) return;
  posts.splice(idx, 1);
  closeViewModal();
  renderProfilePage(me.name);
  toast('Gönderi silindi', 's');
}


// ═══════════════════════════════════════════════════
// ÖNE ÇIKAN İŞLEMLERİ
// ═══════════════════════════════════════════════════

function openHlModal() {
  _ppTempHlCover = null;
  _ppTempHlItems = [];
  q('#ppHlTitle').value = '';
  q('#ppHlCoverPreview').innerHTML = '+';
  q('#ppHlCoverPreview').classList.remove('has-img');
  q('#ppHlItemsList').innerHTML = '';
  q('#ppHlCoverInput').value = '';
  q('#ppHlItemInput').value = '';
  q('#ppHlAddModal').classList.add('op');
}

function closeHlModal() {
  q('#ppHlAddModal').classList.remove('op');
}

function onHlCoverSelect(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    _ppTempHlCover = ev.target.result;
    q('#ppHlCoverPreview').innerHTML = '<img src="' + _ppTempHlCover + '" alt=""/>';
    q('#ppHlCoverPreview').classList.add('has-img');
  };
  reader.readAsDataURL(file);
}

function onHlItemSelect(e) {
  var files = e.target.files;
  if (!files || !files.length) return;

  for (var i = 0; i < files.length; i++) {
    (function(file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        _ppTempHlItems.push({ img: ev.target.result });
        renderHlItemsList();
      };
      reader.readAsDataURL(file);
    })(files[i]);
  }
}

function renderHlItemsList() {
  var el = q('#ppHlItemsList');
  if (!el) return;
  var html = '';
  for (var i = 0; i < _ppTempHlItems.length; i++) {
    html += '<div style="width:50px;height:50px;border-radius:6px;overflow:hidden;position:relative;">';
    html += '<img src="' + _ppTempHlItems[i].img + '" style="width:100%;height:100%;object-fit:cover;"/>';
    html += '<div onclick="removeHlItem(' + i + ')" style="position:absolute;top:1px;right:1px;width:16px;height:16px;background:rgba(0,0,0,.6);border-radius:50%;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</div>';
    html += '</div>';
  }
  el.innerHTML = html;
}

function removeHlItem(idx) {
  _ppTempHlItems.splice(idx, 1);
  renderHlItemsList();
}

function publishHighlight() {
  var title = q('#ppHlTitle').value.trim();
  if (!title) { toast('Başlık gir', 'w'); return; }
  if (!_ppTempHlCover && _ppTempHlItems.length === 0) { toast('En az bir görsel ekle', 'w'); return; }
  if (!me) return;

  if (!highlights[me.name]) highlights[me.name] = [];

  highlights[me.name].push({
    id: 'hl' + Date.now(),
    title: title,
    coverImg: _ppTempHlCover || (_ppTempHlItems[0] ? _ppTempHlItems[0].img : null),
    items: _ppTempHlItems.length > 0 ? _ppTempHlItems.slice() : (_ppTempHlCover ? [{ img: _ppTempHlCover }] : [])
  });

  closeHlModal();
  renderProfilePage(me.name);
  toast('Öne çıkan oluşturuldu!', 's');
}

// ─── Highlight Viewer ────────────────────────────

var _hlViewIdx = 0;
var _hlViewItems = [];
var _hlViewTarget = '';
var _hlViewHlIdx = 0;

function viewHighlight(target, hlIdx) {
  var hls = highlights[target] || [];
  var hl = hls[hlIdx];
  if (!hl || !hl.items || hl.items.length === 0) return;

  _hlViewTarget = target;
  _hlViewHlIdx = hlIdx;
  _hlViewItems = hl.items;
  _hlViewIdx = 0;

  renderHlViewer();
  q('#ppHlViewer').classList.add('op');
}

function renderHlViewer() {
  var item = _hlViewItems[_hlViewIdx];
  if (!item) return;

  var isMe = me && _hlViewTarget === me.name;
  var html = '';
  html += '<div style="font-size:13px;color:rgba(255,255,255,.6);margin-bottom:8px;font-family:\'Geist Mono\',monospace;">' + (_hlViewIdx + 1) + ' / ' + _hlViewItems.length + '</div>';
  if (item.img) html += '<img src="' + item.img + '" alt="" style="max-width:100%;max-height:60vh;object-fit:contain;border-radius:12px;"/>';
  if (item.text) html += '<div class="text">' + esc(item.text) + '</div>';

  html += '<div class="pp-hl-nav">';
  if (_hlViewIdx > 0) html += '<button onclick="hlViewPrev()">← Önceki</button>';
  if (_hlViewIdx < _hlViewItems.length - 1) html += '<button onclick="hlViewNext()">Sonraki →</button>';
  html += '<button onclick="closeHlViewer()">Kapat</button>';
  if (isMe) html += '<button onclick="deleteHighlight(' + _hlViewHlIdx + ')" style="color:var(--dg);border-color:var(--dg);">Sil</button>';
  html += '</div>';

  q('#ppHlViewContent').innerHTML = html;
}

function hlViewPrev() { if (_hlViewIdx > 0) { _hlViewIdx--; renderHlViewer(); } }
function hlViewNext() { if (_hlViewIdx < _hlViewItems.length - 1) { _hlViewIdx++; renderHlViewer(); } }

function closeHlViewer() {
  q('#ppHlViewer').classList.remove('op');
}

function deleteHighlight(hlIdx) {
  if (!me) return;
  var hls = highlights[me.name] || [];
  if (!hls[hlIdx]) return;
  hls.splice(hlIdx, 1);
  closeHlViewer();
  renderProfilePage(me.name);
  toast('Öne çıkan silindi', 's');
}

// ─── Escape handler ──────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (q('#ppHlViewer').classList.contains('op')) closeHlViewer();
    else if (q('#ppViewModal').classList.contains('op')) closeViewModal();
    else if (q('#ppAddModal').classList.contains('op')) closePostModal();
    else if (q('#ppHlAddModal').classList.contains('op')) closeHlModal();
  }
});
