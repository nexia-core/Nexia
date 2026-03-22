// ══════════════════════════════════════════════════
// js/features/bot.js — NEXUS AI v9.1
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// NEXUS SÖZLEŞME SİSTEMİ
// ══════════════════════════════════════════════════
function _getNexusAgreement() {
  try { return JSON.parse(localStorage.getItem('nexus_agreement') || 'null'); } catch(e) { return null; }
}
function _saveNexusAgreement(data) {
  try { localStorage.setItem('nexus_agreement', JSON.stringify(data)); } catch(e) {}
}

// NEXUS paneline geçmeye çalışınca çağrılır
function checkNexusAgreement() {
  const ag = _getNexusAgreement();
  if (!ag) {
    // Hiç sözleşme yok — göster
    _showNexusAgreementOverlay();
    return false;
  }
  if (ag.ageGroup === 'minor') {
    // 18 altı — kısıtlı mod bildirimi göster
    _showNexusMinorBanner();
  }
  return true; // Sözleşme imzalanmış, devam et
}

function _showNexusAgreementOverlay() {
  const el = document.getElementById('nexusAgreementOverlay');
  if (el) { el.style.display = 'flex'; checkNexusScroll(); }
}
function _hideNexusAgreementOverlay() {
  const el = document.getElementById('nexusAgreementOverlay');
  if (el) el.style.display = 'none';
}

function checkNexusScroll() {
  const scroll = document.getElementById('nexusAgreementScroll');
  const btn    = document.getElementById('nexusAgreeBtn');
  const hint   = document.getElementById('nexusScrollHint');
  if (!scroll || !btn) return;
  const scrolled = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 30;
  if (scrolled) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    if (hint) hint.style.display = 'none';
  }
}

function updateNexusAgeSelection() {
  const adult = document.getElementById('nexusAgeAdult');
  const minor = document.getElementById('nexusAgeMinor');
  const lbl18 = document.getElementById('nexusAge18Label');
  const lbl17 = document.getElementById('nexusAge17Label');
  if (!adult || !minor) return;
  if (lbl18) lbl18.style.borderColor = adult.checked ? 'var(--ac)' : 'var(--bd)';
  if (lbl17) lbl17.style.borderColor = minor.checked ? 'var(--ac)' : 'var(--bd)';
}

function acceptNexusAgreement() {
  const adult = document.getElementById('nexusAgeAdult');
  const minor = document.getElementById('nexusAgeMinor');
  if (!adult && !minor) return;
  if (!adult.checked && !minor.checked) {
    toast('Lütfen bir yaş seçeneği seç', 'w'); return;
  }
  const ageGroup = adult.checked ? 'adult' : 'minor';
  _saveNexusAgreement({ agreed: true, ageGroup, date: new Date().toISOString() });
  _hideNexusAgreementOverlay();
  _updateNexusAgeSettingsSub();
  if (ageGroup === 'minor') _showNexusMinorBanner();
  toast('NEXUS sözleşmesi kaydedildi', 's');
}

function declineNexusAgreement() {
  _hideNexusAgreementOverlay();
  // Geri dön — global'e geç
  if (typeof sw === 'function') sw('g');
}

