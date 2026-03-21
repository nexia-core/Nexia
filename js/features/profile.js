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
  var accent = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#F97316';

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
  html += '<button class="pp-back-btn" onclick="sw(\'g\')" title="Geri"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>';
  html += '<div class="pp-avatar-standalone">';
  html += '<div class="pp-avatar ' + avc + '">' + avInner + '</div>';
  html += '</div></div>';

  // Info
  html += '<div class="pp-info">';
  html += '<div class="pp-top-row">';
  html += '<div class="pp-name">' + esc(target) + '</div>';
  html += '</div>';
  if (isMe) {
    html += '<div class="pp-me-btns">';
    html += '<button class="pp-edit-btn" onclick="openProfileSettings()">Profili Düzenle</button>';
    html += '<button class="pp-share-btn" onclick="shareProfileCard()">Profili Paylaş</button>';
    html += '</div>';
  }

  // Başka kullanıcı profili — aksiyon butonları
  if (!isMe && me) {
    var isFriend = friends.includes(target);
    var isBlocked = typeof isBlockedByMe === 'function' && isBlockedByMe(target);
    html += '<div class="pp-action-btns">';
    html += '<button class="pp-follow-btn' + (isFriend ? ' following' : '') + '" onclick="ppToggleFollow(\'' + esc(target) + '\')">' + (isFriend ? '✓ Takiptesin' : '+ Takip Et') + '</button>';
    html += '<button class="pp-msg-btn" onclick="openDmModeModal(\'' + esc(target) + '\')">Mesaj Gönder</button>';
    html += '<button class="pp-block-btn' + (isBlocked ? ' blocked' : '') + '" onclick="ppToggleBlock(\'' + esc(target) + '\')">' + (isBlocked ? 'Engeli Kaldır' : 'Engelle') + '</button>';
    html += '</div>';
  }
  html += '<div class="pp-tag">' + tagParts.join(' · ') + '</div>';
  html += '<div class="pp-bio">' + (p.bio ? esc(p.bio) : '<span style="opacity:.4">Henüz biyografi eklenmemiş</span>') + '</div>';
  if (p.link) {
    var displayLink = p.link.replace(/^https?:\/\/(www\.)?/, '').substring(0, 38);
    html += '<div class="pp-link-row"><a class="pp-link" href="' + esc(p.link) + '" target="_blank" rel="noopener noreferrer">🔗 ' + esc(displayLink) + '</a></div>';
  }

  // Stats
  html += '<div class="pp-stats">';
  html += '<div class="pp-stat"><div class="pp-stat-val">' + postCount + '</div><div class="pp-stat-lbl">Gönderi</div></div>';
  html += '<div class="pp-stat"><div class="pp-stat-val">' + (isMe ? frCount : '—') + '</div><div class="pp-stat-lbl">Arkadaş</div></div>';
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

// ─── Profil Sayfası Aksiyon Butonları ───────────

