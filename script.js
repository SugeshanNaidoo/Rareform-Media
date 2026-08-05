// Coastline Creative — shared site behaviour

document.addEventListener('DOMContentLoaded', function () {
  // Prefetch the other pages on this site so navigating between them feels
  // instant. Runs once the browser is idle (or after a short delay as a
  // fallback) so it never competes with the current page's own loading.
  (function prefetchSitePages() {
    var pages = ['index.html', 'about.html', 'services.html', 'contact.html'];
    var current = location.pathname.split('/').pop() || 'index.html';
    var prefetched = {};

    function prefetch(href) {
      if (prefetched[href] || href === current) return;
      prefetched[href] = true;
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }

    function prefetchAll() {
      pages.forEach(prefetch);
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchAll, { timeout: 2000 });
    } else {
      setTimeout(prefetchAll, 1200);
    }

    // Belt-and-braces: also prefetch on hover/touch in case idle prefetch
    // hasn't fired yet by the time someone's about to click.
    document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      a.addEventListener('pointerenter', function () { prefetch(href); }, { once: true });
      a.addEventListener('touchstart', function () { prefetch(href); }, { once: true, passive: true });
    });
  })();

  // Mobile navigation toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  var lockedScrollY = 0;

  function closeMenu() {
    if (!toggle || !links) return;
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
    document.documentElement.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
    document.body.style.top = '';
    window.scrollTo(0, lockedScrollY);
  }

  function openMenu() {
    if (!toggle || !links) return;
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    toggle.setAttribute('aria-expanded', 'true');
    links.classList.add('open');
    document.documentElement.classList.add('nav-open');
    document.body.classList.add('nav-open');
    document.body.style.top = -lockedScrollY + 'px';
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });
  }

  // Scroll reveal — fades/lifts elements in as they enter the viewport.
  // Content is visible by default; the hidden state is only switched on
  // once JS confirms it can animate it back in, so nothing is lost if
  // JS fails or the user prefers reduced motion.
  var revealItems = document.querySelectorAll('.reveal');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (revealItems.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealItems.forEach(function (el) { el.classList.add('revealed'); });
    } else {
      revealItems.forEach(function (el) { el.classList.add('reveal-ready'); });

      var revealObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

      revealItems.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  // Contact form — submits to the /api/contact Vercel serverless function
  var form = document.getElementById('contact-form');
  var success = document.getElementById('form-success');

  if (form) {
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // checkValidity() doesn't catch whitespace-only input in required fields.
      var requiredFields = [form.name, form.email, form.phone, form.service, form.message];
      var hasBlankRequired = requiredFields.some(function (field) {
        return !field.value || !field.value.trim();
      });
      if (hasBlankRequired) {
        if (success) {
          success.setAttribute('role', 'status');
          success.classList.add('show', 'is-error');
          success.textContent = 'Please fill in every field before sending.';
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        service: form.service.value.trim(),
        message: form.message.value.trim(),
        // Honeypot — real users never fill this in; bots often do.
        website: form.website ? form.website.value : ''
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
      }
      if (success) {
        success.classList.remove('show', 'is-error');
      }

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().then(function (json) {
            return { ok: res.ok, json: json };
          });
        })
        .then(function (result) {
          if (!success) return;
          success.setAttribute('role', 'status');
          if (result.ok && result.json && result.json.ok) {
            success.classList.remove('is-error');
            success.classList.add('show');
            success.textContent = 'Thanks — your message has been sent. We reply to every enquiry within one business day.';
            form.reset();
          } else {
            success.classList.add('show', 'is-error');
            success.textContent = (result.json && result.json.error) ||
              'Something went wrong sending your message. Please email us directly for now.';
          }
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(function () {
          if (success) {
            success.setAttribute('role', 'status');
            success.classList.add('show', 'is-error');
            success.textContent = 'Something went wrong sending your message. Please email us directly for now.';
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || 'Send Message';
          }
        });
    });
  }
});
