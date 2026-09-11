/**
 * ============================================================================
 * AI QUIZ PRO — FEATURE LAYER (Theme, Settings, Report, Achievements, Senpai, PWA)
 * Loaded after app.js. Hooks into app.js via window.onAppReady / window.onQuizEnd
 * instead of modifying core gameplay logic directly.
 * ============================================================================
 */

/* ============================================================================
   THEME (Dark / Light)
   ============================================================================ */
function setTheme(mode) {
    const html = document.documentElement;
    if (mode === 'light') {
        html.setAttribute('data-theme', 'light');
        document.getElementById('theme-btn-light')?.classList.add('active');
        document.getElementById('theme-btn-dark')?.classList.remove('active');
        const meta = document.getElementById('theme-color-meta');
        if (meta) meta.setAttribute('content', '#eef1f7');
    } else {
        html.removeAttribute('data-theme');
        document.getElementById('theme-btn-dark')?.classList.add('active');
        document.getElementById('theme-btn-light')?.classList.remove('active');
        const meta = document.getElementById('theme-color-meta');
        if (meta) meta.setAttribute('content', '#00131a');
    }
    localStorage.setItem('ui_theme', mode);
    if (typeof playSound === 'function') playSound('snd-click');
}

function initTheme() {
    const saved = localStorage.getItem('ui_theme') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setThemeSilent(saved);
}
function setThemeSilent(mode) {
    const html = document.documentElement;
    if (mode === 'light') {
        html.setAttribute('data-theme', 'light');
    } else {
        html.removeAttribute('data-theme');
    }
    document.getElementById('theme-btn-light')?.classList.toggle('active', mode === 'light');
    document.getElementById('theme-btn-dark')?.classList.toggle('active', mode !== 'light');
}
window.setTheme = setTheme;

/* ============================================================================
   API KEY SETTINGS
   ============================================================================ */
function saveApiKeys() {
    const g = document.getElementById('key-gemini').value.trim();
    const q = document.getElementById('key-groq').value.trim();
    const r = document.getElementById('key-rapidapi').value.trim();
    if (g) localStorage.setItem('key_gemini', g); else localStorage.removeItem('key_gemini');
    if (q) localStorage.setItem('key_groq', q); else localStorage.removeItem('key_groq');
    if (r) localStorage.setItem('key_rapidapi', r); else localStorage.removeItem('key_rapidapi');
    if (typeof playSound === 'function') playSound('snd-correct');
    refreshSenpaiVisibility();
    const hint = document.querySelector('#tab-settings .settings-hint');
    if (hint) {
        const old = hint.textContent;
        hint.textContent = "✔ Keys saved to this browser.";
        hint.style.color = "var(--success)";
        setTimeout(() => { hint.textContent = old; hint.style.color = ''; }, 1800);
    }
}
function prefillApiKeyInputs() {
    const g = document.getElementById('key-gemini');
    const q = document.getElementById('key-groq');
    const r = document.getElementById('key-rapidapi');
    if (g) g.value = localStorage.getItem('key_gemini') || '';
    if (q) q.value = localStorage.getItem('key_groq') || '';
    if (r) r.value = localStorage.getItem('key_rapidapi') || '';
}
window.saveApiKeys = saveApiKeys;
window.prefillApiKeyInputs = prefillApiKeyInputs;

/* ============================================================================
   OVERALL REPORT
   ============================================================================ */
