const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
function setAuth(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

function getSavedLocation() { try { return JSON.parse(localStorage.getItem('deliveryLocation')); } catch { return null; } }
function saveLocation(loc) { localStorage.setItem('deliveryLocation', JSON.stringify(loc)); }

function logoutUser(e) {
  if (e) e.preventDefault();
  clearAuth();
  localStorage.removeItem('cart');
  window.location.href = '/';
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu-dropdown');
  if (menu) menu.classList.toggle('hidden');
}

function closeUserMenu() {
  const menu = document.getElementById('user-menu-dropdown');
  if (menu) menu.classList.add('hidden');
}

function updateNav() {
  const menuOrders = document.getElementById('menu-orders');
  const menuDashboard = document.getElementById('menu-dashboard');
  const menuProfile = document.getElementById('menu-profile');
  const menuLogin = document.getElementById('menu-login');
  const menuLogout = document.getElementById('menu-logout');
  const menuUserHeader = document.getElementById('menu-user-header');
  const menuUserName = document.getElementById('menu-user-name');
  const menuUserRole = document.getElementById('menu-user-role');
  const menuAvatar = document.getElementById('menu-avatar');

  if (isLoggedIn()) {
    const u = getUser();
    const isAdminUser = u && u.role === 'admin';

    if (menuOrders) { menuOrders.classList.remove('hidden'); menuOrders.classList.add('flex'); }
    if (menuLogout) { menuLogout.classList.remove('hidden'); menuLogout.classList.add('flex'); }
    if (menuLogin) menuLogin.classList.add('hidden');
    if (menuUserHeader) menuUserHeader.classList.remove('hidden');
    if (menuUserName) menuUserName.textContent = u.name;
    if (menuAvatar) menuAvatar.textContent = u.name.charAt(0).toUpperCase();
    if (menuUserRole) menuUserRole.textContent = isAdminUser ? 'Admin' : 'Customer';

    if (isAdminUser) {
      if (menuDashboard) { menuDashboard.classList.remove('hidden'); menuDashboard.classList.add('flex'); }
      if (menuProfile) menuProfile.classList.add('hidden');
    } else {
      if (menuDashboard) menuDashboard.classList.add('hidden');
      if (menuProfile) { menuProfile.classList.remove('hidden'); menuProfile.classList.add('flex'); }
    }
  } else {
    if (menuOrders) menuOrders.classList.add('hidden');
    if (menuDashboard) menuDashboard.classList.add('hidden');
    if (menuProfile) menuProfile.classList.add('hidden');
    if (menuLogout) menuLogout.classList.add('hidden');
    if (menuLogin) menuLogin.classList.remove('hidden');
    if (menuUserHeader) menuUserHeader.classList.add('hidden');
  }
}

async function apiCall(url, opts = {}) {
  const headers = { ...opts.headers };
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${url}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  updateNav();

  document.addEventListener('click', (e) => {
    const container = document.getElementById('user-menu-container');
    const menu = document.getElementById('user-menu-dropdown');
    if (container && menu && !container.contains(e.target) && !menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
    }
  });
});
