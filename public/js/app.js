const ICONS = { 'Daily Ration': '🍚', 'Cold Drinks': '🥤' };
const COLORS = { 'Daily Ration': '#d1fae5', 'Cold Drinks': '#ffedd5' };

function qtyBtn(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.product === productId);
  if (!item && delta < 0) return;
  if (!item) {
    cart.push({ product: productId, quantity: 1 });
  } else {
    item.quantity += delta;
    if (item.quantity <= 0) {
      const idx = cart.indexOf(item);
      cart.splice(idx, 1);
    }
  }
  saveCart(cart);
  const el = document.getElementById(`qty-${productId}`);
  if (el) {
    const updated = cart.find(i => i.product === productId);
    el.textContent = updated ? updated.quantity : 0;
  }
  updateCartCount();
  if (delta > 0) showToast('Added to cart!');
}

function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = 'toast';
  if (isError) { t.style.background = '#dc2625'; }
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function getCart() { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; } }

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((s, i) => s + i.quantity, 0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

function openCartDrawer() {
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
  renderCartDrawer();
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-drawer').classList.remove('open');
  document.body.style.overflow = '';
}

async function renderCartDrawer() {
  const container = document.getElementById('cart-drawer-items');
  const footer = document.getElementById('cart-drawer-footer');
  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-slate-400"><div class="text-5xl mb-4">🛒</div><p class="font-medium">Your cart is empty</p><p class="text-sm mt-1">Add items to get started!</p></div>';
    footer.innerHTML = '';
    return;
  }

  try {
    const allIds = cart.map(i => i.product);
    const res = await apiCall(`/products?limit=100` + allIds.map(id => `&id=${id}`).join(''));
    const allProducts = res.products || [];

    let subtotal = 0, totalMrp = 0;

    container.innerHTML = cart.map(item => {
      const p = allProducts.find(x => x._id === item.product);
      if (!p) return '';
      subtotal += p.sellingPrice * item.quantity;
      totalMrp += p.mrp * item.quantity;
      const discount = p.discountPercent || Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100);
      return `
        <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl slide-up">
          <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0" style="background:${COLORS[p.category] || '#f1f5f9'}">${ICONS[p.category] || '📦'}</div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm text-slate-800 truncate">${p.name}</p>
            <p class="text-xs text-slate-400">${p.unit}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="font-bold text-sm text-brand-700">₹${p.sellingPrice}</span>
              <span class="text-xs text-slate-400 line-through">₹${p.mrp}</span>
              <span class="text-xs font-semibold text-energy-600">${discount}% off</span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="updateQty('${item.product}', -1)" class="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition">−</button>
            <span class="w-7 text-center font-bold text-sm">${item.quantity}</span>
            <button onclick="updateQty('${item.product}', 1)" class="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition">+</button>
          </div>
        </div>
      `;
    }).join('');

    const savings = totalMrp - subtotal;
    const deliveryCharge = subtotal <= 500 ? 20 : 0;
    const grandTotal = subtotal + deliveryCharge;
    footer.innerHTML = `
      <div class="space-y-2 mb-4">
        <div class="flex justify-between text-sm"><span class="text-slate-500">Total MRP</span><span class="text-slate-400 line-through">₹${totalMrp}</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">Discount</span><span class="text-energy-600 font-semibold">-₹${savings}</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">Subtotal</span><span class="text-slate-700 font-semibold">₹${subtotal}</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">Delivery</span><span class="${deliveryCharge === 0 ? 'text-emerald-600' : 'text-brand-600'} font-semibold">${deliveryCharge === 0 ? 'FREE' : '₹' + deliveryCharge}</span></div>
        <div class="flex justify-between text-lg font-bold text-slate-800 border-t border-slate-200 pt-2 mt-2"><span>Total</span><span class="text-brand-700">₹${grandTotal}</span></div>
      </div>
      <a href="/pages/checkout.html" class="block w-full text-center bg-energy-500 hover:bg-energy-600 text-white font-bold py-3 rounded-xl transition">Checkout →</a>
      <button onclick="closeCartDrawer()" class="block w-full text-center mt-2 text-sm text-slate-500 hover:text-slate-700 py-2 transition">Continue Shopping</button>
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm">${err.message}</p>`;
  }
}