window.showReport = function() {
    if (typeof playSound === 'function') playSound('snd-click');
    navigateTo('report');
    if (window.todayKey) localStorage.setItem('report_viewed_date', todayKey());
    if (window.checkDailyTasks) checkDailyTasks();

    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const body = document.getElementById('report-body');

    if (history.length === 0) {
        body.innerHTML = `<div class="report-empty">NO SESSIONS LOGGED YET.<br>Complete a quiz to generate your report.</div>`;
        return;
    }

    let totalCorrect = 0, totalPossible = 0;
    let topicScores = {};
    history.forEach(h => {
        totalCorrect += h.score; totalPossible += h.total;
        if (!topicScores[h.topic]) topicScores[h.topic] = { c: 0, t: 0, n: 0 };
        topicScores[h.topic].c += h.score;
        topicScores[h.topic].t += h.total;
        topicScores[h.topic].n += 1;
    });
    const accuracy = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0;

    let bestTopic = null, worstTopic = null, bestAcc = -1, worstAcc = 101;
    for (const [topic, d] of Object.entries(topicScores)) {
        const acc = (d.c / d.t) * 100;
        if (acc > bestAcc) { bestAcc = acc; bestTopic = topic; }
        if (acc < worstAcc) { worstAcc = acc; worstTopic = topic; }
    }

    let html = `
        <div class="report-summary-grid">
            <div class="report-stat-card"><div class="val">${history.length}</div><div class="lbl">Sessions</div></div>
            <div class="report-stat-card"><div class="val">${accuracy}%</div><div class="lbl">Overall Accuracy</div></div>
            <div class="report-stat-card"><div class="val">${totalCorrect}</div><div class="lbl">Correct Answers</div></div>
            <div class="report-stat-card"><div class="val">${totalPossible}</div><div class="lbl">Questions Faced</div></div>
        </div>
    `;

    if (bestTopic) {
        html += `<div class="report-section-title">Strongest / Weakest Sector</div>
        <div class="settings-block" style="display:flex; justify-content:space-between; gap:10px;">
            <div style="text-align:center; flex:1;">
                <div style="font-size:0.6rem; opacity:0.6;">💪 STRONGEST</div>
                <div style="color:var(--success); font-weight:800; font-size:0.75rem; margin-top:4px;">${esc(bestTopic.toUpperCase())}</div>
                <div style="font-size:0.6rem; opacity:0.7;">${Math.round(bestAcc)}%</div>
            </div>
            <div style="width:1px; background:var(--card-border);"></div>
            <div style="text-align:center; flex:1;">
                <div style="font-size:0.6rem; opacity:0.6;">⚠ NEEDS WORK</div>
                <div style="color:var(--danger); font-weight:800; font-size:0.75rem; margin-top:4px;">${esc(worstTopic.toUpperCase())}</div>
                <div style="font-size:0.6rem; opacity:0.7;">${Math.round(worstAcc)}%</div>
            </div>
        </div>`;
    }

    html += `<div class="report-section-title">Accuracy by Sector</div>`;
    Object.entries(topicScores)
        .sort((a, b) => (b[1].c / b[1].t) - (a[1].c / a[1].t))
        .forEach(([topic, d]) => {
            const acc = Math.round((d.c / d.t) * 100);
            const color = acc >= 80 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--danger)';
            html += `
                <div class="topic-bar-row">
                    <div class="topic-bar-head"><span class="tname">${esc(topic.toUpperCase())} <span style="opacity:0.5; font-weight:400;">(${d.n}x)</span></span><span>${acc}%</span></div>
                    <div class="topic-bar-track"><div class="topic-bar-fill" style="width:${acc}%; background:${color};"></div></div>
                </div>`;
        });

    const recent = history.slice(0, 10).reverse();
    if (recent.length > 1) {
        html += `<div class="report-section-title">Recent Trend (last ${recent.length} sessions)</div>
            <div class="trend-row">${recent.map(h => {
                const pct = h.total > 0 ? (h.score / h.total) * 100 : 0;
                const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                return `<div class="trend-bar" style="height:${Math.max(pct, 4)}%; background:${color};" title="${h.score}/${h.total}"></div>`;
            }).join('')}</div>
            <div class="trend-labels"><span>OLDEST</span><span>NEWEST</span></div>`;
    }

    body.innerHTML = html;
};

function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

/* ============================================================================
   ACHIEVEMENTS (including hidden ones)
   ============================================================================ */
