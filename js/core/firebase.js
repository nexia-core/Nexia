// ══════════════════════════════════════════════════
// FIREBASE v9 MODÜLER SDK — NEXIA1CHAT
// v6 — Global Chat + Profil + Online + DM + Kodlar + Storage + Auth
// ══════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  collection, addDoc, serverTimestamp,
  query, orderBy, limitToLast, limit, onSnapshot,
  doc, setDoc, getDoc, deleteDoc, getDocs,
  where, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as _fbSignOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app-check.js";
// imgbb kullanılıyor — Firebase Storage bu bölgede ücretsiz değil

const firebaseConfig = {
  apiKey: "AIzaSyBbpEsRs8hTG6pB7VLaOB9w8imrGqhRdGc",
  authDomain: "nexia1chat.firebaseapp.com",
  projectId: "nexia1chat",
  storageBucket: "nexia1chat.firebasestorage.app",
  messagingSenderId: "309709253807",
  appId: "1:309709253807:web:f251ca21e1b9c569a6385a",
  measurementId: "G-Z9WXJ8KCJN"
};

const app = initializeApp(firebaseConfig);
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Ldi3posAAAAJuqhyABVJIyKb9XYmiJBoe5ixx6'),
  isTokenAutoRefreshEnabled: true
});
const db  = getFirestore(app);

// ══════════════════════════════════════════════════
// 0 — MEDYA YÜKLEME (imgbb — ücretsiz)
// ══════════════════════════════════════════════════

window.fbUploadMedia = async function(file, folder) {
  try {
    const IMGBB_KEY = '03d78945b13e076ca6030b45a0033a4b';
    const form = new FormData();
    form.append('image', file);
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: 'POST', body: form
    });
    const json = await res.json();
    if (json.success) return json.data.url;
    console.error('imgbb yükleme hatası:', json);
    return null;
  } catch(e) {
    console.error('Medya yükleme hatası:', e);
    return null;
  }
};

// ══════════════════════════════════════════════════
// 1 — GLOBAL SOHBET (mevcut, değişmedi)
// ══════════════════════════════════════════════════

const _processedDocs = new Set();
const _localSent     = new Set();
let   _unsubscribe   = null;

window.sendToFirestore = async function(msg, onSent) {
  _localSent.add(msg.realName + '|' + msg.text + '|' + msg.id);
  try {
    const ref = await addDoc(collection(db, 'messages'), {
      name:      msg.name,
      realName:  msg.realName,
      text:      msg.text    || '',
      isAnon:    msg.isAnon  || false,
      isAdmin:   msg.isAdmin || false,
      timestamp: serverTimestamp(),
      replyTo:   msg.replyTo  || null,
      type:      msg.type     || null,
      localId:   msg.id,
      mediaUrl:  msg.mediaUrl  || null,
      mediaType: msg.mediaType || null,
      mediaName: msg.mediaName || null
    });
    if (onSent) onSent(ref.id);
  } catch(e) { console.error('Firebase mesaj gönderme hatası:', e); if (typeof toast === 'function') toast('Mesaj gönderilemedi, bağlantını kontrol et', 'e'); }
};

window.startFirebaseChat = function() {
  if (_unsubscribe) return;
  const q50 = query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limitToLast(50));
  _unsubscribe = onSnapshot(q50, snapshot => {
    snapshot.docChanges().forEach(change => {
      // Güncellenen mesaj (geri alma / silme)
      if (change.type === 'modified') {
        const data = change.doc.data();
        if (data.recalled) {
          const m = typeof gm !== 'undefined' && gm.find(x => x.firebaseId === change.doc.id);
          if (m) { m.recalled = true; m.recalledBy = data.recalledBy || 'user'; if (typeof rG === 'function') rG(); }
        }
        return;
      }
      if (change.type !== 'added') return;
      if (_processedDocs.has(change.doc.id)) return;
      _processedDocs.add(change.doc.id);
      const data = change.doc.data();
      if (data.type === 'poll' || data.type === 'ann' || data.type === 'sys') return;
      const dedupKey = data.realName + '|' + data.text + '|' + (data.localId || '');
      if (_localSent.has(dedupKey)) { _localSent.delete(dedupKey); return; }
      const msg = {
        id:        data.localId || (Date.now() + Math.floor(Math.random() * 10000)),
        firebaseId:change.doc.id,
        name:      data.name    || 'Bilinmeyen',
        realName:  data.realName|| '',
        text:      data.text    || '',
        isAnon:    data.isAnon  || false,
        isMe:      typeof me !== 'undefined' && me && data.realName === me.name,
        isAdmin:   data.isAdmin || false,
        time:      data.timestamp ? data.timestamp.toDate() : new Date(),
        recalled:false, edited:false, reactions:{}, replyTo: data.replyTo || null,
        mediaUrl:  data.mediaUrl  || null,
        mediaType: data.mediaType || null,
        mediaName: data.mediaName || null,
        mediaData: data.mediaUrl  || null  // render uyumluluğu
      };
      if (typeof gm !== 'undefined') gm.push(msg);
      if (typeof rG   === 'function') rG();
      if (typeof sbot === 'function') sbot('gMsgs');
    });
  }, e => console.error('Firebase dinleme hatası:', e));
};

