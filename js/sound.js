/**
 * ============================================================================
 * SOUND ENGINE — synthesized via Web Audio API
 * ============================================================================
 * The original playSound() pointed at assets/*.mp3 files that were never
 * actually included in this project, so no sound has ever really played.
 * Rather than ship binary audio (which we can't author here), every sound
 * is synthesized on the fly with oscillators — zero asset weight, works
 * everywhere, and is trivial to retune (just numbers below).
 */
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
}

// A single tone with a short attack/decay envelope so it doesn't click.
function tone(freq, startTime, duration, type = 'sine', gainPeak = 0.14) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startTime); osc.stop(startTime + duration + 0.02);
}

const SOUND_RECIPES = {
    'snd-click':   () => { const t = getAudioCtx()?.currentTime; if (t == null) return; tone(720, t, 0.06, 'triangle', 0.08); },
    'snd-correct': () => { const t = getAudioCtx()?.currentTime; if (t == null) return; tone(660, t, 0.14, 'sine', 0.12); tone(990, t + 0.07, 0.16, 'sine', 0.11); },
    'snd-wrong':   () => { const t = getAudioCtx()?.currentTime; if (t == null) return; tone(220, t, 0.18, 'sawtooth', 0.09); tone(160, t + 0.09, 0.2, 'sawtooth', 0.08); },
    'snd-achievement': () => {
        const t = getAudioCtx()?.currentTime; if (t == null) return;
        [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.22, 'sine', 0.13));
    },
    'snd-levelup': () => {
        const t = getAudioCtx()?.currentTime; if (t == null) return;
        [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.075, 0.3, 'triangle', 0.13));
    },
    'snd-exp': () => { const t = getAudioCtx()?.currentTime; if (t == null) return; tone(880, t, 0.08, 'sine', 0.09); },
    'snd-task': () => { const t = getAudioCtx()?.currentTime; if (t == null) return; tone(587, t, 0.1, 'sine', 0.1); tone(880, t + 0.05, 0.14, 'sine', 0.1); },
};

// Drop-in replacement for the old file-based playSound(id) — same call sites,
// same ids, now backed by synthesis instead of a missing mp3.
function playSound(id) {
    try {
        const recipe = SOUND_RECIPES[id];
        if (recipe) { recipe(); return; }
        // Unknown id (e.g. a real <audio> element still in the DOM for bg-music) — leave it alone.
        const el = document.getElementById(id);
        if (el && el.tagName === 'AUDIO') { el.currentTime = 0; el.play().catch(() => {}); }
    } catch (e) { /* audio is a nice-to-have, never let it break the app */ }
}
window.playSound = playSound;

// Most browsers block AudioContext until a user gesture — prime it on first touch/click.
document.addEventListener('click', () => getAudioCtx(), { once: true });
document.addEventListener('touchstart', () => getAudioCtx(), { once: true });
