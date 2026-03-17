// ══════════════════════════════════════════════════
// FIREBASE v9 MODÜLER SDK — GERÇEK ZAMANLI MESAJLAŞMA
// ══════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

// Dublikasyon önleme: işlenmiş Firestore doc ID'leri
const _processedDocs = new Set();
// Lokal gönderilen mesajları izle (realName + text + localId)
const _localSent = new Set();
let _unsubscribe = null;

// ── 1) Mesaj Gönderme ──────────────────────────────
// Firestore 'messages' koleksiyonuna yazar
window.sendToFirestore = async function(msg) {
  // Dedup key: snapshot geldiğinde bu mesajı atla (zaten lokal gm'de)
  _localSent.add(msg.realName + '|' + msg.text + '|' + msg.id);
  try {
    await addDoc(collection(db, "messages"), {
      name: msg.name,
      realName: msg.realName,
      text: msg.text || '',
      isAnon: msg.isAnon || false,
      isAdmin: msg.isAdmin || false,
      timestamp: serverTimestamp(),
      replyTo: msg.replyTo || null,
      type: msg.type || null,
      localId: msg.id  // Lokal ID'yi sakla (dedup için)
    });
  } catch (e) {
    console.error('Firebase mesaj gönderme hatası:', e);
  }
};

// ── 2) Canlı Dinleme (Real-time) ───────────────────
// onSnapshot ile 'messages' koleksiyonunu dinler
// Yalnızca son 50 mesaj — kota koruması
window.startFirebaseChat = function() {
  if (_unsubscribe) return; // Zaten dinleniyor

  const q50 = query(
    collection(db, "messages"),
    orderBy("timestamp", "asc"),
    limit(50)
  );

  _unsubscribe = onSnapshot(q50, function(snapshot) {
    snapshot.docChanges().forEach(function(change) {
      if (change.type === "added") {
        // Zaten işlenen doc'ları atla
        if (_processedDocs.has(change.doc.id)) return;
        _processedDocs.add(change.doc.id);

        var data = change.doc.data();

        // Sistem/anket/duyuru gibi özel tipleri atla (lokal kalır)
        if (data.type === 'poll' || data.type === 'ann' || data.type === 'sys') return;

        // Kendi gönderdiğimiz mesajı atla (lokal gm'ye sg() zaten ekledi)
        var dedupKey = data.realName + '|' + data.text + '|' + (data.localId || '');
        if (_localSent.has(dedupKey)) {
          _localSent.delete(dedupKey);
          return;
        }

        var msg = {
          id: data.localId || (Date.now() + Math.floor(Math.random() * 10000)),
          firebaseId: change.doc.id,
          name: data.name || 'Bilinmeyen',
          realName: data.realName || '',
          text: data.text || '',
          isAnon: data.isAnon || false,
          isMe: typeof me !== 'undefined' && me && data.realName === me.name,
          isAdmin: data.isAdmin || false,
          time: data.timestamp ? data.timestamp.toDate() : new Date(),
          recalled: false,
          edited: false,
          reactions: {},
          replyTo: data.replyTo || null
        };

        // Lokal gm dizisine ekle
        if (typeof gm !== 'undefined') gm.push(msg);

        // Chat'i yeniden render et
        if (typeof rG === 'function') rG();
        if (typeof sbot === 'function') sbot('gMsgs');
      }
    });
  }, function(error) {
    console.error('Firebase dinleme hatası:', error);
  });
};

// ── 3) Dinlemeyi Durdur ─────────────────────────────
window.stopFirebaseChat = function() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
};

console.log('Firebase modülü yüklendi ✓');
