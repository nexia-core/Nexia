// ══════════════════════════════════════════════════
// js/admin/stats.js — İstatistik Paneli
// ══════════════════════════════════════════════════

function rStats() {
  const el = q('#statsPanel'); if (!el) return;

  const totalMsgs = gm.filter(m => !m.type || m.type === 'msg').length
    + Object.values(convs).reduce((s, c) => s + c.msgs.filter(m => !m.isSys).length, 0);

  const msgsByUser = {};
  [...gm.filter(m => m.realName), ...Object.values(convs).flatMap(c => c.msgs)].forEach(m => {
    const name = m.realName || m.fromReal; if (!name) return;
    msgsByUser[name] = (msgsByUser[name] || 0) + 1;
  });

  const topUser = Object.entries(msgsByUser).sort((a, b) => b[1] - a[1])[0];
  const onlineCount = Object.keys(onl).length;
  const todayLogins = Object.keys(profiles).length;
  const activeConvs = Object.values(convs).filter(c => c.status === 'active').length;

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-val">${totalMsgs}</div><div class="stat-lbl">Toplam Mesaj</div></div>
      <div class="stat-card"><div class="stat-val">${onlineCount}</div><div class="stat-lbl">Şu An Çevrimiçi</div></div>
      <div class="stat-card"><div class="stat-val">${todayLogins}</div><div class="stat-lbl">Toplam Üye</div></div>
      <div class="stat-card"><div class="stat-val">${activeConvs}</div><div class="stat-lbl">Aktif Sohbet</div></div>
      <div class="stat-card"><div class="stat-val">${notes.length}</div><div class="stat-lbl">Paylaşılan Not</div></div>
      <div class="stat-card"><div class="stat-val">${stories.filter(s => !isStoryExpired(s)).length}</div><div class="stat-lbl">Aktif Hikaye</div></div>
    </div>
    <div class="stat-bar-wrap">
      <div style="font-size:11px;color:var(--t2);font-family:'Geist Mono',monospace;margin-bottom:8px;">EN AKTİF KULLANICILAR</div>
      ${Object.entries(msgsByUser).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => {
        const max = topUser ? topUser[1] : 1;
        return `<div class="stat-bar-row"><div class="stat-bar-name">${esc(n)}</div><div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.round(c / max * 100)}%"></div></div><div class="stat-bar-cnt">${c}</div></div>`;
      }).join('')}
    </div>`;
}