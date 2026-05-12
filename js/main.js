/* =========================================
   AutoElite Motors — Main JavaScript
   ========================================= */

'use strict';

/* ---- Sticky Header ---- */
(function initStickyHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  function updateHeader() {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
      header.classList.remove('transparent');
    } else {
      header.classList.remove('scrolled');
      // Only transparent on homepage hero pages
      if (header.dataset.transparent === 'true') {
        header.classList.add('transparent');
      }
    }
  }

  // Set transparent mode if homepage
  if (header.dataset.transparent === 'true') {
    header.classList.add('transparent');
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
})();

/* ---- Mobile Menu ---- */
(function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMenu);
  if (mobileClose) mobileClose.addEventListener('click', closeMenu);

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
})();

/* ---- Smooth Scroll ---- */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
})();

/* ---- Active Nav Link ---- */
(function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

/* ---- Favourite Toggle ---- */
document.querySelectorAll('.card-fav').forEach(btn => {
  btn.addEventListener('click', function() {
    this.textContent = this.textContent === '🤍' ? '❤️' : '🤍';
    this.title = this.textContent === '❤️' ? 'Remove from favourites' : 'Add to favourites';
  });
});

/* ---- Inventory Filter ---- */
(function initInventoryFilter() {
  const searchInput    = document.getElementById('searchInput');
  const makeFilter     = document.getElementById('makeFilter');
  const yearFilter     = document.getElementById('yearFilter');
  const priceFilter    = document.getElementById('priceFilter');
  const bodyFilter     = document.getElementById('bodyFilter');
  const transFilter    = document.getElementById('transFilter');
  const sortSelect     = document.getElementById('sortSelect');
  const resetBtn       = document.getElementById('resetFilters');
  const resultsCount   = document.getElementById('resultsCount');
  const noResults      = document.getElementById('noResults');
  const grid           = document.getElementById('inventoryGrid');

  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.vehicle-card'));

  function getVal(el) { return el ? el.value.toLowerCase().trim() : ''; }

  function priceInRange(priceText, range) {
    if (!range) return true;
    const price = parseInt(priceText.replace(/[^0-9]/g, ''));
    const [min, max] = range.split('-').map(Number);
    if (isNaN(max)) return price >= min;        // "80000+" style
    return price >= min && price <= max;
  }

  function yearInRange(yearText, range) {
    if (!range) return true;
    const year = parseInt(yearText);
    const [min, max] = range.split('-').map(Number);
    if (isNaN(max)) return year >= min;
    return year >= min && year <= max;
  }

  function filterCards() {
    const q     = getVal(searchInput);
    const make  = getVal(makeFilter);
    const year  = getVal(yearFilter);
    const price = getVal(priceFilter);
    const body  = getVal(bodyFilter);
    const trans = getVal(transFilter);

    let visible = 0;

    cards.forEach(card => {
      const name  = (card.dataset.name  || '').toLowerCase();
      const cmake = (card.dataset.make  || '').toLowerCase();
      const cyear = (card.dataset.year  || '');
      const cprice= (card.dataset.price || '');
      const cbody = (card.dataset.body  || '').toLowerCase();
      const ctrans= (card.dataset.trans || '').toLowerCase();

      const matchQ     = !q     || name.includes(q) || cmake.includes(q);
      const matchMake  = !make  || cmake === make;
      const matchYear  = !year  || yearInRange(cyear, year);
      const matchPrice = !price || priceInRange(cprice, price);
      const matchBody  = !body  || cbody === body;
      const matchTrans = !trans || ctrans === trans;

      const show = matchQ && matchMake && matchYear && matchPrice && matchBody && matchTrans;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    if (resultsCount) resultsCount.textContent = visible;
    if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';

    sortCards();
  }

  function sortCards() {
    if (!sortSelect) return;
    const val = sortSelect.value;
    const sorted = [...cards].sort((a, b) => {
      const pa = parseInt((a.dataset.price || '0').replace(/\D/g,''));
      const pb = parseInt((b.dataset.price || '0').replace(/\D/g,''));
      const ya = parseInt(a.dataset.year || '0');
      const yb = parseInt(b.dataset.year || '0');
      if (val === 'price-asc')  return pa - pb;
      if (val === 'price-desc') return pb - pa;
      if (val === 'year-desc')  return yb - ya;
      if (val === 'year-asc')   return ya - yb;
      return 0;
    });
    sorted.forEach(c => grid.appendChild(c));
  }

  [searchInput, makeFilter, yearFilter, priceFilter, bodyFilter, transFilter].forEach(el => {
    if (el) el.addEventListener('input', filterCards);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', filterCards);
  });

  if (sortSelect) sortSelect.addEventListener('change', filterCards);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      [searchInput, makeFilter, yearFilter, priceFilter, bodyFilter, transFilter].forEach(el => {
        if (el) el.value = '';
      });
      if (sortSelect) sortSelect.value = '';
      filterCards();
    });
  }

  filterCards();
})();

