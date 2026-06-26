const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
function setAuth(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

function getSavedLocation() { try { return JSON.parse(localStorage.getItem('deliveryLocation')); } catch { return null; } }
function saveLocation(loc) { localStorage.setItem('deliveryLocation', JSON.stringify(loc)); }

function updateNav() {
  const el = document.getElementById('nav-auth');
  const ordersEl = document.getElementById('nav-orders');
  if (!el) return;
  if (isLoggedIn()) {
    const u = getUser();
    const nameLetter = u.name.charAt(0).toUpperCase();
    if (ordersEl) {
      ordersEl.classList.remove('hidden');
      ordersEl.style.display = '';
    }
    if (isAdmin()) {
      el.innerHTML = '<div class="flex items-center gap-2"><span class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">' + nameLetter + '</span><span class="hidden md:inline text-sm font-medium">Dashboard</span></div>';
      el.href = '/admin/index.html';
    } else {
      el.innerHTML = '<div class="flex items-center gap-2"><span class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">' + nameLetter + '</span><span class="hidden md:inline text-sm font-medium">Profile</span></div>';
      el.href = '/pages/profile.html';
    }
  } else {
    if (ordersEl) ordersEl.classList.add('hidden');
    el.innerHTML = 'Login';
    el.href = '/pages/login.html';
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

document.addEventListener('DOMContentLoaded', updateNav);
