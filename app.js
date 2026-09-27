// app.js v6.6 — Full rebuild
(function(){
'use strict';

// ===== PASSWORD GATE v6.6 =====
(function passwordGateInit(){
  var PASSWORD = 'ryanndev';
  var gate = document.getElementById('passwordGate');
  if(!gate) return;
  var card = document.getElementById('accessCard');
  var input = document.getElementById('passwordInput');
  var boxes = gate.querySelectorAll('.password-box');
  var boxesWrap = document.getElementById('passwordBoxes');
  var statusText = document.getElementById('statusText');
  var continueBtn = document.getElementById('continueBtn');
  var eyeToggle = document.getElementById('eyeToggle');
  var eyeOpen = document.getElementById('eyeOpen');
  var eyeClosed = document.getElementById('eyeClosed');
  var verifyOverlay = document.getElementById('gateVerifying');
  var orbitStatus = document.getElementById('orbitStatus');
  var verified = false;
  var passwordVisible = false;
  if(!input || !boxesWrap || !continueBtn) return;

  if(eyeToggle){
    eyeToggle.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      passwordVisible = !passwordVisible;
      eyeToggle.classList.toggle('visible', passwordVisible);
      if(eyeOpen) eyeOpen.style.display = passwordVisible ? 'none' : '';
      if(eyeClosed) eyeClosed.style.display = passwordVisible ? '' : 'none';
      updateBoxes(input.value);
    });
  }
  function updateBoxes(raw){
    var value = (raw || '').slice(0, 8);
    Array.prototype.forEach.call(boxes, function(box, index){
      box.classList.remove('filled','active');
      if(index < value.length){
        box.textContent = passwordVisible ? value[index] : '•';
        box.classList.add('filled');
      } else { box.textContent = ''; }
    });
    if(value.length < 8 && boxes[value.length]) boxes[value.length].classList.add('active');
  }
  boxesWrap.addEventListener('click', function(e){
    if(eyeToggle && e.target.closest('#eyeToggle')) return;
    input.focus();
  });
  input.addEventListener('input', function(){
    var raw = input.value || '';
    updateBoxes(raw);
    statusText.classList.remove('ok','err','success');
    statusText.textContent = raw.length === 8 ? 'PRESS ENTER TO VERIFY' : 'WAITING FOR PASSWORD';
  });
  input.addEventListener('keydown', function(event){
    if(event.key === 'Enter'){ event.preventDefault(); verifyPassword(); }
  });
  continueBtn.addEventListener('click', function(){
    if(verified){
      if(verifyOverlay) verifyOverlay.classList.remove('on');
      gate.classList.add('gate-hidden');
      setTimeout(function(){ gate.style.display = 'none'; }, 700);
      return;
    }
    verifyPassword();
  });
  function verifyPassword(){
    var raw = input.value || '';
    var cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8);
    var expected = PASSWORD.toLowerCase();
    if(cleaned !== expected){
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      statusText.textContent = 'INVALID PASSWORD'; statusText.classList.add('err');
      Array.prototype.forEach.call(boxes, function(box){ box.classList.remove('filled','active','success'); box.classList.add('error'); });
      setTimeout(function(){ Array.prototype.forEach.call(boxes, function(box){ box.classList.remove('error','filled','active'); box.textContent=''; }); }, 600);
      input.value = '';
      setTimeout(function(){
        Array.prototype.forEach.call(boxes, function(box){ box.textContent=''; box.classList.remove('error','filled','active'); });
        if(boxes[0]) boxes[0].classList.add('active');
        statusText.textContent = 'WAITING FOR PASSWORD'; statusText.classList.remove('err');
      }, 1500);
      return;
    }
    verified = true;
    statusText.textContent = 'VERIFYING ACCESS...'; statusText.classList.remove('err'); statusText.classList.add('ok');
    Array.prototype.forEach.call(boxes, function(box){ box.classList.remove('active','filled'); });
    if(verifyOverlay) verifyOverlay.classList.add('on');
    if(orbitStatus){ orbitStatus.textContent = 'VERIFYING ACCESS...'; orbitStatus.classList.remove('done'); }
    setTimeout(function(){
      if(orbitStatus){ orbitStatus.textContent = 'ACCESS VERIFIED'; orbitStatus.classList.add('done'); }
      Array.prototype.forEach.call(boxes, function(box){ box.textContent = '✓'; box.classList.add('success'); });
      if(card) card.classList.add('success');
      statusText.textContent = 'ACCESS VERIFIED'; statusText.classList.remove('ok'); statusText.classList.add('success');
      continueBtn.textContent = 'CONTINUE'; continueBtn.classList.add('ready');
      setTimeout(function(){ if(verifyOverlay) verifyOverlay.classList.remove('on'); }, 1200);
    }, 1800);
  }
  setTimeout(function(){ try{ input.focus(); }catch(e){} }, 300);
  gate.addEventListener('click', function(e){ if(e.target === gate) input.focus(); });
})();

function $(i){ return document.getElementById(i); }
var $$ = function(q){ return document.querySelectorAll(q); };

var S = {
  set: function(k,v){ try{ localStorage.setItem('rx_'+k, JSON.stringify(v)); }catch(e){} },
  get: function(k,d){ try{ var v=localStorage.getItem('rx_'+k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  del: function(k){ try{ localStorage.removeItem('rx_'+k); }catch(e){} }
};

// ===== CUSTOM SELECT =====
window.initCustomSelect = function(containerId, items, selectedId, onSelect, opts){
  opts = opts || {};
  var container = document.getElementById(containerId);
  if(!container) return null;
  container.innerHTML = '';
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'zy-select-btn';
  function labelFor(id){
    var it = items.find(function(x){ return x.id === id; });
    if(it) return it.name;
    return opts.placeholder || '— CHOOSE —';
  }
  function updateLabel(){ var lbl = btn.querySelector('.zy-btn-label'); if(lbl) lbl.textContent = labelFor(selectedId); }
  btn.innerHTML = '<span class="zy-btn-label">' + labelFor(selectedId) + '</span><span class="zy-select-arrow">▾</span>';
  var list = document.createElement('div'); list.className = 'zy-select-list';
  function renderList(){
    list.innerHTML = '';
    items.forEach(function(it){
      var opt = document.createElement('div');
      opt.className = 'zy-select-opt' + (it.id === selectedId ? ' active' : '');
      opt.setAttribute('data-id', it.id);
      opt.innerHTML = '<span>' + it.name + '</span>' + (it.desc ? '<small>' + it.desc + '</small>' : '');
      opt.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        selectedId = it.id; updateLabel(); closeList();
        if(typeof onSelect === 'function') onSelect(it.id, it);
      });
      list.appendChild(opt);
    });
  }
  function openList(){ renderList(); list.classList.add('open'); btn.classList.add('open'); }
  function closeList(){ list.classList.remove('open'); btn.classList.remove('open'); }
  function toggleList(){ if(list.classList.contains('open')) closeList(); else openList(); }
  btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); toggleList(); });
  container.appendChild(btn); container.appendChild(list);
  return {
    getValue: function(){ return selectedId; },
    setValue: function(id){ selectedId = id; updateLabel(); },
    setItems: function(newItems){
      items = newItems;
      if(!items.find(function(x){ return x.id === selectedId; }) && items.length) selectedId = items[0].id;
      updateLabel();
      if(list.classList.contains('open')) renderList();
    }
  };
};

