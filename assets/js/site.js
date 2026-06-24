/* MyFy Premier — mobile menu toggle (no external calls) */
(function () {
  var btn = document.querySelector('.hamburger');
  var overlay = document.getElementById('mobile-overlay');
  if (!btn || !overlay) return;
  function set(open) {
    overlay.classList.toggle('open', open);
    btn.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function () { set(!overlay.classList.contains('open')); });
  overlay.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { set(false); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();
