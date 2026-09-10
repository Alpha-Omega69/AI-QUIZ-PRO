/**
 * ============================================================================
 * AI QUIZ PRO - HYBRID CORE SYSTEM (V2.0 - ADVANCED MULTIMODAL)
 * ============================================================================
 */

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// --- HYBRID API KEYS ---
// SECURITY: keys are never hardcoded here. Each user supplies their own free key via
// Settings, stored only in this browser's localStorage. This is required both for
// safety (a key baked into shipped/public code gets stolen and abused within hours)
// and because it's the only way this app can be distributed (web, Android, or PC)
// without leaking a personal key to every installer.
function getGeminiKey() { return (localStorage.getItem('key_gemini') || '').trim(); }
function getGroqKey() { return (localStorage.getItem('key_groq') || '').trim(); }
function getRapidApiKey() { return (localStorage.getItem('key_rapidapi') || '').trim(); }

// --- GLOBAL STATE VARIABLES ---
let quizData = [];
let currentQ = 0;
let score = 0;
let topicName = "";
let multimodalData = { type: null, payload: null }; // Replaces pdfText & pdfBase64 to handle Audio/Image/PDF universally
let hintsLeft = 3;
let targetQCount = 10;
let timeLeft = 30;
let timerInterval = null;
let currentDiff = "";
let userAnswers = [];
let recordedAudioBlob = null; // Stores the recording for download


// [NEW FEATURE: API Prompt Versioning based on Rank]
const PROMPT_CONFIG = {
    "LEARNER": "Use straightforward language. Focus on fundamental, foundational concepts.",
    "ELITE": "Use technical and professional terminology. Include moderately complex distractors.",
    "SAGE": "Use advanced academic phrasing. Create highly plausible but incorrect distractors requiring deep understanding to differentiate.",
    "ELITE SAGE": "Master level difficulty. Test edge cases, obscure exceptions, and complex multi-step reasoning."
};

/**
 * ============================================================================
 * BACKGROUND PARTICLE NETWORK SYSTEM (Intact)
 * ============================================================================
 */
class NeuralNetworkParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particle-network');
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.initCanvas();
        this.createParticles();
        this.animate();
        this.bindEvents();
    }
    initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    bindEvents() {
        window.addEventListener('resize', () => { this.initCanvas(); this.createParticles(); });
        window.addEventListener('mousemove', (e) => { this.mouse.x = e.x; this.mouse.y = e.y; });
        window.addEventListener('mouseout', () => { this.mouse.x = null; this.mouse.y = null; });
    }
    createParticles() {
        this.particles = [];
        let numberOfParticles = (this.canvas.width * this.canvas.height) / 15000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 2) - 1;
            let directionY = (Math.random() * 2) - 1;
            this.particles.push(new Particle(this.canvas, this.ctx, x, y, directionX, directionY, size, '#00f2ff', this.mouse));
        }
    }
    animate() {
        requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < this.particles.length; i++) this.particles[i].update();
        this.connectParticles();
    }
    connectParticles() {
        let opacityValue = 1;
        for (let a = 0; a < this.particles.length; a++) {
            for (let b = a; b < this.particles.length; b++) {
                let distance = ((this.particles[a].x - this.particles[b].x) * (this.particles[a].x - this.particles[b].x)) + 
                               ((this.particles[a].y - this.particles[b].y) * (this.particles[a].y - this.particles[b].y));
                if (distance < (this.canvas.width / 10) * (this.canvas.height / 10)) {
                    opacityValue = 1 - (distance / 20000);
                    this.ctx.strokeStyle = 'rgba(0, 242, 255,' + opacityValue + ')';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[a].x, this.particles[a].y);
                    this.ctx.lineTo(this.particles[b].x, this.particles[b].y);
                    this.ctx.stroke();
                }
            }
        }
    }
}

class Particle {
    constructor(canvas, ctx, x, y, directionX, directionY, size, color, mouseRef) {
        this.canvas = canvas; this.ctx = ctx; this.x = x; this.y = y;
        this.directionX = directionX; this.directionY = directionY;
        this.size = size; this.color = color; this.mouseRef = mouseRef;
    }
    draw() {
        this.ctx.beginPath(); this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color; this.ctx.fill();
    }
    update() {
        if (this.x > this.canvas.width || this.x < 0) this.directionX = -this.directionX;
        if (this.y > this.canvas.height || this.y < 0) this.directionY = -this.directionY;
        let dx = this.mouseRef.x - this.x; let dy = this.mouseRef.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.mouseRef.radius + this.size) {
            if (this.mouseRef.x < this.x && this.x < this.canvas.width - this.size * 10) this.x += 5;
            if (this.mouseRef.x > this.x && this.x > this.size * 10) this.x -= 5;
            if (this.mouseRef.y < this.y && this.y < this.canvas.height - this.size * 10) this.y += 5;
            if (this.mouseRef.y > this.y && this.y > this.size * 10) this.y -= 5;
        }
        this.x += this.directionX; this.y += this.directionY;
        this.draw();
    }
}

document.addEventListener("DOMContentLoaded", () => { new NeuralNetworkParticleSystem(); });

/**
 * ============================================================================
 * AUDIO AND MEDIA CONTROLLERS
 * ============================================================================
 */
function playSound(id) {
    const s = document.getElementById(id);
    if (s) { s.currentTime = 0; s.play().catch(() => {}); }
}