window.stopFirebaseChat = function() {
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
};

window.fbRecallMsg = async function(firebaseId, recalledBy) {
  if (!firebaseId) return;
  try {
    await updateDoc(doc(db, 'messages', firebaseId), { recalled: true, recalledBy: recalledBy || 'user' });
  } catch(e) { console.error('Mesaj geri alma hatası:', e); }
};

// ══════════════════════════════════════════════════
// 2 — PROFİL SENKRONIZASYONU
// ══════════════════════════════════════════════════

window.fbSaveProfile = async function(name, data) {
  if (!name) return;
  try {
    const d = { ...data };
    // Büyük base64 fotoğrafları Firestore'a kaydetme (1MB limit)
    if (d.photo && d.photo.length > 100000) d.photo = null;
    await setDoc(doc(db, 'profiles', name), d, { merge: true });
  } catch(e) { console.error('Profil kayıt hatası:', e); }
};

window.fbListenProfiles = function() {
  onSnapshot(collection(db, 'profiles'), snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'removed') return;
      const name = change.doc.id;
      const data = change.doc.data();
      if (!profiles[name]) profiles[name] = {};
      const localPhoto = profiles[name].photo; // Lokal fotoğrafı koru
      Object.assign(profiles[name], data);
      if (localPhoto && !data.photo) profiles[name].photo = localPhoto;
    });
  });
};

// ══════════════════════════════════════════════════
// 3 — ONLİNE VARLIK (PRESENCE)
// ══════════════════════════════════════════════════

window.fbSetOnline = async function(name) {
  if (!name) return;
  try { await setDoc(doc(db, 'onl', name), { name, since: serverTimestamp() }); } catch(e) {}
};

window.fbSetOffline = async function(name) {
  if (!name) return;
  try { await deleteDoc(doc(db, 'onl', name)); } catch(e) {}
};

window.fbListenOnline = function() {
  onSnapshot(collection(db, 'onl'), snap => {
    snap.docChanges().forEach(change => {
      const name = change.doc.id;
      if (change.type === 'added' || change.type === 'modified') {
        onl[name] = true;
      } else if (change.type === 'removed') {
        delete onl[name];
      }
    });
    if (typeof rOG === 'function') rOG();
  });
};

// ══════════════════════════════════════════════════
// 4 — DM SENKRONIZASYONU
// ══════════════════════════════════════════════════

const _convMsgListeners = {};
const _localDmSent      = new Set();

window.fbSaveConv = async function(conv) {
  if (!conv?.id) return;
  try {
    const { msgs, ...meta } = conv;
    await setDoc(doc(db, 'convs', conv.id), { ...meta, updatedAt: serverTimestamp() }, { merge: true });
  } catch(e) { console.error('Konuşma kayıt hatası:', e); }
};

window.fbSendDmMsg = async function(convId, msg) {
  if (!convId || !msg) return;
  try {
    _localDmSent.add(convId + '|' + msg.id);
    await addDoc(collection(db, 'convs', convId, 'msgs'), {
      id:       msg.id,
      from:     msg.from     || '',
      fromReal: msg.fromReal || '',
      text:     msg.text     || '',
      isAnon:   msg.isAnon   || false,
      recalled: false,
      edited:   false,
      reactions:{},
      replyTo:  msg.replyTo  || null,
      mediaUrl:  msg.mediaUrl  || null,
      mediaType: msg.mediaType || null,
      mediaName: msg.mediaName || null,
      time:     serverTimestamp()
    });
  } catch(e) { console.error('DM gönderme hatası:', e); }
};

window.fbUnlistenConvMsgs = function(convId) {
  if (_convMsgListeners[convId]) {
    _convMsgListeners[convId]();
    delete _convMsgListeners[convId];
  }
};

window.fbUnlistenAllConvMsgs = function() {
  Object.keys(_convMsgListeners).forEach(id => {
    _convMsgListeners[id]();
    delete _convMsgListeners[id];
  });
};

