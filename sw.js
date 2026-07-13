// ================================================================
// Service Worker - تطبيق الأم الصالحة
// يمكّن العمل بدون إنترنت (Offline) وتثبيت التطبيق
// ================================================================

const CACHE_NAME = 'mother-islam-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// تثبيت: تخزين الملفات في الكاش
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching app assets');
            // نخزّن ما أمكن، ونتجاهل الأخطاء للروابط الخارجية
            return Promise.allSettled(
                ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] Skip:', url)))
            );
        }).then(() => self.skipWaiting())
    );
});

// التفعيل: حذف الكاش القديم
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// الطلبات: الكاش أولاً، ثم الشبكة كاحتياطي
self.addEventListener('fetch', event => {
    // تجاهل طلبات غير GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // موجود في الكاش - يعمل أوفلاين
                return cachedResponse;
            }

            // ليس في الكاش - نحاول الشبكة
            return fetch(event.request).then(networkResponse => {
                // نخزّن نسخة في الكاش للاستخدام القادم
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // لا كاش ولا شبكة - صفحة الخطأ
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// استقبال رسائل من التطبيق
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
