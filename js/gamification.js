/**
 * ============================================================================
 * GAMIFICATION — EXP, Levels, Daily Tasks, Streak
 * ============================================================================
 * Self-contained system that awards EXP from three sources (quiz results,
 * daily tasks, achievement unlocks), tracks levels on a rising-threshold
 * curve, and renders a dedicated Daily/Streak page plus a level-up overlay.
 */

/* ============================================================================
   EXP / LEVEL CORE
   ============================================================================ */
function getTotalExp() {
    return parseInt(localStorage.getItem('total_exp') || '0', 10);
}

// Level N -> N+1 costs a bit more each time, so early levels come fast.
function expNeededForLevel(level) {
    return 100 + (level - 1) * 40;
}

function computeLevelInfo(totalExp) {
    let level = 1;
    let remaining = totalExp;
    while (remaining >= expNeededForLevel(level)) {
        remaining -= expNeededForLevel(level);
        level++;
    }
    return { level, expIntoLevel: remaining, expForNextLevel: expNeededForLevel(level) };
}

function awardExp(amount, reasonLabel) {
    if (!amount || amount <= 0) return;
    const before = computeLevelInfo(getTotalExp());
    const after = computeLevelInfo(getTotalExp() + amount);
    localStorage.setItem('total_exp', String(getTotalExp() + amount));

    renderExpChips(true);
    if (reasonLabel) queueExpToast(amount, reasonLabel);
    if (after.level > before.level) {
        setTimeout(() => showLevelUp(before.level, after.level), reasonLabel ? 900 : 0);
    }
}
window.awardExp = awardExp;

// Small "+15 XP — Daily task" style toast, queued so multiple awards don't overlap.
let expToastQueue = [];
let expToastShowing = false;
function queueExpToast(amount, label) {
    expToastQueue.push({ amount, label });
    if (!expToastShowing) showNextExpToast();
}
function showNextExpToast() {
    if (expToastQueue.length === 0) { expToastShowing = false; return; }
    expToastShowing = true;
    const { amount, label } = expToastQueue.shift();
    const toast = document.getElementById('exp-toast');
    if (!toast) { expToastShowing = false; return; }
    document.getElementById('exp-toast-amount').textContent = `+${amount} XP`;
    document.getElementById('exp-toast-label').textContent = label;
    toast.classList.add('show');
    if (typeof playSound === 'function') playSound('snd-exp');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(showNextExpToast, 350);
    }, 2000);
}

// Renders the level ring + XP bar wherever they appear (topbar chip, Daily page).
function renderExpChips(bump) {
    const info = computeLevelInfo(getTotalExp());
    const pct = Math.min(100, Math.round((info.expIntoLevel / info.expForNextLevel) * 100));

    document.querySelectorAll('.level-badge-num').forEach(el => el.textContent = info.level);
    document.querySelectorAll('.exp-bar-fill').forEach(el => el.style.width = pct + '%');
    document.querySelectorAll('.exp-bar-label').forEach(el => el.textContent = `${info.expIntoLevel} / ${info.expForNextLevel} XP`);
    document.querySelectorAll('.level-ring-progress').forEach(el => {
        const circumference = 2 * Math.PI * (el.dataset.radius || 16);
        el.style.strokeDasharray = `${circumference}`;
        el.style.strokeDashoffset = `${circumference * (1 - pct / 100)}`;
    });
    if (bump) {
        document.querySelectorAll('.level-badge-num, .level-ring-wrap').forEach(el => {
            el.classList.remove('xp-bump');
            requestAnimationFrame(() => el.classList.add('xp-bump'));
            setTimeout(() => el.classList.remove('xp-bump'), 450);
        });
    }
}
window.renderExpChips = renderExpChips;

/* ============================================================================
   LEVEL UP OVERLAY
   ============================================================================ */
