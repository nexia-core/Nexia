// ══════════════════════════════════════════════════
// GİRİŞ (LOCK SCREEN)
// ══════════════════════════════════════════════════

let _currentUid = null;  // Giriş yapan kullanıcının Firebase UID'si

// Block-kick yayın dinleyicisi
try {
  const _blockKickBC = new BroadcastChannel('okulnet_block_kick');
  _blockKickBC.addEventListener('message', e => {
    if (e.data?.type === 'KICKED' && me && me.name === e.data.name) showKickedScreen();
  });
} catch(e) {}

function showLoginForm()    { _showLsSection('ls-login'); }
function showRegisterForm() { _showLsSection('ls-register'); }

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

async function doLogin() {
  const errEl = q('#lerr');
  const username = (q('#loginUser')?.value || '').trim().toLowerCase();
  const password = q('#loginPw')?.value || '';
  if (!username) { errEl.textContent = 'Kullanıcı adını gir.'; return; }
  if (!password) { errEl.textContent = 'Şifreni gir.'; return; }

  // Admin kontrolü
  if (username === 'admin') {
    if (password !== ADMIN_CODE) { errEl.textContent = 'Hatalı şifre.'; return; }
    vCode = ADMIN_CODE;
    completeLogin(true, 'Admin');
    return;
  }

  errEl.textContent = 'Giriş yapılıyor...';
  try {
    if (typeof fbSignIn !== 'function') { errEl.textContent = 'Bağlantı hatası. Sayfayı yenile.'; return; }
    const user = await fbSignIn(username, password);
    _currentUid = user.uid;
    errEl.textContent = 'Bilgiler alınıyor...';
    const userData = await fbGetUserDoc(user.uid);
    if (!userData) { errEl.textContent = 'Kullanıcı verisi bulunamadı.'; return; }
    if (userData.status === 'banned')   { errEl.textContent = 'Bu hesap engellendi.'; if (typeof fbSignOut === 'function') fbSignOut(); return; }
    if (userData.status === 'pending')  { _showLsSection('ls-pending'); _listenForApproval(user.uid); return; }
    if (userData.status === 'approved') { completeUserLogin(userData); return; }
  } catch(e) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      errEl.textContent = 'Kullanıcı adı veya şifre hatalı.';
    } else {
      errEl.textContent = 'Hata: ' + (e.message || e.code || 'Bilinmeyen hata');
      console.error('Giriş hatası:', e);
    }
  }
}

async function doRegister() {
  const errEl     = q('#lerr');
  const firstName = (q('#regFirst')?.value || '').trim();
  const lastName  = (q('#regLast')?.value  || '').trim();
  const username  = (q('#regUser')?.value  || '').trim().toLowerCase();
  const password  = q('#regPw')?.value   || '';
  const password2 = q('#regPw2')?.value  || '';
  const school    = q('#regSchool')?.value || '';
  const cls       = q('#regClass')?.value  || '';
  const gender      = q('#regGender')?.value      || '';
  const orientation = q('#regOrientation')?.value || '';
  const birth       = q('#regBirth')?.value       || '';
  const terms     = q('#regTerms')?.checked;

  if (!firstName || firstName.length < 2) { errEl.textContent = 'İsim en az 2 karakter olmalı.'; return; }
  if (!lastName  || lastName.length  < 2) { errEl.textContent = 'Soyisim en az 2 karakter olmalı.'; return; }
  if (!username  || username.length  < 3) { errEl.textContent = 'Kullanıcı adı en az 3 karakter olmalı.'; return; }
  if (!/^[a-z0-9_]+$/.test(username))    { errEl.textContent = 'Kullanıcı adı sadece harf, rakam ve _ içerebilir.'; return; }
  if (username === 'admin')               { errEl.textContent = 'Bu kullanıcı adını kullanamazsın.'; return; }
  if (!password || password.length < 6)  { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; return; }
  if (password !== password2)            { errEl.textContent = 'Şifreler eşleşmiyor.'; return; }
  if (!school)                           { errEl.textContent = 'Okulunu seç.'; return; }
  if (!terms)                            { errEl.textContent = 'Kullanım şartlarını kabul etmelisin.'; return; }

  // username kontrolü kayıt sonrası auth/email-already-in-use ile yakalanır

  const USER_LIMIT = 400;
  const USER_WARN  = 300;

  errEl.textContent = 'Kayıt yapılıyor...';
  try {
    if (typeof fbRegister !== 'function') { errEl.textContent = 'Bağlantı hatası. Sayfayı yenile.'; return; }
    const user = await fbRegister(username, password);
    _currentUid = user.uid;

    // ── Kullanıcı sayısı kontrolü (auth sonrası — izin gerektirir) ──
    let userCount = 0;
    if (typeof fbGetUserCount === 'function') {
      try { userCount = await fbGetUserCount(); } catch(e) {}
    }
    if (userCount >= USER_LIMIT) {
      // Limit aşıldı — auth hesabını sil ve çık
      if (typeof fbSignOut === 'function') await fbSignOut();
      errEl.textContent = 'Platform şu an kapasitesine ulaştı (400 kullanıcı). Daha sonra tekrar dene.';
      return;
    }

    const nickname = firstName + ' ' + lastName;
    const newCount = userCount + 1;
    await fbSaveUserDoc(user.uid, {
      uid: user.uid, username, nickname, firstName, lastName, school,
      class: cls || null, gender: gender || null, orientation: orientation || null,
      birthDate: birth || null, bio: null,
      status: 'approved', isAdmin: false, photoURL: null,
      createdAt: new Date().toISOString()
    });

    // 300 kullanıcı uyarısı admin'e bildir
    if (newCount >= USER_WARN && newCount < USER_WARN + 5) {
      const noticeId = 'user_warn_300';
      inbox.unshift({ id: noticeId, type: 'security', from: 'Sistem',
        text: '⚠️ Kullanıcı sayısı ' + newCount + '\'e ulaştı! Limit: 400. Platform dolmadan önlem al.',
        time: new Date(), read: false, reply: '' });
      if (typeof fbSaveAdminNotice === 'function') {
        fbSaveAdminNotice(noticeId, '⚠️ Kullanıcı sayısı ' + newCount + '\'e ulaştı! Limit: 400.');
      }
    }

    errEl.textContent = 'Giriş yapılıyor...';
    const userData = await fbGetUserDoc(user.uid);
    if (userData) { errEl.textContent = ''; completeUserLogin(userData); }
    else errEl.textContent = 'Profil kaydedilemedi. Lütfen tekrar dene.';
  } catch(e) {
    if (e.code === 'auth/email-already-in-use') {
      errEl.textContent = 'Bu kullanıcı adı zaten kayıtlı. Giriş yapmayı dene.';
    } else if (e.code === 'permission-denied' || (e.message && e.message.includes('permission'))) {
      errEl.textContent = 'Kayıt izni hatası. Lütfen yöneticiyle iletişime geç.';
      console.error('Firestore izin hatası:', e);
    } else {
      errEl.textContent = 'Kayıt başarısız: ' + (e.message || e.code || 'Bilinmeyen hata');
      console.error('Kayıt hatası:', e);
    }
  }
}

