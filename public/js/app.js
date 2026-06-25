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

const SERVICEABLE_AREAS = [
  { pincode: '110001', area: 'Connaught Place', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110002', area: 'Chandni Chowk', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110003', area: 'Karol Bagh', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110005', area: 'Lajpat Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110006', area: 'Kashmiri Gate', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110007', area: 'Shakti Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110008', area: 'Sadar Bazaar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110009', area: 'Model Town', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110015', area: 'Pusa Road', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110016', area: 'Hauz Khas', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110017', area: 'Malviya Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110018', area: 'Janakpuri', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110019', area: 'Green Park', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110020', area: 'Saket', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110022', area: 'RK Puram', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110023', area: 'Jangpura', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110024', area: 'Kalkaji', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110025', area: 'Sarita Vihar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110026', area: 'Munirka', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110027', area: 'Vasant Kunj', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110028', area: 'Dwarka', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110030', area: 'Sangam Vihar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110031', area: 'Greater Kailash', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110032', area: 'Patel Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110033', area: 'Pitampura', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110034', area: 'Rohini', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110035', area: 'Shahdara', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110036', area: 'Uttam Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110037', area: 'Nangloi', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110038', area: 'Najafgarh', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110039', area: 'Kapashera', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110040', area: 'Vasant Vihar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110041', area: 'Mehrauli', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110042', area: 'Tughlakabad', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110043', area: 'Badarpur', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110044', area: 'Jaitpur', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110045', area: 'Molarband', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110046', area: 'Dabri', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110047', area: 'Madanpur Khadar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110048', area: 'Saidulajab', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110049', area: 'Sultanpuri', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110050', area: 'Mangolpuri', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110051', area: 'Kirti Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110052', area: 'New Friends Colony', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110053', area: 'Moti Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110054', area: 'Rajendra Place', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110055', area: 'Savitri Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110056', area: 'Tilak Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110057', area: 'Vishnu Garden', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110058', area: 'Rajouri Garden', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110059', area: 'Tagore Garden', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110060', area: 'Subhash Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110061', area: 'Shanti Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110062', area: 'Hari Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110063', area: 'Ramesh Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110064', area: 'Bhera Enclave', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110065', area: 'Khirki Extension', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110066', area: 'Palam', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110067', area: 'Mahabir Enclave', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110068', area: 'Hastsal', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110070', area: 'Narela', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110071', area: 'Bhalswa', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110072', area: 'Budh Vihar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110073', area: 'Karawal Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110074', area: 'Mukherjee Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110075', area: 'Paschim Vihar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110076', area: 'Hari Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110077', area: 'Jwalaheri', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110078', area: 'Vikaspuri', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110079', area: 'Mahavir Enclave', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110080', area: 'Dwarka Sector 1-29', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110081', area: 'Dwarka Sector 12-22', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110082', area: 'Dwarka Sector 23-29', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110083', area: 'Paprawat', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110084', area: 'Roshanpura', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110085', area: 'Baprola', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110086', area: 'Kanhaiya Nagar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110087', area: 'Shalimar Bagh', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110088', area: 'Punjabi Bagh', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110089', area: 'Ashok Vihar', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110090', area: 'Wazirpur', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110091', area: 'Mayur Vihar Ph 1', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110092', area: 'Mayur Vihar Ph 2', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110093', area: 'Kondli', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110094', area: 'Dallupura', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110095', area: 'Gazipur', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110096', area: 'Gharoli', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110098', area: 'Khajuri Khas', city: 'New Delhi', state: 'Delhi' },
  { pincode: '110099', area: 'Chilla Saroda', city: 'New Delhi', state: 'Delhi' },
  { pincode: '201001', area: 'Indirapuram', city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { pincode: '201002', area: 'Vaishali', city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { pincode: '201003', area: 'Kaushambi', city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { pincode: '201005', area: 'Vasundhara', city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { pincode: '201012', area: 'Crossings Republik', city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { pincode: '201014', area: 'Raj Nagar Extension', city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { pincode: '201301', area: 'Sector 62 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '201303', area: 'Sector 24 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '201304', area: 'Sector 63 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '201305', area: 'Sector 73 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '201306', area: 'Sector 74 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '201307', area: 'Sector 71 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '201308', area: 'Sector 72 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '201310', area: 'Greater Noida West', city: 'Greater Noida', state: 'Uttar Pradesh' },
  { pincode: '201318', area: 'Sector 143 Noida', city: 'Noida', state: 'Uttar Pradesh' },
  { pincode: '121001', area: 'Sector 13 Faridabad', city: 'Faridabad', state: 'Haryana' },
  { pincode: '121002', area: 'Sector 16 Faridabad', city: 'Faridabad', state: 'Haryana' },
  { pincode: '121003', area: 'Sector 17 Faridabad', city: 'Faridabad', state: 'Haryana' },
  { pincode: '121004', area: 'Sector 31 Faridabad', city: 'Faridabad', state: 'Haryana' },
  { pincode: '121005', area: 'Old Faridabad', city: 'Faridabad', state: 'Haryana' },
  { pincode: '121006', area: 'Nehru Ground Faridabad', city: 'Faridabad', state: 'Haryana' },
  { pincode: '122001', area: 'Sector 14 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122002', area: 'Sector 36 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122003', area: 'Sector 38 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122004', area: 'Sector 39 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122005', area: 'Sector 56 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122006', area: 'DLF Ph 2 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122007', area: 'Sushant Lok Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122008', area: 'Sector 14 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122009', area: 'Sector 15 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122010', area: 'Sector 10 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122011', area: 'Sector 12 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122015', area: 'Sector 65 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122016', area: 'Sector 81 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122017', area: 'Sector 85 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122018', area: 'Sector 99 Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122051', area: 'Sohna Road Gurgaon', city: 'Gurgaon', state: 'Haryana' },
  { pincode: '122052', area: 'Badshahpur', city: 'Gurgaon', state: 'Haryana' },
];

function toggleLocation() {
  const dd = document.getElementById('location-dropdown');
  dd.classList.toggle('hidden');
}

function renderPopularAreas() {
  const container = document.getElementById('popular-areas');
  if (!container) return;
  const unique = {};
  const areas = SERVICEABLE_AREAS.filter(a => {
    const key = `${a.city}-${a.area}`;
    if (unique[key]) return false;
    unique[key] = true;
    return true;
  }).slice(0, 40);
  container.innerHTML = areas.map(a =>
    `<button onclick="selectArea('${a.pincode}','${a.area}','${a.city}','${a.state}')" class="text-left px-3 py-1.5 rounded-lg hover:bg-brand-50 text-xs text-slate-600 hover:text-brand-700 transition truncate">${a.area}, ${a.city}</button>`
  ).join('');
}

function selectArea(pincode, area, city, state) {
  const loc = { pincode, area, city, state };
  saveLocation(loc);
  updateLocationDisplay(loc);
  document.getElementById('location-dropdown').classList.add('hidden');
  showToast(`✅ Delivery available to ${area}, ${city}`);
}

function checkPincode() {
  const input = document.getElementById('location-pincode');
  const result = document.getElementById('location-result');
  const pincode = input.value.trim();
  if (pincode.length !== 6) {
    result.className = 'text-xs mb-2 text-red-500 font-medium';
    result.textContent = 'Please enter a 6-digit pincode';
    result.classList.remove('hidden');
    return;
  }
  const match = SERVICEABLE_AREAS.find(a => a.pincode === pincode);
  if (match) {
    result.className = 'text-xs mb-2 text-emerald-600 font-medium';
    result.textContent = `✅ Delivery available to ${match.area}, ${match.city}`;
    result.classList.remove('hidden');
    selectArea(match.pincode, match.area, match.city, match.state);
  } else {
    result.className = 'text-xs mb-2 text-red-500 font-medium';
    result.textContent = '❌ Sorry, delivery not available in this area yet';
    result.classList.remove('hidden');
  }
}

function checkMobilePincode() {
  const input = document.getElementById('mobile-pincode');
  const pincode = input ? input.value.trim() : '';
  if (pincode.length !== 6) { showToast('Please enter a 6-digit pincode', true); return; }
  const match = SERVICEABLE_AREAS.find(a => a.pincode === pincode);
  if (match) {
    selectArea(match.pincode, match.area, match.city, match.state);
    showToast(`✅ Delivery available to ${match.area}, ${match.city}`);
  } else {
    showToast('❌ Delivery not available in this area yet', true);
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