// ===== SOUND =====
var audioCtx=null, sndPack=S.get('snd_pack','beep'), sndMaster=S.get('snd_master',true), volume=S.get('volume',70);
function initAudio(){ if(!audioCtx){ try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ audioCtx=null; } } }
function volLevel(){ return (volume/100)*(sndMaster?1:0); }
function beep(freq,dur,type,v){ initAudio(); if(!audioCtx) return; v=(v||0.04)*volLevel(); if(v<=0) return; try{ var o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type=type||'sine'; o.frequency.value=freq; g.gain.value=v; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur); o.stop(audioCtx.currentTime+dur); }catch(e){} }
function noiseBurst(dur,v){ initAudio(); if(!audioCtx) return; v=(v||0.05)*volLevel(); if(v<=0) return; try{ var b=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate); var d=b.getChannelData(0); for(var i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2); var s=audioCtx.createBufferSource(); s.buffer=b; var g=audioCtx.createGain(); g.gain.value=v; s.connect(g); g.connect(audioCtx.destination); s.start(); }catch(e){} }
function sndPlay(kind){
  if(!sndMaster||sndPack==='off') return;
  var k=kind;
  switch(sndPack){
    case 'beep': if(k==='click')beep(800,.05,'square',.03); else if(k==='nav')beep(500,.04,'sine',.02); else if(k==='success'){beep(600,.08,'sine',.05);setTimeout(function(){beep(900,.1,'sine',.05)},80);} else if(k==='error')beep(200,.15,'sawtooth',.05); break;
    case 'click': if(k==='click'||k==='nav')noiseBurst(.03,.06); else if(k==='success'){noiseBurst(.03,.06);setTimeout(function(){noiseBurst(.03,.06)},60);} else if(k==='error')noiseBurst(.03,.08); break;
    case 'digital': if(k==='click')beep(1200,.03,'square',.04); else if(k==='nav')beep(1500,.02,'square',.03); else if(k==='success'){beep(523,.07,'square',.04);setTimeout(function(){beep(659,.07,'square',.04)},80);} else if(k==='error')beep(200,.1,'square',.05); break;
    case 'soft': if(k==='click')beep(400,.08,'sine',.02); else if(k==='nav')beep(300,.04,'sine',.015); else if(k==='success'){beep(500,.1,'sine',.03);setTimeout(function(){beep(700,.12,'sine',.03)},100);} else if(k==='error')beep(250,.15,'sine',.03); break;
    case 'honey': if(k==='click')beep(520,.1,'sine',.04); else if(k==='success'){beep(450,.15,'sine',.05);setTimeout(function(){beep(620,.18,'sine',.05)},100);} else if(k==='error')beep(280,.2,'sine',.04); else beep(400,.06,'sine',.025); break;
    case 'cloud': if(k==='click')beep(760,.12,'sine',.03); else if(k==='success'){beep(680,.15,'sine',.04);setTimeout(function(){beep(880,.2,'sine',.04)},120);} else if(k==='error')beep(340,.2,'sine',.035); else beep(600,.08,'sine',.02); break;
    case 'cherry': if(k==='click')beep(900,.07,'triangle',.035); else if(k==='success'){beep(750,.1,'triangle',.045);setTimeout(function(){beep(1050,.12,'triangle',.045)},90);} else if(k==='error')beep(400,.15,'triangle',.04); else beep(700,.05,'triangle',.02); break;
    case 'ocean': if(k==='click')beep(180,.15,'sine',.04); else if(k==='success'){beep(200,.2,'sine',.05);setTimeout(function(){beep(280,.25,'sine',.05)},140);} else if(k==='error')beep(120,.25,'sine',.04); else beep(140,.1,'sine',.03); break;
    case 'coral': if(k==='click')beep(640,.1,'triangle',.04); else if(k==='success'){beep(560,.13,'triangle',.05);setTimeout(function(){beep(740,.16,'triangle',.05)},100);} else if(k==='error')beep(320,.18,'triangle',.04); else beep(500,.07,'triangle',.025); break;
    case 'mint': if(k==='click')beep(850,.06,'sine',.035); else if(k==='success'){beep(720,.09,'sine',.045);setTimeout(function(){beep(960,.12,'sine',.045)},80);} else if(k==='error')beep(380,.14,'sine',.035); else beep(680,.04,'sine',.02); break;
    case 'lavender': if(k==='click')beep(480,.13,'sine',.032); else if(k==='success'){beep(420,.16,'sine',.042);setTimeout(function(){beep(580,.18,'sine',.042)},110);} else if(k==='error')beep(240,.2,'sine',.032); else beep(360,.09,'sine',.022); break;
    case 'peach': if(k==='click')beep(580,.1,'sine',.038); else if(k==='success'){beep(500,.12,'sine',.045);setTimeout(function(){beep(660,.15,'sine',.045)},95);} else if(k==='error')beep(300,.18,'sine',.038); else beep(450,.07,'sine',.024); break;
    case 'tap': if(k==='click')noiseBurst(.02,.08); else if(k==='nav')noiseBurst(.015,.05); else if(k==='success'){noiseBurst(.02,.07);setTimeout(function(){noiseBurst(.02,.07)},70);} else if(k==='error')noiseBurst(.03,.09); break;
    case 'pop': if(k==='click'){beep(700,.03,'sine',.06);beep(1200,.02,'sine',.04);} else if(k==='nav')beep(600,.03,'sine',.04); else if(k==='success'){beep(650,.04,'sine',.06);beep(1100,.03,'sine',.05);setTimeout(function(){beep(1400,.03,'sine',.04)},80);} else if(k==='error'){beep(300,.05,'sine',.05);beep(180,.08,'sine',.04);} break;
  }
}
function sndClick(){ sndPlay('click'); }
function sndSuccess(){ sndPlay('success'); }
function sndError(){ sndPlay('error'); }
function sndNav(){ sndPlay('nav'); }

var hapticOn=S.get('haptic',false);
function vib(ms){ if(!hapticOn)return; if(navigator.vibrate)try{ navigator.vibrate(ms||20); }catch(e){} }
var aniOn=S.get('anim',true);
function applyAnim(){ if(aniOn) document.body.classList.remove('no-anim'); else document.body.classList.add('no-anim'); }
function logTo(id,msg,cls){ var el=$(id); if(!el)return; var d=document.createElement('div'); d.className=cls||'ok'; d.textContent='['+new Date().toLocaleTimeString()+'] '+msg; el.appendChild(d); el.scrollTop=el.scrollHeight; }

// ===== THEME =====
function hexToRgba(hex,a){ var h=hex.replace('#',''); if(h.length===3) h=h.split('').map(function(c){return c+c}).join(''); var r=parseInt(h.substring(0,2),16), g=parseInt(h.substring(2,4),16), b=parseInt(h.substring(4,6),16); return 'rgba('+r+','+g+','+b+','+a+')'; }
function applyCustomTheme(ac,bg,br){
  var el=document.getElementById('custom-theme-override');
  if(!el){ el=document.createElement('style'); el.id='custom-theme-override'; document.head.appendChild(el); }
  var css='';
  if(ac) css+=':root,body[data-theme]{--ac:'+ac+' !important;--ac2:'+ac+' !important;--acd:'+hexToRgba(ac,0.15)+' !important}';
  if(bg) css+=':root,body[data-theme]{--bg:'+bg+' !important}';
  if(br) css+=':root,body[data-theme]{--border:'+br+' !important;--bl:'+br+' !important}';
  el.textContent=css;
}
function clearCustomTheme(){ var el=document.getElementById('custom-theme-override'); if(el) el.parentNode.removeChild(el); }
function loadCustomTheme(){ var c=S.get('cust_theme',null); if(c&&c.ac){ var a=$('cust-ac'),b=$('cust-bg'),d=$('cust-br'); if(a)a.value=c.ac; if(b)b.value=c.bg; if(d)d.value=c.br; applyCustomTheme(c.ac,c.bg,c.br); } }
function setTema(t){ document.body.setAttribute('data-theme',t); S.set('theme',t); $$('.to').forEach(function(o){ o.classList.toggle('a',o.dataset.t===t); }); }

$$('.to').forEach(function(o){
  o.addEventListener('click', function(){
    clearCustomTheme(); S.del('cust_theme');
    setTema(o.dataset.t); sndClick(); vib();
  });
});
if($('cust-apply')) $('cust-apply').onclick=function(){ var ac=$('cust-ac').value, bg=$('cust-bg').value, br=$('cust-br').value; S.set('cust_theme',{ac:ac,bg:bg,br:br}); applyCustomTheme(ac,bg,br); unlockAch('theme'); sndSuccess(); vib(); };
if($('cust-rand')) $('cust-rand').onclick=function(){
  function hsl2hex(hu,s,l){ s/=100; l/=100; var c=(1-Math.abs(2*l-1))*s; var x=c*(1-Math.abs((hu/60)%2-1)); var m=l-c/2; var r=0,g=0,b=0; if(hu<60){r=c;g=x;b=0}else if(hu<120){r=x;g=c;b=0}else if(hu<180){r=0;g=c;b=x}else if(hu<240){r=0;g=x;b=c}else if(hu<300){r=x;g=0;b=c}else{r=c;g=0;b=x} function hx(v){ var s=Math.round((v+m)*255).toString(16); return s.length<2?'0'+s:s; } return '#'+hx(r)+hx(g)+hx(b); }
  var h=Math.floor(Math.random()*360); var ac=hsl2hex(h,90,60); var bg=hsl2hex((h+150)%360,70,6); var br=hsl2hex((h+30)%360,70,35);
  $('cust-ac').value=ac; $('cust-bg').value=bg; $('cust-br').value=br;
  S.set('cust_theme',{ac:ac,bg:bg,br:br}); applyCustomTheme(ac,bg,br); unlockAch('theme'); sndSuccess(); vib();
};
if($('cust-reset')) $('cust-reset').onclick=function(){ S.del('cust_theme'); clearCustomTheme(); setTema(S.get('theme','t-cyan')); sndSuccess(); };

