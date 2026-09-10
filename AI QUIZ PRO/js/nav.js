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

const DASHBOARD_PAGES = ['home', 'custom', 'study', 'report', 'achievements', 'history', 'feedback', 'help'];
const PAGE_TITLES = {
    home: 'Home', custom: 'Custom Quiz', study: 'Study Hub', report: 'Report',
    achievements: 'Awards', history: 'History', feedback: 'Feedback', help: 'Help & Support'
};

function navigateTo(pageId, opts) {
    opts = opts || {};
    if (DASHBOARD_PAGES.indexOf(pageId) === -1) return;

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
    if (contentEl) contentEl.scrollTop = 0;

    closeMobileSidebar();
    if (!opts.silent && typeof playSound === 'function') playSound('snd-click');
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
