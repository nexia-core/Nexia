// ══════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════
const ADMIN_CODE = "ADMIN2025";

const BAD = ["uyuşturucu","tehdit","saldır","öldür","kumar","hakaret","şiddet","yasadışı"];

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥'];

const THEMES = [
  { id:'dark',    name:'Gece',        bg:'#08080e', ac:'#F97316', dots:['#F97316','#a855f7','#22c55e'] },
  { id:'light',   name:'Açık',        bg:'#f5f5f7', ac:'#F97316', dots:['#F97316','#6b7280','#16a34a'] },
  { id:'forest',  name:'Orman',       bg:'#060e08', ac:'#34d47a', dots:['#34d47a','#22c55e','#86efac'] },
  { id:'sunset',  name:'Gün Batımı',  bg:'#100808', ac:'#ff6b6b', dots:['#ff6b6b','#ff8c42','#ffd6d6'] },
  { id:'ocean',   name:'Okyanus',     bg:'#060c14', ac:'#00c8ff', dots:['#00c8ff','#3b82f6','#67e8f9'] },
  { id:'amethyst',name:'Mor',         bg:'#0c080e', ac:'#c084fc', dots:['#c084fc','#a855f7','#e879f9'] },
  { id:'mono',    name:'Mono',        bg:'#080808', ac:'#e0e0e0', dots:['#e0e0e0','#a0a0a0','#606060'] },
];

// ══════════════════════════════════════════════════
// KULLANICI KODLARI
// ══════════════════════════════════════════════════
let codes = {
  "OKUL2025": { name:"Ahmet Yılmaz", banned:false, firstLogin:true, muted:false },
  "SINIF5A":  { name:"Ayşe Kaya",    banned:false, firstLogin:true, muted:false },
  "SINIF5B":  { name:"Mehmet Demir", banned:false, firstLogin:true, muted:false },
  "TEST123":  { name:"Zeynep Çelik", banned:false, firstLogin:true, muted:false },
};

// ══════════════════════════════════════════════════
// OTURUM & KULLANICI
// ══════════════════════════════════════════════════
let me = null;           // { name, code, isAdmin, anonId }
let isAnon = false;
let activeDm = null;
let _pendingDmTarget = null;
let _tempActStatus = 'online';
let vCode = null;        // giriş ekranında doğrulanan kod
let pwT = null;          // şifre değiştirme timer

// ══════════════════════════════════════════════════
// VERİ YAPILARI
// ══════════════════════════════════════════════════
let gm = [];             // global mesajlar
let convs = {};          // DM konuşmaları  { convId: { msgs:[], isGroup, name, members } }
let aReg = {};           // anonId → gerçek isim kaydı
let onl = {};            // online kullanıcılar { name: true }
let mld = [];            // admin mesaj logu (moderasyon)
let inbox = [];          // admin gelen kutusu

let polls = [];          // anketler
let profiles = {};       // kullanıcı profilleri { name: { cls, age, bio, gender, bday, photo, actStatus, ... } }
let savedActivity = {};  // çevrimiçi durum tercihleri { name: 'online'|'hidden' }

// ══════════════════════════════════════════════════
// YENİ ÖZELLİK STATE'LERİ
// ══════════════════════════════════════════════════
let pinnedMsgId = null;  // sabitlenen mesaj ID'si
let notes = [];          // ders notları
let stories = [];        // hikayeler (24 saatlik)
let friends = [];        // arkadaş listesi (isimler dizisi)
let userPosts = {};      // kullanıcı gönderileri { name: [{ id, img, caption, time, likes:[] }] }
let highlights = {};     // öne çıkanlar { name: [{ id, title, coverImg, items:[{img,text}] }] }

let channels = [         // odalar/kanallar
  { id:'ch1', name:'10-A Sınıfı',   desc:'10-A öğrenci odası',            emoji:'📚', members:[], msgs:[] },
  { id:'ch2', name:'Spor Kulübü',   desc:'Spor haberleri ve etkinlikler',  emoji:'⚽', members:[], msgs:[] },
  { id:'ch3', name:'Matematik',     desc:'Matematik yardımlaşma',          emoji:'🔢', members:[], msgs:[] },
  { id:'ch4', name:'Genel Duyuru',  desc:'Okul genel duyuruları',          emoji:'📣', members:[], msgs:[] },
  { id:'ch5', name:'Müzik Kulübü',  desc:'Müzik severler',                 emoji:'🎵', members:[], msgs:[] },
];
let activeChannel = null;

// ══════════════════════════════════════════════════
// UI STATE
// ══════════════════════════════════════════════════
let notifications = [];
let notifOpen = false;
let gReplyTo = null;     // global chat reply referansı
let dmReplies = {};      // DM reply referansları { convId: msgObj }
let currentTheme = 'dark';

// ══════════════════════════════════════════════════
// BOT & MEDYA
// ══════════════════════════════════════════════════
let botInited = false;
let _notePdfData = null;
let _storyImgData = null;

// ══════════════════════════════════════════════════
// GÜVENLİK STATE'LERİ (YENİ)
// ══════════════════════════════════════════════════

// 19 — Cihaz kayıt defteri { fingerprint: [{name, firstSeen, lastSeen}] }
let deviceRegistry = {};

// 20 — Şikayetler
let reports = [];

// 21 — Engellenenler { engelleyen: [engellenen, ...] }
let blockedUsers = {};

// 25 — Eş zamanlı giriş için BroadcastChannel referansı (runtime)
let _concurrentChannel = null;

// 26 — Güvenlik olayları akışı
let securityEvents = [];

// 27 — Hesap kilitleme istekleri
let freezeRequests = [];