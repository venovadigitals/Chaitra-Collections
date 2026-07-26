// Chaitra Collections — Checkout
//
// Reads the current cart (from cart.js / localStorage), renders an order
// summary, collects shipping details, and on submit writes a real order
// to Supabase via the shared data layer (data.js), upserts the customer,
// then clears the cart and shows a confirmation.

document.addEventListener('DOMContentLoaded', async function () {

  if (!window.ChaitraData || !window.ChaitraCart) return;
  var Data = window.ChaitraData;
  var Cart = window.ChaitraCart;

  var emptyBox = document.getElementById('checkoutEmpty');
  var successBox = document.getElementById('checkoutSuccess');
  var mainBox = document.getElementById('checkoutMain');
  var itemsBox = document.getElementById('checkoutItems');
  var subtotalEl = document.getElementById('checkoutSubtotal');
  var totalEl = document.getElementById('checkoutTotal');
  var form = document.getElementById('checkoutForm');
  var submitBtn = document.getElementById('checkoutSubmitBtn');

  await Data.ensureSeeded();

  var items = await Cart.getItems();

  if (!items.length) {
    mainBox.style.display = 'none';
    emptyBox.style.display = 'block';
    return;
  }

  var subtotal = 0;
  itemsBox.innerHTML = items.map(function (it) {
    subtotal += it.product.price * it.qty;
    return (
      '<div class="checkout-summary-item">' +
        '<img src="' + Data.escapeHtml(it.product.image) + '" alt="' + Data.escapeHtml(it.product.name) + '">' +
        '<div class="checkout-summary-item-info">' +
          '<div class="checkout-summary-item-name">' + Data.escapeHtml(it.product.name) + '</div>' +
          '<div class="checkout-summary-item-meta">Qty ' + it.qty + ' &times; ' + Data.formatRs(it.product.price) + '</div>' +
        '</div>' +
        '<div class="checkout-summary-item-price">' + Data.formatRs(it.product.price * it.qty) + '</div>' +
      '</div>'
    );
  }).join('');

  subtotalEl.textContent = Data.formatRs(subtotal);
  totalEl.textContent = Data.formatRs(subtotal);

  function generateOrderNumber() {
    return 'ORD-' + Date.now().toString().slice(-7);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    var name = document.getElementById('ckName').value.trim();
    var email = document.getElementById('ckEmail').value.trim();
    var phone = document.getElementById('ckPhone').value.trim();
    var address = document.getElementById('ckAddress').value.trim();
    var city = document.getElementById('ckCity').value.trim();
    var pincode = document.getElementById('ckPincode').value.trim();

    if (!name || !email || !phone || !address || !city || !pincode) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing Order\u2026';

    var orderItems = items.map(function (it) {
      return { name: it.product.name, qty: it.qty, price: it.product.price };
    });

    var orderNumber = generateOrderNumber();
    var today = new Date().toISOString().slice(0, 10);

    try {
      await Data.upsertCustomer({ name: name, email: email, phone: phone });
      var savedOrder = await Data.addOrder({
        orderNumber: orderNumber,
        customerEmail: email,
        customerName: name,
        customerPhone: phone,
        shippingAddress: address,
        shippingCity: city,
        shippingPincode: pincode,
        date: today,
        items: orderItems,
        total: subtotal
      });

      if (!savedOrder) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
        alert('Something went wrong placing your order. Please try again.');
        return;
      }

      Cart.clear();

      document.getElementById('checkoutOrderNumber').textContent = savedOrder.orderNumber;
      document.getElementById('checkoutOrderEmail').textContent = email;
      mainBox.style.display = 'none';
      successBox.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
      alert('Something went wrong placing your order. Please try again.');
    }
  });
});