window.fbListenConvMsgs = function(convId) {
  if (_convMsgListeners[convId]) return;
  const q = query(collection(db, 'convs', convId, 'msgs'), orderBy('time', 'asc'), limitToLast(100));
  _convMsgListeners[convId] = onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type !== 'added') return;
      const data = change.doc.data();
      const c    = convs[convId]; if (!c) return;
      const dedupKey = convId + '|' + data.id;
      if (_localDmSent.has(dedupKey)) { _localDmSent.delete(dedupKey); return; }
      if (c.msgs.find(m => m.id === data.id)) return;
      const isMe = typeof me !== 'undefined' && me && data.fromReal === me.name;
      c.msgs.push({
        id:       data.id       || change.doc.id,
        from:     data.from     || '',
        fromReal: data.fromReal || '',
        text:     data.text     || '',
        isAnon:   data.isAnon   || false,
        isMe,
        time:     data.time?.toDate() || new Date(),
        recalled:  data.recalled  || false,
        edited:    data.edited    || false,
        reactions: data.reactions || {},
        replyTo:   data.replyTo   || null,
        mediaUrl:  data.mediaUrl  || null,
        mediaType: data.mediaType || null,
        mediaName: data.mediaName || null,
        mediaData: data.mediaUrl  || null  // render uyumluluğu için
      });
      c.msgs.sort((a, b) => new Date(a.time) - new Date(b.time));
      if (typeof rDL === 'function') rDL();
      if (typeof activeDm !== 'undefined' && activeDm?.id === convId && typeof rDM === 'function') rDM(c);
      // Bildirim — sadece karşı taraftan gelen mesajlar için
      if (!isMe && !isDmMuted(convId) && typeof addNotif === 'function') {
        addNotif('💬', (data.from || '?') + ' yazdı', (data.text || '').substring(0, 50), () => {
          if (typeof sw === 'function') sw('d');
          if (typeof openC === 'function') openC(convId);
        });
      }
    });
  });
};

window.fbListenMyConvs = function(myName) {
  if (!myName) return;
  const queries = [
    query(collection(db, 'convs'), where('fromReal', '==', myName)),
    query(collection(db, 'convs'), where('toReal',   '==', myName))
  ];
  queries.forEach(q => {
    onSnapshot(q, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        const data = change.doc.data();
        if (!data.id) return;
        if (!convs[data.id]) {
          convs[data.id] = { ...data, msgs: [] };
        } else {
          const msgs = convs[data.id].msgs;
          Object.assign(convs[data.id], data);
          convs[data.id].msgs = msgs;
        }
        fbListenConvMsgs(data.id);
        if (typeof rDL === 'function') rDL();
      });
    });
  });
};

// ══════════════════════════════════════════════════
// 5 — ŞİKAYET SENKRONİZASYONU
// ══════════════════════════════════════════════════

window.fbSaveReport = async function(report) {
  if (!report?.id) return;
  try {
    await setDoc(doc(db, 'reports', report.id), {
      ...report,
      time: serverTimestamp()
    });
  } catch(e) { console.error('Şikayet kayıt hatası:', e); }
};

window.fbListenReports = function() {
  const q = query(collection(db, 'reports'), orderBy('time', 'desc'), limitToLast(50));
  onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'removed') return;
      const data = change.doc.data();
      const exists = reports.find(r => r.id === data.id);
      if (!exists) {
        reports.unshift({
          ...data,
          time: data.time?.toDate() || new Date()
        });
      }
    });
    if (typeof rReportsList === 'function') rReportsList();
    if (typeof rIbx === 'function' && typeof me !== 'undefined' && me?.isAdmin) rIbx();
  });
};

// ══════════════════════════════════════════════════
// 6 — KULLANICI KODLARI (ADMIN)
// ══════════════════════════════════════════════════

window.fbSaveSingleCode = async function(code, info) {
  if (!code) return;
  try { await setDoc(doc(db, 'codes', code), info, { merge: true }); }
  catch(e) { console.error('Kod kayıt hatası:', e); }
};

window.fbDeleteCode = async function(code) {
  if (!code) return;
  try { await deleteDoc(doc(db, 'codes', code)); } catch(e) {}
};

window.fbListenCodes = function() {
  onSnapshot(collection(db, 'codes'), snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added' || change.type === 'modified') {
        codes[change.doc.id] = change.doc.data();
        // Mevcut kullanıcı banlandıysa direk at
        if (typeof me !== 'undefined' && me?.code === change.doc.id && change.doc.data().banned) {
          if (typeof doSignOut === 'function') doSignOut();
        }
      } else if (change.type === 'removed') {
        delete codes[change.doc.id];
      }
    });
    if (typeof rUT === 'function' && typeof me !== 'undefined' && me?.isAdmin) rUT();
  });
};

