// Chaitra Collections — Product detail page
//
// This single template serves every product: it reads ?id=<product id>
// from the URL and fills the page in from the shared data layer (data.js).
// Product cards site-wide (home.js, shop.js, search.js) link here as
// product.html?id=<id> so each product gets its own shareable URL.

document.addEventListener('DOMContentLoaded', async function () {

  if (!window.ChaitraData) return;
  var Data = window.ChaitraData;

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');

  var contentEl = document.getElementById('pdContent');
  var notFoundEl = document.getElementById('pdNotFound');
  var relatedSection = document.getElementById('relatedSection');

  function showNotFound() {
    if (contentEl) contentEl.style.display = 'none';
    if (relatedSection) relatedSection.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = 'block';
  }

  if (!id) { showNotFound(); return; }

  await Data.ensureSeeded();
  var product = await Data.getProductById(id);

  if (!product || product.status !== 'active') { showNotFound(); return; }

  // ---------------------------------------------------------------
  // Fill in the main product info
  // ---------------------------------------------------------------
  document.title = product.name + ' | Chaitra Collections';
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', 'Shop the ' + product.name + ' at Chaitra Collections.');

  document.getElementById('pdBreadcrumbName').textContent = product.name;
  var breadcrumbCategory = document.getElementById('pdBreadcrumbCategory');
  breadcrumbCategory.textContent = product.category;
  breadcrumbCategory.setAttribute('href', 'shop.html?category=' + encodeURIComponent(navGroupOf(product.category)));

  document.getElementById('pdCategory').textContent = product.category;
  document.getElementById('pdName').textContent = product.name;
  document.getElementById('pdDetailCategory').textContent = product.category;

  var img = document.getElementById('pdImage');
  img.src = Data.optimizeImage(product.image, 900);
  img.alt = product.name;

  // ---------------------------------------------------------------
  // Gallery thumbnails — only shown when the product has more than
  // one photo. Wired up right here (rather than relying on a
  // page-load-time listener) since these elements don't exist until
  // this async render happens.
  // ---------------------------------------------------------------
  var thumbsBox = document.getElementById('pdGalleryThumbs');
  var galleryImages = (product.images && product.images.length ? product.images : [product.image]).filter(Boolean);
  if (thumbsBox) {
    if (galleryImages.length > 1) {
      thumbsBox.innerHTML = galleryImages.map(function (src, i) {
        return '<div class="' + (i === 0 ? 'active' : '') + '" data-full="' + Data.escapeHtml(Data.optimizeImage(src, 900)) + '">' +
          '<img src="' + Data.escapeHtml(Data.optimizeImage(src, 120)) + '" alt="' + Data.escapeHtml(product.name) + ' &mdash; photo ' + (i + 1) + '" loading="lazy">' +
        '</div>';
      }).join('');
      thumbsBox.style.display = '';
      thumbsBox.querySelectorAll('[data-full]').forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          thumbsBox.querySelectorAll('[data-full]').forEach(function (t) { t.classList.remove('active'); });
          thumb.classList.add('active');
          img.src = thumb.getAttribute('data-full');
        });
      });
    } else {
      thumbsBox.innerHTML = '';
      thumbsBox.style.display = 'none';
    }
  }

  document.getElementById('pdPriceNow').textContent = Data.formatRs(product.price);
  var oldEl = document.getElementById('pdPriceOld');
  var offEl = document.getElementById('pdPriceOff');
  if (product.salePrice > product.price) {
    oldEl.textContent = Data.formatRs(product.salePrice);
    oldEl.style.display = '';
    var discount = Math.round(((product.salePrice - product.price) / product.salePrice) * 100);
    offEl.textContent = discount + '% off';
    offEl.style.display = '';
  }

  var stockNote = document.getElementById('pdStockNote');
  var addToCartBtn = document.getElementById('pdAddToCart');
  var buyNowBtn = document.getElementById('pdBuyNow');

  if (product.stock <= 0) {
    stockNote.textContent = 'Out of stock';
    stockNote.style.color = '#8A1F1F';
    stockNote.style.fontWeight = '600';
    if (addToCartBtn) {
      addToCartBtn.textContent = 'Out of Stock';
      addToCartBtn.style.pointerEvents = 'none';
      addToCartBtn.style.opacity = '0.6';
    }
    if (buyNowBtn) {
      buyNowBtn.style.pointerEvents = 'none';
      buyNowBtn.style.opacity = '0.6';
    }
  } else {
    stockNote.textContent = 'Inclusive of all taxes';

    function showAddedToast(message) {
      var toast = document.getElementById('storeToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'storeToast';
        toast.className = 'store-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toast._hideTimer);
      toast._hideTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
    }

    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!window.ChaitraCart) return;
        window.ChaitraCart.add(product.id, 1);
        showAddedToast(product.name + ' added to cart');
        window.ChaitraCart.open();
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!window.ChaitraCart) { window.location.href = 'checkout.html'; return; }
        window.ChaitraCart.add(product.id, 1);
        window.location.href = 'checkout.html';
      });
    }
  }

  // ---------------------------------------------------------------
  // Nav-group guess, matching shop.js's logic, used only to link the
  // breadcrumb back to the right filtered shop page.
  // ---------------------------------------------------------------
  function navGroupOf(categoryText) {
    var c = (categoryText || '').toLowerCase();
    if (c.indexOf('saree') !== -1) return 'sarees';
    if (c.indexOf('lehenga') !== -1) return 'lehengas';
    if (c.indexOf('kurta') !== -1 || c.indexOf('suit') !== -1 || c.indexOf('palazzo') !== -1) return 'kurtas';
    if (c.indexOf('blouse') !== -1) return 'blouses';
    return '';
  }

  // ---------------------------------------------------------------
  // Related products: same category first, then other active products.
  // ---------------------------------------------------------------
  var relatedContainer = document.getElementById('relatedProducts');
  var allProducts = await Data.getProducts();
  var others = allProducts.filter(function (p) { return p.id !== product.id && p.status === 'active'; });
  var sameCategory = others.filter(function (p) { return p.category === product.category; });
  var rest = others.filter(function (p) { return p.category !== product.category; });
  var related = sameCategory.concat(rest).slice(0, 4);

  function relatedCardHtml(p) {
    var discount = p.salePrice > p.price
      ? Math.round(((p.salePrice - p.price) / p.salePrice) * 100) + '% off'
      : '';
    var oldPriceHtml = p.salePrice > p.price ? '<span class="price-old">' + Data.formatRs(p.salePrice) + '</span>' : '';
    var offHtml = discount ? '<span class="price-off">' + discount + '</span>' : '';
    var link = 'product.html?id=' + encodeURIComponent(p.id);
    return (
      '<article class="product-card">' +
        '<div class="product-media">' +
          '<button class="product-wishlist" data-id="' + p.id + '" aria-label="Add to wishlist">&hearts;</button>' +
          '<a href="' + link + '"><img src="' + Data.escapeHtml(Data.optimizeImage(p.image, 600)) + '" alt="' + Data.escapeHtml(p.name) + '" loading="lazy"></a>' +
        '</div>' +
        '<div class="product-info">' +
          '<span class="cat">' + Data.escapeHtml(p.category) + '</span>' +
          '<h3><a href="' + link + '">' + Data.escapeHtml(p.name) + '</a></h3>' +
          '<div class="price-row"><span class="price-now">' + Data.formatRs(p.price) + '</span>' + oldPriceHtml + offHtml + '</div>' +
        '</div>' +
      '</article>'
    );
  }

  if (relatedContainer) {
    if (!related.length) {
      relatedContainer.innerHTML = '<p style="text-align:center; color: var(--ink-soft); grid-column: 1 / -1;">No other products yet.</p>';
    } else {
      relatedContainer.innerHTML = related.map(relatedCardHtml).join('');
      // Wishlist state (heart fill + count) is handled globally by wishlist.js
      if (window.ChaitraWishlist) window.ChaitraWishlist.sync();
    }
  }
});
