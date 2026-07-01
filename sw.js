const CACHE_NAME = "chouchou-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./ecdict_data.js"
];

// 安裝時快取核心資源
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 啟用時清理舊快取
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截請求：網路優先，失敗則回傳快取內容
self.addEventListener("fetch", (e) => {
  // 排除 API 請求，僅快取本地靜態資源
  if (e.request.url.includes("googleapis.com") || e.request.url.includes("opentdb.com")) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // 如果請求成功，動態將其更新到快取中
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 離線時，回傳本地快取
        return caches.match(e.request);
      })
  );
});
