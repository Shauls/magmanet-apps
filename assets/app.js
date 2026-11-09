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
  // sit right under the sticky search bar. Entering a category from the all-apps view
  // pushes ONE history entry (?cat=kids), marked in history.state; switching between
  // categories replaces it. So the phone's Back button and "All apps" both return to
  // the all-apps view, and the link can be shared.
  var grid = $('#grid');
  var q = $('#q'), finder = $('#finder'), finderAt = $('#finderAt'), back = $('#backAll'), title = $('#allTitle');
  if (grid && q && finder && finderAt && back && title) {
    var cards = $$('.card', grid), chips = $$('.chip'), empty = $('#empty'), count = $('#count');
    var allTitle = title.innerHTML, heading = $('#all-h');
    var allChip = chips.filter(function (ch) { return !ch.getAttribute('data-cat'); })[0];
    var share = $('#shareCat'), topbar = $('.topbar');
    var cat = '', wasFiltering = false, order = 'orig';
    var FINALS = 'ךםןףץ', PLAIN = 'כמנפצ';
    var norm = function (s) {
      return (s || '').toLowerCase()
        .replace(/[֑-ׇ]/g, '')          // niqqud and cantillation
        .replace(/[׳']/g, '')                 // geresh / apostrophe
        .replace(/[ךםןףץ]/g, function (ch) { return PLAIN.charAt(FINALS.indexOf(ch)); })
        .trim();
    };
    // data-q is "name | tagline | the rest" (build.py app_card)
    cards.forEach(function (c, i) {
      var parts = norm(c.getAttribute('data-q')).split('|');
      c._q = parts.join(' '); c._n = parts[0] || ''; c._t = parts[1] || ''; c._i = i;
    });
    function chipFor(c) { return chips.filter(function (ch) { return ch.getAttribute('data-cat') === c; })[0] || null; }
    function validCat(c) { return c && chipFor(c) ? c : ''; }
    function urlCat() { try { return validCat(new URLSearchParams(location.search).get('cat') || ''); } catch (e) { return ''; } }
    function rank(words, matches) {
      // name matches first, then tagline matches, then the rest (features, category);
      // only the matches move, and only when their order actually changes
      var list = cards, key = 'orig';
      if (words.length) {
        matches.forEach(function (c) {
          var s = 0;
          words.forEach(function (w) { s += c._n.indexOf(w) !== -1 ? 0 : c._t.indexOf(w) !== -1 ? 1 : 2; });
          c._s = s;
        });
        list = matches.slice().sort(function (a, b) { return (a._s - b._s) || (a._i - b._i); });
        key = list.map(function (c) { return c._i; }).join(',');
      }
      if (key === order) return;
      order = key;
      var frag = document.createDocumentFragment();
      list.forEach(function (c) { frag.appendChild(c); });
      grid.appendChild(frag);
    }
    function stickyTop() {
      return parseFloat(getComputedStyle(finder).top) || (topbar ? topbar.offsetHeight : 0);
    }
    function resultsY() {
      // the scroll position that puts the search bar right under the top bar, results under it.
      // Measured from #finderAt (not sticky), because the stuck bar's own rect never moves.
      var mt = parseFloat(getComputedStyle(finder).marginTop) || 0;
      return Math.max(0, Math.round(finderAt.getBoundingClientRect().top + window.pageYOffset + mt - stickyTop()));
    }
    function toResults() {
      var y = resultsY();
      if (Math.abs(window.pageYOffset - y) > 2) window.scrollTo(0, y);
    }
    function padTop() {
      // anchor jumps and focus scrolling must clear the top bar AND the sticky search bar
      doc.style.scrollPaddingTop = Math.round(stickyTop() + finder.offsetHeight + 8) + 'px';
    }
    padTop();
    window.addEventListener('resize', padTop);
    function catUrl(c) {
      var u = new URL(location.href);
      if (c) u.searchParams.set('cat', c); else u.searchParams.delete('cat');
      u.hash = '';
      return u.href;
    }
    function run(scroll) {
      var words = norm(q.value).split(/\s+/).filter(Boolean), matches = [];
      cards.forEach(function (c) {
        var ok = (!cat || c.getAttribute('data-cat') === cat) && words.every(function (w) { return c._q.indexOf(w) !== -1; });
        c.hidden = !ok;
        if (ok) matches.push(c);
      });
      rank(words, matches);
      count.textContent = matches.length;
      if (empty) empty.hidden = matches.length > 0;
      var filtering = !!(cat || words.length);
      document.body.classList.toggle('filtering', filtering);
      chips.forEach(function (ch) { var on = ch.getAttribute('data-cat') === cat; ch.classList.toggle('on', on); ch.setAttribute('aria-pressed', on); });
      var chip = cat && chipFor(cat);
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
      if (scroll !== false) {
        // entering results, or refining while scrolled past their top: show the top results.
        // Leaving results: back to the top of the page (the carousel and tiles come back).
        if (filtering && (!wasFiltering || window.pageYOffset > resultsY() + 2)) toResults();
        else if (!filtering && wasFiltering) window.scrollTo(0, 0);
      }
      wasFiltering = filtering;
    }
    function inPushed() { return !!(history.state && history.state.mgCat); }
    function setCat(c) {
      c = validCat(c || '');
      if (c === cat) { if (c) toResults(); return; }
      if (!c && inPushed()) { history.back(); return; }   // popstate shows the all-apps view
      var prev = cat;
      cat = c;
      try {
        var h = catUrl(cat);
        if (cat && !prev && !inPushed()) history.pushState({ mgCat: 1 }, '', h);
        else history.replaceState(history.state, '', h);
      } catch (e) {}
      run();
      if (cat) toResults();
    }
    function focusResults() {
      // the control the user activated may now be hidden; keep focus (and the screen reader) on the results
      if (heading) try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }
    }
    // "Share this category": the /c/<key>/ link, whose preview shows that category.
    if (share) share.addEventListener('click', function () {
      var url = share.getAttribute('data-base') + cat + '/';
      var chip = chipFor(cat);
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
    q.addEventListener('input', function () { run(); });
    q.addEventListener('focus', function () { if (window.innerWidth < 720) toResults(); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); q.blur(); if (document.body.classList.contains('filtering')) toResults(); }
      else if (e.key === 'Escape') { q.value = ''; run(); }
    });
    chips.forEach(function (ch) { ch.addEventListener('click', function () { setCat(ch.getAttribute('data-cat')); }); });
    $$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        // let Ctrl/Cmd/Shift/middle-click on the tile links open a new tab or window
        if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        setCat(b.getAttribute('data-goto'));
        focusResults();
      });
    });
    back.addEventListener('click', function () {
      if (allChip) try { allChip.focus({ preventScroll: true }); } catch (e) {}
      setCat('');
    });
    // "How to install" links (footer) jump to #install, which the results view hides: leave it first
    $$('a[href*="#install"]').forEach(function (a) {
      a.addEventListener('click', function () {
        if (!document.body.classList.contains('filtering')) return;
        q.value = '';
        cat = '';
        try { history.replaceState(null, '', catUrl('')); } catch (e) {}
        run(false);
      });
    });
    window.addEventListener('popstate', function () {
      // keep ?lang matching the language the page shows now, whatever entry Back restored
      try {
        var u = new URL(location.href);
        if ((u.searchParams.get('lang') === 'en') !== isEn()) {
          if (isEn()) u.searchParams.set('lang', 'en'); else u.searchParams.delete('lang');
          history.replaceState(history.state, '', u.href);
        }
      } catch (e) {}
      var c = urlCat();
      if (c === cat) return;          // e.g. a #fragment jump: nothing to change
      cat = c;
      run(false);                     // the browser restores this entry's own scroll position
    });
    var c0 = urlCat();
    if (c0) { cat = c0; run(false); setTimeout(toResults, 50); }
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
