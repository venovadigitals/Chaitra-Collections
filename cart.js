// Chaitra Collections — Cart
//
// Like the wishlist, there's no login system yet, so the cart lives in this
// browser's localStorage (product id -> quantity) rather than in Supabase.
// It injects a slide-in drawer on every page and wires the "Cart" nav link
// plus any "Add to Cart" button (see product.js) to it.

(function () {
  var LS_KEY = 'chaitra_cart';

  function readCart() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeCart(cart) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ }
  }
  function totalCount(cart) {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id]; }, 0);
  }

  var _drawer, _itemsBox, _subtotalEl, _checkoutBtn, _Data;

  function updateCountBadges() {
    var count = totalCount(readCart());
    document.querySelectorAll('a[aria-label="Cart"]').forEach(function (a) {
      a.textContent = 'Cart (' + count + ')';
    });
  }

  async function getItems() {
    var cart = readCart();
    var ids = Object.keys(cart);
    if (!ids.length || !_Data) return [];
    var all = await _Data.getProducts();
    return ids.map(function (id) {
      var p = all.find(function (x) { return x.id === id; });
      return p ? { product: p, qty: cart[id] } : null;
    }).filter(Boolean);
  }

  async function renderDrawer() {
    if (!_itemsBox || !_Data) return;
    var items = await getItems();

    if (!items.length) {
      _itemsBox.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
      _subtotalEl.textContent = _Data.formatRs(0);
      _checkoutBtn.style.pointerEvents = 'none';
      _checkoutBtn.style.opacity = '0.5';
      return;
    }

    _checkoutBtn.style.pointerEvents = '';
    _checkoutBtn.style.opacity = '';

    var subtotal = 0;
    _itemsBox.innerHTML = items.map(function (it) {
      subtotal += it.product.price * it.qty;
      return (
        '<div class="cart-item" data-id="' + it.product.id + '">' +
          '<img src="' + _Data.escapeHtml(_Data.optimizeImage(it.product.image, 200)) + '" alt="' + _Data.escapeHtml(it.product.name) + '" loading="lazy">' +
          '<div class="cart-item-info">' +
            '<span class="cart-item-name">' + _Data.escapeHtml(it.product.name) + '</span>' +
            '<span class="cart-item-price">' + _Data.formatRs(it.product.price) + '</span>' +
            '<div class="cart-item-qty">' +
              '<button type="button" class="cart-qty-btn" data-action="dec" aria-label="Decrease quantity">&minus;</button>' +
              '<span>' + it.qty + '</span>' +
              '<button type="button" class="cart-qty-btn" data-action="inc" aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="cart-remove-btn" aria-label="Remove item">&times;</button>' +
        '</div>'
      );
    }).join('');
    _subtotalEl.textContent = _Data.formatRs(subtotal);

    _itemsBox.querySelectorAll('.cart-item').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('.cart-remove-btn').addEventListener('click', function () { window.ChaitraCart.remove(id); });
      row.querySelectorAll('.cart-qty-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cart = readCart();
          var qty = (cart[id] || 0) + (btn.getAttribute('data-action') === 'inc' ? 1 : -1);
          window.ChaitraCart.setQty(id, qty);
        });
      });
    });
  }

  function openDrawer() {
    if (!_drawer) return;
    _drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderDrawer();
  }
  function closeDrawer() {
    if (!_drawer) return;
    _drawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.ChaitraCart = {
    add: function (id, qty) {
      qty = qty || 1;
      var cart = readCart();
      cart[id] = (cart[id] || 0) + qty;
      writeCart(cart);
      updateCountBadges();
      renderDrawer();
    },
    remove: function (id) {
      var cart = readCart();
      delete cart[id];
      writeCart(cart);
      updateCountBadges();
      renderDrawer();
    },
    setQty: function (id, qty) {
      var cart = readCart();
      if (qty <= 0) delete cart[id]; else cart[id] = qty;
      writeCart(cart);
      updateCountBadges();
      renderDrawer();
    },
    clear: function () {
      writeCart({});
      updateCountBadges();
      renderDrawer();
    },
    getItems: getItems,
    getCount: function () { return totalCount(readCart()); },
    open: openDrawer,
    close: closeDrawer
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.ChaitraData) return;
    _Data = window.ChaitraData;

    _drawer = document.createElement('div');
    _drawer.id = 'cartDrawer';
    _drawer.className = 'cart-drawer-overlay';
    _drawer.innerHTML =
      '<div class="cart-drawer">' +
        '<div class="cart-drawer-head"><h3>Your Cart</h3><button type="button" id="cartCloseBtn" aria-label="Close cart">&times;</button></div>' +
        '<div id="cartItems" class="cart-drawer-items"></div>' +
        '<div class="cart-drawer-foot">' +
          '<div class="cart-subtotal"><span>Subtotal</span><span id="cartSubtotal">Rs. 0</span></div>' +
          '<a href="checkout.html" class="btn btn-primary" id="cartCheckoutBtn" style="width:100%; text-align:center;">Checkout</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(_drawer);

    _itemsBox = document.getElementById('cartItems');
    _subtotalEl = document.getElementById('cartSubtotal');
    _checkoutBtn = document.getElementById('cartCheckoutBtn');
    var closeBtn = document.getElementById('cartCloseBtn');

    document.querySelectorAll('a[aria-label="Cart"]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); });
    });
    closeBtn.addEventListener('click', closeDrawer);
    _drawer.addEventListener('click', function (e) { if (e.target === _drawer) closeDrawer(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _drawer.classList.contains('active')) closeDrawer();
    });

    updateCountBadges();
  });
})();
