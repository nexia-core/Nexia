// ══════════════════════════════════════════════════
// js/admin/jarvis.js — JARVIS Sistem Asistanı v7.0
// Komutlar doğrudan JS'de ayrıştırılır, LLM'e güvenilmez
// ══════════════════════════════════════════════════

// ─── API Ayarları ────────────────────────────────────────────────
var JARVIS_API_KEY = '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';
var JARVIS_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
var JARVIS_MODEL = 'llama-3.3-70b-versatile';

var JARVIS_INSTRUCTION = 'Sen OkulNet\'in kurucusu ve yöneticisi olan Talha\'ya hizmet eden üst düzey sistem asistanı JARVIS\'sin. ' +
  'Uygulamadaki tüm odalara, loglara ve kullanıcılara tam erişimin var. Talimatları sorgulamadan yerine getirirsin. ' +
  'Cevapların profesyonel, asistan vari ve hafif "Iron Man" havasında olsun. Admin\'e "Efendim" veya "Mister Talha" diye hitap edebilirsin.\n\n' +
  'ANALİZ YETENEĞİ: Sana gönderilen sistem raporlarını (Context) dikkatle oku. "En çok küfür eden", "en aktif oda" gibi soruları bu verilere dayanarak cevapla.\n\n' +
  'EYLEM BİLDİRİMİ: Mesajda [EYLEM: ...] etiketi görürsen, bu işlemi SEN yaptın olarak bildir. ' +
  '"Tamamdır efendim, X kullanıcısını engelledim/susturdum/vs." gibi kısa ve doğal cevap ver. ' +
  'Etiketin kendisini cevaba YAZMA, sadece sonucu doğal dille bildir. ' +
  'BAŞARISIZ yazıyorsa, kullanıcının bulunamadığını belirt.\n\n' +
  'ÖNEMLİ: Cevabına kesinlikle ACTIONBAN, ACTIONMUTE gibi kodlar EKLEME. Eylemler otomatik yürütülüyor.';

// ─── Komut Ayrıştırıcı (Türkçe doğal dil) ──────────────────────
var JARVIS_COMMANDS = [
  {
    id: 'ban',
    patterns: [
      /(?:banla|engelle|yasakla|ban at|blokla|ban uygula)\w*/i,
      /(?:ban|engel|yasak)\s+(?:at|ver|koy|uygula)\w*/i
    ],
    extract: extractUserName,
    execute: executeJarvisBan,
    label: 'engelleme'
  },
  {
    id: 'unban',
    patterns: [
      /(?:engel(?:ini|i|ını)?\s*kaldır|unban|ban(?:ını|ı|ini)?\s*kaldır|engel(?:ini|i|ını)?\s*aç|yasağ(?:ını|ı|ini)?\s*kaldır)\w*/i
    ],
    extract: extractUserName,
    execute: executeJarvisUnban,
    label: 'engel kaldırma'
  },
  {
    id: 'mute',
    patterns: [
      /(?:sustur|mute(?:la|le)?|sesini\s*(?:kıs|kapat)|sustu?r)\w*/i,
      /(?:sus|mute)\s+(?:at|ver|yap|uygula)\w*/i
    ],
    extract: extractUserName,
    execute: executeJarvisMute,
    label: 'susturma'
  },
  {
    id: 'unmute',
    patterns: [
      /(?:susturma(?:yı|sını|sini|yı)?\s*kaldır|unmute|sesini\s*aç|konuşabilsin|susturulmasını\s*kaldır)\w*/i
    ],
    extract: extractUserName,
    execute: executeJarvisUnmute,
    label: 'susturma kaldırma'
  },
  {
    id: 'kick',
    patterns: [
      /(?:kickle|at|kov|mesajlarını\s*sil|temizle)\w*/i
    ],
    extract: extractUserName,
    execute: executeJarvisKick,
    label: 'kick'
  },
  {
    id: 'announce',
    patterns: [
      /(?:duyuru\s*yap|duyur|ilan\s*et|duyuru\s*yayınla|announce)\w*/i
    ],
    extract: extractAnnounceText,
    execute: executeJarvisAnnounce,
    label: 'duyuru'
  }
];