function toggleMusic() {
    const bgMusic = document.getElementById('bg-music');
    const btn = document.getElementById('music-ctrl');
    if (bgMusic.paused) { 
        bgMusic.play().catch(e => console.log("Playback blocked")); 
        btn.textContent = "🔊 MUSIC: ON"; btn.style.color = "var(--primary)"; btn.style.borderColor = "var(--primary)";
    } else { 
        bgMusic.pause(); 
        btn.textContent = "🔇 MUSIC: OFF"; btn.style.color = "var(--danger)"; btn.style.borderColor = "var(--danger)";
    }
}

function readQuestionAloud() {
    if (!('speechSynthesis' in window)) return alert("Audio Synthesis not supported.");
    window.speechSynthesis.cancel();
    const questionText = document.getElementById('question').textContent;
    const msg = new SpeechSynthesisUtterance(questionText);
    const bgMusic = document.getElementById('bg-music');
    msg.volume = 1; msg.rate = 0.95; msg.pitch = 0.8;
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google'));
    if (englishVoice) msg.voice = englishVoice;
    
    msg.onstart = () => { if (bgMusic && !bgMusic.paused) bgMusic.volume = 0.05; };
    msg.onend = () => { if (bgMusic) bgMusic.volume = 0.4; };
    msg.onerror = () => { if (bgMusic) bgMusic.volume = 0.4; };
    
    window.speechSynthesis.speak(msg);
}

/**
 * ============================================================================
 * NAVIGATION AND UI ROUTING LOGIC
 * ============================================================================
 */
 window.backToHome = () => {
    try {
        playSound('snd-click');
        if (window.speechSynthesis && window.speechSynthesis.cancel) window.speechSynthesis.cancel();
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) bgMusic.volume = 0.4;
        
        multimodalData = { type: null, payload: null }; 
        const statusEl = document.getElementById('custom-status');
        if (statusEl) statusEl.textContent = "No active data stream";
      
                const downloadBtn = document.getElementById('audio-download-btn');
        if (downloadBtn) downloadBtn.style.display = 'none';
        recordedAudioBlob = null;

        
        ['custom-topic', 'yt-url'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "";
        });
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('stats-modal').classList.remove('open');
        document.getElementById('profile-modal').classList.remove('open');
        const senpaiPanel = document.getElementById('senpai-panel');
        if (senpaiPanel) senpaiPanel.classList.remove('open');

        navigateTo('home', { silent: true }); // also exits the quiz focus overlay
        updateVideo('default.mp4');
        clearInterval(timerInterval);
        
        // [NEW FEATURE: Reset Adaptive Theme]
        document.documentElement.style.setProperty('--primary', '#00f2ff');
    } catch (error) {
        console.error("CRITICAL NAVIGATION ERROR:", error);
    }
};

window.backToHomeFromDiff = () => { window.backToHome(); };

window.forceQuit = () => {
    if(confirm("TERMINATE NEURAL LINK AND RETURN TO HOME?")) {
        if (window.speechSynthesis && window.speechSynthesis.cancel) window.speechSynthesis.cancel();
        clearInterval(timerInterval); window.backToHome();
    }
};

window.openCustomQuiz = () => {
    navigateTo('custom');
};

window.backToMainMenu = () => {
    navigateTo('home');
};

/**
 * ============================================================================
 * IDENTITY, PROFILE, & NOTE MANAGEMENT
 * ============================================================================
 */
function updateHomeNav() { 
    const savedName = localStorage.getItem('user_name') || 'GUEST_01';
    const savedPfp = localStorage.getItem('user_pfp');
    const navNameEl = document.getElementById('nav-name');
    const navPfpEl = document.getElementById('nav-pfp');
    if (navNameEl) navNameEl.textContent = savedName.toUpperCase();
    if (savedPfp && navPfpEl) navPfpEl.src = savedPfp;
}

window.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('user_name') || 'GUEST_01';
    const savedPfp = localStorage.getItem('user_pfp');
    document.getElementById('display-name').textContent = savedName;
    document.getElementById('user-name-input').value = savedName;
    if (savedPfp) document.getElementById('user-pfp').src = savedPfp;
    
    updateHomeNav(); updateStats(); renderLibrary();
    document.getElementById('notepad-area').value = localStorage.getItem('neural_notes') || '';

    if (window.onAppReady) { try { window.onAppReady(); } catch(e) { console.warn(e); } }
});

function toggleProfile() {
    const modal = document.getElementById('profile-modal');
    document.getElementById('stats-modal').classList.remove('open');
    const willOpen = !modal.classList.contains('open');
    modal.classList.toggle('open', willOpen);
    setDrawerBackdrop(willOpen);
    if (willOpen) { playSound('snd-click'); if (window.prefillApiKeyInputs) prefillApiKeyInputs(); }
}

function toggleStats() {
    const modal = document.getElementById('stats-modal');
    document.getElementById('profile-modal').classList.remove('open');
    const willOpen = !modal.classList.contains('open');
    if (willOpen) updateStats();
    modal.classList.toggle('open', willOpen);
    setDrawerBackdrop(willOpen);
    if (willOpen) playSound('snd-click');
}

function setDrawerBackdrop(show) {
    const backdrop = document.getElementById('drawer-backdrop');
    if (!backdrop) return;
    if (show) {
        backdrop.classList.add('show');
        requestAnimationFrame(() => backdrop.classList.add('in'));
    } else {
        backdrop.classList.remove('in');
        setTimeout(() => backdrop.classList.remove('show'), 250);
    }
}

// Closes whichever drawer (profile/stats) is open — used by the ✕ button,
// backdrop tap, Escape key, and swipe-to-close.
window.closeDrawers = function() {
    const profile = document.getElementById('profile-modal');
    const stats = document.getElementById('stats-modal');
    const wasOpen = profile.classList.contains('open') || stats.classList.contains('open');
    profile.classList.remove('open');
    stats.classList.remove('open');
    setDrawerBackdrop(false);
    if (wasOpen) playSound('snd-click');
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeDrawers();
});

