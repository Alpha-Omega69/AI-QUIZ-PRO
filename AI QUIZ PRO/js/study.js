/**
 * ============================================================================
 * STUDY HUB — Notes, PDF library + in-app reader, local-folder music player
 * ============================================================================
 * PDFs are stored in IndexedDB (not localStorage — localStorage caps out
 * around 5-10MB total, which even a couple of PDFs would blow through).
 * Music files are read live from a folder you pick each session via the
 * File System Access — browsers don't allow a site to remember folder
 * access across reloads, for your own privacy/security, so you'll re-pick
 * the folder each visit. Nothing in either feature is uploaded anywhere.
 */

window.showStudyHub = function() {
    if (typeof playSound === 'function') playSound('snd-click');
    navigateTo('study');
    document.getElementById('study-notepad').value = localStorage.getItem('neural_notes') || '';
    renderPdfLibrary();
};

window.switchStudyTab = function(tabId, btn) {
    if (typeof playSound === 'function') playSound('snd-click');
    const scope = document.getElementById('page-study');
    scope.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    scope.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('study-tab-' + tabId).classList.add('active');
};

/* ============================================================================
   INDEXEDDB — small helper
   ============================================================================ */
const STUDY_DB_NAME = 'ai_quiz_pro_study';
const STUDY_DB_VERSION = 1;
let studyDbPromise = null;

