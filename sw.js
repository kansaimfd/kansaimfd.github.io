// configuration
"use strict";

const
    version = '1.0.0',

    //  （Cache Storageに生成されるディレクトリ名の設定）
    CACHE = version + '::kansaimfd',

    //  （オフライン時のroot。どこを表示させるか。）
    offlineURL = './',

    // （必ずキャッシュさせたいファイルを書き込む）
    urlsToCache = [
        './manifest.json',
        './index.html',
    ].concat(offlineURL),
    //  （できればキャッシュしたいファイルを書き込む）
    urlsToCache2 = [
    ];

//************************************************
//InstallEvent
//************************************************
self.addEventListener('install', function (event) {
    // インストール処理
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => {
                cache.addAll(urlsToCache2);
                return cache.addAll(urlsToCache);
            }).then(() => self.skipWaiting())
    );
});

//************************************************
//FetchEvent
//************************************************
self.addEventListener('fetch', function (event) {
    event.respondWith( // ページにレスポンスを返す（キャッシュがあれば）
        //cacheStrageを参照
        caches.open(CACHE).then(cache => {
            let url = event.request.url;
            //キャッシュファイルがあるかの確認
            return caches.match(event.request)
                .then(response => {
                    // キャッシュがあったのでそのレスポンスを返す
                    if (response) {
                        //Cache
                        return response;
                    }
                    //Network
                    return fetch(event.request).then(req => {
                        //***Cacheに追加 [Cache固定の場合はコメント！] ***
                        //if(req.ok) cache.put(event.request,req.clone());
                        return req;
                    });
                })
                //OFFLINE
                .catch(function () {
                    return offlineAsset(url);
                })
        }) //then(cache=>{}
    );
});

//*************************************************************************
//OFFLINE OR Image Replace
//*************************************************************************
// is image URL?
let iExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].map(f => '.' + f);
function isImage(url) {
    return iExt.reduce((ret, ext) => ret || url.endsWith(ext), false);
}
//return Offline asset
function offlineAsset(url) {
    if (isImage(url)) {
        // return image
        return new Response(
            '<svg role="img" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title>offline</title><path d="M0 0h400v300H0z" fill="#eee" /><text x="200" y="150" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="50" fill="#ccc">offline</text></svg>',
            {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'no-store'
                }
            }
        );
    } else {
        // return page
        return caches.match(offlineURL);
    }
}

//************************************************
// ActivatedEvent
//************************************************
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keylist => {
            return Promise.all(
                keylist
                    .filter(key => key !== CACHE)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});