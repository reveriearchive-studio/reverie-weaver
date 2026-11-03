/*
  Reverie Weaver site: the only script.

  Everything here is local. No network, no storage, no cookies, no tracking. It does six small things:
    1. Tints the closing sky to the visitor's local hour, using the app's own time-of-day palette.
    2. Greets by hour and weekday, the way the Desk header does.
    3. Fills in the footer year.
    4. Reveals sections as they scroll into view.
    5. Draws the reading thread across the top and lights the current chapter on the side rail.
    6. Turns the constellation index into cards that turn over.
  Without JavaScript the page is complete and readable; the reveals and flips are enhancements.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var now = new Date();
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // 1. Sky. Minute-of-day buckets; `dark` buckets get light text over a soft veil so contrast always holds.
  //    The colors are the app's exact ReverieWeaverBackground hexes (same table the privacy page uses).
  var table = [
    { lt: 120,  c: ['#1A1612', '#2C2520', '#3D3530', '#4A3F35'], dark: true },   // 12-2 AM
    { lt: 300,  c: ['#0D1B2A', '#1B263B', '#415A77', '#1B263B'], dark: true },   // 2-5 AM deep night
    { lt: 420,  c: ['#2B4162', '#73628A', '#E8B4B8', '#FFD5C2'], dark: true },   // 5-7 AM dawn
    { lt: 540,  c: ['#FFE5D4', '#FFF4E6', '#E8F4F8', '#FFF8DC'], dark: false },  // 7-9 AM
    { lt: 720,  c: ['#FFF9F0', '#E3F2FD', '#FFFEF7', '#F0F8FF'], dark: false },  // 9-12
    { lt: 900,  c: ['#FFFDF7', '#FFF8E1', '#E1F5FE', '#FFFEF9'], dark: false },  // 12-3 PM
    { lt: 1020, c: ['#FFF4E0', '#FFE9C5', '#E8EAF6', '#FFF0D4'], dark: false },  // 3-5 PM
    { lt: 1140, c: ['#D48E70', '#BF8090', '#9070A0', '#6B5E90'], dark: true },   // 5-7 PM golden hour
    { lt: 1200, c: ['#D48E70', '#A07898', '#7A6A95', '#4E5A8A'], dark: true },   // 7-8 PM early dusk
    { lt: 1320, c: ['#A07060', '#7E6388', '#5A5085', '#3B4578'], dark: true },   // 8-10 PM deep dusk
    { lt: 1440, c: ['#1A1612', '#2C2520', '#3D3530', '#4A3F35'], dark: true }    // 10 PM-12
  ];
  var minute = now.getHours() * 60 + now.getMinutes();
  var pick = table[table.length - 1];
  for (var i = 0; i < table.length; i++) {
    if (minute < table[i].lt) { pick = table[i]; break; }
  }
  root.style.setProperty('--sky-1', pick.c[0]);
  root.style.setProperty('--sky-2', pick.c[1]);
  root.style.setProperty('--sky-3', pick.c[2]);
  root.style.setProperty('--sky-4', pick.c[3]);
  root.style.setProperty('--band-ink', pick.dark ? '#FFF8F0' : '#2B2B2B');
  root.style.setProperty('--band-veil', pick.dark ? 'rgba(18, 12, 26, .38)' : 'rgba(255, 248, 240, 0)');

  // 2. Greeting: the same hour bands as the Desk header (before noon, before 5 PM, before 9 PM, then night).
  var hour = now.getHours();
  var hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  each('[data-greeting]', function (el) { el.textContent = hello + ', ' + days[now.getDay()] + '.'; });

  // 3. Year.
  each('[data-year]', function (el) { el.textContent = String(now.getFullYear()); });

  // 4. Reveal on scroll (staggered with data-delay in tenths of a second).
  var reveals = document.querySelectorAll('.reveal');
  each('.reveal[data-delay]', function (el) { el.style.setProperty('--d', (Number(el.getAttribute('data-delay')) / 10) + 's'); });
  if ('IntersectionObserver' in window && !reduce) {
    var show = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); show.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    for (var r = 0; r < reveals.length; r++) { show.observe(reveals[r]); }
  } else {
    for (var q = 0; q < reveals.length; q++) { reveals[q].classList.add('in'); }
  }

  // 5. Reading thread (top bar) and the chapter rail.
  var bar = document.querySelector('.thread-top b');
  if (bar) {
    var ticking = false;
    var paint = function () {
      var max = root.scrollHeight - root.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(root.scrollTop / max, 1) : 0).toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  var railLinks = document.querySelectorAll('.rail a[href^="#"]');
  if (railLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    for (var k = 0; k < railLinks.length; k++) { byId[railLinks[k].getAttribute('href').slice(1)] = railLinks[k]; }
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        for (var id in byId) { byId[id].removeAttribute('aria-current'); }
        if (byId[e.target.id]) { byId[e.target.id].setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (var id in byId) {
      var target = document.getElementById(id);
      if (target) { watch.observe(target); }
    }
  }

  // 6. Constellation index: plain markup until now. Here each card becomes a button that turns over
  //    to show the hint on its back. The accessible name comes from whichever face is showing.
  each('.cstar', function (card) {
    var front = card.querySelector('.front');
    var back = card.querySelector('.back');
    if (!front || !back) { return; }
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', 'false');
    back.setAttribute('aria-hidden', 'true');
    var flip = function () {
      var on = card.getAttribute('aria-pressed') === 'true';
      card.setAttribute('aria-pressed', on ? 'false' : 'true');
      front.setAttribute('aria-hidden', on ? 'false' : 'true');
      back.setAttribute('aria-hidden', on ? 'true' : 'false');
    };
    card.addEventListener('click', flip);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); flip(); }
    });
  });

  function each(selector, fn) {
    var list = document.querySelectorAll(selector);
    for (var n = 0; n < list.length; n++) { fn(list[n]); }
  }
})();
