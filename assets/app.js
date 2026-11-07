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
  // Typing or picking a category turns the home page into a results view: the
  // carousel, category tiles, shelves and install help hide, and the matching apps
  // sit right under the sticky search bar. A category is its own history entry
  // (?cat=kids), so the back button leaves it and the link can be shared.
  var grid = $('#grid');
  if (grid) {
    var q = $('#q'), cards = $$('.card', grid), chips = $$('.chip'), empty = $('#empty'), count = $('#count');
    var finder = $('#finder'), back = $('#backAll'), title = $('#allTitle'), allTitle = title.innerHTML;
    var share = $('#shareCat'), topbar = $('.topbar');
    var cat = '', wasFiltering = false, pushed = 0;
    var FINALS = 'ךםןףץ', PLAIN = 'כמנפצ';
    var norm = function (s) {
      return (s || '').toLowerCase()
        .replace(/[֑-ׇ]/g, '')          // niqqud and cantillation
        .replace(/[׳']/g, '')                 // geresh / apostrophe
        .replace(/[ךםןףץ]/g, function (ch) { return PLAIN.charAt(FINALS.indexOf(ch)); })
        .trim();
    };
    cards.forEach(function (c, i) { c._q = norm(c.getAttribute('data-q')); c._n = norm(c.getAttribute('data-n')); c._t = norm(c.getAttribute('data-t')); c._i = i; });
    var ranked = false;
    function rank(words) {
      // name matches first, then tagline matches, then the rest (features, category)
      if (!words.length && !ranked) return;
      var score = function (c) {
        if (!words.length) return 0;
        var s = 0;
        words.forEach(function (w) { s += c._n.indexOf(w) !== -1 ? 0 : c._t.indexOf(w) !== -1 ? 1 : 2; });
        return s;
      };
      cards.slice().sort(function (a, b) { return (score(a) - score(b)) || (a._i - b._i); })
        .forEach(function (c) { grid.appendChild(c); });
      ranked = words.length > 0;
    }
    function toResults() {
      // put the search bar at the top of the screen, results right under it
      var top = finder.getBoundingClientRect().top + window.pageYOffset - (topbar ? topbar.offsetHeight : 0);
      if (window.pageYOffset < top - 2 || window.pageYOffset > top + 2) window.scrollTo(0, top);
    }
    function catUrl(c) {
      var u = new URL(location.href);
      if (c) u.searchParams.set('cat', c); else u.searchParams.delete('cat');
      return u.href;
    }
    function run() {
      var words = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
      cards.forEach(function (c) {
        var ok = (!cat || c.getAttribute('data-cat') === cat) && words.every(function (w) { return c._q.indexOf(w) !== -1; });
        c.hidden = !ok;
        if (ok) n++;
      });
      rank(words);
      count.textContent = n;
      empty.hidden = n > 0;
      var filtering = !!(cat || words.length);
      document.body.classList.toggle('filtering', filtering);
      document.body.classList.toggle('in-cat', !!cat);
      chips.forEach(function (ch) { var on = ch.getAttribute('data-cat') === cat; ch.classList.toggle('on', on); ch.setAttribute('aria-pressed', on); });
      var chip = cat && $('.chip[data-cat="' + cat + '"]');
      if (chip) {
        var he = $('.t-he', chip), en = $('.t-en', chip);
        title.innerHTML = '';
        title.appendChild(document.createTextNode(chip.getAttribute('data-emoji') + ' '));
        if (he) title.appendChild(he.cloneNode(true));
        if (en) title.appendChild(en.cloneNode(true));
        if (chip.scrollIntoView) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
      } else title.innerHTML = allTitle;
      back.hidden = !cat;
      if (share) share.hidden = !cat;
      if (filtering && !wasFiltering) toResults();
      wasFiltering = filtering;
    }
    function setCat(c) {
      c = c || '';
      if (c === cat) { toResults(); return; }
      cat = c;
      try {
        var h = catUrl(cat);
        if (h !== location.href) { history.pushState({ cat: cat }, '', h); pushed++; }
      } catch (e) {}
      wasFiltering = false;
      run();
      if (cat) toResults();
    }
    // "Share this category": the /c/<key>/ link, whose preview shows that category.
    if (share) share.addEventListener('click', function () {
      var url = share.getAttribute('data-base') + cat + '/';
      var chip = $('.chip[data-cat="' + cat + '"]');
      var lbl = chip && chip.querySelector(isEn() ? '.t-en' : '.t-he');
      var t = lbl ? lbl.textContent.trim() : '';
      if (navigator.share) { navigator.share({ title: t, url: url }).catch(function () {}); return; }
      var done = function () {
        var old = share.innerHTML;
        share.textContent = share.getAttribute(isEn() ? 'data-copied-en' : 'data-copied-he');
        setTimeout(function () { share.innerHTML = old; }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('', url); });
      else prompt('', url);
    });
    q.addEventListener('input', run);
    q.addEventListener('focus', function () { if (window.innerWidth < 720) toResults(); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); q.blur(); }
      else if (e.key === 'Escape') { q.value = ''; run(); }
    });
    chips.forEach(function (ch) { ch.addEventListener('click', function () { setCat(ch.getAttribute('data-cat')); }); });
    $$('[data-goto]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); setCat(b.getAttribute('data-goto')); }); });
    back.addEventListener('click', function () {
      if (pushed > 0) { history.back(); return; }
      setCat('');
      if (!q.value) window.scrollTo(0, 0);
    });
    window.addEventListener('popstate', function () {
      var c = '';
      try { c = new URLSearchParams(location.search).get('cat') || ''; } catch (e) {}
      if (pushed > 0) pushed--;
      cat = c; wasFiltering = false; run();
      if (!cat && !q.value) window.scrollTo(0, 0);
    });
    try {
      var c0 = new URLSearchParams(location.search).get('cat');
      if (c0 && $('.chip[data-cat="' + c0 + '"]')) { cat = c0; run(); setTimeout(toResults, 50); }
    } catch (e) {}
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
