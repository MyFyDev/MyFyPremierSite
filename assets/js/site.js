/* MyFy Premier — mobile menu toggle (no external calls) */
(function () {
  var btn = document.querySelector('.hamburger');
  var overlay = document.getElementById('mobile-overlay');
  if (!btn || !overlay) return;

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
    if (open) {
      var items = focusable();
      if (items.length) items[0].focus();
    } else {
      btn.focus();
    }
  }

  btn.addEventListener('click', function () { set(!overlay.classList.contains('open')); });
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