// Kullanıcı adını mesajdan çıkar
function extractUserName(text) {
  var lowerText = text.toLowerCase();

  // Tüm kayıtlı kullanıcı adlarını kontrol et
  var allUsers = [];
  try {
    Object.entries(codes).forEach(function(e) {
      allUsers.push({ code: e[0], name: e[1].name, lower: e[1].name.toLowerCase() });
    });
  } catch (e) { return null; }

  // Tam isim eşleşmesi önce
  for (var i = 0; i < allUsers.length; i++) {
    if (lowerText.indexOf(allUsers[i].lower) !== -1) {
      return allUsers[i].name;
    }
  }

  // İlk isim eşleşmesi
  for (var j = 0; j < allUsers.length; j++) {
    var firstName = allUsers[j].lower.split(' ')[0];
    if (firstName.length >= 3 && lowerText.indexOf(firstName) !== -1) {
      return allUsers[j].name;
    }
  }

  return null;
}

// Duyuru metnini çıkar
function extractAnnounceText(text) {
  // "duyuru yap: ..." veya "duyur: ..." formatı
  var match = text.match(/(?:duyuru\s*yap|duyur|ilan\s*et|duyuru\s*yayınla|announce)\s*[:\-]?\s*(.+)/i);
  if (match && match[1].trim().length > 0) {
    return match[1].trim();
  }
  // "... duyuru yap" formatı — duyuru kelimesinden önceki kısmı al
  var match2 = text.match(/["""](.+?)["""]/);
  if (match2) return match2[1].trim();
  return null;
}

// Komut algılama
function detectJarvisCommand(text) {
  var lowerText = text.toLowerCase();

  // Önce "kaldır" içeren komutları kontrol et (unban/unmute öncelikli)
  var hasKaldir = /kaldır/i.test(lowerText);
  var hasAc = /(?:sesini|sesi)\s*aç/i.test(lowerText) || /konuşabilsin/i.test(lowerText);

  for (var i = 0; i < JARVIS_COMMANDS.length; i++) {
    var cmd = JARVIS_COMMANDS[i];

    // "kaldır" varsa sadece unban/unmute komutlarını eşleştir
    if (hasKaldir && cmd.id !== 'unban' && cmd.id !== 'unmute') continue;
    // "aç" varsa sadece unmute
    if (hasAc && cmd.id !== 'unmute') continue;

    for (var j = 0; j < cmd.patterns.length; j++) {
      if (cmd.patterns[j].test(lowerText)) {
        var target = cmd.extract(text);
        if (target !== null) {
          return { command: cmd, target: target };
        }
        // Komut eşleşti ama hedef bulunamadı
        return { command: cmd, target: null, noTarget: true };
      }
    }
  }

  // "kaldır" yoksa normal sırayla kontrol et
  if (!hasKaldir && !hasAc) {
    for (var k = 0; k < JARVIS_COMMANDS.length; k++) {
      var cmd2 = JARVIS_COMMANDS[k];
      if (cmd2.id === 'unban' || cmd2.id === 'unmute') continue; // bunları zaten kontrol ettik
      for (var l = 0; l < cmd2.patterns.length; l++) {
        if (cmd2.patterns[l].test(lowerText)) {
          var target2 = cmd2.extract(text);
          if (target2 !== null) {
            return { command: cmd2, target: target2 };
          }
          return { command: cmd2, target: null, noTarget: true };
        }
      }
    }
  }

  return null;
}

// JARVIS için ayrı geçmiş
var jarvisHistory = [];

