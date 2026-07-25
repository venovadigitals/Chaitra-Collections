// Chaitra Collections — Shared data layer (Supabase-backed)
// Single source of truth for product/order/customer data, used by both
// the storefront (home.js) and the admin dashboard (admin.js).
//
// Requires the Supabase JS library to be loaded BEFORE this file:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
//
// Requires three tables to exist in the Supabase project (see the
// supabase-schema.sql file for the exact SQL to run once in the
// Supabase SQL editor): products, customers, orders.
//
// SECURITY NOTE: this uses the public "anon" key directly from the
// browser, with permissive Row Level Security policies (anyone with the
// anon key can read AND write every table). That matches the current
// admin login, which is only a client-side password check, not real
// authentication. Before this goes live for real, replace the admin
// login with Supabase Auth and tighten the RLS policies so writes
// require an authenticated admin — see the note at the bottom of
// supabase-schema.sql.

window.ChaitraData = (function () {

  var SUPABASE_URL = 'https://uvzkvjobihajzwatmaxh.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2emt2am9iaWhhanp3YXRtYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODMyMDQsImV4cCI6MjEwMDU1OTIwNH0.5Qw6IEneXhqThXaCyJWENu41bQTUgoKmY684zHMRZJ4';

  var LS_KEYS = { session: 'chaitra_admin_session' };

  var _client = null;
  function client() {
    if (_client) return _client;
    if (!window.supabase || !window.supabase.createClient) {
      console.error('Chaitra Collections: the Supabase library did not load (check your internet connection and that the <script> tag for supabase-js is present before data.js).');
      return null;
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _client;
  }

  // -----------------------------------------------------------------
  // Seed data — inserted automatically the first time the products /
  // customers / orders tables are empty, so a brand new Supabase
  // project starts with the same demo data the site had before.
  // -----------------------------------------------------------------

  var SEED_PRODUCTS = [
    { name: 'Pure Handloom Ikkat Saree', category: 'Handloom Sarees', price: 6499, sale_price: 8999, stock: 14, image: 'https://res.cloudinary.com/loxmaejx/image/upload/v1784743232/IMG_0918.JPG_1_wudzhz.jpg', status: 'active', featured: true, tag: 'Bestseller' },
    { name: 'Narayanpet Kids Frock Set', category: 'Kids Wear', price: 14999, sale_price: 19999, stock: 6, image: 'https://res.cloudinary.com/loxmaejx/image/upload/v1784743287/WhatsApp_Image_2026-07-16_at_4.27.20_PM_s2uqmx.jpg', status: 'active', featured: true, tag: 'New' },
    { name: 'Haldi Mustard Chikankari Set', category: 'Kurta & Palazzo Set', price: 2799, sale_price: 3599, stock: 22, image: 'REPLACE_WITH_CLOUDINARY_URL_PRODUCT_KURTA_MUSTARD', status: 'active', featured: true, tag: '' },
    { name: 'Neelambari Handloom Saree', category: 'Handloom Cotton Saree', price: 3299, sale_price: 4299, stock: 3, image: 'REPLACE_WITH_CLOUDINARY_URL_PRODUCT_SAREE_HANDLOOM_BLUE', status: 'active', featured: true, tag: 'Bestseller' },
    { name: 'Gulabi Banarasi Zari Saree', category: 'Silk Sarees', price: 7999, sale_price: 10499, stock: 0, image: 'REPLACE_WITH_CLOUDINARY_URL_SHOP_SAREE_3', status: 'active', featured: false, tag: 'New' },
    { name: 'Basanti Floral Georgette Saree', category: 'Designer Sarees', price: 2199, sale_price: 2899, stock: 18, image: 'REPLACE_WITH_CLOUDINARY_URL_SHOP_SAREE_4', status: 'draft', featured: false, tag: '' }
  ];

  var SEED_CUSTOMERS = [
    { name: 'Divya Reddy', email: 'divya.reddy@example.com', phone: '+91 90000 11111', joined_at: '2026-02-14' },
    { name: 'Sowmya Krishnan', email: 'sowmya.k@example.com', phone: '+91 90000 22222', joined_at: '2026-03-02' },
    { name: 'Anitha Rao', email: 'anitha.rao@example.com', phone: '+91 90000 33333', joined_at: '2026-04-18' },
    { name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91 90000 44444', joined_at: '2026-05-27' }
  ];

  var SEED_ORDERS = [
    { order_number: 'ORD-3001', customer_email: 'divya.reddy@example.com', customer_name: 'Divya Reddy', order_date: '2026-07-18', items: [{ name: 'Panna Emerald Zari Lehenga', qty: 1, price: 14999 }], total: 14999, status: 'shipped' },
    { order_number: 'ORD-3002', customer_email: 'sowmya.k@example.com', customer_name: 'Sowmya Krishnan', order_date: '2026-07-19', items: [{ name: 'Neelambari Handloom Saree', qty: 2, price: 3299 }], total: 6598, status: 'delivered' },
    { order_number: 'ORD-3003', customer_email: 'anitha.rao@example.com', customer_name: 'Anitha Rao', order_date: '2026-07-20', items: [{ name: 'Haldi Mustard Chikankari Set', qty: 1, price: 2799 }], total: 2799, status: 'pending' },
    { order_number: 'ORD-3004', customer_email: 'priya.sharma@example.com', customer_name: 'Priya Sharma', order_date: '2026-07-21', items: [{ name: 'Pure Handloom Ikkat Saree', qty: 1, price: 6499 }, { name: 'Haldi Mustard Chikankari Set', qty: 1, price: 2799 }], total: 9298, status: 'pending' },
    { order_number: 'ORD-2999', customer_email: 'divya.reddy@example.com', customer_name: 'Divya Reddy', order_date: '2026-07-10', items: [{ name: 'Gulabi Banarasi Zari Saree', qty: 1, price: 7999 }], total: 7999, status: 'cancelled' }
  ];

  // Categories: "group" ties a category to the storefront's nav-bar
  // filters (sarees / lehengas / kurtas / blouses / other -> New Arrivals /
  // Sarees / Lehengas / Kurtas & Suits / Blouses on the shop page).
  var SEED_CATEGORIES = [
    { name: 'Handloom Sarees', group: 'sarees' },
    { name: 'Silk Sarees', group: 'sarees' },
    { name: 'Designer Sarees', group: 'sarees' },
    { name: 'Handloom Cotton Saree', group: 'sarees' },
    { name: 'Banarasi Sarees', group: 'sarees' },
    { name: 'Kurta & Palazzo Set', group: 'kurtas' },
    { name: 'Kurta Sets', group: 'kurtas' },
    { name: 'Bridal Lehenga Set', group: 'lehengas' },
    { name: 'Party Wear Lehenga', group: 'lehengas' },
    { name: 'Designer Blouse', group: 'blouses' },
    { name: 'Kids Wear', group: 'other' }
  ];

  var _seedPromise = null;

  function ensureSeeded() {
    if (_seedPromise) return _seedPromise;
    var c = client();
    if (!c) return Promise.resolve();

    _seedPromise = (async function () {
      try {
        var prodCount = await c.from('products').select('id', { count: 'exact', head: true });
        if (!prodCount.error && prodCount.count === 0) {
          await c.from('products').insert(SEED_PRODUCTS);
        }
        var custCount = await c.from('customers').select('id', { count: 'exact', head: true });
        if (!custCount.error && custCount.count === 0) {
          await c.from('customers').insert(SEED_CUSTOMERS);
        }
        var orderCount = await c.from('orders').select('id', { count: 'exact', head: true });
        if (!orderCount.error && orderCount.count === 0) {
          await c.from('orders').insert(SEED_ORDERS);
        }
        var catCount = await c.from('categories').select('id', { count: 'exact', head: true });
        if (!catCount.error && catCount.count === 0) {
          await c.from('categories').insert(SEED_CATEGORIES.map(denormalizeCategory));
        }
      } catch (e) {
        console.error('Chaitra Collections: seeding Supabase failed.', e);
      }
    })();

    return _seedPromise;
  }

  // -----------------------------------------------------------------
  // Normalization: DB rows use snake_case columns, the front-end code
  // uses camelCase field names — keep that translation in one place.
  // -----------------------------------------------------------------

  function normalizeProduct(row) {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      price: Number(row.price),
      salePrice: Number(row.sale_price),
      stock: Number(row.stock),
      image: row.image,
      status: row.status,
      featured: !!row.featured,
      tag: row.tag || ''
    };
  }

  function denormalizeProduct(p) {
    return {
      name: p.name,
      category: p.category,
      price: p.price,
      sale_price: p.salePrice,
      stock: p.stock,
      image: p.image,
      status: p.status,
      featured: !!p.featured,
      tag: p.tag || ''
    };
  }

  function normalizeOrder(row) {
    return {
      id: row.id,
      orderNumber: row.order_number || row.id,
      customerEmail: row.customer_email,
      customer: row.customer_name,
      date: row.order_date,
      items: row.items || [],
      total: Number(row.total),
      status: row.status
    };
  }

  function normalizeCustomer(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      joined: row.joined_at
    };
  }

  function normalizeCategory(row) {
    return {
      id: row.id,
      name: row.name,
      group: row.group_key
    };
  }

  function denormalizeCategory(c) {
    return {
      name: c.name,
      group_key: c.group
    };
  }

  // -----------------------------------------------------------------
  // Products
  // -----------------------------------------------------------------

  async function getProducts() {
    var c = client();
    if (!c) return [];
    var res = await c.from('products').select('*').order('created_at', { ascending: false });
    if (res.error) { console.error(res.error); return []; }
    return (res.data || []).map(normalizeProduct);
  }

  async function addProduct(p) {
    var c = client();
    if (!c) return null;
    var res = await c.from('products').insert(denormalizeProduct(p)).select();
    if (res.error) { console.error(res.error); return null; }
    return res.data && res.data[0] ? normalizeProduct(res.data[0]) : null;
  }

  async function updateProduct(id, p) {
    var c = client();
    if (!c) return null;
    var res = await c.from('products').update(denormalizeProduct(p)).eq('id', id).select();
    if (res.error) { console.error(res.error); return null; }
    return res.data && res.data[0] ? normalizeProduct(res.data[0]) : null;
  }

  async function deleteProduct(id) {
    var c = client();
    if (!c) return false;
    var res = await c.from('products').delete().eq('id', id);
    if (res.error) { console.error(res.error); return false; }
    return true;
  }

  // -----------------------------------------------------------------
  // Orders
  // -----------------------------------------------------------------

  async function getOrders() {
    var c = client();
    if (!c) return [];
    var res = await c.from('orders').select('*').order('order_date', { ascending: false });
    if (res.error) { console.error(res.error); return []; }
    return (res.data || []).map(normalizeOrder);
  }

  async function updateOrderStatus(id, status) {
    var c = client();
    if (!c) return false;
    var res = await c.from('orders').update({ status: status }).eq('id', id);
    if (res.error) { console.error(res.error); return false; }
    return true;
  }

  // -----------------------------------------------------------------
  // Customers
  // -----------------------------------------------------------------

  async function getCustomers() {
    var c = client();
    if (!c) return [];
    var res = await c.from('customers').select('*').order('joined_at', { ascending: false });
    if (res.error) { console.error(res.error); return []; }
    return (res.data || []).map(normalizeCustomer);
  }

  // -----------------------------------------------------------------
  // Categories
  // -----------------------------------------------------------------

  async function getCategories() {
    var c = client();
    if (!c) return [];
    var res = await c.from('categories').select('*').order('name', { ascending: true });
    if (res.error) { console.error(res.error); return []; }
    return (res.data || []).map(normalizeCategory);
  }

  async function addCategory(cat) {
    var c = client();
    if (!c) return null;
    var res = await c.from('categories').insert(denormalizeCategory(cat)).select();
    if (res.error) { console.error(res.error); return null; }
    return res.data && res.data[0] ? normalizeCategory(res.data[0]) : null;
  }

  async function updateCategory(id, cat) {
    var c = client();
    if (!c) return null;
    var res = await c.from('categories').update(denormalizeCategory(cat)).eq('id', id).select();
    if (res.error) { console.error(res.error); return null; }
    return res.data && res.data[0] ? normalizeCategory(res.data[0]) : null;
  }

  async function deleteCategory(id) {
    var c = client();
    if (!c) return false;
    var res = await c.from('categories').delete().eq('id', id);
    if (res.error) { console.error(res.error); return false; }
    return true;
  }

  // -----------------------------------------------------------------
  // Admin session (still local — see security note at top of file)
  // -----------------------------------------------------------------

  function isLoggedIn() {
    try { return localStorage.getItem(LS_KEYS.session) === 'true'; } catch (e) { return false; }
  }
  function setLoggedIn(val) {
    try {
      if (val) localStorage.setItem(LS_KEYS.session, 'true');
      else localStorage.removeItem(LS_KEYS.session);
    } catch (e) { /* ignore */ }
  }

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------

  function formatRs(n) {
    return 'Rs. ' + Number(n || 0).toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return {
    ensureSeeded: ensureSeeded,
    getProducts: getProducts,
    addProduct: addProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    getOrders: getOrders,
    updateOrderStatus: updateOrderStatus,
    getCustomers: getCustomers,
    getCategories: getCategories,
    addCategory: addCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    isLoggedIn: isLoggedIn,
    setLoggedIn: setLoggedIn,
    formatRs: formatRs,
    escapeHtml: escapeHtml
  };

})();
