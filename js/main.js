/* =========================================
   NipponAuto Uganda — Main JavaScript
   ========================================= */

'use strict';

/* ---- Sticky Header ---- */
(function initStickyHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  function updateHeader() {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
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
  function openMenu() { hamburger.classList.add('open'); mobileMenu.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeMenu() { hamburger.classList.remove('open'); mobileMenu.classList.remove('open'); document.body.style.overflow = ''; }
  hamburger.addEventListener('click', openMenu);
  if (mobileClose) mobileClose.addEventListener('click', closeMenu);
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
})();

/* ---- Smooth Scroll ---- */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
})();

/* ---- Favourite Toggle ---- */
document.querySelectorAll('.card-fav').forEach(btn => {
  btn.addEventListener('click', function() {
    this.textContent = this.textContent === '❤️' ? '🤍' : '❤️';
  });
});

/* ---- Live Kampala Clock (EAT = UTC+3) ---- */
(function initKampalaClock() {
  const el = document.getElementById('kampalaClock');
  if (!el) return;
  function update() {
    const now = new Date();
    const eat = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Kampala' }));
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let h = eat.getHours(), m = eat.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    el.textContent = `${h}:${String(m).padStart(2,'0')} ${ampm}, ${days[eat.getDay()]}`;
  }
  update();
  setInterval(update, 30000);
})();

/* ---- Hero Carousel ---- */
(function initCarousel() {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  if (!slides.length) return;
  let current = 0, timer;
  function goTo(n) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }
  function startTimer() { timer = setInterval(next, 5500); }
  function resetTimer() { clearInterval(timer); startTimer(); }
  const nextBtn = document.getElementById('carouselNext');
  const prevBtn = document.getElementById('carouselPrev');
  if (nextBtn) nextBtn.addEventListener('click', function() { next(); resetTimer(); });
  if (prevBtn) prevBtn.addEventListener('click', function() { prev(); resetTimer(); });
  dots.forEach(function(dot) { dot.addEventListener('click', function() { goTo(+dot.dataset.slide); resetTimer(); }); });
  startTimer();
})();

/* ---- Settings Integration ---- */
function loadSiteSettings() {
  const s = JSON.parse(localStorage.getItem('nau_settings') || '{}');
  const wa = s.whatsapp || '256700123456';
  const waClean = wa.replace(/\D/g, '');
  // Replace all wa.me links on the page
  document.querySelectorAll('a[href*="wa.me/"]').forEach(el => {
    el.href = el.href.replace(/wa\.me\/\d+/, 'wa.me/' + waClean);
  });
  // Expose exchange rate globally
  window.NAU_USD_RATE = Number(s.usdRate) || 3700;
}

/* ---- Hero Search Card ---- */
(function initHeroSearchCard() {
  const advToggle = document.getElementById('hscAdvToggle');
  const advPanel = document.getElementById('hscAdvanced');
  if (advToggle && advPanel) {
    advToggle.addEventListener('click', function() {
      const open = advPanel.style.display !== 'none';
      advPanel.style.display = open ? 'none' : 'block';
      advToggle.textContent = open ? '+ Show Advanced Search' : '- Hide Advanced Search';
    });
  }
  function buildSearchURL() {
    const params = new URLSearchParams();
    const kw = (document.getElementById('hscKeyword') || {}).value || '';
    const make = (document.getElementById('hscMake') || {}).value || '';
    const body = (document.getElementById('hscBody') || {}).value || '';
    const year = (document.getElementById('hscYear') || {}).value || '';
    const price = (document.getElementById('hscPrice') || {}).value || '';
    const trans = (document.getElementById('hscTrans') || {}).value || '';
    const fuel = (document.getElementById('hscFuel') || {}).value || '';
    if (kw.trim()) params.set('q', kw.trim());
    if (make) params.set('make', make);
    if (body) params.set('body', body);
    // Year select uses ranges like "2023-2025" — split to yearMin/yearMax
    if (year && year.includes('-')) {
      const [yMin, yMax] = year.split('-');
      if (yMin) params.set('yearMin', yMin.trim());
      if (yMax) params.set('yearMax', yMax.trim());
    } else if (year) {
      params.set('yearMin', year);
    }
    // Price/budget select mapping
    if (price === 'under50m') {
      params.set('priceMax', '50000000');
    } else if (price === '50m-100m') {
      params.set('priceMin', '50000000');
      params.set('priceMax', '100000000');
    } else if (price === '100m-150m') {
      params.set('priceMin', '100000000');
      params.set('priceMax', '150000000');
    } else if (price === 'over150m') {
      params.set('priceMin', '150000000');
    }
    if (trans) params.set('trans', trans);
    if (fuel) params.set('fuel', fuel);
    const qs = params.toString();
    return 'inventory.html' + (qs ? '?' + qs : '');
  }
  const searchBtn = document.getElementById('hscSearchBtn');
  const kwInput = document.getElementById('hscKeyword');
  if (searchBtn) searchBtn.addEventListener('click', function() { window.location.href = buildSearchURL(); });
  if (kwInput) kwInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.location.href = buildSearchURL(); });
})();

