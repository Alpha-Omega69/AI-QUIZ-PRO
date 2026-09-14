// AI Quiz Pro — Service Worker
// Caches the app shell so the app opens instantly and works offline for the UI
// (quiz generation itself always needs a live network connection to reach the AI).
const CACHE_NAME = 'ai-quiz-pro-v3';
const APP_SHELL = [
    './AI_QUIZ.html',
    './css/style.css',
    './js/nav.js',
    './js/app.js',
    './js/sound.js',
    './js/features.js',
    './js/gamification.js',
    './js/config.js',
    './js/auth.js',
    './js/study.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/senpai-avatar.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // add each file individually so one missing/optional asset doesn't block install
            return Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {})));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Never cache/interfere with API calls — those must always hit the network live.
    const url = new URL(req.url);
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('groq.com') || url.hostname.includes('rapidapi.com')) {
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req).then((res) => {
                if (res && res.status === 200 && res.type === 'basic') {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                }
                return res;
            }).catch(() => cached);
            return cached || network;
        })
    );
});