function addToCart(productId, btn) {
  const cart = getCart();
  const existing = cart.find(i => i.product === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ product: productId, quantity: 1 });
  }
  saveCart(cart);

  if (btn) {
    btn.innerHTML = '✓ Added';
    btn.classList.remove('bg-brand-600', 'hover:bg-brand-700');
    btn.classList.add('bg-emerald-500');
    setTimeout(() => {
      btn.innerHTML = 'Add to Cart';
      btn.classList.remove('bg-emerald-500');
      btn.classList.add('bg-brand-600', 'hover:bg-brand-700');
    }, 1500);
  }
  showToast('Added to cart!');
}

function updateQty(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.product === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    const idx = cart.findIndex(i => i.product === productId);
    cart.splice(idx, 1);
  }
  saveCart(cart);
  renderCartDrawer();
}

function renderProducts(products) {
  const container = document.getElementById('products-container');
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400"><div class="text-5xl mb-3">🔍</div><p class="text-lg font-medium">No products found</p></div>';
    return;
  }

  container.innerHTML = products.map(p => {
    const discount = p.discountPercent || Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100);
    const savings = p.savings || Math.round(p.mrp - p.sellingPrice);
    const inStock = p.stock > 0;
    const icon = ICONS[p.category] || '📦';
    const stockClass = p.stockStatus || (p.stock > 20 ? 'in-stock' : p.stock > 5 ? 'low' : p.stock > 0 ? 'critical' : 'out-of-stock');

    const cart = getCart();
    const inCart = cart.find(i => i.product === p._id);
    const qty = inCart ? inCart.quantity : 0;

    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy"><div class="absolute inset-0 flex items-center justify-center text-5xl md:text-6xl" style="display:none">${icon}</div>`
      : `<div class="flex items-center justify-center text-5xl md:text-6xl">${icon}</div>`;

    return `
      <div class="product-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col slide-up">
        <div class="relative h-40 md:h-48 flex items-center justify-center text-5xl md:text-6xl overflow-hidden" style="background:${COLORS[p.category] || '#f8fafc'}">
          ${imgHtml}
          ${discount >= 5 ? `<div class="absolute top-3 right-3 bg-energy-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">${discount}% OFF</div>` : ''}
          ${savings >= 10 ? `<div class="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-lg">Save ₹${savings}</div>` : ''}
        </div>
        <div class="p-3 md:p-4 flex flex-col flex-1">
          <span class="text-xs font-semibold uppercase tracking-wider text-brand-600">${p.category}</span>
          <h3 class="font-bold text-sm md:text-base text-slate-800 mt-0.5 leading-tight">${p.name}</h3>
          <span class="text-xs text-slate-400 mt-0.5">${p.unit}</span>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-lg md:text-xl font-extrabold text-slate-800">₹${p.sellingPrice}</span>
            <span class="text-sm text-slate-400 line-through">₹${p.mrp}</span>
          </div>
          <div class="mt-1 flex items-center gap-1.5">
            <div class="stock-bar flex-1 max-w-[80px]"><div class="stock-fill ${stockClass}" style="width:${inStock ? Math.min((p.stock / 100) * 100, 100) : 0}%"></div></div>
            <span class="text-xs font-medium ${stockClass === 'out-of-stock' ? 'text-red-500' : stockClass === 'critical' ? 'text-energy-600' : stockClass === 'low' ? 'text-amber-500' : 'text-emerald-600'}">${inStock ? p.stock + ' left' : 'Sold out'}</span>
          </div>
          ${inStock ? `
          <div class="mt-auto mt-3 flex items-center gap-1">
            <button onclick="qtyBtn('${p._id}', -1)" class="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition">−</button>
            <span id="qty-${p._id}" class="flex-1 text-center font-bold text-sm text-slate-800">${qty}</span>
            <button onclick="qtyBtn('${p._id}', 1)" class="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition">+</button>
          </div>
          ` : `
          <button disabled class="mt-auto w-full mt-3 bg-slate-300 cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-xl">Sold Out</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

let currentPage = 1;
let totalPages = 1;

async function loadProducts(category = 'all', search = '', sort = '', page = 1) {
  const container = document.getElementById('products-container');
  const loader = document.getElementById('loader');
  const paginationEl = document.getElementById('pagination');
  if (!container) return;

  container.innerHTML = '';
  if (paginationEl) paginationEl.innerHTML = '';
  loader.classList.remove('hidden');

  try {
    let url = `/products?limit=20&page=${page}`;
    if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (sort) url += `&sort=${sort}`;

    const res = await apiCall(url);
    loader.classList.add('hidden');
    renderProducts(res.products);
    currentPage = res.page || page;
    totalPages = res.pages || 1;
    renderPagination();
  } catch (err) {
    loader.classList.add('hidden');
    container.innerHTML = `<div class="col-span-full text-center py-16 text-red-500"><p>${err.message}</p></div>`;
  }
}

function renderPagination() {
  const el = document.getElementById('pagination');
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }
  el.innerHTML = `<div class="flex items-center justify-center gap-2 mt-8">
    <button onclick="goToPage(${currentPage - 1})" class="px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700 transition ${currentPage <= 1 ? 'opacity-40 pointer-events-none' : ''}">← Prev</button>
    ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p =>
      `<button onclick="goToPage(${p})" class="w-10 h-10 rounded-xl text-sm font-bold transition ${p === currentPage ? 'bg-brand-600 text-white' : 'border-2 border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700'}">${p}</button>`
    ).join('')}
    <button onclick="goToPage(${currentPage + 1})" class="px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700 transition ${currentPage >= totalPages ? 'opacity-40 pointer-events-none' : ''}">Next →</button>
  </div>`;
}

