const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

const navEl = document.querySelector('nav');
const hamburgerBtn = document.querySelector('.nav-hamburger');

function openNav() {
  navEl.classList.add('nav-open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  hamburgerBtn.setAttribute('aria-label', 'Close navigation menu');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  navEl.classList.remove('nav-open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  hamburgerBtn.setAttribute('aria-label', 'Open navigation menu');
  document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', () => {
  navEl.classList.contains('nav-open') ? closeNav() : openNav();
});

document.querySelectorAll('#nav-links-list a').forEach(link => {
  link.addEventListener('click', closeNav);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navEl.classList.contains('nav-open')) closeNav();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeNav();
});

// Analytics: elements with data-event fire a named Vercel Analytics custom event.
// Requires Vercel Web Analytics with custom events enabled (Pro plan); no-op otherwise.
document.querySelectorAll('[data-event]').forEach(el => {
  el.addEventListener('click', () => {
    if (typeof window.va === 'function') {
      window.va('event', { name: el.dataset.event });
    }
  });
});

document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const answer = btn.nextElementSibling;
    btn.setAttribute('aria-expanded', String(!expanded));
    if (expanded) {
      answer.hidden = true;
    } else {
      answer.hidden = false;
    }
  });
});
