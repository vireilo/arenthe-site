/* Arenthe Holdings — approved character system v5 (Gates A2 / B / C / D).
 *
 * Two controllers, no external animation runtime, no third-party requests:
 *
 *   HERO   the approved Gate C R2 performance. First visit plays the 10.00 s
 *          active sequence (door, walk, ball spin, double poof, single hidden
 *          swap, house spin, reaction, return, swirl) and then loops the 5.00 s
 *          living idle. Repeat visits open directly on the idle.
 *
 *   STORY  the approved Gate D R2 scroll choreography, driven purely by
 *          normalized scroll progress. Desktop/tablet use the desktop frame set
 *          (params); mobile widths use the independently authored mobile set
 *          (paramsMobile). Nothing accumulates, so it is reversible and correct
 *          after reload or history navigation.
 *
 * Both pause while offscreen. Neither ever displays char-full.webp or the
 * neutral reference: every frame is a render of the approved layered rig.
 */
(function () {
  'use strict';

  /* Tell js/main.js that the character is owned here. main.js keeps the copy
   * entrances and section reveals and leaves the caricature alone — the same
   * handshake the previous rig used, so no change to main.js is required. */
  window.__rigActive = true;

  var BASE = 'assets/char-v5/';
  var ASSET_VER = '?v=5';
  var FPS = 12, FRAME_MS = 1000 / 12;
  var HERO_ACTIVE = 120;          // 10.00 s
  var HERO_IDLE = 60;             // 5.00 s
  var STORY_D = 61, STORY_M = 41;
  var MOBILE_Q = '(max-width: 700px)';
  var SEEN_KEY = 'arenthe.heroSeen';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* Session memory: a repeat visit is one where the entrance has already played
   * in this browsing session. Falls back silently if storage is unavailable. */
  function heroSeen() {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markHeroSeen() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  /* A tiny frame cache. Images are decoded once and reused, so scrubbing back
   * and forth never re-decodes. */
  function FrameSet(dir, prefix, count, width) {
    this.urls = [];
    this.img = [];
    this.loaded = 0;
    for (var i = 0; i < count; i++) {
      this.urls.push(BASE + dir + '/' + prefix + pad(i, width) + '.webp' + ASSET_VER);
    }
  }
  FrameSet.prototype.load = function (from, to, done) {
    var self = this, pending = 0, fired = false;
    from = from || 0; to = (to === undefined) ? this.urls.length : to;
    for (var i = from; i < to; i++) {
      if (this.img[i]) continue;
      pending++;
      (function (k) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = im.onerror = function () {
          self.img[k] = im; self.loaded++;
          if (--pending === 0 && !fired) { fired = true; done && done(); }
        };
        im.src = self.urls[k];
      })(i);
    }
    if (pending === 0 && !fired) { fired = true; done && done(); }
  };
  /* Resolve once frame i is decoded and safe to paint. Never rejects: a decode
   * failure leaves whatever is on screen, which is the poster. */
  FrameSet.prototype.decoded = function (i, cb) {
    var im = this.img[i];
    if (im && im.decode) { im.decode().then(cb, cb); return; }
    cb();
  };
  FrameSet.prototype.src = function (i) {
    i = clamp(i | 0, 0, this.urls.length - 1);
    return (this.img[i] && this.img[i].src) || this.urls[i];
  };

  /* ------------------------------------------------------------------ HERO */
  function initHero() {
    var box = document.getElementById('heroChar');
    if (!box) return null;
    var skip = document.getElementById('skipIntro');
    /* The poster is already in the markup with a real src and explicit
     * dimensions, so the hero is painted before this script runs at all. Adopt
     * it as the display element; if it is somehow absent, build an equivalent. */
    var img = document.getElementById('heroPoster');
    if (!img) {
      img = document.createElement('img');
      img.className = 'char-frame';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.decoding = 'async';
      img.width = 470; img.height = 465;
      img.src = BASE + 'hero-entrance/e000.webp' + ASSET_VER;
      box.appendChild(img);
    }
    box.classList.add('rig-on');

    var legacy = document.getElementById('charLegacy');
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);

    var idle = new FrameSet('hero-idle', 'i', HERO_IDLE, 2);
    var entrance = null;
    var state = { mode: 'rest', i: 0, timer: 0, visible: true, done: false };

    function show(set, i) {
      var s = set.src(i);
      if (img.getAttribute('src') !== s) img.src = s;
    }
    function stop() { if (state.timer) { clearInterval(state.timer); state.timer = 0; } }

    function runIdle() {
      state.mode = 'idle';
      stop();
      idle.load(0, HERO_IDLE, function () {
        if (state.mode !== 'idle') return;
        show(idle, state.i % HERO_IDLE);
        if (reduced || !state.visible) return;
        state.timer = setInterval(function () {
          state.i = (state.i + 1) % HERO_IDLE;
          show(idle, state.i);
        }, FRAME_MS);
      });
    }

    function finishToIdle() {
      state.done = true;
      markHeroSeen();
      if (skip) skip.hidden = true;
      state.i = 0;
      runIdle();
      /* Release the entrance. It is 120 decoded bitmaps — by far the largest
       * block the page holds — and it can never play again this session. The
       * frame currently on screen stays alive through the <img> itself. */
      if (entrance) { entrance.img.length = 0; entrance = null; }
    }

    function runEntrance() {
      state.mode = 'entrance';
      if (skip) skip.hidden = false;
      entrance = new FrameSet('hero-entrance', 'e', HERO_ACTIVE, 3);
      // only the opening second is required before we start; the rest streams in
      /* Load only the opening buffer, then hold the poster until frame 0 has
       * decoded. The remaining frames stream in behind the playhead — the
       * poster is never hidden waiting for all 120. */
      entrance.load(0, 14, function () {
        if (state.mode !== 'entrance') return;
        entrance.decoded(0, function () {
        if (state.mode !== 'entrance') return;
        entrance.load(14, HERO_ACTIVE);
        idle.load(0, 6);
        state.i = 0;
        state.timer = setInterval(function () {
          if (!state.visible) return;                 // paused offscreen
          show(entrance, state.i);
          state.i++;
          if (state.i >= HERO_ACTIVE) { stop(); finishToIdle(); }
        }, FRAME_MS);
        });
      });
    }

    /* Abandoning the entrance must resolve to the final layered state, never to
     * a half-played pose. */
    function resolveNow() {
      if (state.mode === 'entrance') { stop(); finishToIdle(); }
    }

    if (skip) skip.addEventListener('click', resolveNow);

    var io = new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      state.visible = vis;
      if (!vis) {
        stop();
        if (state.mode === 'entrance') resolveNow();   // scrolled away mid-entrance
      } else if (state.mode === 'idle' && !state.timer && !reduced) {
        runIdle();                                     // resume only idle motion
      }
    }, { threshold: 0.05 });
    io.observe(box);

    if (reduced) {
      if (skip) skip.hidden = true;
      show(idle, 0); idle.load(0, 1); markHeroSeen(); return { state: state };
    }
    /* Gate E R2: the complete approved Gate C performance plays on every normal
     * load and reload. (It previously played once per session.) */
    runEntrance();

    window.addEventListener('pagehide', stop);
    return { state: state, resolveNow: resolveNow, box: box, img: img };
  }

  /* ----------------------------------------------------------------- STORY */
  function initStory() {
    var section = document.getElementById('transform');
    var box = document.getElementById('tChar');
    if (!section || !box) return null;

    var base = document.getElementById('tCharBase');
    if (base && base.parentNode) base.parentNode.removeChild(base);
    var anchor = document.getElementById('tAnchor');
    if (anchor && anchor.parentNode) anchor.parentNode.removeChild(anchor);

    var img = document.createElement('img');
    img.className = 'char-frame';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';
    img.src = BASE + 'story-rest.webp' + ASSET_VER;
    box.appendChild(img);
    box.classList.add('rig-on');

    var mq = window.matchMedia ? window.matchMedia(MOBILE_Q) : { matches: false };
    var sets = {
      desk: new FrameSet('story-desk', 'd', STORY_D, 2),
      mob: new FrameSet('story-mob', 'm', STORY_M, 2)
    };
    var lines = ['tLine1', 'tLine2', 'tLine3'].map(function (id) {
      return document.getElementById(id);
    });
    /* Copy beats. `.tline` is absolutely positioned — all three occupy the same
     * coordinates inside one fixed stage — so a beat that never fades out will
     * sit underneath the next headline. Each beat therefore has an explicit in
     * AND out, and an inactive beat is hidden outright rather than left at
     * opacity 0 on top of its successor. */
    var BEAT_D = [0.055, 0.375, 0.695], BEAT_M = [0.050, 0.370, 0.690];
    var T = 0.06;                      // 6% of the timeline per transition

    /* Sequential with a half-transition overlap: beat i is on its way out while
     * beat i+1 arrives, so at most TWO are ever partially visible and never
     * three. The last beat holds to the end of the section. */
    function beatOpacity(starts, i, p) {
      var inA = starts[i], inB = inA + T;
      var outA = (i < starts.length - 1) ? starts[i + 1] - T * 0.5 : Infinity;
      if (p < inA) return 0;
      if (p < inB) return (p - inA) / T;
      if (p < outA) return 1;
      if (p < outA + T) return 1 - (p - outA) / T;
      return 0;
    }

    var st = { active: false, raf: 0, last: -1, loaded: false };

    function which() { return mq.matches ? 'mob' : 'desk'; }
    function count() { return which() === 'mob' ? STORY_M : STORY_D; }

    /* progress is read from layout every time — never integrated or remembered,
     * so reload and history navigation land on the identical state */
    function progress() {
      var r = section.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      if (span <= 0) return 0;
      return clamp(-r.top / span, 0, 1);
    }

    function apply() {
      st.raf = 0;
      if (!st.active) return;
      var p = progress();
      var set = sets[which()];
      var n = count();
      var f = clamp(Math.round(p * (n - 1)), 0, n - 1);
      var key = which() + f;
      if (key !== st.last) { img.src = set.src(f); st.last = key; }
      var starts = which() === 'mob' ? BEAT_M : BEAT_D;
      for (var i = 0; i < 3; i++) {
        var el = lines[i];
        if (!el) continue;
        var o = reduced ? 1 : beatOpacity(starts, i, p);
        var on = o > 0.004;
        // snap below the visibility threshold to exactly 0: a beat that has
        // finished must read 0, not a 0.002 residue of the fade curve
        el.style.opacity = on ? o.toFixed(3) : '0';
        el.style.visibility = on ? 'visible' : 'hidden';
        el.style.pointerEvents = 'none';
        if (reduced) { el.style.transform = 'none'; }
        else if (!on) { el.style.transform = 'translateY(18px)'; }
        else {
          // arriving: rises from below and settles.  leaving: drifts upward.
          var arriving = p < starts[i] + T;
          el.style.transform = 'translateY(' +
            (arriving ? (1 - o) * 18 : -(1 - o) * 14).toFixed(1) + 'px)';
        }
      }
      st.beats = [beatOpacity(starts, 0, p), beatOpacity(starts, 1, p),
                  beatOpacity(starts, 2, p)];
      st.p = p;
    }
    function onScroll() { if (!st.raf) st.raf = requestAnimationFrame(apply); }

    function ensureLoaded() {
      if (st.loaded) return;
      st.loaded = true;
      sets[which()].load(0, count(), apply);
    }

    /* defer the story frames until the section is near the viewport */
    var near = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { ensureLoaded(); near.disconnect(); }
    }, { rootMargin: '400px 0px' });
    near.observe(section);

    var io = new IntersectionObserver(function (es) {
      var was = st.active;
      st.active = es[0].isIntersecting;
      if (st.active) { ensureLoaded(); if (!was) { st.last = -1; apply(); } }
    }, { threshold: 0 });
    io.observe(section);

    if (reduced) {
      img.src = BASE + 'story-rest.webp' + ASSET_VER;
      for (var i = 0; i < 3; i++) if (lines[i]) { lines[i].style.opacity = 1; lines[i].style.transform = 'none'; }
      return { state: st };
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { st.last = -1; st.loaded = false; ensureLoaded(); onScroll(); }, { passive: true });
    if (mq.addEventListener) mq.addEventListener('change', function () { st.last = -1; st.loaded = false; ensureLoaded(); apply(); });
    window.addEventListener('pageshow', function () { st.last = -1; apply(); });
    apply();
    return { state: st, apply: apply, progress: progress, which: which, sets: sets };
  }

  var booted = false;
  function boot() {
    if (booted) return;                 // never initialise twice: a duplicated
    booted = true;                      // include or a re-fired ready event
    document.documentElement.classList.add('char-v5');
    var hero = null, story = null;
    try { hero = initHero(); } catch (e) {}
    try { story = initStory(); } catch (e) {}
    window.__arentheChar = { hero: hero, story: story, reduced: reduced };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