function ppToggleFollow(name) {
  var idx = friends.indexOf(name);
  if (idx >= 0) {
    friends.splice(idx, 1);
    toast('Takipten çıkıldı', 'w');
  } else {
    friends.push(name);
    toast(name + ' takip edildi', 's');
  }
  renderProfilePage(_ppTarget);
  if (typeof rFriends === 'function') rFriends();
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
  var likeCount = post.likes ? post.likes.length : 0;
  if (!post.comments) post.comments = [];

  var html = '';

  // ── Üst yazar barı ──
  html += '<div class="pp-detail-author">';
  html += '<div class="av ' + avc + '" style="width:34px;height:34px;font-size:14px;cursor:pointer;flex-shrink:0;" onclick="openUserProfile(\'' + esc(target) + '\')">' + avInner + '</div>';
  html += '<div class="pp-detail-author-info">';
  html += '<div class="pp-detail-name">' + esc(target) + '</div>';
  html += '<div class="pp-detail-time">' + ft(post.time) + '</div>';
  html += '</div>';
  html += '<button class="pp-detail-menu-btn" onclick="togglePostMenu(event,\'' + esc(target) + '\',' + idx + ')">•••</button>';
  // Dropdown menü
  html += '<div class="pp-post-menu" id="ppPostMenu">';
  if (isMe) {
    html += '<div class="pp-post-menu-item danger" onclick="postMenuAction(\'delete\',\'' + esc(target) + '\',' + idx + ')">🗑️ Gönderiyi Sil</div>';
    html += '<div class="pp-post-menu-divider"></div>';
  }
  html += '<div class="pp-post-menu-item" onclick="postMenuAction(\'toggleComments\',\'' + esc(target) + '\',' + idx + ')">' + (post.commentsOff ? '💬 Yorumları Aç' : '🚫 Yorumları Kapat') + '</div>';
  html += '<div class="pp-post-menu-item" onclick="postMenuAction(\'toggleLikes\',\'' + esc(target) + '\',' + idx + ')">' + (post.hideLikeCount ? '❤️ Beğeni Sayısını Göster' : '🙈 Beğeni Sayısını Gizle') + '</div>';
  html += '<div class="pp-post-menu-item" onclick="postMenuAction(\'toggleShares\',\'' + esc(target) + '\',' + idx + ')">' + (post.hideShareCount ? '↗️ Paylaşım Sayısını Göster' : '🙈 Paylaşım Sayısını Gizle') + '</div>';
  html += '</div>';
  html += '</div>';

  // ── Ana görsel ──
  html += '<img class="pp-modal-img" src="' + post.img + '" alt=""/>';

  // ── Kaydırılabilir detay alanı ──
  html += '<div class="pp-detail-body">';

  // Etkileşim barı
  html += '<div class="pp-detail-actions">';
  // Animasyonlu kalp bileşeni
  html += '<div class="heart-container">';
  html += '<input type="checkbox" class="checkbox"' + (liked ? ' checked' : '') + ' onchange="toggleLikeFromHeart(\'' + esc(target) + '\',' + idx + ',this)"/>';
  html += '<div class="svg-container">';
  html += '<svg viewBox="-5 1 33 29" class="svg-outline" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 1.913C23.334 1.913 27.5 8.28 22.993 15.684C19.702 21.065 11.412 29.071 11.412 29.071C11.412 29.071 3.12 21.065 0.178 15.684C-4.334 8.28 -0.166 1.913 5.667 1.913C10.082 1.913 11.412 7.02 11.412 7.02C11.412 7.02 12.741 1.913 17.5 1.913Z"></path></svg>';
  html += '<svg viewBox="-5 1 33 29" class="svg-filled" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 1.913C23.334 1.913 27.5 8.28 22.993 15.684C19.702 21.065 11.412 29.071 11.412 29.071C11.412 29.071 3.12 21.065 0.178 15.684C-4.334 8.28 -0.166 1.913 5.667 1.913C10.082 1.913 11.412 7.02 11.412 7.02C11.412 7.02 12.741 1.913 17.5 1.913Z"></path></svg>';
  html += '<svg fill="none" viewBox="0 0 24 24" class="svg-celebrate" xmlns="http://www.w3.org/2000/svg"><polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9"></polygon><polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9"></polygon><polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9"></polygon><polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9"></polygon><polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9"></polygon><polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9"></polygon></svg>';
  html += '</div></div>';
  if (!post.commentsOff) {
    html += '<div class="pp-cmt-btn-wrap">';
    html += '<button class="pp-cmt-icon-btn" onclick="openCommentsSheet(\'' + esc(target) + '\',' + idx + ')">';
    html += '<svg stroke-linejoin="round" stroke-linecap="round" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">';
    html += '<path fill="none" d="M0 0h24v24H0z" stroke="none"></path>';
    html += '<path d="M8 9h8"></path>';
    html += '<path d="M8 13h6"></path>';
    html += '<path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"></path>';
    html += '</svg>';
    html += '</button>';
    html += '<span class="pp-cmt-tooltip">Yorum</span>';
    html += '</div>';
  }
  // Kaydet butonu
  var saved = post.savedBy && post.savedBy.includes(me ? me.name : '');
  html += '<div class="save-btn-container">';
  html += '<input type="checkbox"' + (saved ? ' checked' : '') + ' onchange="toggleSave(\'' + esc(target) + '\',' + idx + ',this)"/>';
  html += '<svg viewBox="0 0 24 24" class="save-regular" xmlns="http://www.w3.org/2000/svg"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  html += '<svg viewBox="0 0 24 24" class="save-solid" xmlns="http://www.w3.org/2000/svg"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  html += '</div>';
  if (!post.hideShareCount) {
    html += '<button class="pp-detail-act-btn" title="Paylaş">➤</button>';
  }
  html += '</div>';

  // Beğenenler satırı + beğeni sayısı
  if (!post.hideLikeCount) {
    if (likeCount > 0) {
      html += '<div class="pp-detail-likers-row">';
      html += '<div class="pp-detail-likers-avs">';
      var shown = Math.min(post.likes.length, 4);
      for (var i = 0; i < shown; i++) {
        var liker = post.likes[i];
        var lp = profiles[liker] || {};
        var lc = avColor(liker, false);
        var liInner = lp.photo
          ? '<img src="' + lp.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>'
          : (liker[0] ? liker[0].toUpperCase() : '?');
        html += '<div class="av ' + lc + ' pp-liker-av">' + liInner + '</div>';
      }
      html += '</div>';
      html += '<span class="pp-detail-likers-lbl">Beğenenler</span>';
      html += '</div>';
    }
    html += '<div class="pp-detail-like-count">' + likeCount + ' beğen</div>';
  }

  // Açıklama
  if (post.caption) {
    html += '<div class="pp-detail-caption"><span class="pp-detail-caption-name">' + esc(target) + '</span> ' + esc(post.caption) + '</div>';
  }

  // Yorumlar kısa linki (tüm yorumlar sheet'te)
  if (!post.commentsOff && post.comments.length > 0) {
    html += '<div class="pp-detail-see-all" onclick="openCommentsSheet(\'' + esc(target) + '\',' + idx + ')" style="padding:0 14px 10px;">Tüm yorumları gör (' + post.comments.length + ')</div>';
  }

  html += '</div>'; // pp-detail-body

  // ── Sabit yorum ekleme barı (yorumlar açıksa) ──
  if (!post.commentsOff) {
    var myAvc = me ? avColor(me.name, false) : 'avb';
    var myAvInner = (me && profiles[me.name] && profiles[me.name].photo)
      ? '<img src="' + profiles[me.name].photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;"/>'
      : (me && me.name[0] ? me.name[0].toUpperCase() : 'A');
    html += '<div class="pp-detail-comment-bar">';
    html += '<div class="av ' + myAvc + '" style="width:30px;height:30px;font-size:12px;border-radius:6px;flex-shrink:0;">' + myAvInner + '</div>';
    html += '<input class="pp-detail-comment-input" id="ppCommentInput_' + idx + '" placeholder="Yorum ekle..." onkeydown="if(event.key===\'Enter\')addComment(\'' + esc(target) + '\',' + idx + ')"/>';
    html += '</div>';
  } else {
    html += '<div class="pp-comments-off-bar">💬 Yorumlar kapatıldı</div>';
  }

  q('#ppViewCard').innerHTML = html;
  q('#ppViewModal').classList.add('op');
  q('#ppViewModal').onclick = function(e) { if (e.target === q('#ppViewModal')) closeViewModal(); };
}

