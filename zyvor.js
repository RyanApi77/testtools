// zyvor.js v10.0 — FIXED achievements hook + tempmail
(function(){
'use strict';

var BASE = 'https://api.zyvor.my.id';
var TIKWM = 'https://tikwm.com/api/';
var WORKER = 'https://ryann-cors.hasbiiryan.workers.dev';

var CORS = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://cors.eu.org/',
  'https://thingproxy.freeboard.io/fetch/'
];

function timeoutFor(path){
  if(!path) return 120000;
  var heavy = ['/api/imagehd/', '/api/hdvidio/', '/api/maker/', '/api/downloader/'];
  for(var i=0;i<heavy.length;i++){
    if(path.indexOf(heavy[i]) !== -1) return 600000;
  }
  return 120000;
}

async function fetchWithRetry(url, opts, timeoutMs, retries){
  retries = retries || 2;
  var lastErr = null;
  for(var i=0;i<=retries;i++){
    try{
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs);
      var r = await fetch(url, Object.assign({}, opts, {signal: ctrl.signal}));
      clearTimeout(timer);
      if(r.ok) return r;
      if(r.status >= 500 && i < retries){
        lastErr = new Error('HTTP ' + r.status);
        await new Promise(function(res){ setTimeout(res, 700); });
        continue;
      }
      return r;
    }catch(e){
      lastErr = e;
      if(i < retries) await new Promise(function(res){ setTimeout(res, 600); });
    }
  }
  throw lastErr || new Error('Fetch failed');
}

async function proxyFetch(url, opts, timeoutMs, raw){
  opts = opts || {};
  timeoutMs = timeoutMs || 120000;
  var lastErr = null;

  async function readBody(r){
    if(raw){
      var buf = await r.arrayBuffer();
      return { ok:true, buffer: buf, contentType: r.headers.get('content-type') || '' };
    }
    return { ok:true, text: await r.text() };
  }

  try{
    var r1 = await fetchWithRetry(url, opts, Math.min(timeoutMs, 10000), 1);
    if(r1.ok) return await readBody(r1);
    lastErr = new Error('Direct HTTP ' + r1.status);
  }catch(e){ lastErr = e; }

  try{
    var wurl = WORKER + '/?url=' + encodeURIComponent(url);
    var r2 = await fetchWithRetry(wurl, {method: opts.method || 'GET', headers: opts.headers || {}, body: opts.body}, timeoutMs, 2);
    if(r2.ok) return await readBody(r2);
    lastErr = new Error('Worker HTTP ' + r2.status);
  }catch(e){ lastErr = e; }

  for(var i=0;i<CORS.length;i++){
    var p = CORS[i];
    var full = p + (p.indexOf('?') !== -1 ? encodeURIComponent(url) : url);
    try{
      var r3 = await fetchWithRetry(full, {method: opts.method || 'GET', headers: opts.headers || {}, body: opts.body}, Math.min(timeoutMs, 60000), 1);
      if(r3.ok) return await readBody(r3);
      lastErr = new Error('Proxy ' + i + ' HTTP ' + r3.status);
    }catch(e){ lastErr = e; }
  }

  throw lastErr || new Error('All proxy layers failed');
}

async function callAPIv2(path, params, method){
  method = method || 'GET';
  var qs = '';
  if(method === 'GET') qs = '?' + new URLSearchParams(params).toString();
  var url = BASE + path + qs;
  var opts = { method: method };
  if(method === 'POST'){ opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(params); }

  var res = await proxyFetch(url, opts, timeoutFor(path), true);
  var ct = (res.contentType || '').toLowerCase();
  var buf = res.buffer;

  var bytes = new Uint8Array(buf.slice(0, 12));
  var mime = null;
  if(bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E) mime = 'image/png';
  else if(bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) mime = 'image/jpeg';
  else if(bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) mime = 'image/gif';
  else if(bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57) mime = 'image/webp';
  else if(bytes[0] === 0x42 && bytes[1] === 0x4D) mime = 'image/bmp';

  if(mime){
    var blob = new Blob([buf], { type: mime });
    return { __binary:true, url: URL.createObjectURL(blob), blob: blob, mime: mime, size: buf.byteLength };
  }

  if(ct.indexOf('image/') === 0){
    var ctClean = ct.split(';')[0];
    var blob2 = new Blob([buf], { type: ctClean });
    return { __binary:true, url: URL.createObjectURL(blob2), blob: blob2, mime: ctClean, size: buf.byteLength };
  }

  var txt = '';
  try{ txt = new TextDecoder('utf-8').decode(buf); }catch(e){ txt = ''; }
  var json;
  try{ json = JSON.parse(txt); }catch(e){ json = { raw: txt }; }
  return json;
}

function $id(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function classify(url){ var u = String(url).toLowerCase(); if(/\.(mp4|mov|webm|mkv)(\?|$)/.test(u)) return 'video'; if(/\.(mp3|m4a|flac|wav|aac|opus)(\?|$)/.test(u)) return 'audio'; if(/\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/.test(u)) return 'image'; if(/^blob:/.test(u) || /^data:image/.test(u)) return 'image'; return 'other'; }

function collectMedia(obj, out, baseKey){
  out = out || [];
  if(!obj) return out;
  if(typeof obj === 'string'){
    if(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|mp4|mov|webm|mp3|m4a|wav)(\?|$)/i.test(obj) || /^https?:\/\//.test(obj)){
      out.push({ url: obj, key: baseKey || 'url' });
    }
    return out;
  }
  if(typeof obj === 'object' && obj.result && typeof obj.result === 'string' && /^https?:\/\//.test(obj.result)){
    out.push({ url: obj.result, key: 'result' });
    return out;
  }
  if(typeof obj === 'object' && obj.url && typeof obj.url === 'string' && /^(https?:\/\/|blob:|data:image)/.test(obj.url)){
    out.push({ url: obj.url, key: 'url' });
    return out;
  }
  if(typeof obj === 'object' && obj.image && typeof obj.image === 'string' && /^https?:\/\//.test(obj.image)){
    out.push({ url: obj.image, key: 'image' });
    return out;
  }
  if(Array.isArray(obj)){ obj.forEach(function(v, i){ collectMedia(v, out, (baseKey||'')+'['+i+']'); }); return out; }
  if(typeof obj === 'object'){
    Object.keys(obj).forEach(function(k){
      var v = obj[k];
      if(typeof v === 'string' && /^https?:\/\//.test(v)){
        if(/url|link|download|video|audio|music|hd|sd|wm|play|src|cover|thumb|image|photo|result|output|file|path|data/i.test(k)){
          out.push({ url: v, key: k });
        }
      }
      collectMedia(v, out, (baseKey||'')+'.'+k);
    });
  }
  return out;
}

function extractResultItems(data){
  var items = [];
  if(!data) return items;
  var arr = data.result || data.results || data.data || data.items || data.videos || data.list || data.array || data.entries || (Array.isArray(data) ? data : null);
  if(!arr && data.result && typeof data.result === 'object'){
    arr = data.result.videos || data.result.items || data.result.list || data.result.array || null;
  }
  if(!arr && data.data && typeof data.data === 'object'){
    arr = data.data.videos || data.data.items || data.data.list || null;
  }
  if(!arr || !Array.isArray(arr)) return items;
  arr.forEach(function(item){
    if(typeof item !== 'object' || !item) return;
    var url = item.url || item.link || item.href || item.share_url || item.web_url || item.permalink || item.spotify_url || (item.external_urls && item.external_urls.spotify) || null;
    var title = item.title || item.name || item.judul || item.headline || item.snippet || item.description || '(no title)';
    var desc = item.snippet || item.description || item.desc || item.excerpt || item.subtitle || '';
    var thumb = item.thumbnail || item.thumb || item.image || item.cover || item.cover_url || item.artwork || null;
    var author = item.author || item.channel || item.username || item.uploader || item.artist || null;
    if(url) items.push({url:url, title:title, desc:desc, thumb:thumb, author:author});
  });
  return items;
}

async function uploadToCatbox(file){
  if(!file) return { ok:false, error:'No file' };
  if(file.size / (1024*1024) > 200) return { ok:false, error:'File > 200MB' };
  try{
    var fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', file);
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, 90000);
    var r = await fetch('https://catbox.moe/user/api.php', { method:'POST', body:fd, signal:ctrl.signal });
    clearTimeout(timer);
    if(!r.ok) throw new Error('HTTP '+r.status);
    var txt = (await r.text()).trim();
    if(/^https?:\/\//.test(txt)) return { ok:true, url:txt };
    throw new Error('Bad response');
  }catch(e){ return { ok:false, error: e.message || 'Upload failed' }; }
}

window.zyDownload = async function(url, filename){
  try{
    window.zyToast('⏳ Downloading...');
    var res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    var blob = await res.blob();
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 2000);
    window.zyToast('✓ Downloaded: ' + (filename || 'file'));
  }catch(e){ window.zyToast('✗ Gagal: ' + e.message, 'error'); }
};

window.zyOpenPreview = function(idx){
  var m = window.__apiHubMedia && window.__apiHubMedia[idx];
  if(!m) return;
  var isVideo = classify(m.url) === 'video';
  var overlay = document.getElementById('zy-preview-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'zy-preview-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  var inner = isVideo
    ? '<video controls autoplay style="max-width:100%;max-height:90vh;border-radius:8px" src="'+m.url+'"></video>'
    : '<img src="'+m.url+'" style="max-width:100%;max-height:90vh;border-radius:8px;object-fit:contain">';
  overlay.innerHTML = '<div style="position:relative;max-width:100%;max-height:100%">'+inner+'<button onclick="document.getElementById(\'zy-preview-overlay\').remove()" style="position:absolute;top:-40px;right:0;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;border:none;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button></div>';
};

(function(){
  if(document.getElementById('zy-toast-style')) return;
  var s = document.createElement('style');
  s.id = 'zy-toast-style';
  s.textContent = '@keyframes zyToastIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(s);
})();

window.zyToast = function(msg, type){
  var wrap = document.getElementById('zy-toast-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'zy-toast-wrap';
    wrap.style.cssText = 'position:fixed;right:12px;bottom:180px;z-index:99999;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none;max-width:280px';
    document.body.appendChild(wrap);
  }
  var el = document.createElement('div');
  var isErr = type === 'error';
  el.style.cssText = 'background:linear-gradient(180deg,rgba(10,20,35,.98),rgba(8,12,18,.99));border:1.5px solid ' + (isErr ? '#f87171' : 'var(--ac)') + ';border-radius:10px;padding:10px 14px;box-shadow:0 8px 24px rgba(0,0,0,.5);pointer-events:auto;animation:zyToastIn .35s ease-out;backdrop-filter:blur(10px)';
  el.innerHTML = '<div style="font-family:\'Orbitron\',sans-serif;font-weight:900;font-size:.75rem;color:' + (isErr ? '#f87171' : 'var(--ac)') + ';letter-spacing:1.5px;text-transform:uppercase">' + esc(msg) + '</div>';
  wrap.appendChild(el);
  setTimeout(function(){
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(120%)';
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 350);
  }, 4000);
};

