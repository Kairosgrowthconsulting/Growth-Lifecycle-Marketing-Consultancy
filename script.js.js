/* Kairos Growth Consulting — shared motion layer (pairs with kairos-motion.css).
   Vanilla JS, no dependencies, one file for every page.

   Safety model
   • Content is only ever hidden by CSS under  html.js , which this script adds
     only when it can actually run the animations (no reduced-motion request,
     IntersectionObserver available).
   • If anything throws during start-up the  js  class is removed again, so the
     page falls back to fully visible static content.
   • The hero entrance is released after 1.4s even if the rest never finishes.
   • The mobile menu code on each page is not touched or duplicated here. */
(function () {
  'use strict';
  if (window.KairosMotion) return;
  window.KairosMotion = true;

  var doc = document, root = doc.documentElement;

  function mq(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var motion = !reduce && 'IntersectionObserver' in window;

  if (motion) {
    root.classList.add('js');
    setTimeout(function () { root.classList.add('m-ready'); }, 1400); /* failsafe */
  }

  function safe(name, fn) {
    try { fn(); } catch (e) { if (window.console && console.warn) console.warn('[kairos-motion] ' + name, e); }
  }

  /* ───────── helpers ───────── */
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function raf(fn) { return (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(fn); }

  /* ───────── 1. nav: active link, → arrows, progress line, scroll state ───────── */
  var nav, bar;

  function markActiveLink() {
    var links = $all('.nav-links a:not(.nav-cta)');
    if (!links.length || links.some(function (a) { return a.classList.contains('active'); })) return;
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    links.forEach(function (a) {
      var h = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
      if (h && h === file) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
    });
  }

  /* Wrap a trailing "→" in links so it can nudge on hover (text stays identical) */
  function wrapArrows() {
    $all('a').forEach(function (a) {
      var n = a.lastChild;
      if (!n || n.nodeType !== 3) return;
      var m = /^([\s\S]*?)(\s*)(→)(\s*)$/.exec(n.nodeValue);
      if (!m) return;
      n.nodeValue = m[1] + m[2];
      var s = doc.createElement('span');
      s.className = 'm-arrow'; s.setAttribute('aria-hidden', 'true'); s.textContent = '→';
      a.appendChild(s);
      if (m[4]) a.appendChild(doc.createTextNode(m[4]));
    });
  }

  function addProgress() {
    if (!nav) return;
    bar = doc.createElement('div');
    bar.className = 'm-progress'; bar.setAttribute('aria-hidden', 'true');
    nav.appendChild(bar);
  }

  var ticking = false, lastY = -1, heroRing = null, pending = null;
  function onScrollFrame() {
    ticking = false;
    var y = window.pageYOffset || root.scrollTop || 0;
    if (nav) nav.classList.toggle('is-scrolled', y > 40);
    if (bar) {
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      bar.style.setProperty('--p', Math.min(1, Math.max(0, y / max)).toFixed(4));
    }
    if (heroRing && motion && y < window.innerHeight * 1.3) heroRing.style.setProperty('--py', (y * 0.07).toFixed(1) + 'px');
    /* bottom of page: reveal anything the observer's margin kept hidden */
    if (pending && pending.size && y + window.innerHeight >= root.scrollHeight - 6) flushAll();
    lastY = y;
  }
  function setupScroll() {
    heroRing = doc.querySelector('.hero-ring');
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; raf(onScrollFrame); }
    }, { passive: true });
    window.addEventListener('resize', function () { if (!ticking) { ticking = true; raf(onScrollFrame); } }, { passive: true });
    onScrollFrame();
  }

  /* ───────── 2. hero: glows, orbit, split headline, pointer parallax ───────── */
  function glow(cls) {
    var g = doc.createElement('div');
    g.className = 'm-glow' + (cls ? ' ' + cls : ''); g.setAttribute('aria-hidden', 'true');
    return g;
  }

  function splitHeadline(h1) {
    if (!h1.querySelector('br') || h1.querySelector('.m-line')) return false;
    var groups = [[]];
    Array.prototype.slice.call(h1.childNodes).forEach(function (n) {
      if (n.nodeName === 'BR') groups.push([]); else groups[groups.length - 1].push(n);
    });
    groups = groups.filter(function (g) { return g.some(function (n) { return (n.textContent || '').trim(); }); });
    if (groups.length < 2) return false;
    while (h1.firstChild) h1.removeChild(h1.firstChild);
    groups.forEach(function (g, i) {
      var s = doc.createElement('span');
      s.className = 'm-line'; s.style.setProperty('--i', i);
      g.forEach(function (n) { s.appendChild(n); });
      /* keep natural word spacing for search engines / screen readers */
      var first = s.firstChild, last = s.lastChild;
      if (first && first.nodeType === 3) first.nodeValue = first.nodeValue.replace(/^\s+/, '');
      if (last && last.nodeType === 3) last.nodeValue = last.nodeValue.replace(/\s+$/, '');
      h1.appendChild(s);
      if (i < groups.length - 1) h1.appendChild(doc.createTextNode(' '));
    });
    return true;
  }

  function prepHeroes() {
    $all('.hero, .page-hero, .cta-band, .contact-left').forEach(function (sec) {
      var isHero = sec.classList.contains('hero') || sec.classList.contains('page-hero');
      sec.insertBefore(glow(), sec.firstChild);
      if (isHero) sec.insertBefore(glow('is-b'), sec.firstChild);

      if (isHero) {
        /* pages whose hero has no entrance classes (insights) get them */
        if (!sec.querySelector('[class*="anim-"]')) {
          var c = sec.querySelector('.page-hero-content') || sec;
          var eb = c.querySelector('.page-hero-eyebrow, .hero-eyebrow'), h = c.querySelector('h1'), p = c.querySelector('p');
          if (eb) eb.classList.add('anim-1');
          if (h) h.classList.add('anim-2');
          if (p) p.classList.add('anim-3');
          var act = c.querySelector('.hero-actions, .page-hero-actions'); if (act) act.classList.add('anim-4');
        }
        var h1 = sec.querySelector('h1');
        if (h1 && splitHeadline(h1)) sec.classList.add('m-has-split');
      }
    });

    var ring = doc.querySelector('.hero-ring');
    if (ring) { var o = doc.createElement('div'); o.className = 'm-orbit'; o.setAttribute('aria-hidden', 'true'); ring.appendChild(o); }
  }

  function setupPointerParallax() {
    if (!finePointer) return;
    $all('.hero, .page-hero').forEach(function (sec) {
      var f = 0, px = 0, py = 0;
      sec.addEventListener('pointermove', function (e) {
        var r = sec.getBoundingClientRect();
        px = ((e.clientX - r.left) / r.width - 0.5) * 2;
        py = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!f) f = raf(function () {
          f = 0;
          sec.style.setProperty('--mx', px.toFixed(3)); sec.style.setProperty('--my', py.toFixed(3));
        });
      }, { passive: true });
      sec.addEventListener('pointerleave', function () { sec.style.setProperty('--mx', 0); sec.style.setProperty('--my', 0); });
    });
  }

  /* Decorative loops pause while off-screen */
  function setupPause() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('m-off', !e.isIntersecting); });
    }, { threshold: 0 });
    $all('.hero, .page-hero, .cta-band, .contact-left').forEach(function (s) { io.observe(s); });
  }

  /* ───────── 3. scroll reveals (staggered) ───────── */
  var MAP = [
    ['.svc-meta', 'left'], ['.svc-item', 'scale'], ['.outcome-bar', 'wipe'], ['.diff-row', 'left'],
    ['.expertise-quote', 'wipe'], ['.case-full-hero', 'wipe'], ['.case-hero-kpi', 'left'], ['.case-steps li', 'left'],
    ['.timeline-bar', 'wipe'], ['.case-divider', 'line'], ['.filter-btn', 'scale'], ['.client-logo-pill', 'scale'],
    ['.testi-card', 'scale'], ['.svc-card', 'scale'], ['.phil-card', 'scale'], ['.wwd-card', 'scale'],
    ['.insight-feat', 'wipe'], ['.insight-card', 'scale'], ['.case-card', 'scale'], ['.case-row', ''],
    ['.contact-detail', 'left'], ['.newsletter-inner > *', ''], ['.cta-band > *:not(.m-glow)', ''],
    ['footer .footer-brand', ''], ['footer .footer-col', ''], ['footer .footer-bottom', 'fade']
  ];
  var SPOT = '.svc-card,.case-card,.phil-card,.wwd-card,.testi-card,.svc-item,.insight-card,.insight-feat';

  function tagReveals() {
    MAP.forEach(function (pair) {
      $all(pair[0]).forEach(function (el) {
        if (el.classList.contains('reveal')) return;
        if (el.closest('nav, aside, .hero, .page-hero, .contact-left')) return;
        el.classList.add('reveal');
        if (pair[1]) el.setAttribute('data-r', pair[1]);
      });
    });
    $all(SPOT).forEach(function (el) { el.setAttribute('data-spot', ''); });
  }

  var revealIO;
  pending = new Set();

  function reveal(list) {
    var seen = new Map();
    list.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (Math.round(ra.top / 12) - Math.round(rb.top / 12)) || (ra.left - rb.left);
    });
    list.forEach(function (el) {
      pending.delete(el);
      if (revealIO) revealIO.unobserve(el);
      var k = el.parentNode, n = seen.get(k) || 0; seen.set(k, n + 1);
      var d = Math.min(n * 0.09, 0.54);
      el.style.setProperty('--rd', d + 's');
      el.classList.add('m-in');
      /* hand control back to the element's own hover transitions once done */
      setTimeout(function () {
        el.classList.remove('reveal', 'm-in');
        el.removeAttribute('data-r');
        el.style.removeProperty('--rd');
      }, (d + 1.15) * 1000);
    });
  }
  function flushAll() { reveal(Array.from(pending)); }

  function setupReveal() {
    var els = $all('.reveal');
    revealIO = new IntersectionObserver(function (entries) {
      var hit = [];
      entries.forEach(function (e) {
        /* wipe / line elements are clipped to a sliver, so any overlap counts */
        var any = /^(wipe|line)$/.test(e.target.getAttribute('data-r') || '');
        if (e.isIntersecting && (any || e.intersectionRatio >= 0.12)) hit.push(e.target);
      });
      if (hit.length) reveal(hit);
    }, { threshold: [0, 0.12], rootMargin: '0px 0px -4% 0px' });
    els.forEach(function (el) { pending.add(el); revealIO.observe(el); });
  }

  /* Big service numerals light up while their section is centred */
  function setupSpy() {
    var secs = $all('.svc-section');
    if (!secs.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-active', e.isIntersecting); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* ───────── 4. count-up (existing numbers only; ends on the exact original text) ───────── */
  var COUNT_SEL = '.hero-stat strong, .m-item strong, .case-metric strong, .case-kpi strong, .case-hero-kpi strong, .track-item strong, .proof-item strong';

  function setupCounters() {
    var items = [];
    $all(COUNT_SEL).forEach(function (el) {
      if (el.children.length) return;
      var txt = el.textContent.trim();
      var m = /^(\D*?)(\d+(?:\.\d+)?)(\D*)$/.exec(txt);
      if (!m) return;
      var num = parseFloat(m[2]);
      if (!isFinite(num) || num === 0) return;
      var dec = (m[2].split('.')[1] || '').length;
      var vis = doc.createElement('span'); vis.className = 'm-count'; vis.setAttribute('aria-hidden', 'true');
      var sr = doc.createElement('span'); sr.className = 'm-sr'; sr.textContent = txt;
      vis.textContent = m[1] + (0).toFixed(dec) + m[3];
      el.textContent = ''; el.appendChild(vis); el.appendChild(sr);
      items.push({ el: el, vis: vis, pre: m[1], suf: m[3], num: num, dec: dec, txt: txt });
    });
    if (!items.length) return;

    function run(it) {
      it.vis.textContent = it.txt;                       /* measure the final width so nothing jumps */
      var w = it.vis.getBoundingClientRect().width;
      if (w) it.vis.style.minWidth = Math.ceil(w) + 'px';
      it.vis.textContent = it.pre + (0).toFixed(it.dec) + it.suf;
      var t0 = null, dur = 1700;
      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        it.vis.textContent = p >= 1 ? it.txt : it.pre + (it.num * e).toFixed(it.dec) + it.suf;
        if (p < 1) raf(step); else it.vis.style.minWidth = '';
      }
      raf(step);
    }

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var it = items.filter(function (x) { return x.el === e.target; })[0];
        if (!it) return;
        var inHero = !!it.el.closest('.hero, .page-hero');
        setTimeout(function () { run(it); }, inHero ? 850 : 120);
      });
    }, { threshold: 0.5 });
    items.forEach(function (it) { io.observe(it.el); });
  }

  /* ───────── 5. cursor-following gold light inside cards ───────── */
  function setupSpotlight() {
    if (!finePointer) return;
    var f = 0, tgt = null, x = 0, y = 0;
    doc.addEventListener('pointermove', function (e) {
      var c = e.target && e.target.closest ? e.target.closest('[data-spot]') : null;
      if (!c) return;
      tgt = c; x = e.clientX; y = e.clientY;
      if (!f) f = raf(function () {
        f = 0;
        var r = tgt.getBoundingClientRect();
        tgt.style.setProperty('--sx', (x - r.left) + 'px'); tgt.style.setProperty('--sy', (y - r.top) + 'px');
      });
    }, { passive: true });
  }

  /* ───────── start ───────── */
  function init() {
    nav = doc.getElementById('main-nav');
    safe('active-link', markActiveLink);
    safe('arrows', wrapArrows);
    safe('progress', addProgress);
    safe('scroll', setupScroll);
    if (!motion) return;

    try {
      prepHeroes();
      tagReveals();
      setupReveal();
      setupCounters();
      setupSpy();
      setupPointerParallax();
      setupSpotlight();
      setupPause();
    } catch (e) {
      /* anything unexpected: drop back to the plain, fully visible page */
      root.classList.remove('js');
      if (window.console && console.warn) console.warn('[kairos-motion] disabled after error', e);
      return;
    }
    root.classList.add('m-ready');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