function closeViewModal() {
  q('#ppViewModal').classList.remove('op');
  closePostMenu();
}

// ─── Post Menüsü ─────────────────────────────────
function togglePostMenu(e, target, idx) {
  e.stopPropagation();
  var menu = q('#ppPostMenu');
  if (!menu) return;
  var isOpen = menu.classList.contains('open');
  closePostMenu();
  if (!isOpen) {
    menu.classList.add('open');
    setTimeout(function() {
      document.addEventListener('click', closePostMenu, { once: true });
    }, 10);
  }
}

function closePostMenu() {
  var menu = q('#ppPostMenu');
  if (menu) menu.classList.remove('open');
}

function postMenuAction(action, target, idx) {
  closePostMenu();
  var posts = userPosts[target] || [];
  var post = posts[idx];
  if (!post) return;

  if (action === 'delete') {
    if (!me || target !== me.name) return;
    posts.splice(idx, 1);
    closeViewModal();
    renderProfilePage(me.name);
    toast('Gönderi silindi', 's');
  } else if (action === 'toggleComments') {
    post.commentsOff = !post.commentsOff;
    toast(post.commentsOff ? 'Yorumlar kapatıldı' : 'Yorumlar açıldı', 's');
    viewPost(target, idx);
  } else if (action === 'toggleLikes') {
    post.hideLikeCount = !post.hideLikeCount;
    toast(post.hideLikeCount ? 'Beğeni sayısı gizlendi' : 'Beğeni sayısı gösteriliyor', 's');
    viewPost(target, idx);
  } else if (action === 'toggleShares') {
    post.hideShareCount = !post.hideShareCount;
    toast(post.hideShareCount ? 'Paylaşım gizlendi' : 'Paylaşım gösteriliyor', 's');
    viewPost(target, idx);
  }
}

