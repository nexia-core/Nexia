// ══════════════════════════════════════════════════
// js/features/stories.js
// ══════════════════════════════════════════════════

function isStoryExpired(s) { return Date.now() - new Date(s.time).getTime() > 24 * 60 * 60 * 1000; }

function onStoryImg(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _storyImgData = ev.target.result;
    const prev = q('#storyImgPreview'); prev.src = ev.target.result; prev.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function publishStory() {
  const text = q('#storyText').value.trim(), title = q('#storyTitle').value.trim();
  if (!text && !_storyImgData) { toast('Metin veya görsel ekle', 'w'); return; }
  stories.unshift({ id: 's' + Date.now(), author: me.name, title, text, img: _storyImgData, time: new Date(), seenBy: [] });
  _storyImgData = null; q('#storyText').value = ''; q('#storyTitle').value = '';
  const prev = q('#storyImgPreview'); if (prev) { prev.src = ''; prev.style.display = 'none'; }
  cm('storyAddModal'); rStories(); toast('Hikaye paylaşıldı! 24 saat sonra silinecek 📖', 's');
}

function rStories() {
  const el = q('#storiesBar'); if (!el) return; el.innerHTML = '';
  const addBtn = document.createElement('div'); addBtn.className = 'story-item';
  addBtn.innerHTML = `<div class="story-ring add" onclick="om('storyAddModal')">+</div><div class="story-name">Ekle</div>`;
  el.appendChild(addBtn);

  const active = stories.filter(s => !isStoryExpired(s));
  const byAuthor = {};
  active.forEach(s => { if (!byAuthor[s.author]) byAuthor[s.author] = []; byAuthor[s.author].push(s); });

  Object.entries(byAuthor).forEach(([author, stList]) => {
    const p = profiles[author] || {};
    const seen = stList.every(s => s.seenBy.includes(me?.name || ''));
    const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : author[0]?.toUpperCase() || '?';
    const item = document.createElement('div'); item.className = 'story-item';
    item.innerHTML = `<div class="story-ring${seen ? ' seen' : ''}" onclick="viewStory('${author}')"><div class="story-av-inner">${inner}</div></div><div class="story-name">${esc(author.split(' ')[0])}</div>`;
    el.appendChild(item);
  });
}

let _viewingStoryTimer = null;

function viewStory(author) {
  const stList = stories.filter(s => s.author === author && !isStoryExpired(s));
  if (!stList.length) return;
  const s = stList[0];
  if (!s.seenBy.includes(me.name)) s.seenBy.push(me.name);
  const viewer = q('#storyViewer'), content = q('#storyContent');
  const p = profiles[s.author] || {};
  const inner = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>` : s.author[0]?.toUpperCase() || '?';
  const avc = avColor(s.author, false);
  content.innerHTML = `
    <button class="story-close" onclick="closeStory()">✕</button>
    <div class="story-top"><div class="av ${avc}" style="width:36px;height:36px;font-size:14px;">${inner}</div><div class="story-user-name">${esc(s.author)}</div><div class="story-time">${ft(s.time)}</div></div>
    ${s.title ? `<div style="font-size:12px;font-weight:700;color:var(--ac);font-family:'Geist Mono',monospace;margin-bottom:6px;letter-spacing:.5px;">${esc(s.title)}</div>` : ''}
    ${s.text ? `<div class="story-text">${esc(s.text)}</div>` : ''}
    ${s.img ? `<img class="story-img" src="${s.img}" alt=""/>` : ''}`;
  const fill = q('#storyProgressFill');
  if (fill) { fill.style.animation = 'none'; fill.offsetHeight; fill.style.animation = 'storyProgress 6s linear forwards'; }
  om('storyViewer');
  if (_viewingStoryTimer) clearTimeout(_viewingStoryTimer);
  _viewingStoryTimer = setTimeout(closeStory, 6000);
  rStories();
}

function closeStory() {
  cm('storyViewer');
  if (_viewingStoryTimer) { clearTimeout(_viewingStoryTimer); _viewingStoryTimer = null; }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeStory(); });