// Swipe-to-close: these drawers slide in from the right, so a rightward swipe
// dismisses them — the same direction you'd naturally drag them away.
(function enableDrawerSwipeToClose() {
    let startX = null, startY = null;
    ['profile-modal', 'stats-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        }, { passive: true });
        el.addEventListener('touchend', (e) => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (dx > 70 && Math.abs(dy) < 60) window.closeDrawers();
            startX = null; startY = null;
        }, { passive: true });
    });
})();

function toggleEditMode() {
    playSound('snd-click');
    const display = document.getElementById('profile-display-area');
    const edit = document.getElementById('profile-edit-area');
    const gear = document.getElementById('edit-toggle');
    const isEditing = edit.style.display === 'block';
    display.style.display = isEditing ? 'block' : 'none';
    edit.style.display = isEditing ? 'none' : 'block';
    gear.style.color = isEditing ? 'var(--primary)' : 'var(--danger)';
    gear.textContent = isEditing ? '⚙️' : '✖';
}

function saveChanges() {
    const nameInput = document.getElementById('user-name-input').value.trim();
    if (nameInput) {
        localStorage.setItem('user_name', nameInput);
        document.getElementById('display-name').textContent = nameInput;
        // keep the unified login profile's name in sync (single identity, no drift)
        try {
            const profile = JSON.parse(localStorage.getItem('user_profile') || 'null');
            if (profile) { profile.name = nameInput; localStorage.setItem('user_profile', JSON.stringify(profile)); }
        } catch (e) {}
        if (window.applyProfileGreeting) applyProfileGreeting();
        updateHomeNav(); playSound('snd-correct');
    }
    toggleEditMode();
}

function updateProfilePic(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        document.getElementById('user-pfp').src = base64Image;
        document.getElementById('nav-pfp').src = base64Image;
        localStorage.setItem('user_pfp', base64Image);
        try {
            const profile = JSON.parse(localStorage.getItem('user_profile') || 'null');
            if (profile) { profile.avatar = base64Image; localStorage.setItem('user_profile', JSON.stringify(profile)); }
        } catch (e) {}
        playSound('snd-correct');
    };
    reader.readAsDataURL(file);
}

function switchTab(tabId, btn) {
    playSound('snd-click');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}

// [NEW FEATURE: Debounced Storage Writing for Performance]
let noteDebounceTimer;
function saveNotes(sourceId) {
    const id = sourceId || 'notepad-area';
    const el = document.getElementById(id);
    if (!el) return;
    const value = el.value;
    // mirror into the other notepad instance (profile modal <-> Study Hub) so both stay in sync
    ['notepad-area', 'study-notepad'].forEach(otherId => {
        if (otherId === id) return;
        const other = document.getElementById(otherId);
        if (other && other.value !== value) other.value = value;
    });
    clearTimeout(noteDebounceTimer);
    noteDebounceTimer = setTimeout(() => {
        localStorage.setItem('neural_notes', value);
    }, 600); // Wait 600ms after last keystroke before saving
}

/**
 * ============================================================================
 * LOCAL PDF LIBRARY STORAGE 
 * ============================================================================
 */
async function handleLibraryUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let text = "";
            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ") + " ";
            }
            let lib = JSON.parse(localStorage.getItem('neural_library') || '[]');
            lib.push({ name: file.name, content: text.substring(0, 10000) });
            localStorage.setItem('neural_library', JSON.stringify(lib));
            renderLibrary(); playSound('snd-correct');
        } catch(e) { alert("LIB COMPRESSION ERROR"); }
    };
    reader.readAsArrayBuffer(file);
}

function renderLibrary() {
    const container = document.getElementById('library-list');
    const lib = JSON.parse(localStorage.getItem('neural_library') || '[]');
    if (lib.length === 0) return container.innerHTML = '<div style="font-size:0.6rem; opacity:0.3; padding:10px;">ARCHIVE EMPTY</div>'; 
    
    container.innerHTML = lib.map((item, idx) => `
        <div class="lib-item">
            <div class="lib-name">${item.name.toUpperCase()}</div>
            <div>
                <button class="ui-btn" style="padding:4px 8px; font-size:0.5rem;" onclick="launchFromLib(${idx})">LINK</button>
                <button class="ui-btn" style="padding:4px 8px; font-size:0.5rem; border-color:var(--danger); color:var(--danger);" onclick="deleteFromLib(${idx})">X</button>
            </div>
        </div>
    `).join('');
}

function launchFromLib(idx) {
    const lib = JSON.parse(localStorage.getItem('neural_library') || '[]');
    multimodalData = { type: "text", payload: lib[idx].content };
    topicName = lib[idx].name;
    document.getElementById('custom-status').textContent = "LINKED: " + lib[idx].name;
    toggleProfile(); selectTopic(topicName, true); 
}

function deleteFromLib(idx) {
    let lib = JSON.parse(localStorage.getItem('neural_library') || '[]');
    lib.splice(idx, 1);
    localStorage.setItem('neural_library', JSON.stringify(lib));
    renderLibrary();
}

/**
 * ============================================================================
 * PLAYER STATISTICS SYSTEM & EDUCATIONAL ANALYTICS
 * ============================================================================
 */
