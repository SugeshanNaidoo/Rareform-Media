// Coastline Creative — shared site behaviour

document.addEventListener('DOMContentLoaded', function () {

  /* ---------------------------------------------------------
     Prefetch sibling pages once the browser is idle, so moving
     between pages feels instant on a phone connection.
     --------------------------------------------------------- */
  (function prefetchSitePages() {
    var pages = ['index.html', 'about.html', 'services.html', 'contact.html'];
    var current = location.pathname.split('/').pop() || 'index.html';
    var done = {};

    // Skip entirely on a metered or slow connection.
    var conn = navigator.connection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;

    function prefetch(href) {
      if (!href || done[href] || href === current) return;
      done[href] = true;
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }

    function prefetchAll() { pages.forEach(prefetch); }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchAll, { timeout: 2500 });
    } else {
      setTimeout(prefetchAll, 1500);
    }

    document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
      var href = a.getAttribute('href');
      a.addEventListener('pointerenter', function () { prefetch(href); }, { once: true });
      a.addEventListener('touchstart', function () { prefetch(href); }, { once: true, passive: true });
    });
  })();

  /* ---------------------------------------------------------
     Mobile navigation panel
     --------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  var lockedY = 0;

  function closeMenu() {
    if (!toggle || !links) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    links.classList.remove('open');
    document.body.classList.remove('nav-open');
    document.body.style.top = '';
    // Instant, not smooth — the page sets scroll-behavior: smooth, which
    // would animate this restore jump and can drop it entirely.
    try {
      window.scrollTo({ top: lockedY, left: 0, behavior: 'instant' });
    } catch (err) {
      window.scrollTo(0, lockedY);
    }
  }

  function openMenu() {
    if (!toggle || !links) return;
    lockedY = window.scrollY || document.documentElement.scrollTop || 0;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    links.classList.add('open');
    document.body.classList.add('nav-open');
    document.body.style.top = -lockedY + 'px';
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); } else { openMenu(); }
    });

    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });

    // If the viewport grows past the desktop breakpoint while the panel is
    // open, drop the scroll lock — the panel becomes an inline bar there.
    var desktop = window.matchMedia('(min-width: 940px)');
    var onChange = function (e) { if (e.matches) { closeMenu(); } };
    if (desktop.addEventListener) { desktop.addEventListener('change', onChange); }
    else if (desktop.addListener) { desktop.addListener(onChange); }
  }

  /* ---------------------------------------------------------
     Motion. Everything below is opt-in: if the person prefers
     reduced motion, or the browser lacks IntersectionObserver,
     content is shown in its final state and nothing animates.
     --------------------------------------------------------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Scroll reveal --- */
  var revealItems = document.querySelectorAll('.reveal');

  if (revealItems.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealItems.forEach(function (el) { el.classList.add('revealed'); });
    } else {
      revealItems.forEach(function (el) { el.classList.add('reveal-ready'); });
      var obs = new IntersectionObserver(function (entries, o) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            o.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
      revealItems.forEach(function (el) { obs.observe(el); });
    }
  }

  /* --- Parallax + header state, on one shared rAF loop --- */
  var header = document.querySelector('.site-header');
  var layers = [];
  var ticking = false;

  function collectLayers() {
    layers = [];
    if (reduceMotion) return;

    // `limit` is the fraction of the layer's own height available as
    // headroom — the offset is clamped to it so an edge is never exposed.
    var heroBg = document.querySelector('.hero-bg');
    if (heroBg) layers.push({ el: heroBg, speed: 0.12, anchor: 'top', limit: 0.10 });

    // Images inside a clipped figure can drift without exposing an edge,
    // because the CSS scales them up to leave headroom.
    document.querySelectorAll('.figure img, .founder-photo img').forEach(function (img) {
      img.classList.add('parallax');
      layers.push({ el: img, speed: 0.07, anchor: 'center', limit: 0.07 });
    });
  }

  function update() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var vh = window.innerHeight;

    if (header) header.classList.toggle('scrolled', y > 20);

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var rect = layer.el.getBoundingClientRect();

      // Skip anything well outside the viewport — no point doing the maths.
      if (rect.bottom < -200 || rect.top > vh + 200) continue;

      var offset;
      if (layer.anchor === 'top') {
        offset = y * layer.speed;
      } else {
        // How far this element's centre sits from the viewport centre,
        // as -1 (below the fold) to 1 (above it).
        var progress = ((vh / 2) - (rect.top + rect.height / 2)) / vh;
        offset = progress * layer.speed * vh * 0.5;
      }

      var max = rect.height * layer.limit;
      if (offset > max) offset = max;
      if (offset < -max) offset = -max;

      layer.el.style.setProperty('--par', offset.toFixed(1) + 'px');
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  if ('requestAnimationFrame' in window) {
    collectLayers();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { collectLayers(); onScroll(); }, { passive: true });

    // If the person switches the OS motion setting mid-session, honour it
    // without needing a reload.
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onMotionChange = function (e) {
      reduceMotion = e.matches;
      if (reduceMotion) {
        layers.forEach(function (l) { l.el.style.removeProperty('--par'); });
        layers = [];
      } else {
        collectLayers();
      }
      onScroll();
    };
    if (mq.addEventListener) { mq.addEventListener('change', onMotionChange); }
    else if (mq.addListener) { mq.addListener(onMotionChange); }
  }

  /* ---------------------------------------------------------
     Contact form — posts to the /api/contact serverless function
     --------------------------------------------------------- */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  if (!form) return;

  var submitBtn = form.querySelector('button[type="submit"]');
  var fieldNames = ['name', 'email', 'phone', 'service', 'message'];

  var messages = {
    name:    { required: 'Please enter your name.' },
    email:   { required: 'Please enter your email address.', invalid: 'That email address doesn\u2019t look right.' },
    phone:   { required: 'Please enter a contact number.' },
    service: { required: 'Please choose what you\u2019re enquiring about.' },
    message: { required: 'Please tell us a little about the project.' }
  };

  function wrapOf(name) {
    var el = form[name];
    return el ? el.closest('.field') : null;
  }

  function setError(name, msg) {
    var wrap = wrapOf(name);
    var errEl = document.getElementById(name + '-error');
    if (!wrap || !errEl) return;
    wrap.classList.add('has-error');
    errEl.textContent = msg;
    if (form[name]) form[name].setAttribute('aria-invalid', 'true');
  }

  function clearError(name) {
    var wrap = wrapOf(name);
    var errEl = document.getElementById(name + '-error');
    if (!wrap || !errEl) return;
    wrap.classList.remove('has-error');
    errEl.textContent = '';
    if (form[name]) form[name].setAttribute('aria-invalid', 'false');
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validate(name) {
    var v = ((form[name] && form[name].value) || '').trim();
    if (!v) { setError(name, messages[name].required); return false; }
    if (name === 'email' && !isEmail(v)) { setError(name, messages[name].invalid); return false; }
    clearError(name);
    return true;
  }

  // Only re-validate a field after the person has already been shown an
  // error on it — nobody wants to be told a field is empty while typing.
  fieldNames.forEach(function (name) {
    var el = form[name];
    if (!el) return;
    var recheck = function () {
      var wrap = wrapOf(name);
      if (wrap && wrap.classList.contains('has-error')) validate(name);
    };
    el.addEventListener('input', recheck);
    el.addEventListener('change', recheck);
    el.addEventListener('blur', function () {
      if (el.value.trim()) validate(name);
    });
  });

  function showStatus(text, isError) {
    if (!status) return;
    status.textContent = text;
    status.classList.add('show');
    status.classList.toggle('is-error', !!isError);
    status.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var results = fieldNames.map(validate);
    var badIndex = results.indexOf(false);

    if (badIndex !== -1) {
      var firstBad = fieldNames[badIndex];
      showStatus('Please fix the highlighted fields and try again.', true);
      var el = form[firstBad];
      if (el) {
        el.focus({ preventScroll: true });
        el.closest('.field').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      service: form.service.value.trim(),
      message: form.message.value.trim(),
      // Honeypot — real people leave this empty, bots usually don't.
      website: form.website ? form.website.value : ''
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.label = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
    }
    if (status) status.classList.remove('show', 'is-error');

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json()
          .catch(function () { return {}; })
          .then(function (json) { return { ok: res.ok, json: json }; });
      })
      .then(function (result) {
        if (result.ok && result.json && result.json.ok) {
          showStatus('Thanks — your message is on its way. We answer every enquiry within one business day.', false);
          form.reset();
          fieldNames.forEach(clearError);
        } else {
          showStatus(
            (result.json && result.json.error) ||
            'That didn\u2019t send. Please email us directly and we\u2019ll pick it up from there.',
            true
          );
          if (result.json && result.json.fields) {
            Object.keys(result.json.fields).forEach(function (n) {
              if (fieldNames.indexOf(n) !== -1) setError(n, result.json.fields[n]);
            });
          }
        }
      })
      .catch(function () {
        showStatus('That didn\u2019t send. Please email us directly and we\u2019ll pick it up from there.', true);
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || 'Send message';
        }
      });
  });
});