function completeLogin(isAd, name) {
  const aid = 'Anonim#' + Math.floor(1000 + Math.random() * 9000);
  me = { name, code: vCode, isAdmin: isAd, anonId: aid };

  const savedAct = isAd ? 'hidden' : (savedActivity[name] || 'online');
  if (!profiles[name]) {
    profiles[name] = { cls:'', age:'', bio:'', gender:'', orientation:'', visNormal:true, visAnon:false, photo:null, actStatus:savedAct };
  } else {
    profiles[name].actStatus = savedAct;
  }
  if (savedAct !== 'hidden') onl[name] = true;
  aReg[aid] = name;

  q('#lock').style.display = 'none';
  q('#app').style.display = 'flex';

  updateMyAv();
  updateMyStatusDot();

  if (isAd) {
    q('#ta').style.display = '';
    q('#tfr').style.display = '';
    q('#myAv').className = 'av avo';
    q('#tw').style.display = 'none';
  }

  demo();
  gm.push({ type:'sys', text:"Nexia'ya hoş geldiniz. Saygılı iletişim hepimizin sorumluluğu." });
  rG(); rDL(); buildThemeGrid(); rStories(); rChannels();

  // ── Firebase tam entegrasyonu ──────────────────
  if (typeof startFirebaseChat  === 'function') startFirebaseChat();
  if (typeof fbSeedCodes        === 'function') fbSeedCodes();
  if (typeof fbListenCodes      === 'function') fbListenCodes();
  if (typeof fbListenProfiles   === 'function') fbListenProfiles();
  if (typeof fbListenOnline     === 'function') fbListenOnline();
  if (isAd) {
    if (typeof fbListenReports  === 'function') fbListenReports();
  }
  if (!isAd) {
    if (typeof fbSetOnline      === 'function') fbSetOnline(name);
    if (typeof fbListenMyConvs  === 'function') fbListenMyConvs(name);
  }
  // Sayfa kapanınca offline yap
  window.addEventListener('beforeunload', () => {
    if (typeof fbSetOffline === 'function' && me) fbSetOffline(me.name);
  });

  // ── YENİ: Güvenlik zinciri ──────────────────────
  _securityOnLogin(isAd, name);
  // ───────────────────────────────────────────────

  if (isAd) { rA(); toast('Admin paneline hoş geldin 👁', 'w'); }
  else toast('Giriş başarılı, ' + name + '!', 's');
}

// ══════════════════════════════════════════════════
// GÜVENLİK ZİNCİRİ — completeLogin içinden çağrılır
// ══════════════════════════════════════════════════

function _securityOnLogin(isAd, name) {
  // Admin monitör — giriş geçmişi & aktif oturumlar
  if (typeof recordLogin === 'function') recordLogin(name, vCode, isAd);

  // 19 — Cihaz parmak izi & çift hesap kontrolü
  _deviceTrackLogin(name, isAd);

  // 22 — Güvenilir cihaz kontrolü
  _trustedDeviceCheck(name, isAd);

  // 23 — Kullanıcı giriş geçmişine kaydet
  _recordMyLogin(name, isAd);

  // 24 — Oturum süre sayacını başlat
  if (!isAd) _sessionStart();

  // 25 — Eş zamanlı giriş engeli
  if (!isAd) _concurrentLoginInit(name);

  // Şikayet sistemini başlat (20)
  _initReportContextMenu();
}

// ══════════════════════════════════════════════════
// 19 — CİHAZ TAKİBİ & ÇİFT HESAP UYARISI
// ══════════════════════════════════════════════════

function _getFingerprint() {
  const parts = [
    navigator.userAgent, navigator.language,
    screen.width + 'x' + screen.height, screen.colorDepth,
    new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 0,
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  return 'fp_' + Math.abs(hash).toString(36);
}

function _deviceTrackLogin(name, isAd) {
  const fp = _getFingerprint();
  let db = {};
  try { db = JSON.parse(localStorage.getItem('okulnet_devices') || '{}'); } catch {}

  const prev = db[fp] || [];
  const otherAccounts = prev.filter(e => e.name !== name);

  if (otherAccounts.length > 0) {
    const names = otherAccounts.map(e => e.name).join(', ');
    const msg = {
      id: 'dt_' + Date.now(), type: 'security', from: 'Sistem',
      text: '⚠️ Çift Hesap: "' + name + '" ve "' + names + '" aynı cihazdan giriş yaptı. (Cihaz: ' + fp + ')',
      time: new Date(), read: false, reply: '',
    };
    inbox.unshift(msg);
    securityEvents.unshift({ id: 'se_' + Date.now(), icon: '⚠️', title: 'Çift Hesap', detail: name + ' + ' + names + ' aynı cihaz', time: new Date() });
  }

  // Cihazı kaydet
  const existing = prev.findIndex(e => e.name === name);
  if (existing >= 0) prev[existing].lastSeen = Date.now();
  else prev.push({ name, firstSeen: Date.now(), lastSeen: Date.now() });
  db[fp] = prev;
  try { localStorage.setItem('okulnet_devices', JSON.stringify(db)); } catch {}

  // deviceRegistry global state'e de ekle
  if (!deviceRegistry[fp]) deviceRegistry[fp] = [];
  const idx = deviceRegistry[fp].findIndex(e => e.name === name);
  if (idx >= 0) deviceRegistry[fp][idx].lastSeen = new Date();
  else deviceRegistry[fp].push({ name, firstSeen: new Date(), lastSeen: new Date(), fp });
}

// ══════════════════════════════════════════════════
// 22 — GÜVENİLİR CİHAZ
// ══════════════════════════════════════════════════

function _trustedDeviceCheck(name, isAd) {
  if (isAd) return;
  const fp  = _getFingerprint();
  let db = {};
  try { db = JSON.parse(localStorage.getItem('okulnet_trusted') || '{}'); } catch {}
  const key = name + '|' + fp;

  if (db[key]) {
    // Bilinen cihaz — güncelle
    db[key].lastSeen = Date.now();
    try { localStorage.setItem('okulnet_trusted', JSON.stringify(db)); } catch {}
    return;
  }

  // Bilinmeyen cihaz — admin'e bildir
  inbox.unshift({
    id: 'td_' + Date.now(), type: 'security', from: 'Sistem',
    text: '🔐 Yeni Cihaz: "' + name + '" bilinmeyen cihazdan giriş yaptı. (' + fp + ')',
    time: new Date(), read: false, reply: '',
  });
  securityEvents.unshift({ id: 'se_' + Date.now(), icon: '🔐', title: 'Yeni Cihaz', detail: name + ' — ' + fp, time: new Date() });

  // Kullanıcıya modal göster
  const modal = q('#trustedDeviceModal');
  if (modal) {
    q('#tdModalName').textContent = name;
    modal.style.display = 'flex';
    q('#tdTrustBtn').onclick  = () => { db[key] = { name, fp, savedAt: Date.now() }; try { localStorage.setItem('okulnet_trusted', JSON.stringify(db)); } catch {} modal.style.display = 'none'; toast('Cihaz güvenilir kaydedildi 🔐', 's'); };
    q('#tdSkipBtn').onclick   = () => { modal.style.display = 'none'; };
  }
}

// ══════════════════════════════════════════════════
// 23 — KULLANICI GİRİŞ GEÇMİŞİ
// ══════════════════════════════════════════════════

function _recordMyLogin(name, isAd) {
  if (isAd) return;
  const ua = navigator.userAgent;
  const device  = /iPhone|iPad/.test(ua) ? '📱 iOS' : /Android/.test(ua) ? '📱 Android' : /Windows/.test(ua) ? '💻 Windows' : /Mac/.test(ua) ? '💻 macOS' : '🌐 Diğer';
  const browser = /Firefox\//.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Tarayıcı';
  const entry = { id: 'lh_' + Date.now(), time: Date.now(), device, browser, fp: _getFingerprint(), current: true };

  let db = {};
  try { db = JSON.parse(localStorage.getItem('okulnet_my_logins') || '{}'); } catch {}
  if (!db[name]) db[name] = [];
  db[name].forEach(e => e.current = false);
  db[name].unshift(entry);
  if (db[name].length > 50) db[name] = db[name].slice(0, 50);
  try { localStorage.setItem('okulnet_my_logins', JSON.stringify(db)); } catch {}
}

function openLoginHistory() {
  const modal = q('#loginHistoryModal');
  if (!modal || !me) return;
  let db = {};
  try { db = JSON.parse(localStorage.getItem('okulnet_my_logins') || '{}'); } catch {}
  const list = db[me.name] || [];
  const el = q('#myLoginHistoryList');
  el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Giriş kaydı bulunamadı.</div>'; }
  else list.forEach(entry => {
    const d   = document.createElement('div');
    const dt  = new Date(entry.time);
    const diffMin = Math.floor((Date.now() - entry.time) / 60000);
    const diffTxt = diffMin < 60 ? diffMin + ' dk önce' : diffMin < 1440 ? Math.floor(diffMin/60) + ' sa önce' : dt.toLocaleDateString('tr-TR');
    d.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--bd);display:flex;gap:10px;align-items:flex-start;';
    d.innerHTML = `
      <div style="font-size:20px">${entry.device.split(' ')[0]}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${esc(entry.device)} · ${esc(entry.browser)}
          ${entry.current ? '<span style="font-size:10px;background:var(--gn-d);color:var(--gn);padding:1px 6px;border-radius:3px;margin-left:4px;">Aktif</span>' : ''}
        </div>
        <div style="font-size:12px;color:var(--t2);margin-top:2px">${dt.toLocaleString('tr-TR')} — ${diffTxt}</div>
        <div style="font-size:11px;color:var(--t3);font-family:'Geist Mono',monospace">${entry.fp}</div>
      </div>`;
    el.appendChild(d);
  });
  modal.style.display = 'flex';
}