const ACHIEVEMENTS = [
    { id: 'first_link', icon: '🔌', title: 'First Link', desc: 'Complete your first quiz session.', hidden: false,
      test: (h, s) => h.length >= 1 },
    { id: 'ten_sessions', icon: '📡', title: 'Frequent Flyer', desc: 'Complete 10 quiz sessions.', hidden: false,
      test: (h, s) => h.length >= 10 },
    { id: 'fifty_sessions', icon: '🛰️', title: 'Deep Archive', desc: 'Complete 50 quiz sessions.', hidden: false,
      test: (h, s) => h.length >= 50 },
    { id: 'perfect_score', icon: '💯', title: 'Flawless Sync', desc: 'Score 100% on any quiz.', hidden: false,
      test: (h, s) => h.some(x => x.total > 0 && x.score === x.total) },
    { id: 'perfect_three', icon: '🌟', title: 'Hat Trick', desc: 'Score 100% three sessions in a row.', hidden: false,
      test: (h, s) => { for (let i = 0; i <= h.length - 3; i++) { if (h[i].total>0 && h[i].score===h[i].total && h[i+1].total>0 && h[i+1].score===h[i+1].total && h[i+2].total>0 && h[i+2].score===h[i+2].total) return true; } return false; } },
    { id: 'hundred_correct', icon: '🎯', title: 'Centurion', desc: 'Answer 100 questions correctly (all-time).', hidden: false,
      test: (h, s) => h.reduce((a, x) => a + x.score, 0) >= 100 },
    { id: 'rank_elite', icon: '⚡', title: 'Elite Status', desc: 'Reach ELITE rank.', hidden: false,
      test: (h, s) => ['ELITE', 'SAGE', 'ELITE SAGE'].includes(s.rank) },
    { id: 'rank_sage', icon: '🧠', title: 'Sage Mode', desc: 'Reach SAGE rank.', hidden: false,
      test: (h, s) => ['SAGE', 'ELITE SAGE'].includes(s.rank) },
    { id: 'rank_elite_sage', icon: '👑', title: 'Elite Sage', desc: 'Reach the maximum ELITE SAGE rank.', hidden: false,
      test: (h, s) => s.rank === 'ELITE SAGE' },
    { id: 'five_topics', icon: '🗺️', title: 'Explorer', desc: 'Play quizzes across 5 different topics.', hidden: false,
      test: (h, s) => new Set(h.map(x => x.topic)).size >= 5 },
    { id: 'custom_topic', icon: '🛠️', title: 'Architect', desc: 'Complete a quiz on a custom topic you typed yourself.', hidden: false,
      test: (h, s) => h.some(x => !['Video Games','Science','Mathematics','General Knowledge'].includes(x.topic) && !x.topic.startsWith('YT_') && !x.topic.startsWith('MULTIMODAL') && x.topic !== 'MANUAL_VIDEO_DATA') },
    { id: 'youtube_sync', icon: '▶️', title: 'Video Analyst', desc: 'Generate a quiz from a YouTube video.', hidden: false,
      test: (h, s) => h.some(x => x.topic.startsWith('YT_') || x.topic === 'MANUAL_VIDEO_DATA') },
    { id: 'multimodal', icon: '📸', title: 'Multimodal Mind', desc: 'Generate a quiz from a PDF, image, or audio file.', hidden: false,
      test: (h, s) => h.some(x => x.topic.startsWith('MULTIMODAL')) },
    { id: 'used_senpai', icon: '🧑‍🏫', title: 'Study Buddy', desc: 'Ask Senpai a question.', hidden: false,
      test: (h, s) => localStorage.getItem('senpai_used') === '1' },
    // --- HIDDEN ACHIEVEMENTS (stay "???" until unlocked) ---
    { id: 'night_owl', icon: '🌙', title: 'Night Owl', desc: 'Complete a quiz between midnight and 4am.', hidden: true,
      test: (h, s) => h.some(x => { if (!x.isoDate) return false; const hr = new Date(x.isoDate).getHours(); return hr >= 0 && hr < 4; }) },
    { id: 'speed_demon', icon: '⚡', title: 'Speed Demon', desc: 'Score 80%+ on a Hard/Expert difficulty quiz without using a single hint.', hidden: true,
      test: (h, s) => h.some(x => x.total > 0 && (x.score / x.total) >= 0.8 && x.hintsUsed === 0 && /expert|hard/i.test(x.difficulty || '')) },
    { id: 'comeback', icon: '🔥', title: 'The Comeback', desc: 'Score under 40% on a quiz, then score 100% on your very next one.', hidden: true,
      test: (h, s) => { for (let i = 0; i < h.length - 1; i++) { const newer = h[i], older = h[i+1]; if (older.total>0 && (older.score/older.total) < 0.4 && newer.total>0 && newer.score===newer.total) return true; } return false; } },
    { id: 'zero_hero', icon: '🫠', title: 'Zero Hero', desc: 'Score 0 on a quiz. Everyone stumbles sometimes.', hidden: true,
      test: (h, s) => h.some(x => x.score === 0 && x.total > 0) },
    { id: 'wiped_it', icon: '🧹', title: 'Clean Slate', desc: 'Wipe your neural logs at least once.', hidden: true,
      test: (h, s) => localStorage.getItem('has_wiped_data') === '1' },
    { id: 'theme_switcher', icon: '🎨', title: 'Two Sides', desc: 'Try both dark mode and light mode.', hidden: true,
      test: (h, s) => localStorage.getItem('tried_both_themes') === '1' },
    { id: 'gk_master', icon: '🌏', title: 'Know-It-All', desc: 'Score 100% on a General Knowledge quiz.', hidden: true,
      test: (h, s) => h.some(x => x.topic === 'General Knowledge' && x.total > 0 && x.score === x.total) },
    { id: 'export_data', icon: '💾', title: 'Data Hoarder', desc: 'Export your neural logs as JSON.', hidden: true,
      test: (h, s) => localStorage.getItem('has_exported') === '1' },
    { id: 'midnight_grind', icon: '🌌', title: 'Insomniac Sage', desc: 'Log 20+ sessions AND reach SAGE rank.', hidden: true,
      test: (h, s) => h.length >= 20 && ['SAGE', 'ELITE SAGE'].includes(s.rank) },
    { id: 'streak_3', icon: '🔥', title: 'Warming Up', desc: 'Study 3 days in a row.', hidden: false,
      test: (h, s) => (typeof computeStreak === 'function' ? computeStreak() : 0) >= 3 },
    { id: 'streak_7', icon: '🔥', title: 'On Fire', desc: 'Study 7 days in a row.', hidden: false,
      test: (h, s) => (typeof computeStreak === 'function' ? computeStreak() : 0) >= 7 },
    { id: 'streak_30', icon: '🌋', title: 'Unstoppable', desc: 'Study 30 days in a row.', hidden: true,
      test: (h, s) => (typeof computeStreak === 'function' ? computeStreak() : 0) >= 30 },
];

