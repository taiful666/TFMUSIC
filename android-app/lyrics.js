/* TF Music — Lyrics (karaoke) screen. Android app only.
   • Paste the song's words once; they are kept on the phone (a small song list).
   • "মিউজিকের সাথে": the words move with the music. If you have set the timing
     (tap once at the start of each line while the music plays), the current line
     lights up exactly on time; otherwise the words move evenly over the song's length.
   • "নিজের গতিতে": the words roll up at a speed you choose (good for live singing
     without a music file). Starts by itself with ▶, record or live.
   • Your finger can always scroll; auto-scroll waits a moment and carries on.
   • Full screen (stage) mode: only the words and the play/record/live bar. */
(function () {
  'use strict';
  if (!window.TF_APP) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tfm_lyrics_v1';
  var D = load();
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.songs) return d; } catch (e) {}
    return { songs: [], cur: null, font: 24, speed: 6, mode: 'music' };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  function song() { return D.songs.find(function (s) { return s.id === D.cur; }) || null; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function say(m, t) { try { toast(m, t || 'info'); } catch (e) {} }
  function bn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }
  function pos() { try { return curPos(); } catch (e) { return 0; } }
  function playing() { try { return !!S.playing; } catch (e) { return false; } }
  function live() { try { return !!S.lm; } catch (e) { return false; } }

  /* words like "[01:23.45] line" (LRC files) carry their own timing */
  function parse(text) {
    var lines = [], times = [], hasT = false;
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (raw) {
      if (/^\s*\[(ar|ti|al|by|offset|length|re|ve):/i.test(raw)) return;
      var t = null, m, s = raw;
      while ((m = /^\s*\[(\d{1,2}):(\d{1,2}(?:[.:]\d{1,3})?)\]/.exec(s))) {
        if (t == null) t = parseInt(m[1], 10) * 60 + parseFloat(m[2].replace(':', '.'));
        s = s.slice(m[0].length);
      }
      lines.push(s.trim());
      if (s.trim()) { times.push(t); if (t != null) hasT = true; }
    });
    return { lines: lines, times: hasT ? times : null };
  }

  /* ---------- screen ---------- */
  var ICON = {
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h7"/><path d="M17 14v6m-3-3h6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    tap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
  };
  var sec = document.createElement('section');
  sec.className = 'card'; sec.dataset.tab = 'lyr'; sec.id = 'lyrCard';
  sec.innerHTML =
    '<div class="lyr-top">' +
      '<button class="lyr-song" id="lyrSong" type="button"><span id="lyrTitle">লিরিক্স</span><i>▾</i></button>' +
      '<span class="lyr-live" id="lyrLive">● লাইভ</span>' +
      '<button class="btn icon" id="lyrEdit" type="button" title="লিখুন / বদলান">' + ICON.edit + '</button>' +
      '<button class="btn icon" id="lyrFull" type="button" title="পূর্ণ পর্দা">' + ICON.full + '</button>' +
    '</div>' +
    '<div class="seg lyr-mode" id="lyrMode"><button data-m="music" type="button">মিউজিকের সাথে</button><button data-m="auto" type="button">নিজের গতিতে</button></div>' +
    '<div class="lyr-view" id="lyrView"><div class="lyr-lines" id="lyrLines"></div></div>' +
    '<div class="lyr-empty hidden" id="lyrEmpty"><b>গানের লিরিক্স দিন</b><span>যে গান গাইবেন তার কথাগুলো একবার পেস্ট করুন — ফোনে জমা থাকবে। গাওয়ার সময় কথাগুলো মিউজিকের সাথে নিজে থেকে ওপরে উঠবে।</span><button class="btn primary" id="lyrAdd" type="button">+ লিরিক্স যোগ করুন</button></div>' +
    '<div class="lyr-bar" id="lyrBar">' +
      '<div class="lyr-grp"><button type="button" id="lyrFm" aria-label="ছোট লেখা">A−</button><button type="button" id="lyrFp" aria-label="বড় লেখা">A+</button></div>' +
      '<div class="lyr-grp lyr-spd" id="lyrSpdG"><button type="button" id="lyrSm">−</button><span id="lyrSpd">গতি ৬</span><button type="button" id="lyrSp">+</button></div>' +
      '<button class="lyr-run" id="lyrRun" type="button">▶ স্ক্রল</button>' +
      '<button class="lyr-sync" id="lyrSync" type="button">' + ICON.tap + '<span>টাইমিং</span></button>' +
    '</div>' +
    '<div class="lyr-tapbar hidden" id="lyrTapBar">' +
      '<button class="btn" id="lyrTapUndo" type="button">↶ আগের</button>' +
      '<button class="btn primary lyr-tap" id="lyrTap" type="button">এই লাইন শুরু</button>' +
      '<button class="btn" id="lyrTapDone" type="button">শেষ</button>' +
    '</div>' +
    '<button class="lyr-exit hidden" id="lyrExit" type="button" aria-label="পূর্ণ পর্দা বন্ধ">' + ICON.close + '</button>';
  var anchor = document.querySelector('[data-tab="mix"]');
  anchor.parentNode.insertBefore(sec, anchor);

  // tab button (second place, after Record)
  var tb = document.createElement('button');
  tb.dataset.go = 'lyr';
  tb.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h11M4 10.5h11M4 15h6"/><path d="M19 4v11.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg></i><span>লিরিক্স</span>';
  var recBtn = document.querySelector('.tabbar button[data-go="rec"]');
  recBtn.parentNode.insertBefore(tb, recBtn.nextSibling);
  tb.addEventListener('click', function () { goTab('lyr'); });

  // modal (song list + editor)
  var modal = document.createElement('div');
  modal.className = 'lyr-modal hidden'; modal.id = 'lyrModal';
  modal.innerHTML = '<div class="lyr-sheet" id="lyrSheet"></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  var view = $('lyrView'), box = $('lyrLines');
  var lineEls = [], times = null, focusY = 0.36;

  function render() {
    var s = song();
    $('lyrTitle').textContent = s ? (s.title || 'নাম ছাড়া গান') : 'লিরিক্স';
    $('lyrEmpty').classList.toggle('hidden', !!s);
    view.classList.toggle('hidden', !s);
    $('lyrBar').classList.toggle('hidden', !s);
    $('lyrMode').classList.toggle('hidden', !s);
    box.innerHTML = '';
    lineEls = [];
    if (!s) return;
    var p = parse(s.text), k = 0;
    times = (s.times && s.times.length) ? s.times.slice() : (p.times ? p.times.slice() : null);
    p.lines.forEach(function (t) {
      var d = document.createElement('div');
      if (!t) { d.className = 'lyr-gap'; box.appendChild(d); return; }
      d.className = 'lyr-l'; d.dataset.i = k++; d.textContent = t;
      box.appendChild(d); lineEls.push(d);
    });
    if (times && times.length !== lineEls.length) times = times.slice(0, lineEls.length);
    applyFont(); updBar();
    cur = -1; setCur(0);
    requestAnimationFrame(function () { view.scrollTop = toFocus(lineTop(0)); fpos = view.scrollTop; });
  }
  function applyFont() { sec.style.setProperty('--lf', D.font + 'px'); }
  function timed() { return times && times.filter(function (t) { return t != null; }).length >= 2; }
  function updBar() {
    document.querySelectorAll('#lyrMode button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === D.mode); });
    $('lyrSpdG').classList.toggle('hidden', D.mode !== 'auto');
    $('lyrRun').classList.toggle('hidden', D.mode !== 'auto');
    $('lyrSync').classList.toggle('hidden', D.mode !== 'music');
    $('lyrSync').classList.toggle('on', !!timed());
    $('lyrSync').querySelector('span').textContent = timed() ? 'টাইমিং ✓' : 'টাইমিং';
    $('lyrSpd').textContent = 'গতি ' + bn(D.speed);
    $('lyrRun').textContent = run ? '❚❚ থামুন' : '▶ স্ক্রল';
    $('lyrRun').classList.toggle('on', run);
  }

  /* ---------- scrolling ---------- */
  var cur = -1, fpos = 0, run = false, hold = 0, touching = false, lastT = 0, raf = 0, shown = false, wake = null;
  function lineTop(i) { var el = lineEls[Math.max(0, Math.min(lineEls.length - 1, i))]; return el ? el.offsetTop + el.offsetHeight / 2 : 0; }
  function maxScroll() { return Math.max(0, view.scrollHeight - view.clientHeight); }
  function toFocus(y) { return y - view.clientHeight * focusY; }
  function setCur(i) {
    if (i === cur || !lineEls.length) return;
    cur = i;
    for (var k = 0; k < lineEls.length; k++) {
      var c = lineEls[k].classList;
      c.toggle('cur', k === i); c.toggle('past', k < i); c.toggle('next', k === i + 1);
    }
  }
  function nearestToFocus() {
    var y = view.scrollTop + view.clientHeight * focusY, best = 0, bd = 1e9;
    for (var k = 0; k < lineEls.length; k++) {
      var d = Math.abs(lineEls[k].offsetTop + lineEls[k].offsetHeight / 2 - y);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }
  function musicLen() { try { return contentEnd(['music']) || contentEnd() || 0; } catch (e) { return 0; } }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0; lastT = now;
    if (!shown || !lineEls.length) return;
    var free = touching || now < hold;
    if (free) { fpos = view.scrollTop; setCur(nearestToFocus()); return; }
    var target = null;
    if (D.mode === 'music') {
      if (tapMode) { target = toFocus(lineTop(tapNext)); setCur(tapNext); }
      else if (timed()) {
        if (!playing() && !recOn()) { setCur(nearestToFocus()); fpos = view.scrollTop; return; }
        var p = pos(), i = -1;
        for (var k = 0; k < times.length; k++) if (times[k] != null && times[k] <= p + 0.15) i = k;
        if (i < 0) { target = toFocus(lineTop(0)); setCur(-2); }
        else {
          var j = i + 1; while (j < times.length && times[j] == null) j++;
          var y0 = lineTop(i), y1 = j < times.length ? lineTop(j) : y0, t0 = times[i], t1 = j < times.length ? times[j] : t0 + 4;
          var f = Math.max(0, Math.min(1, (p - t0) / Math.max(0.3, t1 - t0)));
          target = toFocus(y0 + (y1 - y0) * f * 0.85);
          setCur(i);
        }
      } else {
        if (!playing()) { setCur(nearestToFocus()); fpos = view.scrollTop; return; }
        var L = musicLen();
        if (L > 1) {
          var fr = Math.max(0, Math.min(1, pos() / L));
          target = toFocus(lineTop(0) + (lineTop(lineEls.length - 1) - lineTop(0)) * fr);
        }
        setCur(nearestToFocus());
      }
    } else {
      var go = run || playing() || live();
      if (go) {
        var lh = (lineEls[1] ? lineEls[1].offsetTop - lineEls[0].offsetTop : D.font * 1.6);
        fpos += dt * lh * D.speed / 12;          // speed 6 ≈ one line every 2 seconds
        target = fpos;
      } else fpos = view.scrollTop;
      setCur(nearestToFocus());
    }
    if (target != null) {
      target = Math.max(0, Math.min(maxScroll(), target));
      if (D.mode === 'auto') { fpos = target; view.scrollTop = target; }
      else {
        var cy = view.scrollTop, d = target - cy;
        var ny = Math.abs(d) > view.clientHeight ? target : cy + d * Math.min(1, dt * 6);
        view.scrollTop = ny; fpos = ny;
      }
    }
  }
  function recOn() { try { return !!S.rec; } catch (e) { return false; } }
  view.addEventListener('touchstart', function () { touching = true; }, { passive: true });
  view.addEventListener('touchend', function () { touching = false; hold = performance.now() + 2500; }, { passive: true });
  view.addEventListener('touchcancel', function () { touching = false; hold = performance.now() + 2500; }, { passive: true });
  view.addEventListener('wheel', function () { hold = performance.now() + 2500; }, { passive: true });

  // tap a line: jump the music there (if timed) or bring it to the reading place
  var downY = 0;
  box.addEventListener('pointerdown', function (e) { downY = e.clientY; });
  box.addEventListener('click', function (e) {
    if (Math.abs(e.clientY - downY) > 8 || tapMode) return;
    var el = e.target.closest('.lyr-l'); if (!el) return;
    var i = +el.dataset.i;
    if (D.mode === 'music' && timed() && times[i] != null) {
      try { seekTo(Math.max(0, times[i] - 0.4)); } catch (x) {}
      hold = 0;
    } else {
      view.scrollTo({ top: toFocus(lineTop(i)), behavior: 'smooth' });
      hold = performance.now() + 1200; fpos = toFocus(lineTop(i));
    }
  });

  /* ---------- timing by tapping ---------- */
  var tapMode = false, tapNext = 0, tapTimes = [];
  function startTap() {
    if (!lineEls.length) return;
    tapMode = true; tapNext = 0; tapTimes = [];
    lineEls.forEach(function (el) { el.classList.remove('done'); });
    $('lyrTapBar').classList.remove('hidden'); $('lyrBar').classList.add('hidden');
    sec.classList.add('tapping');
    say('▶ চেপে মিউজিক চালান। প্রতিটা লাইন গাওয়া শুরুর মুহূর্তে "এই লাইন শুরু" চাপুন।', 'info');
  }
  function tap() {
    if (!playing()) { say('আগে ▶ চেপে মিউজিক চালান', 'error'); return; }
    if (tapNext >= lineEls.length) return;
    tapTimes[tapNext] = Math.round(pos() * 100) / 100;
    lineEls[tapNext].classList.add('done');
    tapNext++;
    if (tapNext >= lineEls.length) finishTap();
  }
  function undoTap() {
    if (!tapNext) return;
    tapNext--; tapTimes.length = tapNext; lineEls[tapNext].classList.remove('done');
    try { seekTo(Math.max(0, (tapTimes[tapNext - 1] || 0) - 0.5)); } catch (e) {}
  }
  function finishTap() {
    tapMode = false;
    $('lyrTapBar').classList.add('hidden'); $('lyrBar').classList.remove('hidden');
    sec.classList.remove('tapping');
    lineEls.forEach(function (el) { el.classList.remove('done'); });
    var s = song();
    if (s && tapTimes.length >= 2) {
      while (tapTimes.length < lineEls.length) tapTimes.push(null);
      s.times = tapTimes.slice(); times = s.times.slice(); save();
      say('✓ টাইমিং সেভ হয়েছে — এখন লাইনগুলো ঠিক সময়ে জ্বলবে', 'success');
    } else say('টাইমিং সেভ হয়নি (কমপক্ষে ২টা লাইনে চাপ দিন)', 'info');
    updBar();
  }
  $('lyrSync').onclick = function () {
    if (timed()) {
      openSheet('<h3>টাইমিং</h3><p class="lyr-p">এই গানের লাইনগুলোর সময় সেট করা আছে।</p>' +
        '<button class="btn primary w100" data-a="redo" type="button">নতুন করে টাইমিং সেট করুন</button>' +
        '<button class="btn danger w100" data-a="clear" type="button">টাইমিং মুছুন (সমান গতিতে চলবে)</button>' +
        '<button class="btn w100" data-a="x" type="button">বন্ধ</button>', function (a) {
          if (a === 'redo') { closeModal(); startTap(); }
          else if (a === 'clear') { var s = song(); s.times = null; save(); closeModal(); render(); say('টাইমিং মুছে গেছে', 'info'); }
          else closeModal();
        });
    } else startTap();
  };
  $('lyrTap').onclick = tap;
  $('lyrTapUndo').onclick = undoTap;
  $('lyrTapDone').onclick = finishTap;

  /* ---------- bar ---------- */
  document.querySelectorAll('#lyrMode button').forEach(function (b) {
    b.onclick = function () { D.mode = b.dataset.m; save(); run = false; hold = 0; fpos = view.scrollTop; updBar(); };
  });
  $('lyrFm').onclick = function () { D.font = Math.max(16, D.font - 2); save(); keepLine(applyFont); };
  $('lyrFp').onclick = function () { D.font = Math.min(44, D.font + 2); save(); keepLine(applyFont); };
  $('lyrSm').onclick = function () { D.speed = Math.max(1, D.speed - 1); save(); updBar(); };
  $('lyrSp').onclick = function () { D.speed = Math.min(20, D.speed + 1); save(); updBar(); };
  $('lyrRun').onclick = function () { run = !run; hold = 0; fpos = view.scrollTop; updBar(); };
  function keepLine(fn) {
    var i = Math.max(0, cur); fn();
    requestAnimationFrame(function () { view.scrollTop = toFocus(lineTop(i)); fpos = view.scrollTop; });
  }

  /* ---------- full screen (stage) ---------- */
  function stage(on) {
    document.documentElement.classList.toggle('lyr-stage', on);
    $('lyrExit').classList.toggle('hidden', !on);
    requestAnimationFrame(function () { keepLine(function () {}); });
  }
  $('lyrFull').onclick = function () { stage(true); };
  $('lyrExit').onclick = function () { stage(false); };

  /* ---------- song list & editor ---------- */
  var sheetCb = null;
  function openSheet(html, cb) {
    $('lyrSheet').innerHTML = '<div class="sheet-grip"></div>' + html;
    sheetCb = cb; modal.classList.remove('hidden');
  }
  function closeModal() { modal.classList.add('hidden'); sheetCb = null; }
  modal.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (b && sheetCb) sheetCb(b.dataset.a, b);
  });
  function openList() {
    var items = D.songs.map(function (s) {
      return '<button class="lyr-item' + (s.id === D.cur ? ' on' : '') + '" data-a="pick" data-id="' + s.id + '" type="button"><b>' + esc(s.title || 'নাম ছাড়া গান') + '</b><small>' +
        bn(parse(s.text).lines.filter(Boolean).length) + ' লাইন' + (s.times && s.times.length ? ' • টাইমিং ✓' : '') + '</small></button>';
    }).join('');
    openSheet('<h3>আমার গান</h3>' + (items || '<p class="lyr-p">এখনো কোনো গান নেই।</p>') +
      '<button class="btn primary w100" data-a="new" type="button">+ নতুন গানের লিরিক্স</button>', function (a, b) {
        if (a === 'pick') { D.cur = b.dataset.id; save(); closeModal(); render(); }
        else if (a === 'new') openEditor(null);
      });
  }
  function openEditor(s) {
    openSheet('<h3>' + (s ? 'লিরিক্স বদলান' : 'নতুন গান') + '</h3>' +
      '<input class="lyr-in" id="lyrInT" placeholder="গানের নাম" maxlength="80">' +
      '<textarea class="lyr-in lyr-ta" id="lyrInX" placeholder="এখানে গানের কথা পেস্ট করুন — প্রতিটা লাইন আলাদা লাইনে। অন্তরার মাঝে একটা ফাঁকা লাইন দিতে পারেন।"></textarea>' +
      '<div class="lyr-row"><button class="btn" data-a="paste" type="button">ক্লিপবোর্ড থেকে পেস্ট</button><button class="btn primary" data-a="save" type="button">সেভ</button></div>' +
      (s ? '<button class="btn danger w100" data-a="del" type="button">এই গান মুছুন</button>' : '') +
      '<button class="btn w100" data-a="x" type="button">বাতিল</button>', async function (a) {
        if (a === 'paste') {
          try { var t = await navigator.clipboard.readText(); if (t) $('lyrInX').value = t; else say('ক্লিপবোর্ড খালি', 'info'); }
          catch (e) { say('লেখার জায়গায় আঙুল চেপে ধরে "Paste" চাপুন', 'info'); $('lyrInX').focus(); }
        } else if (a === 'save') {
          var title = $('lyrInT').value.trim(), text = $('lyrInX').value;
          if (!text.trim()) { say('লিরিক্স লিখুন বা পেস্ট করুন', 'error'); return; }
          if (s) { if (s.text !== text) s.times = null; s.title = title; s.text = text; }
          else { s = { id: 's' + Date.now(), title: title, text: text, times: null }; D.songs.unshift(s); }
          D.cur = s.id; save(); closeModal(); render();
          say(parse(text).times ? '✓ সেভ হয়েছে — ফাইলের টাইমিংও পাওয়া গেছে' : '✓ লিরিক্স সেভ হয়েছে', 'success');
        } else if (a === 'del') {
          D.songs = D.songs.filter(function (x) { return x.id !== s.id; });
          D.cur = D.songs[0] ? D.songs[0].id : null; save(); closeModal(); render();
        } else closeModal();
      });
    if (s) { $('lyrInT').value = s.title || ''; $('lyrInX').value = s.text || ''; }
  }
  $('lyrSong').onclick = openList;
  $('lyrEdit').onclick = function () { song() ? openEditor(song()) : openEditor(null); };
  $('lyrAdd').onclick = function () { openEditor(null); };

  /* ---------- live badge ---------- */
  setInterval(function () { $('lyrLive').classList.toggle('on', live()); }, 500);
  $('lyrLive').onclick = function () { try { toggleLive(); } catch (e) {} };

  /* ---------- show / hide with the tab ---------- */
  var origGo = goTab;
  goTab = function (t, silent) {
    origGo(t, silent);
    var on = t === 'lyr';
    document.documentElement.classList.toggle('lyr-on', on);
    if (!on && document.documentElement.classList.contains('lyr-stage')) stage(false);
    if (on && !shown) {
      shown = true; lastT = 0; hold = 0;
      if (view.scrollTop < 2 && lineEls.length) view.scrollTop = toFocus(lineTop(0));
      fpos = view.scrollTop;
      if (!raf) raf = requestAnimationFrame(frame);
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {}); } catch (e) {}
    } else if (!on && shown) {
      shown = false; run = false; updBar();
      if (tapMode) finishTap();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      try { wake && wake.release(); } catch (e) {} wake = null;
    }
  };
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && shown && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
  });

  // phone Back button: close the editor / full screen first
  window.TF_BACK = function () {
    if (!modal.classList.contains('hidden')) { closeModal(); return true; }
    if (tapMode) { finishTap(); return true; }
    if (document.documentElement.classList.contains('lyr-stage')) { stage(false); return true; }
    return false;
  };

  render();
})();
