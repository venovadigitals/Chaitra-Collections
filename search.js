// Chaitra Collections — Site-wide product search
//
// Wires up the "Search" nav-bar link on every storefront page. Clicking it
// opens a small overlay with live results (pulled from the shared data
// layer, data.js), and "View all results" / Enter jumps to the shop page
// with the query applied as a filter (shop.js reads ?search=).
//
// Requires data.js (and the Supabase script tag) to be loaded first.

document.addEventListener('DOMContentLoaded', function () {

  var triggers = document.querySelectorAll('a[aria-label="Search"]');
  if (!triggers.length) return;

  if (!window.ChaitraData) return;
  var Data = window.ChaitraData;

  // ---------------------------------------------------------------
  // Inject the overlay markup once per page.
  // ---------------------------------------------------------------
  var overlay = document.createElement('div');
  overlay.id = 'searchOverlay';
  overlay.className = 'search-overlay';
  overlay.innerHTML =
    '<div class="search-panel">' +
      '<div class="search-panel-head">' +
        '<input type="text" id="searchInput" placeholder="Search sarees, lehengas, kurta sets, blouses..." autocomplete="off">' +
        '<button type="button" id="searchCloseBtn" aria-label="Close search">&times;</button>' +
      '</div>' +
      '<div id="searchResults" class="search-results">' +
        '<p class="search-hint">Start typing to search the full collection.</p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = document.getElementById('searchInput');
  var resultsBox = document.getElementById('searchResults');
  var closeBtn = document.getElementById('searchCloseBtn');

  var allProducts = null; // lazy-loaded on first open
  var debounceTimer = null;

  function openOverlay() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 50);

    if (allProducts === null) {
      resultsBox.innerHTML = '<p class="search-hint">Loading products&hellip;</p>';
      Data.ensureSeeded()
        .then(function () { return Data.getProducts(); })
        .then(function (products) {
          allProducts = products.filter(function (p) { return p.status === 'active'; });
          renderResults(input.value.trim());
        });
    }
  }

  function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderResults(query) {
    if (!query) {
      resultsBox.innerHTML = '<p class="search-hint">Start typing to search the full collection.</p>';
      return;
    }
    if (allProducts === null) {
      resultsBox.innerHTML = '<p class="search-hint">Loading products&hellip;</p>';
      return;
    }

    var q = query.toLowerCase();
    var matches = allProducts.filter(function (p) {
      return (p.name && p.name.toLowerCase().indexOf(q) !== -1) ||
             (p.category && p.category.toLowerCase().indexOf(q) !== -1);
    });

    if (!matches.length) {
      resultsBox.innerHTML = '<p class="search-hint">No products match &ldquo;' + Data.escapeHtml(query) + '&rdquo;.</p>';
      return;
    }

    var shown = matches.slice(0, 6);
    var itemsHtml = shown.map(function (p) {
      return '<a class="search-result-item" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        '<img src="' + Data.escapeHtml(p.image) + '" alt="' + Data.escapeHtml(p.name) + '">' +
        '<span>' +
          '<span class="search-result-name">' + Data.escapeHtml(p.name) + '</span>' +
          '<span class="search-result-cat">' + Data.escapeHtml(p.category) + '</span>' +
        '</span>' +
        '<span class="search-result-price">' + Data.formatRs(p.price) + '</span>' +
      '</a>';
    }).join('');

    var viewAllHtml = '<a class="search-view-all" href="shop.html?search=' + encodeURIComponent(query) + '">' +
      'View all ' + matches.length + ' result' + (matches.length === 1 ? '' : 's') + ' for &ldquo;' + Data.escapeHtml(query) + '&rdquo;' +
    '</a>';

    resultsBox.innerHTML = itemsHtml + viewAllHtml;
  }

  // ---------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------
  triggers.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openOverlay();
    });
  });

  closeBtn.addEventListener('click', closeOverlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeOverlay();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
  });

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var value = input.value.trim();
    debounceTimer = setTimeout(function () { renderResults(value); }, 150);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var q = input.value.trim();
      if (q) window.location.href = 'shop.html?search=' + encodeURIComponent(q);
    }
  });
});
