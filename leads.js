/**
 * HPZ Early Access — lead capture.
 *
 * Renders one reusable form into every [data-lead-mount] element, so all
 * placements share a single implementation.
 */
(function () {
  'use strict';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var STORE_KEY = 'hpz_attr';
  var EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

  /* ── attribution: capture UTMs on arrival, keep them for the whole visit ── */

  function attribution() {
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}'); } catch (e) { stored = {}; }

    var params = new URLSearchParams(window.location.search);
    var found = false;
    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) { stored[key] = value.slice(0, 200); found = true; }
    });

    if (found) {
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(stored)); } catch (e) { /* private mode */ }
    }
    return stored;
  }

  /* ── analytics: Vercel Analytics custom events, never any personal data ── */

  function track(name, props) {
    if (typeof window.va === 'function') {
      try { window.va('event', { name: name, data: props || {} }); } catch (e) { /* no-op */ }
    }
  }

  /* ── markup ── */

  function formHtml(location) {
    var id = 'lead-email-' + location;
    return '' +
      '<form class="lead-form" novalidate>' +
        '<div class="lead-form-row">' +
          '<label class="sr-only" for="' + id + '">Email address</label>' +
          '<input class="lead-input" type="email" id="' + id + '" name="email" ' +
                 'placeholder="Enter your email" autocomplete="email" ' +
                 'inputmode="email" spellcheck="false" required />' +
          '<button class="lead-btn" type="submit">Get Early Access</button>' +
        '</div>' +
        '<div class="lead-hp" aria-hidden="true">' +
          '<label>Company<input type="text" name="company" tabindex="-1" autocomplete="off" /></label>' +
        '</div>' +
        '<p class="lead-hint">No spam. Unsubscribe anytime. ' +
          '<a href="privacy.html">Privacy</a>.</p>' +
        '<p class="lead-msg" role="status" aria-live="polite"></p>' +
      '</form>';
  }

  function successHtml() {
    return '' +
      '<div class="lead-done">' +
        '<p class="lead-done-title">YOU\'RE IN <span class="accent">THE ZONE.</span></p>' +
        '<p class="lead-done-text">You\'re now on the HPZ Early Access List. Watch your inbox for HPZ updates, beta opportunities and launch news.</p>' +
        '<div class="lead-seg" hidden>' +
          '<p class="lead-seg-q">How do you train?</p>' +
          '<div class="lead-seg-btns">' +
            '<button type="button" class="lead-seg-btn" data-segment="athlete">Athlete</button>' +
            '<button type="button" class="lead-seg-btn" data-segment="coach">Coach</button>' +
            '<button type="button" class="lead-seg-btn" data-segment="lifestyle">Fitness / Lifestyle</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function alreadyHtml() {
    return '' +
      '<div class="lead-done">' +
        '<p class="lead-done-title">YOU\'RE ALREADY <span class="accent">IN THE ZONE.</span></p>' +
        '<p class="lead-done-text">This email is already on the HPZ Early Access List. Nothing else to do — we\'ll be in touch.</p>' +
      '</div>';
  }

  /* ── behaviour ── */

  function mount(host) {
    var location = host.getAttribute('data-lead-mount') || 'unknown';
    host.innerHTML = formHtml(location);

    var form = host.querySelector('.lead-form');
    var input = host.querySelector('.lead-input');
    var button = host.querySelector('.lead-btn');
    var message = host.querySelector('.lead-msg');
    var honeypot = host.querySelector('input[name="company"]');

    var mountedAt = Date.now();
    var started = false;
    var busy = false;

    function say(text, kind) {
      message.textContent = text;
      message.className = 'lead-msg' + (kind ? ' is-' + kind : '');
    }

    input.addEventListener('input', function () {
      input.removeAttribute('aria-invalid');
      if (message.textContent) say('');
      if (!started) {
        started = true;
        track('lead_form_started', { form_location: location });
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) return;

      var email = (input.value || '').trim();

      if (!email) {
        input.setAttribute('aria-invalid', 'true');
        say('Please enter your email address.', 'error');
        input.focus();
        track('lead_form_error', { form_location: location, reason: 'empty' });
        return;
      }

      if (!EMAIL_RE.test(email.toLowerCase())) {
        input.setAttribute('aria-invalid', 'true');
        say('That email address doesn\'t look right.', 'error');
        input.focus();
        track('lead_form_error', { form_location: location, reason: 'invalid' });
        return;
      }

      busy = true;
      button.disabled = true;
      button.textContent = 'Sending...';
      say('');
      track('lead_form_submit', { form_location: location });

      var payload = {
        email: email,
        company: honeypot ? honeypot.value : '',
        elapsed_ms: Date.now() - mountedAt,
        form_location: location,
        page: window.location.pathname,
        source: 'website'
      };
      var attr = attribution();
      UTM_KEYS.forEach(function (key) { if (attr[key]) payload[key] = attr[key]; });

      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; })
            .then(function (data) { return { status: response.status, data: data }; });
        })
        .then(function (result) {
          if (timer) clearTimeout(timer);
          var data = result.data || {};

          if (result.status === 429) {
            throw new Error('Too many attempts. Please try again in a few minutes.');
          }
          if (!data.ok) {
            throw new Error(data.error === 'invalid_email'
              ? 'That email address doesn\'t look right.'
              : 'Something went wrong. Please try again.');
          }

          if (data.status === 'already') {
            host.innerHTML = alreadyHtml();
            track('lead_form_success', { form_location: location, result: 'already' });
            return;
          }

          host.innerHTML = successHtml();
          track('lead_form_success', { form_location: location, result: 'new' });
          if (data.token) enableSegmentation(host, data.token, location);
        })
        .catch(function (error) {
          if (timer) clearTimeout(timer);
          busy = false;
          button.disabled = false;
          button.textContent = 'Get Early Access';
          var text = error && error.name === 'AbortError'
            ? 'That took too long. Please check your connection and try again.'
            : (error && error.message) || 'Something went wrong. Please try again.';
          say(text, 'error');
          track('lead_form_error', { form_location: location, reason: 'request' });
        });
    });

    // Fire a view event once, the first time the form scrolls into sight.
    if ('IntersectionObserver' in window) {
      var seen = false;
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !seen) {
            seen = true;
            track('lead_form_view', { form_location: location });
            observer.disconnect();
          }
        });
      }, { threshold: 0.4 });
      observer.observe(host);
    }
  }

  function enableSegmentation(host, token, location) {
    var wrap = host.querySelector('.lead-seg');
    if (!wrap) return;
    wrap.hidden = false;

    var buttons = wrap.querySelectorAll('.lead-seg-btn');
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var segment = button.getAttribute('data-segment');
        Array.prototype.forEach.call(buttons, function (other) { other.disabled = true; });
        button.textContent = 'Saved';

        track('lead_segment_selected', { form_location: location, segment: segment });

        fetch('/api/segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, segment: segment })
        }).catch(function () { /* segmentation is optional — never surface an error */ });

        var question = wrap.querySelector('.lead-seg-q');
        if (question) question.textContent = 'Thanks — noted.';
      });
    });
  }

  function init() {
    // Capture attribution on arrival, so it survives navigation to other pages
    // even after the query string is gone.
    attribution();
    var hosts = document.querySelectorAll('[data-lead-mount]');
    Array.prototype.forEach.call(hosts, mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
