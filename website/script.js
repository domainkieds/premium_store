// script.js -- persistent cart (localStorage) + checkout submit to backend

const PRODUCTS = [
  { id: 'p1', title: 'Netflix Premium 4k 1 Month Shared/Device', price: 100.00, img: 'assets/premium1.jpg' },
  { id: 'p2', title: 'Netflix Premium 12 Months Shared limited/Device', price: 800.00, img: 'assets/premium1.jpg' },
  { id: 'p3', title: 'HBO Max premium Shared/Device', price: 100.00, img: 'assets/premium2.jpg' }
];

const CART_KEY = 'premium_shop_cart_v1';

function $(id) { return document.getElementById(id); }
function loadCart() { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount() { return loadCart().reduce((s, i) => s + (i.qty || 0), 0); }
function updateBadges() {
  const n = cartCount();
  if ($('cartCount')) $('cartCount').textContent = n;
  if ($('pcartCount')) $('pcartCount').textContent = n;
}
function findProduct(id) { return PRODUCTS.find(p => p.id === id); }

function renderFeatured() {
  const el = $('featuredProducts'); if (!el) return;
  el.innerHTML = '';
  for (const p of PRODUCTS) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-media"><img src="${p.img}" alt="${p.title}"></div>
      <div class="card-body">
        <h3 class="card-title">${p.title}</h3>
        <p class="card-desc">Premium plan — ${p.title}</p>
        <div class="card-foot">
          <div class="price">₱${p.price.toFixed(2)}</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input class="mini-qty" type="number" min="1" value="1" style="width:64px;padding:6px;border-radius:8px;border:1px solid rgba(0,0,0,0.06)">
            <button class="btn btn-primary add-now" data-id="${p.id}">Add to cart</button>
          </div>
        </div>
      </div>`;
    el.appendChild(card);
  }
}

function renderProductGrid() {
  const el = $('productGrid'); if (!el) return;
  el.innerHTML = '';
  for (const p of PRODUCTS) {
    const a = document.createElement('article');
    a.className = 'product-card';
    a.innerHTML = `
      <div class="product-media"><img src="${p.img}" alt="${p.title}"></div>
      <div class="product-info">
        <h3>${p.title}</h3>
        <p class="muted">Premium offering</p>
        <div class="product-controls">
          <div class="price">₱${p.price.toFixed(2)}</div>
          <div class="qty">
            <button class="qty-btn dec">−</button>
            <input class="qty-input" type="number" min="1" value="1">
            <button class="qty-btn inc">+</button>
          </div>
          <button class="btn btn-primary add-to-cart" data-id="${p.id}">Add to cart</button>
        </div>
      </div>`;
    el.appendChild(a);
  }
}

// ✅ Fixed addToCart — unified structure
function addToCart(id, title, price) {
  let cart = loadCart();
  let existing = cart.find(item => item.id === id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, title, price, qty: 1 });
  }

  saveCart(cart);
  alert(`${title} added to cart!`);
  updateBadges();
}

function removeFromCart(id) {
  let cart = loadCart().filter(x => x.id !== id);
  saveCart(cart);
  updateBadges();
}

function setQty(id, qty) {
  const cart = loadCart();
  const it = cart.find(x => x.id === id);
  if (!it) return;
  it.qty = Math.max(1, qty);
  saveCart(cart);
  updateBadges();
}

function renderCartSummary() {
  const el = $('orderSummary');
  if (!el) return;
  const cart = loadCart();
  if (cart.length === 0) {
    el.innerHTML = '<div class="muted">Your cart is empty.</div>';
    updateBadges();
    return;
  }
  let html = ''; let subtotal = 0;
  for (const it of cart) {
    subtotal += it.price * it.qty;
    html += `
      <div class="order-line" data-id="${it.id}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed rgba(0,0,0,0.04)">
        <div style="flex:1">
          <div style="font-weight:600">${it.title}</div>
          <div class="muted" style="font-size:0.95rem">$${it.price.toFixed(2)} each</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn remove-item" data-id="${it.id}" style="background:transparent;border:1px solid rgba(0,0,0,0.06)">Remove</button>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="btn qty-adjust dec" data-id="${it.id}">−</button>
            <input class="qty-input-summary" data-id="${it.id}" type="number" min="1" value="${it.qty}" style="width:64px;padding:6px;border-radius:8px;border:1px solid rgba(0,0,0,0.06)">
            <button class="btn qty-adjust inc" data-id="${it.id}">+</button>
          </div>
          <div style="width:96px;text-align:right;font-weight:700">$${(it.price * it.qty).toFixed(2)}</div>
        </div>
      </div>`;
  }
  html += `<div class="order-total" style="display:flex;justify-content:space-between;padding-top:12px;font-weight:800"><div>Total</div><div>$${subtotal.toFixed(2)}</div></div>`;
  el.innerHTML = html;
  updateBadges();
}

async function submitOrder(e) {
  e.preventDefault();
  const form = $('checkoutForm');
  const name = form.querySelector('input[name="name"]').value.trim();
  const email = form.querySelector('input[name="email"]').value.trim();
  const phone = form.querySelector('input[name="phone"]').value.trim();
  const address = form.querySelector('textarea[name="address"]').value.trim();
  const notes = form.querySelector('textarea[name="notes"]') ? form.querySelector('textarea[name="notes"]').value.trim() : '';
  const cart = loadCart();

  if (!name || !address || cart.length === 0) {
    alert('Please enter name, address and add at least one product to cart.');
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const order = {
    id: 'MO-' + Math.random().toString(36).slice(2, 9).toUpperCase(),
    createdAt: new Date().toISOString(),
    name, email, phone, address, notes, items: cart,
    subtotal: Number(subtotal.toFixed(2))
  };

  try {
    const backendBase = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
    const res = await fetch(backendBase + '/send-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    alert('Order submitted!');
    localStorage.removeItem(CART_KEY);
    updateBadges();
    window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    alert('Failed to submit order: ' + (err.message || err));
  }
}

// events
window.addEventListener('DOMContentLoaded', () => {
  renderFeatured();
  renderProductGrid();
  renderCartSummary();
  updateBadges();

  document.body.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('add-now') || btn.classList.contains('add-to-cart')) {
      const id = btn.dataset.id;
      const p = findProduct(id);
      if (!p) return;
      const card = btn.closest('.card, .product-card');
      const q = card.querySelector('.qty-input, .mini-qty');
      const qty = q ? Math.max(1, Number(q.value)) : 1;
      for (let i = 0; i < qty; i++) addToCart(p.id, p.title, p.price);
      btn.textContent = 'Added ✓';
      setTimeout(() => btn.textContent = 'Add to cart', 700);
      return;
    }

    if (btn.classList.contains('qty-btn')) {
      const inc = btn.classList.contains('inc');
      const input = btn.closest('.product-controls').querySelector('.qty-input');
      input.value = Math.max(1, Number(input.value) + (inc ? 1 : -1));
      return;
    }

    if (btn.classList.contains('remove-item')) {
      removeFromCart(btn.dataset.id);
      renderCartSummary();
      return;
    }

    if (btn.classList.contains('qty-adjust')) {
      const id = btn.dataset.id;
      const inc = btn.classList.contains('inc');
      const cart = loadCart();
      const it = cart.find(x => x.id === id);
      if (!it) return;
      const newQty = Math.max(1, it.qty + (inc ? 1 : -1));
      setQty(id, newQty);
      renderCartSummary();
      return;
    }
  });

  document.body.addEventListener('input', e => {
    if (e.target.classList && e.target.classList.contains('qty-input-summary')) {
      const id = e.target.dataset.id;
      setQty(id, Math.max(1, Number(e.target.value)));
      renderCartSummary();
    }
  });
});