function closeLoginHistory() {
  const m = q('#loginHistoryModal'); if (m) m.style.display = 'none';
}

function reportSuspiciousLogin() {
  inbox.unshift({ id: 'sl_' + Date.now(), type: 'security', from: me.name,
    text: '⚠️ Şüpheli Giriş Bildirimi: "' + me.name + '" kendi hesabında şüpheli giriş tespit etti.',
    time: new Date(), read: false, reply: '' });
  securityEvents.unshift({ id: 'se_' + Date.now(), icon: '⚠️', title: 'Şüpheli Giriş', detail: me.name + ' kendi hesabını bildirdi', time: new Date() });
  closeLoginHistory();
  toast('Bildirim admin\'e iletildi ✅', 's');
}

// ══════════════════════════════════════════════════
// 24 — OTURUM SÜRESİ (30 DAKİKA)
// ══════════════════════════════════════════════════

let _sessionDeadline        = null;
let _sessionInterval        = null;
let _sessionWarned          = false;
let _sessionListenersAdded  = false;

function _sessionStart() {
  _sessionDeadline = Date.now() + 30 * 60 * 1000;
  _sessionWarned   = false;
  if (_sessionInterval) clearInterval(_sessionInterval);
  _sessionInterval = setInterval(_sessionTick, 10000);
  if (!_sessionListenersAdded) {
    ['click','keypress','touchstart'].forEach(e => document.addEventListener(e, _sessionRefresh, { passive: true }));
    _sessionListenersAdded = true;
  }
}

function _sessionRefresh() {
  _sessionDeadline = Date.now() + 30 * 60 * 1000;
  _sessionWarned   = false;
  const banner = q('#sessionWarningBanner');
  if (banner) banner.style.display = 'none';
  if (typeof activeSessions !== 'undefined' && me?.name && activeSessions[me.name]) {
    activeSessions[me.name].lastActive = new Date();
  }
}

function _sessionTick() {
  if (!_sessionDeadline || !me) return;
  const remaining = _sessionDeadline - Date.now();
  if (remaining <= 0) {
    clearInterval(_sessionInterval);
    toast('Oturum süreniz doldu, yönlendiriliyorsunuz...', 'w');
    setTimeout(() => location.reload(), 2500);
    return;
  }
  if (remaining <= 60000 && !_sessionWarned) {
    _sessionWarned = true;
    const banner = q('#sessionWarningBanner');
    if (banner) banner.style.display = 'flex';
  }
  if (_sessionWarned) {
    const el = q('#sessionCountdown');
    if (el) el.textContent = Math.ceil(remaining / 1000);
  }
}

function sessionExtend() {
  _sessionRefresh();
  toast('Oturum uzatıldı ✅', 's');
}

// ══════════════════════════════════════════════════
// 25 — EŞ ZAMANLI GİRİŞ ENGELİ
// ══════════════════════════════════════════════════

const _tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2);

function _concurrentLoginInit(name) {
  const key = 'okulnet_session_' + name;

  if (typeof BroadcastChannel !== 'undefined') {
    _concurrentChannel = new BroadcastChannel('okulnet_' + name);
    _concurrentChannel.onmessage = evt => {
      if (evt.data?.type === 'NEW_SESSION' && evt.data.tabId !== _tabId) {
        _concurrentKicked(name);
      }
    };
    _concurrentChannel.postMessage({ type: 'NEW_SESSION', tabId: _tabId });
    window.addEventListener('beforeunload', () => { if (_concurrentChannel) _concurrentChannel.close(); });
  } else {
    // localStorage fallback
    const existing = JSON.parse(localStorage.getItem(key) || 'null');
    if (existing && Date.now() - existing.ts < 15000) {
      _notifyConcurrent(name);
    }
    localStorage.setItem(key, JSON.stringify({ tabId: _tabId, ts: Date.now() }));
    setInterval(() => localStorage.setItem(key, JSON.stringify({ tabId: _tabId, ts: Date.now() })), 5000);
    window.addEventListener('beforeunload', () => {
      const s = JSON.parse(localStorage.getItem(key) || 'null');
      if (s?.tabId === _tabId) localStorage.removeItem(key);
    });
  }
}

function _concurrentKicked(name) {
  _notifyConcurrent(name);
  toast('Bu hesap başka bir cihazdan açıldı. Çıkış yapılıyor...', 'e');
  setTimeout(() => location.reload(), 2500);
}

function _notifyConcurrent(name) {
  inbox.unshift({ id: 'cl_' + Date.now(), type: 'security', from: 'Sistem',
    text: '🔴 Eş Zamanlı Giriş: "' + name + '" aynı anda iki cihazdan açıldı.',
    time: new Date(), read: false, reply: '' });
  securityEvents.unshift({ id: 'se_' + Date.now(), icon: '🔴', title: 'Çift Giriş', detail: name + ' iki cihazdan aynı anda', time: new Date() });
}