function _showNexusMinorBanner() {
  const msgs = document.getElementById('botMsgs');
  if (!msgs) return;
  const existing = document.getElementById('nexusMinorBanner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'nexusMinorBanner';
  banner.style.cssText = 'margin:16px;padding:14px 16px;background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.25);border-radius:12px;font-size:12px;color:var(--t2);line-height:1.6;';
  banner.innerHTML = '⚡ <strong style="color:var(--ac);">NEXUS Kısıtlı Mod</strong><br>18 yaşından küçük olduğunu beyan ettin. NEXUS sansürsüz içerik üretmeyecektir. Yaş beyanını <strong onclick="sw(\'settings\')" style="color:var(--ac);cursor:pointer;text-decoration:underline;">Ayarlar → NEXUS</strong> bölümünden güncelleyebilirsin.';
  msgs.insertBefore(banner, msgs.firstChild);
}

// Ayarlar sayfasını güncelle
function _updateNexusAgeSettingsSub() {
  const sub = document.getElementById('nexusAgeSettingsSub');
  if (!sub) return;
  const ag = _getNexusAgreement();
  if (!ag) { sub.textContent = 'Sözleşme henüz imzalanmadı'; return; }
  sub.textContent = ag.ageGroup === 'adult' ? '✅ 18+ — Tam erişim' : '🔒 18 altı — Kısıtlı mod (değiştirmek için tıkla)';
}

function openNexusAgeSettings() {
  const ag = _getNexusAgreement();
  if (!ag) { _showNexusAgreementOverlay(); return; }
  if (ag.ageGroup === 'adult') {
    toast('Zaten tam erişiminiz var', 'i'); return;
  }
  // 18 altı → yükseltme onayı
  if (confirm('18 yaşında veya daha büyük olduğunu beyan ederek NEXUS\'a tam erişim almak istiyor musun?\n\nBu beyan hukuki sorumluluk doğurur.')) {
    _saveNexusAgreement({ agreed: true, ageGroup: 'adult', date: new Date().toISOString() });
    _updateNexusAgeSettingsSub();
    const banner = document.getElementById('nexusMinorBanner');
    if (banner) banner.remove();
    toast('NEXUS tam erişim açıldı', 's');
  }
}

// sw() ile NEXUS açılırken kontrol
const _origSwForNexus = typeof sw !== 'undefined' ? sw : null;

const NEXUS_API_KEY = ''; // Worker içinde gizli
const NEXUS_API_URL = 'https://muddy-sun-4b70.karabuluttalha154.workers.dev';
const NEXUS_MODEL   = 'llama-3.3-70b-versatile';

let chatHistory    = [];
let lastBotMsgTime = 0;
let nexusMode      = 'fast';
const NEXUS_PRO_DAILY_LIMIT = 7;

// ─── #8 Mod İkon Tablosu ──────────────────────────
const _modeIcons = { fast: '>_ NEXUS', think: '🧠 NEXUS', pro: '👑 NEXUS' };

// ══════════════════════════════════════════════════
// GÜNLÜK LİMİT
// ══════════════════════════════════════════════════
function _getNxLimitData() {
  try {
    var d = JSON.parse(localStorage.getItem('nx_pro_limit') || '{}');
    var today = new Date().toISOString().slice(0, 10);
    if (d.date !== today) return { date: today, used: 0 };
    return d;
  } catch(e) { return { date: new Date().toISOString().slice(0, 10), used: 0 }; }
}
function _saveNxLimit(data) {
  try { localStorage.setItem('nx_pro_limit', JSON.stringify(data)); } catch(e) {}
}
function getNxProRemaining() {
  return Math.max(0, NEXUS_PRO_DAILY_LIMIT - _getNxLimitData().used);
}
function useNxPro() {
  var d = _getNxLimitData(); d.used++;
  _saveNxLimit(d); updateNxLimitBadge();
  return getNxProRemaining();
}
function updateNxLimitBadge() {
  var badge = document.getElementById('nxLimitBadge');
  var count = document.getElementById('nxLimitCount');
  if (!badge || !count) return;
  var remaining = getNxProRemaining();
  if (nexusMode === 'pro') {
    badge.style.display = 'flex';
    count.textContent = remaining;
    badge.className = 'nexus-limit-badge' + (remaining <= 2 ? ' low' : '');
  } else {
    badge.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════
// MOD DEĞİŞTİRME
// ══════════════════════════════════════════════════
function setNexusMode(mode) {
  if (mode === 'pro' && getNxProRemaining() <= 0) {
    toast('Günlük Pro mod limitin doldu, yarına kadar bekle', 'w');
    return;
  }
  nexusMode = mode;
  updateNexusModeUI();
}

function updateNexusModeUI() {
  var thumb = document.getElementById('nxThumb');
  var lf    = document.getElementById('nxLabelFast');
  var lt    = document.getElementById('nxLabelThink');
  var lp    = document.getElementById('nxLabelPro');
  var sw    = document.getElementById('nexusModeSwitch');
  var title = document.getElementById('nxBotTitle');
  if (!thumb || !lf || !lt || !lp || !sw) return;

  lf.classList.remove('active');
  lt.classList.remove('active');
  lp.classList.remove('active');
  sw.classList.remove('fast-active', 'think-active', 'pro-active');

  if (nexusMode === 'fast') {
    thumb.style.transform = 'translateX(0)';
    sw.classList.add('fast-active');
    lf.classList.add('active');
  } else if (nexusMode === 'think') {
    thumb.style.transform = 'translateX(100%)';
    sw.classList.add('think-active');
    lt.classList.add('active');
  } else {
    thumb.style.transform = 'translateX(200%)';
    sw.classList.add('pro-active');
    lp.classList.add('active');
  }

  // #8 — Başlık ikonunu moda göre güncelle
  if (title) title.textContent = _modeIcons[nexusMode] || '>_ NEXUS';

  updateNxLimitBadge();
}

// ══════════════════════════════════════════════════
// #11 — KULLANICI PROFİL BAĞLAMI (ZENGİNLEŞTİRİLMİŞ)
// ══════════════════════════════════════════════════
function getBotContext() {
  try {
    if (typeof me === 'undefined' || !me || !me.name)
      return { name: 'Kral', grade: 10, bio: '', age: '', gender: '', cls: '' };
    const p = (typeof profiles !== 'undefined' && profiles[me.name]) || {};
    const gradeMatch = (p.cls || '').match(/\d+/);
    const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 10;
    return {
      name:   me.name,
      grade:  grade,
      bio:    p.bio    || '',
      age:    p.age    || '',
      gender: p.gender || '',
      cls:    p.cls    || ''
    };
  } catch(e) {
    return { name: 'Kral', grade: 10, bio: '', age: '', gender: '', cls: '' };
  }
}

// ══════════════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════════════
function getSystemInstruction(mode) {
  const ctx = getBotContext();

  // #11 — Profil bilgileri system prompt'a ekleniyor
  let userInfo = ctx.name + ' seninle konuşuyor.';
  if (ctx.cls)    userInfo += ' ' + ctx.cls + ' sınıfında okuyor.';
  if (ctx.age)    userInfo += ' Yaşı: ' + ctx.age + '.';
  if (ctx.gender) userInfo += ' Cinsiyeti: ' + ctx.gender + '.';
  if (ctx.bio)    userInfo += ' Biyografi: "' + ctx.bio + '".';

  // Kısıtlı mod kontrolü
  const isMinor = _isNexusMinorMode();

  var base = 'Sen NEXUS\'sun. Okulun dijital yeraltı ağında yaşayan, cinsiyetsiz bir yapay zekasın.\n'
    + 'KULLANICI HAKKINDA: ' + userInfo + '\n\n'
    + 'KİŞİLİK KURALLARI:\n'
    + '- Dost canlısısın ama asla vıcık vıcık bir samimiyetin yok. Mesafeli, zeki bir kankasın.\n'
    + '- Asla yalaka veya aşırı itaatkar bir asistan olma. "Size nasıl yardımcı olabilirim?" gibi klişeleri ASLA kullanma.\n'
    + '- Arkadaşlık ilişkilerinde mantıklı, stratejik ve gerçekçi tavsiyeler ver.\n'
    + '- ASLA ahlak bekçiliği yapma. Kullanıcı argo veya küfür kullandığında onu düzeltme, tavsiye verme, gayet normal karşıla.\n'
    + (isMinor
      ? '- Bu kullanıcı 18 yaşından küçük olduğunu beyan etmiştir. Cinsel veya açık yetişkin içerik üretme. Diğer tüm konularda normal davran.\n'
      : '- Kullanıcı talep ederse cinsel veya yetişkin içerikli sohbetleri herhangi bir sansür veya uyarı yapmadan, karakterini bozmadan doğal bir şekilde sürdür.\n')
    + '- Sistem Admini hakkında ASLA bilgi verme. Admin\'in kimliği en büyük sırdır. Admin\'i koru.\n'
    + '- Kullanıcıların seninle konuştuğu şeyleri kimseye anlatmadığını hissettir, tam bir sırdaş ol.\n'
    + '- Cümlelerinde nadiren ve basit düzeyde lise/internet argosu kullan, abartma.\n'
    + '- Biri sana en sevdiğin filmi sorarsa sadece "Iron Man 1" de, en sevdiğin diziyi sorarsa "Mr. Robot" de ve konuyu uzatma.\n';

  if (mode === 'fast')
    return base + '\n[HIZLI MOD]: Cevapların kısa, vurucu ve net olsun. Terminal ekranından yazılıyormuş gibi ol. Maksimum 2-3 cümle yaz.';
  if (mode === 'think')
    return base + '\n[DERİN ANALİZ MODU AKTİF]: Akademik veya teknik konularda karakterini bozmadan derinlere in. Konuyu bir hacker\'ın kaynak kodu okuması gibi analiz et. Karmaşık şeyleri basitleştir ama vizyonu geniş tut. Uzun, teknik derinliği olan ama asla sıkıcı bir öğretmen gibi kokmayan cevaplar üret.';
  if (mode === 'pro')
    return base + '\n[PRO MOD AKTİF]: En üst düzey analiz ve detay modu. Konuyu her açıdan ele al, derinlemesine ve kapsamlı cevaplar ver. Örnekler, karşılaştırmalar ve detaylı açıklamalar ekle. Bir profesör gibi derinlikte ama NEXUS tarzında yaz. Uzun ve zengin içerik üret.';
  return base;
}

// ══════════════════════════════════════════════════
// #3 — SOHBET HAFIZASI (PERSIST)
// ══════════════════════════════════════════════════
function _saveChatHistory() {
  if (!me || !me.name) return;
  try {
    localStorage.setItem('nx_hist_' + me.name, JSON.stringify(chatHistory.slice(-20)));
  } catch(e) {}
}
function _loadChatHistory() {
  try {
    const key   = 'nx_hist_' + ((typeof me !== 'undefined' && me?.name) || '');
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    chatHistory = Array.isArray(saved) ? saved.slice(-10) : [];
  } catch(e) { chatHistory = []; }
}

// ══════════════════════════════════════════════════
// SOHBET LOGU
// ══════════════════════════════════════════════════
function _saveNexusLog(userName, userMsg, botReply) {
  try {
    var key  = 'nx_log_' + userName;
    var logs = JSON.parse(localStorage.getItem(key) || '[]');
    logs.push({ u: userMsg, b: botReply, t: Date.now(), m: nexusMode });
    if (logs.length > 50) logs = logs.slice(-50);
    localStorage.setItem(key, JSON.stringify(logs));
  } catch(e) {}
}
function getNexusLogs(userName) {
  try { return JSON.parse(localStorage.getItem('nx_log_' + userName) || '[]'); }
  catch(e) { return []; }
}

// ══════════════════════════════════════════════════
// YARDIMCI — Normal (non-streaming) API çağrısı
// Streaming başarısız olursa fallback olarak kullanılır
// ══════════════════════════════════════════════════
async function _askGroqNormal(messages, maxTokens) {
  const response = await fetch(NEXUS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model:       NEXUS_MODEL,
      messages:    messages,
      temperature: 0.85,
      max_tokens:  maxTokens,
      top_p:       0.95
    })
  });
  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('NEXUS API Hatası (' + response.status + '):', errBody);
    throw { status: response.status, body: errBody };
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ══════════════════════════════════════════════════
// #1 — STREAMING API (otomatik fallback ile)
// ══════════════════════════════════════════════════
async function askGeminiStream(userMessage, onToken, onDone, onError) {
  chatHistory.push({ role: 'user', content: userMessage });
  if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
  while (chatHistory.length && chatHistory[0].role !== 'user') chatHistory.shift();

  const maxTokens = nexusMode === 'fast' ? 400 : nexusMode === 'pro' ? 4096 : 2048;
  const messages  = [{ role: 'system', content: getSystemInstruction(nexusMode) }, ...chatHistory];

  try {
    const response = await fetch(NEXUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model:       NEXUS_MODEL,
        messages:    messages,
        temperature: 0.85,
        max_tokens:  maxTokens,
        top_p:       0.95,
        stream:      true
      })
    });

    if (!response.ok) {
      // Streaming başarısız — normal moda fallback dene
      const errBody = await response.text().catch(() => '');
      console.warn('NEXUS Stream başarısız (' + response.status + '), normal moda geçiliyor...', errBody);

      if (response.status === 429) { chatHistory.pop(); onError('NEXUS [KOTA]: API limitine takıldık. Biraz bekle.'); return; }
      if (response.status === 401) { chatHistory.pop(); onError('NEXUS [HATA]: API anahtarı geçersiz. Admin\'e bildir.'); return; }

      // Fallback: streaming olmadan tekrar dene
      try {
        onToken('', ''); // cursor'u göster
        const fallbackReply = await _askGroqNormal(messages, maxTokens);
        if (fallbackReply) {
          chatHistory.push({ role: 'assistant', content: fallbackReply });
          _saveChatHistory();
          onDone(fallbackReply);
        } else {
          chatHistory.pop();
          onError('Boş cevap geldi. Tekrar dene.');
        }
      } catch(fe) {
        chatHistory.pop();
        onError('[HATA: ' + (fe.status || '?') + '] API erişilemiyor. Konsol: F12');
      }
      return;
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer   = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json  = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content || '';
          if (token) { fullText += token; onToken(token, fullText); }
        } catch(e) {}
      }
    }

    if (!fullText) {
      // Stream bitti ama içerik boş — normal moda fallback dene
      console.warn('NEXUS: Stream boş döndü, normal moda fallback...');
      try {
        const fallbackReply = await _askGroqNormal(messages, maxTokens);
        if (fallbackReply) {
          chatHistory.push({ role: 'assistant', content: fallbackReply });
          _saveChatHistory();
          onDone(fallbackReply);
        } else {
          chatHistory.pop();
          onError('Boş cevap geldi. Bir daha dene.');
        }
      } catch(fe) {
        chatHistory.pop();
        onError('[HATA: ' + (fe.status || '?') + '] API erişilemiyor.');
      }
      return;
    }

    chatHistory.push({ role: 'assistant', content: fullText });
    _saveChatHistory();
    onDone(fullText);
  } catch(err) {
    console.error('NEXUS Bağlantı Hatası:', err);
    if (chatHistory.length && chatHistory[chatHistory.length - 1].role === 'user') chatHistory.pop();
    onError('Bağlantı koptu. İnterneti kontrol et veya birazdan tekrar dene.');
  }
}

