// ══════════════════════════════════════════════════
// js/features/profile.js — Profil Kartı
// ══════════════════════════════════════════════════

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
  q('#procardTag').textContent = (p.cls ? p.cls + ' · ' : '') + (p.gender || '');
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