// ══════════════════════════════════════════════════
// 20 — ŞİKAYET SİSTEMİ (SAĞ TIK MENÜSÜ)
// ══════════════════════════════════════════════════

let _reportTargetId   = null;
let _reportTargetText = '';

function _initReportContextMenu() {
  document.addEventListener('contextmenu', e => {
    const msgEl = e.target.closest('[data-msg-id]');
    if (!msgEl) return;
    e.preventDefault();
    _reportTargetId   = msgEl.dataset.msgId;
    _reportTargetText = msgEl.dataset.msgText || '';
    const menu = q('#reportMenu');
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.left = Math.min(e.clientX, window.innerWidth  - 180) + 'px';
    menu.style.top  = Math.min(e.clientY, window.innerHeight - 120) + 'px';
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#reportMenu')) {
      const m = q('#reportMenu'); if (m) m.style.display = 'none';
    }
  });
}

function openReportModal() {
  const m = q('#reportMenu'); if (m) m.style.display = 'none';
  if (!_reportTargetId) return;
  document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
  const note = q('#reportNote'); if (note) note.value = '';
  const modal = q('#reportModal'); if (modal) modal.style.display = 'flex';
}

function closeReport() {
  const m = q('#reportModal'); if (m) m.style.display = 'none';
  _reportTargetId = null;
}

function submitReport() {
  const reason = document.querySelector('input[name="reportReason"]:checked')?.value;
  const note   = q('#reportNote')?.value.trim() || '';
  if (!reason) { toast('Bir sebep seç', 'w'); return; }

  const allMsgs = [...gm, ...Object.values(convs).flatMap(c => c.msgs || []), ...channels.flatMap(ch => ch.msgs || [])];
  const target  = allMsgs.find(m => String(m.id) === String(_reportTargetId));

  // Mesajın hangi konuşmada/kanalda olduğunu bul
  let msgContext = 'global';
  let msgContextId = null;
  if (target) {
    const inConv = Object.values(convs).find(c => (c.msgs||[]).some(m => String(m.id) === String(_reportTargetId)));
    const inCh   = channels.find(ch => (ch.msgs||[]).some(m => String(m.id) === String(_reportTargetId)));
    if (inConv) { msgContext = 'dm'; msgContextId = inConv.id; }
    else if (inCh) { msgContext = 'channel'; msgContextId = inCh.id; }
  }

  const report = {
    id: 'rp_' + Date.now(), reporter: me.name,
    msgId: _reportTargetId, msgText: target?.text || _reportTargetText,
    msgAuthor: target?.name || target?.from || 'Bilinmiyor',
    reason, note, time: new Date(), reviewed: false,
    msgContext, msgContextId,
  };
  reports.unshift(report);
  if (typeof fbSaveReport === 'function') fbSaveReport(report);

  inbox.unshift({ id: 'rp_ib_' + Date.now(), type: 'report', from: me.name,
    text: '🚩 Şikayet: "' + report.msgAuthor + '" kullanıcısı — ' + reason + (note ? ' | ' + note : '') + '\nMesaj: "' + report.msgText.substring(0, 80) + '"',
    time: new Date(), read: false, reply: '' });
  securityEvents.unshift({ id: 'se_' + Date.now(), icon: '🚩', title: 'Şikayet', detail: report.msgAuthor + ' — ' + reason, time: new Date() });

  closeReport();
  toast('Şikayet iletildi ✅', 's');
}

// ══════════════════════════════════════════════════
// 21 — ENGELLEME
// ══════════════════════════════════════════════════

function blockUser(targetName) {
  if (!targetName || targetName === me?.name) return;
  if (!blockedUsers[me.name]) blockedUsers[me.name] = [];
  if (blockedUsers[me.name].includes(targetName)) { toast(targetName + ' zaten engellenmiş', 'w'); return; }
  blockedUsers[me.name].push(targetName);
  if (me.isAdmin) {
    // Admin engeli: sistemden at
    _saveKickedUser(targetName);
    try {
      const bc = new BroadcastChannel('okulnet_block_kick');
      bc.postMessage({ type: 'KICKED', name: targetName });
      bc.close();
    } catch(e) {}
  }
  toast(targetName + ' engellendi 🚫', 's');
  rG();
  if (typeof rDL === 'function') rDL();
}

function unblockUser(targetName) {
  if (!blockedUsers[me?.name]) return;
  const idx = blockedUsers[me.name].indexOf(targetName);
  if (idx >= 0) {
    blockedUsers[me.name].splice(idx, 1);
    // Sadece admin engeli kicked listesini etkiler
    if (me.isAdmin) {
      const stillAdminBlocked = Object.entries(blockedUsers).some(([blocker, list]) => {
        const blockerIsAdmin = blocker === 'Admin';
        return blockerIsAdmin && list.includes(targetName);
      });
      if (!stillAdminBlocked) _removeKickedUser(targetName);
    }
    toast(targetName + ' engeli kaldırıldı', 's');
    rG();
  }
}

function isBlockedByMe(name) {
  return (blockedUsers[me?.name] || []).includes(name);
}

function shouldHideMessage(msg) {
  const author = msg.realName || msg.fromReal || msg.from || msg.name;
  if (!author) return false;
  if (isBlockedByMe(author)) return true;
  // Karşılıklı: onlar beni engellediyse de gizle
  if (me && (blockedUsers[author] || []).includes(me.name)) return true;
  return false;
}

// ─── Kicked kullanıcı yönetimi ───────────────────
function _saveKickedUser(name) {
  try {
    const k = JSON.parse(localStorage.getItem('on_kicked') || '[]');
    if (!k.includes(name)) { k.push(name); localStorage.setItem('on_kicked', JSON.stringify(k)); }
  } catch(e) {}
}

function _removeKickedUser(name) {
  try {
    const k = JSON.parse(localStorage.getItem('on_kicked') || '[]');
    const i = k.indexOf(name);
    if (i >= 0) { k.splice(i, 1); localStorage.setItem('on_kicked', JSON.stringify(k)); }
  } catch(e) {}
}

function _isKickedUser(name) {
  try { return JSON.parse(localStorage.getItem('on_kicked') || '[]').includes(name); } catch(e) { return false; }
}

function showKickedScreen() {
  me = null;
  q('#app').style.display = 'none';
  q('#lock').style.display = 'none';
  q('#kickedScreen').style.display = 'flex';
}

function renderBlockedList(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const list = blockedUsers[me?.name] || [];
  el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div style="color:var(--t3);font-size:13px;">Engellenen yok.</div>'; return; }
  list.forEach(name => {
    const d = document.createElement('div'); d.className = 'mon-entry';
    d.innerHTML = `<span class="mon-name">🚫 ${esc(name)}</span><button class="ts tg" onclick="unblockUser('${esc(name)}');renderBlockedList('${containerId}')">Kaldır</button>`;
    el.appendChild(d);
  });
}

// ══════════════════════════════════════════════════
// 27 — HESAP KİLİTLEME (KULLANICI TARAFLI)
// ══════════════════════════════════════════════════

