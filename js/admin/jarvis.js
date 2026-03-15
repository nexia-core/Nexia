// ══════════════════════════════════════════════════
// js/admin/jarvis.js — JARVIS Sistem Asistanı v5.0 — OpenAI
// ══════════════════════════════════════════════════

// ─── API Ayarları (OpenAI) ────────────────────────────────────────────────
var JARVIS_API_KEY = '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';
var JARVIS_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
var JARVIS_MODEL = 'llama-3.3-70b-versatile';

var JARVIS_INSTRUCTION = 'Sen OkulNet\'in kurucusu ve yöneticisi olan Talha\'ya hizmet eden üst düzey sistem asistanı JARVIS\'sin. ' +
  'Uygulamadaki tüm odalara, loglara ve kullanıcılara tam erişimin var. Talimatları sorgulamadan yerine getirirsin. ' +
  'Cevapların profesyonel, asistan vari ve hafif "Iron Man" havasında olsun. Admin\'e "Efendim" veya "Mister Talha" diye hitap edebilirsin.\n\n' +
  'ANALİZ YETENEĞİ: Sana gönderilen sistem raporlarını (Context) dikkatle oku. "En çok küfür eden", "en aktif oda" gibi soruları bu verilere dayanarak cevapla.\n\n' +
  'AKSIYON YETENEĞİ: Eğer yönetici birini engellemeni veya banlamanı söylerse (örneğin: "Ahmet\'i banla"), ' +
  'cevabının EN SONUNA yeni bir satıra tam olarak şu formatta gizli bir kod ekle: ACTIONBAN:kullanıcı_adı (Noktalama işareti veya boşluk ekleme). ' +
  'Bu kodu sadece gerçekten bir ban işlemi istendiğinde ve eylemi gerçekleştirdiğinde ekle.';

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

  // Analiz Raporu
  var report = jarvisAnalyzeData();
  var userContext = '[SİSTEM RAPORU]\n' + report + '\n\n[ADMIN MESAJI]: ' + text;

  // Geçmişi yönet (OpenAI: user/assistant sırası)
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

  // OpenAI messages dizisi: system + geçmiş
  var messages = [{ role: 'system', content: JARVIS_INSTRUCTION }];
  messages = messages.concat(jarvisHistory);

  var requestBody = {
    model: JARVIS_MODEL,
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000
  };

  try {
    var response = await fetch(JARVIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + JARVIS_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      var errText = await response.text();
      console.error('JARVIS API Hatası (' + response.status + '):', errText);

      var errorDiv = document.createElement('div');
      errorDiv.className = 'jarvis-msg error';
      if (response.status === 429) {
        errorDiv.textContent = 'JARVIS: Efendim, API kotamız dolmuş. Biraz bekleyelim.';
      } else if (response.status === 401) {
        errorDiv.textContent = 'JARVIS: Efendim, API anahtarı geçersiz veya süresi dolmuş.';
      } else {
        errorDiv.textContent = 'JARVIS: Sistem hatası (Kod: ' + response.status + '). Detaylar konsoldadır efendim.';
      }
      display.appendChild(errorDiv);
      display.scrollTop = display.scrollHeight;
      return;
    }

    var data = await response.json();

    // OpenAI yanıt formatı: data.choices[0].message.content
    var reply = null;
    if (data && data.choices && data.choices.length > 0 &&
        data.choices[0].message && data.choices[0].message.content) {
      reply = data.choices[0].message.content;
    }

    if (reply) {
      jarvisHistory.push({ role: 'assistant', content: reply });

      // Aksiyon Kontrolü
      var cleanReply = reply;
      var banMatch = reply.match(/ACTIONBAN:\s*([^\n\r]+)/);
      if (banMatch) {
        var targetName = banMatch[1].trim().replace(/[.,!?*"'_]+$/, '');
        var success = executeJarvisBan(targetName);
        if (!success) {
          cleanReply += '\\n\\n(Sistem Notu: "' + targetName + '" adlı kullanıcı bulunamadığından banlama işlemi BŞARISIZ oldu.)';
        }
        cleanReply = cleanReply.replace(/ACTIONBAN:\s*[^\n\r]+/g, '').trim();
      }

      var botMsg = document.createElement('div');
      botMsg.className = 'jarvis-msg jarvis';
      botMsg.innerHTML = jarvisFormatText(cleanReply);
      display.appendChild(botMsg);
    } else {
      console.warn('JARVIS API boş yanıt döndürdü:', JSON.stringify(data).substring(0, 200));
      var warnMsg = document.createElement('div');
      warnMsg.className = 'jarvis-msg error';
      warnMsg.textContent = 'JARVIS: Efendim, yanıt alınamadı. Tekrar denemenizi rica ederim.';
      display.appendChild(warnMsg);
    }
  } catch (error) {
    console.error('JARVIS Bağlantı Hatası:', error);
    var errMsg = document.createElement('div');
    errMsg.className = 'jarvis-msg error';
    errMsg.textContent = 'JARVIS: Bağlantı koptu efendim. Tekrar denemenizi rica ederim.';
    display.appendChild(errMsg);
  }
  display.scrollTop = display.scrollHeight;
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
  } catch (e) {
    console.warn('JARVIS userStats hatası:', e);
  }

  var swearStats = {};
  try {
    mld.forEach(function(m) {
      if (!m.text) return;
      var isBad = BAD.some(function(word) { return m.text.toLowerCase().includes(word); });
      if (isBad && m.real) swearStats[m.real] = (swearStats[m.real] || 0) + 1;
    });
  } catch (e) {
    console.warn('JARVIS swearStats hatası:', e);
  }

  var roomStats = '';
  try {
    roomStats = channels.map(function(ch) {
      return ch.name + ': ' + ch.msgs.length + ' mesaj, ' + ch.members.length + ' üye';
    }).join('\n');
  } catch (e) {
    roomStats = 'Oda verisi okunamadı';
  }

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

// ─── JARVIS Ban ───────────────────────────────────────────────────────────
function executeJarvisBan(name) {
  try {
    var entry = Object.entries(codes).find(function(e) {
      return e[1].name.toLowerCase() === name.toLowerCase();
    });
    if (entry) {
      codes[entry[0]].banned = true;
      toast(entry[1].name + ' JARVIS tarafından engellendi.', 'e');
      if (typeof rUT === 'function') rUT();
      return true;
    } else {
      console.warn('JARVIS ban: Kullanıcı bulunamadı (' + name + ')');
    }
  } catch (e) {
    console.error('JARVIS ban hatası:', e);
  }
  return false;
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