function updateStats() {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    let totalCorrect = 0; let totalPossible = 0;
    
    // [NEW FEATURE: Educational Weakness Mapping]
    let categoryScores = {};

    history.forEach(item => { 
        totalCorrect += item.score; 
        totalPossible += item.total; 
        
        // Track for weakness mapping
        if(!categoryScores[item.topic]) categoryScores[item.topic] = { c: 0, t: 0 };
        categoryScores[item.topic].c += item.score;
        categoryScores[item.topic].t += item.total;
    });
    
    const accuracy = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0;
    
    document.getElementById('stat-links').textContent = history.length;
    document.getElementById('stat-correct').textContent = totalCorrect;
    document.getElementById('stat-acc').textContent = accuracy + "%";
    
    let rank = "LEARNER";
    if (totalCorrect > 20) rank = "ELITE";
    if (totalCorrect > 100) rank = "SAGE";
    if (accuracy > 95 && history.length > 5) rank = "ELITE SAGE";
    
    document.getElementById('stat-rank').textContent = rank;
    document.getElementById('display-rank').textContent = rank;

    // Execute Weakness Analysis Update
    let weakestTopic = null;
    let lowestAcc = 100;
    for(const [topic, data] of Object.entries(categoryScores)) {
        if(data.t >= 5) { // Only analyze topics with enough data points
            let acc = (data.c / data.t) * 100;
            if(acc < lowestAcc) { lowestAcc = acc; weakestTopic = topic; }
        }
    }

    const weakEl = document.getElementById('stat-weakness');
    if(weakestTopic && lowestAcc < 70) {
        weakEl.textContent = `VULNERABILITY DETECTED: ${weakestTopic.toUpperCase()} (${Math.round(lowestAcc)}%)`;
    } else {
        weakEl.textContent = `SYSTEM STABLE: NO GLARING VULNERABILITIES`;
        weakEl.style.color = "var(--success)";
    }
}

/**
 * ============================================================================
 * MULTIMODAL MEDIA PROCESSING (AUDIO, IMAGE, VIDEO, TEXT)
 * ============================================================================
 */
// 1. YouTube Data
// NOTE ON WHY THIS BROKE: YouTube itself blocks direct browser (CORS) requests for
// captions/transcripts — there is no client-side-only way around that, it requires a
// backend proxy. The previous build depended on one specific RapidAPI transcript
// service (with a hardcoded, now-dead key) which YouTube/RapidAPI rate-limits and
// blocks aggressively, so it failed silently for most videos/keys.
// This version: (1) never ships a dead key, (2) tries the transcript API only if the
// user supplied their OWN RapidAPI key in Settings, (3) tries a second provider as a
// fallback, and (4) if both fail (or no key is set) it drops straight into the manual
// transcript box instead of a dead-end alert — that path always works.
async function analyzeYouTube() {
    const url = document.getElementById('yt-url').value;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length == 11) ? match[2] : null;
    if (!videoId) return alert("INVALID NEURAL LINK — paste a full YouTube watch/share URL.");

    playSound('snd-click');
    const rapidKey = getRapidApiKey();
    const statusEl = document.getElementById('custom-status');

    if (!rapidKey) {
        openYtManualFallback(videoId, "No transcript key configured — paste the transcript below to continue (see tip).");
        return;
    }

    document.getElementById('loading').style.display = 'flex';
    document.getElementById('loading-text').textContent = "INTERCEPTING VIDEO STREAM...";
    document.getElementById('loading-subtext').textContent = `ID: ${videoId}`;

    const providers = [
        {
            host: 'youtube-transcriptor.p.rapidapi.com',
            url: `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${videoId}&lang=en`,
            parse: (data) => Array.isArray(data) ? data.map(i => i.text).join(' ')
                             : (data && data.transcript) ? data.transcript.map(i => i.text).join(' ')
                             : null
        },
        {
            host: 'youtube-transcript3.p.rapidapi.com',
            url: `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`,
            parse: (data) => (data && Array.isArray(data.transcript)) ? data.transcript.map(i => i.text).join(' ') : null
        }
    ];

    for (const provider of providers) {
        try {
            const response = await fetch(provider.url, {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': provider.host,
                    'x-rapidapi-key': rapidKey,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error(`${provider.host} returned ${response.status}`);
            const data = await response.json();
            const combinedText = provider.parse(data);
            if (!combinedText || combinedText.length < 30) throw new Error("Empty transcript returned");

            multimodalData = { type: "text", payload: combinedText };
            topicName = "YT_" + videoId;
            statusEl.textContent = "VIDEO SYNC ACTIVE";
            document.getElementById('loading').style.display = 'none';
            selectTopic(topicName);
            return;
        } catch (e) {
            console.warn("YT provider failed:", provider.host, e.message);
        }
    }

    document.getElementById('loading').style.display = 'none';
    openYtManualFallback(videoId, "Both transcript providers were blocked or rate-limited for this video.");
}

function openYtManualFallback(videoId, reason) {
    const ytFallback = document.getElementById('yt-fallback');
    if (ytFallback) ytFallback.style.display = 'block';
    const statusEl = document.getElementById('custom-status');
    if (statusEl) statusEl.textContent = reason + " Open the video, copy its transcript (YouTube: ⋯ menu → Show transcript), and paste it below.";
    const manualBox = document.getElementById('manual-transcript');
    if (manualBox) manualBox.focus();
}


function processManualTranscript() {
    const text = document.getElementById('manual-transcript').value.trim();
    if (text.length < 50) return alert("DATA STREAM TOO WEAK (Paste more text)");
    multimodalData = { type: "text", payload: text };
    topicName = "MANUAL_VIDEO_DATA";
    document.getElementById('custom-status').textContent = "MANUAL DATA LINKED";
    selectTopic(topicName); playSound('snd-correct');
}

// 2. PDF Parsing via FileReader & PDF.js
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('custom-status').textContent = "DECRYPTING PDF...";
    const reader = new FileReader();
    reader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let text = "";
            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ") + " ";
            }
            
            let binary = '';
            const len = typedarray.byteLength;
            for (let i = 0; i < len; i++) binary += String.fromCharCode(typedarray[i]);
            
            // Using Vision API for PDF as per original logic structure
            multimodalData = { type: "pdf_base64", payload: { b64: btoa(binary), fallbackText: text.trim().substring(0, 10000) } };
            document.getElementById('custom-status').textContent = `ACTIVE: ${file.name.toUpperCase()}`;
        } catch(e) { document.getElementById('custom-status').textContent = "FATAL DECRYPTION ERROR"; }
    };
    reader.readAsArrayBuffer(file);
}