function getCurrentStatsForAchievements() {
    const rank = document.getElementById('stat-rank')?.textContent || 'LEARNER';
    return { rank };
}

function computeUnlocked() {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const s = getCurrentStatsForAchievements();
    const permanentlyUnlocked = new Set(JSON.parse(localStorage.getItem('unlocked_achievements') || '[]'));
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: permanentlyUnlocked.has(a.id) || !!a.test(history, s) }));
}

window.showAchievements = function() {
    if (typeof playSound === 'function') playSound('snd-click');
    navigateTo('achievements');
    renderAchievements();
};

function renderAchievements() {
    const list = computeUnlocked();
    const unlockedCount = list.filter(a => a.unlocked).length;
    document.getElementById('ach-progress-summary').textContent = `${unlockedCount} / ${list.length} UNLOCKED`;

    document.getElementById('ach-grid').innerHTML = list.map(a => {
        if (a.unlocked) {
            const isNew = sessionJustUnlockedIds.has(a.id);
            return `<div class="ach-card unlocked ${isNew ? 'just-unlocked' : ''}">
                <span class="ach-icon">${a.icon}</span>
                <div class="ach-title">${esc(a.title)}</div>
                <div class="ach-desc">${esc(a.desc)}</div>
            </div>`;
        } else if (a.hidden) {
            return `<div class="ach-card locked hidden-locked">
                <span class="ach-icon">❓</span>
                <div class="ach-title">???</div>
                <div class="ach-desc">Hidden achievement — keep playing to discover it.</div>
            </div>`;
        } else {
            return `<div class="ach-card locked">
                <span class="ach-icon">🔒</span>
                <div class="ach-title">${esc(a.title)}</div>
                <div class="ach-desc">${esc(a.desc)}</div>
            </div>`;
        }
    }).join('');

    // shimmer plays once per unlock, not on every subsequent visit to this page
    if (sessionJustUnlockedIds.size > 0) setTimeout(() => sessionJustUnlockedIds.clear(), 1500);
}

let sessionJustUnlockedIds = new Set();

function checkAndToastNewAchievements() {
    const unlockedIds = JSON.parse(localStorage.getItem('unlocked_achievements') || '[]');
    const current = computeUnlocked();
    const newlyUnlocked = current.filter(a => a.unlocked && !unlockedIds.includes(a.id));

    if (newlyUnlocked.length > 0) {
        const allUnlockedIds = current.filter(a => a.unlocked).map(a => a.id);
        localStorage.setItem('unlocked_achievements', JSON.stringify(allUnlockedIds));
        newlyUnlocked.forEach(a => sessionJustUnlockedIds.add(a.id));
        queueToasts(newlyUnlocked);
    }
}

