// Chaitra Collections — Admin panel
// NOTE: the admin login below is a client-side password check only, not
// real authentication — see the security note at the top of data.js and
// supabase-schema.sql for what to change before this goes live.

(function () {

  var ADMIN_CREDENTIALS = { username: 'admin', password: 'chaitra2026' };

  // All data operations go through the shared data layer (data.js), which
  // talks to Supabase. Each of these is async now (they return Promises).
  var Data = window.ChaitraData;

  function formatRs(n) { return Data.formatRs(n); }
  function escapeHtml(str) { return Data.escapeHtml(str); }

  // Local caches so typing in a search box filters instantly without
  // re-querying Supabase on every keystroke. Refreshed after any
  // add/edit/delete, or when a section is opened.
  var _productsCache = [];
  var _ordersCache = [];
  var _customersCache = [];
  var _categoriesCache = [];

  // ---------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------

  function showToast(message) {
    var toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  // ---------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------

  function isLoggedIn() {
    return Data.isLoggedIn();
  }

  function initLogin() {
    var form = document.getElementById('adminLoginForm');
    var errorBox = document.getElementById('adminLoginError');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = document.getElementById('adminUsername').value.trim();
      var p = document.getElementById('adminPassword').value;
      if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
        Data.setLoggedIn(true);
        showApp();
      } else {
        errorBox.textContent = 'Incorrect username or password.';
        errorBox.classList.add('active');
      }
    });
  }

  function logout() {
    Data.setLoggedIn(false);
    document.getElementById('adminApp').style.display = 'none';
    document.getElementById('adminLoginScreen').style.display = 'flex';
  }

  async function showApp() {
    document.getElementById('adminLoginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'grid';
    await Data.ensureSeeded();
    await Promise.all([loadProducts(), loadOrders(), loadCustomers(), loadCategories()]);
    renderDashboard();
  }

  // ---------------------------------------------------------------------
  // Navigation between sections
  // ---------------------------------------------------------------------

  function initNav() {
    var links = document.querySelectorAll('.admin-nav a[data-section]');
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        links.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        var target = link.getAttribute('data-section');
        document.querySelectorAll('.admin-section').forEach(function (sec) {
          sec.classList.toggle('active', sec.id === 'section-' + target);
        });
        var titles = { dashboard: 'Dashboard', products: 'Products', categories: 'Categories', orders: 'Orders', customers: 'Customers' };
        document.getElementById('adminPageTitle').textContent = titles[target] || 'Dashboard';
      });
    });

    var logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  // ---------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------

  function renderDashboard() {
    var revenue = _ordersCache.filter(function (o) { return o.status !== 'cancelled'; })
      .reduce(function (sum, o) { return sum + o.total; }, 0);

    document.getElementById('statProducts').textContent = _productsCache.length;
    document.getElementById('statOrders').textContent = _ordersCache.length;
    document.getElementById('statRevenue').textContent = formatRs(revenue);
    document.getElementById('statCustomers').textContent = _customersCache.length;

    var recent = _ordersCache.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);
    var tbody = document.getElementById('recentOrdersBody');
    tbody.innerHTML = recent.map(function (o) {
      return '<tr>' +
        '<td>' + escapeHtml(o.orderNumber) + '</td>' +
        '<td>' + escapeHtml(o.customer) + '</td>' +
        '<td>' + escapeHtml(o.date) + '</td>' +
        '<td>' + formatRs(o.total) + '</td>' +
        '<td>' + statusBadge(o.status) + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="5" class="admin-empty-state">No orders yet.</td></tr>';
  }

  function statusBadge(status) {
    var map = {
      pending: ['draft', 'Pending'],
      shipped: ['low-stock', 'Shipped'],
      delivered: ['active', 'Delivered'],
      cancelled: ['out-of-stock', 'Cancelled']
    };
    var entry = map[status] || ['draft', status];
    return '<span class="admin-badge ' + entry[0] + '">' + entry[1] + '</span>';
  }

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------

  var editingProductId = null;

  function stockBadge(stock) {
    if (stock <= 0) return '<span class="admin-badge out-of-stock">Out of stock</span>';
    if (stock <= 5) return '<span class="admin-badge low-stock">Low: ' + stock + '</span>';
    return stock;
  }

  async function loadProducts() {
    _productsCache = await Data.getProducts();
    renderProductsTable();
  }

  function renderProductsTable() {
    var search = (document.getElementById('productSearch') || {}).value || '';
    var categoryFilter = (document.getElementById('productCategoryFilter') || {}).value || '';

    var filtered = _productsCache.filter(function (p) {
      var matchesSearch = p.name.toLowerCase().indexOf(search.toLowerCase()) !== -1;
      var matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    var tbody = document.getElementById('productsBody');
    tbody.innerHTML = filtered.map(function (p) {
      return '<tr>' +
        '<td><div class="admin-product-cell">' +
          '<div class="admin-table-thumb"><img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" onerror="this.style.opacity=0.15"></div>' +
          '<div><div class="name">' + escapeHtml(p.name) + '</div></div>' +
        '</div></td>' +
        '<td>' + escapeHtml(p.category) + '</td>' +
        '<td>' + formatRs(p.price) + '<br><span class="admin-form-hint" style="text-decoration:line-through;">' + formatRs(p.salePrice) + '</span></td>' +
        '<td>' + stockBadge(p.stock) + '</td>' +
        '<td><span class="admin-badge ' + (p.status === 'active' ? 'active' : 'draft') + '">' + (p.status === 'active' ? 'Active' : 'Draft') + '</span>' +
          (p.featured ? '<br><span class="admin-badge low-stock" style="margin-top:0.3rem;">Featured</span>' : '') +
        '</td>' +
        '<td><div class="admin-row-actions">' +
          '<button class="admin-icon-btn" title="Edit" onclick="ChaitraAdmin.editProduct(\'' + p.id + '\')">Edit</button>' +
          '<button class="admin-icon-btn danger" title="Delete" onclick="ChaitraAdmin.deleteProduct(\'' + p.id + '\')">Del</button>' +
        '</div></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="6" class="admin-empty-state">No products match your search.</td></tr>';

    // Populate category filter options from the managed categories list,
    // plus any legacy category text on existing products that hasn't been
    // added to Categories yet, so old data still filters correctly.
    var filterSelect = document.getElementById('productCategoryFilter');
    if (filterSelect) {
      var currentValue = filterSelect.value;
      var names = _categoriesCache.map(function (c) { return c.name; });
      _productsCache.forEach(function (p) {
        if (p.category && names.indexOf(p.category) === -1) names.push(p.category);
      });
      names.sort();
      filterSelect.innerHTML = '<option value="">All Categories</option>' +
        names.map(function (c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; }).join('');
      filterSelect.value = currentValue;
    }
  }

  function populateCategorySelect(selectedValue) {
    var select = document.getElementById('pfCategory');
    if (!select) return;
    var names = _categoriesCache.map(function (c) { return c.name; });
    if (selectedValue && names.indexOf(selectedValue) === -1) names.push(selectedValue);
    names.sort();
    select.innerHTML = '<option value="">Select a category&hellip;</option>' +
      names.map(function (n) { return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>'; }).join('');
    select.value = selectedValue || '';
  }

  function openProductModal(id) {
    editingProductId = id || null;
    var modal = document.getElementById('productModal');
    var form = document.getElementById('productForm');
    form.reset();

    if (id) {
      var p = _productsCache.find(function (x) { return x.id === id; });
      if (p) {
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('pfName').value = p.name;
        populateCategorySelect(p.category);
        document.getElementById('pfPrice').value = p.price;
        document.getElementById('pfSalePrice').value = p.salePrice;
        document.getElementById('pfStock').value = p.stock;
        document.getElementById('pfImage').value = p.image;
        document.getElementById('pfStatus').value = p.status;
        document.getElementById('pfTag').value = p.tag || '';
        document.getElementById('pfFeatured').checked = !!p.featured;
      }
    } else {
      document.getElementById('productModalTitle').textContent = 'Add Product';
      populateCategorySelect('');
    }
    modal.classList.add('active');
  }

  function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
  }

  async function saveProduct(e) {
    e.preventDefault();
    var submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    var data = {
      name: document.getElementById('pfName').value.trim(),
      category: document.getElementById('pfCategory').value.trim(),
      price: Number(document.getElementById('pfPrice').value),
      salePrice: Number(document.getElementById('pfSalePrice').value),
      stock: Number(document.getElementById('pfStock').value),
      image: document.getElementById('pfImage').value.trim() || 'REPLACE_WITH_CLOUDINARY_URL_PRODUCT',
      status: document.getElementById('pfStatus').value,
      tag: document.getElementById('pfTag').value.trim(),
      featured: document.getElementById('pfFeatured').checked
    };

    var result;
    if (editingProductId) {
      result = await Data.updateProduct(editingProductId, data);
    } else {
      result = await Data.addProduct(data);
    }

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Product'; }

    if (!result) {
      showToast('Something went wrong saving this product. Check the browser console.');
      return;
    }

    showToast(editingProductId ? 'Product updated' : 'Product added');
    closeProductModal();
    await loadProducts();
    renderDashboard();
  }

  function editProduct(id) { openProductModal(id); }

  async function deleteProduct(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    var ok = await Data.deleteProduct(id);
    if (!ok) { showToast('Could not delete this product. Check the browser console.'); return; }
    await loadProducts();
    renderDashboard();
    showToast('Product deleted');
  }

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------

  var editingCategoryId = null;
  var GROUP_LABELS = { sarees: 'Sarees', lehengas: 'Lehengas', kurtas: 'Kurtas & Suits', blouses: 'Blouses', other: 'Other' };

  async function loadCategories() {
    _categoriesCache = await Data.getCategories();
    renderCategoriesTable();
    renderProductsTable(); // refreshes the category filter dropdown too
  }

  function renderCategoriesTable() {
    var tbody = document.getElementById('categoriesBody');
    if (!tbody) return;
    var inUse = {};
    _productsCache.forEach(function (p) { inUse[p.category] = (inUse[p.category] || 0) + 1; });

    tbody.innerHTML = _categoriesCache.map(function (cat) {
      var count = inUse[cat.name] || 0;
      return '<tr>' +
        '<td>' + escapeHtml(cat.name) + (count ? '<div class="admin-form-hint">' + count + ' product' + (count === 1 ? '' : 's') + '</div>' : '') + '</td>' +
        '<td><span class="admin-badge draft">' + escapeHtml(GROUP_LABELS[cat.group] || cat.group) + '</span></td>' +
        '<td><div class="admin-row-actions">' +
          '<button class="admin-icon-btn" title="Edit" onclick="ChaitraAdmin.editCategory(\'' + cat.id + '\')">Edit</button>' +
          '<button class="admin-icon-btn danger" title="Delete" onclick="ChaitraAdmin.deleteCategory(\'' + cat.id + '\')">Del</button>' +
        '</div></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="3" class="admin-empty-state">No categories yet. Add one to start organizing products.</td></tr>';
  }

  function openCategoryModal(id) {
    editingCategoryId = id || null;
    var modal = document.getElementById('categoryModal');
    var form = document.getElementById('categoryForm');
    form.reset();

    if (id) {
      var cat = _categoriesCache.find(function (x) { return x.id === id; });
      if (cat) {
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('cfName').value = cat.name;
        document.getElementById('cfGroup').value = cat.group;
      }
    } else {
      document.getElementById('categoryModalTitle').textContent = 'Add Category';
    }
    modal.classList.add('active');
  }

  function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    editingCategoryId = null;
  }

  async function saveCategory(e) {
    e.preventDefault();
    var submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    var data = {
      name: document.getElementById('cfName').value.trim(),
      group: document.getElementById('cfGroup').value
    };

    var result;
    if (editingCategoryId) {
      result = await Data.updateCategory(editingCategoryId, data);
    } else {
      result = await Data.addCategory(data);
    }

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Category'; }

    if (!result) {
      showToast('Something went wrong saving this category. Check the browser console.');
      return;
    }

    showToast(editingCategoryId ? 'Category updated' : 'Category added');
    closeCategoryModal();
    await loadCategories();
  }

  function editCategory(id) { openCategoryModal(id); }

  async function deleteCategoryHandler(id) {
    var cat = _categoriesCache.find(function (x) { return x.id === id; });
    var inUseCount = cat ? _productsCache.filter(function (p) { return p.category === cat.name; }).length : 0;
    var warning = inUseCount
      ? 'This category is used by ' + inUseCount + ' product(s). Deleting it will not change those products, but they will no longer match this category in the list. Delete anyway?'
      : 'Delete this category? This cannot be undone.';
    if (!confirm(warning)) return;

    var ok = await Data.deleteCategory(id);
    if (!ok) { showToast('Could not delete this category. Check the browser console.'); return; }
    await loadCategories();
    showToast('Category deleted');
  }

  // ---------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------

  async function loadOrders() {
    _ordersCache = await Data.getOrders();
    renderOrdersTable();
  }

  function renderOrdersTable() {
    var search = (document.getElementById('orderSearch') || {}).value || '';
    var statusFilter = (document.getElementById('orderStatusFilter') || {}).value || '';

    var filtered = _ordersCache.filter(function (o) {
      var matchesSearch = (o.orderNumber + ' ' + o.customer).toLowerCase().indexOf(search.toLowerCase()) !== -1;
      var matchesStatus = !statusFilter || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    var tbody = document.getElementById('ordersBody');
    tbody.innerHTML = filtered.map(function (o) {
      return '<tr>' +
        '<td>' + escapeHtml(o.orderNumber) + '</td>' +
        '<td>' + escapeHtml(o.customer) + '</td>' +
        '<td>' + escapeHtml(o.date) + '</td>' +
        '<td>' + o.items.reduce(function (n, i) { return n + i.qty; }, 0) + ' item(s)</td>' +
        '<td>' + formatRs(o.total) + '</td>' +
        '<td><select class="admin-status-select status-' + o.status + '" onchange="ChaitraAdmin.updateOrderStatus(\'' + o.id + '\', this.value, this)">' +
          ['pending', 'shipped', 'delivered', 'cancelled'].map(function (s) {
            return '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
          }).join('') +
        '</select></td>' +
        '<td><button class="admin-icon-btn" onclick="ChaitraAdmin.viewOrder(\'' + o.id + '\')">View</button></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="7" class="admin-empty-state">No orders match your search.</td></tr>';
  }

  async function updateOrderStatus(id, newStatus, selectEl) {
    if (selectEl) selectEl.disabled = true;
    var ok = await Data.updateOrderStatus(id, newStatus);
    if (selectEl) selectEl.disabled = false;

    if (!ok) { showToast('Could not update this order. Check the browser console.'); return; }

    if (selectEl) selectEl.className = 'admin-status-select status-' + newStatus;
    var cached = _ordersCache.find(function (o) { return o.id === id; });
    if (cached) cached.status = newStatus;
    renderDashboard();
    showToast('Order marked ' + newStatus);
  }

  function viewOrder(id) {
    var o = _ordersCache.find(function (x) { return x.id === id; });
    if (!o) return;
    document.getElementById('orderViewTitle').textContent = 'Order ' + o.orderNumber;
    var list = document.getElementById('orderViewList');
    list.innerHTML = o.items.map(function (i) {
      return '<li><span>' + escapeHtml(i.name) + ' &times; ' + i.qty + '</span><span>' + formatRs(i.price * i.qty) + '</span></li>';
    }).join('') +
      '<li><span><strong>Customer</strong></span><span>' + escapeHtml(o.customer) + '</span></li>' +
      '<li><span><strong>Order date</strong></span><span>' + escapeHtml(o.date) + '</span></li>' +
      '<li><span><strong>Total</strong></span><span>' + formatRs(o.total) + '</span></li>';
    document.getElementById('orderViewModal').classList.add('active');
  }

  function closeOrderViewModal() {
    document.getElementById('orderViewModal').classList.remove('active');
  }

  // ---------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------

  async function loadCustomers() {
    _customersCache = await Data.getCustomers();
    renderCustomersTable();
  }

  function renderCustomersTable() {
    var search = (document.getElementById('customerSearch') || {}).value || '';

    var filtered = _customersCache.filter(function (c) {
      return (c.name + ' ' + c.email).toLowerCase().indexOf(search.toLowerCase()) !== -1;
    });

    var tbody = document.getElementById('customersBody');
    tbody.innerHTML = filtered.map(function (c) {
      var custOrders = _ordersCache.filter(function (o) { return o.customerEmail === c.email; });
      var spent = custOrders.filter(function (o) { return o.status !== 'cancelled'; }).reduce(function (s, o) { return s + o.total; }, 0);
      return '<tr>' +
        '<td>' + escapeHtml(c.name) + '</td>' +
        '<td>' + escapeHtml(c.email) + '</td>' +
        '<td>' + escapeHtml(c.phone) + '</td>' +
        '<td>' + custOrders.length + '</td>' +
        '<td>' + formatRs(spent) + '</td>' +
        '<td>' + escapeHtml(c.joined) + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="6" class="admin-empty-state">No customers match your search.</td></tr>';
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', function () {
    initLogin();
    initNav();

    document.getElementById('addProductBtn').addEventListener('click', function () { openProductModal(null); });
    document.getElementById('productForm').addEventListener('submit', saveProduct);
    document.getElementById('productModalCloseBtn').addEventListener('click', closeProductModal);
    document.getElementById('productModalCancelBtn').addEventListener('click', closeProductModal);
    document.getElementById('orderViewCloseBtn').addEventListener('click', closeOrderViewModal);
    document.getElementById('orderViewCloseBtn2').addEventListener('click', closeOrderViewModal);

    document.getElementById('addCategoryBtn').addEventListener('click', function () { openCategoryModal(null); });
    document.getElementById('categoryForm').addEventListener('submit', saveCategory);
    document.getElementById('categoryModalCloseBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('categoryModalCancelBtn').addEventListener('click', closeCategoryModal);

    var manageCategoriesLink = document.getElementById('pfManageCategoriesLink');
    if (manageCategoriesLink) {
      manageCategoriesLink.addEventListener('click', function (e) {
        e.preventDefault();
        closeProductModal();
        var categoriesNavLink = document.querySelector('.admin-nav a[data-section="categories"]');
        if (categoriesNavLink) categoriesNavLink.click();
      });
    }

    document.getElementById('productSearch').addEventListener('input', renderProductsTable);
    document.getElementById('productCategoryFilter').addEventListener('change', renderProductsTable);
    document.getElementById('orderSearch').addEventListener('input', renderOrdersTable);
    document.getElementById('orderStatusFilter').addEventListener('change', renderOrdersTable);
    document.getElementById('customerSearch').addEventListener('input', renderCustomersTable);

    if (isLoggedIn()) {
      showApp();
    }
  });

  // Expose functions needed by inline onclick handlers
  window.ChaitraAdmin = {
    editProduct: editProduct,
    deleteProduct: deleteProduct,
    updateOrderStatus: updateOrderStatus,
    viewOrder: viewOrder,
    editCategory: editCategory,
    deleteCategory: deleteCategoryHandler
  };

})();
