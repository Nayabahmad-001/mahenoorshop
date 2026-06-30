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

function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
  updateDarkModeIcon();
}

function updateDarkModeIcon() {
  const btn = document.getElementById('dark-mode-btn');
  if (!btn) return;
  const isDark = document.documentElement.classList.contains('dark');
  btn.innerHTML = isDark
    ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>'
    : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';
  btn.setAttribute('title', isDark ? 'Light Mode' : 'Dark Mode');
}

function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') {
    document.documentElement.classList.add('dark');
  }
  updateDarkModeIcon();
}

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.hasAttribute('data-animate-stagger')) {
          entry.target.classList.add('visible');
        } else {
          entry.target.classList.add('visible');
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-animate], [data-animate-stagger]').forEach(el => {
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  updateNav();
  initScrollAnimations();

  document.addEventListener('click', (e) => {
    const container = document.getElementById('user-menu-container');
    const menu = document.getElementById('user-menu-dropdown');
    if (container && menu && !container.contains(e.target) && !menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
    }
  });
});