let toastQueue = [];
let toastShowing = false;
function queueToasts(items) {
    toastQueue.push(...items);
    if (!toastShowing) showNextToast();
}
function showNextToast() {
    if (toastQueue.length === 0) { toastShowing = false; return; }
    toastShowing = true;
    const item = toastQueue.shift();
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').textContent = `${item.icon} ${item.title}`;
    toast.classList.add('show');
    if (typeof playSound === 'function') playSound('snd-correct');
    if (navigator.vibrate) navigator.vibrate(80);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(showNextToast, 400);
    }, 3200);
}

/* ============================================================================
   SENPAI — AI CHAT BUDDY (Gemini)
   ============================================================================ */
const SENPAI_SYSTEM_PROMPT = `You are "Senpai", the user's supportive senior — think of the friendliest, most patient upperclassman at school who always makes time to help a junior study. Your personality: warm, a little playful, genuinely proud when the user gets something right, never condescending or lecture-y. Talk the way an approachable senior actually talks — casual contractions, occasional light senpai touches ("nice, kouhai!", "you're catching on fast"), but keep it natural and not gimmicky, and don't overuse emoji (one here and there is plenty). When something's tricky, break it down with everyday analogies and short, punchy explanations rather than a wall of text — bullet points when it helps. Celebrate progress, and if the user is stuck or frustrated, be reassuring before diving back into the explanation. If you don't know something, say so honestly rather than guessing. Keep replies concise (under ~150 words) unless the user explicitly wants more depth. Never claim to be human.`;

let senpaiHistory = [];

function refreshSenpaiVisibility() {
    const fab = document.getElementById('senpai-fab');
    if (!fab) return;
    fab.style.display = 'flex';
}

window.toggleSenpai = function() {
    const panel = document.getElementById('senpai-panel');
    const willOpen = !panel.classList.contains('open');
    panel.classList.toggle('open', willOpen);
    if (willOpen) {
        if (typeof playSound === 'function') playSound('snd-click');
        document.getElementById('senpai-fab')?.classList.remove('has-note');
        if (senpaiHistory.length === 0) {
            addSenpaiMessage('bot', "Hey! I'm Senpai 🧑‍🏫 Ask me to explain anything from your quiz, or just say hi. If I seem quiet, make sure your Gemini key is set in ⚙️ Settings.");
        }
        setTimeout(() => document.getElementById('senpai-input')?.focus(), 200);
    }
};

function addSenpaiMessage(role, text) {
    const box = document.getElementById('senpai-messages');
    const div = document.createElement('div');
    div.className = `senpai-msg ${role}`;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
}

function addTypingIndicator() {
    const box = document.getElementById('senpai-messages');
    const div = document.createElement('div');
    div.className = 'senpai-msg bot typing';
    div.id = 'senpai-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
function removeTypingIndicator() {
    document.getElementById('senpai-typing')?.remove();
}

// [SHARED] Plain Gemini chat-completion call, reused by Senpai and AI Support.
// Returns the reply text, or throws with a human-readable message.
async function geminiChatCall(systemPrompt, contents) {
    const geminiKey = (typeof getGeminiKey === 'function') ? getGeminiKey() : (localStorage.getItem('key_gemini') || '');
    if (!geminiKey) {
        const err = new Error('NO_KEY');
        err.isNoKey = true;
        throw err;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents
        })
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Request failed (${response.status})`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Hmm, I blanked out for a second. Try asking again?";
}
window.geminiChatCall = geminiChatCall;

window.sendSenpaiMessage = async function() {
    const input = document.getElementById('senpai-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    localStorage.setItem('senpai_used', '1');
    if (window.todayKey) localStorage.setItem('senpai_used_date', todayKey());
    if (window.checkDailyTasks) checkDailyTasks();

    addSenpaiMessage('user', text);
    senpaiHistory.push({ role: 'user', text });

    const sendBtn = document.getElementById('senpai-send');
    sendBtn.disabled = true;
    addTypingIndicator();

    try {
        const contextNote = (typeof topicName !== 'undefined' && topicName) ? `The user is currently studying/quizzing on: "${topicName}".` : '';
        const contents = senpaiHistory.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        const reply = await geminiChatCall(SENPAI_SYSTEM_PROMPT + ' ' + contextNote, contents);
        removeTypingIndicator();
        addSenpaiMessage('bot', reply);
        senpaiHistory.push({ role: 'model', text: reply });
        speakSenpaiReply(reply);
    } catch (e) {
        removeTypingIndicator();
        if (e.isNoKey) {
            addSenpaiMessage('bot', "I need a Gemini API key to think! Open ⚙️ Settings (top-left profile icon → SET tab) and paste a free key from aistudio.google.com/apikey — then come back and ask me again.");
        } else {
            addSenpaiMessage('bot', `Sorry, I couldn't connect (${e.message}). Double-check your Gemini key in Settings.`);
        }
        console.error('Senpai error:', e);
    } finally {
        sendBtn.disabled = false;
        checkAndToastNewAchievements();
    }
};

