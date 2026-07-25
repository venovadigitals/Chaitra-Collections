// Chaitra Collections — Homepage dynamic rendering
// Pulls products from the shared data layer (data.js) so that anything
// added, edited, marked "Featured", or set to Draft in the Admin
// dashboard is reflected here automatically, without touching HTML.

document.addEventListener('DOMContentLoaded', async function () {

  if (!window.ChaitraData) return;
  var Data = window.ChaitraData;
  await Data.ensureSeeded();

  var container = document.getElementById('bestsellerProducts');
  if (!container) return;

  var MAX_PRODUCTS = 8;

  function productCardHtml(p) {
    var discount = p.salePrice > p.price
      ? Math.round(((p.salePrice - p.price) / p.salePrice) * 100) + '% off'
      : '';

    var tagHtml = p.tag ? '<span class="product-tag">' + Data.escapeHtml(p.tag) + '</span>' : '';
    var oldPriceHtml = p.salePrice > p.price
      ? '<span class="price-old">' + Data.formatRs(p.salePrice) + '</span>'
      : '';
    var offHtml = discount ? '<span class="price-off">' + discount + '</span>' : '';
    var outOfStockHtml = p.stock <= 0
      ? '<div style="font-size:0.78rem; color:#8A1F1F; font-weight:600; margin-top:0.3rem;">Out of stock</div>'
      : '';

    return (
      '<article class="product-card">' +
        '<div class="product-media">' +
          tagHtml +
          '<button class="product-wishlist" aria-label="Add to wishlist">&hearts;</button>' +
          '<a href="product.html"><img src="' + Data.escapeHtml(p.image) + '" alt="' + Data.escapeHtml(p.name) + '"></a>' +
        '</div>' +
        '<div class="product-info">' +
          '<span class="cat">' + Data.escapeHtml(p.category) + '</span>' +
          '<h3><a href="product.html">' + Data.escapeHtml(p.name) + '</a></h3>' +
          '<div class="price-row">' +
            '<span class="price-now">' + Data.formatRs(p.price) + '</span>' +
            oldPriceHtml +
            offHtml +
          '</div>' +
          outOfStockHtml +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    return Data.getProducts().then(function (allProducts) {
      var products = allProducts
        .filter(function (p) { return p.status === 'active' && p.featured; })
        .slice(0, MAX_PRODUCTS);

      if (!products.length) {
        container.innerHTML = '<p style="text-align:center; color: var(--ink-soft); grid-column: 1 / -1;">No featured products yet. Add some from the admin dashboard.</p>';
        return;
      }

      container.innerHTML = products.map(productCardHtml).join('');

      // Re-attach wishlist toggle behaviour to the freshly rendered cards
      container.querySelectorAll('.product-wishlist').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          btn.classList.toggle('is-active');
          btn.style.color = btn.classList.contains('is-active') ? '#6E1423' : '';
        });
      });
    });
  }

  render();
});
