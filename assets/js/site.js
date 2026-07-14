/* MyFy Premier — mobile menu toggle (no external calls) */
(function () {
  var btn = document.querySelector('.hamburger');
  var overlay = document.getElementById('mobile-overlay');
  if (!btn || !overlay) return;

  // Background regions to hide from assistive tech while the modal menu is open.
  // The <header> is deliberately NOT included: it holds the hamburger, which is
  // the menu's close control and must stay operable. main + footer are the
  // background content a screen reader should not be able to wander into.
  var background = [document.getElementById('main-content'), document.querySelector('.site-footer')];

  function focusable() {
    return overlay.querySelectorAll('a, button');
  }

  // aria-modal="true" on the overlay claims dialog behavior, so focus has to
  // actually move into it (and stay trapped there) to match — otherwise a
  // keyboard/screen-reader user can tab into page content hidden behind it.
  function set(open) {
    overlay.classList.toggle('open', open);
    btn.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    background.forEach(function (el) {
      if (!el) return;
      if (open) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
    if (open) {
      var items = focusable();
      if (items.length) items[0].focus();
    } else {
      btn.focus();
    }
  }

  btn.addEventListener('click', function () { set(!overlay.classList.contains('open')); });

  // If the viewport grows past the mobile breakpoint while the overlay is open,
  // CSS hides the hamburger (the only visible control), which would strand the
  // menu open over the desktop layout with scroll still locked. Force-close it.
  window.matchMedia('(min-width: 751px)').addEventListener('change', function (e) {
    if (e.matches && overlay.classList.contains('open')) set(false);
  });
  overlay.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { set(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') { set(false); return; }
    if (e.key === 'Tab') {
      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
})();

/* Respect the OS-level "reduce motion" preference (WCAG 2.2.2 Pause, Stop, Hide):
   the home page's hero video autoplays/loops purely for decoration, so users who've
   asked their system for less motion get the static poster frame instead. */
(function () {
  var heroVideo = document.querySelector('video.hero-media');
  if (!heroVideo) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.pause();
    heroVideo.removeAttribute('autoplay');
    heroVideo.removeAttribute('loop');
  }
})();
