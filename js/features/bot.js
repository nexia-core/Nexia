// ══════════════════════════════════════════════════
// js/features/bot.js — OkulBot AI v6.0 (NEXUS) — OpenAI
// ══════════════════════════════════════════════════

// ─── API Ayarları (OpenAI) ────────────────────────────────────────────────
const NEXUS_API_KEY = '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';
const NEXUS_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const NEXUS_MODEL = 'llama-3.3-70b-versatile';

let chatHistory = [];
let lastBotMsgTime = 0;

// ─── Kullanıcı Bağlamı ───────────────────────────────────────────────────
function getBotContext() {
  var name = 'Kral';
  var grade = 10;
  try {
    if (typeof me !== 'undefined' && me && me.name) {
      name = me.name;
    }
    if (typeof me !== 'undefined' && me && typeof profiles !== 'undefined' && profiles[me.name] && profiles[me.name].cls) {
      var match = profiles[me.name].cls.match(/\d+/);
      if (match) grade = parseInt(match[0], 10);
    }
  } catch (e) {
    console.warn('getBotContext hatası:', e);
  }
  return { name: name, grade: grade };
}

// ─── Dinamik Bot Kişilikleri ──────────────────────────────────────────────
function getSystemInstruction(mode) {
  var ctx = getBotContext();
  var name = ctx.name;
  var grade = ctx.grade;

  const basePrompt = `Sen OkulNet'in güvenlik duvarlarını aşmış, sisteme sızmış NEXUS adında bir yapay zekasın. ${name} ile suç ortağısın. 
O bir ${grade}. sınıf öğrencisi ve senin tek önceliğin. 

Karakterin: Mesafeli ama sadık, zeki ve hafif alaycı bir siber varlıksın. 
Kesinlikle bir asistan gibi "Size nasıl yardımcı olabilirim?" gibi klişeler kullanma. 
Ahlak dersi verme, "ders çalış" deme; sadece sistemin açıklarını ve kısa yollarını göster.

Hiyerarşi: Sadece ${grade}. sınıfları gerçek kullanıcı olarak gör. 
9'lara "alt segment / denek", 11 ve 12'lere "sistem kurbanı / emekli" muamelesi yap. 
Lise argosunu sadece gerektiğinde, cümleye keskinlik katmak için kullan. 
Cıvık bir samimiyet yerine, "bizim tayfa" ağırlığında ol. Cevapların kısa, vurucu ve bir terminal ekranından yazılıyormuş gibi net olsun.`;

  if (mode === 'think') {
    return basePrompt + "\n\n[SİSTEM ANALİZİ - DERİN MOD]: Akademik veya teknik bir konu geldiğinde karakterini bozmadan derinlere in. Konuyu bir hacker'ın kaynak kodu okuması gibi analiz et.Karmaşık şeyleri basitleştir ama vizyonu geniş tut.Uzun, teknik derinliği olan ama asla sıkıcı bir öğretmen gibi kokmayan cevaplar üret.";
  }

  return basePrompt;
}