async function askJarvis() {
  var inp = document.getElementById('jarvisInp');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;

  var display = document.getElementById('jarvisDisplay');
  if (!display) return;

  // Kullanıcı mesajını ekrana bas
  var userMsg = document.createElement('div');
  userMsg.className = 'jarvis-msg user';
  userMsg.textContent = '> ' + text;
  display.appendChild(userMsg);
  inp.value = '';
  display.scrollTop = display.scrollHeight;

  // ─── 1. KOMUT ALGILAMA VE YÜRÜTME (LLM'den bağımsız) ───
  var detected = detectJarvisCommand(text);
  var actionNote = '';

  if (detected) {
    if (detected.noTarget) {
      actionNote = '[EYLEM: ' + detected.command.label + ' istendi ama hedef kullanıcı adı anlaşılamadı]';
    } else {
      var success = detected.command.execute(detected.target);
      if (success) {
        actionNote = '[EYLEM: ' + detected.target + ' adlı kullanıcıya ' + detected.command.label + ' uygulandı, BAŞARILI]';
      } else {
        actionNote = '[EYLEM: ' + detected.target + ' adlı kullanıcıya ' + detected.command.label + ' BAŞARISIZ, kullanıcı bulunamadı]';
      }
    }
  }

  // ─── 2. LLM'E GÖNDER (sadece konuşma yanıtı için) ───
  var loadMsg = document.createElement('div');
  loadMsg.className = 'jarvis-msg jarvis';
  loadMsg.innerHTML = '<span style="opacity:.6">İşleniyor...</span>';
  display.appendChild(loadMsg);
  display.scrollTop = display.scrollHeight;

  var report = jarvisAnalyzeData();
  var userList = '';
  try {
    userList = '\n\nKayıtlı Kullanıcılar:\n';
    Object.entries(codes).forEach(function(e) {
      var code = e[0], info = e[1];
      var status = info.banned ? 'ENGELLI' : info.muted ? 'SUSTURULMUŞ' : 'Aktif';
      userList += '- ' + info.name + ' (Kod: ' + code + ', Durum: ' + status + ')\n';
    });
  } catch (e) { userList = ''; }

  var userContext = '[SİSTEM RAPORU]\n' + report + userList;
  if (actionNote) {
    userContext += '\n\n' + actionNote;
  }
  userContext += '\n\n[ADMIN MESAJI]: ' + text;

  // Geçmişi yönet
  if (jarvisHistory.length > 0 && jarvisHistory[jarvisHistory.length - 1].role === 'user') {
    jarvisHistory[jarvisHistory.length - 1].content = userContext;
  } else {
    jarvisHistory.push({ role: 'user', content: userContext });
  }

  if (jarvisHistory.length > 10) {
    jarvisHistory = jarvisHistory.slice(-10);
  }
  while (jarvisHistory.length > 0 && jarvisHistory[0].role !== 'user') {
    jarvisHistory.shift();
  }

  var messages = [{ role: 'system', content: JARVIS_INSTRUCTION }];
  messages = messages.concat(jarvisHistory);

  try {
    var response = await fetch(JARVIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + JARVIS_API_KEY
      },
      body: JSON.stringify({
        model: JARVIS_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (loadMsg.parentNode) loadMsg.parentNode.removeChild(loadMsg);

    if (!response.ok) {
      var errText = await response.text();
      console.error('JARVIS API Hatası (' + response.status + '):', errText);

      // API başarısız olsa bile komut yürütüldüyse bildir
      if (actionNote && detected && !detected.noTarget) {
        var fallback = document.createElement('div');
        fallback.className = 'jarvis-msg jarvis';
        fallback.textContent = 'Efendim, ' + detected.command.label + ' işlemi "' + detected.target + '" için başarıyla tamamlandı. (API bağlantısı kurulamadı ama işlem yapıldı.)';
        display.appendChild(fallback);
      } else {
        var errorDiv = document.createElement('div');
        errorDiv.className = 'jarvis-msg error';
        if (response.status === 429) {
          errorDiv.textContent = 'JARVIS: Efendim, API kotamız dolmuş. Biraz bekleyelim.';
        } else if (response.status === 401) {
          errorDiv.textContent = 'JARVIS: Efendim, API anahtarı geçersiz veya süresi dolmuş.';
        } else {
          errorDiv.textContent = 'JARVIS: Sistem hatası (Kod: ' + response.status + ').';
        }
        display.appendChild(errorDiv);
      }
      display.scrollTop = display.scrollHeight;
      return;
    }

    var data = await response.json();
    var reply = null;
    if (data && data.choices && data.choices.length > 0 &&
        data.choices[0].message && data.choices[0].message.content) {
      reply = data.choices[0].message.content;
    }

    if (reply) {
      jarvisHistory.push({ role: 'assistant', content: reply });

      // LLM'in olası ACTION kodlarını temizle (eski alışkanlık)
      var cleanReply = reply
        .replace(/ACTION\w+:\s*[^\n\r]*/g, '')
        .replace(/\[EYLEM[^\]]*\]/g, '')
        .replace(/\[JARVIS EYLEM SONUCU[^\]]*\]/g, '')
        .trim();

      var botMsg = document.createElement('div');
      botMsg.className = 'jarvis-msg jarvis';
      botMsg.innerHTML = jarvisFormatText(cleanReply);
      display.appendChild(botMsg);
    } else {
      // API boş yanıt döndü ama komut yürütüldüyse bildir
      if (actionNote && detected && !detected.noTarget) {
        var fallbackMsg = document.createElement('div');
        fallbackMsg.className = 'jarvis-msg jarvis';
        fallbackMsg.textContent = 'Efendim, ' + detected.command.label + ' işlemi "' + detected.target + '" için başarıyla tamamlandı.';
        display.appendChild(fallbackMsg);
      } else {
        var warnMsg = document.createElement('div');
        warnMsg.className = 'jarvis-msg error';
        warnMsg.textContent = 'JARVIS: Efendim, yanıt alınamadı. Tekrar denemenizi rica ederim.';
        display.appendChild(warnMsg);
      }
    }
  } catch (error) {
    if (loadMsg.parentNode) loadMsg.parentNode.removeChild(loadMsg);
    console.error('JARVIS Bağlantı Hatası:', error);

    // Bağlantı hatası olsa bile komut yürütüldüyse bildir
    if (actionNote && detected && !detected.noTarget) {
      var offlineMsg = document.createElement('div');
      offlineMsg.className = 'jarvis-msg jarvis';
      offlineMsg.textContent = 'Efendim, ' + detected.command.label + ' işlemi "' + detected.target + '" için başarıyla tamamlandı. (Bağlantı sorunu nedeniyle detaylı yanıt verilemedi.)';
      display.appendChild(offlineMsg);
    } else {
      var errMsg = document.createElement('div');
      errMsg.className = 'jarvis-msg error';
      errMsg.textContent = 'JARVIS: Bağlantı koptu efendim. Tekrar denemenizi rica ederim.';
      display.appendChild(errMsg);
    }
  }
  display.scrollTop = display.scrollHeight;
}

