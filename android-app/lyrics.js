/* TF Music — "গান" (sing) screen. Android app only. This is the app's start screen.
   Inspired by karaoke apps: clean lyrics in the middle, a music progress bar and a
   recording bar at the bottom, one big Record / Live button with play-pause next to it.
   • Lyrics are pasted once and kept on the phone (a small song list).
   • "মিউজিকের সাথে": the words move with the music. If the timing is set (tap once at
     the start of each line while the music plays), the current line lights up on time;
     otherwise the words move evenly over the length of the music.
   • "নিজের গতিতে": the words roll up at a chosen speed (for live singing without music).
   • A finger can always scroll; auto-scroll waits a moment and then carries on. */
(function () {
  'use strict';
  if (!window.TF_APP) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tfm_lyrics_v1';
  var D = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    d = d && d.songs ? d : { songs: [], cur: null };
    if (!d.font) d.font = 25; if (!d.speed) d.speed = 6; if (!d.mode) d.mode = 'music'; if (!d.kind) d.kind = 'rec';
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  function song() { return D.songs.find(function (s) { return s.id === D.cur; }) || null; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function say(m, t) { try { toast(m, t || 'info'); } catch (e) {} }
  function bn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }
  function mmss(s) { s = Math.max(0, s || 0); var m = Math.floor(s / 60), x = Math.floor(s % 60); return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }
  function pos() { try { return curPos(); } catch (e) { return 0; } }
  function playing() { try { return !!S.playing; } catch (e) { return false; } }
  function live() { try { return !!S.lm; } catch (e) { return false; } }
  function recOn() { try { return !!S.rec; } catch (e) { return false; } }
  function musicLen() { try { return contentEnd(['music']) || 0; } catch (e) { return 0; } }

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

  /* ---------- icons ---------- */
  function ic(p, fill) { return '<svg viewBox="0 0 24 24" fill="' + (fill ? 'currentColor' : 'none') + '" stroke="' + (fill ? 'none' : 'currentColor') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
  var ICON = {
    note: ic('<circle cx="12" cy="12" r="9"/><path d="M13 7.5v6.2"/><circle cx="11" cy="14.5" r="2"/><path d="M13 7.5c1 .9 2.2 1.4 3.4 1.5"/>'),
    edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    full: ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    timing: ic('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.6M10 2.5h4"/>'),
    music: ic('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
    roll: ic('<path d="M12 20V5M6.5 10.5 12 5l5.5 5.5"/><path d="M5 20h14"/>'),
    home: ic('<path d="M6 5v14"/><path d="M18 6.2v11.6a.8.8 0 0 1-1.25.66L9 13a1.2 1.2 0 0 1 0-2l7.75-5.46A.8.8 0 0 1 18 6.2z" fill="currentColor" stroke="none"/>'),
    play: ic('<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/>', true),
    pause: ic('<rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/>', true),
    mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
    live: ic('<path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>')
  };

  /* ---------- screen ---------- */
  var sec = document.createElement('section');
  sec.className = 'card'; sec.dataset.tab = 'lyr'; sec.id = 'lyrCard';
  sec.innerHTML =
    '<div class="ly-head">' +
      '<button class="ly-title" id="lyrSong" type="button">' + ICON.note + '<span id="lyrTitle">গান বাছুন</span><i>▾</i></button>' +
      '<button class="ly-ibtn" id="lyrEdit" type="button" aria-label="লিরিক্স লিখুন / বদলান">' + ICON.edit + '</button>' +
    '</div>' +
    '<div class="ly-stage">' +
      '<div class="lyr-view" id="lyrView"><div class="lyr-lines" id="lyrLines"></div></div>' +
      '<div class="lyr-empty hidden" id="lyrEmpty"><b>গানের লিরিক্স দিন</b><span>যে গান গাইবেন তার কথাগুলো একবার পেস্ট করুন — ফোনে জমা থাকবে, গাওয়ার সময় মিউজিকের সাথে নিজে থেকে ওপরে উঠবে।</span><button class="ly-pill" id="lyrAdd" type="button">+ লিরিক্স যোগ করুন</button></div>' +
      '<div class="ly-left"><button type="button" id="lyrFp" aria-label="বড় লেখা">+</button><button type="button" id="lyrFm" aria-label="ছোট লেখা">−</button></div>' +
      '<div class="ly-right">' +
        '<button class="ly-tool" id="lyrModeB" type="button"><i id="lyrModeI"></i><small id="lyrModeL"></small></button>' +
        '<div class="ly-spd" id="lyrSpdG"><button type="button" id="lyrSp">+</button><small id="lyrSpd"></small><button type="button" id="lyrSm">−</button></div>' +
        '<button class="ly-tool" id="lyrSync" type="button">' + ICON.timing + '<small>টাইমিং</small></button>' +
        '<button class="ly-tool" id="lyrFull" type="button">' + ICON.full + '<small>পূর্ণ পর্দা</small></button>' +
      '</div>' +
    '</div>' +
    '<div class="ly-bottom" id="lyBottom">' +
      '<div class="ly-row" id="lyMusicRow"><span class="ly-lbl">মিউজিক</span><div class="ly-bar" id="lyMusicBar"><i class="ly-fill" id="lyMusicFill"></i><b class="ly-knob" id="lyMusicKnob"></b></div><span class="ly-time mono" id="lyMusicT">00:00</span></div>' +
      '<button class="ly-addm hidden" id="lyAddMusic" type="button">' + ICON.music + 'মিউজিক / কারাওকে ফাইল যোগ করুন</button>' +
      '<div class="ly-row"><span class="ly-lbl rec">রেকর্ড</span><div class="ly-bar rec" id="lyRecBar"><div id="lyRecSegs"></div><i class="ly-recnow" id="lyRecNow"></i></div><span class="ly-time mono" id="lyRecT">00:00</span></div>' +
      '<div class="ly-kind" id="lyKind"><button data-k="rec" type="button">' + ICON.mic + '</button><button data-k="live" type="button">' + ICON.live + '</button></div>' +
      '<div class="ly-ctrl" id="lyCtrl">' +
        '<button class="ly-round" id="lyHome" type="button" aria-label="শুরুতে">' + ICON.home + '</button>' +
        '<button class="ly-big" id="lyBig" type="button"><span id="lyBigT">রেকর্ড শুরু</span></button>' +
        '<button class="ly-round" id="lyPlay" type="button" aria-label="প্লে / পজ">' + ICON.play + '</button>' +
      '</div>' +
      '<div class="ly-ctrl ly-tapbar hidden" id="lyrTapBar">' +
        '<button class="ly-round wide" id="lyrTapUndo" type="button">আগের</button>' +
        '<button class="ly-big" id="lyrTap" type="button">এই লাইন শুরু</button>' +
        '<button class="ly-round wide" id="lyrTapDone" type="button">শেষ</button>' +
      '</div>' +
    '</div>' +
    '<button class="lyr-exit hidden" id="lyrExit" type="button" aria-label="পূর্ণ পর্দা বন্ধ">' + ICON.close + '</button>';
  var anchor = document.querySelector('[data-tab="rec"]');
  anchor.parentNode.insertBefore(sec, anchor);

  // "গান" tab first; the old Record tab becomes "ইনপুট" (mic, music file, live settings)
  var tb = document.createElement('button');
  tb.dataset.go = 'lyr';
  tb.innerHTML = '<i>' + ICON.mic.replace('</svg>', '<path d="M8.5 21h7"/></svg>') + '</i><span>গান</span>';
  var tabbar = document.querySelector('.tabbar'), recBtn = tabbar.querySelector('[data-go="rec"]');
  tabbar.insertBefore(tb, recBtn);
  tb.addEventListener('click', function () { goTab('lyr'); });
  recBtn.querySelector('span').textContent = 'ইনপুট';
  window.TF_HOME = 'lyr';
  var lastTabTap = 0;
  tabbar.addEventListener('click', function () { lastTabTap = Date.now(); }, true);

  // song list / editor sheet
  var modal = document.createElement('div');
  modal.className = 'lyr-modal hidden';
  modal.innerHTML = '<div class="lyr-sheet" id="lyrSheet"></div>';
  document.body.appendChild(modal);

  var view = $('lyrView'), box = $('lyrLines');
  var lineEls = [], times = null, focusY = 0.34;

  function render() {
    var s = song();
    $('lyrTitle').textContent = s ? (s.title || 'নাম ছাড়া গান') : (D.songs.length ? 'গান বাছুন' : 'লিরিক্স যোগ করুন');
    $('lyrEmpty').classList.toggle('hidden', !!s);
    view.classList.toggle('hidden', !s);
    box.innerHTML = ''; lineEls = [];
    times = null;
    if (s) {
      var p = parse(s.text), k = 0;
      times = (s.times && s.times.length) ? s.times.slice() : (p.times ? p.times.slice() : null);
      p.lines.forEach(function (t) {
        var d = document.createElement('div');
        if (!t) { d.className = 'lyr-gap'; box.appendChild(d); return; }
        d.className = 'lyr-l'; d.dataset.i = k++; d.textContent = t;
        box.appendChild(d); lineEls.push(d);
      });
      if (times && times.length > lineEls.length) times = times.slice(0, lineEls.length);
    }
    applyFont(); updTools();
    cur = -1; setCur(0);
    requestAnimationFrame(function () { if (lineEls.length) view.scrollTop = toFocus(lineTop(0)); fpos = view.scrollTop; });
  }
  function applyFont() { box.style.setProperty('--lf', D.font + 'px'); }
  function timed() { return !!(times && times.filter(function (t) { return t != null; }).length >= 2); }
  function updTools() {
    var auto = D.mode === 'auto';
    $('lyrModeI').innerHTML = auto ? ICON.roll : ICON.music;
    $('lyrModeL').textContent = auto ? 'নিজের গতি' : 'মিউজিকের সাথে';
    $('lyrSpdG').classList.toggle('hidden', !auto);
    $('lyrSync').classList.toggle('hidden', auto);
    $('lyrSync').classList.toggle('on', timed());
    $('lyrSync').querySelector('small').textContent = timed() ? 'টাইমিং ✓' : 'টাইমিং';
    $('lyrSpd').textContent = 'গতি ' + bn(D.speed);
    document.querySelectorAll('#lyKind button').forEach(function (b) { b.classList.toggle('on', b.dataset.k === D.kind); });
  }

  /* ---------- scrolling ---------- */
  var cur = -1, fpos = 0, hold = 0, touching = false, lastT = 0, raf = 0, shown = false, wake = null, segT = 0;
  function lineTop(i) { var el = lineEls[Math.max(0, Math.min(lineEls.length - 1, i))]; return el ? el.offsetTop + el.offsetHeight / 2 : 0; }
  function maxScroll() { return Math.max(0, view.scrollHeight - view.clientHeight); }
  function toFocus(y) { return y - view.clientHeight * focusY; }
  function setCur(i) {
    if (i === cur || !lineEls.length) return;
    cur = i;
    for (var k = 0; k < lineEls.length; k++) {
      var c = lineEls[k].classList;
      c.toggle('cur', k === i); c.toggle('past', i >= 0 && k < i);
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
  function scrollLyrics(now, dt) {
    if (!lineEls.length) return;
    if (touching || now < hold) { fpos = view.scrollTop; setCur(nearestToFocus()); return; }
    var target = null, moving = playing() || recOn();
    if (D.mode === 'music') {
      if (tapMode) { target = toFocus(lineTop(tapNext)); setCur(tapNext); }
      else if (timed()) {
        if (!moving) { setCur(nearestToFocus()); fpos = view.scrollTop; return; }
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
        if (!moving) { setCur(nearestToFocus()); fpos = view.scrollTop; return; }
        var L = musicLen() || 0;
        if (L > 1) target = toFocus(lineTop(0) + (lineTop(lineEls.length - 1) - lineTop(0)) * Math.max(0, Math.min(1, pos() / L)));
        setCur(nearestToFocus());
      }
    } else {
      if (moving || live()) {
        var lh = lineEls[1] ? lineEls[1].offsetTop - lineEls[0].offsetTop : D.font * 1.6;
        fpos += dt * lh * D.speed / 12;            // speed ৬ ≈ one line every 2 seconds
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

  /* ---------- bottom bars & buttons ---------- */
  function vocalClips() { try { return S.tracks.vocal || []; } catch (e) { return []; } }
  function updBars(now) {
    var L = musicLen(), p = pos(), R = null;
    try { R = S.rec; } catch (e) {}
    var hasMusic = L > 0.2;
    $('lyMusicRow').classList.toggle('hidden', !hasMusic);
    $('lyAddMusic').classList.toggle('hidden', hasMusic);
    var vEnd = 0; vocalClips().forEach(function (c) { vEnd = Math.max(vEnd, cEnd(c)); });
    var span = Math.max(L, vEnd, R ? p : 0, 1);
    if (hasMusic) {
      var f = Math.max(0, Math.min(1, p / L));
      $('lyMusicFill').style.width = (f * 100) + '%';
      $('lyMusicKnob').style.left = (f * 100) + '%';
      $('lyMusicT').textContent = mmss(Math.min(p, L)) + ' / ' + mmss(L);
    }
    // recording bar: takes already on the vocal track + the take being recorded now
    if (now - segT > 300) {
      segT = now;
      $('lyRecSegs').innerHTML = vocalClips().map(function (c) {
        return '<i style="left:' + (c.offset / span * 100) + '%;width:' + Math.max(0.6, dur(c) / span * 100) + '%"></i>';
      }).join('');
    }
    var nowEl = $('lyRecNow');
    if (R && p > R.punch) {
      nowEl.style.display = 'block';
      nowEl.style.left = (R.punch / span * 100) + '%';
      nowEl.style.width = ((p - R.punch) / span * 100) + '%';
      $('lyRecT').textContent = '● ' + mmss(p - R.punch);
    } else {
      nowEl.style.display = 'none';
      var tot = 0; vocalClips().forEach(function (c) { tot += dur(c); });
      $('lyRecT').textContent = mmss(tot);
    }
    $('lyRecT').classList.toggle('on', !!R);
    // buttons
    var big = $('lyBig'), on = D.kind === 'live' ? live() : !!R;
    big.classList.toggle('on', on);
    big.classList.toggle('live', D.kind === 'live');
    var txt = D.kind === 'live' ? (on ? 'লাইভ বন্ধ করুন' : 'লাইভ শুরু') : (R ? (p < R.punch ? 'প্রস্তুত হোন…' : 'থামান  ' + mmss(p - R.punch)) : 'রেকর্ড শুরু');
    if ($('lyBigT').textContent !== txt) $('lyBigT').textContent = txt;
    var pl = playing() && !R ? 'pause' : 'play';
    if ($('lyPlay').dataset.s !== pl) { $('lyPlay').dataset.s = pl; $('lyPlay').innerHTML = ICON[pl]; }
  }
  function seekFromBar(e) {
    if (recOn()) return;
    var r = $('lyMusicBar').getBoundingClientRect(), L = musicLen();
    if (!L) return;
    var f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    try { seekTo(f * L); } catch (x) {}
    hold = 0;
  }
  var barDrag = false;
  $('lyMusicBar').addEventListener('pointerdown', function (e) { barDrag = true; seekFromBar(e); });
  window.addEventListener('pointerup', function () { barDrag = false; });
  $('lyMusicBar').addEventListener('pointermove', function (e) { if (barDrag && !playing()) seekFromBar(e); });
  $('lyAddMusic').onclick = function () { $('fileMusic').click(); };

  var keepHere = 0;
  $('lyBig').onclick = function () {
    if (tapMode) return;
    keepHere = Date.now() + 4000;
    if (D.kind === 'live') { try { toggleLive(); } catch (e) {} return; }
    try { recOn() ? finishRec() : startRec(); } catch (e) {}
  };
  $('lyPlay').onclick = function () { keepHere = Date.now() + 4000; try { togglePlay(); } catch (e) {} };
  $('lyHome').onclick = function () { try { $('btnHome').click(); } catch (e) {} view.scrollTop = toFocus(lineTop(0)); fpos = view.scrollTop; hold = 0; };
  document.querySelectorAll('#lyKind button').forEach(function (b) {
    b.onclick = function () {
      if (recOn() || live()) { say('আগে চলমান রেকর্ড / লাইভ বন্ধ করুন', 'info'); return; }
      D.kind = b.dataset.k; save(); updTools();
      say(D.kind === 'live' ? '🎤 লাইভ: গলা ইফেক্টসহ স্পিকারে যাবে (মাইক বাছতে "ইনপুট" ট্যাব)' : '🎙 রেকর্ড: মিউজিকের সাথে গান রেকর্ড হবে', 'info');
    };
  });

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0; lastT = now;
    if (!shown) return;
    scrollLyrics(now, dt);
    updBars(now);
  }
  view.addEventListener('touchstart', function () { touching = true; }, { passive: true });
  view.addEventListener('touchend', function () { touching = false; hold = performance.now() + 2500; }, { passive: true });
  view.addEventListener('touchcancel', function () { touching = false; hold = performance.now() + 2500; }, { passive: true });
  view.addEventListener('wheel', function () { hold = performance.now() + 2500; }, { passive: true });

  // tap a line: jump the music there (if timed) or bring the line to the reading place
  var downY = 0;
  box.addEventListener('pointerdown', function (e) { downY = e.clientY; });
  box.addEventListener('click', function (e) {
    if (Math.abs(e.clientY - downY) > 8 || tapMode) return;
    var el = e.target.closest('.lyr-l'); if (!el) return;
    var i = +el.dataset.i;
    if (D.mode === 'music' && timed() && times[i] != null && !recOn()) { try { seekTo(Math.max(0, times[i] - 0.4)); } catch (x) {} hold = 0; }
    else { var y = toFocus(lineTop(i)); view.scrollTo({ top: y, behavior: 'smooth' }); hold = performance.now() + 1200; fpos = y; }
  });

  /* ---------- timing by tapping ---------- */
  var tapMode = false, tapNext = 0, tapTimes = [];
  function startTap() {
    if (!lineEls.length) { say('আগে লিরিক্স যোগ করুন', 'info'); return; }
    if (!musicLen()) { say('টাইমিংয়ের জন্য আগে মিউজিক ফাইল যোগ করুন', 'info'); return; }
    tapMode = true; tapNext = 0; tapTimes = [];
    lineEls.forEach(function (el) { el.classList.remove('done'); });
    $('lyrTapBar').classList.remove('hidden'); $('lyCtrl').classList.add('hidden'); $('lyKind').classList.add('hidden');
    sec.classList.add('tapping');
    try { if (!playing()) { S.playhead = 0; togglePlay(); } } catch (e) {}
    say('মিউজিক চলছে — প্রতিটা লাইন গাওয়া শুরুর মুহূর্তে "এই লাইন শুরু" চাপুন', 'info');
  }
  function tap() {
    if (!playing()) { say('মিউজিক থেমে আছে — ▶ চালু করুন', 'error'); return; }
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
    if (!tapMode) return;
    tapMode = false;
    $('lyrTapBar').classList.add('hidden'); $('lyCtrl').classList.remove('hidden'); $('lyKind').classList.remove('hidden');
    sec.classList.remove('tapping');
    lineEls.forEach(function (el) { el.classList.remove('done'); });
    try { if (playing()) togglePlay(); } catch (e) {}
    var s = song();
    if (s && tapTimes.length >= 2) {
      while (tapTimes.length < lineEls.length) tapTimes.push(null);
      s.times = tapTimes.slice(); times = s.times.slice(); save();
      say('✓ টাইমিং সেভ হয়েছে — এখন লাইনগুলো ঠিক সময়ে জ্বলবে', 'success');
    } else say('টাইমিং সেভ হয়নি (কমপক্ষে ২টা লাইনে চাপ দিন)', 'info');
    updTools();
  }
  $('lyrSync').onclick = function () {
    if (!timed()) { startTap(); return; }
    openSheet('<h3>টাইমিং</h3><p class="lyr-p">এই গানের প্রতিটা লাইনের সময় সেট করা আছে।</p>' +
      '<button class="ly-sbtn primary" data-a="redo" type="button">নতুন করে টাইমিং সেট করুন</button>' +
      '<button class="ly-sbtn danger" data-a="clear" type="button">টাইমিং মুছুন (সমান গতিতে চলবে)</button>' +
      '<button class="ly-sbtn" data-a="x" type="button">বন্ধ</button>', function (a) {
        closeModal();
        if (a === 'redo') startTap();
        else if (a === 'clear') { song().times = null; save(); render(); say('টাইমিং মুছে গেছে', 'info'); }
      });
  };
  $('lyrTap').onclick = tap;
  $('lyrTapUndo').onclick = undoTap;
  $('lyrTapDone').onclick = finishTap;

  /* ---------- side tools ---------- */
  $('lyrModeB').onclick = function () {
    D.mode = D.mode === 'auto' ? 'music' : 'auto'; save(); hold = 0; fpos = view.scrollTop; updTools();
    say(D.mode === 'auto' ? 'নিজের গতিতে — গতি +/− দিয়ে ঠিক করুন' : 'মিউজিকের সাথে — কথা মিউজিকের তালে চলবে', 'info');
  };
  function keepLine(fn) {
    var i = Math.max(0, cur); fn();
    requestAnimationFrame(function () { if (lineEls.length) { view.scrollTop = toFocus(lineTop(i)); fpos = view.scrollTop; } });
  }
  $('lyrFp').onclick = function () { D.font = Math.min(44, D.font + 2); save(); keepLine(applyFont); };
  $('lyrFm').onclick = function () { D.font = Math.max(16, D.font - 2); save(); keepLine(applyFont); };
  $('lyrSp').onclick = function () { D.speed = Math.min(20, D.speed + 1); save(); updTools(); };
  $('lyrSm').onclick = function () { D.speed = Math.max(1, D.speed - 1); save(); updTools(); };
  function stage(on) {
    document.documentElement.classList.toggle('lyr-stage', on);
    $('lyrExit').classList.toggle('hidden', !on);
    keepLine(function () {});
  }
  $('lyrFull').onclick = function () { stage(true); };
  $('lyrExit').onclick = function () { stage(false); };

  /* ---------- song list & editor ---------- */
  var sheetCb = null;
  function openSheet(html, cb) { $('lyrSheet').innerHTML = '<div class="sheet-grip"></div>' + html; sheetCb = cb; modal.classList.remove('hidden'); }
  function closeModal() { modal.classList.add('hidden'); sheetCb = null; }
  modal.addEventListener('click', function (e) {
    if (e.target === modal) { closeModal(); return; }
    var b = e.target.closest('[data-a]'); if (b && sheetCb) sheetCb(b.dataset.a, b);
  });
  function openList() {
    var items = D.songs.map(function (s) {
      return '<button class="lyr-item' + (s.id === D.cur ? ' on' : '') + '" data-a="pick" data-id="' + s.id + '" type="button"><b>' + esc(s.title || 'নাম ছাড়া গান') + '</b><small>' +
        bn(parse(s.text).lines.filter(Boolean).length) + ' লাইন' + (s.times && s.times.length ? ' • টাইমিং ✓' : '') + '</small></button>';
    }).join('');
    openSheet('<h3>আমার গান</h3>' + (items || '<p class="lyr-p">এখনো কোনো গান নেই।</p>') +
      '<button class="ly-sbtn primary" data-a="new" type="button">+ নতুন গানের লিরিক্স</button>', function (a, b) {
        if (a === 'pick') { D.cur = b.dataset.id; save(); closeModal(); render(); }
        else if (a === 'new') openEditor(null);
      });
  }
  function openEditor(s) {
    openSheet('<h3>' + (s ? 'লিরিক্স বদলান' : 'নতুন গান') + '</h3>' +
      '<input class="lyr-in" id="lyrInT" placeholder="গানের নাম (যেমন: লাল শাড়ি পরিয়া কন্যা)" maxlength="80">' +
      '<textarea class="lyr-in lyr-ta" id="lyrInX" placeholder="এখানে গানের কথা পেস্ট করুন — প্রতিটা লাইন আলাদা লাইনে। অন্তরার মাঝে একটা ফাঁকা লাইন দিতে পারেন।"></textarea>' +
      '<div class="lyr-row"><button class="ly-sbtn" data-a="paste" type="button">পেস্ট করুন</button><button class="ly-sbtn primary" data-a="save" type="button">সেভ</button></div>' +
      (s ? '<button class="ly-sbtn danger" data-a="del" type="button">এই গান মুছুন</button>' : '') +
      '<button class="ly-sbtn" data-a="x" type="button">বাতিল</button>', async function (a) {
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
  $('lyrSong').onclick = function () { D.songs.length ? openList() : openEditor(null); };
  $('lyrEdit').onclick = function () { openEditor(song()); };
  $('lyrAdd').onclick = function () { openEditor(null); };

  /* ---------- show / hide with the tab ---------- */
  var origGo = goTab;
  goTab = function (t, silent) {
    // after recording (or loading a file) from this screen, stay here instead of jumping to Edit
    try { if (t === 'edit' && S.tab === 'lyr' && Date.now() - lastTabTap > 600) { if (Date.now() < keepHere + 60000) say('টেক টাইমলাইনে বসেছে — শুনতে ▶, কাটতে "এডিট" ট্যাব', 'success'); return; } } catch (e) {}
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
      shown = false;
      if (tapMode) finishTap();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      try { wake && wake.release(); } catch (e) {} wake = null;
    }
  };
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && shown && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
  });

  // phone Back button: close the sheet / timing / full screen first
  window.TF_BACK = function () {
    if (!modal.classList.contains('hidden')) { closeModal(); return true; }
    if (tapMode) { finishTap(); return true; }
    if (document.documentElement.classList.contains('lyr-stage')) { stage(false); return true; }
    return false;
  };

  render();
  goTab('lyr');
})();