// İlk kurulumda state.js kodlarını Firestore'a aktar (sadece bir kere)
window.fbSeedCodes = async function() {
  try {
    const snap = await getDocs(collection(db, 'codes'));
    if (snap.empty) {
      for (const [code, info] of Object.entries(codes)) {
        await setDoc(doc(db, 'codes', code), info);
      }
      console.log('Kodlar Firestore\'a aktarıldı ✓');
    }
  } catch(e) { console.error('Seed hatası:', e); }
};

// ══════════════════════════════════════════════════
// 7 — GOOGLE AUTH & KULLANICI YÖNETİMİ
// ══════════════════════════════════════════════════

const _auth = getAuth(app);

window.fbSignIn = async function(username, password) {
  const result = await signInWithEmailAndPassword(_auth, username + '@nexia.app', password);
  return result.user;
};

window.fbRegister = async function(username, password) {
  const result = await createUserWithEmailAndPassword(_auth, username + '@nexia.app', password);
  return result.user;
};

window.fbCheckUsername = async function(username) {
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('username', '==', username)));
    return !snap.empty;
  } catch(e) { return false; }
};

window.fbSignOut = async function() {
  try { await _fbSignOut(_auth); } catch(e) {}
};

window.fbGetUserDoc = async function(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
  } catch(e) { return null; }
};

window.fbSaveUserDoc = async function(uid, data) {
  try { await setDoc(doc(db, 'users', uid), data, { merge: true }); }
  catch(e) { console.error('Kullanıcı kayıt hatası:', e); }
};

window.fbListenUserDoc = function(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), snap => {
    callback(snap.exists() ? { uid: snap.id, ...snap.data() } : null);
  });
};

window.fbListenAllUsers = function(callback) {
  return onSnapshot(
    query(collection(db, 'users'), orderBy('createdAt', 'desc')),
    snap => { callback(snap.docs.map(d => ({ uid: d.id, ...d.data() }))); },
    err => {
      console.error('fbListenAllUsers hatası:', err);
      // orderBy index yoksa veya hata varsa sırasız dene
      onSnapshot(
        collection(db, 'users'),
        snap => { callback(snap.docs.map(d => ({ uid: d.id, ...d.data() }))); },
        err2 => console.error('fbListenAllUsers fallback hatası:', err2)
      );
    }
  );
};

window.fbApproveUser = async function(uid) {
  try { await updateDoc(doc(db, 'users', uid), { status: 'approved' }); } catch(e) {}
};

window.fbBanUserByUid = async function(uid) {
  try { await updateDoc(doc(db, 'users', uid), { status: 'banned' }); } catch(e) {}
};

window.fbDeleteUserDoc = async function(uid) {
  try { await deleteDoc(doc(db, 'users', uid)); } catch(e) {}
};

window.fbCheckNickname = async function(nickname) {
  const snap = await getDocs(query(collection(db, 'users'), where('nickname', '==', nickname)));
  return !snap.empty; // true = alınmış
};

window.fbSendDeletionRequest = async function(uid, reason) {
  await setDoc(doc(db, 'deletionRequests', uid), {
    uid,
    reason: reason || '',
    requestedAt: new Date().toISOString(),
    status: 'pending'
  });
};

window.fbCancelDeletionRequest = async function(uid) {
  await deleteDoc(doc(db, 'deletionRequests', uid));
};

window.fbListenDeletionRequests = function(callback) {
  return onSnapshot(collection(db, 'deletionRequests'), snap => {
    callback(snap.docs.map(d => d.data()));
  });
};

window.fbOnAuthStateChanged = function(callback) {
  return onAuthStateChanged(_auth, callback);
};

// ══════════════════════════════════════════════════
// 8 — NEXUS LOG (Firestore)
// ══════════════════════════════════════════════════
window.fbSaveNexusLog = async function(userName, entry) {
  if (!userName || !entry) return;
  try {
    await addDoc(collection(db, 'nexusLogs'), {
      name: userName,
      u:    entry.u || '',
      b:    entry.b || '',
      t:    entry.t || Date.now(),
      m:    entry.m || 'fast'
    });
  } catch(e) { console.error('Nexus log kayıt hatası:', e); }
};

window.fbGetNexusLogs = async function(userName) {
  if (!userName) return [];
  try {
    const q    = query(collection(db, 'nexusLogs'), where('name', '==', userName), orderBy('t', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data()).reverse();
  } catch(e) { console.error('Nexus log okuma hatası:', e); return []; }
};

console.log('Firebase v6 modülü yüklendi ✓');