// ===== ACHIEVEMENT =====
var ACH_LIST=[
  {id:'first_begin',name:'The Beginning?',desc:'Pertama kali generate file'},
  {id:'ten',name:'Taking Off',desc:'10x generate'},
  {id:'fifty',name:'Benchmarking',desc:'50x generate'},
  {id:'hundred',name:'The Beginning.',desc:'100x generate'},
  {id:'scrape_first',name:'Time to Mine!',desc:'Pertama kali scrape proxy'},
  {id:'scrape_10k',name:'Getting an Upgrade',desc:'Target 10.000 proxy'},
  {id:'scrape_100k',name:"Sky's the Limit",desc:'Target 100.000 proxy'},
  {id:'proxy_1k',name:'Cover Me With Diamonds',desc:'1.000 proxy unik'},
  {id:'check_first',name:'Acquire Hardware',desc:'Pertama cek proxy'},
  {id:'deploy_first',name:'Return to Sender',desc:'Pertama deploy Vercel'},
  {id:'deploy_10',name:'Great View From Up Here',desc:'10 project deployed'},
  {id:'tmp_first',name:'Beam Me Up',desc:'Pertama generate tempmail'},
  {id:'inbox_first',name:'Monster Hunter',desc:'Pertama refresh inbox'},
  {id:'enc_first',name:'Bake Bread',desc:'Pertama pakai encoder'},
  {id:'jwt_first',name:'Cipher Broken',desc:'Pertama decode JWT'},
  {id:'dork_first',name:'Hot Topic',desc:'Generate Google Dork'},
  {id:'ip_first',name:'Time to Strike!',desc:'Pertama IP lookup'},
  {id:'dark',name:'We Need to Go Deeper',desc:'Aktifkan dark mode'},
  {id:'theme',name:'Delicious Fish',desc:'Custom theme color'},
  {id:'all',name:'The End.',desc:'Semua fitur dipakai'}
];
var ACH_UNLOCKED=S.get('ach_unlocked',{});
var notifOn=S.get('notif_on',true);
function renderAch(){ var wrap=$('ach-wrap'); if(!wrap)return; wrap.innerHTML=ACH_LIST.map(function(a){ var u=ACH_UNLOCKED[a.id]; return '<div class="ach '+(u?'unlocked':'locked')+'"><div>'+a.name+'</div><div class="desc">'+a.desc+'</div></div>'; }).join(''); var st=$('st-a'); if(st) st.textContent=Object.keys(ACH_UNLOCKED).length+'/'+ACH_LIST.length; }
function showAchToast(name,desc){ if(!notifOn)return; var wrap=$('ach-toast-wrap'); if(!wrap)return; var el=document.createElement('div'); el.className='ach-toast'; el.innerHTML='<div class="t">'+name+'</div><div class="d">'+desc+'</div>'; wrap.appendChild(el); setTimeout(function(){ el.classList.add('out'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },350); },3000); }
function unlockAch(id){ try{ if(ACH_UNLOCKED[id])return; var a=ACH_LIST.find(function(x){ return x.id===id; }); if(!a)return; ACH_UNLOCKED[id]=Date.now(); S.set('ach_unlocked',ACH_UNLOCKED); showAchToast(a.name,a.desc); sndSuccess(); renderAch(); }catch(e){} }
window.unlockAch=unlockAch;
window.sndSuccess=sndSuccess;
window.sndClick=sndClick;

// ===== WELCOME =====
(function(){
  var popupOn = S.get('popup_on', true);
  var modal = $('welcome-modal');
  if(!modal) return;
  if(popupOn) modal.classList.remove('hd'); else modal.classList.add('hd');
  function closeWm(){ modal.classList.add('hd'); sndClick(); }
  var startBtn = $('wm-start'), skipBtn = $('wm-skip');
  if(startBtn) startBtn.onclick = function(){ closeWm(); sndSuccess(); };
  if(skipBtn) skipBtn.onclick = function(){ closeWm(); };
})();