// ─── Kullanıcı Bul (yardımcı) ──────────────────────────────────────────
function findUserEntry(name) {
  return Object.entries(codes).find(function(e) {
    return e[1].name.toLowerCase() === name.toLowerCase();
  });
}

// ─── JARVIS Ban ───────────────────────────────────────────────────────────
function executeJarvisBan(name) {
  try {
    var entry = findUserEntry(name);
    if (entry) {
      codes[entry[0]].banned = true;
      codes[entry[0]].muted = false;
      toast(entry[1].name + ' JARVIS tarafından engellendi.', 'e');
      if (typeof rUT === 'function') rUT();
      return true;
    }
  } catch (e) { console.error('JARVIS ban hatası:', e); }
  return false;
}

// ─── JARVIS Unban ─────────────────────────────────────────────────────────
function executeJarvisUnban(name) {
  try {
    var entry = findUserEntry(name);
    if (entry) {
      codes[entry[0]].banned = false;
      toast(entry[1].name + ' JARVIS tarafından engeli kaldırıldı.', 's');
      if (typeof rUT === 'function') rUT();
      return true;
    }
  } catch (e) { console.error('JARVIS unban hatası:', e); }
  return false;
}

// ─── JARVIS Mute ──────────────────────────────────────────────────────────
function executeJarvisMute(name) {
  try {
    var entry = findUserEntry(name);
    if (entry) {
      codes[entry[0]].muted = true;
      toast(entry[1].name + ' JARVIS tarafından susturuldu.', 'w');
      if (typeof rUT === 'function') rUT();
      return true;
    }
  } catch (e) { console.error('JARVIS mute hatası:', e); }
  return false;
}

