// Arenthe Holdings — nav state, mobile menu, scroll progress and scroll choreography.
(function () {
  var doc = document.documentElement;
  var nav = document.getElementById('nav');
  var bar = document.getElementById('progress');
  var btn = document.getElementById('menuBtn');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canWatch = 'IntersectionObserver' in window;
  if (!still && canWatch) doc.classList.add('js');

  var heroImg = document.querySelector('.hero-figure img');
  var growers = (still || !canWatch) ? [] : [].slice.call(document.querySelectorAll('[data-scale]'));
  /* Split read-along text into words once. The text is unchanged for screen
   * readers; only the colour of each word is animated. */
  var readers = (still || !canWatch) ? [] : [].slice.call(document.querySelectorAll('[data-read]')).map(function (el) {
    var words = [];
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (nd) {
        if (nd.nodeType === 3) {
          var frag = document.createDocumentFragment();
          nd.textContent.split(/(\s+)/).forEach(function (tk) {
            if (!tk) return;
            if (/^\s+$/.test(tk)) { frag.appendChild(document.createTextNode(tk)); return; }
            var sp = document.createElement('span'); sp.className = 'w'; sp.textContent = tk;
            frag.appendChild(sp); words.push(sp);
          });
          node.replaceChild(frag, nd);
        } else if (nd.nodeType === 1) walk(nd);
      });
    })(el);
    return { el: el, words: words, n: 0 };
  });
  var sections = [].slice.call(document.querySelectorAll('main section[id]'));
  var links = {};
  [].forEach.call(document.querySelectorAll('.nav-links a[href^="#"]'), function (a) { links[a.getAttribute('href').slice(1)] = a; });

  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    if (nav) nav.classList.toggle('scrolled', y > 24);
    if (bar) {
      var max = doc.scrollHeight - vh;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
    if (still) return;
    // first screen: the rendering settles as the page moves on
    if (heroImg && y < vh) {
      var t = Math.min(y / vh, 1);
      heroImg.style.transform = 'scale(' + (1.12 - t * 0.12).toFixed(4) + ') translate3d(0,' + (t * 3).toFixed(2) + '%,0)';
    }
    // read-along paragraphs: words darken as the paragraph moves up the screen
    for (var r = 0; r < readers.length; r++) {
      var R = readers[r], rc = R.el.getBoundingClientRect();
      if (rc.bottom < -200 || rc.top > vh + 200) continue;
      var pr = Math.max(0, Math.min(1, (vh * 0.88 - rc.top) / (vh * 0.45 + rc.height)));
      if (y + vh >= doc.scrollHeight - 4) pr = 1;   // nothing left to scroll: finish the paragraph
      var n = Math.round(pr * R.words.length);
      if (n !== R.n) {
        var lo = Math.min(n, R.n), hi = Math.max(n, R.n);
        for (var w = lo; w < hi; w++) R.words[w].classList.toggle('on', w < n);
        R.n = n;
      }
    }
    // frames that grow into place
    for (var g = 0; g < growers.length; g++) {
      var gr = growers[g].getBoundingClientRect();
      if (gr.bottom < 0 || gr.top > vh) continue;
      var gp = Math.max(0, Math.min(1, (vh - gr.top) / (vh * 0.75)));
      gp = 1 - Math.pow(1 - gp, 3);
      growers[g].style.transform = 'scale(' + (0.86 + 0.14 * gp).toFixed(4) + ')';
    }
    // mark the section being read in the navigation
    var current = null;
    for (var j = 0; j < sections.length; j++) {
      if (sections[j].getBoundingClientRect().top < vh * 0.4) current = sections[j].id;
    }
    for (var id in links) {
      if (id === current) links[id].setAttribute('aria-current', 'true');
      else links[id].removeAttribute('aria-current');
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  /* Figures count up once when they come into view. */
  function countUp(root) {
    [].forEach.call(root.querySelectorAll('[data-count]'), function (el) {
      if (el.__done) return; el.__done = true;
      var end = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '', t0 = performance.now(), dur = 1400;
      (function step(now) {
        var k = Math.min((now - t0) / dur, 1); k = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(end * k).toLocaleString('en-US') + suf;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  if (!still && canWatch) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); countUp(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    [].forEach.call(document.querySelectorAll('[data-r],[data-line],.proof'), function (el) { io.observe(el); });
  }

  // photo reel: a new order on every visit; it drifts slowly, yields to the hand, then carries on
  [].forEach.call(document.querySelectorAll('[data-reel]'), function (reel) {
    var track = reel.querySelector('.reel-track'), items = [].slice.call(track.children), i, k, t;
    for (i = items.length - 1; i > 0; i--) { k = Math.floor(Math.random() * (i + 1)); t = items[i]; items[i] = items[k]; items[k] = t; }
    items.forEach(function (li) { track.appendChild(li); });
    if (still) return;
    // a second copy makes the drift endless
    items.forEach(function (li) { var c = li.cloneNode(true), b = c.querySelector('button'); c.setAttribute('aria-hidden', 'true'); if (b) b.tabIndex = -1; track.appendChild(c); });
    var span = 0, pos = 0, last = 0, held = false, hover = false, onScreen = false, resume = 0, drag = null, moved = 0;
    function measure() { span = track.children[items.length].offsetLeft - track.children[0].offsetLeft; }
    function wrap() { if (span && reel.scrollLeft >= span) reel.scrollLeft -= span; else if (span && reel.scrollLeft <= 0 && pos < 0) reel.scrollLeft += span; }
    function tick(now) {
      var dt = Math.min(now - last, 60); last = now;
      if (onScreen && !held && !hover && now > resume && !document.querySelector('dialog[open]')) {
        if (!span) measure();
        if (Math.abs(reel.scrollLeft - pos) > 2) pos = reel.scrollLeft;   // the hand moved it; carry on from there
        pos += dt * 0.028;                                                // about 28 pixels a second
        if (span && pos >= span) pos -= span;
        reel.scrollLeft = pos;
      }
      requestAnimationFrame(tick);
    }
    function pause(ms) { resume = performance.now() + ms; }
    reel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    reel.addEventListener('pointerleave', function () { hover = false; });
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') { pause(4000); return; }
      held = true; moved = 0; drag = { x: e.clientX, left: reel.scrollLeft }; reel.classList.add('held');
    });
    window.addEventListener('pointermove', function (e) { if (drag) { moved = Math.max(moved, Math.abs(e.clientX - drag.x)); reel.scrollLeft = drag.left - (e.clientX - drag.x); wrap(); } });
    // a drag is not a click: only a still press opens the photo
    reel.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    ['pointerup', 'pointercancel'].forEach(function (n) { window.addEventListener(n, function () { if (drag) { drag = null; held = false; reel.classList.remove('held'); pause(1500); } }); });
    reel.addEventListener('touchstart', function () { pause(4000); }, { passive: true });
    reel.addEventListener('touchmove', function () { pause(4000); }, { passive: true });
    reel.addEventListener('wheel', function () { pause(2500); }, { passive: true });
    reel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { pause(4000); reel.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * 320, behavior: 'smooth' }); e.preventDefault(); }
    });
    window.addEventListener('resize', function () { span = 0; });
    if (canWatch) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }).observe(reel); else onScreen = true;
    requestAnimationFrame(function (now) { last = now; tick(now); });
  });

  // lightbox: a click on a reel photo opens the whole, uncropped picture; arrows step through the reel's order
  var box = document.getElementById('lightbox');
  if (box && box.showModal) {
    var big = box.querySelector('img'), cap = box.querySelector('figcaption'), list = [], at = 0, opener = null;
    function show(n) {
      at = (n + list.length) % list.length;
      var b = list[at], thumb = b.querySelector('img');
      big.width = +b.getAttribute('data-w'); big.height = +b.getAttribute('data-h');
      big.src = b.getAttribute('data-full'); big.alt = thumb.alt; cap.textContent = thumb.alt;
      var nx = list[(at + 1) % list.length]; if (nx) new Image().src = nx.getAttribute('data-full');
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.reel-item');
      if (!b) return;
      list = [].slice.call(b.closest('.reel-track').querySelectorAll('li:not([aria-hidden]) .reel-item'));
      var full = b.getAttribute('data-full'), n = 0;
      list.forEach(function (x, i) { if (x.getAttribute('data-full') === full) n = i; });
      opener = b; show(n); box.showModal();
    });
    box.querySelector('.lb-close').addEventListener('click', function () { box.close(); });
    box.querySelector('.lb-prev').addEventListener('click', function () { show(at - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { show(at + 1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'FIGURE') box.close(); });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(at + 1); else if (e.key === 'ArrowLeft') show(at - 1); });
    box.addEventListener('close', function () { big.removeAttribute('src'); if (opener && opener.tabIndex !== -1) opener.focus(); });
  }

  if (btn && nav) {
    function setOpen(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Close' : 'Menu';
    }
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('.nav-links a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }
})();
