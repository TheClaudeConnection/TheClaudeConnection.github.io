// ============ BBWP Bathroom Renovations Landing Page - interactions ============

// Quote form handler - placeholder until a real endpoint / CRM is wired up.
function handleQuoteSubmit(event) {
  event.preventDefault();
  const form = event.target;
  // TODO: connect to form backend (email service, CRM, or call-tracking lead capture).
  form.reset();
  alert("Thanks, we've received your enquiry. We'll be in touch shortly to arrange your free quote.");
  return false;
}

document.addEventListener('DOMContentLoaded', function () {

  // ---- Scroll reveal ----
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---- Before / After slider ----
  const slider = document.getElementById('baSlider');
  if (slider) {
    const beforeWrap = slider.querySelector('.ba-before-wrap');
    const beforeImg = slider.querySelector('.ba-before');
    const handle = document.getElementById('baHandle');
    let dragging = false;

    function syncWidth() { if (beforeImg) beforeImg.style.width = slider.offsetWidth + 'px'; }
    syncWidth();
    window.addEventListener('resize', syncWidth);

    function setPos(clientX) {
      const rect = slider.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      beforeWrap.style.width = pct + '%';
      handle.style.left = pct + '%';
    }
    const start = function () { dragging = true; };
    const end = function () { dragging = false; };
    const move = function (e) {
      if (!dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setPos(x);
    };
    slider.addEventListener('mousedown', function (e) { start(); setPos(e.clientX); });
    slider.addEventListener('touchstart', function (e) { start(); setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
  }

  // ---- What's included: left nav switches right panel ----
  const incLayout = document.getElementById('includedLayout');
  if (incLayout) {
    const btns = incLayout.querySelectorAll('.inc-btn');
    const panels = incLayout.querySelectorAll('.inc-panel');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById(btn.dataset.inc).classList.add('active');
      });
    });
  }

  // ---- Cost factors: reveal explanation ----
  const costFactors = document.getElementById('costFactors');
  if (costFactors) {
    const chips = costFactors.querySelectorAll('.factor-chip');
    const explain = document.getElementById('factorExplain');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        explain.textContent = chip.dataset.explain;
      });
    });
  }

  // ---- Style carousel: infinite loop both directions + arrows + lightbox ----
  const carousel = document.getElementById('stylesCarousel');
  if (carousel) {
    // Duplicate slides for a seamless infinite scroll.
    const originals = Array.from(carousel.children);
    originals.forEach(function (s) { carousel.appendChild(s.cloneNode(true)); });
    originals.forEach(function (s) { carousel.insertBefore(s.cloneNode(true), carousel.firstChild); });

    let setWidth = 0;
    function measure() {
      setWidth = 0;
      const slide = carousel.querySelector('.style-slide');
      const gap = 18;
      setWidth = originals.length * ((slide ? slide.offsetWidth : 280) + gap);
    }
    measure();
    window.addEventListener('resize', measure);

    // Start in the middle (real) set.
    carousel.scrollLeft = setWidth;
    let ticking = false;
    carousel.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        if (carousel.scrollLeft <= setWidth * 0.25) {
          carousel.scrollLeft += setWidth;
        } else if (carousel.scrollLeft >= setWidth * 1.75) {
          carousel.scrollLeft -= setWidth;
        }
        ticking = false;
      });
    });

    const step = 298;
    const prev = document.getElementById('stylePrev');
    const next = document.getElementById('styleNext');
    if (prev) prev.addEventListener('click', function () { carousel.scrollBy({ left: -step, behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { carousel.scrollBy({ left: step, behavior: 'smooth' }); });

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightboxImg');
    const lbCap = document.getElementById('lightboxCaption');
    const lbClose = document.getElementById('lightboxClose');
    function closeLb() { lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden', 'true'); }
    carousel.addEventListener('click', function (e) {
      const slide = e.target.closest('.style-slide');
      if (!slide) return;
      const img = slide.querySelector('img');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = slide.dataset.caption || '';
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
    });
    if (lbClose) lbClose.addEventListener('click', closeLb);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
  }

  // ---- Animated stat counters ----
  const statsRow = document.getElementById('statsRow');
  if (statsRow && 'IntersectionObserver' in window) {
    const animate = function (el) {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const duration = 1400;
      const startTime = performance.now();
      function tick(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };
    const statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          statsRow.querySelectorAll('.stat-num').forEach(animate);
          statObs.unobserve(statsRow);
        }
      });
    }, { threshold: 0.4 });
    statObs.observe(statsRow);
  }

});