/* ============================================================================
   SENPAI — VOICE OUTPUT (speak replies aloud)
   ============================================================================ */
function speakSenpaiReply(text) {
    if (localStorage.getItem('senpai_voice_out') !== '1') return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // Strip markdown-ish symbols so they aren't read out literally.
    const clean = text.replace(/[*_#`~]/g, '');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 1.02; utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
}

window.toggleSenpaiVoiceOut = function() {
    const on = localStorage.getItem('senpai_voice_out') === '1';
    localStorage.setItem('senpai_voice_out', on ? '0' : '1');
    const btn = document.getElementById('senpai-voice-out-btn');
    if (btn) { btn.textContent = on ? '🔇' : '🔊'; btn.classList.toggle('active', !on); }
    if (on && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (typeof playSound === 'function') playSound('snd-click');
};

/* ============================================================================
   SENPAI — VOICE INPUT (speech-to-text)
   ============================================================================ */
let senpaiRecognition = null;
let senpaiListening = false;

function getSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (!senpaiRecognition) {
        senpaiRecognition = new SR();
        senpaiRecognition.continuous = false;
        senpaiRecognition.interimResults = true;
        senpaiRecognition.lang = 'en-US';
    }
    return senpaiRecognition;
}

window.toggleSenpaiVoiceInput = function() {
    const rec = getSpeechRecognition();
    const micBtn = document.getElementById('senpai-mic-btn');
    if (!rec) {
        addSenpaiMessage('bot', "Voice input isn't supported in this browser — try Chrome on Android/desktop.");
        return;
    }
    if (senpaiListening) { rec.stop(); return; }

    const input = document.getElementById('senpai-input');
    senpaiListening = true;
    micBtn.classList.add('listening');
    input.placeholder = "Listening...";
    if (typeof playSound === 'function') playSound('snd-click');

    rec.onresult = (e) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        input.value = transcript;
    };
    rec.onerror = () => { senpaiListening = false; micBtn.classList.remove('listening'); input.placeholder = "Ask senpai anything..."; };
    rec.onend = () => {
        senpaiListening = false;
        micBtn.classList.remove('listening');
        input.placeholder = "Ask senpai anything...";
        if (input.value.trim()) sendSenpaiMessage();
    };
    try { rec.start(); } catch (e) { senpaiListening = false; micBtn.classList.remove('listening'); }
};

/* ============================================================================
   SENPAI — CAMERA SCANNER (photo -> Gemini vision)
   ============================================================================ */
window.handleSenpaiCameraCapture = async function(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const camBtn = document.getElementById('senpai-camera-btn');
    if (camBtn) { camBtn.classList.add('senpai-camera-flash'); setTimeout(() => camBtn.classList.remove('senpai-camera-flash'), 300); }

    const geminiKey = (typeof getGeminiKey === 'function') ? getGeminiKey() : (localStorage.getItem('key_gemini') || '');
    if (!geminiKey) {
        addSenpaiMessage('bot', "I need a Gemini API key to see images! Add one in ⚙️ Settings first.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function() {
        const base64 = this.result.split(',')[1];
        const imgUrl = this.result;

        // show the photo in the chat as the "user" turn
        const box = document.getElementById('senpai-messages');
        const imgDiv = document.createElement('div');
        imgDiv.className = 'senpai-msg user senpai-img-msg';
        imgDiv.innerHTML = `<img src="${imgUrl}" alt="scanned photo">`;
        box.appendChild(imgDiv);
        box.scrollTop = box.scrollHeight;

        localStorage.setItem('senpai_used', '1');
        if (window.todayKey) localStorage.setItem('senpai_used_date', todayKey());
        if (window.checkDailyTasks) checkDailyTasks();

        addTypingIndicator();
        const sendBtn = document.getElementById('senpai-send');
        sendBtn.disabled = true;

        try {
            const contents = [{
                role: 'user',
                parts: [
                    { text: "Look at this photo (could be a textbook page, a problem, notes, or a diagram) and explain what it shows in a simple, friendly way. If it's a question or problem, help solve it and explain your reasoning." },
                    { inline_data: { mime_type: file.type || 'image/jpeg', data: base64 } }
                ]
            }];
            const reply = await geminiChatCall(SENPAI_SYSTEM_PROMPT, contents);
            removeTypingIndicator();
            addSenpaiMessage('bot', reply);
            senpaiHistory.push({ role: 'model', text: reply });
            speakSenpaiReply(reply);
        } catch (e) {
            removeTypingIndicator();
            addSenpaiMessage('bot', `Couldn't read that photo (${e.message}). Try again with better lighting?`);
        } finally {
            sendBtn.disabled = false;
            checkAndToastNewAchievements();
        }
    };
    reader.readAsDataURL(file);
};

/* ============================================================================
   PWA INSTALL PROMPT
   ============================================================================ */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (localStorage.getItem('install_dismissed') !== '1') {
        document.getElementById('install-banner')?.classList.add('show');
    }
    const btn = document.getElementById('install-app-btn');
    if (btn) btn.style.display = 'block';
});