function openSelfFreezeModal() {
  if (!me) return;
  if (typeof frozenAccounts !== 'undefined' && frozenAccounts.has(me.name)) { toast('Hesabın zaten dondurulmuş', 'w'); return; }
  if (freezeRequests.find(r => r.name === me.name && r.status === 'pending')) { toast('Admin onayı bekleniyor...', 'w'); return; }
  const m = q('#selfFreezeModal'); if (m) { q('#selfFreezeReason').value = ''; m.style.display = 'flex'; }
}

function closeSelfFreezeModal() {
  const m = q('#selfFreezeModal'); if (m) m.style.display = 'none';
}

function submitSelfFreeze() {
  const reason = q('#selfFreezeReason')?.value.trim() || 'Sebep belirtilmedi';
  const req = { id: 'fr_' + Date.now(), name: me.name, code: me.code, reason, time: new Date(), status: 'pending', reviewedBy: null };
  freezeRequests.unshift(req);
  inbox.unshift({ id: 'fr_ib_' + Date.now(), type: 'freeze_request', from: me.name,
    text: '🔒 Hesap Kilitleme İsteği: "' + me.name + '" hesabını kilitlemek istiyor.\nSebep: ' + reason,
    time: new Date(), read: false, reply: '', freezeRequestId: req.id });
  securityEvents.unshift({ id: 'se_' + Date.now(), icon: '🔒', title: 'Kilitleme İsteği', detail: me.name + ' — ' + reason, time: new Date() });
  closeSelfFreezeModal();
  toast('İstek admin\'e iletildi ✅', 's');
}


// ══════════════════════════════════════════════════
// AVATAR & DURUM
// ══════════════════════════════════════════════════

function updateMyAv() {
  const p = profiles[me.name], el = q('#myAv');
  if (p && p.photo) el.innerHTML = `<img src="${p.photo}" alt=""/>`;
  else el.innerHTML = me.name[0].toUpperCase();
}

function updateMyStatusDot() {
  const p = profiles[me.name], dot = q('#myStatusDot');
  dot.className = 'status-dot ' + (p && p.actStatus === 'hidden' ? 'hidden' : 'online');
}

// ══════════════════════════════════════════════════
// DEMO VERİSİ
// ══════════════════════════════════════════════════

let _demoLoaded = false;
function demo() {
  if (_demoLoaded) return; _demoLoaded = true;
  profiles['Ayşe Kaya']    = { cls:'10-A', age:'16', bio:'Matematik ve resim seviyorum! 🎨', gender:'Kız',   visNormal:true,  visAnon:false, photo:null, actStatus:'online' };
  profiles['Mehmet Demir'] = { cls:'11-B', age:'17', bio:'Basketbol + müzik = hayat.',       gender:'Erkek', visNormal:true,  visAnon:true,  photo:null, actStatus:'hidden' };
  profiles['Ahmet Yılmaz'] = { cls:'9-C',  age:'15', bio:'',                                 gender:'Erkek', visNormal:false, visAnon:false, photo:null, actStatus:'online' };
  profiles['Zeynep Çelik'] = { cls:'10-A', age:'16', bio:'Kitap okumayı ve fotoğraf çekmeyi seviyorum 📷', gender:'Kız', visNormal:true, visAnon:true, photo:null, actStatus:'online' };

  const demoAnon = 'Anonim#5512';
  aReg[demoAnon] = 'Zeynep Çelik';

  [
    { name:'Ayşe Kaya',    text:'Yarın sınav var mı?',                  anon:false },
    { name:'Mehmet Demir', text:'10-A bugün kütüphanede mi?',           anon:false },
    { name:demoAnon,       text:'Birinin silindir defterini gördüm 😅', anon:true, real:'Zeynep Çelik' },
  ].forEach((m, i) => {
    gm.push({ id:Date.now()-i*80000, name:m.name, realName:m.real||m.name, text:m.text, isAnon:m.anon, time:new Date(Date.now()-i*80000), reactions:{}, replyTo:null });
    mld.push({ who:m.name, real:m.real||m.name, isAnon:m.anon, text:m.text, time:new Date() });
  });

  convs['demo1'] = { id:'demo1', from:'Mehmet Demir', fromReal:'Mehmet Demir', to:me.name, toReal:me.name, status:'pending', msgs:[], fromAnon:false, toAnon:false, note:'', isGroup:false };
  q('#dmDot').style.display = '';

  inbox.push({ id:'ib1', from:'Ayşe Kaya', fromReal:'Ayşe Kaya', fromAnonId:null, isAnon:false, text:'Matematik ödevinde yardım lazım, müsait misin?', time:new Date(Date.now()-3600000), read:false, reply:'' });

  stories.push({ id:'s1', author:'Ayşe Kaya',    title:'Bugün', text:'Bugün matematik sınavından 95 aldım! 🎉 Çok mutluyum!',             img:null, time:new Date(Date.now()-1800000), seenBy:[] });
  stories.push({ id:'s2', author:'Zeynep Çelik', title:'',      text:'Kütüphane bugün çok kalabalıktı 📚 Ama güzel bir gün geçirdim.',     img:null, time:new Date(Date.now()-3600000), seenBy:[] });

  channels[0].members = ['Ayşe Kaya', 'Zeynep Çelik'];
  channels[0].msgs.push({ id:Date.now()-5000, from:'Ayşe Kaya',    text:'Yarın sınav var mı? 🤔',                 time:new Date(Date.now()-1800000) });
  channels[2].members = ['Ahmet Yılmaz', 'Mehmet Demir'];
  channels[2].msgs.push({ id:Date.now()-4000, from:'Mehmet Demir', text:'Trigonometri konusunda yardım lazım 📐', time:new Date(Date.now()-900000) });
}

// ══════════════════════════════════════════════════
// SEKMELER (TABS)
// ══════════════════════════════════════════════════

function sw(t) {
  ['g','d','ch','bot','pr','fr','w','a','settings'].forEach(x => {
    const p = document.getElementById('p' + x);
    const b = document.getElementById('t' + x);
    if (p) p.classList.toggle('on', x === t);
    if (b) b.classList.toggle('on', x === t);
  });
  if (t === 'g')      { setTimeout(() => sbot('gMsgs'), 60); _newMsgCount = 0; const b = q('#newMsgBadge'); if(b) b.style.display='none'; }
  if (t === 'd')      { q('#dmDot').style.display = 'none'; rDL(); }
  if (t === 'a')      { rA(); rMonitor(); rSuspiciousMessages(); }
  if (t === 'w')      rMyW();
  if (t === 'bot')    initBot();
  if (t === 'fr')     rFriends();
  if (t === 'ch')     rChannels();
  if (t === 'pr')     renderProfilePage();
  if (t === 'settings') {
    const main = document.getElementById('settingsMainView');
    const help = document.getElementById('settingsHelpView');
    const privacy = document.getElementById('settingsPrivacyView');
    if (main) main.style.display = '';
    if (help) help.style.display = 'none';
    if (privacy) privacy.style.display = 'none';
  }
}

function openSettingsBlockedUsers() {
  const el = q('#settingsBlockedContent');
  if (!el) return;
  renderBlockedList('settingsBlockedContent');
  om('settingsBlockedModal');
}

// ══════════════════════════════════════════════════
// ANONİM TOGGLE
// ══════════════════════════════════════════════════