// [NEW FEATURE: 3. Visual Domain (Image Analysis)]
function handleImageAnalysisUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Str = e.target.result.split(',')[1]; 
        // NEW: Added fullSrc to payload for UI rendering
        multimodalData = { type: "image_base64", payload: { b64: base64Str, mime: file.type, fullSrc: e.target.result } };
        document.getElementById('custom-status').textContent = `VISUAL LINK ESTABLISHED: ${file.name.toUpperCase()}`;
        playSound('snd-correct');
    };
    reader.readAsDataURL(file);
}

// [NEW FEATURE: 4. Audio Processing via MediaRecorder API]
let mediaRecorder;
let audioChunks = [];
async function toggleAudioRecord() {
    const btn = document.getElementById('audio-record-btn');
    const downloadBtn = document.getElementById('audio-download-btn');
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        btn.textContent = "🎙️ RECORD LIVE";
        btn.classList.remove('recording-pulse');
        document.getElementById('custom-status').textContent = "AUDIO STREAM COMPILED. READY FOR LINK.";
        playSound('snd-correct');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        // Reset state for new recording
        downloadBtn.style.display = 'none'; 
        recordedAudioBlob = null;
        
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = function() {
                multimodalData = { type: "audio_base64", payload: { b64: reader.result.split(',')[1], mime: 'audio/webm' } };
            };
            reader.readAsDataURL(recordedAudioBlob);
            stream.getTracks().forEach(track => track.stop()); // kill microphone
            
            // Reveal download button once processing is complete
            downloadBtn.style.display = 'block'; 
        };
        
        mediaRecorder.start();
        btn.textContent = "🛑 STOP RECORDING";
        btn.classList.add('recording-pulse');
        document.getElementById('custom-status').textContent = "LIVE AUDIO INTERCEPTION ACTIVE...";
        playSound('snd-click');
    } catch (err) {
        alert("Microphone access denied or unavailable.");
    }
}

// [NEW FEATURE: Audio Upload]
function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('custom-status').textContent = `AUDIO LINK ESTABLISHED: ${file.name.toUpperCase()}`;
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Str = e.target.result.split(',')[1];
        multimodalData = { type: "audio_base64", payload: { b64: base64Str, mime: file.type } };
        playSound('snd-correct');
    };
    reader.readAsDataURL(file);
}

