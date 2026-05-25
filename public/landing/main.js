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