function togA() {
  isAnon = !isAnon;
  const p = q('#apill'), l = q('#albl'), inp = q('#gInp'), sb = q('#gSb'), h = q('#gHint');
  if (isAnon) {
    p.classList.add('on'); l.textContent = 'Anonim: Açık';
    inp.classList.add('am'); inp.placeholder = 'Anonim olarak yazıyorsun...';
    sb.className = 'sb a'; h.className = 'hint am';
    h.textContent = me.anonId + ' olarak görünürsün';
    q('#myAv').className = 'av avp'; q('#myAv').innerHTML = '?';
  } else {
    p.classList.remove('on'); l.textContent = 'Anonim: Kapalı';
    inp.classList.remove('am'); inp.placeholder = 'Herkese yaz...';
    sb.className = 'sb n'; h.className = 'hint';
    h.textContent = 'Enter → gönder · Shift+Enter → yeni satır';
    q('#myAv').className = me.isAdmin ? 'av avo' : 'av ' + avColor(me.name, false);
    updateMyAv();
  }
}

// ══════════════════════════════════════════════════
// AKTİVİTE DURUMU
// ══════════════════════════════════════════════════

function setActStatus(val) {
  _tempActStatus = val;
  q('#actOnlineBtn').className = 'act-opt' + (val === 'online' ? ' sel-online' : '');
  q('#actHiddenBtn').className = 'act-opt' + (val === 'hidden' ? ' sel-hidden' : '');
}

// ══════════════════════════════════════════════════
// FOTOĞRAF
// ══════════════════════════════════════════════════

function onPhotoFile(e) {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast("Fotoğraf 5MB'dan büyük olamaz", 'e'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const url = ev.target.result;
    q('#myPhotoPreviewInner').innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    q('#removePhotoBtn').style.display = '';
    q('#myPhotoPreview').dataset.tempPhoto = url;
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  q('#myPhotoPreviewInner').innerHTML = me ? me.name[0].toUpperCase() : '?';
  q('#myPhotoPreview').dataset.tempPhoto = '';
  q('#removePhotoBtn').style.display = 'none';
}

// ══════════════════════════════════════════════════
// PROFİL POPUP (Diğer kullanıcılar)
// ══════════════════════════════════════════════════

function showProfile(displayName, isAnonMsg) {
  if (!isAnonMsg && displayName === me.name) { openMyProfile(); return; }

  // Anonim değilse tam profil sayfasına yönlendir
  if (!isAnonMsg) {
    openUserProfile(displayName);
    return;
  }

  // Anonim mesajlar: profil gösterme, direkt mesaj gönder
  if (typeof openDmModeModal === 'function') openDmModeModal(displayName);
  return;

  // Anonim mesajlar için küçük modal göster (kullanılmıyor)
  const realName = aReg[displayName] || null;
  const prof = realName ? profiles[realName] : null;

  const profAvEl = q('#profAv');
  profAvEl.className = 'prof-av avp';
  profAvEl.innerHTML = '?';

  q('#profName').textContent = displayName;
  q('#profBadge').textContent = 'anonim'; q('#profBadge').className = 'prof-badge anon';

  const infoArea = q('#profInfoArea');
  infoArea.innerHTML = '';

  if (me.isAdmin && realName) {
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--wn-d);border:1px solid rgba(255,170,0,.25);border-radius:7px;padding:8px 12px;font-size:12px;color:var(--wn);font-family:Geist Mono,monospace;margin-bottom:12px;';
    box.textContent = '👁 Gerçek kimlik: ' + realName;
    infoArea.appendChild(box);
  }

  const showInfo = prof && prof.visAnon;
  if (showInfo && prof.bio) {
    const bioEl = document.createElement('div');
    bioEl.className = 'prof-bio'; bioEl.textContent = prof.bio;
    infoArea.appendChild(bioEl);
  }
  if (showInfo && (prof.cls || prof.age || prof.gender)) {
    const box = document.createElement('div');
    box.className = 'prof-info';
    if (prof.cls)    box.innerHTML += `<div class="pi-row"><span class="pi-lbl">SINIF</span><span class="pi-val">${esc(prof.cls)}</span></div>`;
    if (prof.age)    box.innerHTML += `<div class="pi-row"><span class="pi-lbl">YAŞ</span><span class="pi-val">${esc(prof.age)}</span></div>`;
    if (prof.gender) box.innerHTML += `<div class="pi-row"><span class="pi-lbl">CİNSİYET</span><span class="pi-val">${esc(prof.gender)}</span></div>`;
    infoArea.appendChild(box);
  } else if (!prof || !showInfo) {
    const em = document.createElement('div');
    em.className = 'prof-empty'; em.textContent = 'Kullanıcı bilgilerini gizlemiş.';
    infoArea.appendChild(em);
  }

  const btns = q('#profBtns');
  btns.innerHTML = '';

  const b1 = document.createElement('button');
  b1.className = 'prof-btn pb-ac';
  b1.innerHTML = '💬 Sohbet İsteği Gönder';
  b1.onclick = () => { cm('profOverlay'); openDmModeModal(displayName); };
  btns.appendChild(b1);

  const bc = document.createElement('button');
  bc.className = 'prof-btn pb-close'; bc.textContent = 'Kapat';
  bc.onclick = () => cm('profOverlay');
  btns.appendChild(bc);

  om('profOverlay');
  q('#profOverlay').onclick = e => { if (e.target === q('#profOverlay')) cm('profOverlay'); };
}

// ══════════════════════════════════════════════════
// DM MOD MODAL
// ══════════════════════════════════════════════════

function openDmModeModal(targetName) {
  // Zaten mevcut sohbet varsa direkt aç
  const targetReal = (typeof aReg !== 'undefined' && aReg[targetName]) || targetName;
  const ex = Object.keys(convs).find(k => {
    const c = convs[k];
    return !c.isGroup && ((c.fromReal === me.name && c.toReal === targetReal) || (c.fromReal === targetReal && c.toReal === me.name));
  });
  if (ex) { openC(ex); sw('d'); toast('Mevcut sohbet açıldı', 's'); return; }
  _pendingDmTarget = targetName;
  q('#dmModeTarget').textContent = targetName + ' kişisine sohbet isteği göndereceksin.';
  q('#dmNoteInp').value = '';
  om('dmModeModal');
  q('#dmModeModal').onclick = e => { if (e.target === q('#dmModeModal')) closeDmModal(); };
}

function closeDmModal() { _pendingDmTarget = null; cm('dmModeModal'); }

function dmModeSend(asAnon) {
  const target = _pendingDmTarget, note = q('#dmNoteInp').value.trim();
  _pendingDmTarget = null; cm('dmModeModal');
  if (!target) return;
  startDm(target, asAnon, note);
}

// ══════════════════════════════════════════════════
// PROFİL AYARLARI (Kendi profilim)
// ══════════════════════════════════════════════════