function goToPage(page) {
  if (page < 1 || page > totalPages) return;
  const activeTab = document.querySelector('.category-tab.active');
  const cat = activeTab ? activeTab.dataset.category : 'all';
  const search = document.getElementById('search-input')?.value || '';
  const sort = document.getElementById('sort-select')?.value || '';
  loadProducts(cat, search, sort, page);
  window.scrollTo({ top: document.getElementById('products')?.offsetTop - 80, behavior: 'smooth' });
}

const SERVICEABLE_AREAS = [];

let pincodeLookupCache = {};

async function lookupPincode(pincode) {
  if (pincodeLookupCache[pincode]) return pincodeLookupCache[pincode];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${pincode}&countrycodes=IN&limit=1`);
    const data = await res.json();
    if (data && data[0]) {
      const parts = data[0].displayname.split(', ');
      const state = parts[parts.length - 1] || '';
      const city = parts[parts.length - 3] || parts[parts.length - 2] || '';
      const area = parts[0] || '';
      const result = { pincode, area, city: city.replace(/^District\s/i, ''), state };
      pincodeLookupCache[pincode] = result;
      return result;
    }
  } catch {}
  return null;
}

function toggleLocation() {
  const dd = document.getElementById('location-dropdown');
  dd.classList.toggle('hidden');
}

function renderPopularAreas() {
  const container = document.getElementById('popular-areas');
  if (!container) return;
  container.innerHTML = '<p class="text-xs text-slate-400 col-span-2">Enter your pincode above to check delivery availability</p>';
}

async function selectArea(pincode, area, city, state) {
  const loc = { pincode, area, city, state };
  saveLocation(loc);
  updateLocationDisplay(loc);
  document.getElementById('location-dropdown').classList.add('hidden');
  showToast(`✅ Delivery available to ${area}, ${city}`);
}

async function checkPincode() {
  const input = document.getElementById('location-pincode');
  const result = document.getElementById('location-result');
  const pincode = input.value.trim();
  if (pincode.length !== 6) {
    result.className = 'text-xs mb-2 text-red-500 font-medium';
    result.textContent = 'Please enter a 6-digit pincode';
    result.classList.remove('hidden');
    return;
  }
  result.className = 'text-xs mb-2 text-slate-400 font-medium';
  result.textContent = 'Checking...';
  result.classList.remove('hidden');
  const loc = await lookupPincode(pincode);
  if (loc) {
    result.className = 'text-xs mb-2 text-emerald-600 font-medium';
    result.textContent = `✅ Delivery available to ${loc.area || loc.city}`;
    selectArea(loc.pincode, loc.area || loc.city, loc.city, loc.state);
  } else {
    result.className = 'text-xs mb-2 text-amber-600 font-medium';
    result.textContent = '✅ Pincode accepted! Please fill your address details.';
    selectArea(pincode, '', '', '');
  }
}

async function detectLocationViaIP() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data && data.postal) {
      return { pincode: data.postal, city: data.city || '', region: data.region || '' };
    }
  } catch {}
  try {
    const res = await fetch('https://ip-api.com/json/');
    const data = await res.json();
    if (data && data.zip) {
      return { pincode: data.zip, city: data.city || '', region: data.regionName || '' };
    }
  } catch {}
  return null;
}

function detectLocationPincode() {
  const result = document.getElementById('location-result');
  if (result) { result.className = 'text-xs mb-2 text-slate-400 font-medium'; result.textContent = 'Detecting location...'; result.classList.remove('hidden'); }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`);
          const data = await res.json();
          const addr = data?.address;
          if (addr) {
            const pincode = addr.postcode || '';
            if (pincode && pincode.length === 6) {
              document.getElementById('location-pincode').value = pincode;
              checkPincode();
              return;
            }
          }
        } catch {}
        fallbackIPLocation(result);
      },
      () => fallbackIPLocation(result),
      { enableHighAccuracy: false, timeout: 15000 }
    );
  } else {
    fallbackIPLocation(result);
  }
}

