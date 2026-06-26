const STATUS = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  dispatched: { bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' }
};

function checkAdmin() {
  if (!isLoggedIn() || !isAdmin()) { window.location.href = '/pages/login.html'; return false; }
  const u = getUser();
  const nameEl = document.getElementById('admin-name');
  const avatarEl = document.getElementById('admin-avatar');
  const greetingEl = document.getElementById('admin-greeting');
  if (nameEl) nameEl.textContent = u.name;
  if (avatarEl) avatarEl.textContent = u.name.charAt(0).toUpperCase();
  if (greetingEl) greetingEl.textContent = `Welcome back, ${u.name.split(' ')[0]}!`;
  return true;
}

/* Logout */
document.addEventListener('DOMContentLoaded', () => {
  ['logout-btn', 'logout-btn-mobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { e.preventDefault(); clearAuth(); window.location.href = '/pages/login.html'; });
  });
});

/* ===================== DASHBOARD ===================== */
async function loadDashboard() {
  if (!checkAdmin()) return;
  try {
    const d = await apiCall('/admin/dashboard');
    document.getElementById('stat-products').textContent = d.totalProducts;
    document.getElementById('stat-orders').textContent = d.totalOrders;
    document.getElementById('stat-users').textContent = d.totalUsers;
    document.getElementById('stat-revenue').textContent = `₹${d.totalRevenue.toLocaleString('en-IN')}`;
    document.getElementById('stat-pending').textContent = d.pendingOrders;
    document.getElementById('stat-outofstock').textContent = d.outOfStock;
  } catch (err) { console.error(err); }

  try {
    const r = await apiCall('/admin/orders?limit=5');
    const tbody = document.getElementById('recent-orders-body');
    if (!tbody) return;
    const orders = r.orders || [];
    tbody.innerHTML = orders.length ? orders.map(o => {
      const s = STATUS[o.status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
      const displayTotal = o.total || o.subtotal;
      return `<tr><td class="py-3 pr-4 font-medium">#${o._id.slice(-8).toUpperCase()}</td><td class="py-3 pr-4">${o.user?.name || 'N/A'}</td><td class="py-3 pr-4">${o.items.length}</td><td class="py-3 pr-4 font-medium">₹${displayTotal}</td><td class="py-3 pr-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text} capitalize">${o.status}</span></td><td class="py-3">${new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="py-8 text-center text-slate-400">No orders yet</td></tr>';
  } catch (err) { console.error(err); }
}

/* ===================== PRODUCTS ===================== */
let editId = null;

async function loadProducts() {
  if (!checkAdmin()) return;
  const cat = document.getElementById('filter-category')?.value || '';
  const lowStock = document.getElementById('filter-low-stock')?.checked || false;
  const url = cat ? `/admin/products?category=${encodeURIComponent(cat)}` : '/admin/products';
  try {
    const r = await apiCall(url);
    let prods = r.products || [];
    if (lowStock) prods = prods.filter(p => p.stock <= 10);
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = prods.map(p => {
      const disc = p.discountPercent || Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100);
      const stockClass = p.stock === 0 ? 'text-red-500' : p.stock <= 5 ? 'text-energy-600' : p.stock <= 20 ? 'text-amber-500' : 'text-emerald-600';
      const imgThumb = p.image
        ? `<img src="${p.image}" class="w-8 h-8 rounded-lg object-cover" onerror="this.outerHTML='<div class=\\'w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm\\'>📦</div>'">`
        : `<div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">📦</div>`;
      return `<tr><td class="py-3 pr-4"><div class="flex items-center gap-2">${imgThumb}<div><div class="font-medium text-slate-800">${p.name}</div><div class="text-xs text-slate-400">${p.unit}</div></div></div></td><td class="py-3 pr-4 text-xs text-slate-500">${p.category}</td><td class="py-3 pr-4 text-slate-400">₹${p.mrp}</td><td class="py-3 pr-4 font-medium">₹${p.sellingPrice}</td><td class="py-3 pr-4"><span class="text-xs font-bold px-2 py-0.5 rounded-full ${disc >= 10 ? 'bg-energy-100 text-energy-700' : 'bg-slate-100 text-slate-600'}">${disc}%</span></td><td class="py-3 pr-4"><div class="flex items-center gap-1"><input type="number" id="stock-${p._id}" value="${p.stock}" min="0" class="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:border-brand-500"><button onclick="quickStock('${p._id}')" class="px-2 py-1 text-xs font-bold bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition">✓</button></div></td><td class="py-3"><div class="flex gap-1"><button onclick="editProduct('${p._id}')" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">Edit</button><button onclick="deleteProduct('${p._id}')" class="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">Del</button></div></td></tr>`;
    }).join('');
  } catch (err) { document.getElementById('products-tbody').innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">${err.message}</td></tr>`; }
}

function setImagePreview(url) {
  const preview = document.getElementById('image-preview');
  if (url && url.trim()) {
    preview.innerHTML = `<img src="${url}" class="w-full h-full object-cover" onerror="this.outerHTML='🖼️'">`;
  } else {
    preview.innerHTML = '🖼️';
  }
}

function openModal(product = null) {
  editId = product ? product._id : null;
  document.getElementById('modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('product-id').value = product ? product._id : '';
  document.getElementById('p-name').value = product ? product.name : '';
  document.getElementById('p-category').value = product ? product.category : '';
  document.getElementById('p-unit').value = product ? product.unit : '';
  document.getElementById('p-description').value = product ? product.description : '';
  document.getElementById('p-image').value = product ? (product.image || '') : '';
  setImagePreview(product ? product.image : '');
  document.getElementById('p-mrp').value = product ? product.mrp : '';
  document.getElementById('p-price').value = product ? product.sellingPrice : '';
  document.getElementById('p-stock').value = product ? product.stock : '';
  document.getElementById('p-available').value = product ? (product.isAvailable ? 'true' : 'false') : 'true';
  const alert = document.getElementById('modal-alert');
  alert.className = 'hidden';
  alert.textContent = '';
  document.getElementById('product-modal').classList.add('open');
}

function closeModal() { document.getElementById('product-modal').classList.remove('open'); }

async function editProduct(id) {
  try { const r = await apiCall(`/products/${id}`); openModal(r.product); }
  catch (err) { alert(err.message); }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try { await apiCall(`/admin/products/${id}`, { method: 'DELETE' }); loadProducts(); }
  catch (err) { alert(err.message); }
}

async function quickStock(id) {
  const input = document.getElementById(`stock-${id}`);
  if (!input) return;
  const val = parseInt(input.value);
  if (isNaN(val) || val < 0) return;
  try {
    await apiCall(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify({ stock: val }) });
    input.style.borderColor = '#10b981';
    input.style.borderWidth = '2px';
    setTimeout(() => { input.style.borderColor = ''; input.style.borderWidth = ''; }, 1200);
  } catch (err) { alert(err.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('p-image');
  if (imageInput) {
    imageInput.addEventListener('input', e => setImagePreview(e.target.value));
  }

  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('p-name').value,
        category: document.getElementById('p-category').value,
        unit: document.getElementById('p-unit').value,
        description: document.getElementById('p-description').value,
        image: document.getElementById('p-image').value || '',
        mrp: Number(document.getElementById('p-mrp').value),
        sellingPrice: Number(document.getElementById('p-price').value),
        stock: Number(document.getElementById('p-stock').value),
        isAvailable: document.getElementById('p-available').value === 'true'
      };
      const alert = document.getElementById('modal-alert');
      try {
        if (editId) { await apiCall(`/admin/products/${editId}`, { method: 'PUT', body: JSON.stringify(payload) }); }
        else { await apiCall('/admin/products', { method: 'POST', body: JSON.stringify(payload) }); }
        closeModal();
        loadProducts();
      } catch (err) {
        alert.className = 'block p-3 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-200';
        alert.textContent = err.message;
      }
    });
  }
});