function saveProfile() {
  if (!profiles[me.name]) profiles[me.name] = {};
  const p = profiles[me.name];
  p.bio    = q('#pBio').value.trim();
  p.link   = q('#pLink')?.value.trim() || '';
  p.cls    = q('#pClass').value.trim();
  p.age    = q('#pAge').value.trim();
  p.gender = q('#pGender').value;
  p.orientation = q('#pOrientation').value;
  p.visNormal = q('#visNormal').checked;
  p.visAnon   = q('#visAnon').checked;
  const tp = q('#myPhotoPreview').dataset.tempPhoto;
  if (tp !== undefined) p.photo = tp || null;
  p.actStatus = _tempActStatus;
  savedActivity[me.name] = _tempActStatus;
  if (_tempActStatus === 'hidden') delete onl[me.name]; else onl[me.name] = true;
  // Online/offline durumunu güncelle
  if (_tempActStatus === 'hidden') { if (typeof fbSetOffline === 'function') fbSetOffline(me.name); }
  else                             { if (typeof fbSetOnline  === 'function') fbSetOnline(me.name);  }
  // Firebase'e kaydet
  if (typeof fbSaveProfile === 'function') fbSaveProfile(me.name, { ...p, photo: null }); // fotoğraf ayrı
  cm('psett'); updateMyAv(); updateMyStatusDot();
  // Profil sayfası açıksa anında güncelle
  if (typeof renderProfilePage === 'function') renderProfilePage(me.name);
  // Genel sohbeti de güncelle (avatar değişikliği için)
  if (typeof rG === 'function') rG();
  toast('Profil kaydedildi', 's');
}

document.getElementById('psett').addEventListener('click', function(e) {
  if (e.target === this) cm('psett');
});

function openMyProfile() {
  if (!me) return;
  _ppTab = 'posts';
  sw('pr');
}