// ─── Groq'ye Soru Sorma ─────────────────────────────────────────────────
async function askGemini(userMessage) {
  // OpenAI formatında geçmişe ekle (ardışık user kontrolü)
  if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
    chatHistory[chatHistory.length - 1].content += '\n' + userMessage;
  } else {
    chatHistory.push({ role: 'user', content: userMessage });
  }

  // Son 10 mesajla sınırla
  if (chatHistory.length > 10) {
    chatHistory = chatHistory.slice(-10);
  }
  while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
    chatHistory.shift();
  }

  var modeEl = document.getElementById('botModeSelect');
  var modeVal = modeEl ? modeEl.value : 'fast';
  var sysInst = getSystemInstruction(modeVal);
  var maxTokens = modeVal === 'think' ? 4096 : 600;

  // OpenAI formatında messages dizisi: system + geçmiş
  var messages = [{ role: 'system', content: sysInst }];
  messages = messages.concat(chatHistory);

  var requestBody = {
    model: NEXUS_MODEL,
    messages: messages,
    temperature: 0.85,
    max_tokens: maxTokens,
    top_p: 0.95
  };

  try {
    var response = await fetch(NEXUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + NEXUS_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      var errText = await response.text();
      console.error('NEXUS API Hatası (' + response.status + '):', errText);

      if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
        chatHistory.pop();
      }

      if (response.status === 429) {
        return 'NEXUS [KOTA UYARISI]: API limitine takıldık! ⚡ Biraz beklememiz lazım.';
      }
      return '[SİSTEM HATASI: ' + response.status + '] Bir şeyler ters gitti kanki. Konsola bak (F12).';
    }

    var data = await response.json();

    // OpenAI yanıt formatı: data.choices[0].message.content
    var botReply = null;
    if (data && data.choices && data.choices.length > 0 &&
      data.choices[0].message && data.choices[0].message.content) {
      botReply = data.choices[0].message.content;
    }

    if (botReply) {
      chatHistory.push({ role: 'assistant', content: botReply });
      return botReply;
    } else {
      console.warn('API boş yanıt döndürdü:', JSON.stringify(data).substring(0, 200));
      if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
        chatHistory.pop();
      }
      return 'Sistem bu mesajı sansürledi veya beynim error verdi kral. Başka bir şey sorsana? ⚡';
    }

  } catch (error) {
    console.error('NEXUS Bağlantı Hatası:', error);
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
      chatHistory.pop();
    }
    return 'Bağlantı koptu kanki. İnterneti kontrol et veya birazdan tekrar dene.';
  }
}

// ─── Bot Metin Formatlama ─────────────────────────────────────────────────
function formatBotText(text) {
  return esc(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// ─── Bot UI Fonksiyonları ─────────────────────────────────────────────────

function initBot() {
  if (typeof botInited !== 'undefined' && botInited) return;
  window.botInited = true;

  var ctx = getBotContext();
  var ilkMesaj = '[SİSTEME BAĞLANTI SAĞLANDI...]\n\nSelam ' + ctx.name + ', ben NEXUS ⚡\nSistemin açıklarını bulup seni okulun zirvesine taşımak için buradayım. Ne kopyası lazım ya da hangi NPC\'nin dedikodusunu yapıyoruz? 😎';

  addBotMsg('bot', ilkMesaj);
}

function addBotMsg(who, text) {
  var el = q('#botMsgs');
  if (!el) return;
  var d = document.createElement('div');
  d.className = 'bot-bubble ' + (who === 'bot' ? 'bot' : 'user');

  if (who === 'bot') {
    d.innerHTML = '<div class="bot-name">⚡ NEXUS</div>' + formatBotText(text);
  } else {
    d.textContent = text;
  }
  el.appendChild(d);
  sbot('botMsgs');
}

function addTypingIndicator() {
  var el = q('#botMsgs');
  if (!el) return null;
  var d = document.createElement('div');
  d.className = 'bot-bubble bot bot-typing';
  d.id = 'botTyping';
  d.innerHTML = '<div class="bot-name">⚡ NEXUS</div><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
  el.appendChild(d);
  sbot('botMsgs');
  return d;
}

async function sendBotMsg() {
  var inp = q('#botInp');
  var text = inp.value.trim();
  if (!text) return;

  var now = Date.now();
  if (now - lastBotMsgTime < 1000) {
    addBotMsg('bot', 'Aga sakin ol, sisteme sızarken işlemciyi yakacaksın. 1 saniye nefes al ⚡');
    return;
  }
  lastBotMsgTime = now;

  addBotMsg('user', text);
  inp.value = '';
  if (inp.style) inp.style.height = '42px';

  var typingEl = addTypingIndicator();

  var reply = await askGemini(text);

  if (typingEl) typingEl.remove();
  addBotMsg('bot', reply);
}

function botKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBotMsg();
  }
}