window.zyCp = function(u){ navigator.clipboard.writeText(u).then(function(){ window.zyToast('URL tersalin'); }); };
window.zyCopyJson = function(btn){ var pre = btn.parentElement.querySelector('.zy-raw pre'); if(pre) navigator.clipboard.writeText(pre.textContent).then(function(){ window.zyToast('Tersalin'); }); };

var PARAM_LISTS = {
  'list-reso':      ['480p','720p','1080p','1440p','2160p (4K)'],
  'list-fps':       ['24','30','60','120'],
  'list-quality':   ['low','medium','high','ultra'],
  'list-enhance':   ['off','on','auto'],
  'list-denoise':   ['off','low','medium','high'],
  'list-stabilize': ['off','on'],
  'list-format':    ['mp4','mov','webm','mkv'],
  'list-formatimg': ['png','jpg','jpeg','webp']
};

function paramType(name, category){
  var n = (name || '').toLowerCase();
  var c = (category || '').toUpperCase();
  if(n === 'video' || (n === 'url' && c === 'UPSCALE')) return 'video';
  if(['image','avatar','pp','ppurl','photo','fotourl','pas_photo','profilephoto','mainphoto','background'].indexOf(n) !== -1) return 'image';
  if(n === 'url' && (c === 'IMG HD' || c === 'MAKER' || c === 'IMG AI')) return 'image';
  if(n === 'resolution' || n === 'reso') return 'list-reso';
  if(n === 'fps') return 'list-fps';
  if(n === 'quality') return 'list-quality';
  if(n === 'enhance') return 'list-enhance';
  if(n === 'denoise') return 'list-denoise';
  if(n === 'stabilize') return 'list-stabilize';
  if(n === 'format') return c === 'MAKER' ? 'list-formatimg' : 'list-format';
  if(['duration','saldo','pengikut','like','comment','postingan','koin','terpakai','rollno','width','height','nik','phone','contact'].indexOf(n) !== -1) return 'number';
  return 'text';
}

window.zyRenderDynamicInputs = function(container, params, idPrefix, category){
  if(!container) return;
  container.innerHTML = '';
  window.__apihubCategory = category || '';
  if(!params || !params.length){
    container.innerHTML = '<div class="r" style="font-size:.6rem">Endpoint ini tidak butuh parameter</div>';
    return;
  }
  params.forEach(function(p){
    var type = paramType(p, category);
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '4px';
    var blockId = idPrefix + '-' + p.replace(/[^a-zA-Z0-9]/g,'_');

    if(type === 'image' || type === 'video'){
      var isVideo = type === 'video';
      var html = '<label>' + esc(p.toUpperCase()) + '</label>';
      html += '<div class="upload-dual">';
      html += '<button type="button" class="upload-btn" id="' + blockId + '-btn">📁 ' + (isVideo?'UPLOAD VIDEO':'UPLOAD GAMBAR') + '</button>';
      html += '<input type="file" id="' + blockId + '-file" style="display:none" accept="' + (isVideo?'video/*':'image/*') + '">';
      html += '<input type="text" id="' + blockId + '-url" placeholder="atau paste URL ' + (isVideo?'video':'gambar') + '...">';
      html += '<div id="' + blockId + '-info" class="upload-info" style="display:none;font-size:.55rem;margin-top:4px"></div>';
      html += '</div>';
      wrap.innerHTML = html;
      container.appendChild(wrap);
      (function(bid){
        var btn = document.getElementById(bid+'-btn');
        var file = document.getElementById(bid+'-file');
        var urlIn = document.getElementById(bid+'-url');
        var info = document.getElementById(bid+'-info');
        if(btn && file){
          btn.addEventListener('click', function(){ file.click(); });
          file.addEventListener('change', async function(){
            var f = file.files[0]; if(!f) return;
            info.style.display = 'block';
            info.style.color = 'var(--ac2)';
            info.textContent = '⏳ Upload ' + f.name + ' (' + (f.size/1024/1024).toFixed(1) + ' MB)...';
            var res = await uploadToCatbox(f);
            if(res.ok){
              urlIn.value = res.url;
              info.style.color = 'var(--ok)';
              info.textContent = '✓ Upload OK';
              setTimeout(function(){ info.style.display = 'none'; }, 2500);
            } else {
              info.style.color = 'var(--er)';
              info.textContent = '✗ Gagal: ' + res.error + ' — isi URL manual';
              window.zyToast('UNABLE!', 'error');
            }
          });
        }
      })(blockId);
    } else if(type.indexOf('list-') === 0){
      var list = PARAM_LISTS[type] || [];
      wrap.innerHTML = '<label>' + esc(p.toUpperCase()) + '</label><div class="zy-select-wrap" id="' + blockId + '-wrap"></div>';
      container.appendChild(wrap);
      (function(bid, lst){
        setTimeout(function(){
          if(typeof window.initCustomSelect === 'function'){
            var items = lst.map(function(x){ return { id:x, name:x }; });
            window.initCustomSelect(bid+'-wrap', items, lst[0], function(){});
          }
        }, 20);
      })(blockId, list);
    } else if(type === 'number'){
      wrap.innerHTML = '<label>' + esc(p.toUpperCase()) + '</label><input type="number" id="' + blockId + '" placeholder="angka...">';
      container.appendChild(wrap);
    } else {
      wrap.innerHTML = '<label>' + esc(p.toUpperCase()) + '</label><input type="text" id="' + blockId + '" placeholder="isi ' + esc(p) + '...">';
      container.appendChild(wrap);
    }
  });
};

window.zyCollectParams = function(params, idPrefix, category){
  var out = {};
  if(!params) return out;
  params.forEach(function(p){
    var type = paramType(p, category);
    var blockId = idPrefix + '-' + p.replace(/[^a-zA-Z0-9]/g,'_');
    if(type === 'image' || type === 'video'){
      var urlIn = document.getElementById(blockId+'-url');
      if(urlIn && urlIn.value.trim()) out[p] = urlIn.value.trim();
    } else if(type.indexOf('list-') === 0){
      var wrap = document.getElementById(blockId+'-wrap');
      if(wrap){
        var lbl = wrap.querySelector('.zy-select-btn .zy-btn-label');
        if(lbl) out[p] = lbl.textContent.trim();
      }
    } else {
      var el = document.getElementById(blockId);
      if(el && el.value.trim()) out[p] = el.value.trim();
    }
  });
  return out;
};

var SEARCH_APIS = {
  'WEB': [
    { id:'wikipedia', name:'Wikipedia', path:'/api/search/wikipedia', params:['query'] },
    { id:'nasa', name:'NASA', path:'/api/search/nasa', params:['type','query'], fixed:{type:'images'} },
    { id:'cookpad', name:'Cookpad', path:'/api/search/cookpad', params:['query'] },
    { id:'goal', name:'Goal.com', path:'/api/search/goal', params:['query'] }
  ],
  'VIDEO': [
    { id:'youtube', name:'YouTube', path:'/api/search/youtube-search', params:['query'] },
    { id:'tiktok', name:'TikTok', path:'/api/search/tiktok-search', params:['query','region','type'], fixed:{region:'ID', type:'video'} }
  ],
  'MUSIC': [
    { id:'spotify', name:'Spotify', path:'/api/search/spotify', params:['query'] }
  ]
};

var BYPASS_LIST = [
  { id:'bypasslink', name:'Bypass Link v1', path:'/api/bypass/bypasslink', method:'POST', params:['url','androidId'] },
  { id:'bypasslinkv2', name:'Bypass Link v2', path:'/api/bypass/bypasslinkv2', method:'POST', params:['url'] },
  { id:'bypasslinkv3', name:'Bypass Link v3', path:'/api/bypass/bypasslinkv3', method:'POST', params:['url'] },
  { id:'modjall', name:'ModJall', path:'/api/bypass/modjall', method:'POST', params:['url'] },
  { id:'move2link', name:'Move2Link', path:'/api/bypass/move2link', method:'POST', params:['url'] },
  { id:'ouo-bypass', name:'Ouo Bypass', path:'/api/bypass/ouo-bypass', method:'POST', params:['url'] },
  { id:'safelink', name:'Safelink', path:'/api/bypass/safelink', method:'POST', params:['url'] },
  { id:'shrinkme', name:'ShrinkMe', path:'/api/bypass/shrinkme', method:'POST', params:['url'] },
  { id:'wellbypass', name:'Wellbypass', path:'/api/bypass/wellbypass', method:'POST', params:['url','turnstileToken'] }
];

