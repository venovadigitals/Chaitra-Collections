// Chaitra Collections — Wishlist
//
// There's no customer login system yet, so the wishlist is stored in this
// browser's localStorage (a list of product ids) rather than in Supabase.
// It works everywhere the heart button appears (home/shop/product pages)
// via event delegation, so newly-rendered product cards work automatically
// without each page having to wire up its own click handlers.

(function () {
  var LS_KEY = 'chaitra_wishlist';

  function readWishlist() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; }
  }
  function writeWishlist(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function updateCountBadges() {
    var count = readWishlist().length;
    document.querySelectorAll('a[aria-label="Wishlist"]').forEach(function (a) {
      a.textContent = count ? 'Wishlist (' + count + ')' : 'Wishlist';
    });
  }

  function syncButtons() {
    document.querySelectorAll('.product-wishlist[data-id]').forEach(function (btn) {
      var active = readWishlist().indexOf(btn.getAttribute('data-id')) !== -1;
      btn.classList.toggle('is-active', active);
      btn.style.color = active ? '#6E1423' : '';
    });
  }

  window.ChaitraWishlist = {
    has: function (id) { return readWishlist().indexOf(id) !== -1; },
    toggle: function (id) {
      var list = readWishlist();
      var idx = list.indexOf(id);
      if (idx === -1) list.push(id); else list.splice(idx, 1);
      writeWishlist(list);
      updateCountBadges();
      return idx === -1; // true if the item is now wishlisted
    },
    remove: function (id) {
      var list = readWishlist().filter(function (x) { return x !== id; });
      writeWishlist(list);
      updateCountBadges();
    },
    getIds: readWishlist,
    sync: syncButtons
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Point every "Wishlist" nav link at the real wishlist page.
    document.querySelectorAll('a[aria-label="Wishlist"]').forEach(function (a) {
      a.setAttribute('href', 'wishlist.html');
    });

    // Delegated click handling: works for cards rendered after this file loads.
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.product-wishlist[data-id]');
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute('data-id');
      var nowActive = window.ChaitraWishlist.toggle(id);
      btn.classList.toggle('is-active', nowActive);
      btn.style.color = nowActive ? '#6E1423' : '';
    });

    updateCountBadges();
    syncButtons();

    // ---------------------------------------------------------------
    // wishlist.html page-listing mode
    // ---------------------------------------------------------------
    var grid = document.getElementById('wishlistGrid');
    if (!grid || !window.ChaitraData) return;
    var Data = window.ChaitraData;

    function cardHtml(p) {
      var discount = p.salePrice > p.price
        ? Math.round(((p.salePrice - p.price) / p.salePrice) * 100) + '% off'
        : '';
      var oldPriceHtml = p.salePrice > p.price ? '<span class="price-old">' + Data.formatRs(p.salePrice) + '</span>' : '';
      var offHtml = discount ? '<span class="price-off">' + discount + '</span>' : '';
      var link = 'product.html?id=' + encodeURIComponent(p.id);
      return (
        '<article class="product-card">' +
          '<div class="product-media">' +
            '<button class="product-wishlist is-active" data-id="' + p.id + '" aria-label="Remove from wishlist" style="color:#6E1423;">&hearts;</button>' +
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

    async function renderPage() {
      await Data.ensureSeeded();
      var ids = readWishlist();
      if (!ids.length) {
        grid.innerHTML = '<p style="text-align:center; color: var(--ink-soft); grid-column: 1 / -1; padding: 2rem 0;">Your wishlist is empty. Tap the heart on any product to save it here.</p>';
        return;
      }
      var all = await Data.getProducts();
      var items = ids.map(function (id) { return all.find(function (p) { return p.id === id; }); }).filter(Boolean);
      if (!items.length) {
        grid.innerHTML = '<p style="text-align:center; color: var(--ink-soft); grid-column: 1 / -1; padding: 2rem 0;">Your wishlist is empty. Tap the heart on any product to save it here.</p>';
        return;
      }
      grid.innerHTML = items.map(cardHtml).join('');
    }

    renderPage();

    // Re-render whenever an item is unhearted from this page itself.
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.product-wishlist[data-id]');
      if (!btn) return;
      setTimeout(renderPage, 0);
    });
  });
})();