async function fallbackIPLocation(result) {
  if (result) result.textContent = 'Trying IP-based location...';
  const ipLoc = await detectLocationViaIP();
  if (ipLoc && ipLoc.pincode && ipLoc.pincode.length === 6) {
    document.getElementById('location-pincode').value = ipLoc.pincode;
    if (result) { result.className = 'text-xs mb-2 text-emerald-600 font-medium'; result.textContent = `✅ Detected: ${ipLoc.city}, ${ipLoc.region} - ${ipLoc.pincode}`; }
    checkPincode();
  } else {
    if (result) { result.className = 'text-xs mb-2 text-amber-500 font-medium'; result.textContent = 'Could not detect location. Please enter pincode manually.'; }
  }
}

async function checkMobilePincode() {
  const input = document.getElementById('mobile-pincode');
  const pincode = input ? input.value.trim() : '';
  if (pincode.length !== 6) { showToast('Please enter a 6-digit pincode', true); return; }
  const loc = await lookupPincode(pincode);
  if (loc) {
    selectArea(loc.pincode, loc.area || loc.city, loc.city, loc.state);
    showToast(`✅ Delivery available to ${loc.area || loc.city}`);
  } else {
    selectArea(pincode, '', '', '');
    showToast('✅ Pincode accepted!');
  }
}

function updateLocationDisplay(loc) {
  const display = document.getElementById('location-display');
  if (display && loc) {
    display.textContent = `${loc.area ? loc.area + ', ' : ''}${loc.city}`;
    display.className = 'font-medium text-brand-700';
  }
}

function initLocation() {
  renderPopularAreas();
  const saved = getSavedLocation();
  if (saved) updateLocationDisplay(saved);

  document.addEventListener('click', (e) => {
    const dd = document.getElementById('location-dropdown');
    const btn = document.getElementById('location-btn');
    if (dd && btn && !dd.classList.contains('hidden') && !btn.contains(e.target) && !dd.contains(e.target)) {
      dd.classList.add('hidden');
    }
  });

  const pincodeInput = document.getElementById('location-pincode');
  if (pincodeInput) {
    pincodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPincode(); });
  }
  const mobileInput = document.getElementById('mobile-pincode');
  if (mobileInput) {
    mobileInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkMobilePincode(); });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  initLocation();

  const tabs = document.querySelectorAll('.category-tab');
  const sortSelect = document.getElementById('sort-select');
  const searchInput = document.getElementById('search-input');
  const searchMobile = document.getElementById('search-input-mobile');

  let currentCategory = 'all';
  let currentSearch = '';
  let currentSort = '';

  let searchTimeout;

  function filterProducts() {
    currentPage = 1;
    loadProducts(currentCategory, currentSearch, currentSort);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      sortSelect.value = '';
      currentSort = '';
      filterProducts();
    });
  });

  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    filterProducts();
  });

  function handleSearch(val) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = val;
      filterProducts();
    }, 400);
  }

  if (searchInput) searchInput.addEventListener('input', e => handleSearch(e.target.value));
  if (searchMobile) searchMobile.addEventListener('input', e => {
    handleSearch(e.target.value);
    if (searchInput) searchInput.value = e.target.value;
  });

  filterProducts();
});
