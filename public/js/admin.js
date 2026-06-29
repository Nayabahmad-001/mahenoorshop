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
    document.getElementById('stat-today-sales').textContent = `₹${d.todaySales.toLocaleString('en-IN')}`;
    document.getElementById('stat-weekly-sales').textContent = `₹${d.weeklySales.toLocaleString('en-IN')}`;
    document.getElementById('stat-monthly-sales').textContent = `₹${d.monthlySales.toLocaleString('en-IN')}`;
    const topEl = document.getElementById('stat-top-product');
    if (d.topSellingProduct) {
      topEl.textContent = d.topSellingProduct.name.length > 18 ? d.topSellingProduct.name.slice(0, 18) + '…' : d.topSellingProduct.name;
      topEl.title = `${d.topSellingProduct.name} (${d.topSellingProduct.totalQty} sold)`;
    } else {
      topEl.textContent = '—';
    }
  } catch (err) { console.error(err); }

  try {
    const r = await apiCall('/admin/orders?limit=5');
    const tbody = document.getElementById('recent-orders-body');
    if (!tbody) return;
    const orders = r.orders || [];
    tbody.innerHTML = orders.length ? orders.map(o => {
      const s = STATUS[o.status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
      const displayTotal = o.total || o.subtotal;
      const itemsSummary = o.items.map(item => `${item.name} ×${item.quantity}`).join(', ');
      return `<tr><td class="py-3 pr-4 font-medium">#${o._id.slice(-8).toUpperCase()}</td><td class="py-3 pr-4">${o.user?.name || 'N/A'}</td><td class="py-3 pr-4 text-xs text-slate-600 max-w-[200px] truncate" title="${itemsSummary}">${itemsSummary}</td><td class="py-3 pr-4 font-medium">₹${displayTotal}</td><td class="py-3 pr-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text} capitalize">${o.status}</span></td><td class="py-3">${new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="py-8 text-center text-slate-400">No orders yet</td></tr>';
  } catch (err) { console.error(err); }

  try {
    const u = await apiCall('/admin/users/stats');
    const utbody = document.getElementById('user-stats-body');
    if (!utbody) return;
    const users = u.users || [];
    utbody.innerHTML = users.length ? users.map(u => `
      <tr>
        <td class="py-3 pr-4 font-medium text-slate-800">${u.name}</td>
        <td class="py-3 pr-4 text-xs text-slate-500">${u.email}</td>
        <td class="py-3 pr-4 text-sm text-slate-600">${u.phone || '-'}</td>
        <td class="py-3 pr-4"><span class="text-sm font-bold ${u.totalOrders > 0 ? 'text-brand-700' : 'text-slate-400'}">${u.totalOrders}</span></td>
        <td class="py-3 pr-4"><span class="text-sm font-semibold text-slate-700">₹${u.totalSpent.toLocaleString('en-IN')}</span></td>
        <td class="py-3"><button onclick="deleteUser('${u._id}','${u.name.replace(/'/g, "\\'")}')" class="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">Delete</button></td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="py-8 text-center text-slate-400">No customers yet</td></tr>';
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
      return `<tr><td class="py-3 pr-4"><div class="flex items-center gap-2">${imgThumb}<div><div class="font-medium text-slate-800">${p.name}</div><div class="text-xs text-slate-400">${p.unit}</div></div></div></td><td class="py-3 pr-4 text-xs text-slate-500">${p.category}</td><td class="py-3 pr-4 text-slate-400">₹${p.mrp}</td><td class="py-3 pr-4 font-medium">₹${p.sellingPrice}</td><td class="py-3 pr-4"><span class="text-xs font-bold px-2 py-0.5 rounded-full ${disc >= 10 ? 'bg-energy-100 text-energy-700' : 'bg-slate-100 text-slate-600'}">${disc}%</span></td><td class="py-3 pr-4"><div class="flex items-center gap-1"><input type="number" id="stock-${p._id}" value="${p.stock}" min="0" class="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:border-brand-500"><button onclick="quickStock('${p._id}')" class="px-2 py-1 text-xs font-bold bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition">✓</button></div></td><td class="py-3"><div class="flex gap-1"><button onclick="editProduct('${p._id}')" class="px-3 py-2.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">Edit</button><button onclick="deleteProduct('${p._id}')" class="px-3 py-2.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">Del</button></div></td></tr>`;
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

/* ===================== ORDER FILTERS ===================== */
function initOrderFilters() {
  const container = document.getElementById('status-filters');
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('.status-filter');
    if (!btn) return;
    container.querySelectorAll('.status-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadOrders();
  });
}

function updateOrderCounts(counts) {
  if (!counts) return;
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  document.getElementById('count-all').textContent = all > 99 ? '99+' : all;
  document.getElementById('count-pending').textContent = counts.pending || 0;
  document.getElementById('count-confirmed').textContent = counts.confirmed || 0;
  document.getElementById('count-dispatched').textContent = counts.dispatched || 0;
  document.getElementById('count-delivered').textContent = counts.delivered || 0;
  document.getElementById('count-cancelled').textContent = counts.cancelled || 0;
}

/* ===================== ORDERS ===================== */
async function loadOrders() {
  if (!checkAdmin()) return;
  const activeFilter = document.querySelector('.status-filter.active');
  const status = activeFilter ? activeFilter.dataset.status : '';
  try {
    const r = await apiCall(`/admin/orders${status ? `?status=${status}` : ''}`);
    updateOrderCounts(r.counts);
    const tbody = document.getElementById('orders-tbody');
    const orders = r.orders || [];
    tbody.innerHTML = orders.map(o => {
      const s = STATUS[o.status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
      const paymentBadge = o.paymentMethod === 'razorpay'
        ? `<span class="text-xs font-semibold ${o.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}">${o.paymentStatus === 'paid' ? '💳 Paid' : '💳 Pending'}</span>`
        : '<span class="text-xs text-slate-500">💵 COD</span>';
      const itemsList = o.items.map(item => {
        const itemTotal = (item.sellingPrice || 0) * item.quantity;
        return `<div class="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
          ${item.image ? `<img src="${item.image}" class="w-7 h-7 rounded object-cover" onerror="this.outerHTML='<div class=\\'w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-xs\\'>📦</div>'">` : '<div class="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-xs">📦</div>'}
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-slate-700 truncate">${item.name}</div>
            <div class="text-[10px] text-slate-400">₹${item.sellingPrice} × ${item.quantity}</div>
          </div>
          <div class="text-xs font-semibold text-slate-700">₹${itemTotal}</div>
        </div>`;
      }).join('');
      const totalQty = o.items.reduce((sum, item) => sum + item.quantity, 0);
      const deliveryCharge = o.deliveryCharge || 0;
      const subtotal = o.subtotal || o.items.reduce((s, item) => s + (item.sellingPrice || 0) * item.quantity, 0);
      const total = o.total || subtotal + deliveryCharge;
      const totalBlock = `
        <div class="text-xs space-y-0.5">
          <div class="flex justify-between text-slate-500"><span>Subtotal</span><span>₹${subtotal}</span></div>
          ${deliveryCharge > 0 ? `<div class="flex justify-between text-slate-500"><span>Delivery</span><span>₹${deliveryCharge}</span></div>` : ''}
          <div class="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-0.5 mt-0.5"><span>Total</span><span>₹${total}</span></div>
        </div>`;
      const locationHtml = o.deliveryLocation && o.deliveryLocation.lat && o.deliveryLocation.lng
        ? `<a href="https://www.google.com/maps?q=${o.deliveryLocation.lat},${o.deliveryLocation.lng}" target="_blank" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium" title="${o.deliveryLocation.lat}, ${o.deliveryLocation.lng}">📍 Map</a>`
        : `<span class="text-xs text-slate-400">—</span>`;
      const partnerHtml = o.deliveryPartner?.name
        ? `<div class="text-xs"><div class="font-medium text-slate-700">${o.deliveryPartner.name}</div>${o.deliveryPartner.phone ? `<div class="text-slate-400">${o.deliveryPartner.phone}</div>` : ''}${o.deliveryPartner.liveLocationLink ? `<a href="${o.deliveryPartner.liveLocationLink}" target="_blank" class="text-blue-600 hover:underline">📍 Live</a>` : ''}</div>`
        : `<span class="text-xs text-slate-400">—</span>`;
      const addressHtml = o.shippingAddress
        ? `<div class="text-xs text-slate-600 max-w-[160px]" title="${o.shippingAddress?.street || ''}, ${o.shippingAddress?.city || ''}">${o.shippingAddress?.street ? '<span class="font-medium">'+o.shippingAddress.street+'</span><br>' : ''}${o.shippingAddress?.city ? o.shippingAddress.city : ''}${o.shippingAddress?.pincode ? ' - '+o.shippingAddress.pincode : ''}</div>`
        : `<span class="text-xs text-slate-400">—</span>`;
      const isPickup = o.deliveryMethod === 'pickup';
      const methodHtml = isPickup
        ? `<span class="text-xs font-semibold px-2 py-1 rounded-full bg-energy-100 text-energy-700">🏪 Pickup</span>`
        : `<span class="text-xs font-semibold px-2 py-1 rounded-full bg-brand-100 text-brand-700">🚚 Delivery</span>`;
      const trackingLink = o.status === 'dispatched' || o.status === 'delivered'
        ? `<a href="/tracking/${o._id}" target="_blank" class="text-xs text-blue-600 hover:underline font-medium">📍 Track</a>`
        : '';
      const pickupInfo = isPickup && o.pickupStore
        ? `<div class="text-xs"><div class="font-medium text-slate-700">${o.pickupStore.name}</div><div class="text-slate-400">${o.pickupStore.address}</div></div>`
        : '';
      return `<tr><td class="py-3 pr-4 font-medium text-xs">#${o._id.slice(-10).toUpperCase()}</td><td class="py-3 pr-4"><div class="font-medium text-sm">${o.user?.name || 'N/A'}</div><div class="text-xs text-slate-400">${o.user?.email || ''}</div></td><td class="py-3 pr-4">${methodHtml}${trackingLink ? '<br>' + trackingLink : ''}</td><td class="py-3 pr-4 text-xs max-w-[160px]">${isPickup ? pickupInfo : addressHtml}</td><td class="py-3 pr-4 text-sm">${o.phone || '-'}</td><td class="py-3 pr-4 min-w-[200px]">${itemsList}</td><td class="py-3 pr-4 text-sm font-medium text-slate-700">${totalQty}</td><td class="py-3 pr-4">${totalBlock}</td><td class="py-3 pr-4">${paymentBadge}</td><td class="py-3 pr-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text} capitalize">${o.status}</span></td><td class="py-3 pr-4">${isPickup ? '<span class="text-xs text-slate-400">—</span>' : partnerHtml}</td><td class="py-3 pr-4">${isPickup ? '<span class="text-xs text-slate-400">—</span>' : locationHtml}</td><td class="py-3 pr-4 text-xs text-slate-400">${new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td class="py-3"><select onchange="updateStatus('${o._id}', this.value)" class="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-500"><option value="">Update</option><option value="confirmed">Confirmed</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></td></tr>`;
    }).join('');
  } catch (err) { document.getElementById('orders-tbody').innerHTML = `<tr><td colspan="14" class="py-8 text-center text-red-500">${err.message}</td></tr>`; }
}

async function updateStatus(orderId, status) {
  if (!status) return;
  let note = '';
  let otp = '';
  if (status === 'dispatched') {
    const partnerName = prompt('Delivery partner name:', '');
    if (partnerName === null) return;
    const partnerPhone = prompt('Delivery partner phone number:', '');
    if (partnerPhone === null) return;
    const locationLink = prompt('Live location link (Google Maps share link, optional):', '');
    const deliveryPartner = { name: partnerName, phone: partnerPhone, liveLocationLink: locationLink || '' };
    try {
      const res = await apiCall(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, note: '', deliveryPartner }) });
      if (res.deliveryOtp) alert(`OTP generated for this order: ${res.deliveryOtp}\nShare this OTP with the customer.`);
      loadOrders();
    } catch (err) { alert(err.message); }
    return;
  } else if (status === 'cancelled') {
    note = prompt('Cancellation reason:', '');
    if (note === null) return;
  } else if (status === 'delivered') {
    otp = prompt('Enter OTP from customer to confirm delivery:', '');
    if (otp === null) return;
    if (!otp.trim()) { alert('OTP is required to confirm delivery.'); return; }
  }
  try {
    const res = await apiCall(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, note, otp }) });
    if (res.deliveryOtp) alert(`OTP generated for this order: ${res.deliveryOtp}\nShare this OTP with the customer.`);
    loadOrders();
  } catch (err) { alert(err.message); }
}