var DOWNLOADER_LIST = [
  { id:'tikwm', name:'TikWM (recommended)', path:'TIKWM', method:'GET', params:['url'], cat:'TikTok', desc:'auto WM/NoWM/HD' },
  { id:'tiktokv2', name:'TikTok v2 (HD)', path:'/api/downloader/tiktokv2', method:'GET', params:['url'], cat:'TikTok' },
  { id:'tiktokv3', name:'TikTok v3', path:'/api/downloader/tiktokv3', method:'GET', params:['url'], cat:'TikTok' },
  { id:'tiktokv4', name:'TikTok v4', path:'/api/downloader/tiktokv4', method:'GET', params:['url'], cat:'TikTok' },
  { id:'tiktokv5', name:'TikTok v5 (slide)', path:'/api/downloader/tiktokv5', method:'GET', params:['url'], cat:'TikTok' },
  { id:'tiktokio', name:'TikTok.io', path:'/api/downloader/tiktokio', method:'GET', params:['url'], cat:'TikTok' },
  { id:'tiktok', name:'TikTok v1', path:'/api/downloader/tiktok', method:'GET', params:['url'], cat:'TikTok' },
  { id:'youtubev1', name:'YouTube v1', path:'/api/downloader/youtubev1', method:'GET', params:['url','quality'], cat:'YouTube' },
  { id:'youtubev2', name:'YouTube v2', path:'/api/downloader/youtubev2', method:'GET', params:['url'], cat:'YouTube' },
  { id:'youtubev3', name:'YouTube v3', path:'/api/downloader/youtubev3', method:'GET', params:['url','json'], cat:'YouTube' },
  { id:'youtubev4', name:'YouTube v4', path:'/api/downloader/youtubev4', method:'GET', params:['url'], cat:'YouTube' },
  { id:'savetube', name:'SaveTube', path:'/api/downloader/savetube', method:'GET', params:['url','format'], cat:'YouTube' },
  { id:'ytplay', name:'YT Play', path:'/api/downloader/ytplay', method:'GET', params:['query'], cat:'YouTube' },
  { id:'igexport', name:'Instagram Export', path:'/api/downloader/igexport', method:'GET', params:['url'], cat:'Instagram' },
  { id:'facebook', name:'Facebook', path:'/api/downloader/facebook', method:'GET', params:['url'], cat:'Facebook' },
  { id:'capcut', name:'CapCut v1', path:'/api/downloader/capcut', method:'GET', params:['url'], cat:'CapCut' },
  { id:'capcutv2', name:'CapCut v2', path:'/api/downloader/capcutv2', method:'GET', params:['url'], cat:'CapCut' },
  { id:'pinterest', name:'Pinterest', path:'/api/downloader/pinterest', method:'GET', params:['url'], cat:'Pinterest' },
  { id:'spotify', name:'Spotify', path:'/api/downloader/spotify', method:'GET', params:['url'], cat:'Spotify & Audio' },
  { id:'flac', name:'FLAC / MP3', path:'/api/download/flac', method:'POST', params:['track_id','format'], cat:'Spotify & Audio' },
  { id:'mediafire', name:'MediaFire', path:'/api/downloader/mediafire', method:'GET', params:['url'], cat:'File Hosting' },
  { id:'meganz', name:'MEGA.NZ', path:'/api/downloader/meganz', method:'GET', params:['url'], cat:'File Hosting' },
  { id:'gdrive', name:'Google Drive', path:'/api/downloader/gdrive', method:'GET', params:['url'], cat:'File Hosting' },
  { id:'terabox', name:'TeraBox', path:'/api/downloader/terabox', method:'GET', params:['url'], cat:'File Hosting' },
  { id:'allinone', name:'All-in-One v1', path:'/api/downloader/allinone', method:'GET', params:['url'], cat:'All-in-One' },
  { id:'omnify', name:'Omnify', path:'/api/downloader/omnify', method:'GET', params:['url'], cat:'All-in-One' },
  { id:'savefrom', name:'SaveFrom', path:'/api/downloader/savefrom', method:'GET', params:['url','type'], cat:'All-in-One' },
  { id:'snapany', name:'SnapAny', path:'/api/downloader/snapany', method:'GET', params:['url'], cat:'All-in-One' }
];

function detectTikTokType(data){
  if(!data || typeof data !== 'object') return 'unknown';
  if(data.images && Array.isArray(data.images) && data.images.length > 0) return 'slideshow';
  if(data.image_post_info && data.image_post_info.images) return 'slideshow';
  if(data.slideshow && Array.isArray(data.slideshow)) return 'slideshow';
  if(data.play || data.hdplay || data.wmplay || data.video || data.video_hd || data.video_wm) return 'video';
  if(data.data) return detectTikTokType(data.data);
  if(data.raw) return detectTikTokType(data.raw);
  return 'unknown';
}
function urlLooksLikeSlideshow(url){
  if(!url) return false;
  var u = url.toLowerCase();
  return /\/photo\//.test(u) || /slideshow/.test(u);
}
function extractTikTokVariants(data){
  var out = { noWM:null, noWMHD:null, wm:null, music:null, title:null, author:null, cover:null, stats:null, images:null };
  if(!data) return out;
  var d = data.data || data.raw || data;
  out.title = d.title || data.title || null;
  out.author = d.author || data.author || null;
  out.cover = d.cover || d.origin_cover || data.cover || null;
  out.stats = data.stats || (d.play_count !== undefined ? { play:d.play_count, like:d.digg_count, comment:d.comment_count, share:d.share_count } : null);
  var imgArr = null;
  if(d.images && Array.isArray(d.images)) imgArr = d.images;
  else if(d.image_post_info && d.image_post_info.images) imgArr = d.image_post_info.images;
  else if(data.image_post_info && data.image_post_info.images) imgArr = data.image_post_info.images;
  if(imgArr){
    out.images = imgArr.map(function(x){
      if(typeof x === 'string') return x;
      if(x.url_list && x.url_list[0]) return x.url_list[0];
      if(x.image_url && x.image_url.url_list) return x.image_url.url_list[0];
      if(x.display_image && x.display_image.url_list) return x.display_image.url_list[0];
      return null;
    }).filter(Boolean);
    return out;
  }
  out.noWM = d.play || d.video || d.video_sd || d.play_addr || null;
  out.noWMHD = d.hdplay || d.video_hd || d.hd || d.play_addr_hd || null;
  out.wm = d.wmplay || d.video_wm || d.wm || null;
  out.music = d.music || (d.music_info && d.music_info.play) || d.music_url || null;
  if(!out.noWM && d.video_data){
    out.noWM = (d.video_data.play_addr && d.video_data.play_addr.url_list && d.video_data.play_addr.url_list[0]) || null;
    out.noWMHD = (d.video_data.hd && d.video_data.hd.url_list && d.video_data.hd.url_list[0]) || null;
    out.wm = (d.video_data.wm && d.video_data.wm.url_list && d.video_data.wm.url_list[0]) || null;
  }
  return out;
}

async function fetchTikWM(url){
  var apiURL = TIKWM + '?url=' + encodeURIComponent(url) + '&hd=1';
  var res = await proxyFetch(apiURL, {}, 60000);
  var json = JSON.parse(res.text);
  if(json.code !== 0) throw new Error(json.msg || 'tikwm error');
  var d = json.data;
  return { status:true, __type:detectTikTokType(d), title:d.title, author:d.author, cover:d.cover, duration:d.duration, stats:{ play:d.play_count, like:d.digg_count, comment:d.comment_count, share:d.share_count }, video_nowm:d.play, video_nowm_hd:d.hdplay, video_wm:d.wmplay, music:d.music, raw:d };
}

async function fetchWithFallback(list, params, logEl){
  for(var i=0;i<list.length;i++){
    var api = list[i];
    var callParams = {};
    api.params.forEach(function(p){ if(params[p] !== undefined && params[p] !== '') callParams[p] = params[p]; });
    if(logEl){ var l1 = document.createElement('div'); l1.className='ok'; l1.textContent='['+(i+1)+'/'+list.length+'] '+api.name; logEl.appendChild(l1); logEl.scrollTop=logEl.scrollHeight; }
    try{
      var res = api.path === 'TIKWM' ? await fetchTikWM(callParams.url) : await callAPIv2(api.path, callParams, api.method);
      var success = res && ((res.status === true) || (res.status === 'success') || (res.success === true) || (res.result && !res.error) || (res.data) || (res.url) || (res.video) || (res.download_url) || res.__binary);
      if(success){
        if(logEl){ var l2 = document.createElement('div'); l2.className='ok'; l2.textContent='  ✓ '+api.name; logEl.appendChild(l2); logEl.scrollTop=logEl.scrollHeight; }
        return { api:api, result:res };
      }
      if(logEl){ var l3 = document.createElement('div'); l3.className='er'; l3.textContent='  ✗ '+(res.error||res.message||'unknown'); logEl.appendChild(l3); logEl.scrollTop=logEl.scrollHeight; }
    }catch(e){
      if(logEl){ var l4 = document.createElement('div'); l4.className='er'; l4.textContent='  ✗ '+e.message; logEl.appendChild(l4); logEl.scrollTop=logEl.scrollHeight; }
    }
  }
  return null;
}

async function fetchTikTokSmart(url, logEl){
  var isSlideUrl = urlLooksLikeSlideshow(url);
  if(logEl){ var l = document.createElement('div'); l.className='in'; l.textContent='🔍 '+(isSlideUrl?'SLIDESHOW':'VIDEO'); logEl.appendChild(l); logEl.scrollTop=logEl.scrollHeight; }
  var order = isSlideUrl
    ? ['tiktokv5','tiktokv4','tiktokv3','tikwm','tiktokv2','tiktokio','tiktok']
    : ['tikwm','tiktokv2','tiktokv4','tiktokv3','tiktokv5','tiktokio','tiktok'];
  var results = [];
  for(var i=0;i<order.length;i++){
    var apiId = order[i];
    var api = DOWNLOADER_LIST.find(function(x){ return x.id===apiId; });
    if(!api) continue;
    if(logEl){ var l2 = document.createElement('div'); l2.className='ok'; l2.textContent='['+(i+1)+'/'+order.length+'] '+api.name; logEl.appendChild(l2); logEl.scrollTop=logEl.scrollHeight; }
    try{
      var res = api.path === 'TIKWM' ? await fetchTikWM(url) : await callAPIv2(api.path, {url:url}, api.method);
      var success = res && ((res.status === true) || (res.status === 'success') || (res.success === true) || (res.result && !res.error) || (res.data) || (res.url) || (res.video) || (res.download_url));
      if(success){
        var type = detectTikTokType(res);
        if(logEl){ var l3 = document.createElement('div'); l3.className='ok'; l3.textContent='  ✓ '+type.toUpperCase(); logEl.appendChild(l3); logEl.scrollTop=logEl.scrollHeight; }
        results.push({ api:api, result:res, type:type });
        if(type === 'slideshow' || type === 'video') break;
      } else {
        if(logEl){ var l4 = document.createElement('div'); l4.className='er'; l4.textContent='  ✗ '+(res.error||res.message||'unknown'); logEl.appendChild(l4); logEl.scrollTop=logEl.scrollHeight; }
      }
    }catch(e){
      if(logEl){ var l5 = document.createElement('div'); l5.className='er'; l5.textContent='  ✗ '+e.message; logEl.appendChild(l5); logEl.scrollTop=logEl.scrollHeight; }
    }
  }
  if(!results.length) return null;
  var primary = results[0];
  var combined = { api: primary.api, result: primary.result, type: primary.type, allVariants: {} };
  results.forEach(function(r){
    var v = extractTikTokVariants(r.result);
    if(v.noWM && !combined.allVariants.noWM) combined.allVariants.noWM = v.noWM;
    if(v.noWMHD && !combined.allVariants.noWMHD) combined.allVariants.noWMHD = v.noWMHD;
    if(v.wm && !combined.allVariants.wm) combined.allVariants.wm = v.wm;
    if(v.music && !combined.allVariants.music) combined.allVariants.music = v.music;
    if(v.images && !combined.allVariants.images) combined.allVariants.images = v.images;
    if(v.title && !combined.allVariants.title) combined.allVariants.title = v.title;
    if(v.author && !combined.allVariants.author) combined.allVariants.author = v.author;
  });
  return combined;
}

