/**
 * ============================================================================
 * NAV — Dashboard router (sidebar pages + mobile drawer + quiz focus overlay)
 * ============================================================================
 * Single source of truth for "which screen is showing." Every show*()/open*()
 * function elsewhere (app.js, auth.js, features.js, study.js) calls into
 * navigateTo() / enterQuizFocus() / exitQuizFocus() instead of hand-toggling
 * a list of element IDs — that old pattern was scattered across 4 files and
 * easy to get out of sync as pages were added.
 */

const DASHBOARD_PAGES = ['home', 'custom', 'study', 'report', 'achievements', 'history', 'feedback', 'help', 'daily'];
const PAGE_TITLES = {
    home: 'Home', custom: 'Custom Quiz', study: 'Study Hub', report: 'Report',
    achievements: 'Awards', history: 'History', feedback: 'Feedback', help: 'Help & Support',
    daily: 'Daily'
};

// Pages with live-computed widgets that can go stale (finish a quiz on one
// page, widget on another page doesn't know) — refresh them on every visit
// rather than only at login.
const PAGE_REFRESH_HOOKS = {
    home: () => { if (window.renderExpChips) renderExpChips(); },
    daily: () => { if (window.renderDailyPage) renderDailyPage(); },
};

let _musicWasPlayingBeforeStudy = false;

function navigateTo(pageId, opts) {
    opts = opts || {};
    if (DASHBOARD_PAGES.indexOf(pageId) === -1) return;

    const activeEl = document.querySelector('.app-page.active');
    const previousPageId = activeEl ? activeEl.id.replace('page-', '') : null;

    // Study Hub feels more immersive with just its own study-music-player,
    // not the general app's background loop underneath it too — pause the
    // main loop on entry, resume it on exit, but only if it was actually
    // playing before (so a manual mute stays respected either way).
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        if (pageId === 'study' && previousPageId !== 'study') {
            _musicWasPlayingBeforeStudy = !bgMusic.paused;
            if (_musicWasPlayingBeforeStudy) bgMusic.pause();
        } else if (previousPageId === 'study' && pageId !== 'study' && _musicWasPlayingBeforeStudy) {
            bgMusic.play().catch(() => {});
        }
    }

    exitQuizFocus();

    DASHBOARD_PAGES.forEach(p => {
        const el = document.getElementById('page-' + p);
        if (el) el.classList.toggle('active', p === pageId);
    });
    document.querySelectorAll('.nav-item[data-page]').forEach(b => {
        b.classList.toggle('active', b.dataset.page === pageId);
    });
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = PAGE_TITLES[pageId] || '';
    const contentEl = document.getElementById('page-content');
    if (contentEl) { contentEl.scrollTop = 0; contentEl.dataset.activePage = pageId; }

    closeMobileSidebar();
    if (!opts.silent && typeof playSound === 'function') playSound('snd-click');
    if (PAGE_REFRESH_HOOKS[pageId]) PAGE_REFRESH_HOOKS[pageId]();
}
window.navigateTo = navigateTo;

/* ============================================================================
   QUIZ FOCUS OVERLAY — distraction-free full-screen mode during an active quiz
   ============================================================================ */
function enterQuizFocus() {
    const overlay = document.getElementById('quiz-focus-overlay');
    if (overlay) overlay.style.display = 'flex';
}
window.enterQuizFocus = enterQuizFocus;

function exitQuizFocus() {
    const overlay = document.getElementById('quiz-focus-overlay');
    if (overlay) overlay.style.display = 'none';
}
window.exitQuizFocus = exitQuizFocus;

/* ============================================================================
   MOBILE SIDEBAR (off-canvas drawer under ~900px)
   ============================================================================ */
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const willOpen = !sidebar.classList.contains('mobile-open');
    sidebar.classList.toggle('mobile-open', willOpen);
    if (backdrop) backdrop.classList.toggle('show', willOpen);
    if (typeof playSound === 'function') playSound('snd-click');
}
window.toggleMobileSidebar = toggleMobileSidebar;

function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-backdrop')?.classList.remove('show');
}
window.closeMobileSidebar = closeMobileSidebar;