/* ===================== DELETE USER ===================== */
async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}" and all their orders? This cannot be undone.`)) return;
  try {
    await apiCall(`/admin/users/${id}`, { method: 'DELETE' });
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

/* ===================== NOTIFICATIONS ===================== */
let notifCheckInterval;

async function loadNotifications() {
  try {
    const r = await apiCall('/admin/notifications');
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (r.unreadCount > 0) {
        badge.textContent = r.unreadCount > 9 ? '9+' : r.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
    const list = document.getElementById('notif-list');
    if (!list) return;
    const notifs = r.notifications || [];
    if (notifs.length === 0) {
      list.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">No notifications yet</div>';
      return;
    }
    list.innerHTML = notifs.map(n => `
      <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition cursor-pointer ${n.isRead ? '' : 'bg-brand-50/50 border border-brand-100'}" onclick="markNotifRead('${n._id}')">
        <div class="text-lg shrink-0 mt-0.5">${n.type === 'new_order' ? '🆕' : n.type === 'order_status' ? '📦' : n.type === 'low_stock' ? '⚠️' : '👤'}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-800">${n.title}</div>
          <div class="text-xs text-slate-500 mt-0.5 line-clamp-2">${n.message}</div>
          <div class="text-[10px] text-slate-400 mt-1">${new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        ${n.isRead ? '' : '<div class="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2"></div>'}
      </div>
    `).join('');
  } catch (err) { console.error('Notifications error:', err); }
}

function toggleNotifications() {
  const dd = document.getElementById('notif-dropdown');
  if (dd) {
    dd.classList.toggle('hidden');
    if (!dd.classList.contains('hidden')) loadNotifications();
  }
}

async function markNotifRead(id) {
  try { await apiCall(`/admin/notifications/${id}/read`, { method: 'PUT' }); loadNotifications(); }
  catch (err) { console.error(err); }
}

async function markAllNotifRead() {
  try { await apiCall('/admin/notifications/read-all', { method: 'PUT' }); loadNotifications(); }
  catch (err) { console.error(err); }
}

function startNotifPolling() {
  loadNotifications();
  notifCheckInterval = setInterval(loadNotifications, 15000);
}

/* Close notification dropdown on outside click */
document.addEventListener('click', (e) => {
  const dd = document.getElementById('notif-dropdown');
  const btn = document.getElementById('notif-btn');
  if (dd && btn && !dd.classList.contains('hidden') && !btn.contains(e.target) && !dd.contains(e.target)) {
    dd.classList.add('hidden');
  }
});

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/admin/index.html') || window.location.pathname === '/admin/') {
    loadDashboard();
    startNotifPolling();
  }
  if (window.location.pathname.includes('/admin/products.html')) loadProducts();
  if (window.location.pathname.includes('/admin/orders.html')) { initOrderFilters(); loadOrders(); }
  /* Show notifications bell on all admin pages */
  if (document.getElementById('notif-btn')) startNotifPolling();
});