function openProfileSettings() {
  if (!me) return;
  const p = profiles[me.name] || {};
  q('#pBio').value    = p.bio    || '';
  if (q('#pLink')) q('#pLink').value = p.link || '';
  q('#pClass').value  = p.cls    || '';
  q('#pAge').value    = p.age    || '';
  q('#pGender').value = p.gender || '';
  q('#pOrientation').value = p.orientation || '';
  q('#visNormal').checked = p.visNormal !== false;
  q('#visAnon').checked   = p.visAnon === true;
  _tempActStatus = p.actStatus || 'online';
  q('#actOnlineBtn').className = 'act-opt' + (_tempActStatus === 'online' ? ' sel-online' : '');
  q('#actHiddenBtn').className = 'act-opt' + (_tempActStatus === 'hidden' ? ' sel-hidden' : '');
  const pi = q('#myPhotoPreviewInner');
  if (p.photo) {
    pi.innerHTML = `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    q('#removePhotoBtn').style.display = '';
  } else {
    pi.innerHTML = me.name[0].toUpperCase();
    pi.style.color = 'var(--ac)';
    q('#removePhotoBtn').style.display = 'none';
  }
  q('#myPhotoPreview').dataset.tempPhoto = p.photo || '';
  om('psett');
}

// ══════════════════════════════════════════════════
// DOĞUM GÜNÜ KONTROLÜ
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// AUTH YARDIMCILAR
// ══════════════════════════════════════════════════

let _pendingUnsubFn = null;  // Firestore onay dinleyici

function _showLsSection(id) {
  ['ls-main','ls-login','ls-register','ls-pending'].forEach(s => {
    const el = document.getElementById(s); if (el) el.style.display = 'none';
  });
  const el = document.getElementById(id); if (el) el.style.display = '';
  const errEl = q('#lerr'); if (errEl) errEl.textContent = '';
}

function _listenForApproval(uid) {
  if (_pendingUnsubFn) { _pendingUnsubFn(); _pendingUnsubFn = null; }
  if (typeof fbListenUserDoc !== 'function') { setTimeout(() => _listenForApproval(uid), 300); return; }
  _pendingUnsubFn = fbListenUserDoc(uid, userData => {
    if (!userData) return;
    if (userData.status === 'approved') {
      if (_pendingUnsubFn) { _pendingUnsubFn(); _pendingUnsubFn = null; }
      completeUserLogin(userData);
    } else if (userData.status === 'banned') {
      if (_pendingUnsubFn) { _pendingUnsubFn(); _pendingUnsubFn = null; }
      const errEl = q('#lerr');
      if (errEl) errEl.textContent = 'Hesabın engellendi.';
      if (typeof fbSignOut === 'function') fbSignOut();
      _showLsSection('ls-main');
    }
  });
}

function showTermsModal(e) {
  if (e) e.preventDefault();
  const m = q('#termsModal'); if (!m) return;
  m.style.display = 'flex';
}
function closeTermsModal() {
  const m = q('#termsModal'); if (m) m.style.display = 'none';
}
function acceptTermsModal() {
  const cb = q('#regTerms'); if (cb) cb.checked = true;
  closeTermsModal();
}

async function doSignOut() {
  if (_pendingUnsubFn) { _pendingUnsubFn(); _pendingUnsubFn = null; }
  if (typeof fbUnlistenAllConvMsgs === 'function') fbUnlistenAllConvMsgs();
  if (typeof fbSignOut === 'function') await fbSignOut();
  _currentUid = null;
  me = null;
  const appEl  = q('#app');
  const lockEl = q('#lock');
  if (appEl)  appEl.style.display  = 'none';
  if (lockEl) lockEl.style.display = '';
  _showLsSection('ls-main');
}

// ── HESAP SİLME ──────────────────────────────────
function openDeletionModal() {
  if (!me) return;
  // Zaten talep varsa farklı göster
  if (me._deletionPending) {
    const days = _deletionDaysLeft(me._deletionRequestedAt);
    if (confirm('Hesabın ' + days + ' gün içinde silinecek.\n\nSilme talebini iptal etmek ister misin?')) {
      cancelDeletionRequest();
    }
    return;
  }
  document.getElementById('deletionModal').style.display = 'flex';
}

function closeDeletionModal() {
  document.getElementById('deletionModal').style.display = 'none';
}

function _deletionDaysLeft(requestedAt) {
  if (!requestedAt) return 7;
  const ms = 7 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(requestedAt).getTime());
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

async function submitDeletionRequest() {
  const selected = document.querySelector('input[name="delReason"]:checked');
  if (!selected) { toast('Lütfen bir neden seç', 'e'); return; }
  const reason = selected.value;
  closeDeletionModal();
  try {
    if (typeof fbSendDeletionRequest === 'function') await fbSendDeletionRequest(me.uid, reason);
  } catch(e) { toast('Hata: Talep gönderilemedi. Tekrar dene.', 'e'); return; }
  me._deletionPending = true;
  me._deletionRequestedAt = new Date().toISOString();
  _renderDeletionBanner();
  toast('Silme talebi alındı. 7 gün içinde işlenecek.', 'w');
}

async function cancelDeletionRequest() {
  try {
    if (typeof fbCancelDeletionRequest === 'function') await fbCancelDeletionRequest(me.uid);
  } catch(e) {}
  me._deletionPending = false;
  me._deletionRequestedAt = null;
  _renderDeletionBanner();
  const sub = document.getElementById('deletionSettingsSub');
  if (sub) sub.textContent = 'Hesabını kalıcı olarak sil';
  toast('Silme talebi iptal edildi ✅', 's');
}

function _renderDeletionBanner() {
  const existing = document.getElementById('deletionPendingBanner');
  if (existing) existing.remove();
  if (!me?._deletionPending) return;
  const days = _deletionDaysLeft(me._deletionRequestedAt);
  const banner = document.createElement('div');
  banner.id = 'deletionPendingBanner';
  banner.className = 'deletion-pending-banner';
  banner.innerHTML = '🗑️ Hesabın <strong>' + days + ' gün</strong> içinde silinecek. <button onclick="cancelDeletionRequest()">Geri Al</button>';
  // Ayarlar menüsünün üstüne ekle
  const menu = document.querySelector('.settings-menu');
  if (menu) menu.parentElement.insertBefore(banner, menu);
  const sub = document.getElementById('deletionSettingsSub');
  if (sub) sub.textContent = days + ' gün içinde silinecek — iptal etmek için tıkla';
}

function completeUserLogin(userData) {
  if (_pendingUnsubFn) { _pendingUnsubFn(); _pendingUnsubFn = null; }
  const isAd = userData.isAdmin || false;
  const name = userData.nickname;
  const aid  = 'Anonim#' + Math.floor(1000 + Math.random() * 9000);

  me = { name, uid: userData.uid, username: userData.username || '', school: userData.school || '', isAdmin: isAd, anonId: aid, photo: userData.photoURL || null, _deletionPending: userData.deletionPending || false, _deletionRequestedAt: userData.deletionRequestedAt || null };

  const savedAct = isAd ? 'hidden' : (savedActivity[name] || 'online');
  if (!profiles[name]) {
    profiles[name] = { cls: userData['class'] || '', age: '', bio: userData.bio || '', gender: userData.gender || '', orientation: userData.orientation || '', visNormal:true, visAnon:false, photo: userData.photoURL || null, actStatus: savedAct };
  } else {
    profiles[name].actStatus = savedAct;
    if (userData.photoURL && !profiles[name].photo) profiles[name].photo = userData.photoURL;
  }
  if (savedAct !== 'hidden') onl[name] = true;
  aReg[aid] = name;

  q('#lock').style.display = 'none';
  q('#app').style.display  = 'flex';

  updateMyAv();
  updateMyStatusDot();

  if (isAd) {
    q('#ta').style.display  = '';
    q('#tfr').style.display = '';
    q('#myAv').className    = 'av avo';
    q('#tw').style.display  = 'none';
  }

  demo();
  gm.push({ type:'sys', text:"Nexia'ya hoş geldiniz. Saygılı iletişim hepimizin sorumluluğu." });
  rG(); rDL(); buildThemeGrid(); rStories(); rChannels();

  if (typeof startFirebaseChat === 'function') startFirebaseChat();
  if (typeof fbListenProfiles  === 'function') fbListenProfiles();
  if (typeof fbListenOnline    === 'function') fbListenOnline();
  if (isAd) {
    if (typeof fbListenReports       === 'function') fbListenReports();
    if (typeof initAdminGoogleUsers  === 'function') initAdminGoogleUsers();
    if (typeof fbLoadAdminNotices    === 'function') fbLoadAdminNotices();
  }
  if (!isAd) {
    if (typeof fbSetOnline     === 'function') fbSetOnline(name);
    if (typeof fbListenMyConvs === 'function') fbListenMyConvs(name);
    if (userData.uid && typeof fbListenUserDoc === 'function') {
      fbListenUserDoc(userData.uid, d => {
        if (d && d.status === 'banned' && typeof doSignOut === 'function') doSignOut();
      });
    }
  }

  window.addEventListener('beforeunload', () => {
    if (typeof fbSetOffline === 'function' && me) fbSetOffline(me.name);
  });

  if (typeof recordLogin === 'function') recordLogin(name, userData.username || '', isAd);
  if (!isAd && typeof _sessionStart === 'function') _sessionStart();
  if (!isAd && typeof _concurrentLoginInit === 'function') _concurrentLoginInit(name);

  if (isAd) { rA(); toast('Admin paneline hoş geldin 👁', 'w'); }
  else toast('Hoş geldin, ' + name + '! 👋', 's');

  if (!isAd && me._deletionPending) _renderDeletionBanner();
  if (!isAd) setTimeout(_maybeShowPwaBanner, 3000);
}

// ── PWA KURULUM BANNER ────────────────────────────
let _pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaInstallPrompt = e;
  _updatePwaSettingsItem();
});
window.addEventListener('appinstalled', () => {
  _pwaInstallPrompt = null;
  _updatePwaSettingsItem();
  toast('Uygulama yüklendi! Ana ekrana eklendi 🎉', 's');
});

function _maybeShowPwaBanner() {
  // Zaten uygulama modunda çalışıyorsa (yüklü) gösterme
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (window.navigator.standalone) return;
  if (localStorage.getItem('nexia_pwa_dismissed')) return;
  const b = document.getElementById('pwaBanner'); if (!b) return;
  // Ekle butonunu prompt varsa göster, yoksa gizle
  const btn = b.querySelector('#pwaInstallBtn');
  if (btn) btn.style.display = _pwaInstallPrompt ? '' : 'none';
  b.style.display = 'flex';
}

function installPwa() {
  if (_pwaInstallPrompt) {
    _pwaInstallPrompt.prompt();
    _pwaInstallPrompt.userChoice.then(() => { _pwaInstallPrompt = null; hidePwaBanner(); });
  } else {
    toast('Tarayıcı menüsü → "Ana Ekrana Ekle" seç 📱', 's');
  }
}

function hidePwaBanner() {
  const b = document.getElementById('pwaBanner'); if (b) b.style.display = 'none';
  localStorage.setItem('nexia_pwa_dismissed', '1');
}

function _updatePwaSettingsItem() {
  const label = document.getElementById('pwaSettingsLabel');
  const sub   = document.getElementById('pwaSettingsSub');
  const item  = document.getElementById('pwaSettingsItem');
  if (!item) return;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isPWA) {
    if (label) label.textContent = 'Uygulama Yüklü ✓';
    if (sub)   sub.textContent   = 'Ana ekranda çalışıyor';
    item.style.cursor = 'default';
  } else if (_pwaInstallPrompt) {
    if (label) label.textContent = 'Uygulamayı Yükle';
    if (sub)   sub.textContent   = 'Ana ekrana ekle, tek tıkla aç';
    item.style.cursor = 'pointer';
  } else {
    if (label) label.textContent = 'Uygulamayı Yükle';
    if (sub)   sub.textContent   = 'Tarayıcı menüsünden "Ana Ekrana Ekle" seç';
    item.style.cursor = 'pointer';
  }
}

function triggerPwaFromSettings() {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isPWA) { toast('Uygulama zaten yüklü ✓', 's'); return; }
  installPwa();
}

// ── OTURUM DEVAM ETTİRME (Firebase Auth session persistence) ──
// Kullanıcı daha önce giriş yaptıysa Firebase Auth oturumu devam eder.
// onAuthStateChanged ile yakalayıp otomatik giriş yapıyoruz.
(function _initSessionRestore() {
  function _trySetup() {
    if (typeof fbOnAuthStateChanged !== 'function' || typeof fbGetUserDoc !== 'function') {
      setTimeout(_trySetup, 200); return;
    }
    fbOnAuthStateChanged(async (user) => {
      if (!user || me) return; // oturum yok ya da zaten girilmiş
      _currentUid = user.uid;
      const userData = await fbGetUserDoc(user.uid);
      if (!userData) return;
      if (userData.status === 'banned')   { if (typeof fbSignOut === 'function') fbSignOut(); return; }
      if (userData.status === 'pending')  { _showLsSection('ls-pending'); _listenForApproval(user.uid); return; }
      if (userData.status === 'approved') completeUserLogin(userData);
    });
  }
  _trySetup();
})();