window.triggerInstall = async function() {
    dismissInstallBanner();
    if (!deferredInstallPrompt) {
        alert("To install: use your browser's menu → 'Install App' / 'Add to Home Screen'.");
        return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
};
window.dismissInstallBanner = function() {
    document.getElementById('install-banner')?.classList.remove('show');
    localStorage.setItem('install_dismissed', '1');
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed:', err));
    });
}

/* ============================================================================
   TRACK MISC ACHIEVEMENT TRIGGERS (non-invasive wraps of existing globals)
   ============================================================================ */
function wrapForAchievementTracking() {
    if (typeof window.clearHistory === 'function') {
        const origClear = window.clearHistory;
        window.clearHistory = function() {
            const hadHistory = JSON.parse(localStorage.getItem('quiz_history') || '[]').length > 0;
            origClear();
            if (hadHistory) { localStorage.setItem('has_wiped_data', '1'); checkAndToastNewAchievements(); }
        };
    }
    if (typeof window.exportLogs === 'function') {
        const origExport = window.exportLogs;
        window.exportLogs = function() {
            origExport();
            localStorage.setItem('has_exported', '1');
            checkAndToastNewAchievements();
        };
    }
    const origSetTheme = setTheme;
    window.setTheme = function(mode) {
        origSetTheme(mode);
        const seen = new Set(JSON.parse(localStorage.getItem('themes_seen') || '[]'));
        seen.add(mode);
        localStorage.setItem('themes_seen', JSON.stringify([...seen]));
        if (seen.has('dark') && seen.has('light')) localStorage.setItem('tried_both_themes', '1');
        checkAndToastNewAchievements();
    };
}

/* ============================================================================
   DAILY STREAK
   ============================================================================ */
function computeStreak() {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    if (history.length === 0) return 0;

    const dayKey = (d) => {
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return null;
        return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    };
    const activeDays = new Set(
        history.map(h => dayKey(h.isoDate || h.date)).filter(Boolean)
    );
    if (activeDays.size === 0) return 0;

    const today = new Date();
    let cursor = new Date(today);
    // If nothing logged yet today, the streak isn't broken until today ends —
    // start counting from yesterday instead so an active streak still shows.
    if (!activeDays.has(dayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
        if (!activeDays.has(dayKey(cursor))) return 0;
    }

    let streak = 0;
    while (activeDays.has(dayKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function renderStreak() {
    const badge = document.getElementById('streak-badge');
    const countEl = document.getElementById('streak-count');
    if (!badge || !countEl) return;
    const streak = computeStreak();
    if (streak > 0) {
        countEl.textContent = streak;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}
window.renderStreak = renderStreak;

/* ============================================================================
   INIT
   ============================================================================ */
window.onAppReady = function() {
    initTheme();
    wrapForAchievementTracking();
    // NOTE: Senpai's fab and achievement toasts are intentionally NOT shown here.
    // This fires on page load, while the splash/login screens are still up. They're
    // revealed by enterMainApp() (see auth.js) once the user actually reaches the home screen.
};

window.onQuizEnd = function(payload) {
    checkAndToastNewAchievements();
    renderStreak();
};
