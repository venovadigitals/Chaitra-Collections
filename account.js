// Chaitra Collections — Account / order lookup
//
// There's no customer login system yet (only the admin dashboard has
// authentication), so "Account" opens an order-lookup panel instead of a
// dashboard: enter the email an order was placed with, and it lists
// matching orders straight from Supabase. This is genuinely functional
// rather than a dead link, without pretending there's a full account system.

document.addEventListener('DOMContentLoaded', function () {

  var triggers = document.querySelectorAll('a[aria-label="Account"]');
  if (!triggers.length || !window.ChaitraData) return;
  var Data = window.ChaitraData;

  var overlay = document.createElement('div');
  overlay.id = 'accountOverlay';
  overlay.className = 'search-overlay'; // reuse the same overlay chrome as search
  overlay.innerHTML =
    '<div class="search-panel">' +
      '<div class="search-panel-head">' +
        '<span style="font-weight:700; color: var(--maroon-deep);">Track Your Order</span>' +
        '<button type="button" id="accountCloseBtn" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="account-panel-body">' +
        '<p style="color: var(--ink-soft); font-size:0.88rem; margin: 0 0 1rem;">Enter the email address you used when ordering to see its status.</p>' +
        '<div class="account-lookup-row">' +
          '<input type="email" id="accountEmailInput" placeholder="you@example.com">' +
          '<button type="button" class="btn btn-primary" id="accountLookupBtn">Find Orders</button>' +
        '</div>' +
        '<div id="accountResults"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var emailInput = document.getElementById('accountEmailInput');
  var lookupBtn = document.getElementById('accountLookupBtn');
  var resultsBox = document.getElementById('accountResults');
  var closeBtn = document.getElementById('accountCloseBtn');

  function openOverlay() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { emailInput.focus(); }, 50);
  }
  function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function lookup() {
    var email = emailInput.value.trim().toLowerCase();
    if (!email) {
      resultsBox.innerHTML = '<p class="search-hint">Enter an email address to look up your orders.</p>';
      return;
    }
    resultsBox.innerHTML = '<p class="search-hint">Searching&hellip;</p>';
    var allOrders = await Data.getOrders();
    var matches = allOrders.filter(function (o) {
      return (o.customerEmail || '').toLowerCase() === email;
    });

    if (!matches.length) {
      resultsBox.innerHTML = '<p class="search-hint">No orders found for that email.</p>';
      return;
    }

    resultsBox.innerHTML = matches.map(function (o) {
      var itemsText = (o.items || []).map(function (it) { return it.qty + '&times; ' + Data.escapeHtml(it.name); }).join(', ');
      return (
        '<div class="account-order-card">' +
          '<div class="account-order-head"><span>' + Data.escapeHtml(o.orderNumber) + '</span><span>' + Data.escapeHtml(o.status) + '</span></div>' +
          '<div class="account-order-meta">' + Data.escapeHtml(o.date) + ' &middot; ' + Data.formatRs(o.total) + '</div>' +
          '<div class="account-order-items">' + itemsText + '</div>' +
        '</div>'
      );
    }).join('');
  }

  triggers.forEach(function (link) {
    link.addEventListener('click', function (e) { e.preventDefault(); openOverlay(); });
  });

  // The footer's "Track Your Order" link is plain text with href="#" — wire it too.
  document.querySelectorAll('a').forEach(function (a) {
    if (a.textContent.trim() === 'Track Your Order') {
      a.addEventListener('click', function (e) { e.preventDefault(); openOverlay(); });
    }
  });

  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
  });
  lookupBtn.addEventListener('click', lookup);
  emailInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); lookup(); } });
});
