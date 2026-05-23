const CACHE_NAME = 'poyshaguni-v5';
const STATIC_ASSETS = [
    '/', '/dashboard.html', '/transactions.html', '/budgets.html',
    '/goals.html', '/recurring.html', '/loans.html', '/profile.html', '/settings.html',
    '/style/main.css', '/style/profile.css',
    '/js/api.js', '/js/theme.js', '/js/auth.js', '/js/dashboard.js',
    '/js/transactions.js', '/js/budgets.js', '/js/goals.js',
    '/js/recurring.js', '/js/loans.js', '/js/settings.js', '/js/profile.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('/api/')) {
        // Network first for API calls
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
        return;
    }
    // Cache first for static assets
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); }
        return res;
    })));
});
