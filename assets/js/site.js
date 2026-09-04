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

/* Contact form phone field: keep it to exactly 10 digits.
   The input's pattern attribute is the real guard (it still works with JS off);
   this just makes the field behave while you type — non-digits are dropped, the
   11th digit is refused, and the number formats itself as (502) 498-4212.
   Reformatting is skipped when the caret is mid-string, since rewriting the value
   there would fling the cursor to the end while someone is correcting a typo. */
(function () {
  var phone = document.getElementById('f-phone');
  if (!phone) return;

  function format(digits) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  phone.addEventListener('input', function () {
    var atEnd = phone.selectionStart === phone.value.length;
    var digits = phone.value.replace(/\D/g, '').slice(0, 10);
    if (!atEnd) return;
    phone.value = format(digits);
  });

  // A pasted "+1 502.498.4212" or "1-502-498-4212" should land as 10 digits, not fail
  // validation silently. Runs after the paste lands so we can read the merged value.
  phone.addEventListener('paste', function () {
    setTimeout(function () {
      var digits = phone.value.replace(/\D/g, '');
      if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
      phone.value = format(digits.slice(0, 10));
    }, 0);
  });
})();