var API_HUB_LIST = [
  {id:'up_ai', name:'Video Upscale AI', path:'/api/hdvidio/ai-upscale-vidio', method:'GET', params:['url','resolution'], cat:'UPSCALE'},
  {id:'up_v1', name:'Video Upscale v1', path:'/api/hdvidio/upscale', method:'GET', params:['url','resolution'], cat:'UPSCALE'},
  {id:'up_tohd', name:'HD Video Processor', path:'/api/hdvidio/tohd', method:'GET', params:['video','fps','resolution','quality','enhance','denoise','stabilize','format'], cat:'UPSCALE'},
  {id:'up_wink', name:'Wink HD Video Enhancer', path:'/api/hdvidio/wink-hd-video', method:'GET', params:['url','fps','resolution','quality','enhance','denoise','stabilize','format'], cat:'UPSCALE'},
  {id:'up_v2', name:'Video HD Enhancer', path:'/api/hdvidio/enhance', method:'GET', params:['url','fps','resolution','quality','enhance','denoise','stabilize','format'], cat:'UPSCALE'},

  {id:'ai_poll', name:'Pollinations AI', path:'/api/imageai/pollinations', method:'GET', params:['prompt'], cat:'IMG AI'},
  {id:'ai_nano', name:'Nano Banana AI', path:'/api/imageai/nanobanana', method:'GET', params:['prompt','ratio','resolution'], cat:'IMG AI'},
  {id:'ai_bing', name:'AI Bing Image', path:'/api/imageai/bingimg', method:'GET', params:['query'], cat:'IMG AI'},
  {id:'ai_seek', name:'AI Seek Image', path:'/api/imageai/aiseek', method:'GET', params:['prompt'], cat:'IMG AI'},
  {id:'ai_gstory', name:'GStory AI Image', path:'/api/imageai/gstory', method:'GET', params:['prompt','style','ratio'], cat:'IMG AI'},
  {id:'ai_t2i', name:'Text to Image (FreeGen)', path:'/api/imageai/text2image', method:'GET', params:['teks','ratio'], cat:'IMG AI'},
  {id:'ai_t2iv2', name:'Text to Image v2 (FLUX)', path:'/api/imageai/text2imgv2', method:'GET', params:['teks'], cat:'IMG AI'},
  {id:'ai_t2iv3', name:'Text to Image v3 (Baidu)', path:'/api/imageai/text2imgv3', method:'GET', params:['teks'], cat:'IMG AI'},

  {id:'hd_en1', name:'AI Enhance HD', path:'/api/imagehd/ai-enhance', method:'GET', params:['url'], cat:'IMG HD'},
  {id:'hd_en2', name:'AI Enhance HD v2', path:'/api/imagehd/ai-enhancev2', method:'GET', params:['url','size'], cat:'IMG HD'},
  {id:'hd_remini', name:'Remini HD', path:'/api/imagehd/remini', method:'GET', params:['url'], cat:'IMG HD'},
  {id:'hd_clearpng', name:'ClearPNG Upscaler', path:'/api/imagehd/clearpng', method:'GET', params:['url','ratio','format'], cat:'IMG HD'},
  {id:'hd_ups1', name:'Image Upscaler', path:'/api/imagehd/imageupscaler', method:'GET', params:['url','scale'], cat:'IMG HD'},
  {id:'hd_nex', name:'NexUpscale', path:'/api/imagehd/nexupscale', method:'GET', params:['url','mode'], cat:'IMG HD'},
  {id:'hd_spark', name:'SparkPix HD Upscale', path:'/api/imagehd/sparkpix', method:'GET', params:['url','quality','face'], cat:'IMG HD'},
  {id:'hd_super', name:'AI Super Resolution', path:'/api/imagehd/super-resolution', method:'GET', params:['url'], cat:'IMG HD'},
  {id:'hd_upai', name:'Upscale AI', path:'/api/imagehd/upscale', method:'GET', params:['url'], cat:'IMG HD'},
  {id:'hd_wink', name:'Wink HD Enhancer', path:'/api/imagehd/wink-hd', method:'GET', params:['url'], cat:'IMG HD'},
  {id:'hd_yupra', name:'Yupra Enhancer', path:'/api/imagehd/yupra', method:'GET', params:['url'], cat:'IMG HD'},

  {id:'mk_bounty', name:'Fake Bounty', path:'/api/maker/bounty', method:'GET', params:['image','text'], cat:'MAKER'},
  {id:'mk_ektp', name:'EKTP Generator', path:'/api/maker/ektp', method:'GET', params:['nama','nik','provinsi','kota','ttl','jenis_kelamin','golongan_darah','alamat','rt/rw','kel/desa','kecamatan','agama','status','pekerjaan','kewarganegaraan','masa_berlaku','terbuat','pas_photo'], cat:'MAKER'},
  {id:'mk_tweet', name:'Fake Tweet', path:'/api/maker/fake-tweet', method:'GET', params:['name','username','text','avatar'], cat:'MAKER'},
  {id:'mk_igp', name:'Fake IG Profile', path:'/api/maker/fakeigprofile', method:'GET', params:['username','postingan','pengikut','mengikuti','bio','ppurl'], cat:'MAKER'},
  {id:'mk_qcwa', name:'WA Quote Chat', path:'/api/maker/qcwa', method:'GET', params:['username','text','avatar','phone','tag','image','mode'], cat:'MAKER'},
  {id:'mk_ff', name:'Fake FF', path:'/api/maker/fake-ff', method:'GET', params:['username','lobby'], cat:'MAKER'},
  {id:'mk_ml', name:'Fake ML', path:'/api/maker/fake-ml', method:'GET', params:['username','rank','border','avatar'], cat:'MAKER'},
  {id:'mk_bca', name:'Fake BCA Canvas', path:'/api/maker/fakebca', method:'GET', params:['nama','norek','saldo'], cat:'MAKER'},
  {id:'mk_dana', name:'Fake Saldo Dana', path:'/api/maker/saldo-dana', method:'GET', params:['saldo'], cat:'MAKER'},
  {id:'mk_gopay', name:'Fake Saldo Gopay', path:'/api/maker/saldo-gopay', method:'GET', params:['saldo','koin','terpakai','bulan'], cat:'MAKER'},

  {id:'sr_wiki', name:'Wikipedia', path:'/api/search/wikipedia', method:'GET', params:['query'], cat:'SEARCH'},
  {id:'sr_anime', name:'Anime Search', path:'/api/search/anime', method:'GET', params:['q'], cat:'SEARCH'},
  {id:'sr_cookpad', name:'Cookpad', path:'/api/search/cookpad', method:'GET', params:['action','query','id'], cat:'SEARCH'},
  {id:'sr_webtoon', name:'Webtoon', path:'/api/search/webtoon', method:'GET', params:['query'], cat:'SEARCH'},
  {id:'sr_youtube', name:'YouTube', path:'/api/search/youtube-search', method:'GET', params:['query'], cat:'SEARCH'},
  {id:'sr_pinterest', name:'Search Pinterest', path:'/api/search/pinterest', method:'GET', params:['query','limit'], cat:'SEARCH'}
];

// ===== TEMPMAIL v10.0 =====
var tmpToken=null, tmpEmail=null, tmpPassword=null, tmpMsgs=[], tmpProvider='mail.tm';

var TMP_PROVIDERS = {
  'mail.tm': { name:'mail.tm', base:'https://api.mail.tm' },
  'mail.gw': { name:'mail.gw', base:'https://api.mail.gw' }
};

function tmpBase(){ return TMP_PROVIDERS[tmpProvider] ? TMP_PROVIDERS[tmpProvider].base : TMP_PROVIDERS['mail.tm'].base; }

