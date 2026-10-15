// عامل الخدمة: يحفظ الصفحة والصور للعمل بدون إنترنت
// عند تغيير الصور أو الأعداد غيّر رقم الإصدار أدناه ليُحدَّث الحفظ عند المستخدمين
const CACHE = 'teachers-media-v3';

const COUNTS = { islamic: 6, arabic: 4, math: 5, science: 5, art: 4, social: 4, sports: 4, music: 4 };
const CORE = [
  './', './index.html', './logo.png', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];
const IMAGES = [];
Object.keys(COUNTS).forEach(k => { for (let i = 1; i <= COUNTS[k]; i++) IMAGES.push('./images/' + k + '/' + i + '.png'); });

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // أي ملف ناقص لا يوقف التثبيت
      Promise.allSettled(CORE.concat(IMAGES).map(u => cache.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الصفحة نفسها: الشبكة أولًا (لتصلك آخر نسخة) ثم المحفوظ عند انقطاع الإنترنت
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ملفات الموقع: من المحفوظ فورًا مع تحديثها في الخلفية
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const fresh = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // الخطوط من خطوط جوجل: تُحفظ بعد أول تحميل
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