function openStudyDb() {
    if (studyDbPromise) return studyDbPromise;
    studyDbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(STUDY_DB_NAME, STUDY_DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs', { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return studyDbPromise;
}

async function dbAddPdf(record) {
    const db = await openStudyDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pdfs', 'readwrite');
        tx.objectStore('pdfs').put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
async function dbGetAllPdfs() {
    const db = await openStudyDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pdfs', 'readonly');
        const req = tx.objectStore('pdfs').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}
async function dbGetPdf(id) {
    const db = await openStudyDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pdfs', 'readonly');
        const req = tx.objectStore('pdfs').get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}
async function dbDeletePdf(id) {
    const db = await openStudyDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pdfs', 'readwrite');
        tx.objectStore('pdfs').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/* ============================================================================
   PDF LIBRARY
   ============================================================================ */
window.handlePdfUpload = async function(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    for (const file of files) {
        if (file.type !== 'application/pdf') continue;
        const buffer = await file.arrayBuffer();
        await dbAddPdf({
            id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            addedAt: new Date().toISOString(),
            data: buffer
        });
    }
    renderPdfLibrary();
    if (typeof playSound === 'function') playSound('snd-correct');
};

async function renderPdfLibrary() {
    const list = document.getElementById('pdf-library-list');
    if (!list) return;
    let items;
    try { items = await dbGetAllPdfs(); }
    catch (e) { list.innerHTML = `<div class="report-empty">Couldn't access local PDF storage in this browser.</div>`; return; }

    if (items.length === 0) {
        list.innerHTML = `<div class="report-empty">No PDFs added yet.</div>`;
        return;
    }
    items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    list.innerHTML = items.map(item => `
        <div class="lib-item">
            <span class="lib-name" title="${escStudy(item.name)}">📄 ${escStudy(item.name)}</span>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <button class="ui-btn" style="padding:5px 8px; font-size:0.55rem;" onclick="openPdfViewer('${item.id}')">OPEN</button>
                <button class="ui-btn" style="padding:5px 8px; font-size:0.55rem; border-color:var(--danger); color:var(--danger);" onclick="deletePdf('${item.id}')">DEL</button>
            </div>
        </div>
    `).join('');
}

window.deletePdf = async function(id) {
    await dbDeletePdf(id);
    renderPdfLibrary();
};

function escStudy(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

/* ============================================================================
   PDF READER (pdf.js, canvas paging) — pdfjsLib already loaded in app.js
   ============================================================================ */
let pdfCurrentDoc = null;
let pdfCurrentPage = 1;

window.openPdfViewer = async function(id) {
    const record = await dbGetPdf(id);
    if (!record) return;

    document.getElementById('pdf-library-list').style.display = 'none';
    document.querySelector('#study-tab-pdfs > .btn').style.display = 'none';
    document.getElementById('pdf-viewer').style.display = 'block';
    document.getElementById('pdf-viewer-title').textContent = record.name;

    try {
        const loadingTask = pdfjsLib.getDocument({ data: record.data.slice(0) });
        pdfCurrentDoc = await loadingTask.promise;
        pdfCurrentPage = 1;
        renderPdfPage();
    } catch (e) {
        console.error('PDF render failed:', e);
        alert("Couldn't open this PDF — it may be corrupted or password-protected.");
        closePdfViewer();
    }
};

async function renderPdfPage() {
    if (!pdfCurrentDoc) return;
    const page = await pdfCurrentDoc.getPage(pdfCurrentPage);
    const canvas = document.getElementById('pdf-canvas');
    const wrap = document.getElementById('pdf-canvas-wrap');
    const unscaledViewport = page.getViewport({ scale: 1 });

    // Fit-to-width in CSS pixels, then multiply by devicePixelRatio so the canvas
    // is actually rendered at the phone's native pixel density. Without this, a
    // canvas sized purely in CSS pixels gets blur-upscaled by the browser on any
    // high-DPI screen (basically every modern phone) — text looks visibly soft.
    const dpr = window.devicePixelRatio || 1;
    const cssScale = Math.min((wrap.clientWidth || 300) / unscaledViewport.width, 2.2);
    const viewport = page.getViewport({ scale: cssScale * dpr });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
    canvas.style.height = Math.floor(viewport.height / dpr) + 'px';

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    document.getElementById('pdf-page-indicator').textContent = `PAGE ${pdfCurrentPage} / ${pdfCurrentDoc.numPages}`;
}

window.pdfPrevPage = function() {
    if (!pdfCurrentDoc || pdfCurrentPage <= 1) return;
    pdfCurrentPage--; renderPdfPage();
    if (typeof playSound === 'function') playSound('snd-click');
};
window.pdfNextPage = function() {
    if (!pdfCurrentDoc || pdfCurrentPage >= pdfCurrentDoc.numPages) return;
    pdfCurrentPage++; renderPdfPage();
    if (typeof playSound === 'function') playSound('snd-click');
};
window.closePdfViewer = function() {
    pdfCurrentDoc = null;
    document.getElementById('pdf-viewer').style.display = 'none';
    document.getElementById('pdf-library-list').style.display = 'block';
    const addBtn = document.querySelector('#study-tab-pdfs > .btn');
    if (addBtn) addBtn.style.display = 'block';
};

/* ============================================================================
   LOCAL FOLDER MUSIC PLAYER
   ============================================================================ */
let musicPlaylist = [];
let musicIndex = -1;
let musicShuffle = false;
const musicAudio = () => document.getElementById('study-music-player');

window.handleMusicFolder = function(event) {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('audio/'));
    if (files.length === 0) { alert('No audio files found in that folder.'); return; }

    // revoke any previous object URLs before replacing the playlist
    musicPlaylist.forEach(t => { if (t.url) URL.revokeObjectURL(t.url); });

    musicPlaylist = files.map(f => ({ name: f.name.replace(/\.[^/.]+$/, ''), url: URL.createObjectURL(f) }));
    musicIndex = -1;
    document.getElementById('music-player').style.display = 'block';
    renderMusicPlaylist();
    playMusicAt(0);
};

function renderMusicPlaylist() {
    const box = document.getElementById('music-playlist');
    box.innerHTML = musicPlaylist.map((t, i) => `
        <div class="music-track-row ${i === musicIndex ? 'playing' : ''}" onclick="playMusicAt(${i})">
            <span>${i === musicIndex ? '▶' : (i + 1)}</span>
            <span class="music-track-title">${escStudy(t.name)}</span>
        </div>
    `).join('');
}

window.playMusicAt = function(i) {
    if (i < 0 || i >= musicPlaylist.length) return;
    musicIndex = i;
    const audio = musicAudio();
    audio.src = musicPlaylist[i].url;
    audio.play().catch(() => {});
    document.getElementById('music-track-name').textContent = musicPlaylist[i].name;
    document.getElementById('music-play-btn').textContent = '⏸';
    renderMusicPlaylist();
};

window.musicTogglePlay = function() {
    const audio = musicAudio();
    if (!audio.src) { if (musicPlaylist.length) playMusicAt(0); return; }
    if (audio.paused) { audio.play().catch(() => {}); document.getElementById('music-play-btn').textContent = '⏸'; }
    else { audio.pause(); document.getElementById('music-play-btn').textContent = '▶'; }
};

window.musicNext = function() {
    if (musicPlaylist.length === 0) return;
    let next;
    if (musicShuffle) { next = Math.floor(Math.random() * musicPlaylist.length); }
    else { next = (musicIndex + 1) % musicPlaylist.length; }
    playMusicAt(next);
};
window.musicPrev = function() {
    if (musicPlaylist.length === 0) return;
    const prev = (musicIndex - 1 + musicPlaylist.length) % musicPlaylist.length;
    playMusicAt(prev);
};
window.musicToggleShuffle = function() {
    musicShuffle = !musicShuffle;
    document.getElementById('music-shuffle-btn').classList.toggle('active-toggle', musicShuffle);
};

document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('study-music-player');
    if (!audio) return;
    audio.addEventListener('ended', () => musicNext());
    audio.addEventListener('timeupdate', () => {
        const fill = document.getElementById('music-track-progress-fill');
        if (fill && audio.duration) fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    });
});