// SAVE/LOAD SYSTEM
function tmpGetSaved(){
  try{ return JSON.parse(localStorage.getItem('rx_tmp_accounts') || '[]'); }catch(e){ return []; }
}
function tmpSetSaved(arr){
  try{ localStorage.setItem('rx_tmp_accounts', JSON.stringify(arr)); }catch(e){}
}
function tmpSaveCurrent(){
  if(!tmpEmail || !tmpToken){ alert('Belum ada akun aktif'); return false; }
  var saved = tmpGetSaved();
  var idx = -1;
  for(var i=0;i<saved.length;i++){ if(saved[i].email === tmpEmail){ idx = i; break; } }
  var rec = { email: tmpEmail, password: tmpPassword, token: tmpToken, provider: tmpProvider, savedAt: Date.now() };
  if(idx >= 0) saved[idx] = rec;
  else saved.unshift(rec);
  if(saved.length > 20) saved = saved.slice(0, 20);
  tmpSetSaved(saved);
  tmpRenderSaved();
  if(window.zyToast) window.zyToast('💾 Akun disave');
  return true;
}
function tmpLoadAccount(email){
  var saved = tmpGetSaved();
  var rec = null;
  for(var i=0;i<saved.length;i++){ if(saved[i].email === email){ rec = saved[i]; break; } }
  if(!rec){ alert('Akun gak ketemu'); return; }
  tmpEmail = rec.email;
  tmpPassword = rec.password;
  tmpToken = rec.token;
  tmpProvider = rec.provider || 'mail.tm';
  if($id('tmp-email')) $id('tmp-email').textContent = tmpEmail;
  if(window.zyToast) window.zyToast('📂 Loaded: ' + tmpEmail);
  logTo('tmp-log', '✓ Akun di-restore: ' + tmpEmail, 'ok');
  tmpRenderSaved();
  setTimeout(function(){ if($id('tmp-refresh')) $id('tmp-refresh').click(); }, 300);
}
function tmpDeleteSaved(email){
  if(!confirm('Hapus akun ' + email + '?')) return;
  var saved = tmpGetSaved();
  var out = [];
  for(var i=0;i<saved.length;i++){ if(saved[i].email !== email) out.push(saved[i]); }
  tmpSetSaved(out);
  tmpRenderSaved();
  if(window.zyToast) window.zyToast('🗑 Dihapus');
}
function tmpRenderSaved(){
  var wrap = $id('tmp-saved-list');
  if(!wrap) return;
  var saved = tmpGetSaved();
  if(!saved.length){ wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = 'block';
  var html = '<div style="font-size:.5rem;color:var(--ac);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-bottom:6px">AKUN TERSIMPAN (' + saved.length + ')</div>';
  saved.forEach(function(r){
    var dt = new Date(r.savedAt).toLocaleString('id-ID');
    var isActive = (r.email === tmpEmail);
    var emailEsc = esc(r.email).replace(/'/g, "\\'");
    html += '<div class="msg-item" style="cursor:default;' + (isActive ? 'border-color:var(--ac);background:var(--acd)' : '') + '">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">';
    html += '<b style="word-break:break-all;font-size:.55rem">' + esc(r.email) + '</b>';
    html += '<span style="font-size:.45rem;color:var(--txd);flex-shrink:0">' + esc(r.provider || 'mail.tm') + '</span>';
    html += '</div>';
    html += '<div style="font-size:.5rem;color:var(--txd);margin-bottom:6px">' + dt + (isActive ? ' · AKTIF' : '') + '</div>';
    html += '<div style="display:flex;gap:5px">';
    html += '<button class="g" style="margin:0;padding:5px 10px;font-size:.5rem;width:auto;flex:1" onclick="window.__tmpLoadSaved(\'' + emailEsc + '\')">📂 LOAD</button>';
    html += '<button class="g" style="margin:0;padding:5px 10px;font-size:.5rem;width:auto;flex:1" onclick="window.__tmpCopySaved(\'' + emailEsc + '\')">📋 COPY</button>';
    html += '<button class="d" style="margin:0;padding:5px 10px;font-size:.5rem;width:auto;flex:1" onclick="window.__tmpDelSaved(\'' + emailEsc + '\')">🗑</button>';
    html += '</div></div>';
  });
  wrap.innerHTML = html;
}
window.__tmpLoadSaved = tmpLoadAccount;
window.__tmpDelSaved = tmpDeleteSaved;
window.__tmpDeleteSaved = tmpDeleteSaved;
window.__tmpCopySaved = function(email){
  var saved = tmpGetSaved();
  var rec = null;
  for(var i=0;i<saved.length;i++){ if(saved[i].email === email){ rec = saved[i]; break; } }
  if(!rec) return;
  navigator.clipboard.writeText(rec.email).then(function(){
    if(window.zyToast) window.zyToast('Email tersalin');
    if(window.unlockAch) window.unlockAch('copy_email');
  });
};

async function tmpFetchV2(url, opts){
  opts = opts || {};
  var method = opts.method || 'GET';
  var headers = opts.headers || {};
  var body = opts.body || null;
  var externalSignal = opts.signal;

  async function tryReturn(r){
    if(!r) return null;
    try{
      var txt = await r.clone().text();
      var trimmed = txt.trim();
      if(trimmed.indexOf('<') === 0) return null;
      var j = JSON.parse(txt);
      if(j && typeof j === 'object') return r;
      return null;
    }catch(e){ return null; }
  }

  async function tryFetch(fetchUrl, timeoutMs){
    if(externalSignal && externalSignal.aborted) throw new Error('aborted_by_user');
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs);
    var onExtAbort = function(){ try{ ctrl.abort(); }catch(e){} };
    if(externalSignal) externalSignal.addEventListener('abort', onExtAbort);
    try{
      var r = await fetch(fetchUrl, {method: method, headers: headers, body: body, signal: ctrl.signal});
      clearTimeout(timer);
      if(externalSignal) externalSignal.removeEventListener('abort', onExtAbort);
      return r;
    }catch(e){
      clearTimeout(timer);
      if(externalSignal) externalSignal.removeEventListener('abort', onExtAbort);
      if(externalSignal && externalSignal.aborted) throw new Error('aborted_by_user');
      throw e;
    }
  }

  try{
    var rd = await tryFetch(url, 8000);
    var vd = await tryReturn(rd);
    if(vd) return vd;
  }catch(e){ if(e.message === 'aborted_by_user') throw e; }

  try{
    var wurl = WORKER + '/?url=' + encodeURIComponent(url);
    var r1 = await tryFetch(wurl, 8000);
    var v1 = await tryReturn(r1);
    if(v1) return v1;
  }catch(e){ if(e.message === 'aborted_by_user') throw e; }

  try{
    var p1 = CORS[0];
    var full1 = p1 + (p1.indexOf('?') !== -1 ? encodeURIComponent(url) : url);
    var r3 = await tryFetch(full1, 8000);
    var v3 = await tryReturn(r3);
    if(v3) return v3;
  }catch(e){ if(e.message === 'aborted_by_user') throw e; }

  throw new Error('Semua layer gagal');
}

var _tmpRetryCount = 0;
var _tmpCache = { domains: [], time: 0 };
var TMP_CACHE_MS = 5 * 60 * 1000;

async function tmpLoad(){
  var log = document.getElementById('tmp-log');
  if(log && _tmpRetryCount === 0) log.innerHTML = '';

  if(_tmpCache.domains.length && (Date.now() - _tmpCache.time) < TMP_CACHE_MS){
    logTo('tmp-log','⚡ Cache (' + _tmpCache.domains.length + ' domain)','ok');
    _applyDomainItems(_tmpCache.domains);
    return;
  }

  logTo('tmp-log','⏳ Fetch paralel...','in');
  var providers = Object.keys(TMP_PROVIDERS);
  var promises = providers.map(function(provName){
    var provBase = TMP_PROVIDERS[provName].base;
    return Promise.race([
      tmpFetchV2(provBase + '/domains')
        .then(function(r){ return r.json(); })
        .then(function(j){
          var arr = j['hydra:member'] || [];
          logTo('tmp-log','  ✓ ' + provName + ' — ' + arr.length,'ok');
          return arr.map(function(d){ return { domain: d.domain, provider: provName }; });
        })
        .catch(function(e){
          logTo('tmp-log','  ✗ ' + provName + ' — ' + e.message,'er');
          return [];
        }),
      new Promise(function(res){ setTimeout(function(){ logTo('tmp-log','  ⏱ ' + provName + ' timeout','warn'); res([]); }, 8000); })
    ]);
  });

  var results = await Promise.all(promises);
  var allDomains = [];
  results.forEach(function(arr){ arr.forEach(function(d){ allDomains.push(d); }); });

  if(allDomains.length){
    _tmpCache.domains = allDomains;
    _tmpCache.time = Date.now();
    logTo('tmp-log','✓ Total ' + allDomains.length + ' domain','ok');
    _applyDomainItems(allDomains);
    _tmpRetryCount = 0;
  } else {
    if(_tmpRetryCount < 2){
      _tmpRetryCount++;
      logTo('tmp-log','⚠ Retry ' + _tmpRetryCount + '/3...','warn');
      setTimeout(function(){ tmpLoad(); }, 3000);
    } else {
      logTo('tmp-log','⚠ Gagal semua. Klik RELOAD.','warn');
      _tmpRetryCount = 0;
    }
  }
}

function _applyDomainItems(allDomains){
  if(!window.__selTmpDom) return;
  var items = [{id:'', name:'— CHOOSE (' + allDomains.length + ') —'}];
  allDomains.forEach(function(d){
    items.push({ id: d.provider + '|' + d.domain, name: d.domain, desc: d.provider });
  });
  window.__selTmpDom.setItems(items);
}

window.tmpLoadDomains = function(){ _tmpRetryCount = 0; _tmpCache.time = 0; tmpRenderSaved(); return tmpLoad(); };
if($id('tmp-reaload')) $id('tmp-reaload').onclick=function(){ window.tmpLoadDomains(); };

function tmpInitProviderSelector(){
  if(typeof window.initCustomSelect !== 'function') return;
  if(!document.getElementById('tmp-provider')) return;
  var items = Object.keys(TMP_PROVIDERS).map(function(k){ return { id:k, name: TMP_PROVIDERS[k].name }; });
  window.__selTmpProvider = window.initCustomSelect('tmp-provider', items, tmpProvider, function(id){
    tmpProvider = id;
    if(window.__selTmpDom) window.__selTmpDom.setItems([{id:'', name:'— CHOOSE —'}]);
    tmpLoad();
  });
}
window.tmpInitProviderSelector = tmpInitProviderSelector;

window.__tmpAbort = null;
if($id('tmp-stop')) $id('tmp-stop').onclick=function(){
  if(window.__tmpAbort){ try{ window.__tmpAbort.abort(); }catch(e){} window.__tmpAbort = null; }
  var sb = $id('tmp-stop'); if(sb) sb.style.display = 'none';
  var gb = $id('tmp-gen'); if(gb){ gb.disabled = false; gb.textContent = 'GEN'; }
  logTo('tmp-log','⛔ Dihentikan user','warn');
};

var _lastGenTime = 0;
if($id('tmp-gen')) $id('tmp-gen').onclick=async function(){
  if(Date.now() - _lastGenTime < 3000){ alert('Tunggu 3 detik'); return; }
  _lastGenTime = Date.now();

  var log = document.getElementById('tmp-log');
  if(log) log.innerHTML = '';
  var nm = $id('tmp-name').value.trim() || ('user' + Math.floor(Math.random()*99999));
  var domRaw = (window.__selTmpDom ? window.__selTmpDom.getValue() : '');
  if(!domRaw){ alert('Pilih domain dulu'); return; }

  var parts = domRaw.split('|');
  var provKey = parts[0] || tmpProvider;
  var dom = parts[1] || domRaw;
  var base = TMP_PROVIDERS[provKey] ? TMP_PROVIDERS[provKey].base : tmpBase();
  tmpProvider = provKey;

  var em = nm + '@' + dom;
  var pw = 'RyannTmp!' + Math.floor(Math.random()*99999);

  var gb = $id('tmp-gen'); if(gb){ gb.disabled = true; gb.textContent = '⏳...'; }
  var sb = $id('tmp-stop'); if(sb) sb.style.display = 'block';
  window.__tmpAbort = new AbortController();

  logTo('tmp-log','⏳ Membuat ' + em + ' via ' + provKey + '...','in');

  try{
    var r = await tmpFetchV2(base + '/accounts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({address:em, password:pw}),
      signal: window.__tmpAbort.signal
    });
    var j = null; try{ j = await r.json(); }catch(e){}

    if(r.status >= 400){
      var errMsg = (j && (j['hydra:description'] || j.message || j.error || j.detail)) || ('HTTP ' + r.status);

      if(errMsg.toLowerCase().indexOf('already') !== -1 || r.status === 422){
        logTo('tmp-log','⚠ AKUN SUDAH ADA','warn');
        logTo('tmp-log','→ Coba login pakai akun itu...','in');

        var rLogin = await tmpFetchV2(base + '/token', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({address:em, password:pw}),
          signal: window.__tmpAbort.signal
        });
        var jLogin = null; try{ jLogin = await rLogin.json(); }catch(e){}

        if(rLogin.status === 200 && jLogin && jLogin.token){
          tmpToken = jLogin.token; tmpEmail = em; tmpPassword = pw;
          $id('tmp-email').textContent = em;
          logTo('tmp-log','✓ Login ke akun lama OK','ok');
          tmpSaveCurrent();
          if(window.sndSuccess) window.sndSuccess();
          if(window.unlockAch) window.unlockAch('tmp_first');
          return;
        } else {
          var lm = (jLogin && (jLogin['hydra:description'] || jLogin.message)) || 'password beda';
          logTo('tmp-log','✗ Login gagal: ' + lm,'er');
          logTo('tmp-log','💡 Ganti nama lain (mis: ' + nm + Math.floor(Math.random()*9999) + ')','warn');
          return;
        }
      }

      if(r.status === 429){
        logTo('tmp-log','✗ Rate limit — tunggu 10 menit','er');
        return;
      }

      logTo('tmp-log','✗ ' + errMsg,'er');
      return;
    }

    logTo('tmp-log','✓ Account OK: ' + em,'ok');

    var r2 = await tmpFetchV2(base + '/token', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({address:em, password:pw}),
      signal: window.__tmpAbort.signal
    });
    var j2 = null; try{ j2 = await r2.json(); }catch(e){}

    if(r2.status === 200 && j2 && j2.token){
      tmpToken = j2.token; tmpEmail = em; tmpPassword = pw;
      $id('tmp-email').textContent = em;
      logTo('tmp-log','✓ Login OK [' + provKey + ']','ok');
      tmpSaveCurrent();
      if(window.sndSuccess) window.sndSuccess();
      if(window.unlockAch) window.unlockAch('tmp_first');
    } else {
      var tm = (j2 && (j2['hydra:description'] || j2.message)) || ('HTTP ' + r2.status);
      logTo('tmp-log','✗ Login: ' + tm,'er');
    }
  }catch(e){
    if(e.name === 'AbortError' || (e.message && e.message.indexOf('aborted') !== -1)){
      logTo('tmp-log','⛔ Dibatalkan','warn');
    } else {
      logTo('tmp-log','✗ Network error: ' + e.message,'er');
    }
  }finally{
    window.__tmpAbort = null;
    if(gb){ gb.disabled = false; gb.textContent = 'GEN'; }
    if(sb) sb.style.display = 'none';
  }
};

