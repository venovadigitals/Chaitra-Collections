// Chaitra Collections — shared interactions

document.addEventListener('DOMContentLoaded', function () {

  // Mobile nav toggle
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('nav-links--open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Product gallery thumbnail switch (product.html)
  var thumbs = document.querySelectorAll('.pd-gallery-thumbs [data-full]');
  var mainImage = document.querySelector('.pd-gallery-main img');
  if (thumbs.length && mainImage) {
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        thumbs.forEach(function (t) { t.classList.remove('active'); });
        thumb.classList.add('active');
        var newSrc = thumb.getAttribute('data-full');
        mainImage.setAttribute('src', newSrc);
      });
    });
  }

  // Size pill selection (product.html)
  var sizePills = document.querySelectorAll('.size-pill');
  sizePills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      sizePills.forEach(function (p) { p.classList.remove('active'); });
      pill.classList.add('active');
    });
  });

  // Newsletter forms — placeholder submit handling
  var newsletterForms = document.querySelectorAll('.newsletter-form');
  newsletterForms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var button = form.querySelector('button');
      if (button) {
        var originalText = button.textContent;
        button.textContent = 'Subscribed';
        setTimeout(function () { button.textContent = originalText; }, 2500);
      }
      if (input) { input.value = ''; }
    });
  });

  // Wishlist toggle on product cards is handled globally by wishlist.js
  // (it uses event delegation, so it works for cards rendered dynamically
  // by home.js / shop.js / product.js after this script runs).

});