/* ---- Scroll-reveal for cards ---- */
(function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  const elements = document.querySelectorAll(
    '.vehicle-card, .service-card, .testi-card, .team-card, .value-card, .timeline-item, .step-card, .award-card, .fo-card, .why-card'
  );
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  elements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity .45s ease ${(i % 4) * 0.08}s, transform .45s ease ${(i % 4) * 0.08}s`;
    io.observe(el);
  });
})();

/* ---- Counter Animation ---- */
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

/* ---- Gallery (vehicle-detail) ---- */
(function initGallery() {
  const mainImg = document.getElementById('mainImage');
  const thumbs = document.querySelectorAll('.gallery-thumbs .thumb img');
  if (!mainImg || !thumbs.length) return;
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', function() {
      mainImg.style.opacity = '0.4';
      setTimeout(() => {
        mainImg.src = this.src;
        mainImg.style.opacity = '1';
      }, 150);
      thumbs.forEach(t => t.parentElement.classList.remove('active'));
      this.parentElement.classList.add('active');
    });
  });
  mainImg.style.transition = 'opacity .25s ease';
})();

/* ---- Sidebar Inventory Filter ---- */
(function initSidebarFilter() {
  const grid = document.getElementById('inventoryGrid');
  if (!grid) return;
  const sidebar = document.getElementById('invSidebar');
  const searchInput = document.getElementById('searchInput');
  const resetBtn = document.getElementById('resetFilters');
  const applyBtn = document.getElementById('applyFilters');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCount = document.getElementById('resultsCount');
  const noResults = document.getElementById('noResults');
  const mobileToggle = document.getElementById('mobileFilterToggle');
  const overlay = document.getElementById('sidebarOverlay');
  const cards = Array.from(grid.querySelectorAll('.vehicle-card'));

  function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
  }

  function pushFiltersToURL(filters) {
    const params = new URLSearchParams();
    if (filters.makes && filters.makes.length) params.set('make', filters.makes.join(','));
    if (filters.bodies && filters.bodies.length) params.set('body', filters.bodies.join(','));
    if (filters.fuels && filters.fuels.length) params.set('fuel', filters.fuels.join(','));
    if (filters.transes && filters.transes.length) params.set('trans', filters.transes.join(','));
    if (filters.q) params.set('q', filters.q);
    if (filters.yearMin && filters.yearMin !== '2014' && filters.yearMin !== '2015') params.set('yearMin', filters.yearMin);
    if (filters.yearMax && filters.yearMax !== '2025') params.set('yearMax', filters.yearMax);
    if (filters.priceMin && filters.priceMin !== '0') params.set('priceMin', filters.priceMin);
    if (filters.priceMax && filters.priceMax !== '999999999') params.set('priceMax', filters.priceMax);
    const qs = params.toString();
    history.pushState({}, '', qs ? '?' + qs : window.location.pathname);
  }

  function filterCards() {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const makes = getCheckedValues('make');
    const bodies = getCheckedValues('body');
    const fuels = getCheckedValues('fuel');
    const transes = getCheckedValues('trans');
    const yearMinVal = (document.getElementById('yearMin') || {}).value || '2014';
    const yearMaxVal = (document.getElementById('yearMax') || {}).value || '2025';
    const priceMinVal = (document.getElementById('priceMin') || {}).value || '0';
    const priceMaxVal = (document.getElementById('priceMax') || {}).value || '999999999';
    const yearMin = parseInt(yearMinVal);
    const yearMax = parseInt(yearMaxVal);
    const priceMin = parseInt(priceMinVal);
    const priceMax = parseInt(priceMaxVal);
    let visible = 0;
    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const cmake = (card.dataset.make || '').toLowerCase();
      const cyear = parseInt(card.dataset.year || '0');
      const cprice = parseInt(card.dataset.price || '0');
      const cbody = (card.dataset.body || '').toLowerCase();
      const ctrans = (card.dataset.trans || '').toLowerCase();
      const cfuel = (card.dataset.fuel || '').toLowerCase();
      const matchQ = !q || name.includes(q) || cmake.includes(q);
      const matchMake = !makes.length || makes.includes(cmake);
      const matchBody = !bodies.length || bodies.includes(cbody);
      const matchFuel = !fuels.length || fuels.includes(cfuel);
      const matchTrans = !transes.length || transes.includes(ctrans);
      const matchYear = cyear >= yearMin && cyear <= yearMax;
      const matchPrice = cprice >= priceMin && cprice <= priceMax;
      const show = matchQ && matchMake && matchBody && matchFuel && matchTrans && matchYear && matchPrice;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (resultsCount) resultsCount.textContent = visible;
    if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
    pushFiltersToURL({ makes, bodies, fuels, transes, q, yearMin: yearMinVal, yearMax: yearMaxVal, priceMin: priceMinVal, priceMax: priceMaxVal });
    sortCards();
  }

  function sortCards() {
    if (!sortSelect) return;
    const val = sortSelect.value;
    const sorted = [...cards].sort((a, b) => {
      const pa = parseInt(a.dataset.price || '0'), pb = parseInt(b.dataset.price || '0');
      const ya = parseInt(a.dataset.year || '0'), yb = parseInt(b.dataset.year || '0');
      if (val === 'price-asc') return pa - pb;
      if (val === 'price-desc') return pb - pa;
      if (val === 'year-desc') return yb - ya;
      if (val === 'year-asc') return ya - yb;
      return 0;
    });
    sorted.forEach(c => grid.appendChild(c));
  }

  document.querySelectorAll('input[name="make"], input[name="body"], input[name="fuel"], input[name="trans"]').forEach(cb => {
    cb.addEventListener('change', filterCards);
  });
  if (searchInput) searchInput.addEventListener('input', filterCards);
  if (sortSelect) sortSelect.addEventListener('change', filterCards);
  if (applyBtn) applyBtn.addEventListener('click', () => { filterCards(); closeSidebar(); });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('input[name="make"], input[name="body"], input[name="fuel"], input[name="trans"]').forEach(cb => { cb.checked = false; });
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = '';
      filterCards();
    });
  }

  function openSidebar() { if (sidebar) sidebar.classList.add('sidebar-open'); if (overlay) overlay.classList.add('visible'); document.body.style.overflow = 'hidden'; }
  function closeSidebar() { if (sidebar) sidebar.classList.remove('sidebar-open'); if (overlay) overlay.classList.remove('visible'); document.body.style.overflow = ''; }
  if (mobileToggle) mobileToggle.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  /* Read URL params */
  (function() {
    const params = new URLSearchParams(window.location.search);
    const make = params.get('make');
    const body = params.get('body');
    const fuel = params.get('fuel');
    const trans = params.get('trans');
    const q = params.get('q');
    const yearMin = params.get('yearMin');
    const yearMax = params.get('yearMax');
    const priceMin = params.get('priceMin');
    const priceMax = params.get('priceMax');
    if (make) { make.split(',').forEach(v => { const cb = document.querySelector(`input[name="make"][value="${v.toLowerCase()}"]`); if (cb) cb.checked = true; }); }
    if (body) { body.split(',').forEach(v => { const cb = document.querySelector(`input[name="body"][value="${v.toLowerCase()}"]`); if (cb) cb.checked = true; }); }
    if (fuel) { fuel.split(',').forEach(v => { const cb = document.querySelector(`input[name="fuel"][value="${v.toLowerCase()}"]`); if (cb) cb.checked = true; }); }
    if (trans) { trans.split(',').forEach(v => { const cb = document.querySelector(`input[name="trans"][value="${v.toLowerCase()}"]`); if (cb) cb.checked = true; }); }
    if (q && searchInput) searchInput.value = q;
    if (yearMin) { const el = document.getElementById('yearMin'); if (el) el.value = yearMin; }
    if (yearMax) { const el = document.getElementById('yearMax'); if (el) el.value = yearMax; }
    if (priceMin) { const el = document.getElementById('priceMin'); if (el) el.value = priceMin; }
    if (priceMax) { const el = document.getElementById('priceMax'); if (el) el.value = priceMax; }
  })();

  filterCards();
})();

/* ---- Contact Form ---- */
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
  ['name','email','phone','message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => clearError(id));
  });
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    let valid = true;
    ['name','email','phone','message'].forEach(id => clearError(id));
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const message = document.getElementById('message');
    if (!name || name.value.trim().length < 2) { showError('name', 'Please enter your full name.'); valid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { showError('email', 'Please enter a valid email.'); valid = false; }
    if (!message || message.value.trim().length < 10) { showError('message', 'Please enter a message (at least 10 characters).'); valid = false; }
    if (valid) {
      const btn = form.querySelector('.form-submit');
      if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
      setTimeout(() => {
        form.reset();
        if (successMsg) successMsg.classList.add('show');
        if (btn) { btn.textContent = 'Send Message'; btn.disabled = false; }
        setTimeout(() => { if (successMsg) successMsg.classList.remove('show'); }, 6000);
      }, 1200);
    }
  });
})();

/* ---- Newsletter ---- */
(function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const emailEl = document.getElementById('newsletterEmail');
  const successEl = document.getElementById('newsletterSuccess');
  const errorEl = document.getElementById('newsletterError');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (successEl) successEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    const val = emailEl ? emailEl.value.trim() : '';
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!valid) { if (errorEl) errorEl.style.display = 'block'; return; }
    const btn = form.querySelector('.newsletter-btn');
    if (btn) { btn.textContent = 'Subscribing...'; btn.disabled = true; }
    setTimeout(() => {
      if (emailEl) emailEl.value = '';
      if (successEl) successEl.style.display = 'block';
      if (btn) { btn.textContent = 'Subscribe'; btn.disabled = false; }
    }, 900);
  });
})();

/* ---- FAQ Accordion ---- */
(function initFAQ() {
  const accordion = document.getElementById('faqAccordion');
  if (!accordion) return;
  accordion.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', function() {
      const item = this.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = this.classList.contains('open');
      accordion.querySelectorAll('.faq-question').forEach(q => {
        q.classList.remove('open');
        const a = q.closest('.faq-item').querySelector('.faq-answer');
        if (a) a.classList.remove('open');
        const t = q.querySelector('.faq-toggle');
        if (t) t.textContent = '+';
      });
      if (!isOpen) {
        this.classList.add('open');
        if (answer) answer.classList.add('open');
        const toggle = this.querySelector('.faq-toggle');
        if (toggle) toggle.textContent = '−';
      }
    });
  });
})();

/* ---- Duty Calculator ---- */
function runDutyCalc() {
  const cifEl = document.getElementById('dutyVehiclePrice');
  const engineEl = document.getElementById('dutyEngineCC');
  const ageEl = document.getElementById('dutyVehicleAge');
  const resultEl = document.getElementById('dutyResult');
  if (!cifEl || !resultEl) return;
  const cif = parseFloat(cifEl.value) || 0;
  const cc = parseInt((engineEl || {}).value || '2000');
  const age = (ageEl || {}).value || 'under5';
  // Uganda import duty rates (approximate)
  const importDuty = cif * 0.25;
  const vat = (cif + importDuty) * 0.18;
  const excise = cc > 2000 ? cif * 0.10 : 0;
  const withholding = cif * 0.06;
  const clearingFee = 500;
  const total = importDuty + vat + excise + withholding + clearingFee;
  const totalUGX = total * 3700;

  const fmt = v => '$' + Math.round(v).toLocaleString();
  const fmtUGX = v => 'UGX ' + Math.round(v / 1000000).toFixed(1) + 'M';

  const el = (id) => document.getElementById(id);
  if (el('drImportDuty')) el('drImportDuty').textContent = fmt(importDuty);
  if (el('drVAT')) el('drVAT').textContent = fmt(vat);
  if (el('drTotal')) el('drTotal').textContent = fmt(total) + ' (' + fmtUGX(totalUGX) + ')';
  resultEl.style.display = 'block';
}

/* ---- Finance Calculator ---- */
function runCalc() {
  const priceEl = document.getElementById('calcPrice');
  const depositEl = document.getElementById('calcDeposit');
  const termEl = document.getElementById('calcTerm');
  const rateEl = document.getElementById('calcRate');
  if (!priceEl) return;
  const price = parseFloat(priceEl.value) || 0;
  const deposit = parseFloat((depositEl || {}).value) || 0;
  const n = parseInt((termEl || {}).value) || 48;
  const annRate = parseFloat((rateEl || {}).value) || 18;
  const P = price - deposit;
  const r = annRate / 12 / 100;
  let monthly;
  if (r === 0) { monthly = P / n; }
  else { monthly = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1); }
  const totalRepay = monthly * n;
  const totalInterest = totalRepay - P;
  const fmtUGX = v => 'UGX ' + Math.round(v).toLocaleString();
  if (document.getElementById('crMonthly')) document.getElementById('crMonthly').textContent = fmtUGX(monthly);
  if (document.getElementById('crInterest')) document.getElementById('crInterest').textContent = fmtUGX(totalInterest);
  if (document.getElementById('crTotal')) document.getElementById('crTotal').textContent = fmtUGX(totalRepay);
  const rBox = document.getElementById('calcResults');
  if (rBox) rBox.style.display = 'grid';
}

/* ---- Sticky Enquiry Bar ---- */
(function initStickyEnquiryBar() {
  const bar = document.getElementById('stickyEnquiryBar');
  const priceBlock = document.getElementById('priceSection');
  if (!bar) return;
  function checkScroll() {
    if (!priceBlock) { bar.classList.toggle('visible', window.scrollY > 300); return; }
    bar.classList.toggle('visible', priceBlock.getBoundingClientRect().bottom < 0);
  }
  window.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();
})();

/* ---- WhatsApp pulse ---- */
(function() {
  const wa = document.querySelector('.whatsapp-float');
  if (!wa) return;
  wa.addEventListener('mouseenter', () => { wa.style.animation = 'none'; });
})();

/* ---- Newsletter Widget (public) ---- */
function subscribeNewsletter(e, form) {
  e.preventDefault();
  const emailInput = form.querySelector('input[type="email"]');
  const email = (emailInput?.value || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  const subs = JSON.parse(localStorage.getItem('nau_newsletter') || '[]');
  if (subs.some(s => s.email === email)) {
    showNewsletterSuccess(form, "You're already subscribed! 🎉");
    return;
  }
  subs.push({ id: Date.now(), email, name: '', status: 'Subscribed', source: 'public-web', subscribedAt: new Date().toISOString() });
  localStorage.setItem('nau_newsletter', JSON.stringify(subs));
  showNewsletterSuccess(form, "✅ You're subscribed!");
}

function showNewsletterSuccess(form, msg) {
  form.innerHTML = `<div style="text-align:center;font-size:1rem;font-weight:700;color:#27ae60;padding:.75rem;">${msg}</div>`;
}

/* ---- DOMContentLoaded: Settings + Dynamic Homepage ---- */
document.addEventListener('DOMContentLoaded', function() {
  loadSiteSettings();
  renderFeaturedVehicles();
  renderTestimonials();
});

/* ---- Dynamic Featured Vehicles ---- */
function renderFeaturedVehicles() {
  const vehicles = JSON.parse(localStorage.getItem('nau_vehicles') || '[]');
  const mfrs = JSON.parse(localStorage.getItem('nau_manufacturers') || '[]');

  let featured = vehicles.filter(v => v.status === 'Published' && v.badge === 'featured');
  if (featured.length < 6) {
    const extra = vehicles
      .filter(v => v.status === 'Published' && v.badge !== 'featured')
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6 - featured.length);
    featured = [...featured, ...extra];
  }
  featured = featured.slice(0, 6);

  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  if (!featured.length) return; // keep hardcoded if empty (fresh install before seedData runs)

  const badgeMap = { 'hot-deal': '🔥 Hot Deal', 'new-arrival': '⭐ New Arrival', 'price-drop': '💰 Price Drop', 'featured': '🏆 Featured' };

  grid.innerHTML = featured.map(v => {
    const mfr = mfrs.find(m => m.id === v.manufacturerId);
    const make = mfr ? mfr.name : (v.make || v.makeLabel || '');
    const modelName = v.modelName || v.model || v.modelLabel || '';
    const badgeHtml = v.badge && badgeMap[v.badge] ? `<span class="vehicle-badge badge-${v.badge}">${badgeMap[v.badge]}</span>` : '';
    return `
      <article class="vehicle-card">
        <a href="vehicle-detail.html?id=${v.id}" style="text-decoration:none;color:inherit;">
          <div class="card-img-wrap" style="position:relative;">
            <img src="${v.imageUrl || 'https://placehold.co/400x280?text=No+Image'}" alt="${make} ${modelName}" loading="lazy" style="width:100%;height:220px;object-fit:cover;border-radius:8px 8px 0 0;">
            ${badgeHtml}
          </div>
          <div class="card-body" style="padding:1rem;">
            <h3 class="card-title" style="margin:0 0 .4rem;font-size:1rem;color:#0a1628;">${make} ${modelName}</h3>
            <div class="card-specs" style="font-size:.83rem;color:#666;margin-bottom:.5rem;">
              ${v.year ? `<span>${v.year}</span>` : ''}${v.fuelType ? ` · <span>${v.fuelType}</span>` : ''}${v.bodyType ? ` · <span>${v.bodyType}</span>` : ''}
            </div>
            <div class="card-price" style="font-weight:800;color:#c0392b;font-size:1rem;">UGX ${Number(v.priceUGX || 0).toLocaleString()}</div>
            ${v.priceUSD ? `<div style="font-size:.8rem;color:#888;">≈ $${Number(v.priceUSD).toLocaleString()}</div>` : ''}
          </div>
        </a>
      </article>
    `;
  }).join('');
}

/* ---- Dynamic Testimonials ---- */
function renderTestimonials() {
  const reviews = JSON.parse(localStorage.getItem('nau_reviews') || '[]')
    .filter(r => r.status === 'Approved' || r.approved === true)
    .slice(0, 3);

  const grid = document.getElementById('testimonialsGrid');
  if (!grid) return;
  if (!reviews.length) return; // keep fallback static content if no reviews

  grid.innerHTML = reviews.map(r => `
    <div class="testimonial-card testi-card">
      <div class="testimonial-stars" style="color:#f0a500;font-size:1.1rem;margin-bottom:.5rem;">${'★'.repeat(r.rating || 5)}</div>
      <p class="testimonial-text testi-text" style="color:#555;font-style:italic;line-height:1.7;margin-bottom:1rem;">"${r.review || r.text || ''}"</p>
      <div class="testimonial-author testi-author" style="display:flex;align-items:center;gap:.75rem;">
        <div class="testimonial-avatar-initial" style="width:40px;height:40px;border-radius:50%;background:#0a1628;color:#f0a500;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${(r.customerName || r.customer || 'A')[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:700;color:#0a1628;font-size:.9rem;">${r.customerName || r.customer || 'Happy Customer'}</div>
          <div style="font-size:.8rem;color:#888;">${r.vehicle || r.vehicleId ? 'Verified Buyer' : 'NipponAuto Customer'}</div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ---- NipponAuto Admin: Dynamic Inventory from localStorage ---- */
(function initDynamicInventory() {
  // Read vehicles from localStorage
  function getVehicles() {
    try {
      return JSON.parse(localStorage.getItem('nipponauto_vehicles') || '[]');
    } catch(e) { return []; }
  }

  // Only run on inventory or index page
  const grid = document.getElementById('inventoryGrid');
  const newArrivalsGrid = document.querySelector('.arrivals-grid');
  const vehicles = getVehicles();
  if (!vehicles.length) return; // Use hardcoded HTML if no admin data

  // If inventory grid exists and has admin vehicles, prepend them
  if (grid && vehicles.length) {
    const adminCards = vehicles
      .filter(v => v.status !== 'Sold')
      .map(v => buildCard(v))
      .join('');
    grid.insertAdjacentHTML('afterbegin', adminCards);
  }

  // If new arrivals exists, show newest 4 "New Arrival" flagged vehicles
  if (newArrivalsGrid) {
    const newOnes = vehicles.filter(v => v.isNewArrival && v.status !== 'Sold').slice(0, 4);
    if (newOnes.length) {
      newOnes.forEach(v => {
        newArrivalsGrid.insertAdjacentHTML('afterbegin', buildCard(v, true));
      });
    }
  }

  function buildCard(v, isNew) {
    const ugx = Number(v.priceUGX).toLocaleString();
    const usd = Math.round(Number(v.priceUGX) / 3700).toLocaleString();
    const badge = isNew ? 'new' : (v.isFeatured ? 'featured' : '');
    const badgeLabel = isNew ? 'New' : (v.isFeatured ? 'Featured' : '');
    const img = v.imageUrl || `https://picsum.photos/seed/${v.make}${v.year}/600/380`;
    const wa = `https://wa.me/256700123456?text=Hi, I'm interested in ${v.make} ${v.model} (${v.year})`;
    const badgeMap = { 'hot-deal': '🔥 Hot Deal', 'new-arrival': '⭐ New Arrival', 'price-drop': '💰 Price Drop', 'featured': '🏆 Featured' };
    const badgeHtml = v.badge && badgeMap[v.badge] ? `<span class="vehicle-badge badge-${v.badge}">${badgeMap[v.badge]}</span>` : '';
    return `
    <article class="vehicle-card"
      data-make="${(v.make||'').toLowerCase()}"
      data-name="${v.make} ${v.model}"
      data-year="${v.year}"
      data-price="${v.priceUGX}"
      data-body="${(v.bodyType||'').toLowerCase()}"
      data-fuel="${(v.fuelType||'').toLowerCase()}"
      data-trans="${(v.transmission||'').toLowerCase()}"
      data-steering="${(v.steering||'rhd').toLowerCase()}">
      <div class="card-img-wrap">
        <img src="${img}" alt="${v.make} ${v.model}" loading="lazy"/>
        ${badge ? `<span class="card-badge ${badge}">${badgeLabel}</span>` : ''}
        ${badgeHtml}
        <button class="card-fav" title="Save">🤍</button>
      </div>
      <div class="card-body">
        <p class="card-make">${v.make}</p>
        <h3 class="card-name">${v.model}</h3>
        <div class="card-meta-row">
          <span class="card-stock">${v.stockNo || ''}</span>
          <span class="card-grade">${v.grade || ''}</span>
        </div>
        <div class="card-specs">
          <span class="card-spec">📅 ${v.year}</span>
          <span class="card-spec">🛣️ ${Number(v.mileage||0).toLocaleString()} km</span>
          <span class="card-spec">&#9981; ${v.fuelType}</span>
          <span class="card-spec steering-badge">${v.steering||'RHD'}</span>
        </div>
        <div class="card-footer">
          <div class="card-price"><span>CIF Kampala</span>UGX ${ugx}<br><small>~$${usd}</small></div>
          <div class="card-actions">
            <a href="vehicle-detail.html" class="btn btn-navy btn-sm">View Details</a>
            <a href="${wa}" class="btn btn-wa btn-sm" target="_blank" rel="noopener">💬</a>
          </div>
        </div>
      </div>
    </article>`;
  }
})();