// [NEW FEATURE: Audio Download]
function downloadRecording() {
    if (!recordedAudioBlob) return;
    playSound('snd-click');
    
    const url = URL.createObjectURL(recordedAudioBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `neural_audio_log_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup to prevent memory leaks
    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
}


/**
 * ============================================================================
 * PRE-GAME CONFIGURATION & ROUTING
 * ============================================================================
 */
document.getElementById('init-btn').addEventListener('click', () => {
    playSound('snd-click');
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) { bgMusic.volume = 0.4; bgMusic.play().catch(() => {}); }
    document.getElementById('splash-screen').style.opacity = "0";
    setTimeout(() => {
        document.getElementById('splash-screen').style.display = "none";
        if (window.routeAfterSplash) { window.routeAfterSplash(); }
        else { window.enterMainApp && window.enterMainApp(); }
    }, 800);
});

function setQCount(num, btn) {
    playSound('snd-click'); targetQCount = num;
    document.querySelectorAll('.q-btn').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.1)');
    btn.style.borderColor = 'var(--primary)';
}

window.selectTopic = (topic, isFromLibrary = false) => {
    playSound('snd-click');
    const custom = document.getElementById('custom-topic').value;
    topicName = topic || custom; 
    
    if (topic && !topic.includes("ARCHIVE") && !topic.includes("YT_") && !topic.includes("MANUAL_") && !isFromLibrary) {
        multimodalData = { type: null, payload: null };
        document.getElementById('custom-status').textContent = "No active data stream";
    }
    
    if (!topicName && !multimodalData.payload) return;
    if (!topicName && multimodalData.payload) topicName = `MULTIMODAL: ${multimodalData.type.toUpperCase()}`;
    
    const config = {
        'Video Games': { color: '#ff00ff', video: 'games.mp4' },
        'Science': { color: '#00ff88', video: 'science.mp4' },
        'Mathematics': { color: '#007bff', video: 'maths.mp4' },
        'General Knowledge': { color: '#ffb700', video: 'gk.mp4' }
    };
    
    const sel = config[topicName] || { color: '#00f2ff', video: 'default.mp4' };
    document.documentElement.style.setProperty('--primary', sel.color);
    updateVideo(sel.video);
    
    enterQuizFocus();
    document.getElementById('diff-menu').style.display = 'block';
    document.getElementById('diff-title').textContent = topicName.toUpperCase();
    
    const container = document.getElementById('diff-buttons');
    container.innerHTML = '';
    
    const lvls = multimodalData.payload ? ['Standard', 'Expert'] : ['Beginner', 'Expert'];
    lvls.forEach(lvl => {
        const b = document.createElement('button');
        b.className = 'btn'; b.textContent = lvl; 
        b.onclick = () => startQuiz(lvl);
        container.appendChild(b);
    });
};

function updateVideo(fileName) {
    const video = document.getElementById('bg-video');
    const source = video.querySelector('source');
    if(!video || !source) return; 
    video.style.opacity = "0.2";
    source.onerror = () => { video.style.display = 'none'; };
    video.onerror = () => { video.style.display = 'none'; };
    setTimeout(() => {
        source.src = `assets/${fileName}`; video.load(); 
        video.play().catch(e => console.log("Video play blocked or missing"));
        video.style.opacity = "0.6";
    }, 300);
} 

/**
 * ============================================================================
 * HYBRID INTELLIGENCE ROUTER (GEMINI + GROQ WITH FAILOVER LOGIC)
 * ============================================================================
 */
async function startQuiz(diff) {
    currentDiff = diff; currentQ = 0; score = 0; hintsLeft = 3; userAnswers = []; 
    
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('gameplay-topic-name').textContent = topicName.toUpperCase();

    // Fetch Versioned Prompt based on current Rank
    const currentRank = document.getElementById('stat-rank').textContent;
    const rankPrompt = PROMPT_CONFIG[currentRank] || PROMPT_CONFIG["LEARNER"];

    // Base Prompt Construction
    let promptText = `Topic: ${topicName}. Difficulty: ${diff}. Personality: ${rankPrompt}. `;
    if (multimodalData.type === "text") {
        promptText += `CRITICAL: You MUST extract facts and generate questions EXCLUSIVELY from the provided Context text. Context: ${multimodalData.payload}. `;
    }
    promptText += `Generate ${targetQCount} MCQs. Return JSON strictly: {"questions": [{"question": "...", "correct_answer": "...", "incorrect_answers": ["...", "...", "..."], "explanation": "..."}]}`;
    
    // Determine Router Path
    let useGemini = false;
    if (topicName.startsWith("YT_") || topicName.startsWith("MANUAL_") || multimodalData.type !== null && multimodalData.type !== "text") {
        useGemini = true; // Multimodal needs Gemini Vision/Audio
    }

    try {
        let text = await executeAPIRequest(promptText, useGemini);
        const rawData = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
        quizData = rawData.questions.map(q => {
            // 1. Combine all answers into one array
            let rawOptions = [...q.incorrect_answers, q.correct_answer];
            
            // 2. Use a 'Set' to magically delete any duplicates
            let uniqueOptions = [...new Set(rawOptions)];
            
            // 3. Force the array to be exactly 4 items max, then shuffle
            let finalOptions = uniqueOptions.slice(0, 4).sort(() => Math.random() - 0.5);

            return {
                q: q.question, 
                a: q.correct_answer, 
                exp: q.explanation,
                o: finalOptions,
                crop_box: q.crop_box || [] 
            };
        });

        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('diff-menu').style.display = 'none';
        document.getElementById('quiz-content').style.display = 'block';
        showQ();
        
    } catch(e) { 
        console.error(e);
        alert("SYNC ERROR: " + e.message); 
        document.getElementById('loading').style.display = 'none';
        backToHome(); 
    }
}

// [NEW FEATURE: Resilient API Fallback Wrapper]
async function executeAPIRequest(promptText, forceGemini) {
    const groqKey = getGroqKey();
    const geminiKey = getGeminiKey();

    if (!forceGemini && groqKey) {
        try {
            document.getElementById('loading-text').textContent = "SYNCING NEURAL NETWORK...";
            document.getElementById('loading-subtext').textContent = "Targeting Groq Llama-3...";
            
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: promptText }],
                    response_format: { type: "json_object" }
                })
            });
            if (!response.ok) throw new Error("Groq Limit Reached");
            const result = await response.json();
            return result.choices[0].message.content;
            
        } catch (err) {
            console.warn("Groq failed, failing over to Gemini:", err);
            // Fallthrough to Gemini intentionally
        }
    }

    if (!geminiKey) {
        throw new Error("NO API KEY CONFIGURED. Open ⚙️ SETTINGS and add a free Gemini API key from aistudio.google.com/apikey.");
    }

    // Gemini Execution Block
    document.getElementById('loading-text').textContent = "REROUTING MULTIMODAL NETWORK...";
    document.getElementById('loading-subtext').textContent = "Targeting Gemini 2.5 Flash...";
    
    let geminiPayload = {
        contents: [{ parts: [] }],
        generationConfig: { response_mime_type: "application/json" }
    };
    
    // Inject Multimodal Data
    if (multimodalData.type === "pdf_base64") {
        geminiPayload.contents[0].parts.push({ inlineData: { mimeType: "application/pdf", data: multimodalData.payload.b64 }});
        geminiPayload.contents[0].parts.push({ text: `Analyze the document visually. Generate ${targetQCount} MCQs based EXCLUSIVELY on it. Return JSON strictly: {"questions": [{"question": "...", "correct_answer": "...", "incorrect_answers": ["...", "...", "..."], "explanation": "..."}]}` });
    } else if (multimodalData.type === "image_base64") {
        geminiPayload.contents[0].parts.push({ inlineData: { mimeType: multimodalData.payload.mime, data: multimodalData.payload.b64 }});
        geminiPayload.contents[0].parts.push({ text: `Analyze the attached image. 
        
        INSTRUCTIONS:
        1. Determine the image type. 
        2. IF it is a grid of distinct items (like a logo sheet): You MUST select individual items. Provide the spatial bounding box coordinates for that specific item in the format [ymin, xmin, ymax, xmax] scaled from 0 to 1000. Ask a direct question about it (e.g., "Identify this brand"). DO NOT ask positional questions anymore, as the image will be cropped for the user.
        3. IF it is a document, worksheet, or text-heavy image: Extract the factual knowledge and generate standard trivia. Provide an empty array [] for crop_box.
        
        Generate ${targetQCount} MCQs. Return JSON strictly matching this format: {"questions": [{"question": "...", "correct_answer": "...", "incorrect_answers": ["...", "...", "..."], "explanation": "...", "crop_box": [ymin, xmin, ymax, xmax]}]}` });
    }
 else if (multimodalData.type === "audio_base64") {
        geminiPayload.contents[0].parts.push({ inlineData: { mimeType: multimodalData.payload.mime, data: multimodalData.payload.b64 }});
        geminiPayload.contents[0].parts.push({ text: `Transcribe and analyze this audio. Generate ${targetQCount} MCQs based EXCLUSIVELY on it. Return JSON strictly: {"questions": [{"question": "...", "correct_answer": "...", "incorrect_answers": ["...", "...", "..."], "explanation": "..."}]}` });
    } else {
        geminiPayload.contents[0].parts.push({ text: promptText });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Both APIs Refused Connection");
    }

    const result = await response.json();
    let text = result.candidates[0].content.parts[0].text;
    if (text.startsWith("```json")) text = text.substring(7, text.length - 3).trim();
    else if (text.startsWith("```")) text = text.substring(3, text.length - 3).trim();
    return text;
}

  /**
 * ============================================================================
 * GAMEPLAY LOOP & LOGIC
 * ============================================================================
 */
function showQ() {
    if(currentQ >= quizData.length) return end();
    
    const q = quizData[currentQ]; // Moved up to access coordinates
    
    const imgContainer = document.getElementById('quiz-image-container');
    const imgPreview = document.getElementById('quiz-image-preview');
    
    if (multimodalData && multimodalData.type === "image_base64") {
        imgContainer.style.display = "block";
        
        // AUTO-CROP LOGIC: Check if AI provided coordinates [ymin, xmin, ymax, xmax]
        if (q.crop_box && q.crop_box.length === 4 && q.crop_box[2] > 0) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Convert AI's 0-1000 scale to actual image pixels
                const ymin = (q.crop_box[0] / 1000) * img.height;
                const xmin = (q.crop_box[1] / 1000) * img.width;
                const ymax = (q.crop_box[2] / 1000) * img.height;
                const xmax = (q.crop_box[3] / 1000) * img.width;
                
                const w = xmax - xmin;
                const h = ymax - ymin;
                
                // Add 15px padding so it doesn't crop too tightly
                const pad = 15;
                const sx = Math.max(0, xmin - pad);
                const sy = Math.max(0, ymin - pad);
                const sw = Math.min(img.width - sx, w + pad*2);
                const sh = Math.min(img.height - sy, h + pad*2);
                
                canvas.width = sw;
                canvas.height = sh;
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                
                // Show ONLY the cropped logo
                imgPreview.src = canvas.toDataURL('image/png');
            };
            img.src = multimodalData.payload.fullSrc;
        } else {
            // HIDE IMAGE: If it's a text document, hide the cheat sheet!
            imgContainer.style.display = "none";
            imgPreview.src = "";
        }
    } else {
        imgContainer.style.display = "none";
        imgPreview.src = ""; 
    }

    document.getElementById('question').textContent = q.q;
    
    // Reset visual hints
    document.getElementById('ai-insight').style.opacity = "0";
    document.getElementById('ai-insight').style.background = "rgba(0,242,255,0.1)";
    document.getElementById('ai-insight').style.borderColor = "var(--primary)";
    document.getElementById('hint-display').textContent = "";
    
    const hintBtn = document.getElementById('hint-btn-el');
    hintBtn.textContent = `💡 HINT (${hintsLeft})`;
    hintBtn.disabled = (hintsLeft <= 0);
    
    const box = document.getElementById('options'); 
    box.innerHTML = '';
    
    q.o.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'option'; btn.textContent = opt;
        btn.dataset.value = opt;
        btn.onclick = () => { handleAnswer(opt, btn); };
        box.appendChild(btn);
    });

    const prog = document.getElementById('progress-fill');
    if(prog) prog.style.width = ((currentQ + 1) / quizData.length) * 100 + "%";
    
    startTimer();
} 

