/* TF Music — Android bridge.
   Loaded first, inside the Android app only. It gives the website:
   the new app design (icons, clean labels), saving to the phone's Music
   folder, the share sheet, the phone's Back button, light vibration on
   taps, a dark status bar, and the "new update" notice.
   In a normal browser it does nothing. */
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  window.TF_APP = true;
  document.documentElement.classList.add('tfa');

  function plug(name) {
    return (C.Plugins && C.Plugins[name]) || (C.registerPlugin && C.registerPlugin(name));
  }
  var FS = plug('Filesystem'), Share = plug('Share'), App = plug('App'),
      Haptics = plug('Haptics'), StatusBar = plug('StatusBar');
  var FOLDER = 'TF Music';
  function $(id) { return document.getElementById(id); }

  /* ---------- line icons ---------- */
  function svg(p, fill) {
    return '<svg viewBox="0 0 24 24" fill="' + (fill ? 'currentColor' : 'none') + '" stroke="' + (fill ? 'none' : 'currentColor') +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  var I = {
    mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>'),
    cut: svg('<circle cx="6" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><path d="M8.2 8.4 20 17M8.2 15.6 20 7"/>'),
    presets: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>'),
    fx: svg('<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    mix: svg('<path d="M6 4v16M12 4v16M18 4v16"/><rect x="4" y="13" width="4" height="3" rx="1.2" fill="currentColor"/><rect x="10" y="7" width="4" height="3" rx="1.2" fill="currentColor"/><rect x="16" y="11" width="4" height="3" rx="1.2" fill="currentColor"/>'),
    play: svg('<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/>', true),
    pause: svg('<rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/>', true),
    home: svg('<path d="M6 5v14"/><path d="M18 6.2v11.6a.8.8 0 0 1-1.25.66L9 13a1.2 1.2 0 0 1 0-2l7.75-5.46A.8.8 0 0 1 18 6.2z" fill="currentColor" stroke="none"/>'),
    loop: svg('<path d="M17 2.5l3 3-3 3"/><path d="M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3"/><path d="M20 12.5v1a5 5 0 0 1-5 5H4"/>'),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
    more: svg('<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>', true),
    download: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
    note: svg('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
    help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17.2v.01"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
    install: svg('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>')
  };
  var TAB_ICON = { rec: I.mic, edit: I.cut, sound: I.presets, fx: I.fx, mix: I.mix };
  var SHEET_ICON = { export: I.download, exportVocal: I.mic, demo: I.note, install: I.install, help: I.help, 'new': I.trash };

  function setPlayIcon() {
    var b = $('dPlay'); if (!b) return;
    var t = b.textContent || '';
    if (b.querySelector('svg') && !t.trim()) return;
    b.innerHTML = /⏸/.test(t) ? I.pause : I.play;
  }

  /* ---------- clean labels: drop the leading emoji from text buttons ---------- */
  var EMO = /^\s*(?:(?![◀▶])[\p{Extended_Pictographic}←-⇿⌀-⏿■-◿✀-➿⬀-⯿☀-⛿♪-♯][️‍]*)+\s*/u;
  function cleanNode(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (!n.nodeValue.trim()) continue;
        var v = n.nodeValue.replace(EMO, '');
        if (v !== n.nodeValue && v.trim() && el.textContent.replace(EMO, '').trim()) n.nodeValue = v;
        return;
      }
      if (n.nodeType === 1) {
        if (n.matches('input,select,svg,.dot,.fx-ico')) continue;
        if (n.matches('span,b,em')) { cleanNode(n); return; }
        return;
      }
    }
  }
  var CLEAN_SEL = '.btn, .seg button, summary, .cl-t, .live-t b, .card-h h2, .tune-set .ts-h, .sheet-i b, .me-head b, .chk span, .lsw > span:first-child';
  function cleanAll() { document.querySelectorAll(CLEAN_SEL).forEach(cleanNode); }
  var cleanQueued = false;
  function queueClean() {
    if (cleanQueued) return; cleanQueued = true;
    requestAnimationFrame(function () { cleanQueued = false; cleanAll(); setPlayIcon(); });
  }

  function decorate() {
    document.querySelectorAll('.tabbar button').forEach(function (b) {
      var i = b.querySelector('i'); if (i && TAB_ICON[b.dataset.go]) i.innerHTML = TAB_ICON[b.dataset.go];
    });
    document.querySelectorAll('.sheet-i').forEach(function (b) {
      var i = b.querySelector('i'); if (i && SHEET_ICON[b.dataset.act]) i.innerHTML = SHEET_ICON[b.dataset.act];
    });
    var map = { dHome: I.home, dLoop: I.loop, dLive: I.mic, btnUndo: I.undo, btnRedo: I.redo, btnMenu: I.more };
    Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.innerHTML = map[id]; });
    // shorter, calmer labels for the app
    var lab = { abRaw: 'আসল', abFx: 'স্টুডিও' };
    Object.keys(lab).forEach(function (id) { var el = $(id); if (el) el.textContent = lab[id]; });
    var t = document.querySelector('[data-tab="rec"] .card-h h2'); if (t) t.lastChild.nodeValue = 'রেকর্ড';
    setPlayIcon();
    cleanAll();
    // re-clean only when buttons/labels change (not on the running clock or meters)
    var SKIP = '.dtime, .lcd, .meter-top, .outm-top, .prm-top, .pre-amt, .fx-amt, .me-info, .me-ph, .live-stat, #liveLat, .ins-i, .ins-g, .keyinfo, #toast, .tfa-snack, canvas';
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target; if (t.nodeType === 3) t = t.parentNode;
        if (t && t.closest && !t.closest(SKIP)) { queueClean(); return; }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* ---------- light vibration on taps ---------- */
  var TAP_SEL = '.tabbar button, .dock button, .pre-h, .fx-h, .switch, .seg button, .ab button, .sheet-i, .btn.primary, .btn.success, .live-btn';
  document.addEventListener('pointerdown', function (e) {
    var t = e.target && e.target.closest && e.target.closest(TAP_SEL);
    if (t && Haptics && Haptics.impact) { try { Haptics.impact({ style: 'LIGHT' }); } catch (x) {} }
  }, true);

  /* ---------- status bar ---------- */
  try {
    if (StatusBar) {
      StatusBar.setStyle && StatusBar.setStyle({ style: 'DARK' });
      StatusBar.setBackgroundColor && StatusBar.setBackgroundColor({ color: '#0A0B0F' });
    }
  } catch (e) {}

  /* ---------- small message with a "Share" button ---------- */
  var snackT = 0;
  function snack(text, sub, actionText, action) {
    var old = document.querySelector('.tfa-snack'); if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'tfa-snack';
    d.innerHTML = '<span></span>' + (actionText ? '<button type="button"></button>' : '');
    d.firstChild.textContent = text;
    if (sub) { var s = document.createElement('small'); s.textContent = sub; d.firstChild.appendChild(s); }
    if (actionText) {
      var b = d.querySelector('button'); b.textContent = actionText;
      b.onclick = function () { d.remove(); action(); };
    }
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('show'); });
    clearTimeout(snackT);
    snackT = setTimeout(function () { d.classList.remove('show'); setTimeout(function () { d.remove(); }, 300); }, 6000);
  }
  function say(msg) {
    try { if (typeof window.toast === 'function') { window.toast(msg, 'info'); return; } } catch (e) {}
    snack(msg);
  }

  /* ---------- files ---------- */
  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  function cleanName(n) { return String(n || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120); }
  async function toCache(blob, name) {
    var r = await FS.writeFile({ path: 'share/' + cleanName(name), data: await blobToB64(blob), directory: 'CACHE', recursive: true });
    return r.uri;
  }
  async function shareBlob(blob, name) {
    try { await Share.share({ title: name, files: [await toCache(blob, name)], dialogTitle: 'শেয়ার করুন' }); }
    catch (e) { if (!/cancel/i.test(String(e && e.message))) say('শেয়ার করা যায়নি'); }
  }

  /* Share (replaces the browser's navigator.share) */
  async function nativeShare(data) {
    data = data || {};
    var files = [];
    for (var i = 0; i < (data.files || []).length; i++) files.push(await toCache(data.files[i], data.files[i].name || ('file' + i)));
    var opts = { dialogTitle: 'শেয়ার করুন' };
    if (data.title) opts.title = data.title;
    if (data.text) opts.text = data.text;
    if (data.url) opts.url = data.url;
    if (files.length) opts.files = files;
    try { await Share.share(opts); }
    catch (e) {
      if (/cancel/i.test(String((e && e.message) || e))) throw new DOMException('Share canceled', 'AbortError');
      throw e;
    }
  }
  try {
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, writable: true, value: nativeShare });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, writable: true, value: function (d) { return !!d; } });
  } catch (e) {}

  /* Save songs into the phone's Music folder (replaces <a download>) */
  var permAsked = false;
  async function saveBlob(blob, name) {
    name = cleanName(name);
    var audio = /^audio\//.test(blob.type) || /\.(wav|mp3|m4a|aac|ogg|opus|webm|flac)$/i.test(name);
    var path = (audio ? 'Music/' : 'Download/') + FOLDER + '/' + name;
    try {
      if (!permAsked && FS.requestPermissions) { permAsked = true; try { await FS.requestPermissions(); } catch (e) {} }
      await FS.writeFile({ path: path, data: await blobToB64(blob), directory: 'EXTERNAL_STORAGE', recursive: true });
      var mb = (blob.size / 1048576).toFixed(1);
      snack('সেভ হয়েছে ✓', path + ' • ' + mb + ' MB', 'শেয়ার', function () { shareBlob(blob, name); });
    } catch (e) {
      // the phone did not allow saving there — open the share sheet instead (Files, Drive, WhatsApp…)
      shareBlob(blob, name);
    }
  }
  async function handleDownload(a) {
    try { await saveBlob(await (await fetch(a.href)).blob(), a.getAttribute('download') || 'file'); }
    catch (e) { say('সেভ করা যায়নি'); }
  }
  function isFileLink(a) { return a && a.hasAttribute && a.hasAttribute('download') && /^(blob:|data:)/.test(a.href || ''); }
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (isFileLink(this)) { handleDownload(this); return; }
    return origClick.apply(this, arguments);
  };
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[download]');
    if (isFileLink(a)) { ev.preventDefault(); handleDownload(a); }
  }, true);

  /* No service worker inside the app (all files are already on the phone) */
  try {
    if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return Promise.resolve({ unregister: function () { return Promise.resolve(true); } }); };
  } catch (e) {}

  /* ---------- phone Back button ---------- */
  var lastBack = 0, dialogOpen = false;
  function visible(id) { var el = $(id); return el && !el.classList.contains('hidden'); }
  if (App && App.addListener) {
    App.addListener('backButton', function () {
      if (dialogOpen) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return; }
      if (visible('sheet')) { $('sheetBg').click(); return; }
      var on = document.querySelector('.tabbar button.on');
      if (on && on.dataset.go !== 'rec') { document.querySelector('.tabbar button[data-go="rec"]').click(); return; }
      var now = Date.now();
      if (now - lastBack < 2000) { App.minimizeApp ? App.minimizeApp() : App.exitApp(); return; }
      lastBack = now;
      say('অ্যাপ থেকে বের হতে আবার Back চাপুন');
    });
  }

  /* ---------- "New update available" ---------- */
  var REPO = 'taiful666/tfmusic';
  var APK_URL = 'https://github.com/' + REPO + '/releases/download/android-latest/TF-Music.apk';
  var myBuild = 0, skipped = 0, lastCheck = 0;
  function showUpdate(newBuild) {
    if (dialogOpen || !document.body) return;
    dialogOpen = true;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.66);z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;font-family:"Hind Siliguri",sans-serif';
    wrap.innerHTML =
      '<div style="background:#13141A;color:#F4F5F7;border-radius:26px 26px 0 0;width:100%;max-width:520px;padding:26px 20px calc(20px + env(safe-area-inset-bottom));text-align:center">' +
        '<img src="logo-mark.png" alt="" style="width:56px;height:56px;border-radius:16px">' +
        '<div style="font-size:19px;font-weight:700;margin:12px 0 6px">নতুন আপডেট এসেছে</div>' +
        '<div style="font-size:14px;line-height:1.65;color:#9298A4">TF Music ভার্সন <b style="color:#F4F5F7">1.0.' + newBuild + '</b> (আপনার ফোনে 1.0.' + myBuild + ')<br>' +
        'ফাইল ডাউনলোড হলে খুলে <b style="color:#F4F5F7">Update</b> চাপুন।</div>' +
        '<button data-a="go" style="margin-top:18px;width:100%;border:0;border-radius:14px;background:#8B7CFF;color:#fff;font:600 16px \'Hind Siliguri\',sans-serif;height:50px">আপডেট করুন</button>' +
        '<button data-a="later" style="margin-top:8px;width:100%;border:0;border-radius:14px;background:#1B1C23;color:#F4F5F7;font:500 15px \'Hind Siliguri\',sans-serif;height:46px">পরে</button>' +
      '</div>';
    function close() { dialogOpen = false; wrap.remove(); document.removeEventListener('keydown', onKey, true); }
    function onKey(e) { if (e.key === 'Escape') { skipped = newBuild; close(); e.stopImmediatePropagation(); } }
    wrap.addEventListener('click', function (e) {
      var a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'go') { close(); say('ডাউনলোড শুরু হচ্ছে…'); window.location.href = APK_URL; }
      else if (a === 'later' || e.target === wrap) { skipped = newBuild; close(); }
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(wrap);
  }
  async function checkUpdate() {
    var now = Date.now();
    if (now - lastCheck < 10 * 60 * 1000) return;
    lastCheck = now;
    try {
      if (!myBuild && App && App.getInfo) myBuild = parseInt((await App.getInfo()).build, 10) || 0;
      if (!myBuild) return;
      var r = await fetch('https://api.github.com/repos/' + REPO + '/releases/tags/android-latest', { cache: 'no-store' });
      if (!r.ok) return;
      var rel = await r.json();
      var m = /build\s+(\d+)/i.exec(String(rel.name || ''));
      var latest = m ? parseInt(m[1], 10) : 0;
      var hasApk = (rel.assets || []).some(function (x) { return /\.apk$/i.test(x.name || ''); });
      if (hasApk && latest > myBuild && latest !== skipped) showUpdate(latest);
    } catch (e) { /* offline — try again later */ }
  }

  function start() {
    decorate();
    setTimeout(checkUpdate, 4000);
    if (App && App.addListener) App.addListener('resume', function () { setTimeout(checkUpdate, 1500); });
  }
  // run after the page's own script has built everything
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
