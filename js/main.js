/* ============================================================
   ARENTHE HOLDINGS — motion system v3
   GSAP 3 + ScrollTrigger (vendored in assets/vendor/).

   Character system: four APPROVED keyframes (locked designs) plus
   three short transparent video clips generated between them.

     KF-A  before   — basketball spins on the fingertip, detailed
                      house charm on the gold key ring
     KF-B  anticipation — glance at the ball, wrist tension
     KF-C  after    — objects exchanged: house on finger, ball charm
     KF-D  finish   — confident grin, settled

     anim-walk.webm    empty frame → walks in → lands exactly on KF-A
     anim-idle.webm    KF-A → KF-A loopable ball-spinning idle
     anim-finish.webm  KF-C → KF-D house spin + grin settle

   The magical EXCHANGE is deliberately composited in code (never
   generated): KF-B and KF-C swap behind a synchronized double poof,
   which makes duplicate or hybrid objects impossible.

   Modes (auto-selected by asset probing + device):
     cinema  — desktop: video clips + composite exchange
     stills  — keyframes + life motion + composite exchange
     legacy  — the stable original artwork + life motion
     reduced — static poses + one gentle crossfade
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- CONFIG ---------------- */
  // ASSET_VER busts caches so the browser can never show older animation
  // files after an asset update. Bump it whenever assets/char/ changes.
  var ASSET_VER = '?v=3';
  var ASSETS = {
    charFull:  'assets/char/char-full.webp',     // original artwork (fallback + CTA)
    kfA: 'assets/char/kf-a.webp' + ASSET_VER,
    kfB: 'assets/char/kf-b.webp' + ASSET_VER,
    kfC: 'assets/char/kf-c.webp' + ASSET_VER,
    kfD: 'assets/char/kf-d.webp' + ASSET_VER,
    animWalk:   'assets/char/anim-walk.webm' + ASSET_VER,
    animIdle:   'assets/char/anim-idle.webm' + ASSET_VER,
    animFinish: 'assets/char/anim-finish.webm' + ASSET_VER,
    // Safari tier — identical clips as alpha animated WebP (Safari 14+)
    awWalk:   'assets/char/anim-walk.webp' + ASSET_VER,
    awIdle:   'assets/char/anim-idle.webp' + ASSET_VER,
    awFinish: 'assets/char/anim-finish.webp' + ASSET_VER
  };
  // Animated-WebP clip durations (frames / fps), used for timer sequencing
  // because <img> provides no 'ended' event.
  var AW_MS = { walk: 5100, idle: 5100, finish: 4100 };

  // Poof anchors as % of the keyframe box — auto-detected object centroids
  // (basketball on the fingertip / house charm on the ring, KF-A geometry)
  var ANCHORS = { pfx: '30.5%', pfy: '29.6%', pkx: '70%', pky: '59.3%' };
  // Swirl overlay centered on the spinning house (KF-D geometry) or the
  // original artwork's house (legacy)
  var SWIRL = { stills: { x: '29%', y: '14.5%' }, legacy: { x: '3%', y: '15%' } };

  var TIMING = {
    idleBeforeTrick: 1.6,   // stills mode: idle time before the exchange
    videoTimeout: 3000      // ms to wait for a clip before falling back
  };

  var docEl = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                      /(\?|&)rigreduced=1/.test(location.search);   // dev-only QA override
  var isMobile = function () { return window.innerWidth < 960; };
  var AMP = function () { return isMobile() ? 0.6 : 1; };

  /* ---------------- boot gates ---------------- */
  if (!window.gsap || !window.ScrollTrigger) {
    docEl.classList.remove('js');
    initNavBasics();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out' });

  var seenEntrance = false, trickDone = false;
  try {
    seenEntrance = sessionStorage.getItem('arenthe_seen') === '1';
    trickDone = sessionStorage.getItem('arenthe_trick') === '1';
  } catch (e) {}
  var landedMidPage = window.scrollY > window.innerHeight * 0.5;

  var started = false;
  document.addEventListener('DOMContentLoaded', start);
  if (document.readyState !== 'loading') start();

  function start() {
    if (started) return;
    started = true;
    docEl.classList.add('gsap-ready');

    initNavBasics();
    initProgress();

    // ------------------------------------------------------------------
    // STABLE MODE (2026-08-07): the v3 generative clips failed visual
    // review. The site runs the legacy tier only — the original caricature
    // artwork with subtle code-driven life motion (rise-in, breathing,
    // sway). No video, no keyframe swaps, no exchange. The v3 assets stay
    // on disk for reference but nothing below loads them while
    // STABLE_STATIC is true. Remove the flag only after the deterministic
    // 2D rig passes its approval gates.
    // ------------------------------------------------------------------
    var STABLE_STATIC = true;
    if (STABLE_STATIC) { boot({ stills: false }); }
    else probeImages(['kfA', 'kfB', 'kfC', 'kfD'], function (ok) {
      boot({ stills: ok.kfA && ok.kfB && ok.kfC && ok.kfD });
    });

    function boot(caps) {
      if (reducedMotion) {
        if (!window.__rigActive) initReduced(caps);
        else { ['tLine1','tLine2','tLine3'].forEach(function(id){ var el=document.getElementById(id); if(el){el.style.opacity=1;el.style.transform='none';} }); var sec=document.querySelector('.transform'); if(sec) sec.classList.add('is-static'); }
        markSeen();
        return;
      }

      initReveals();
      if (document.querySelector('.path-steps')) initPositioning();
      if (document.getElementById('ghostWord')) initMeaning();
      if (document.getElementById('tChar') && !window.__rigActive) initStory(caps);
      if (document.getElementById('ctaChar')) initCTA();
      // initHero always runs: it owns the hero COPY entrance. Character motion
      // is handled inside according to window.__rigActive.
      if (document.getElementById('heroChar')) initHero(caps);

      // If the rig later fails (asset error / timeout), rig-site.js restores the
      // legacy markup and calls this hook: the stable v3.3 behavior takes over.
      window.__rigFallback = function () {
        if (window.__rigFallbackDone) return;
        window.__rigFallbackDone = true;
        if (reducedMotion) return;                       // static artwork is already correct
        if (window.__heroCharBoot) window.__heroCharBoot();
        if (document.getElementById('tChar')) initStory(caps);
        ScrollTrigger.refresh();
      };

      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
  }

  function markSeen() { try { sessionStorage.setItem('arenthe_seen', '1'); } catch (e) {} }
  function markTrick() { trickDone = true; try { sessionStorage.setItem('arenthe_trick', '1'); } catch (e) {} }

  function probeImages(keys, cb) {
    var ok = {}, pending = keys.length, finished = false;
    var guard = setTimeout(finish, 4000);
    function finish() { if (!finished) { finished = true; clearTimeout(guard); cb(ok); } }
    keys.forEach(function (k) {
      var img = new Image();
      img.onload = function () { ok[k] = true; if (--pending === 0) finish(); };
      img.onerror = function () { ok[k] = false; if (--pending === 0) finish(); };
      img.src = ASSETS[k];
    });
  }

  /* ============================================================
     NAV / progress (unchanged)
     ============================================================ */
  function initNavBasics() {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('mobileMenu');

    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var lastFocus = null;
    function openMenu() {
      lastFocus = document.activeElement;
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('open'); });
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      document.body.style.overflow = 'hidden';
      var first = menu.querySelector('a');
      if (first) first.focus();
    }
    function closeMenu() {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
      setTimeout(function () { menu.hidden = true; }, 350);
      if (lastFocus) lastFocus.focus();
    }
    toggle.addEventListener('click', function () { menu.hidden ? openMenu() : closeMenu(); });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' || e.target === menu) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) closeMenu();
      if (e.key === 'Tab' && !menu.hidden) {
        var links = menu.querySelectorAll('a');
        var first = links[0], last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Keep one—and only one—homepage section active. The marker sits below
    // the fixed header and follows the document order, so long animated scenes
    // do not leave two navigation items highlighted at the same time.
    var sectionLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav-section]'));
    if (sectionLinks.length) {
      var sectionIds = [];
      sectionLinks.forEach(function (link) {
        var id = link.getAttribute('data-nav-section');
        if (sectionIds.indexOf(id) === -1 && document.getElementById(id)) sectionIds.push(id);
      });

      var navTicking = false;
      function setActiveSection() {
        navTicking = false;
        var marker = window.scrollY + Math.max(nav.offsetHeight + 24, window.innerHeight * 0.22);
        var activeId = sectionIds[0] || '';
        sectionIds.forEach(function (id) {
          var section = document.getElementById(id);
          if (section && section.offsetTop <= marker) activeId = id;
        });
        sectionLinks.forEach(function (link) {
          var isActive = link.getAttribute('data-nav-section') === activeId;
          link.classList.toggle('is-active', isActive);
          if (isActive) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
      function requestNavUpdate() {
        if (navTicking) return;
        navTicking = true;
        requestAnimationFrame(setActiveSection);
      }

      window.addEventListener('scroll', requestNavUpdate, { passive: true });
      window.addEventListener('resize', requestNavUpdate, { passive: true });
      window.addEventListener('load', requestNavUpdate);
      sectionLinks.forEach(function (link) { link.addEventListener('click', requestNavUpdate); });
      setActiveSection();
    }
  }

  function initProgress() {
    var bar = document.getElementById('scrollProgressBar');
    if (!bar) return;
    if (reducedMotion) { bar.style.display = 'none'; return; }
    gsap.to(bar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'max', scrub: 0.4 }
    });
  }

  /* ============================================================
     Life motion helpers
     ============================================================ */
  function makeBreath(el) {
    return gsap.to(el, {
      scaleY: 1.0038, transformOrigin: '50% 100%',
      duration: 1.7, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true
    });
  }
  function makeSway(el) {
    return gsap.fromTo(el, { rotation: -0.32 }, {
      rotation: 0.32, transformOrigin: '50% 100%',
      duration: 2.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.6, paused: true
    });
  }

  function poofBurst(container, radius) {
    var bits = container.querySelectorAll('span');
    var ring = container.querySelector('.poof-ring');
    var tl = gsap.timeline();
    bits.forEach(function (el, i) {
      var angle = (i / bits.length) * Math.PI * 2 + (i % 2 ? 0.4 : 0);
      var dist = radius * (0.55 + (i % 4) * 0.18);
      tl.fromTo(el, { x: 0, y: 0, opacity: 0, scale: 0.4 }, {
        x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.85,
        opacity: 1, scale: 1, duration: 0.22, ease: 'power2.out'
      }, i % 3 * 0.02)
      .to(el, { opacity: 0, scale: 0.2, duration: 0.2, ease: 'power1.in' }, 0.24 + (i % 3) * 0.02);
    });
    if (ring) {
      tl.fromTo(ring, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.5, duration: 0.16, ease: 'power2.out' }, 0)
        .to(ring, { opacity: 0, scale: 2.3, duration: 0.24, ease: 'power1.in' }, 0.14);
    }
    return tl;
  }

  /* ============================================================
     SCENE 1 · HERO
     ============================================================ */
  function initHero(caps) {
    var rig = document.getElementById('heroChar');
    var bob = document.getElementById('heroCharBob');
    var legacy = document.getElementById('charLegacy');
    var kf = { A: document.getElementById('kfA'), B: document.getElementById('kfB'),
               C: document.getElementById('kfC'), D: document.getElementById('kfD') };
    var vidWalk = document.getElementById('vidWalk');
    var vidLoop = document.getElementById('vidLoop');
    var poofF = document.getElementById('poofFinger');
    var poofK = document.getElementById('poofKey');
    var words = gsap.utils.toArray('.hero-title .wi');
    var fades = gsap.utils.toArray('[data-hero="fade"]');
    var eyebrow = document.querySelector('[data-hero="eyebrow"]');
    var baseline = document.querySelector('[data-hero="baseline"]');
    var cue = document.querySelector('[data-hero="cue"]');

    // Gate 5: when the approved deterministic rig owns the character, this
    // function only plays the hero COPY entrance. All character logic stays
    // dormant unless the rig fails and calls window.__heroCharBoot.
    var rigOwnsChar = !!window.__rigActive;

    var stills = caps.stills;
    if (stills) {
      Object.keys(kf).forEach(function (k) { kf[k].src = ASSETS['kf' + k]; });
      rig.style.setProperty('--pf-x', ANCHORS.pfx);
      rig.style.setProperty('--pf-y', ANCHORS.pfy);
      rig.style.setProperty('--pk-x', ANCHORS.pkx);
      rig.style.setProperty('--pk-y', ANCHORS.pky);
    }

    var life = { breath: makeBreath(bob), sway: makeSway(rig) };
    function lifeOn() { life.breath.play(); life.sway.play(); }
    function lifeOff() { life.breath.pause(); life.sway.pause(); }

    // ---- frame helpers: exactly one visible base at a time ----
    function showFrame(name, fade) {
      var targets = { legacy: legacy, A: kf.A, B: kf.B, C: kf.C, D: kf.D };
      Object.keys(targets).forEach(function (k) {
        var el = targets[k];
        if (!el) return;
        if (k === name) gsap.to(el, { opacity: 1, duration: fade || 0 });
        else gsap.to(el, { opacity: 0, duration: fade || 0 });
      });
    }
    function hideVideos() {
      if (vidWalk) { gsap.set(vidWalk, { opacity: 0 }); vidWalk.pause(); }
      if (vidLoop) { gsap.set(vidLoop, { opacity: 0 }); vidLoop.pause(); }
    }

    // ---- video loader with runtime alpha verification ----
    var alphaOK = null;
    function loadClip(el, src) {
      return new Promise(function (resolve) {
        var done = false;
        var t = setTimeout(function () { if (!done) { done = true; resolve(false); } }, TIMING.videoTimeout);
        function ready() {
          if (done) return;
          if (alphaOK === null) {
            try {
              var c = document.createElement('canvas'); c.width = 8; c.height = 8;
              var ctx = c.getContext('2d');
              ctx.drawImage(el, 0, 0, 8, 8);
              alphaOK = ctx.getImageData(0, 0, 2, 2).data[3] < 16;
            } catch (e) { alphaOK = false; }
          }
          done = true; clearTimeout(t); resolve(alphaOK);
        }
        el.addEventListener('loadeddata', ready, { once: true });
        el.addEventListener('error', function () { if (!done) { done = true; clearTimeout(t); resolve(false); } }, { once: true });
        el.src = src; el.load();
      });
    }

    /* ----- the composite exchange: KF-B → double poof → KF-C ----- */
    var exchanging = false;
    function playExchange(onDone) {
      if (trickDone) { onDone && onDone(); return; }
      exchanging = true;
      var tl = gsap.timeline({ onComplete: function () {
        exchanging = false; markTrick(); onDone && onDone();
      } });
      tl.add(function () { showFrame('B', 0.15); }, 0)
        .add(poofBurst(poofF, 46), 0.55)
        .add(poofBurst(poofK, 26), 0.59)
        .add(function () { showFrame('C', 0.2); }, 0.69)   // hidden behind the burst peak
        .to({}, { duration: 0.5 }, 0.9);                    // settle beat
      return tl;
    }

    // Resolve instantly to the finished state (scroll-away, tab switch…)
    var animEl = document.getElementById('animFallback');
    var awTimers = [];
    function settleAll() {
      hideVideos();
      awTimers.forEach(clearTimeout); awTimers = [];
      if (animEl) gsap.set(animEl, { opacity: 0 });
      if (stills) showFrame(trickDone || !exchanging ? 'D' : 'D', 0);
      else showFrame('legacy', 0);
      markTrick();
      lifeOn();
    }

    /* ----- Safari tier: the same choreography from animated WebP ----- */
    function beginWebpFlow() {
      var probe = new Image();
      var guard = setTimeout(beginStillsFlow, 4000);
      probe.onerror = function () { clearTimeout(guard); beginStillsFlow(); };
      probe.onload = function () {
        clearTimeout(guard);
        if (trickDone) { beginStillsFlow(); return; }
        gsap.set([legacy, kf.A, kf.B, kf.C, kf.D], { opacity: 0 });
        gsap.set(rig, { opacity: 1 });
        animEl.src = ASSETS.awWalk;                       // cached; plays once, holds last frame
        gsap.fromTo(animEl, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        awTimers.push(setTimeout(function () {            // walk done → KF-A idle beat
          showFrame('A', 0);
          gsap.set(animEl, { opacity: 0 });
          lifeOn();
          var idleImg = new Image();
          var idleGuard = setTimeout(runExchange, 1600);  // idle clip optional
          idleImg.onload = function () {
            clearTimeout(idleGuard);
            if (trickDone) return;
            gsap.set(kf.A, { opacity: 0 });
            animEl.src = ASSETS.awIdle;
            gsap.set(animEl, { opacity: 1 });
            awTimers.push(setTimeout(function () {
              gsap.set(animEl, { opacity: 0 });
              runExchange();
            }, AW_MS.idle));
          };
          idleImg.onerror = function () { clearTimeout(idleGuard); };
          idleImg.src = ASSETS.awIdle;
        }, AW_MS.walk));
        function runExchange() {
          if (trickDone) return;
          lifeOff();
          playExchange(function () {
            var finImg = new Image();
            var finGuard = setTimeout(function () { showFrame('D', 0.25); lifeOn(); }, 2000);
            finImg.onload = function () {
              clearTimeout(finGuard);
              gsap.set(kf.C, { opacity: 0 });
              animEl.src = ASSETS.awFinish;
              gsap.set(animEl, { opacity: 1 });
              awTimers.push(setTimeout(lifeOn, AW_MS.finish)); // holds final grin frame
            };
            finImg.onerror = function () { clearTimeout(finGuard); showFrame('D', 0.25); lifeOn(); };
            finImg.src = ASSETS.awFinish;
          });
        }
      };
      probe.src = ASSETS.awWalk;
    }

    ScrollTrigger.create({
      trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: function (self) {
        if (rigOwnsChar) return;               // rig-site.js owns the character
        if (self.isActive) { lifeOn(); }
        else if (!trickDone) { settleAll(); }
        else { lifeOff(); }
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (rigOwnsChar) return;                 // rig-site.js owns the character
      if (document.hidden) lifeOff(); else lifeOn();
    });

    /* ----- entrance + choreography ----- */
    var tl = gsap.timeline({ onComplete: markSeen });
    tl.to(baseline, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 0)
      .to(eyebrow, { opacity: 1, duration: 0.5 }, 0.1)
      .to(words, { y: 0, duration: 0.85, stagger: 0.09, ease: 'power4.out',
                   onStart: function () { words.forEach(function (w) { w.style.opacity = 1; }); } }, 0.15)
      .to(fades, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, startAt: { y: 18 } }, 0.5)
      .to(cue, { opacity: 1, duration: 0.6 }, 1.3);

    function riseIn(frame, done) {
      showFrame(frame, 0);
      gsap.fromTo(rig, { opacity: 0, y: 26 }, {
        opacity: 1, y: 0, duration: 0.75, ease: 'power2.out', delay: 0.45,
        onComplete: function () { lifeOn(); done && done(); }
      });
    }

    function beginStillsFlow() {
      if (trickDone) { riseIn('D'); return; }
      riseIn('A', function () {
        gsap.delayedCall(TIMING.idleBeforeTrick, function () {
          if (trickDone) return;
          playExchange(function () {
            gsap.delayedCall(0.35, function () { showFrame('D', 0.25); });
          });
        });
      });
    }

    function beginCinemaFlow() {
      // Walk clip → KF-A → idle clip (one pass) → exchange → finish clip → KF-D
      loadClip(vidWalk, ASSETS.animWalk).then(function (ok) {
        if (!ok && !trickDone) { beginWebpFlow(); return; }   // Safari tier
        if (!ok || trickDone) { beginStillsFlow(); return; }
        // The clip owns the stage: hide every still base while it plays.
        gsap.set([legacy, kf.A, kf.B, kf.C, kf.D], { opacity: 0 });
        gsap.set(rig, { opacity: 1 });
        // Ease his emergence at the clip edge instead of a hard pop-in.
        gsap.fromTo(vidWalk, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        vidWalk.play().catch(function () { beginStillsFlow(); });
        vidWalk.addEventListener('ended', function () {
          showFrame('A', 0);
          gsap.set(vidWalk, { opacity: 0 });
          lifeOn();
          // Decode clips one at a time — parallel VP9-alpha decodes can
          // crash constrained renderers. The KF-A idle beat covers the load.
          var idleReady = loadClip(vidLoop, ASSETS.animIdle);
          idleReady.then(function (idleOK) {
            if (trickDone) return;
            function toExchange() {
              gsap.set(vidLoop, { opacity: 0 }); vidLoop.pause();
              lifeOff();
              playExchange(function () {
                // Finish clip: KF-C → KF-D
                loadClip(vidLoop, ASSETS.animFinish).then(function (finOK) {
                  if (finOK && !document.hidden) {
                    gsap.set(vidLoop, { opacity: 1 });
                    showFrame('C', 0); gsap.set(kf.C, { opacity: 0 });
                    vidLoop.play().catch(function () { showFrame('D', 0.2); lifeOn(); });
                    vidLoop.addEventListener('ended', function () {
                      // Hold the clip's final frame as the resting pose (its grin
                      // develops slightly past KF-D); life motion resumes on the
                      // wrapper so the pause is invisible.
                      vidLoop.pause();
                      lifeOn();
                    }, { once: true });
                  } else { showFrame('D', 0.25); lifeOn(); }
                });
              });
            }
            if (idleOK) {
              lifeOff();                      // the clip carries its own life motion
              gsap.set(vidLoop, { opacity: 1 });
              gsap.set(kf.A, { opacity: 0 });
              vidLoop.play().catch(toExchange);
              vidLoop.addEventListener('ended', toExchange, { once: true });
            } else {
              gsap.delayedCall(TIMING.idleBeforeTrick, toExchange);
            }
          });
        }, { once: true });
      });
    }

    // Mode selection (character only) — dormant while the rig owns the stage
    function charBoot() {
      if (!stills) {
        // Legacy: stable original artwork with life motion
        if (seenEntrance || landedMidPage || isMobile()) { riseIn('legacy'); }
        else {
          showFrame('legacy', 0);
          gsap.fromTo(rig, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.75, delay: 0.6, onComplete: lifeOn });
        }
        return;
      }
      if (seenEntrance || landedMidPage) { riseIn(trickDone ? 'D' : 'A'); if (!trickDone) gsap.delayedCall(TIMING.idleBeforeTrick + 0.8, function () { if (!trickDone) playExchange(function () { gsap.delayedCall(0.35, function () { showFrame('D', 0.25); }); }); }); return; }
      if (isMobile()) { beginStillsFlow(); return; }
      beginCinemaFlow();
    }
    if (!rigOwnsChar) charBoot();
    else window.__heroCharBoot = function () { rigOwnsChar = false; charBoot(); };
  }

  /* ============================================================
     Reduced motion — static poses + one gentle crossfade
     ============================================================ */
  function initReduced(caps) {
    var section = document.querySelector('.transform');
    if (section) {
      section.classList.add('is-static');
      ['tLine1', 'tLine2', 'tLine3'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.style.opacity = 1; el.style.transform = 'none'; }
      });
      var tBase = document.getElementById('tCharBase');
      if (tBase && caps.stills) tBase.src = ASSETS.kfD;
    }
    var legacy = document.getElementById('charLegacy');
    var kfA = document.getElementById('kfA');
    var kfD = document.getElementById('kfD');
    if (legacy && caps.stills && kfA && kfD) {
      kfA.src = ASSETS.kfA; kfD.src = ASSETS.kfD;
      legacy.style.opacity = 0;
      kfA.style.opacity = 1;
      setTimeout(function () {
        kfA.style.transition = 'opacity 0.5s ease';
        kfD.style.transition = 'opacity 0.5s ease';
        kfA.style.opacity = 0;
        kfD.style.opacity = 1;
      }, 1600);
    }
  }

  /* ============================================================
     Reveals + supporting scenes (unchanged)
     ============================================================ */
  function initReveals() {
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      var delay = (parseInt(el.getAttribute('data-reveal-delay') || '0', 10)) * 0.12;
      gsap.fromTo(el, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.85, delay: delay, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });
    gsap.utils.toArray('.how-rule').forEach(function (rule, i) {
      gsap.to(rule, {
        scaleX: 1, duration: 0.9, delay: i * 0.1, ease: 'power2.inOut',
        scrollTrigger: { trigger: rule.parentElement, start: 'top 85%', once: true }
      });
    });
  }

  function initPositioning() {
    var line = document.getElementById('pathLine');
    if (!line) return;
    gsap.to(line, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.path-steps', start: 'top 80%', end: 'bottom 55%', scrub: 0.5 }
    });
  }

  function initMeaning() {
    var word = document.getElementById('ghostWord');
    if (!word) return;
    gsap.fromTo(word, { yPercent: -42 }, {
      yPercent: -58, ease: 'none',
      scrollTrigger: { trigger: '.meaning', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
    });
  }

  /* ============================================================
     SCENE 4 · STORY — post-trick scroll storytelling
     Gesture map (documented):
       line 1 "Every project starts with one decision."
              → he turns toward the copy (lean + shift), swirl brightens
       line 2 "Communities aren't built overnight."
              → he eases back; small acknowledging nod as the line lands
       line 3 Focus handoff → confident rest, swirl calms
     All values keyframed in one scrubbed timeline (reversible).
     ============================================================ */
  function initStory(caps) {
    var section = document.querySelector('.transform');
    var rig = document.getElementById('tChar');
    var base = document.getElementById('tCharBase');
    var swirl = document.getElementById('tSwirl');
    var line1 = document.getElementById('tLine1');
    var line2 = document.getElementById('tLine2');
    var line3 = document.getElementById('tLine3');

    if (caps.stills) {
      base.src = ASSETS.kfD;
      rig.style.setProperty('--ball-x', SWIRL.stills.x);
      rig.style.setProperty('--ball-y', SWIRL.stills.y);
    } else {
      rig.style.setProperty('--ball-x', SWIRL.legacy.x);
      rig.style.setProperty('--ball-y', SWIRL.legacy.y);
    }

    var life = { breath: makeBreath(rig) };
    ScrollTrigger.create({
      trigger: section, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { self.isActive ? life.breath.play() : life.breath.pause(); }
    });

    var a = AMP();
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top', end: 'bottom bottom',
        scrub: 0.65, invalidateOnRefresh: true
      },
      defaults: { ease: 'none' }
    });

    tl.fromTo(line1, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.04)
      .to(rig, { rotation: 1.3 * a, x: 10 * a, transformOrigin: '50% 100%', duration: 0.1 }, 0.05)
      .to(swirl, { opacity: 0.85, duration: 0.08 }, 0.06)
      .to(line1, { opacity: 0, y: -18, duration: 0.05, ease: 'power2.in' }, 0.34)

      .fromTo(line2, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.42)
      .to(rig, { rotation: 0, x: 0, duration: 0.12 }, 0.42)
      .to(rig, { y: 4, duration: 0.035, ease: 'power1.inOut' }, 0.56)
      .to(rig, { y: 0, duration: 0.05, ease: 'power1.out' }, 0.595)
      .to(line2, { opacity: 0, y: -18, duration: 0.05, ease: 'power2.in' }, 0.68)

      .fromTo(line3, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.07, ease: 'power2.out' }, 0.76)
      .to(swirl, { opacity: 0.3, duration: 0.12 }, 0.8);
  }

  /* ============================================================
     SCENE 8 · Closing figure (original artwork, unchanged)
     ============================================================ */
  function initCTA() {
    var fig = document.getElementById('ctaChar');
    if (!fig) return;
    fig.addEventListener('error', function () {
      fig.closest('.cta-figure').style.display = 'none';
    });
    var breathe = gsap.to(fig, {
      scale: 1.008, transformOrigin: '50% 100%', duration: 2.8,
      yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true
    });
    ScrollTrigger.create({
      trigger: '.cta', start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { self.isActive ? breathe.play() : breathe.pause(); }
    });
  }
})();