function toggleSave(target, idx, cb) {
  var posts = userPosts[target] || [];
  var post = posts[idx];
  if (!post || !me) { if (cb) cb.checked = !cb.checked; return; }
  if (!post.savedBy) post.savedBy = [];
  var li = post.savedBy.indexOf(me.name);
  if (li >= 0) post.savedBy.splice(li, 1);
  else post.savedBy.push(me.name);
  // Her tıklamada animasyonu sıfırlayıp yeniden başlat
  if (cb && cb.checked) {
    var solid = cb.parentElement.querySelector('.save-solid');
    if (solid) {
      solid.style.animation = 'none';
      void solid.offsetWidth; // reflow → animasyonu sıfırla
      solid.style.animation = 'keyframes-save-fill 0.5s';
    }
  }
  toast(post.savedBy.includes(me.name) ? '📌 Kaydedildi' : 'Kayıt kaldırıldı', 's');
}

function toggleLikeFromHeart(target, idx, cb) {
  var posts = userPosts[target] || [];
  var post = posts[idx];
  if (!post || !me) { if (cb) cb.checked = !cb.checked; return; }
  if (!post.likes) post.likes = [];
  var li = post.likes.indexOf(me.name);
  if (li >= 0) post.likes.splice(li, 1);
  else post.likes.push(me.name);

  // Beğenince animasyonu yeniden tetikle
  if (cb && cb.checked) {
    var svgContainer = cb.parentElement ? cb.parentElement.querySelector('.svg-container') : null;
    if (svgContainer) {
      var filled = svgContainer.querySelector('.svg-filled');
      var celebrate = svgContainer.querySelector('.svg-celebrate');
      if (filled) { filled.style.animation='none'; void filled.offsetWidth; filled.style.animation='keyframes-svg-filled 1s'; }
      if (celebrate) { celebrate.style.animation='none'; void celebrate.offsetWidth; celebrate.style.animation='keyframes-svg-celebrate 0.5s forwards'; }
    }
  }

  // Beğeni sayısını anında güncelle
  var lcEl = document.querySelector('.pp-detail-like-count');
  if (lcEl) lcEl.textContent = post.likes.length + ' beğen';
  setTimeout(function() { renderProfilePage(target); }, 700);
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

function addComment(target, idx) {
  var input = q('#ppCommentInput_' + idx);
  if (!input || !input.value.trim() || !me) return;
  var posts = userPosts[target] || [];
  var post = posts[idx];
  if (!post) return;
  if (!post.comments) post.comments = [];
  post.comments.push({ author: me.name, text: input.value.trim(), time: new Date() });
  viewPost(target, idx);
  toast('Yorum eklendi', 's');
}

// ─── Yorumlar Alt Paneli ─────────────────────────
var _cmtTarget = null, _cmtIdx = null;

function openCommentsSheet(target, idx) {
  _cmtTarget = target; _cmtIdx = idx;
  var backdrop = q('#cmtBackdrop'), sheet = q('#cmtSheet');
  if (!backdrop || !sheet) return;
  renderCommentsSheet();
  backdrop.classList.add('op');
  setTimeout(function() { var s = q('#cmtSheet'); if (s) s.classList.add('op'); }, 10);
}

function closeCommentsSheet() {
  var sheet = q('#cmtSheet'), backdrop = q('#cmtBackdrop');
  if (sheet) sheet.classList.remove('op');
  setTimeout(function() { var b = q('#cmtBackdrop'); if (b) b.classList.remove('op'); }, 350);
}

function renderCommentsSheet() {
  if (!_cmtTarget) return;
  var posts = userPosts[_cmtTarget] || [];
  var post = posts[_cmtIdx];
  if (!post) return;
  if (!post.comments) post.comments = [];

  var listEl = q('#cmtList'), inputEl = q('#cmtInputBar');
  if (!listEl || !inputEl) return;

  var listHtml = '';
  if (post.comments.length === 0) {
    listHtml = '<div class="cmt-empty">Henüz yorum yok. İlk yorumu sen yap!</div>';
  } else {
    for (var i = 0; i < post.comments.length; i++) {
      var c = post.comments[i];
      var cp = profiles[c.author] || {};
      var cc = avColor(c.author, false);
      var cInner = cp.photo
        ? '<img src="' + cp.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>'
        : (c.author && c.author[0] ? c.author[0].toUpperCase() : '?');
      listHtml += '<div class="cmt-item">';
      listHtml += '<div class="av ' + cc + ' cmt-av">' + cInner + '</div>';
      listHtml += '<div class="cmt-body">';
      listHtml += '<div class="cmt-meta"><span class="cmt-name">' + esc(c.author) + '</span><span class="cmt-time">' + ft(c.time) + '</span></div>';
      listHtml += '<div class="cmt-text">' + esc(c.text) + '</div>';
      listHtml += '</div>';
      listHtml += '<button class="cmt-heart">🤍</button>';
      listHtml += '</div>';
    }
  }
  listEl.innerHTML = listHtml;
  setTimeout(function() { var l = q('#cmtList'); if (l) l.scrollTop = l.scrollHeight; }, 50);

  var myAvc = me ? avColor(me.name, false) : 'avb';
  var myAvInner = (me && profiles[me.name] && profiles[me.name].photo)
    ? '<img src="' + profiles[me.name].photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>'
    : (me && me.name[0] ? me.name[0].toUpperCase() : 'A');
  inputEl.innerHTML =
    '<div class="av ' + myAvc + '" style="width:32px;height:32px;font-size:13px;border-radius:8px;flex-shrink:0;">' + myAvInner + '</div>' +
    '<input class="cmt-sheet-inp" id="cmtSheetInp" placeholder="Yorum ekle..." onkeydown="if(event.key===\'Enter\')submitSheetComment()"/>' +
    '<button class="cmt-sheet-send" onclick="submitSheetComment()">↑</button>';
}

function submitSheetComment() {
  if (!_cmtTarget) return;
  var input = q('#cmtSheetInp');
  if (!input || !input.value.trim() || !me) return;
  var posts = userPosts[_cmtTarget] || [];
  var post = posts[_cmtIdx];
  if (!post) return;
  if (!post.comments) post.comments = [];
  post.comments.push({ author: me.name, text: input.value.trim(), time: new Date() });
  input.value = '';
  renderCommentsSheet();
  viewPost(_cmtTarget, _cmtIdx);
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

// ═══════════════════════════════════════════════════
// PROFİL BİLGİ PANELİ (Engellenenler / Beğeniler)
// ═══════════════════════════════════════════════════

var _ppInfoTab = 'blocked';

function openProfileInfoPanel() {
  _ppInfoTab = 'blocked';
  renderProfileInfoPanel();
  q('#ppInfoModal').classList.add('op');
}

function closeProfileInfoPanel() {
  q('#ppInfoModal').classList.remove('op');
}

function switchInfoTab(tab) {
  _ppInfoTab = tab;
  renderProfileInfoPanel();
}

function renderProfileInfoPanel() {
  var blocked = blockedUsers[me ? me.name : ''] || [];

  // Beğenilen gönderiler: tüm kullanıcıların postlarında me.name geçenler
  var liked = [];
  Object.keys(userPosts).forEach(function(uname) {
    (userPosts[uname] || []).forEach(function(post, idx) {
      if (post.likes && post.likes.includes(me.name)) {
        liked.push({ owner: uname, post: post, idx: idx });
      }
    });
  });

  var tabHtml = '<div class="ppi-tabs">'
    + '<div class="ppi-tab' + (_ppInfoTab === 'blocked' ? ' on' : '') + '" onclick="switchInfoTab(\'blocked\')">🚫 Engellenenler <span class="ppi-badge">' + blocked.length + '</span></div>'
    + '<div class="ppi-tab' + (_ppInfoTab === 'likes' ? ' on' : '') + '" onclick="switchInfoTab(\'likes\')">❤️ Beğeniler <span class="ppi-badge">' + liked.length + '</span></div>'
    + '</div>';

  var bodyHtml = '';
  if (_ppInfoTab === 'blocked') {
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
  } else {
    if (!liked.length) {
      bodyHtml = '<div class="ppi-empty">Henüz beğendiğin gönderi yok.</div>';
    } else {
      bodyHtml = '<div class="ppi-likes-grid">';
      liked.forEach(function(item) {
        bodyHtml += '<div class="ppi-like-item" onclick="viewPost(\'' + esc(item.owner) + '\',' + item.idx + ')">'
          + '<img src="' + item.post.img + '" alt="" loading="lazy"/>'
          + '<div class="ppi-like-owner">' + esc(item.owner) + '</div>'
          + '</div>';
      });
      bodyHtml += '</div>';
    }
  }

  q('#ppInfoContent').innerHTML = tabHtml + bodyHtml;
}

// ─── Escape handler ──────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (q('#ppInfoModal') && q('#ppInfoModal').classList.contains('op')) closeProfileInfoPanel();
    else if (q('#ppHlViewer').classList.contains('op')) closeHlViewer();
    else if (q('#ppViewModal').classList.contains('op')) closeViewModal();
    else if (q('#ppAddModal').classList.contains('op')) closePostModal();
    else if (q('#ppHlAddModal').classList.contains('op')) closeHlModal();
  }
});