/* ===================== ORDERS ===================== */
async function loadOrders() {
  if (!checkAdmin()) return;
  const status = document.getElementById('filter-status')?.value || '';
  const url = status ? `/admin/orders?status=${status}` : '/admin/orders';
  try {
    const r = await apiCall(url);
    const tbody = document.getElementById('orders-tbody');
    const orders = r.orders || [];
    tbody.innerHTML = orders.map(o => {
      const s = STATUS[o.status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
      const displayTotal = o.total || o.subtotal;
      const paymentBadge = o.paymentMethod === 'razorpay'
        ? `<span class="text-xs font-semibold ${o.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}">${o.paymentStatus === 'paid' ? '💳 Paid' : '💳 Pending'}</span>`
        : '<span class="text-xs text-slate-500">💵 COD</span>';
      return `<tr><td class="py-3 pr-4 font-medium text-xs">#${o._id.slice(-10).toUpperCase()}</td><td class="py-3 pr-4"><div class="font-medium text-sm">${o.user?.name || 'N/A'}</div><div class="text-xs text-slate-400">${o.user?.email || ''}</div></td><td class="py-3 pr-4 text-sm">${o.phone}</td><td class="py-3 pr-4">${o.items.length}</td><td class="py-3 pr-4 font-medium">₹${displayTotal}${o.deliveryCharge > 0 ? `<span class="text-xs text-slate-400 ml-1">+₹${o.deliveryCharge}</span>` : ''}</td><td class="py-3 pr-4">${paymentBadge}</td><td class="py-3 pr-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text} capitalize">${o.status}</span></td><td class="py-3 pr-4 text-xs text-slate-400">${new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td class="py-3"><select onchange="updateStatus('${o._id}', this.value)" class="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-500"><option value="">Update</option><option value="confirmed">Confirmed</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></td></tr>`;
    }).join('');
  } catch (err) { document.getElementById('orders-tbody').innerHTML = `<tr><td colspan="8" class="py-8 text-center text-red-500">${err.message}</td></tr>`; }
}

async function updateStatus(orderId, status) {
  if (!status) return;
  let note = '';
  if (status === 'dispatched') {
    note = prompt('Delivery partner / tracking info:', '');
    if (note === null) return;
  } else if (status === 'cancelled') {
    note = prompt('Cancellation reason:', '');
    if (note === null) return;
  } else if (status === 'delivered') {
    const partner = prompt('Delivery partner name:', '');
    if (partner === null) return;
    note = partner ? `Delivered by ${partner}` : 'Delivered';
  }
  try { await apiCall(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, note }) }); loadOrders(); }
  catch (err) { alert(err.message); }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/admin/index.html') || window.location.pathname === '/admin/') loadDashboard();
  if (window.location.pathname.includes('/admin/products.html')) loadProducts();
  if (window.location.pathname.includes('/admin/orders.html')) loadOrders();
});
