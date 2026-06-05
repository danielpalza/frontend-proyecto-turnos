// script.js

// FEATURES SWITCH

const featureButtons =
  document.querySelectorAll('.feature-btn');

const featureContents =
  document.querySelectorAll('.feature-content');

featureButtons.forEach(button => {

  button.addEventListener('click', () => {

    featureButtons.forEach(btn =>
      btn.classList.remove('active')
    );

    featureContents.forEach(content =>
      content.classList.remove('active')
    );

    button.classList.add('active');

    const target =
      button.dataset.feature;

    document
      .getElementById(target)
      .classList.add('active');

  });

});

// FAQ ACCORDION

const faqItems =
  document.querySelectorAll('.faq-item');

const faqTransition =
  getComputedStyle(document.documentElement)
    .getPropertyValue('--transition')
    .trim() || '.3s ease';

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function collapseFaqItem(item){

  const answer =
    item.querySelector('.faq-answer');

  if(!answer) return;

  if(prefersReducedMotion){

    item.removeAttribute('open');
    return;

  }

  answer.style.height = answer.scrollHeight + 'px';
  answer.style.overflow = 'hidden';

  requestAnimationFrame(() => {

    answer.style.transition = `height ${faqTransition}`;
    answer.style.height = '0px';

  });

  answer.addEventListener('transitionend', function onEnd(event){

    if(event.propertyName !== 'height') return;

    answer.removeEventListener('transitionend', onEnd);
    answer.style.transition = '';
    answer.style.height = '';
    answer.style.overflow = '';
    item.removeAttribute('open');

  });

}

function expandFaqItem(item){

  const answer =
    item.querySelector('.faq-answer');

  if(!answer) return;

  item.setAttribute('open', '');

  if(prefersReducedMotion) return;

  answer.style.height = '0px';
  answer.style.overflow = 'hidden';

  requestAnimationFrame(() => {

    answer.style.transition = `height ${faqTransition}`;
    answer.style.height = answer.scrollHeight + 'px';

  });

  answer.addEventListener('transitionend', function onEnd(event){

    if(event.propertyName !== 'height') return;

    answer.removeEventListener('transitionend', onEnd);
    answer.style.height = 'auto';
    answer.style.overflow = '';
    answer.style.transition = '';

  });

}

faqItems.forEach(item => {

  const summary =
    item.querySelector('summary');

  summary.addEventListener('click', event => {

    event.preventDefault();

    const isOpen =
      item.hasAttribute('open');

    faqItems.forEach(other => {

      if(other !== item && other.hasAttribute('open')){
        collapseFaqItem(other);
      }

    });

    if(isOpen){
      collapseFaqItem(item);
    } else {
      expandFaqItem(item);
    }

  });

});

// SWIPER

new Swiper('.testimonial-swiper', {

  loop:true,

  spaceBetween:24,

  autoplay:{
    delay:4000
  },

  breakpoints:{

    0:{
      slidesPerView:1
    },

    768:{
      slidesPerView:2
    }

  }

});

// NAVBAR SCROLL EFFECT

const navbar =
  document.querySelector('.navbar');

window.addEventListener('scroll', () => {

  if(window.scrollY > 40){

    navbar.style.background =
      'rgba(255,255,255,.92)';

  } else {

    navbar.style.background =
      'rgba(255,255,255,.7)';

  }

});