document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  
  // Create overlay if it doesn't exist
  let overlay = document.querySelector('.mobile-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);
  }

  // Toggle mobile navigation
  function toggleMenu() {
    document.body.classList.toggle('menu-open');
    mobileNav.classList.toggle('open');
    overlay.classList.toggle('show');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu);
  }

  if (overlay) {
    overlay.addEventListener('click', toggleMenu);
  }

  // Handle header background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Highlight current nav links
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === 'blank.html' && href === 'yacht-financing.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});