if($id('tmp-save')) $id('tmp-save').onclick=function(){ if(window.sndClick) window.sndClick(); tmpSaveCurrent(); };
if($id('tmp-load')) $id('tmp-load').onclick=function(){
  if(window.sndClick) window.sndClick();
  var saved = tmpGetSaved();
  if(!saved.length){ alert('Belum ada akun tersimpan'); return; }
  tmpRenderSaved();
  var wrap = $id('tmp-saved-list');
  if(wrap) wrap.scrollIntoView({behavior:'smooth', block:'nearest'});
};
setTimeout(function(){ tmpRenderSaved(); }, 500);

if($id('tmp-copy')) $id('tmp-copy').onclick=function(){ if(tmpEmail){ navigator.clipboard.writeText(tmpEmail).then(function(){ if(window.sndSuccess) window.sndSuccess(); if(window.unlockAch) window.unlockAch('copy_email'); }); } };
if($id('tmp-refresh')) $id('tmp-refresh').onclick=async function(){
  if(!tmpToken){ alert('Generate dulu'); return; }
  var base = tmpBase();
  try{
    var r = await tmpFetchV2(base + '/messages', {headers:{'Authorization':'Bearer '+tmpToken}});
    var j = await r.json();
    tmpMsgs = j['hydra:member'] || [];
    var el = $id('tmp-list');
    el.innerHTML = tmpMsgs.map(function(m,i){ return '<div class="msg-item" data-i="'+i+'"><b>'+m.from.address+'</b> · '+m.subject+'</div>'; }).join('');
    el.querySelectorAll('.msg-item').forEach(function(it){
      it.onclick=function(){
        var idx = parseInt(it.dataset.i); var m = tmpMsgs[idx];
        $id('tmp-msg-view').innerHTML='<b>From:</b> '+m.from.address+'<br><b>Subj:</b> '+m.subject+'<br><br>'+(m.intro||'');
        $id('tmp-msg-view').classList.remove('hd');
      };
    });
    if(window.sndSuccess) window.sndSuccess();
    if(window.unlockAch) window.unlockAch('inbox_first');
  }catch(e){ logTo('tmp-log','✗ '+e.message,'er'); }
};
if($id('tmp-inbox-dl')) $id('tmp-inbox-dl').onclick=function(){
  if(!tmpMsgs.length) return;
  var t = tmpMsgs.map(function(m){ return m.from.address+' | '+m.subject; }).join('\n');
  var b = new Blob([t],{type:'text/plain'});
  var u = URL.createObjectURL(b);
  var a = document.createElement('a'); a.href=u; a.download='inbox.txt';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// ===== SEARCH BROWSER =====
window.zyRunSearch = async function(){
  var q = document.getElementById('search-input');
  var cat = window.__searchCategory || 'ALL';
  if(!q || !q.value.trim()){ alert('Ketik dulu'); return; }
  var query = q.value.trim();
  var log = document.getElementById('search-log');
  var res = document.getElementById('search-result');
  if(log){ log.innerHTML=''; log.classList.remove('hd'); }
  if(res){ res.innerHTML='<div class="zy-head">🔍 Mencari "'+esc(query)+'"...</div>'; res.classList.remove('hd'); }

  var apis = [];
  if(cat === 'ALL') apis = [].concat(SEARCH_APIS.WEB, SEARCH_APIS.VIDEO, SEARCH_APIS.MUSIC);
  else apis = SEARCH_APIS[cat] || [];
  if(!apis.length){ res.innerHTML = '<div class="zy-head er">Kategori kosong</div>'; return; }

  if(log){ var l0 = document.createElement('div'); l0.className='in'; l0.textContent='Menembak '+apis.length+' API...'; log.appendChild(l0); }

  var promises = apis.map(async function(api){
    var p = {};
    api.params.forEach(function(k){ p[k] = query; });
    if(api.fixed){ Object.keys(api.fixed).forEach(function(k){ p[k] = api.fixed[k]; }); }
    try{
      var r = await callAPIv2(api.path, p, 'GET');
      var items = extractResultItems(r);
      if(log){ var l = document.createElement('div'); l.className='ok'; l.textContent='✓ '+api.name+' — '+items.length+' hasil'; log.appendChild(l); log.scrollTop=log.scrollHeight; }
      return { api:api, items:items, raw:r };
    }catch(e){
      if(log){ var le = document.createElement('div'); le.className='er'; le.textContent='✗ '+api.name+': '+e.message; log.appendChild(le); log.scrollTop=log.scrollHeight; }
      return { api:api, items:[], error:e.message };
    }
  });

  var settled = await Promise.allSettled(promises);
  var results = settled.map(function(r){ return r.status === 'fulfilled' ? r.value : { api:null, items:[], error:'rejected' }; });

  var html = '';
  var total = 0;
  results.forEach(function(r){
    if(!r || !r.items || !r.items.length) return;
    total += r.items.length;
    html += '<div class="search-section"><div class="search-section-title">'+esc(r.api.name)+' — '+r.items.length+' hasil</div>';
    r.items.slice(0, 15).forEach(function(item){
      var thumbHtml = item.thumb ? '<img src="'+esc(item.thumb)+'" class="search-thumb" loading="lazy" onerror="this.style.display=\'none\'">' : '<div class="search-thumb-placeholder">📄</div>';
      html += '<div class="search-item" onclick="zyOpenLink(\''+esc(item.url).replace(/'/g,"\\'")+'\')">'+thumbHtml+'<div class="search-item-body"><div class="search-item-title">'+esc(item.title)+'</div>';
      if(item.author) html += '<div class="search-item-author">'+esc(item.author)+'</div>';
      if(item.desc) html += '<div class="search-item-desc">'+esc(String(item.desc).substring(0,140))+'</div>';
      html += '</div><div class="search-item-arrow">→</div></div>';
    });
    html += '</div>';
  });
  if(total === 0) html = '<div class="zy-head er">Tidak ada hasil untuk "'+esc(query)+'"</div>';
  res.innerHTML = html;
  res.classList.remove('hd');
  if(window.unlockAch) window.unlockAch('search_first');
};
window.zyOpenLink = function(url){ window.open(url, '_blank', 'noopener,noreferrer'); };

// ===== BYPASS =====
var bypassSelected = 'ALL';
window.zyInitBypass = function(){
  var sel = $id('bp-api-custom');
  if(!sel || typeof window.initCustomSelect !== 'function') return;
  var items = [{id:'ALL', name:'ALL — fallback 9 API', desc:'Coba semua'}].concat(BYPASS_LIST.map(function(b){ return {id:b.id, name:b.name}; }));
  window.__bpSel = window.initCustomSelect('bp-api-custom', items, bypassSelected, function(id){ bypassSelected = id; window.zyRenderBypassParams(); });
  window.zyRenderBypassParams();
};
window.zyRenderBypassParams = function(){
  var wrap = $id('bp-params'); if(!wrap) return;
  if(bypassSelected === 'ALL'){ wrap.innerHTML = '<label>URL Target</label><input id="bp-url" placeholder="https://sfl.gl/xxx">'; }
  else {
    var api = BYPASS_LIST.find(function(x){ return x.id===bypassSelected; }); if(!api) return;
    wrap.innerHTML = api.params.map(function(p){ return '<label>'+p+'</label><input id="bp-'+p+'" placeholder="'+(p==='url'?'https://...':'(opsional)')+'">'; }).join('');
  }
};
window.zyRunBypass = async function(){
  var log = $id('bp-log'), res = $id('bp-result');
  if(log){ log.innerHTML=''; log.classList.remove('hd'); }
  if(res){ res.innerHTML=''; res.classList.add('hd'); }
  var list, params;
  if(bypassSelected === 'ALL'){
    var url = ($id('bp-url')||{}).value;
    if(!url){ alert('Masukkan URL'); return; }
    params = {url:url.trim()}; list = BYPASS_LIST;
  } else {
    var api = BYPASS_LIST.find(function(x){ return x.id===bypassSelected; }); list = [api]; params = {};
    api.params.forEach(function(p){ var el = $id('bp-'+p); if(el) params[p] = el.value.trim(); });
    if(!params.url){ alert('URL kosong'); return; }
  }
  var out = await fetchWithFallback(list, params, log);
  if(out){
    var html = '<div class="zy-head">✓ SUKSES via <b>'+esc(out.api.name)+'</b></div>';
    var rawTxt = out.result && out.result.__binary ? '[BINARY]' : JSON.stringify(out.result,null,2);
    html += '<details class="zy-raw" open><summary>RAW JSON</summary><pre>'+esc(rawTxt)+'</pre></details>';
    html += '<button class="zy-copy" onclick="zyCopyJson(this)">📋 COPY JSON</button>';
    res.innerHTML = html; res.classList.remove('hd');
    if(window.unlockAch) window.unlockAch('bypass_first');
  } else { res.innerHTML = '<div class="zy-head er">✗ SEMUA API GAGAL</div>'; res.classList.remove('hd'); }
};

// ===== DL =====
var dlCat = 'ALL'; var dlApi = 'tikwm';
window.zyInitDownloader = function(){
  var catSel = $id('dl-cat-custom'), apiSel = $id('dl-api-custom');
  if(!catSel || !apiSel || typeof window.initCustomSelect !== 'function') return;
  var cats = Array.from(new Set(DOWNLOADER_LIST.map(function(d){ return d.cat; })));
  var catItems = [{id:'ALL', name:'ALL — semua kategori'}].concat(cats.map(function(c){ return {id:c, name:c}; }));
  window.__dlCatSel = window.initCustomSelect('dl-cat-custom', catItems, dlCat, function(id){
    dlCat = id;
    var list = dlCat==='ALL' ? DOWNLOADER_LIST : DOWNLOADER_LIST.filter(function(d){ return d.cat===dlCat; });
    if(list.length) dlApi = list[0].id;
    window.zyRenderDlApis();
  });
  window.zyRenderDlApis();
};
window.zyRenderDlApis = function(){
  var apiSel = $id('dl-api-custom'); if(!apiSel) return;
  var list = dlCat==='ALL' ? DOWNLOADER_LIST : DOWNLOADER_LIST.filter(function(d){ return d.cat===dlCat; });
  if(!list.length) return;
  if(!list.find(function(x){ return x.id===dlApi; })) dlApi = list[0].id;
  var items = list.map(function(d){ return {id:d.id, name:d.name, desc:d.cat+(d.desc?' · '+d.desc:'')}; });
  window.__dlApiSel = window.initCustomSelect('dl-api-custom', items, dlApi, function(id){ dlApi = id; window.zyRenderDlParams(); });
  window.zyRenderDlParams();
};
window.zyRenderDlParams = function(){
  var wrap = $id('dl-params'); if(!wrap) return;
  var api = DOWNLOADER_LIST.find(function(x){ return x.id===dlApi; });
  if(!api){ wrap.innerHTML=''; return; }
  wrap.innerHTML = api.params.map(function(p){
    var ph = p;
    if(p==='url')ph='https://...'; if(p==='query')ph='kata kunci'; if(p==='track_id')ph='ID track';
    if(p==='format')ph='mp3 / mp4'; if(p==='quality')ph='360 / 720 / 1080'; if(p==='fileType')ph='mp3 / mp4';
    if(p==='type')ph='video / audio'; if(p==='action')ph='home / search'; if(p==='json')ph='1'; if(p==='mode')ph='home / search';
    return '<label>'+p+'</label><input id="dl-'+p+'" placeholder="'+ph+'">';
  }).join('');
};
function isTikTokUrl(url){ if(!url) return false; return /tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com/.test(url.toLowerCase()); }
window.zyRunDownloader = async function(){
  var api = DOWNLOADER_LIST.find(function(x){ return x.id===dlApi; }); if(!api){ alert('Pilih API'); return; }
  var log = $id('dl-log'), res = $id('dl-result');
  if(log){ log.innerHTML=''; log.classList.remove('hd'); }
  if(res){ res.innerHTML=''; res.classList.add('hd'); }
  var urlEl = $id('dl-url'); var url = urlEl ? urlEl.value.trim() : '';
  if(isTikTokUrl(url)){
    if(log){ var li = document.createElement('div'); li.className='in'; li.textContent='🧠 Smart TikTok'; log.appendChild(li); }
    var smart = await fetchTikTokSmart(url, log);
    if(smart){ window.zyRenderDlResult(res, smart, url); if(window.unlockAch) window.unlockAch('dl_first'); }
    else { res.innerHTML='<div class="zy-head er">✗ Semua API TikTok gagal</div>'; res.classList.remove('hd'); }
    return;
  }
  var params = {};
  api.params.forEach(function(p){ var el = $id('dl-'+p); if(el && el.value.trim()) params[p] = el.value.trim(); });
  if(!Object.keys(params).length){ alert('Isi minimal 1 parameter'); return; }
  var out = await fetchWithFallback([api], params, log);
  if(out){ window.zyRenderDlResult(res, {api:out.api, result:out.result, type:'generic'}, url); if(window.unlockAch) window.unlockAch('dl_first'); }
  else { res.innerHTML='<div class="zy-head er">✗ API GAGAL</div>'; res.classList.remove('hd'); }
};
window.zyRunDownloaderAll = async function(){
  var api = DOWNLOADER_LIST.find(function(x){ return x.id===dlApi; }); if(!api){ alert('Pilih API dulu'); return; }
  var log = $id('dl-log'), res = $id('dl-result');
  if(log){ log.innerHTML=''; log.classList.remove('hd'); }
  if(res){ res.innerHTML=''; res.classList.add('hd'); }
  var urlEl = $id('dl-url'); var url = urlEl ? urlEl.value.trim() : '';
  if(isTikTokUrl(url)){
    var smart = await fetchTikTokSmart(url, log);
    if(smart){ window.zyRenderDlResult(res, smart, url); if(window.unlockAch) window.unlockAch('dl_first'); }
    else { res.innerHTML='<div class="zy-head er">✗ Semua API gagal</div>'; res.classList.remove('hd'); }
    return;
  }
  var urlElAll = $id('dl-url') || $id('dl-query') || $id('dl-track_id');
  if(!urlElAll || !urlElAll.value.trim()){ alert('Isi URL / query'); return; }
  var value = urlElAll.value.trim();
  var paramKey = urlElAll.id.replace('dl-','');
  var sameCat = DOWNLOADER_LIST.filter(function(d){ return d.cat===api.cat; });
  var params = {}; params[paramKey] = value;
  var out = await fetchWithFallback(sameCat, params, log);
  if(out){ window.zyRenderDlResult(res, {api:out.api, result:out.result, type:'generic'}, value); if(window.unlockAch) window.unlockAch('dl_first'); }
  else { res.innerHTML='<div class="zy-head er">✗ SEMUA GAGAL</div>'; res.classList.remove('hd'); }
};
window.zyRenderDlResult = function(container, smart, sourceUrl){
  var type = smart.type;
  var variants = smart.allVariants || extractTikTokVariants(smart.result);
  if(type === 'slideshow' && variants.images && variants.images.length){
    var slideHtml = '<div class="zy-head">🖼 SLIDESHOW — '+variants.images.length+' foto</div>';
    if(variants.title) slideHtml += '<div class="zy-meta"><div class="zy-meta-t">'+esc(variants.title)+'</div></div>';
    slideHtml += '<div class="zy-slide-grid">';
    variants.images.forEach(function(img, i){
      slideHtml += '<div class="zy-slide-item-card"><img src="'+esc(img)+'" loading="lazy"><div class="zy-slide-item-num">'+(i+1)+'</div><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(img).replace(/'/g,"\\'")+'\',\'slide_'+(i+1)+'.jpg\')">⬇ DOWNLOAD FOTO '+(i+1)+'</button></div>';
    });
    slideHtml += '</div>';
    container.innerHTML = slideHtml; container.classList.remove('hd'); return;
  }
  var videoHtml = '<div class="zy-head">✓ '+(type==='video'?'VIDEO':'SUKSES')+' via <b>'+esc(smart.api.name)+'</b></div>';
  if(variants.title || variants.author){
    videoHtml += '<div class="zy-meta">';
    if(variants.title) videoHtml += '<div class="zy-meta-t">'+esc(variants.title)+'</div>';
    if(variants.author) videoHtml += '<div class="zy-meta-a">'+esc(variants.author)+'</div>';
    videoHtml += '</div>';
  }
  videoHtml += '<div class="zy-variant-wrap">';
  if(variants.noWM) videoHtml += '<div class="zy-variant"><video controls preload="metadata" class="zy-video" src="'+esc(variants.noWM)+'"></video><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(variants.noWM).replace(/'/g,"\\'")+'\',\'tiktok_nowm.mp4\')">⬇ NO WM</button></div>';
  if(variants.noWMHD) videoHtml += '<div class="zy-variant"><video controls preload="metadata" class="zy-video" src="'+esc(variants.noWMHD)+'"></video><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(variants.noWMHD).replace(/'/g,"\\'")+'\',\'tiktok_nowm_hd.mp4\')">⬇ NO WM HD</button></div>';
  if(variants.wm) videoHtml += '<div class="zy-variant"><video controls preload="metadata" class="zy-video" src="'+esc(variants.wm)+'"></video><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(variants.wm).replace(/'/g,"\\'")+'\',\'tiktok_wm.mp4\')">⬇ WM</button></div>';
  if(variants.music) videoHtml += '<div class="zy-variant"><audio controls preload="metadata" class="zy-audio" src="'+esc(variants.music)+'"></audio><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(variants.music).replace(/'/g,"\\'")+'\',\'tiktok_music.mp3\')">⬇ MUSIC</button></div>';
  videoHtml += '</div>';
  if(!variants.noWM && !variants.noWMHD && !variants.wm && !variants.music){
    var mediaItems = collectMedia(smart.result, []);
    if(mediaItems.length){
      videoHtml += '<div class="zy-media-wrap"><div class="zy-media-title">📥 MEDIA</div>';
      mediaItems.forEach(function(item){
        var cls = item.url.match(/\.(mp4|mov|webm)/i) ? 'video' : item.url.match(/\.(mp3|m4a)/i) ? 'audio' : 'img';
        if(cls === 'video') videoHtml += '<div class="zy-media-item"><video controls class="zy-video" src="'+esc(item.url)+'"></video><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(item.url).replace(/'/g,"\\'")+'\',\'video.mp4\')">⬇ DOWNLOAD</button></div>';
        else if(cls === 'audio') videoHtml += '<div class="zy-media-item"><audio controls class="zy-audio" src="'+esc(item.url)+'"></audio><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(item.url).replace(/'/g,"\\'")+'\',\'audio.mp3\')">⬇ DOWNLOAD</button></div>';
        else videoHtml += '<div class="zy-media-item"><img src="'+esc(item.url)+'" class="zy-image"><button class="zy-dl-btn zy-dl-full" onclick="zyDownload(\''+esc(item.url).replace(/'/g,"\\'")+'\',\'image.jpg\')">⬇ DOWNLOAD</button></div>';
      });
      videoHtml += '</div>';
    } else { videoHtml += '<div class="zy-head er">⚠ Tidak ada media</div>'; }
  }
  container.innerHTML = videoHtml; container.classList.remove('hd');
};
window.zyPreviewResult = function(){
  var res = $id('dl-result');
  if(!res || res.classList.contains('hd')){ alert('Belum ada hasil'); return; }
  res.scrollIntoView({behavior:'smooth', block:'start'});
};
window.zyClearDownloader = function(){
  ['dl-url','dl-query','dl-track_id','dl-format','dl-quality','dl-fileType','dl-type','dl-action','dl-mode','dl-json'].forEach(function(id){ var el = $id(id); if(el) el.value=''; });
  var log = $id('dl-log'), res = $id('dl-result');
  if(log){ log.innerHTML=''; log.classList.add('hd'); }
  if(res){ res.innerHTML=''; res.classList.add('hd'); }
};