/* ---- Contact Form Validation ---- */
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const successMsg = document.getElementById('successMsg');

  function showError(fieldId, msg) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + 'Error');
    if (field) field.classList.add('error');
    if (error) { error.textContent = msg; error.classList.add('show'); }
  }

  function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + 'Error');
    if (field) field.classList.remove('error');
    if (error) error.classList.remove('show');
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[+\d\s\-().]{7,20}$/.test(phone);
  }

  // Live validation
  ['name', 'email', 'phone', 'message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => clearError(id));
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    let valid = true;

    const name    = document.getElementById('name');
    const email   = document.getElementById('email');
    const phone   = document.getElementById('phone');
    const message = document.getElementById('message');

    ['name','email','phone','message'].forEach(id => clearError(id));

    if (!name || name.value.trim().length < 2) {
      showError('name', 'Please enter your full name (at least 2 characters).');
      valid = false;
    }
    if (!email || !validateEmail(email.value.trim())) {
      showError('email', 'Please enter a valid email address.');
      valid = false;
    }
    if (phone && phone.value.trim() && !validatePhone(phone.value.trim())) {
      showError('phone', 'Please enter a valid phone number.');
      valid = false;
    }
    if (!message || message.value.trim().length < 10) {
      showError('message', 'Please enter a message (at least 10 characters).');
      valid = false;
    }

    if (valid) {
      // Simulate submission
      const submitBtn = form.querySelector('.form-submit');
      if (submitBtn) {
        submitBtn.textContent = 'Sending…';
        submitBtn.disabled = true;
      }
      setTimeout(() => {
        form.reset();
        if (successMsg) successMsg.classList.add('show');
        if (submitBtn) {
          submitBtn.textContent = 'Send Message';
          submitBtn.disabled = false;
        }
        setTimeout(() => {
          if (successMsg) successMsg.classList.remove('show');
        }, 6000);
      }, 1200);
    }
  });
})();

/* ---- Scroll-reveal for cards ---- */
(function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;

  const elements = document.querySelectorAll(
    '.vehicle-card, .service-card, .testi-card, .team-card, .value-card, .timeline-item'
  );

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity .5s ease ${(i % 4) * 0.08}s, transform .5s ease ${(i % 4) * 0.08}s`;
    io.observe(el);
  });
})();

/* ---- Counter Animation (stats bar) ---- */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-num');
  if (!counters.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target || el.textContent.replace(/\D/g,''));
      const suffix = el.dataset.suffix || '';
      const duration = 1400;
      const step = Math.ceil(duration / 60);
      let current = 0;
      const increment = Math.ceil(target / (duration / step));

      const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        el.textContent = current.toLocaleString() + suffix;
        if (current >= target) clearInterval(timer);
      }, step);

      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => io.observe(c));
})();