function handleAnswer(selected, btn) {
    clearInterval(timerInterval);
    if (window.speechSynthesis && window.speechSynthesis.cancel) window.speechSynthesis.cancel();
    
    const q = quizData[currentQ];
    const all = document.querySelectorAll('.option');
    all.forEach(b => b.disabled = true);
    
    const insight = document.getElementById('ai-insight');
    insight.textContent = "INSIGHT: " + q.exp; 
    insight.style.opacity = "1";
    
    let isCorrect = (selected === q.a);

    userAnswers.push({
        question: q.q, selectedAnswer: selected || "NO DATA (TIME EXPIRED)",
        correctAnswer: q.a, explanation: q.exp, isCorrect: isCorrect
    });
    
    // [NEW FEATURE: Haptic Feedback]
    if(navigator.vibrate) navigator.vibrate(isCorrect ? 50 : [100, 50, 100]);

    if(isCorrect) { 
        score++; 
        btn.classList.add('correct'); 
        insight.style.borderColor = "var(--success)";
        insight.style.background = "rgba(0, 255, 136, 0.1)";
        playSound('snd-correct');
    } else { 
        if(btn) btn.classList.add('wrong'); 
        all.forEach(b => { if(b.dataset.value === q.a) { b.classList.add('correct'); b.textContent = q.a; b.style.opacity = '1'; } });
        insight.style.borderColor = "var(--danger)";
        insight.style.background = "rgba(255, 0, 85, 0.1)";
        playSound('snd-wrong');
    }

    // [NEW FEATURE: Adaptive Theme UI shifts based on performance trajectory]
    let accuracyRatio = score / (currentQ + 1);
    if(accuracyRatio >= 0.8) document.documentElement.style.setProperty('--primary', '#00ff88'); // Green
    else if(accuracyRatio <= 0.4) document.documentElement.style.setProperty('--primary', '#ff0055'); // Red
    else document.documentElement.style.setProperty('--primary', '#00f2ff'); // Blue

    // Modify progress bar dynamically based on answer
    const prog = document.getElementById('progress-fill');
    if(prog) prog.style.background = isCorrect ? "var(--success)" : "var(--danger)";
    
    setTimeout(() => { 
        if(document.getElementById('quiz-content').style.display !== 'none') { 
            if(prog) prog.style.background = "var(--primary)"; // Reset bar color
            currentQ++; showQ(); 
        } 
    }, 2800);
}

