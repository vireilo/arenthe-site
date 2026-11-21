// Arenthe Holdings — nav state, mobile menu, scroll progress and scroll choreography.
// The character has its own script (char-v5.js).
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