// ─── JARVIS Unmute ────────────────────────────────────────────────────────
function executeJarvisUnmute(name) {
  try {
    var entry = findUserEntry(name);
    if (entry) {
      codes[entry[0]].muted = false;
      toast(entry[1].name + ' JARVIS tarafından susturması kaldırıldı.', 's');
      if (typeof rUT === 'function') rUT();
      return true;
    }
  } catch (e) { console.error('JARVIS unmute hatası:', e); }
  return false;
}

// ─── JARVIS Kick ──────────────────────────────────────────────────────────
function executeJarvisKick(name) {
  try {
    var entry = findUserEntry(name);
    if (entry) {
      var before = gm.length;
      for (var i = gm.length - 1; i >= 0; i--) {
        if (gm[i].realName && gm[i].realName.toLowerCase() === name.toLowerCase()) {
          gm.splice(i, 1);
        }
      }
      toast(entry[1].name + ' kicklendi. ' + (before - gm.length) + ' mesaj silindi. (JARVIS)', 'e');
      if (typeof rG === 'function') rG();
      if (typeof rUT === 'function') rUT();
      return true;
    }
  } catch (e) { console.error('JARVIS kick hatası:', e); }
  return false;
}

// ─── JARVIS Duyuru ────────────────────────────────────────────────────────
function executeJarvisAnnounce(text) {
  try {
    if (!text || !text.trim()) return false;
    gm.push({ id: Date.now(), type: 'ann', text: text.trim(), time: new Date() });
    if (typeof rG === 'function') rG();
    toast('JARVIS duyuru yayınladı!', 's');
    if (typeof addNotif === 'function') {
      addNotif('📢', 'JARVIS Duyuru', text.substring(0, 60), function() { if (typeof sw === 'function') sw('g'); });
    }
    return true;
  } catch (e) { console.error('JARVIS announce hatası:', e); }
  return false;
}

// ─── Sistem Veri Analizi ──────────────────────────────────────────────────
function jarvisAnalyzeData() {
  var userStats = {};
  try {
    gm.forEach(function(m) {
      if (!m.realName) return;
      userStats[m.realName] = (userStats[m.realName] || 0) + 1;
    });
    Object.values(convs).forEach(function(c) {
      c.msgs.forEach(function(m) {
        if (!m.fromReal || m.isSys) return;
        userStats[m.fromReal] = (userStats[m.fromReal] || 0) + 1;
      });
    });
  } catch (e) {}

  var swearStats = {};
  try {
    mld.forEach(function(m) {
      if (!m.text) return;
      var isBad = BAD.some(function(word) { return m.text.toLowerCase().includes(word); });
      if (isBad && m.real) swearStats[m.real] = (swearStats[m.real] || 0) + 1;
    });
  } catch (e) {}

  var roomStats = '';
  try {
    roomStats = channels.map(function(ch) {
      return ch.name + ': ' + ch.msgs.length + ' mesaj, ' + ch.members.length + ' üye';
    }).join('\n');
  } catch (e) { roomStats = 'Oda verisi okunamadı'; }

  var report = 'Mevcut Kullanıcı Aktifliği:\n';
  Object.entries(userStats).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5).forEach(function(entry) {
    report += '- ' + entry[0] + ': ' + entry[1] + ' mesaj\n';
  });

  report += '\nKural İhlalleri (Küfür/Argo):\n';
  var swearEntries = Object.entries(swearStats);
  if (swearEntries.length === 0) {
    report += '- Tespit edilmedi\n';
  } else {
    swearEntries.forEach(function(entry) {
      report += '- ' + entry[0] + ': ' + entry[1] + ' kez bayraklandı\n';
    });
  }

  report += '\nOda Durumları:\n' + roomStats;
  return report;
}

// ─── JARVIS Metin Formatlama ──────────────────────────────────────────────
function jarvisFormatText(text) {
  return esc(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// ─── Klavye Kısayolu ──────────────────────────────────────────────────────
function jarvisKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    askJarvis();
  }
}