window.getHint = () => {
    if(hintsLeft > 0) {
        playSound('snd-click');
        const q = quizData[currentQ];
        const btns = Array.from(document.querySelectorAll('.option'));
        const wrongs = btns.filter(b => b.dataset.value !== q.a && b.style.opacity !== "0.2");
        const pruneCount = Math.min(wrongs.length, Math.ceil(wrongs.length / 2));
        for(let i=0; i < pruneCount && wrongs.length > 0; i++) {
            const target = wrongs.splice(Math.floor(Math.random() * wrongs.length), 1)[0];
            if (!target) continue;
            target.style.opacity = "0.2"; target.style.pointerEvents = "none"; target.textContent = "--- REDACTED ---";
        }
        hintsLeft--;
        document.getElementById('hint-btn-el').textContent = `💡 HINT (${hintsLeft})`;
        document.getElementById('hint-btn-el').disabled = true;
    }
};

function startTimer() {
    clearInterval(timerInterval); timeLeft = 30;
    const bar = document.getElementById('timer-bar');
    bar.style.transition = 'none'; bar.style.width = '100%';
    setTimeout(() => { bar.style.transition = 'width 30s linear'; bar.style.width = '0%'; }, 50);

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-text').textContent = `TIME: ${timeLeft}s`;
        if (timeLeft <= 0) { clearInterval(timerInterval); handleAnswer('', null); }
    }, 1000);
}

/**
 * ============================================================================
 * END GAME & DATA PERSISTENCE
 * ============================================================================
 */
function end() {
    clearInterval(timerInterval);
    document.getElementById('quiz-content').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    
    document.getElementById('score-text').textContent = `${score}/${quizData.length}`;
    generateReviewScreen();

    const record = {
        topic: topicName, score: score, total: quizData.length,
        date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        isoDate: new Date().toISOString(),
        hintsUsed: 3 - hintsLeft,
        difficulty: currentDiff
    };
    
    let history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    history.unshift(record);
    localStorage.setItem('quiz_history', JSON.stringify(history.slice(0, 200)));
    
    updateStats();

    // [NEW FEATURE HOOK] lets features.js evaluate achievements without coupling core logic to it
    if (window.onQuizEnd) {
        try { window.onQuizEnd({ record, score, total: quizData.length, hintsLeft, currentDiff, topicName }); }
        catch(e) { console.warn("onQuizEnd hook failed:", e); }
    }
}

function generateReviewScreen() {
    const list = document.getElementById('review-list');
    list.innerHTML = userAnswers.map((item, index) => {
        const borderStatus = item.isCorrect ? 'border-color: var(--success);' : 'border-color: var(--danger);';
        const answerStatus = item.isCorrect ? 
            `<div class="review-a">Answer: ${item.selectedAnswer}</div>` : 
            `<div class="review-a" style="color: var(--danger);">Your Answer: ${item.selectedAnswer}</div>
             <div class="review-a">Correct Answer: ${item.correctAnswer}</div>`;
             
        return `
        <div class="review-card" style="${borderStatus}">
            <div style="font-size: 0.6rem; opacity: 0.5; margin-bottom: 5px;">QUERY 0${index + 1}</div>
            <div class="review-q">${item.question}</div>
            ${answerStatus}
            <div class="review-exp">Insight: ${item.explanation}</div>
        </div>
        `;
    }).join('');
}

window.showReview = () => {
    playSound('snd-click');
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('review-screen').style.display = 'block';
};

/**
 * ============================================================================
 * HISTORY LOGS & EXPORT
 * ============================================================================
 */
window.showHistory = () => {
    playSound('snd-click');
    navigateTo('history');
    
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    
    if (history.length === 0) return list.innerHTML = `<div style="opacity: 0.5; margin: 40px 0;">NO DATA LOGS FOUND</div>`;
    
    list.innerHTML = history.map(item => `
        <div class="history-item">
            <div style="font-size: 0.6rem; opacity: 0.5; margin-bottom: 4px;">${item.date}</div>
            <div>SECTOR: <span>${item.topic.toUpperCase()}</span></div>
            <div>SCORE: <span>${item.score}/${item.total}</span></div>
        </div>
    `).join('');
};

window.clearHistory = () => {
    if(confirm("PERMANENTLY DELETE ALL NEURAL LOGS?")) {
        localStorage.removeItem('quiz_history'); showHistory(); updateStats();
    }
};

window.restartTopic = () => { 
    document.documentElement.style.setProperty('--primary', '#00f2ff'); // Reset color
    document.getElementById('result-screen').style.display = 'none'; 
    startQuiz(currentDiff); 
};

// [NEW FEATURE: Export Analytics JSON]
window.exportLogs = () => {
    playSound('snd-click');
    const historyData = localStorage.getItem('quiz_history') || '[]';
    const blob = new Blob([historyData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neural_logs_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};