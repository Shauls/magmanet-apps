/* Magmanet Apps store — vanilla JS: language, theme, search/filter, carousels, lightbox. */
(function () {
  'use strict';
  var doc = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function isEn() { return doc.classList.contains('en'); }

  /* ---------- language ---------- */
  function applyLang(lang) {
    var en = lang === 'en';
    doc.classList.toggle('en', en);
    doc.lang = en ? 'en' : 'he';
    doc.dir = en ? 'ltr' : 'rtl';
    var t = doc.getAttribute(en ? 'data-title-en' : 'data-title-he');
    if (t) document.title = t;
    ['placeholder', 'aria-label', 'alt', 'content'].forEach(function (a) {
      $$('[data-' + a + '-he]').forEach(function (el) {
        var v = el.getAttribute('data-' + a + '-' + (en ? 'en' : 'he'));
        if (v !== null) el.setAttribute(a, v);
      });
    });
    // keep ?lang in internal links so shared links keep the language
    $$('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|#|data:)/.test(h) || h.indexOf('privacy/') !== -1) return;
      var parts = h.split('#'), base = parts[0], hash = parts[1] ? '#' + parts[1] : '';
      base = base.replace(/([?&])lang=(he|en)&?/, '$1').replace(/[?&]$/, '');
      if (en) base += (base.indexOf('?') === -1 ? '?' : '&') + 'lang=en';
      a.setAttribute('href', base + hash);
    });
    store('mg-lang', lang);
  }
  var langBtn = $('#langBtn');
  if (langBtn) langBtn.addEventListener('click', function () {
    var next = isEn() ? 'he' : 'en';
    applyLang(next);
    try {
      var u = new URL(location.href);
      if (next === 'en') u.searchParams.set('lang', 'en'); else u.searchParams.delete('lang');
      history.replaceState(null, '', u.toString());
    } catch (e) {}
  });
  applyLang(isEn() ? 'en' : 'he');

  /* ---------- theme ---------- */
  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var cur = doc.getAttribute('data-theme');
    if (!cur) cur = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    doc.setAttribute('data-theme', next);
    store('mg-theme', next);
  });

  /* ---------- home: search + category filter ---------- */
  var grid = $('#grid');
  if (grid) {
    var q = $('#q'), cards = $$('.card', grid), chips = $$('.chip'), empty = $('#empty'), count = $('#count');
    var cat = '';
    var norm = function (s) { return (s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/[׳']/g, '').trim(); };
    cards.forEach(function (c) { c._q = norm(c.getAttribute('data-q')); });
    function run(scroll) {
      var words = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
      cards.forEach(function (c) {
        var ok = (!cat || c.getAttribute('data-cat') === cat) && words.every(function (w) { return c._q.indexOf(w) !== -1; });
        c.hidden = !ok;
        if (ok) n++;
      });
      count.textContent = n;
      empty.hidden = n > 0;
      document.body.classList.toggle('filtering', !!(cat || words.length));
      chips.forEach(function (ch) { var on = ch.getAttribute('data-cat') === cat; ch.classList.toggle('on', on); ch.setAttribute('aria-pressed', on); });
      if (scroll) $('.all').scrollIntoView({ block: 'start' });
      // The address bar follows the category, so it can be copied and sent as is.
      try {
        var u = new URL(location.href);
        if (cat) u.searchParams.set('cat', cat); else u.searchParams.delete('cat');
        if (u.href !== location.href) history.replaceState(null, '', u.href);
      } catch (e) {}
      if (share) share.hidden = !cat;
    }
    // "Share this category": the /c/<key>/ link, whose preview shows that category.
    var share = $('#shareCat');
    if (share) share.addEventListener('click', function () {
      var url = share.getAttribute('data-base') + cat + '/';
      var chip = $('.chip[data-cat="' + cat + '"]');
      var lbl = chip && chip.querySelector(isEn() ? '.t-en' : '.t-he');
      var title = lbl ? lbl.textContent.trim() : '';
      if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
      var done = function () {
        var old = share.innerHTML;
        share.textContent = share.getAttribute(isEn() ? 'data-copied-en' : 'data-copied-he');
        setTimeout(function () { share.innerHTML = old; }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('', url); });
      else prompt('', url);
    });
    q.addEventListener('input', function () { run(false); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(true); q.blur(); } });
    chips.forEach(function (ch) { ch.addEventListener('click', function () { cat = ch.getAttribute('data-cat'); run(false); }); });
    $$('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { cat = b.getAttribute('data-goto'); run(true); }); });
    try { var c0 = new URLSearchParams(location.search).get('cat'); if (c0) { cat = c0; run(false); setTimeout(function () { $('.chips').scrollIntoView({ block: 'start' }); }, 50); } } catch (e) {}
  }

  /* ---------- home: hero carousel ---------- */
  var hero = $('[data-carousel]');
  if (hero) {
    var track = $('.hero-track', hero), slides = $$('.slide', hero), dots = $$('.dot', hero), idx = 0, visible = true, paused = false;
    function go(i, smooth) {
      if (!slides.length) return;
      idx = (i + slides.length) % slides.length;
      var s = slides[idx];
      var tr = track.getBoundingClientRect(), sr = s.getBoundingClientRect();
      var delta = isEn() ? sr.left - tr.left : sr.right - tr.right;
      track.scrollBy({ left: delta, behavior: smooth === false ? 'auto' : 'smooth' });
    }
    if ('IntersectionObserver' in window) {
      var seen = {};
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { seen[slides.indexOf(e.target)] = e.isIntersecting && e.intersectionRatio >= 0.6; });
        for (var k = 0; k < slides.length; k++) if (seen[k]) { idx = k; break; }
        dots.forEach(function (d, j) { d.classList.toggle('on', j === idx); d.setAttribute('aria-current', j === idx); });
      }, { root: track, threshold: [0, 0.6, 1] });
      slides.forEach(function (s) { io.observe(s); });
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
    }
    dots.forEach(function (d, j) { d.addEventListener('click', function () { go(j); }); });
    $('.hero-nav.prev', hero).addEventListener('click', function () { go(idx - 1); });
    $('.hero-nav.next', hero).addEventListener('click', function () { go(idx + 1); });
    hero.addEventListener('mouseenter', function () { paused = true; });
    hero.addEventListener('mouseleave', function () { paused = false; });
    hero.addEventListener('focusin', function () { paused = true; });
    hero.addEventListener('focusout', function () { paused = false; });
    track.addEventListener('touchstart', function () { paused = true; }, { passive: true });
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && slides.length > 1) setInterval(function () {
      if (visible && !paused && !document.hidden) {
        var atEnd = Math.abs(track.scrollLeft) + track.clientWidth >= track.scrollWidth - 4;
        go(atEnd ? 0 : idx + 1);
      }
    }, 6000);
    if (dots[0]) dots[0].classList.add('on');
  }

  /* ---------- app page: lightbox ---------- */
  var lb = $('#lb');
  if (lb) {
    var shots = $$('.shot'), img = $('#lbImg'), cnt = $('#lbCount'), cur = 0, lastFocus = null;
    function show(i) {
      cur = (i + shots.length) % shots.length;
      var s = shots[cur], th = $('img', s);
      img.src = s.getAttribute('data-full');
      img.alt = th ? th.alt : '';
      cnt.textContent = (cur + 1) + ' / ' + shots.length;
    }
    function open(i) { lastFocus = document.activeElement; lb.hidden = false; document.body.classList.add('lb-open'); show(i); $('.lb-close', lb).focus(); }
    function close() { lb.hidden = true; document.body.classList.remove('lb-open'); img.src = 'data:,'; if (lastFocus) lastFocus.focus(); }
    shots.forEach(function (s, i) { s.addEventListener('click', function () { open(i); }); });
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', function () { show(cur - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(cur + (isEn() ? 1 : -1));
      else if (e.key === 'ArrowLeft') show(cur + (isEn() ? -1 : 1));
      else if (e.key === 'Tab') { // focus trap
        var f = $$('button', lb).filter(function (b) { return b.offsetParent !== null; });
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    var sx = null, sy = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        var forward = dx < 0; // swipe left
        if (!isEn()) forward = !forward;
        show(cur + (forward ? 1 : -1));
      } else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
      sx = sy = null;
    });
  }
})();