// ===== NAV SCROLL v6.6 =====
(function(){
  var nav = document.getElementById('nav-main');
  if(!nav) return;
  var currentPage = 'home';
  var allPages = ['home','spy','utl','osi','scr','bp','dl','srch','up','imgai','imghd','kal','maker','srchapi','tmp','tpl','hst','set'];

  function switchPage(name){
    if(name === currentPage) return;
    var oldPg = document.getElementById('pg-' + currentPage);
    var newPg = document.getElementById('pg-' + name);
    if(!newPg) return;
    if(oldPg){
      oldPg.classList.remove('active');
      oldPg.classList.add('leaving');
      setTimeout(function(){ oldPg.classList.remove('leaving'); oldPg.classList.add('hd'); }, 220);
    }
    newPg.classList.remove('hd');
    void newPg.offsetWidth;
    newPg.classList.add('active');
    currentPage = name;

    if(name === 'bp' && typeof window.zyInitBypass === 'function'){ try{ window.zyInitBypass(); }catch(e){} }
    if(name === 'dl' && typeof window.zyInitDownloader === 'function'){ try{ window.zyInitDownloader(); }catch(e){} }
    if(name === 'set' && typeof window.syncSettingsUI === 'function'){ try{ window.syncSettingsUI(); }catch(e){} }
    if(name === 'hst'){ try{ renderHist(); }catch(e){} }
    if(name === 'tmp' && typeof window.tmpLoadDomains === 'function'){ try{ window.tmpLoadDomains(); }catch(e){} }
    if(name === 'up' && typeof window.zyInitApiHub === 'function'){ try{ window.zyInitApiHub('apihub-up', 'UPSCALE'); }catch(e){} }
    if(name === 'imgai' && typeof window.zyInitApiHub === 'function'){ try{ window.zyInitApiHub('apihub-ai', 'IMG AI'); }catch(e){} }
    if(name === 'imghd' && typeof window.zyInitApiHub === 'function'){ try{ window.zyInitApiHub('apihub-hd', 'IMG HD'); }catch(e){} }
    if(name === 'kal' && typeof window.zyInitApiHub === 'function'){ try{ window.zyInitApiHub('apihub-kal', 'KALENDER'); }catch(e){} }
    if(name === 'maker' && typeof window.zyInitApiHub === 'function'){ try{ window.zyInitApiHub('apihub-mk', 'MAKER'); }catch(e){} }
    if(name === 'srchapi' && typeof window.zyInitApiHub === 'function'){ try{ window.zyInitApiHub('apihub-sr', 'SEARCH'); }catch(e){} }
  }

  nav.querySelectorAll('.nb').forEach(function(b){
    b.addEventListener('click', function(){
      if(b.classList.contains('a')) return;
      sndNav(); vib(10);
      nav.querySelectorAll('.nb').forEach(function(x){ x.classList.remove('a'); });
      b.classList.add('a');
      try{ b.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'}); }catch(e){}
      switchPage(b.dataset.p);
    });
  });

  var active = nav.querySelector('.nb.a') || nav.querySelector('.nb');
  if(active){
    active.classList.add('a');
    allPages.forEach(function(p){
      var pg = document.getElementById('pg-' + p);
      if(!pg) return;
      if(p === active.dataset.p){ pg.classList.remove('hd'); pg.classList.add('active'); }
      else pg.classList.add('hd');
    });
  }

  window.__navActivate = function(btn){ if(!btn || btn.classList.contains('a')) return; btn.click(); };
})();

window.go = function(p){ var b = document.querySelector('.nb[data-p="' + p + '"]'); if(b && window.__navActivate) window.__navActivate(b); };

document.addEventListener('click',function(e){
  if(e.target.closest && e.target.closest('.gulp')) return;
  if(e.target.closest && e.target.closest('.gulp-mini')) return;
  if(e.target.closest && e.target.closest('.zy-select-wrap')) return;
  if(e.target.closest && e.target.closest('#passwordGate')) return;
  if(e.target.closest && e.target.closest('.search-cat')) return;
  if(e.target.closest && e.target.closest('.upload-btn')) return;
  if(e.target.closest && e.target.closest('.search-item')) return;
  if(e.target.tagName==='BUTTON'&&!e.target.classList.contains('tgl')&&!e.target.disabled&&e.target.id!=='wm-skip'){ sndClick(); vib(15); }
},true);

// ===== SOUND PACK =====
$$('#snd-grid .snd-opt').forEach(function(o){ o.onclick=function(){ sndPack=o.dataset.snd; S.set('snd_pack',sndPack); $$('#snd-grid .snd-opt').forEach(function(x){ x.classList.toggle('a',x.dataset.snd===sndPack); }); if(sndPack!=='off') sndSuccess(); }; });
if($('test-snd')) $('test-snd').onclick=function(){ var old=sndPack; if(sndPack==='off') sndPack='beep'; sndSuccess(); setTimeout(function(){ sndPack=old; },300); };

var volRange=$('vol-range');
if(volRange){ volRange.value=volume; if($('vol-val')) $('vol-val').textContent=volume+'%'; volRange.addEventListener('input',function(){ volume=parseInt(this.value); S.set('volume',volume); if($('vol-val')) $('vol-val').textContent=volume+'%'; }); volRange.addEventListener('change',function(){ sndSuccess(); }); }
if($('tg-sound')){ $('tg-sound').checked=sndMaster; $('tg-sound').onchange=function(){ sndMaster=this.checked; S.set('snd_master',sndMaster); if(sndMaster) sndSuccess(); }; }
if($('tg-notif')){ $('tg-notif').checked=notifOn; $('tg-notif').onchange=function(){ notifOn=this.checked; S.set('notif_on',notifOn); }; }
if($('tg-popup')){ $('tg-popup').checked=S.get('popup_on',true); $('tg-popup').onchange=function(){ S.set('popup_on',this.checked); }; }
if($('tg-anim')){ $('tg-anim').checked=aniOn; $('tg-anim').onchange=function(){ aniOn=this.checked; S.set('anim',aniOn); applyAnim(); }; }
if($('tg-haptic')){ $('tg-haptic').checked=hapticOn; $('tg-haptic').onchange=function(){ hapticOn=this.checked; S.set('haptic',hapticOn); if(hapticOn) vib(50); }; }
if($('fsr')) $('fsr').oninput=function(){ document.documentElement.style.setProperty('--fs',this.value+'px'); S.set('font',this.value); if($('fv')) $('fv').textContent=this.value+'px'; };

// ===== MODE =====
var mode=S.get('mode','dark');
function applyMode(){ if(mode==='light') document.body.classList.add('light'); else document.body.classList.remove('light'); if($('mode-tgl')) $('mode-tgl').textContent=mode==='light'?'☀️':'🌙'; }
if($('mode-tgl')) $('mode-tgl').onclick=function(){ mode=(mode==='dark')?'light':'dark'; S.set('mode',mode); applyMode(); sndClick(); vib(); if(mode==='dark') unlockAch('dark'); };

// ===== BACKGROUND =====
function setBg(b){
  S.set('bg', b);
  document.body.classList.remove('bg-galaxy','bg-binary','bg-ufo','bg-plain','bg-custom');
  document.body.classList.add('bg-' + b);
  if(b === 'custom'){
    var img = S.get('bg_custom','');
    document.body.style.backgroundImage = img ? 'url(' + img + ')' : 'none';
  } else { document.body.style.backgroundImage = ''; }
  $$('#bg-grid .snd-opt').forEach(function(o){ o.classList.toggle('a', o.dataset.bg === b); });
}
$$('#bg-grid .snd-opt').forEach(function(o){
  o.addEventListener('click', function(){ setBg(o.dataset.bg); sndClick(); vib(); });
});
var bgf=$('bg-file');
if(bgf) bgf.onchange=function(e){
  var f=e.target.files[0]; if(!f)return;
  var r=new FileReader();
  r.onload=function(ev){
    var img=new Image();
    img.onload=function(){
      var c=document.createElement('canvas');
      var scale=Math.min(1,1280/img.width);
      c.width=img.width*scale; c.height=img.height*scale;
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      S.set('bg_custom',c.toDataURL('image/jpeg',.7));
      setBg('custom'); sndSuccess();
    };
    img.src=ev.target.result;
  };
  r.readAsDataURL(f);
};

// ===== SPY =====
if($('tp')) $('tp').onclick=function(){ $('tp').classList.add('a'); $('tu').classList.remove('a'); $('sp').classList.remove('hd'); $('su').classList.add('hd'); };
if($('tu')) $('tu').onclick=function(){ $('tu').classList.add('a'); $('tp').classList.remove('a'); $('su').classList.remove('hd'); $('sp').classList.add('hd'); };
if($('fi')) $('fi').onchange=function(e){ var f=e.target.files[0]; if(!f)return; var r=new FileReader(); r.onload=function(ev){ $('ci').value=ev.target.result; $('finfo').innerHTML='<div class="r" style="border-color:var(--ac);background:var(--acd);color:var(--ac)">'+f.name+' · '+(f.size/1024).toFixed(1)+' KB</div>'; }; r.readAsText(f); sndSuccess(); };
['bt','ct','on'].forEach(function(id){ var el=$(id); if(!el)return; var s=S.get('f_'+id,''); if(s) el.value=s; var fn=function(){ S.set('f_'+id,el.value); }; el.addEventListener('input',fn); el.addEventListener('change',fn); });

var genCode='', genBlob=null;
function inject(t,u){ var ls=t.split('\n'), li=-1; for(var i=0;i<ls.length;i++){ var l=ls[i].trim(); if(l.indexOf('import ')===0||l.indexOf('from ')===0) li=i; } if(li===-1) return u+'\n\n'+t; var b=ls.slice(0,li+1).join('\n'), a=ls.slice(li+1).join('\n'); return b+'\n\n# USER CODE\n'+u+'\n# END USER CODE\n'+a; }

(function(){
  var gulpBtn = document.getElementById('gulp-generate');
  if(!gulpBtn) return;
  gulpBtn.addEventListener('click', function(e){
    e.stopPropagation();
    if(gulpBtn.dataset.state === 'pending' || gulpBtn.dataset.state === 'eat' || gulpBtn.dataset.state === 'done') return;
    var uc = ($('ci')||{}).value ? $('ci').value.trim() : '';
    var tpl = ($('ts')||{}).value || (window.__selTemplate ? window.__selTemplate.getValue() : '');
    var sw = $('sw'), rc = $('rc');
    if(!uc){ if(sw) sw.innerHTML = '<div class="st-er">Code kosong</div>'; if(rc) rc.classList.add('hd'); sndError(); return; }
    if(!tpl){ if(sw) sw.innerHTML = '<div class="st-er">Pilih template</div>'; if(rc) rc.classList.add('hd'); sndError(); return; }
    gulpBtn.dataset.state = 'eat';
    setTimeout(function(){
      gulpBtn.dataset.state = 'pending';
      if(sw) sw.innerHTML = '<div class="st-in">⚙ Memproses...</div>';
      var t0 = performance.now();
      var bt = ($('bt')||{}).value ? $('bt').value.trim() : '';
      var ct = ($('ct')||{}).value ? $('ct').value.trim() : '';
      setTimeout(function(){
        var t = (tpl === 'command') ? (window.TEMPLATE_COMMAND || '') : (window.TEMPLATE_BASE || '');
        if(!t){ if(sw) sw.innerHTML = '<div class="st-er">Template kosong</div>'; sndError(); gulpBtn.dataset.state = 'idle'; return; }
        var out = t;
        if(bt) out = out.replace(/BOT_TOKEN\s*=\s*['"][^'"]*['"]/g, 'BOT_TOKEN = "' + bt + '"');
        if(ct) out = out.replace(/CHAT_ID\s*=\s*['"][^'"]*['"]/g, 'CHAT_ID   = "' + ct + '"');
        var final = inject(out, uc);
        genCode = final;
        genBlob = new Blob([final], {type:'text/x-python'});
        var name = (($('on')||{}).value || 'spyware_ryan').trim() + '.py';
        var kb = (final.length/1024).toFixed(1);
        var ln = final.split('\n').length;
        var el = Math.round(performance.now() - t0);
        if(sw) sw.innerHTML = '<div class="st-ok">✓ Berhasil · ' + kb + ' KB · ' + el + 'ms</div>';
        if($('rm')) $('rm').textContent = name;
        if($('rs')) $('rs').textContent = ln + ' lines · ' + kb + ' KB';
        if(rc) rc.classList.remove('hd');
        sndSuccess();
        var h = S.get('history', []);
        h.unshift({n:name,s:kb,l:ln,t:Date.now(),c:final.substring(0,40000)});
        if(h.length > 30) h = h.slice(0,30);
        S.set('history', h);
        var g = S.get('generates', 0) + 1;
        S.set('generates', g);
        if($('st-g')) $('st-g').textContent = g;
        if(g >= 1)   unlockAch('first_begin');
        if(g >= 10)  unlockAch('ten');
        if(g >= 50)  unlockAch('fifty');
        if(g >= 100) unlockAch('hundred');
        gulpBtn.dataset.state = 'done';
        setTimeout(function(){ gulpBtn.dataset.state = 'idle'; }, 2500);
      }, 180);
    }, 520);
  });
})();

if($('db')) $('db').onclick=function(){ if(!genCode){ sndError(); return; } var b=new Blob([genCode],{type:'text/plain'}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download=$('rm').textContent; document.body.appendChild(a); a.click(); document.body.removeChild(a); var d=S.get('downloads',0)+1; S.set('downloads',d); if($('st-d')) $('st-d').textContent=d; sndSuccess(); vib(50); setTimeout(function(){ URL.revokeObjectURL(u); },1000); };
if($('cob')) $('cob').onclick=function(){ if(!genCode){ sndError(); return; } navigator.clipboard.writeText(genCode).then(sndSuccess); };
if($('shb')) $('shb').onclick=async function(){
  if(!genBlob){ sndError(); alert('Generate dulu'); return; }
  var name=$('rm').textContent; var file=new File([genBlob],name,{type:'text/x-python'});
  if(navigator.canShare && navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],title:name}); sndSuccess(); return; }catch(e){ if(e.name==='AbortError') return; } }
  if(navigator.share){ try{ await navigator.share({title:name,text:name}); sndSuccess(); return; }catch(e){ if(e.name==='AbortError') return; } }
  var u=URL.createObjectURL(genBlob); var a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a); sndSuccess();
  setTimeout(function(){ URL.revokeObjectURL(u); },1000);
};
if($('pvb')) $('pvb').onclick=function(){ var pb=$('pbox'); if(pb.classList.contains('hd')){ pb.textContent=genCode.substring(0,3000); pb.classList.remove('hd'); }else pb.classList.add('hd'); };
if($('cb')) $('cb').onclick=function(){ $('ci').value=''; $('rc').classList.add('hd'); $('sw').innerHTML=''; genCode=''; genBlob=null; sndClick(); };
if($('vb')) $('vb').onclick=function(){ var c=$('ci').value; var q1=(c.match(/'/g)||[]).length, q2=(c.match(/"/g)||[]).length; var w=[]; if(q1%2)w.push("kutip ' ganjil"); if(q2%2)w.push('kutip " ganjil'); $('sw').innerHTML=w.length?'<div class="st-er">⚠ '+w.join(', ')+'</div>':'<div class="st-ok">✓ Kode OK</div>'; if(w.length)sndError(); else sndSuccess(); };

if($('snp-save')) $('snp-save').onclick=function(){ var c=$('ci').value.trim(); if(!c){ sndError(); return; } var n=prompt('Nama snippet:'); if(!n) return; var sn=S.get('snippets',{}); sn[n]=c; S.set('snippets',sn); var cnt=Object.keys(sn).length; S.set('snippet_count',cnt); if($('st-s')) $('st-s').textContent=cnt; sndSuccess(); alert('Saved: '+n); };
if($('snp-load')) $('snp-load').onclick=function(){ var sn=S.get('snippets',{}); var keys=Object.keys(sn); if(!keys.length){ sndError(); return; } var pick=prompt('Pilih:\n'+keys.map(function(k,i){ return (i+1)+'. '+k; }).join('\n')+'\n\nNomor:'); var i=parseInt(pick)-1; if(keys[i]){ $('ci').value=sn[keys[i]]; sndSuccess(); } };

// ===== UTILS =====
var SEP_LIST=['_','-','.','@','#','$','%','&','*','+','?','~'];
if($('pgen')) $('pgen').onclick=function(){ var prefix=$('pg-prefix').value; var len=parseInt($('plen').value)||16; if(len<1)len=1; if(len>128)len=128; var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'; var rand=''; for(var i=0;i<len;i++) rand+=chars[Math.floor(Math.random()*chars.length)]; var sepSel=(window.__selSep ? window.__selSep.getValue() : '_'); var sep=(sepSel==='RANDOM')?SEP_LIST[Math.floor(Math.random()*SEP_LIST.length)]:sepSel; $('pres').textContent=(prefix?prefix+sep:'')+rand; sndSuccess(); };
if($('pcp')) $('pcp').onclick=function(){ navigator.clipboard.writeText($('pres').textContent).then(sndSuccess); };
if($('ugen')) $('ugen').onclick=function(){ $('ures').textContent=crypto.randomUUID(); sndSuccess(); };
function hashIt(algo,el){ var t=$('hin').value; crypto.subtle.digest(algo,new TextEncoder().encode(t)).then(function(b){ var h=Array.from(new Uint8Array(b)).map(function(x){ return x.toString(16).padStart(2,'0'); }).join(''); el.textContent=h; sndSuccess(); }); }
if($('hm5')) $('hm5').onclick=function(){ var t=$('hin').value; var s=0; for(var i=0;i<t.length;i++){ s=((s<<5)-s)+t.charCodeAt(i); s=s&s; } $('hres').textContent='MD5(len):'+t.length+' hex:'+Math.abs(s).toString(16).padStart(8,'0'); sndSuccess(); };
if($('hs1')) $('hs1').onclick=function(){ hashIt('SHA-1',$('hres')); };
if($('hs2')) $('hs2').onclick=function(){ hashIt('SHA-256',$('hres')); };
if($('shgen')) $('shgen').onclick=function(){ var u=$('shin').value.trim(); if(!u){ sndError(); return; } $('shres').textContent='Loading...'; fetch('https://tinyurl.com/api-create.php?url='+encodeURIComponent(u)).then(function(r){ return r.text(); }).then(function(t){ $('shres').textContent=t; sndSuccess(); }).catch(function(){ $('shres').textContent='Error'; }); };
if($('shcp')) $('shcp').onclick=function(){ navigator.clipboard.writeText($('shres').textContent).then(sndSuccess); };

// ===== ENCODER =====
var encMode='encode';
if($('enc-t-enc')) $('enc-t-enc').onclick=function(){ encMode='encode'; $('enc-t-enc').classList.add('a'); $('enc-t-dec').classList.remove('a'); };
if($('enc-t-dec')) $('enc-t-dec').onclick=function(){ encMode='decode'; $('enc-t-dec').classList.add('a'); $('enc-t-enc').classList.remove('a'); };
function b64enc(s){ return btoa(unescape(encodeURIComponent(s))); }
function b64dec(s){ return decodeURIComponent(escape(atob(s))); }
function hexenc(s){ return Array.from(new TextEncoder().encode(s)).map(function(x){ return x.toString(16).padStart(2,'0'); }).join(''); }
function hexdec(s){ var arr=new Uint8Array(s.length/2); for(var i=0;i<arr.length;i++) arr[i]=parseInt(s.substr(i*2,2),16); return new TextDecoder().decode(arr); }
var MORSE={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};
var MORSE_R={}; for(var mk in MORSE) MORSE_R[MORSE[mk]]=mk;
function runEnc(m,i){ try{ switch(m){ case 'base64': return b64enc(i); case 'hex': return hexenc(i); case 'url': return encodeURIComponent(i); case 'rot13': return i.replace(/[a-zA-Z]/g,function(c){ var b=c<='Z'?65:97; return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b); }); case 'morse': return i.toUpperCase().split('').map(function(c){ return MORSE[c]||''; }).filter(function(x){return x}).join(' '); case 'binary': return Array.from(new TextEncoder().encode(i)).map(function(x){ return x.toString(2).padStart(8,'0'); }).join(' '); case 'reverse': return i.split('').reverse().join(''); } }catch(e){ return 'Error: '+e.message; } return '?'; }
function runDec(m,i){ try{ switch(m){ case 'base64': return b64dec(i); case 'hex': return hexdec(i); case 'url': return decodeURIComponent(i); case 'rot13': return i.replace(/[a-zA-Z]/g,function(c){ var b=c<='Z'?65:97; return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b); }); case 'morse': return i.split(' ').map(function(c){ return MORSE_R[c]||''; }).join(''); case 'binary': var parts=i.trim().split(/\s+/); return new TextDecoder().decode(new Uint8Array(parts.map(function(p){ return parseInt(p,2); }))); case 'reverse': return i.split('').reverse().join(''); } }catch(e){ return 'Error: '+e.message; } return '?'; }
if($('enc-run')) $('enc-run').onclick=function(){ var i=$('enc-input').value; if(!i){ $('enc-output').textContent='—'; sndError(); return; } var m=(window.__selEnc ? window.__selEnc.getValue() : 'base64'); $('enc-output').textContent=(encMode==='encode')?runEnc(m,i):runDec(m,i); unlockAch('enc_first'); sndSuccess(); };
if($('enc-clear')) $('enc-clear').onclick=function(){ $('enc-input').value=''; $('enc-output').textContent='—'; sndClick(); };
if($('enc-copy')) $('enc-copy').onclick=function(){ navigator.clipboard.writeText($('enc-output').textContent).then(sndSuccess); };
if($('enc-dl')) $('enc-dl').onclick=function(){ var t=$('enc-output').textContent; if(!t||t==='—'){ sndError(); return; } var b=new Blob([t],{type:'text/plain'}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download='encoded.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); sndSuccess(); };

function b64urlDecode(str){ str=str.replace(/-/g,'+').replace(/_/g,'/'); while(str.length%4) str+='='; try{ return decodeURIComponent(escape(atob(str))); }catch(e){ return null; } }
if($('jwt-run')) $('jwt-run').onclick=function(){ var t=$('jwt-input').value.trim(); if(!t){ $('jwt-status').textContent='Token kosong'; return; } var parts=t.split('.'); if(parts.length!==3){ $('jwt-status').textContent='⚠ Bukan JWT valid'; return; } var h=b64urlDecode(parts[0]),p=b64urlDecode(parts[1]); if(!h||!p){ $('jwt-status').textContent='✗ Gagal decode'; return; } try{ $('jwt-header-out').textContent=JSON.stringify(JSON.parse(h),null,2); }catch(e){ $('jwt-header-out').textContent=h; } try{ $('jwt-payload-out').textContent=JSON.stringify(JSON.parse(p),null,2); }catch(e){ $('jwt-payload-out').textContent=p; } $('jwt-sig-out').textContent=parts[2]; ['jwt-header','jwt-payload','jwt-sig'].forEach(function(id){ $(id).classList.remove('hd'); }); $('jwt-status').textContent='✓ JWT decoded'; unlockAch('jwt_first'); sndSuccess(); };
if($('jwt-clear')) $('jwt-clear').onclick=function(){ $('jwt-input').value=''; ['jwt-header','jwt-payload','jwt-sig'].forEach(function(id){ $(id).classList.add('hd'); }); $('jwt-status').textContent='—'; sndClick(); };

if($('cc-upper')) $('cc-upper').onclick=function(){ $('cc-output').textContent=$('cc-input').value.toUpperCase(); sndSuccess(); };
if($('cc-lower')) $('cc-lower').onclick=function(){ $('cc-output').textContent=$('cc-input').value.toLowerCase(); sndSuccess(); };
if($('cc-copy')) $('cc-copy').onclick=function(){ navigator.clipboard.writeText($('cc-output').textContent).then(sndSuccess); };
if($('cc-clear')) $('cc-clear').onclick=function(){ $('cc-input').value=''; $('cc-output').textContent='—'; sndClick(); };
if($('lc-input')) $('lc-input').addEventListener('input',function(){ var t=this.value; $('lc-char').textContent=t.length; $('lc-word').textContent=t.trim()?t.trim().split(/\s+/).length:0; $('lc-line').textContent=t?t.split('\n').length:0; });

if($('ilook')) $('ilook').onclick=function(){ var ip=$('ipin').value.trim()||''; $('ires').textContent='Loading...'; fetch(ip?'https://ipapi.co/'+ip+'/json/':'https://ipapi.co/json/').then(function(r){ return r.json(); }).then(function(j){ $('ires').innerHTML='IP: '+j.ip+'<br>Kota: '+(j.city||'-')+'<br>Negara: '+(j.country_name||'-')+'<br>ISP: '+(j.org||'-'); unlockAch('ip_first'); sndSuccess(); }).catch(function(){ $('ires').textContent='Error'; }); };
if($('mip')) $('mip').onclick=function(){ $('mres').textContent='Loading...'; fetch('https://api.ipify.org?format=json').then(function(r){ return r.json(); }).then(function(j){ $('mres').textContent='IP: '+j.ip; sndSuccess(); }).catch(function(){ $('mres').textContent='Error'; }); };
if($('dgen')) $('dgen').onclick=function(){ var kw=$('dkw').value.trim(),site=$('dsite').value.trim(),tp=$('dtype').value.trim(); var q=''; if(site)q+='site:'+site+' '; if(kw)q+='"'+kw+'" '; if(tp)q+='filetype:'+tp; $('dres').textContent=q.trim()||'(kosong)'; unlockAch('dork_first'); sndSuccess(); };
if($('dvinfo')) $('dvinfo').onclick=function(){ $('dvres').innerHTML='Browser: '+navigator.userAgent+'<br>Layar: '+screen.width+'x'+screen.height+'<br>Online: '+navigator.onLine; sndSuccess(); };

// ===== API HUB wire =====
function wireApiHub(tabId, catName){
  var runBtn = document.getElementById('apihub-'+tabId+'-run');
  var clearBtn = document.getElementById('apihub-'+tabId+'-clear');
  if(runBtn) runBtn.addEventListener('click', function(){
    sndClick();
    if(typeof window.zyRunApiHub === 'function'){
      try{ window.zyRunApiHub('apihub-'+tabId, catName); }catch(e){ alert('Error: '+e.message); }
    }
  });
  if(clearBtn) clearBtn.addEventListener('click', function(){
    sndClick();
    var log = document.getElementById('apihub-'+tabId+'-log');
    var res = document.getElementById('apihub-'+tabId+'-result');
    if(log){ log.innerHTML=''; log.classList.add('hd'); }
    if(res){ res.innerHTML=''; res.classList.add('hd'); }
  });
}
wireApiHub('up', 'UPSCALE');
wireApiHub('ai', 'IMG AI');
wireApiHub('hd', 'IMG HD');
wireApiHub('kal', 'KALENDER');
wireApiHub('mk', 'MAKER');
wireApiHub('sr', 'SEARCH');

// ===== SEARCH browser wire =====
window.__searchCategory = 'ALL';
document.querySelectorAll('.search-cat').forEach(function(el){
  el.addEventListener('click', function(){
    document.querySelectorAll('.search-cat').forEach(function(x){ x.classList.remove('a'); });
    el.classList.add('a');
    window.__searchCategory = el.dataset.cat || 'ALL';
    sndClick(); vib();
  });
});
if($('search-go')) $('search-go').onclick = function(){
  sndClick();
  if(typeof window.zyRunSearch === 'function'){
    try{ window.zyRunSearch(); }catch(e){ alert('Search error: '+e.message); }
  }
};
if($('search-input')) $('search-input').addEventListener('keydown', function(e){
  if(e.key === 'Enter'){ e.preventDefault(); if($('search-go')) $('search-go').click(); }
});

// ===== BRIDGES =====
if($('ds-run')) $('ds-run').onclick=function(){ sndClick(); if(typeof window.dsRun==='function') try{ window.dsRun(); }catch(e){ alert('Scraper error: '+e.message); } else alert('scraper.js gak load'); };
if($('ds-paste')) $('ds-paste').onclick=function(){ navigator.clipboard.readText().then(function(t){ $('ds-url').value=t.trim(); sndSuccess(); }).catch(function(){}); };
if($('bp-run')) $('bp-run').onclick=function(){ sndClick(); if(typeof window.zyRunBypass==='function') try{ window.zyRunBypass(); }catch(e){ alert('Bypass error: '+e.message); } else alert('zyvor.js gak load'); };
if($('bp-clear')) $('bp-clear').onclick=function(){ $('bp-log').innerHTML=''; $('bp-log').classList.add('hd'); $('bp-result').innerHTML=''; $('bp-result').classList.add('hd'); sndClick(); };
if($('dl-run')) $('dl-run').onclick=function(){ sndClick(); if(typeof window.zyRunDownloader==='function') try{ window.zyRunDownloader(); }catch(e){ alert('DL error: '+e.message); } else alert('zyvor.js gak load'); };
if($('dl-run-all')) $('dl-run-all').onclick=function(){ sndClick(); if(typeof window.zyRunDownloaderAll==='function') try{ window.zyRunDownloaderAll(); }catch(e){ alert('DL error: '+e.message); } else alert('zyvor.js gak load'); };
if($('dl-preview')) $('dl-preview').onclick=function(){ sndClick(); if(typeof window.zyPreviewResult==='function') try{ window.zyPreviewResult(); }catch(e){} };
if($('dl-clear')) $('dl-clear').onclick=function(){ sndClick(); if(typeof window.zyClearDownloader==='function') try{ window.zyClearDownloader(); }catch(e){} };

// ===== PROXY SCRAPER =====
var scrResults=[], scrRunning=false, SCR_CD=15*60*1000;
function scrCD(){ var last=S.get('scr_last',0); var diff=last+SCR_CD-Date.now(); var btn=$('scr-start'); if(!btn)return; if(scrRunning){ btn.disabled=true; btn.textContent='⏳...'; return; } if(diff>0){ var m=Math.floor(diff/60000),s=Math.floor((diff%60000)/1000); btn.disabled=true; btn.textContent='⏳ '+m+'m '+s+'s'; }else{ btn.disabled=false; btn.textContent='▶ START'; } }
function scrP(cur,total){ var pct=total>0?Math.min(100,(cur/total)*100):0; if($('scr-prog-fill')) $('scr-prog-fill').style.width=pct+'%'; if($('scr-prog-txt')) $('scr-prog-txt').textContent=cur+' / '+total; if($('scr-prog-label')) $('scr-prog-label').textContent='MENGUMPULKAN · '+pct.toFixed(1)+'%'; }
if($('scr-clear')) $('scr-clear').onclick=function(){ if(scrRunning)return; $('scr-log').innerHTML=''; $('scr-pbox').classList.add('hd'); scrResults=[]; $('scr-prog-wrap').classList.remove('on'); sndClick(); };
if($('scr-start')) $('scr-start').onclick=async function(){
  if(scrRunning)return;
  var last=S.get('scr_last',0); var diff=last+SCR_CD-Date.now();
  if(diff>0){ logTo('scr-log','⏳ Cooldown aktif','warn'); return; }
  var sources=$('scr-sources').value.split('\n').map(function(x){return x.trim()}).filter(function(x){return x});
  if(!sources.length){ alert('Sumber kosong'); return; }
  var target=parseInt($('scr-target').value)||10000; if(target<100)target=100; if(target>120000)target=120000; $('scr-target').value=target;
  scrRunning=true; $('scr-prog-wrap').classList.add('on'); scrP(0,target); $('scr-log').innerHTML=''; scrResults=[];
  logTo('scr-log','Target: '+target,'in'); sndSuccess(); unlockAch('scrape_first');
  var seen={}, total=0;
  for(var i=0;i<sources.length;i++){
    if(total>=target) break;
    try{ var r=await fetch(sources[i]); var t=await r.text(); var found=t.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+/g)||[]; var uniq=0; found.forEach(function(p){ if(!seen[p]){ seen[p]=1; scrResults.push(p); uniq++; total++; } }); logTo('scr-log','['+(i+1)+'/'+sources.length+'] +'+uniq+' · '+total,'ok'); }catch(e){ logTo('scr-log','['+(i+1)+'] ✗ '+e.message,'er'); }
    scrP(total,target);
    if(total>=10000)unlockAch('scrape_10k'); if(total>=100000)unlockAch('scrape_100k'); if(total>=1000)unlockAch('proxy_1k');
    await new Promise(function(res){ setTimeout(res,2000); });
  }
  scrRunning=false; S.set('scr_last',Date.now()); logTo('scr-log','SELESAI · '+total,'in'); scrCD(); sndSuccess();
};
if($('scr-preview')) $('scr-preview').onclick=function(){ var pb=$('scr-pbox'); if(pb.classList.contains('hd')){ pb.textContent=scrResults.slice(0,50).join('\n'); pb.classList.remove('hd'); }else pb.classList.add('hd'); sndClick(); };
if($('scr-dl')) $('scr-dl').onclick=function(){ if(!scrResults.length){ sndError(); return; } var b=new Blob([scrResults.join('\n')],{type:'text/plain'}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download='proxies.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); sndSuccess(); };

if($('cors-test')) $('cors-test').onclick=async function(){
  var sources=$('cors-sources').value.split('\n').map(function(x){return x.trim()}).filter(function(x){return x});
  var target=$('cors-test-url').value.trim();
  $('cors-log').innerHTML=''; logTo('cors-log','Test '+sources.length,'in'); var alive=0;
  for(var i=0;i<sources.length;i++){ var p=sources[i]; var full=p+(p.indexOf('?')!==-1?encodeURIComponent(target):target); try{ var ctrl=new AbortController(); var tm=setTimeout(function(){ ctrl.abort(); },7000); var r=await fetch(full,{signal:ctrl.signal}); clearTimeout(tm); if(r.ok){ logTo('cors-log','['+(i+1)+'] ✓ '+p,'ok'); alive++; } else logTo('cors-log','['+(i+1)+'] ✗ HTTP '+r.status,'er'); }catch(e){ logTo('cors-log','['+(i+1)+'] ✗ '+p,'er'); } }
  logTo('cors-log','SELESAI · Hidup: '+alive+'/'+sources.length,'in'); sndSuccess();
};
if($('cors-clear')) $('cors-clear').onclick=function(){ $('cors-log').innerHTML=''; sndClick(); };

if($('pc-start')) $('pc-start').onclick=async function(){
  var raw=$('pc-input').value.split('\n').map(function(x){return x.trim()}).filter(function(x){return x});
  $('pc-log').innerHTML=''; var alive=0,dead=0,skip=0;
  for(var i=0;i<raw.length;i++){
    var line=raw[i]; var type='http';
    if(line.indexOf('://')!==-1){ var pp=line.split('://'); type=pp[0]; line=pp[1]; }
    if(type==='socks4'||type==='socks5'){ skip++; logTo('pc-log','['+(i+1)+'] ⚠ SKIP socks','warn'); continue; }
    try{ var ctrl=new AbortController(); var tm=setTimeout(function(){ ctrl.abort(); },5000); var r=await fetch('https://api.ipify.org',{signal:ctrl.signal}); clearTimeout(tm); if(r.ok){ alive++; logTo('pc-log','['+(i+1)+'] ✓ '+line,'ok'); } else { dead++; logTo('pc-log','['+(i+1)+'] ✗ '+line,'er'); } }catch(e){ dead++; logTo('pc-log','['+(i+1)+'] ✗ '+line,'er'); }
    $('pc-stat-total').textContent=raw.length; $('pc-stat-alive').textContent=alive; $('pc-stat-dead').textContent=dead; $('pc-stat-skip').textContent=skip;
  }
  sndSuccess(); unlockAch('check_first');
};
if($('pc-clear')) $('pc-clear').onclick=function(){ $('pc-input').value=''; $('pc-log').innerHTML=''; $('pc-stat-total').textContent=0; $('pc-stat-alive').textContent=0; $('pc-stat-dead').textContent=0; $('pc-stat-skip').textContent=0; sndClick(); };

// ===== VERCEL =====
var scrVFiles=[];
if($('scr-vdrop')) $('scr-vdrop').onclick=function(){ $('scr-vfile').click(); };
if($('scr-vfile')) $('scr-vfile').onchange=function(e){ Array.from(e.target.files).forEach(function(f){ if(!scrVFiles.some(function(x){ return x.name===f.name; })) scrVFiles.push(f); }); renderVFileList(); e.target.value=''; };
function renderVFileList(){ var el=$('scr-vlist'); if(!el)return; el.innerHTML=scrVFiles.map(function(f,i){ return '<div class="fitem"><span class="nm">'+f.name+'</span><span class="rm" data-i="'+i+'">✕</span></div>'; }).join(''); el.querySelectorAll('.rm').forEach(function(r){ r.onclick=function(){ scrVFiles.splice(parseInt(r.dataset.i),1); renderVFileList(); }; }); }
if($('scr-vclear')) $('scr-vclear').onclick=function(){ $('scr-vlog').innerHTML=''; $('scr-vresult').classList.add('hd'); scrVFiles=[]; renderVFileList(); sndClick(); };
if($('scr-vdeploy')) $('scr-vdeploy').onclick=async function(){
  var tok=$('scr-vtoken').value.trim(); var name=$('scr-vname').value.trim(); var total=parseInt($('scr-vtotal').value)||20; if(total>20)total=20;
  if(!tok){ alert('Token kosong'); return; } if(!name){ alert('Nama kosong'); return; } if(!scrVFiles.length){ alert('File kosong'); return; }
  var log=$('scr-vlog'); log.innerHTML=''; logTo('scr-vlog','Cek token...','in');
  try{ var r1=await fetch('https://api.vercel.com/v2/user',{headers:{'Authorization':'Bearer '+tok}}); if(!r1.ok){ logTo('scr-vlog','❌ Token invalid','er'); return; } logTo('scr-vlog','✅ Token OK','ok'); }catch(e){ logTo('scr-vlog','❌ '+e.message,'er'); return; }
  var files=[];
  for(var i=0;i<scrVFiles.length;i++){ var f=scrVFiles[i]; var b64=await new Promise(function(res){ var r=new FileReader(); r.onload=function(){ res(r.result.split(',')[1]); }; r.readAsDataURL(f); }); files.push({file:f.name,data:b64,encoding:'base64'}); }
  var base=name.toLowerCase().replace(/[^a-z0-9-]/g,'-');
  for(var p=0;p<total;p++){
    var suffix=Math.random().toString(36).substring(2,7); var projName=base+'-'+suffix;
    logTo('scr-vlog','['+(p+1)+'/'+total+'] '+projName,'in');
    try{ var r=await fetch('https://api.vercel.com/v13/deployments',{method:'POST',headers:{'Authorization':'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({name:projName,files:files,projectSettings:{framework:null}})}); var j=await r.json(); if(r.ok){ logTo('scr-vlog','  ✓ https://'+j.url,'ok'); } else { logTo('scr-vlog','  ✗ '+(j.error&&j.error.message||'error'),'er'); break; } }catch(e){ logTo('scr-vlog','  ✗ '+e.message,'er'); break; }
    if(p<total-1) await new Promise(function(res){ setTimeout(res,2000+Math.random()*3000); });
  }
  logTo('scr-vlog','SELESAI','in'); sndSuccess(); unlockAch('deploy_first');
};

// ===== HISTORY =====
function gulpMiniHTML(idx){
  return '<button class="gulp-mini" data-state="idle" data-idx="'+idx+'" type="button">'+
    '<span class="gulp_face"><svg class="gulp_icon" viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/></svg>DELETE</span>'+
    '<svg class="gulp_bin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1"/><path class="gulp_lid" d="M8 9h8l-1 9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2L8 9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 9V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'+
  '</button>';
}
function renderHist(){
  var h = S.get('history', []);
  var el = $('hl');
  if(!el) return;
  if(!h.length){ el.innerHTML = '<div class="r">Belum ada</div>'; return; }
  el.innerHTML = h.map(function(x, i){
    return '<div class="hi" data-hidx="'+i+'"><b>'+x.n+'</b> · '+x.s+' KB<div style="color:var(--txd);font-size:.55rem">'+new Date(x.t).toLocaleString()+'</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center"><button class="g" style="margin-top:0;font-size:.5rem;padding:5px 10px;width:auto;display:inline-block" onclick="window.dlHist('+i+')">DOWNLOAD</button>'+gulpMiniHTML(i)+'</div></div>';
  }).join('');
  el.querySelectorAll('.gulp-mini').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if(btn.dataset.state === 'eat' || btn.dataset.state === 'done') return;
      var idx = parseInt(btn.dataset.idx);
      btn.dataset.state = 'eat';
      setTimeout(function(){
        btn.dataset.state = 'done';
        var h = S.get('history', []);
        if(h[idx]){ h.splice(idx, 1); S.set('history', h); }
        sndSuccess(); vib(60);
        setTimeout(function(){ renderHist(); }, 900);
      }, 550);
    });
  });
}
window.dlHist = function(i){
  var h = S.get('history', []);
  if(!h[i]) return;
  var b = new Blob([h[i].c], {type:'text/plain'});
  var u = URL.createObjectURL(b);
  var a = document.createElement('a'); a.href = u; a.download = h[i].n;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  sndSuccess();
  setTimeout(function(){ URL.revokeObjectURL(u); }, 1000);
};
if($('hclr')) $('hclr').onclick=function(){ if(confirm('Clear?')){ S.del('history'); renderHist(); sndSuccess(); } };
if($('hexp')) $('hexp').onclick=function(){ var h=S.get('history',[]); var b=new Blob([JSON.stringify(h,null,2)],{type:'application/json'}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download='history.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); sndSuccess(); };

// ===== DATA EXPORT/IMPORT =====
if($('exst')) $('exst').onclick=function(){ var d={}; Object.keys(localStorage).forEach(function(k){ if(k.indexOf('rx_')===0) d[k]=localStorage[k]; }); var b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download='ryanntools_settings.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); sndSuccess(); };
if($('imst')) $('imst').onclick=function(){ var inp=document.createElement('input'); inp.type='file'; inp.accept='.json'; inp.onchange=function(e){ var f=e.target.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(ev){ try{ var d=JSON.parse(ev.target.result); Object.keys(d).forEach(function(k){ localStorage.setItem(k,d[k]); }); location.reload(); }catch(er){ alert('Error: '+er.message); } }; r.readAsText(f); }; inp.click(); };
if($('wipe')) $('wipe').onclick=function(){ if(confirm('Wipe ALL?')){ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('rx_')===0) localStorage.removeItem(k); }); location.reload(); } };

// ===== SYNC SETTINGS =====
function syncSettingsUI(){
  var curTheme = document.body.getAttribute('data-theme');
  document.querySelectorAll('.to').forEach(function(o){ o.classList.toggle('a', o.dataset.t === curTheme); });
  var curBg = S.get('bg', 'galaxy');
  document.querySelectorAll('#bg-grid .snd-opt').forEach(function(o){ o.classList.toggle('a', o.dataset.bg === curBg); });
  document.querySelectorAll('#snd-grid .snd-opt').forEach(function(x){ x.classList.toggle('a', x.dataset.snd === sndPack); });
  if(window.__selFont) window.__selFont.setValue(S.get('ffam', "'JetBrains Mono',monospace"));
  if(window.__selEnc) window.__selEnc.setValue(S.get('enc_method', 'base64'));
  if(window.__selSep) window.__selSep.setValue(S.get('pg_sep', '_'));
  if(window.__selTpl) window.__selTpl.setValue('');
  if(window.__selTemplate) window.__selTemplate.setValue(S.get('sel_template', ''));
  if($('tg-sound')) $('tg-sound').checked = sndMaster;
  if($('tg-notif')) $('tg-notif').checked = notifOn;
  if($('tg-popup')) $('tg-popup').checked = S.get('popup_on', true);
  if($('tg-anim')) $('tg-anim').checked = aniOn;
  if($('tg-haptic')) $('tg-haptic').checked = hapticOn;
  if($('vol-range')){ $('vol-range').value = volume; if($('vol-val')) $('vol-val').textContent = volume + '%'; }
}
window.syncSettingsUI = syncSettingsUI;

// ===== BOOT =====
function boot(){
  try { window.__selTemplate = initCustomSelect('sel-template',
    [{id:'', name:'— CHOOSE —'},{id:'command', name:'SPYWARE COMMAND', desc:'Spyware penuh'},{id:'base', name:'SPYWARE BASE', desc:'Template dasar'}],
    S.get('sel_template', ''),
    function(id){ S.set('sel_template', id); var h=$('ts'); if(h) h.value = id; }
  ); } catch(e){}
  try { window.__selSep = initCustomSelect('sel-sep',
    [{id:'_', name:'_ underscore'},{id:'-', name:'- dash'},{id:'.', name:'. dot'},{id:'@', name:'@ at'},{id:'#', name:'# hash'},{id:'RANDOM', name:'RANDOM', desc:'Acak'}],
    S.get('pg_sep', '_'),
    function(id){ S.set('pg_sep', id); }
  ); } catch(e){}
  try { window.__selEnc = initCustomSelect('sel-enc',
    [{id:'base64', name:'Base64'},{id:'hex', name:'Hex'},{id:'url', name:'URL Encode'},{id:'rot13', name:'ROT13'},{id:'morse', name:'Morse'},{id:'binary', name:'Binary'},{id:'reverse', name:'Reverse'}],
    S.get('enc_method','base64'),
    function(id){ S.set('enc_method', id); var h=$('enc-method'); if(h) h.value = id; }
  ); } catch(e){}
  try {
    var fontItems = [
      {id:"'JetBrains Mono',monospace", name:'JetBrains Mono', desc:'default'},
      {id:"'Fira Code',monospace", name:'Fira Code'},
      {id:"'Cascadia Code',monospace", name:'Cascadia Code'},
      {id:"'IBM Plex Mono',monospace", name:'IBM Plex Mono'},
      {id:"'Source Code Pro',monospace", name:'Source Code Pro'},
      {id:"'Inconsolata',monospace", name:'Inconsolata'},
      {id:"'Space Mono',monospace", name:'Space Mono'},
      {id:"'Ubuntu Mono',monospace", name:'Ubuntu Mono'},
      {id:"'Roboto Mono',monospace", name:'Roboto Mono'},
      {id:"'Victor Mono',monospace", name:'Victor Mono'},
      {id:"'Red Hat Mono',monospace", name:'Red Hat Mono'},
      {id:"'Anonymous Pro',monospace", name:'Anonymous Pro'},
      {id:"'Inter',sans-serif", name:'Inter'},
      {id:"'Roboto',sans-serif", name:'Roboto'},
      {id:"'Open Sans',sans-serif", name:'Open Sans'},
      {id:"'Poppins',sans-serif", name:'Poppins'},
      {id:"'Montserrat',sans-serif", name:'Montserrat'},
      {id:"'Work Sans',sans-serif", name:'Work Sans'},
      {id:"'Manrope',sans-serif", name:'Manrope'},
      {id:"'Outfit',sans-serif", name:'Outfit'},
      {id:"'Plus Jakarta Sans',sans-serif", name:'Plus Jakarta Sans'},
      {id:"'DM Sans',sans-serif", name:'DM Sans'},
      {id:"'Space Grotesk',sans-serif", name:'Space Grotesk'},
      {id:"'Lexend',sans-serif", name:'Lexend'},
      {id:"'Orbitron',sans-serif", name:'Orbitron'},
      {id:"'Audiowide',cursive", name:'Audiowide'},
      {id:"'Chakra Petch',sans-serif", name:'Chakra Petch'},
      {id:"'Rajdhani',sans-serif", name:'Rajdhani'},
      {id:"'Michroma',sans-serif", name:'Michroma'},
      {id:"'Syncopate',sans-serif", name:'Syncopate'}
    ];
    window.__selFont = initCustomSelect('sel-font', fontItems,
      S.get('ffam', "'JetBrains Mono',monospace"),
      function(id){ S.set('ffam', id); document.documentElement.style.setProperty('--fm', id); var h=$('ffam'); if(h) h.value = id; sndClick(); }
    );
  } catch(e){}
  try { window.__selTmpDom = initCustomSelect('sel-tmpdom', [{id:'', name:'— CHOOSE —'}], '',
    function(id){ var h = $('tmp-domain'); if(h) h.value = id; }
  ); } catch(e){}
  try { window.__selTpl = initCustomSelect('sel-tpl',
    [{id:'', name:'— CHOOSE —'},{id:'command', name:'SPYWARE COMMAND'},{id:'base', name:'SPYWARE BASE'}],
    '',
    function(id){
      var h = $('tplsel'); if(h) h.value = id;
      var area = $('tplarea');
      if(area) area.value = (id === 'command') ? (window.TEMPLATE_COMMAND || '') : (id === 'base') ? (window.TEMPLATE_BASE || '') : '';
    }
  ); } catch(e){}

  try { setTema(S.get('theme', 't-cyan')); } catch(e){}
  try { loadCustomTheme(); } catch(e){}
  try { setBg(S.get('bg', 'galaxy')); } catch(e){}
  try { applyMode(); } catch(e){}
  try { var f = S.get('font', 13); if($('fsr')) $('fsr').value = f; document.documentElement.style.setProperty('--fs', f + 'px'); if($('fv')) $('fv').textContent = f + 'px'; } catch(e){}
  try { var ff = S.get('ffam', "'JetBrains Mono',monospace"); document.documentElement.style.setProperty('--fm', ff); if(window.__selFont) window.__selFont.setValue(ff); } catch(e){}
  try { if($('st-g')) $('st-g').textContent = S.get('generates', 0); } catch(e){}
  try { if($('st-d')) $('st-d').textContent = S.get('downloads', 0); } catch(e){}
  try { if($('st-s')) $('st-s').textContent = S.get('snippet_count', 0); } catch(e){}
  try { renderHist(); } catch(e){}
  try { if(typeof renderTpl === 'function') renderTpl(); } catch(e){}
  try { renderAch(); } catch(e){}
  try { scrCD(); setInterval(scrCD, 1000); } catch(e){}
  try { if(typeof window.zyInitBypass === 'function') window.zyInitBypass(); } catch(e){}
  try { if(typeof window.zyInitDownloader === 'function') window.zyInitDownloader(); } catch(e){}
  try { if(typeof window.tmpLoadDomains === 'function') window.tmpLoadDomains(); } catch(e){}
}
boot();
applyAnim();

})();