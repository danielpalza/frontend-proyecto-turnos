// main.js

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// FEATURES SWITCH

const featureButtons = document.querySelectorAll('.feature-btn');
const featureContents = document.querySelectorAll('.feature-content');

featureButtons.forEach((button) => {
  button.addEventListener('click', () => {
    featureButtons.forEach((btn) => btn.classList.remove('active'));
    featureContents.forEach((content) => content.classList.remove('active'));

    button.classList.add('active');

    const target = button.dataset.feature;
    const panel = document.getElementById(target);

    if (panel) panel.classList.add('active');
  });
});

// FAQ ACCORDION

const faqItems = document.querySelectorAll('.faq-item');

const faqTransition =
  getComputedStyle(document.documentElement).getPropertyValue('--transition').trim() || '.3s ease';

function collapseFaqItem(item) {
  const answer = item.querySelector('.faq-answer');
  if (!answer) return;

  if (prefersReducedMotion) {
    item.removeAttribute('open');
    return;
  }

  answer.style.height = answer.scrollHeight + 'px';
  answer.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    answer.style.transition = `height ${faqTransition}`;
    answer.style.height = '0px';
  });

  answer.addEventListener('transitionend', function onEnd(event) {
    if (event.propertyName !== 'height') return;

    answer.removeEventListener('transitionend', onEnd);
    answer.style.transition = '';
    answer.style.height = '';
    answer.style.overflow = '';
    item.removeAttribute('open');
  });
}

function expandFaqItem(item) {
  const answer = item.querySelector('.faq-answer');
  if (!answer) return;

  item.setAttribute('open', '');

  if (prefersReducedMotion) return;

  answer.style.height = '0px';
  answer.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    answer.style.transition = `height ${faqTransition}`;
    answer.style.height = answer.scrollHeight + 'px';
  });

  answer.addEventListener('transitionend', function onEnd(event) {
    if (event.propertyName !== 'height') return;

    answer.removeEventListener('transitionend', onEnd);
    answer.style.height = 'auto';
    answer.style.overflow = '';
    answer.style.transition = '';
  });
}

faqItems.forEach((item) => {
  const summary = item.querySelector('summary');
  if (!summary) return;

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    const isOpen = item.hasAttribute('open');

    faqItems.forEach((other) => {
      if (other !== item && other.hasAttribute('open')) {
        collapseFaqItem(other);
      }
    });

    if (isOpen) {
      collapseFaqItem(item);
    } else {
      expandFaqItem(item);
    }
  });
});

// NAVBAR SCROLL EFFECT

const navbar = document.querySelector('.navbar');

if (navbar) {
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// MOBILE MENU

const navToggle = document.querySelector('.nav-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

if (navToggle && mobileMenu) {
  const closeMenu = () => {
    mobileMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

// SCROLL REVEAL

const revealItems = document.querySelectorAll('[data-reveal]');

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((el) => el.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  revealItems.forEach((el) => observer.observe(el));
}

// FOOTER YEAR

const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