// ===== API HUB =====
var apiHubState = {};
window.zyInitApiHub = function(tabId, catName){
  if(typeof window.initCustomSelect !== 'function') return;
  var filtered = API_HUB_LIST.filter(function(x){ return x.cat === catName; });
  if(!filtered.length) return;
  if(!apiHubState[tabId]) apiHubState[tabId] = { endpoint: filtered[0], __init: false };
  if(apiHubState[tabId].__init) return;
  apiHubState[tabId].__init = true;
  var items = filtered.map(function(x){ return { id:x.id, name:x.name, desc:'params: '+x.params.length }; });
  window.initCustomSelect(tabId+'-endpoint', items, apiHubState[tabId].endpoint.id, function(id){
    apiHubState[tabId].endpoint = filtered.find(function(x){ return x.id===id; });
    window.zyRenderDynamicInputs(document.getElementById(tabId+'-params'), apiHubState[tabId].endpoint.params, tabId, catName);
  });
  window.zyRenderDynamicInputs(document.getElementById(tabId+'-params'), apiHubState[tabId].endpoint.params, tabId, catName);
};
window.zyRunApiHub = async function(tabId, catName){
  var st = apiHubState[tabId];
  if(!st || !st.endpoint){ alert('Pilih endpoint'); return; }
  var params = window.zyCollectParams(st.endpoint.params, tabId, catName);
  var log = document.getElementById(tabId+'-log');
  var res = document.getElementById(tabId+'-result');
  if(log){ log.innerHTML=''; log.classList.remove('hd'); }
  if(res){ res.innerHTML=''; res.classList.add('hd'); }

  var loadingMsg = '⏳ Tunggu...';
  if(catName === 'UPSCALE') loadingMsg = '🎬 Memproses video...';
  else if(catName === 'IMG AI'){ var p = params.prompt || params.teks || params.query || params.text || ''; loadingMsg = '🎨 Membuat ' + (p ? String(p).substring(0,50) : 'objek') + '...'; }
  else if(catName === 'IMG HD') loadingMsg = '🖼 Enhancing image...';
  else if(catName === 'MAKER') loadingMsg = '🎨 Membuat ' + st.endpoint.name + '...';
  else if(catName === 'SEARCH') loadingMsg = '🔍 Mencari...';

  if(log){ var l1 = document.createElement('div'); l1.className='in'; l1.textContent=loadingMsg; log.appendChild(l1); }

  try{
    var r = await callAPIv2(st.endpoint.path, params, st.endpoint.method || 'GET');
    if(log){ var l2 = document.createElement('div'); l2.className='ok'; l2.textContent='✓ Selesai'; log.appendChild(l2); }
    window.zyRenderApiResult(res, r, st.endpoint.name, catName);

    // ACHIEVEMENT HOOK
    if(window.unlockAch){
      if(catName === 'UPSCALE') window.unlockAch('upscale_first');
      else if(catName === 'IMG AI') window.unlockAch('imgai_first');
      else if(catName === 'IMG HD') window.unlockAch('imghd_first');
      else if(catName === 'MAKER') window.unlockAch('maker_first');
      else if(catName === 'SEARCH') window.unlockAch('search_first');
    }
    if(window.__addGen) window.__addGen();

    try{
      var txt = (r && r.__binary) ? ('[BINARY ' + r.mime + ' ' + (r.size/1024).toFixed(1) + ' KB]') : JSON.stringify(r);
      var h = JSON.parse(localStorage.getItem('rx_history') || '[]');
      h.unshift({n: st.endpoint.name + ' [' + catName + ']', s: (txt.length/1024).toFixed(1), l: txt.length, t: Date.now(), c: txt.substring(0, 40000)});
      if(h.length > 30) h = h.slice(0,30);
      localStorage.setItem('rx_history', JSON.stringify(h));
    }catch(e){}
  }catch(e){
    if(log){ var l3 = document.createElement('div'); l3.className='er'; l3.textContent='✗ '+e.message; log.appendChild(l3); }
    if(res){ res.innerHTML='<div class="zy-head er">✗ '+esc(e.message)+'</div>'; res.classList.remove('hd'); }
  }
};