let levelUpQueue = [];
function showLevelUp(fromLevel, toLevel) {
    levelUpQueue.push(toLevel);
    if (levelUpQueue.length > 1) return; // already showing one, next will chain after close
    renderLevelUpOverlay(toLevel);
}
function renderLevelUpOverlay(level) {
    const overlay = document.getElementById('levelup-overlay');
    if (!overlay) return;
    document.getElementById('levelup-number').textContent = level;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
    if (typeof playSound === 'function') playSound('snd-levelup');
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
}
window.closeLevelUp = function() {
    const overlay = document.getElementById('levelup-overlay');
    overlay.classList.remove('show');
    setTimeout(() => {
        overlay.style.display = 'none';
        levelUpQueue.shift();
        if (levelUpQueue.length > 0) renderLevelUpOverlay(levelUpQueue[0]);
    }, 300);
};

/* ============================================================================
   DAILY TASKS + STREAK
   ============================================================================ */
function todayKey(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function computeStreak() {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    if (history.length === 0) return 0;
    const dayKey = (d) => { const dt = new Date(d); return isNaN(dt.getTime()) ? null : `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`; };
    const activeDays = new Set(history.map(h => dayKey(h.isoDate || h.date)).filter(Boolean));
    if (activeDays.size === 0) return 0;

    let cursor = new Date();
    if (!activeDays.has(todayKey())) {
        cursor.setDate(cursor.getDate() - 1);
        if (!activeDays.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) return 0;
    }
    let streak = 0;
    while (activeDays.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
window.computeStreak = computeStreak;

const DAILY_TASKS = [
    { id: 'daily_quiz', icon: '🎯', title: 'Complete 1 quiz today', exp: 20, check: (ctx) => ctx.quizzesToday >= 1 },
    { id: 'daily_two', icon: '🔁', title: 'Complete 2 quizzes today', exp: 15, check: (ctx) => ctx.quizzesToday >= 2 },
    { id: 'daily_highscore', icon: '💯', title: 'Score 80%+ on any quiz today', exp: 25, check: (ctx) => ctx.bestPctToday >= 80 },
    { id: 'daily_senpai', icon: '🧑‍🏫', title: 'Ask Senpai a question', exp: 10, check: (ctx) => ctx.senpaiUsedToday },
    { id: 'daily_report', icon: '📈', title: 'Check your Report page', exp: 5, check: (ctx) => ctx.reportViewedToday },
];

function getDailyContext() {
    const key = todayKey();
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const todays = history.filter(h => {
        const d = new Date(h.isoDate || h.date);
        return !isNaN(d.getTime()) && `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key;
    });
    const bestPct = todays.length ? Math.max(...todays.map(h => h.total > 0 ? (h.score / h.total) * 100 : 0)) : 0;
    return {
        quizzesToday: todays.length,
        bestPctToday: bestPct,
        senpaiUsedToday: localStorage.getItem('senpai_used_date') === key,
        reportViewedToday: localStorage.getItem('report_viewed_date') === key,
    };
}

function getClaimedTasksToday() {
    return JSON.parse(localStorage.getItem('daily_claimed_' + todayKey()) || '[]');
}

// Call after any action that might complete a task — auto-awards EXP for
// anything newly finished, without needing a manual "claim" button.
function checkDailyTasks() {
    const ctx = getDailyContext();
    const claimed = getClaimedTasksToday();
    let changed = false;
    const newlyCompleted = [];
    DAILY_TASKS.forEach(task => {
        if (claimed.includes(task.id)) return;
        if (task.check(ctx)) {
            claimed.push(task.id);
            changed = true;
            newlyCompleted.push(task.id);
            awardExp(task.exp, `Daily task: ${task.title}`);
            if (typeof playSound === 'function') playSound('snd-task');
        }
    });
    if (changed) localStorage.setItem('daily_claimed_' + todayKey(), JSON.stringify(claimed));
    renderDailyPage(newlyCompleted);
}
window.checkDailyTasks = checkDailyTasks;

window.showDailyPage = function() {
    if (typeof playSound === 'function') playSound('snd-click');
    if (window.navigateTo) navigateTo('daily');
    renderDailyPage();
};

function renderDailyPage(justCompletedIds) {
    justCompletedIds = justCompletedIds || [];
    const streakCountEl = document.getElementById('daily-streak-count');
    if (!streakCountEl) return; // page not in DOM yet on this build
    const streak = computeStreak();
    streakCountEl.textContent = streak;

    // 7-day strip ending today
    const stripEl = document.getElementById('daily-week-strip');
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const activeDays = new Set(history.map(h => { const d = new Date(h.isoDate || h.date); return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }).filter(Boolean));
    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let stripHtml = '';
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const active = activeDays.has(key);
        const isToday = i === 0;
        stripHtml += `<div class="day-pip ${active ? 'active' : ''} ${isToday ? 'today' : ''}">
            <span class="day-pip-letter">${dayLetters[d.getDay()]}</span>
            <span class="day-pip-dot">${active ? '🔥' : ''}</span>
        </div>`;
    }
    if (stripEl) stripEl.innerHTML = stripHtml;

    // level/XP summary at top of page
    const info = computeLevelInfo(getTotalExp());
    const lvlEl = document.getElementById('daily-level-num');
    if (lvlEl) lvlEl.textContent = info.level;
    const barFill = document.getElementById('daily-exp-bar-fill');
    if (barFill) barFill.style.width = Math.min(100, Math.round((info.expIntoLevel / info.expForNextLevel) * 100)) + '%';
    const barLabel = document.getElementById('daily-exp-bar-label');
    if (barLabel) barLabel.textContent = `Level ${info.level} · ${info.expIntoLevel}/${info.expForNextLevel} XP`;

    // task list
    const ctx = getDailyContext();
    const claimed = getClaimedTasksToday();
    const listEl = document.getElementById('daily-task-list');
    if (listEl) {
        listEl.innerHTML = DAILY_TASKS.map(task => {
            const done = claimed.includes(task.id) || task.check(ctx);
            const isNew = done && justCompletedIds.includes(task.id);
            return `
            <div class="task-row ${done ? 'done' : ''} ${isNew ? 'just-completed' : ''}">
                <span class="task-icon">${task.icon}</span>
                <span class="task-title">${task.title}</span>
                <span class="task-exp">${done ? '✔' : '+' + task.exp + ' XP'}</span>
            </div>`;
        }).join('');
    }
}
window.renderDailyPage = renderDailyPage;

/* ============================================================================
   HOOKS — wire EXP into existing gameplay/engagement events
   ============================================================================ */
const _prevOnQuizEnd = window.onQuizEnd;
window.onQuizEnd = function(payload) {
    if (_prevOnQuizEnd) _prevOnQuizEnd(payload);
    const total = payload && payload.total ? payload.total : 0;
    const score = payload && payload.score ? payload.score : 0;
    let exp = score * 5;
    if (total > 0 && score === total) exp += 20; // perfect-score bonus
    awardExp(exp, 'Quiz completed');
    checkDailyTasks();
};

const _prevWrapForAchievementTracking = window.wrapForAchievementTracking;
// Achievements grant a small EXP bonus the moment they're newly unlocked.
// checkAndToastNewAchievements already exists in features.js — wrap it once both files are loaded.
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAndToastNewAchievements === 'function' && !checkAndToastNewAchievements._expWrapped) {
        const original = checkAndToastNewAchievements;
        window.checkAndToastNewAchievements = function() {
            const before = new Set(JSON.parse(localStorage.getItem('unlocked_achievements') || '[]'));
            original();
            const after = JSON.parse(localStorage.getItem('unlocked_achievements') || '[]');
            const newlyUnlocked = after.filter(id => !before.has(id));
            if (newlyUnlocked.length > 0) awardExp(15 * newlyUnlocked.length, 'Achievement unlocked');
        };
        window.checkAndToastNewAchievements._expWrapped = true;
    }
});
