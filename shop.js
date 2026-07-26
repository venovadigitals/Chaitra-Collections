// Chaitra Collections — Shop page dynamic rendering + filtering
//
// Pulls the live catalog from the shared data layer (data.js), same as
// the homepage bestsellers. Adds:
//   - Nav bar filtering: New Arrivals / Sarees / Lehengas / Kurtas & Suits /
//     Blouses / Sale drive this page via ?category= and ?sale= URL params.
//   - A "Category" sidebar filter, auto-built from whatever categories are
//     actually present in the current result set.
//   - A "Price" sidebar filter (radio buttons).
//   - A "Sort by" dropdown (Featured / Price / Newest).

document.addEventListener('DOMContentLoaded', async function () {

  if (!window.ChaitraData) return;
  var Data = window.ChaitraData;
  await Data.ensureSeeded();

  var grid = document.getElementById('shopGrid');
  var resultsCount = document.getElementById('resultsCount');
  var sortSelect = document.getElementById('sortSelect');
  var categoryFilterGroup = document.getElementById('categoryFilterGroup');
  var priceFilterGroup = document.getElementById('priceFilterGroup');
  var clearPriceBtn = document.getElementById('clearPriceFilter');
  var shopTitle = document.getElementById('shopTitle');
  var shopDesc = document.getElementById('shopDesc');
  var shopBreadcrumb = document.getElementById('shopBreadcrumb');
  var navLinks = document.getElementById('navLinks');

  if (!grid) return;

  // ---------------------------------------------------------------
  // Nav-bar category groups. Each category managed in the admin
  // dashboard (Categories section) is tagged with an exact group —
  // sarees / lehengas / kurtas / blouses / other. For any product
  // whose category text hasn't been added there yet, fall back to a
  // keyword guess so nothing silently disappears from the shop.
  // ---------------------------------------------------------------
  var NAV_GROUPS = {
    sarees: { label: 'Sarees', keywords: ['saree'] },
    lehengas: { label: 'Lehengas', keywords: ['lehenga'] },
    kurtas: { label: 'Kurta Sets', keywords: ['kurta', 'suit', 'palazzo'] },
    blouses: { label: 'Blouses', keywords: ['blouse'] }
  };

  var categoryGroupMap = {}; // lowercased category name -> group key, from the managed Categories list

  function navGroupOf(categoryText) {
    var c = (categoryText || '').toLowerCase();
    if (categoryGroupMap.hasOwnProperty(c)) return categoryGroupMap[c];
    for (var key in NAV_GROUPS) {
      var hit = NAV_GROUPS[key].keywords.some(function (kw) { return c.indexOf(kw) !== -1; });
      if (hit) return key;
    }
    return 'other';
  }

  // ---------------------------------------------------------------
  // State: URL params drive the nav-bar filter; sidebar + sort are
  // in-page state on top of that.
  // ---------------------------------------------------------------
  var params = new URLSearchParams(window.location.search);
  var state = {
    navCategory: params.get('category') || '',
    sale: params.get('sale') === '1',
    search: params.get('search') || '',
    subCategory: '',   // sidebar category checkbox (exact category string)
    priceRange: '',     // "min-max" from sidebar radios
    sort: 'featured'
  };

  var allProducts = [];

  function setUrl() {
    var p = new URLSearchParams();
    if (state.navCategory) p.set('category', state.navCategory);
    if (state.sale) p.set('sale', '1');
    if (state.search) p.set('search', state.search);
    var qs = p.toString();
    var newUrl = window.location.pathname + (qs ? '?' + qs : '');
    window.history.replaceState({}, '', newUrl);
  }

  function highlightNav() {
    if (!navLinks) return;
    navLinks.querySelectorAll('a').forEach(function (a) {
      var isActive;
      if (state.search) {
        isActive = false;
      } else if (state.sale) {
        isActive = a.hasAttribute('data-sale');
      } else {
        isActive = a.hasAttribute('data-category') && a.getAttribute('data-category') === state.navCategory;
      }
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function updateHeading() {
    var title = 'All Products';
    var desc = 'Handpicked sarees, lehengas, kurta sets and blouses, sourced directly from weaver clusters across India.';
    if (state.search) {
      title = 'Search results for \u201c' + state.search + '\u201d';
      desc = 'Products matching your search across our full collection.';
    } else if (state.sale) {
      title = 'Sale';
      desc = 'Discounted pieces from our current collection, while stocks last.';
    } else if (state.navCategory && NAV_GROUPS[state.navCategory]) {
      title = NAV_GROUPS[state.navCategory].label;
      desc = 'Browse our ' + title.toLowerCase() + ' collection, handpicked from weaver clusters across India.';
    } else if (state.navCategory === '') {
      title = 'New Arrivals';
    }
    if (shopTitle) shopTitle.textContent = title;
    if (shopDesc) shopDesc.textContent = desc;
    if (shopBreadcrumb) shopBreadcrumb.textContent = title;
    document.title = title + ' | Chaitra Collections';
  }

  // ---------------------------------------------------------------
  // Sidebar: category checkboxes are rebuilt from whatever categories
  // exist within the current nav selection, so "Sarees" shows saree
  // sub-categories, "Lehengas" shows lehenga sub-categories, etc.
  // ---------------------------------------------------------------
  function rebuildCategoryFilter(productsInNavScope) {
    if (!categoryFilterGroup) return;
    var cats = [];
    productsInNavScope.forEach(function (p) {
      if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    cats.sort();

    if (!cats.length) {
      categoryFilterGroup.innerHTML = '<p style="font-size:0.85rem; color: var(--ink-soft); margin:0;">No sub-categories yet.</p>';
      return;
    }

    categoryFilterGroup.innerHTML = cats.map(function (cat) {
      var checked = state.subCategory === cat ? ' checked' : '';
      return '<label class="filter-option"><input type="checkbox" value="' + Data.escapeHtml(cat) + '"' + checked + '> ' + Data.escapeHtml(cat) + '</label>';
    }).join('');

    categoryFilterGroup.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
      box.addEventListener('change', function () {
        if (box.checked) {
          // Only one sub-category filter active at a time.
          categoryFilterGroup.querySelectorAll('input[type="checkbox"]').forEach(function (other) {
            if (other !== box) other.checked = false;
          });
          state.subCategory = box.value;
        } else {
          state.subCategory = '';
        }
        renderAll();
      });
    });
  }

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  function productCardHtml(p) {
    var link = 'product.html?id=' + encodeURIComponent(p.id);
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
          '<button class="product-wishlist" data-id="' + p.id + '" aria-label="Add to wishlist">&hearts;</button>' +
          '<a href="' + link + '"><img src="' + Data.escapeHtml(p.image) + '" alt="' + Data.escapeHtml(p.name) + '"></a>' +
        '</div>' +
        '<div class="product-info">' +
          '<span class="cat">' + Data.escapeHtml(p.category) + '</span>' +
          '<h3><a href="' + link + '">' + Data.escapeHtml(p.name) + '</a></h3>' +
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

  function attachWishlistHandlers() {
    // Wishlist state (heart fill + count) is handled globally by wishlist.js
    if (window.ChaitraWishlist) window.ChaitraWishlist.sync();
  }

  function applyPriceRange(list) {
    if (!state.priceRange) return list;
    var parts = state.priceRange.split('-');
    var min = Number(parts[0]);
    var max = Number(parts[1]);
    return list.filter(function (p) { return p.price >= min && p.price <= max; });
  }

  function applySort(list) {
    var sorted = list.slice();
    if (state.sort === 'price-asc') {
      sorted.sort(function (a, b) { return a.price - b.price; });
    } else if (state.sort === 'price-desc') {
      sorted.sort(function (a, b) { return b.price - a.price; });
    } else if (state.sort === 'featured') {
      sorted.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    }
    // 'newest' relies on the fetch order (created_at desc) already applied.
    return sorted;
  }

  function renderAll() {
    setUrl();
    highlightNav();
    updateHeading();

    // Scope by nav selection first (this also drives the sidebar options).
    var navScoped = allProducts.filter(function (p) {
      if (p.status !== 'active') return false;
      if (state.search) {
        var q = state.search.toLowerCase();
        return (p.name && p.name.toLowerCase().indexOf(q) !== -1) ||
               (p.category && p.category.toLowerCase().indexOf(q) !== -1);
      }
      if (state.sale) return p.salePrice > p.price;
      if (state.navCategory) return navGroupOf(p.category) === state.navCategory;
      return true;
    });

    rebuildCategoryFilter(navScoped);

    var visible = navScoped;
    if (state.subCategory) {
      visible = visible.filter(function (p) { return p.category === state.subCategory; });
    }
    visible = applyPriceRange(visible);
    visible = applySort(visible);

    if (resultsCount) {
      resultsCount.textContent = visible.length
        ? 'Showing ' + visible.length + ' of ' + visible.length + ' results'
        : '0 results';
    }

    if (!visible.length) {
      var emptyMsg = state.search
        ? 'No products match \u201c' + Data.escapeHtml(state.search) + '\u201d. Try a different search term.'
        : 'No products match these filters yet. Try clearing a filter or check back soon.';
      grid.innerHTML = '<p style="text-align:center; color: var(--ink-soft); grid-column: 1 / -1; padding: 2rem 0;">' + emptyMsg + '</p>';
      return;
    }

    grid.innerHTML = visible.map(productCardHtml).join('');
    attachWishlistHandlers();
  }

  // ---------------------------------------------------------------
  // Static control wiring
  // ---------------------------------------------------------------
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      state.sort = sortSelect.value;
      renderAll();
    });
  }

  if (priceFilterGroup) {
    priceFilterGroup.querySelectorAll('input[type="radio"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.priceRange = radio.value;
        renderAll();
      });
    });
  }

  if (clearPriceBtn) {
    clearPriceBtn.addEventListener('click', function () {
      state.priceRange = '';
      if (priceFilterGroup) {
        priceFilterGroup.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
      }
      renderAll();
    });
  }

  // React to the browser back/forward buttons (nav links replace the URL).
  window.addEventListener('popstate', function () {
    var p = new URLSearchParams(window.location.search);
    state.navCategory = p.get('category') || '';
    state.sale = p.get('sale') === '1';
    state.search = p.get('search') || '';
    state.subCategory = '';
    renderAll();
  });

  // Intercept nav-bar clicks so filtering is instant (no full page reload).
  if (navLinks) {
    navLinks.querySelectorAll('a[data-category], a[data-sale]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        state.sale = a.hasAttribute('data-sale');
        state.navCategory = a.hasAttribute('data-category') ? a.getAttribute('data-category') : '';
        state.search = '';
        state.subCategory = '';
        state.priceRange = '';
        if (priceFilterGroup) {
          priceFilterGroup.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
        }
        renderAll();
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ---------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------
  var categories = await Data.getCategories();
  categories.forEach(function (c) { categoryGroupMap[c.name.toLowerCase()] = c.group; });

  allProducts = await Data.getProducts();
  renderAll();
});