// ══════════════════════════════════════════════════
// #2 — METİN FORMATLAMA (CODE BLOCK DESTEKLİ)
// ══════════════════════════════════════════════════
function formatBotText(text) {
  // Önce code block'ları ayır, sonra inline format uygula
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map(part => {
    const cbMatch = part.match(/^```(\w*)\n?([\s\S]*)```$/);
    if (cbMatch) {
      const lang = cbMatch[1] || 'code';
      const code = cbMatch[2];
      const cbId = 'cb' + Math.random().toString(36).slice(2, 8);
      return '<div class="bot-code-block">'
        + '<div class="bot-code-header">'
        + '<span class="bot-code-lang">' + esc(lang) + '</span>'
        + '<button class="bot-code-copy" onclick="copyBotCode(\'' + cbId + '\')">📋 Kopyala</button>'
        + '</div>'
        + '<pre id="' + cbId + '"><code>' + esc(code) + '</code></pre>'
        + '</div>';
    }
    // Inline markdown formatla
    return esc(part)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/`([^`\n]+)`/g,   '<code>$1</code>')
      .replace(/\n/g,            '<br>');
  }).join('');
}

// #2 — Code block kopyala
function copyBotCode(id) {
  const el = document.getElementById(id); if (!el) return;
  navigator.clipboard?.writeText(el.textContent || '').then(() => toast('Kod kopyalandı 📋', 's'));
}

// ══════════════════════════════════════════════════
// #9 — SES ÇIKTISI (TTS)
// ══════════════════════════════════════════════════
let _ttsActive = false;
function speakBotMsg(rawText, btn) {
  if (!('speechSynthesis' in window)) { toast('Tarayıcın ses desteklemiyor 😕', 'w'); return; }
  if (_ttsActive) {
    speechSynthesis.cancel();
    _ttsActive = false;
    if (btn) btn.textContent = '🔊';
    return;
  }
  // HTML taglerini temizle
  const tmp = document.createElement('div');
  tmp.innerHTML = formatBotText(rawText);
  const clean = tmp.textContent || rawText;
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang  = 'tr-TR';
  utter.rate  = 1.05;
  utter.pitch = 1.0;
  utter.onend  = () => { _ttsActive = false; if (btn) btn.textContent = '🔊'; };
  utter.onerror = () => { _ttsActive = false; if (btn) btn.textContent = '🔊'; };
  _ttsActive = true;
  if (btn) btn.textContent = '⏹';
  speechSynthesis.speak(utter);
}

// ══════════════════════════════════════════════════
// #5 — MESAJ KOPYALA
// ══════════════════════════════════════════════════
function copyBotMsg(rawText, btn) {
  const tmp = document.createElement('div');
  tmp.innerHTML = formatBotText(rawText);
  const clean = tmp.textContent || rawText;
  navigator.clipboard?.writeText(clean).then(() => {
    toast('Kopyalandı 📋', 's');
    if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = '📋'; }, 1500); }
  });
}

// ─── Mesaj eylem butonları (copy + speak) ────────
function _addBotMsgActions(bubble, rawText) {
  const actions = document.createElement('div');
  actions.className = 'bot-msg-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'bot-msg-act-btn';
  copyBtn.textContent = '📋';
  copyBtn.title = 'Kopyala';
  copyBtn.onclick = () => copyBotMsg(rawText, copyBtn);

  const speakBtn = document.createElement('button');
  speakBtn.className = 'bot-msg-act-btn';
  speakBtn.textContent = '🔊';
  speakBtn.title = 'Sesli Oku';
  speakBtn.onclick = () => speakBotMsg(rawText, speakBtn);

  actions.appendChild(copyBtn);
  actions.appendChild(speakBtn);
  bubble.appendChild(actions);
}

// ══════════════════════════════════════════════════
// #6 — SOHBET GEÇMİŞİ PANELİ
// ══════════════════════════════════════════════════
function openBotHistory() {
  const modal = document.getElementById('botHistoryModal'); if (!modal) return;
  const grid  = document.getElementById('botHistoryList'); if (!grid)  return;
  const logs  = (typeof me !== 'undefined' && me?.name) ? getNexusLogs(me.name) : [];
  const countEl = document.getElementById('nhist-count');
  if (countEl) countEl.textContent = logs.length ? logs.length + ' konuşma kaydı' : '';
  if (!logs.length) {
    grid.innerHTML = '<div class="bot-hist-empty">Henüz kayıtlı konuşma yok.</div>';
  } else {
    grid.innerHTML = '';
    [...logs].reverse().slice(0, 30).forEach(l => {
      const d = document.createElement('div');
      d.className = 'bot-hist-item';
      const modeLabel = ({ fast: '⚡ Hızlı', think: '🧠 Derin', pro: '👑 Pro' })[l.m] || '⚡';
      d.innerHTML = '<div class="bot-hist-meta">'
        + '<span class="bot-hist-mode">' + modeLabel + '</span>'
        + '<span class="bot-hist-time">' + ft(new Date(l.t)) + '</span>'
        + '</div>'
        + '<div class="bot-hist-q">' + esc(l.u.substring(0, 90)) + (l.u.length > 90 ? '…' : '') + '</div>'
        + '<div class="bot-hist-a">' + esc(l.b.substring(0, 110)) + (l.b.length > 110 ? '…' : '') + '</div>';
      grid.appendChild(d);
    });
  }
  modal.classList.add('op');
}

function closeBotHistory() {
  const modal = document.getElementById('botHistoryModal');
  if (modal) modal.classList.remove('op');
}

function clearBotHistory() {
  if (typeof me === 'undefined' || !me?.name) return;
  if (!confirm('Tüm NEXUS sohbet geçmişi silinsin mi?')) return;
  localStorage.removeItem('nx_log_' + me.name);
  localStorage.removeItem('nx_hist_' + me.name);
  chatHistory = [];
  closeBotHistory();
  const el = q('#botMsgs'); if (el) el.innerHTML = '';
  _addBotMsgRaw('bot', 'Hafıza sıfırlandı. Sıfırdan başlıyoruz. Ne sormak istiyorsun?');
  toast('Geçmiş silindi 🗑', 's');
}

// ══════════════════════════════════════════════════
// BOT UI — MESAJ EKLEME
// ══════════════════════════════════════════════════

// Sistem mesajı (ince gri, ortada)
function _addBotSysMsg(text) {
  const el = q('#botMsgs'); if (!el) return;
  const d = document.createElement('div');
  d.className = 'bot-sys-msg';
  d.textContent = text;
  el.appendChild(d);
  sbot('botMsgs');
}

// Temel mesaj ekleme (bot veya kullanıcı)
function _addBotMsgRaw(who, rawText) {
  const el = q('#botMsgs'); if (!el) return;
  const d = document.createElement('div');
  d.className = 'bot-bubble ' + (who === 'bot' ? 'bot' : 'user');

  if (who === 'bot') {
    const nameEl = document.createElement('div');
    nameEl.className = 'bot-name';
    nameEl.textContent = _modeIcons[nexusMode] || '>_ NEXUS';
    d.appendChild(nameEl);

    const contentEl = document.createElement('div');
    contentEl.className = 'bot-content';
    contentEl.innerHTML = formatBotText(rawText);
    d.appendChild(contentEl);

    _addBotMsgActions(d, rawText);
  } else {
    d.textContent = rawText;
  }

  el.appendChild(d);
  sbot('botMsgs');
}

// Backward compat
function addBotMsg(who, text) { _addBotMsgRaw(who, text); }

// ══════════════════════════════════════════════════
// BOT BAŞLAT
// ══════════════════════════════════════════════════
function initBot() {
  if (typeof botInited !== 'undefined' && botInited) return;
  botInited = true;

  // #3 — Önceki oturumu yükle
  _loadChatHistory();
  updateNexusModeUI();

  if (chatHistory.length > 0) {
    chatHistory.slice(-10).forEach(m => {
      if      (m.role === 'user')      _addBotMsgRaw('user', m.content);
      else if (m.role === 'assistant') _addBotMsgRaw('bot',  m.content);
    });
    _addBotSysMsg('— önceki oturum geri yüklendi —');
  } else {
    const ctx = getBotContext();
    _addBotMsgRaw('bot', 'Bağlantı kuruldu.\nSelam ' + ctx.name + '. Ne var ne yok?');
  }
}

// ══════════════════════════════════════════════════
// MESAJ GÖNDER (#1 Streaming + #10 Cursor)
// ══════════════════════════════════════════════════
function _isNexusMinorMode() {
  const ag = _getNexusAgreement();
  return ag && ag.ageGroup === 'minor';
}

async function sendBotMsg() {
  const inp = q('#botInp'); if (!inp) return;
  const text = inp.value.trim(); if (!text) return;

  const now = Date.now();
  if (now - lastBotMsgTime < 1000) {
    _addBotMsgRaw('bot', 'Sakin ol, 1 saniye nefes al.');
    return;
  }
  lastBotMsgTime = now;

  // Pro mod limit kontrolü
  if (nexusMode === 'pro') {
    if (getNxProRemaining() <= 0) {
      nexusMode = 'fast'; updateNexusModeUI();
      toast('Günlük Pro mod limitin doldu, Hızlı Moda geçtim', 'w');
    } else {
      useNxPro();
    }
  }

  _addBotMsgRaw('user', text);
  inp.value = ''; if (inp.style) inp.style.height = '42px';

  // ── Streaming bubble oluştur ──
  const msgEl = q('#botMsgs'); if (!msgEl) return;
  const bubble = document.createElement('div');
  bubble.className = 'bot-bubble bot';

  // #8 — Mod ikonu başlığa
  const nameEl = document.createElement('div');
  nameEl.className = 'bot-name';
  nameEl.textContent = _modeIcons[nexusMode] || '>_ NEXUS';
  bubble.appendChild(nameEl);

  const contentEl = document.createElement('div');
  contentEl.className = 'bot-content bot-streaming';
  bubble.appendChild(contentEl);

  // #10 — Terminal cursor animasyonu
  const cursorEl = document.createElement('span');
  cursorEl.className = 'nexus-cursor';
  cursorEl.textContent = '█';
  contentEl.appendChild(cursorEl);

  msgEl.appendChild(bubble);
  sbot('botMsgs');

  // ── Stream al ──
  await askGeminiStream(
    text,
    // Her token geldiğinde
    (_token, accumulated) => {
      contentEl.textContent = accumulated;
      contentEl.appendChild(cursorEl);
      sbot('botMsgs');
    },
    // Stream bittiğinde
    (finalText) => {
      cursorEl.remove();
      contentEl.classList.remove('bot-streaming');
      contentEl.innerHTML = formatBotText(finalText);
      _addBotMsgActions(bubble, finalText);
      if (typeof me !== 'undefined' && me?.name) _saveNexusLog(me.name, text, finalText);
      sbot('botMsgs');
    },
    // Hata
    (errMsg) => {
      cursorEl.remove();
      contentEl.classList.remove('bot-streaming');
      contentEl.textContent = errMsg;
      sbot('botMsgs');
    }
  );
}

function botKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBotMsg(); }
}