function extractMakerImages(data){
  if(data && data.__binary && data.url){ return [data.url]; }
  var out = [];
  var seen = {};
  function push(u){
    if(!u || typeof u !== 'string') return;
    if(!/^https?:\/\//.test(u) && u.indexOf('data:image') !== 0 && u.indexOf('blob:') !== 0) return;
    if(seen[u]) return;
    seen[u] = 1; out.push(u);
  }
  function walk(o, depth){
    if(depth > 6 || !o) return;
    if(typeof o === 'string'){ push(o); return; }
    if(Array.isArray(o)){ o.forEach(function(v){ walk(v, depth+1); }); return; }
    if(typeof o !== 'object') return;
    ['result','url','image','imageUrl','image_url','photo','photoUrl','photo_url',
     'base64','b64','data','output','outputUrl','output_url','file','fileUrl','file_url',
     'link','downloadUrl','download_url','png','jpg','jpeg','webp']
      .forEach(function(k){ if(o[k]) walk(o[k], depth+1); });
    Object.keys(o).forEach(function(k){
      if(typeof o[k] === 'string' && (/image|photo|url|result|output|file|base64|png|jpg|jpeg|webp|link/i.test(k))){
        walk(o[k], depth+1);
      } else if(typeof o[k] === 'object'){
        walk(o[k], depth+1);
      }
    });
  }
  walk(data, 0);
  return out;
}

window.zyRenderApiResult = function(container, data, name, catName){
  if(catName === 'MAKER' || (data && data.__binary)){
    var mkImgs = extractMakerImages(data);
    if(mkImgs.length){
      var html = '<div class="zy-head">✓ '+esc(name)+'</div>';
      html += '<div class="zy-media-wrap"><div class="zy-media-title">🖼 HASIL ('+mkImgs.length+')</div>';
      window.__apiHubMedia = mkImgs.map(function(u){ return { url:u, key:'maker' }; });
      var safeName = String(name).replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-]/g,'');
      mkImgs.forEach(function(u, i){
        html += '<div class="zy-media-item">';
        html += '<img src="'+esc(u)+'" class="zy-image" loading="lazy" onclick="zyOpenPreview('+i+')" style="cursor:pointer">';
        html += '<div class="zy-media-actions">';
        html += '<button class="zy-dl-btn" onclick="zyOpenPreview('+i+')">🖼 PREVIEW</button>';
        html += '<button class="zy-dl-btn" onclick="zyDownload(\''+esc(u).replace(/'/g,"\\'")+'\',\''+safeName+'_'+i+'.png\')">⬇ DOWNLOAD</button>';
        if(u.indexOf('data:') !== 0) html += '<button class="zy-cp-btn" onclick="zyCp(\''+esc(u).replace(/'/g,"\\'")+'\')">📋 COPY URL</button>';
        html += '</div></div>';
      });
      html += '</div>';
      var rawDisplay = (data && data.__binary)
        ? '[BINARY IMAGE — '+(data.mime||'?')+' — '+((data.size||0)/1024).toFixed(1)+' KB]'
        : JSON.stringify(data, null, 2);
      html += '<details class="zy-raw"><summary>RAW</summary><pre>'+esc(rawDisplay)+'</pre></details>';
      html += '<button class="zy-copy" onclick="zyCopyJson(this)">📋 COPY</button>';
      container.innerHTML = html; container.classList.remove('hd');
      return;
    }
  }

  var html = '<div class="zy-head">✓ '+esc(name)+'</div>';
  var mediaItems = collectMedia(data, []);
  var seen = {}; var unique = [];
  mediaItems.forEach(function(m){ if(!seen[m.url]){ seen[m.url]=1; unique.push(m); } });
  var images = unique.filter(function(x){ return classify(x.url)==='image'; });
  var videos = unique.filter(function(x){ return classify(x.url)==='video'; });
  window.__apiHubMedia = unique;

  if(images.length){
    html += '<div class="zy-media-wrap"><div class="zy-media-title">🖼 IMAGE ('+images.length+')</div>';
    images.slice(0,12).forEach(function(img, i){
      var idx = unique.indexOf(img);
      html += '<div class="zy-media-item">';
      html += '<img src="'+esc(img.url)+'" class="zy-image" loading="lazy" onclick="zyOpenPreview('+idx+')" style="cursor:pointer">';
      html += '<div class="zy-media-actions">';
      html += '<button class="zy-dl-btn" onclick="zyOpenPreview('+idx+')">🖼 PREVIEW</button>';
      html += '<button class="zy-dl-btn" onclick="zyDownload(\''+esc(img.url).replace(/'/g,"\\'")+'\',\'result_'+i+'.jpg\')">⬇ DOWNLOAD</button>';
      html += '<button class="zy-cp-btn" onclick="zyCp(\''+esc(img.url).replace(/'/g,"\\'")+'\')">📋 COPY URL</button>';
      html += '</div></div>';
    });
    html += '</div>';
  }
  if(videos.length){
    html += '<div class="zy-media-wrap"><div class="zy-media-title">🎬 VIDEO ('+videos.length+')</div>';
    videos.slice(0,3).forEach(function(v, i){
      var idx = unique.indexOf(v);
      html += '<div class="zy-media-item">';
      html += '<video controls preload="metadata" class="zy-video" src="'+esc(v.url)+'"></video>';
      html += '<div class="zy-media-actions">';
      html += '<button class="zy-dl-btn" onclick="zyOpenPreview('+idx+')">🖼 PREVIEW</button>';
      html += '<button class="zy-dl-btn" onclick="zyDownload(\''+esc(v.url).replace(/'/g,"\\'")+'\',\'video_'+i+'.mp4\')">⬇ DOWNLOAD</button>';
      html += '<button class="zy-cp-btn" onclick="zyCp(\''+esc(v.url).replace(/'/g,"\\'")+'\')">📋 COPY URL</button>';
      html += '</div></div>';
    });
    html += '</div>';
  }
  if(!images.length && !videos.length){
    var rawDisplay2 = (data && data.__binary)
      ? '[BINARY '+(data.mime||'?')+' — '+((data.size||0)/1024).toFixed(1)+' KB]'
      : JSON.stringify(data,null,2);
    html += '<div class="zy-media-wrap"><div class="zy-media-title">📄 RESPONSE</div><pre style="background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:.6rem;color:var(--ac2);overflow-x:auto;white-space:pre-wrap;word-break:break-all">'+esc(rawDisplay2)+'</pre></div>';
  }
  html += '<details class="zy-raw"><summary>RAW JSON</summary><pre>'+esc(JSON.stringify(data,null,2))+'</pre></details>';
  html += '<button class="zy-copy" onclick="zyCopyJson(this)">📋 COPY JSON</button>';
  container.innerHTML = html; container.classList.remove('hd');
};

window.ZYVOR = {
  version: '10.0',
  base: BASE,
  worker: WORKER,
  call: callAPIv2,
  proxy: proxyFetch,
  classify: classify,
  collectMedia: collectMedia,
  download: window.zyDownload,
  toast: window.zyToast,
  copy: window.zyCp,
  api: function(){ return API_HUB_LIST; },
  dlList: function(){ return DOWNLOADER_LIST; },
  bypassList: function(){ return BYPASS_LIST; }
};

})();
