"use strict";

// Utilities
var DRIVE_COLORS = ['#0078d4', '#0fa36b', '#f44336', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63', '#607d8b'];

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes === 0) return '0 B';
  var k = 1024,
    sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var pad = function pad(n) {
    return String(n).padStart(2, '0');
  };
  return "".concat(pad(d.getDate()), "/").concat(pad(d.getMonth() + 1), "/").concat(d.getFullYear(), " ").concat(pad(d.getHours()), ":").concat(pad(d.getMinutes()));
}
function showToast(msg) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
  var c = document.getElementById('toast-container');
  var t = document.createElement('div');
  t.className = "toast toast-".concat(type);
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function () {
    t.classList.add('toast-exit');
    setTimeout(function () {
      return t.remove();
    }, 300);
  }, 3000);
}
function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Auth Views
function renderSetup() {
  return `<div class="auth-page"><div class="auth-card">
    <div class="logo">
      <svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="3" fill="#3d3d3d"/><rect x="4" y="28" width="40" height="12" rx="2" fill="#4a4a4a"/><circle cx="38" cy="34" r="2" fill="#60cdff"/><rect x="8" y="12" width="32" height="14" rx="1" fill="#60cdff" opacity="0.3"/></svg>
      <h1>EBM SERVER</h1>
      <p>Configuração Inicial — Crie o administrador</p>
    </div>
    <div id="auth-error" class="auth-error"></div>
    <form id="setup-form">
      <div class="form-group">
        <label>Nome de Usuário</label>
        <input class="form-input" id="setup-user" placeholder="Ex: admin" required autocomplete="off">
      </div>
      <div class="form-group">
        <label>Senha</label>
        <input class="form-input" id="setup-pass" type="password" placeholder="••••••••" required>
        <small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block">Mínimo de 4 caracteres</small>
      </div>
      <div class="form-group">
        <label>Confirmar Senha</label>
        <input class="form-input" id="setup-pass2" type="password" placeholder="••••••••" required>
      </div>
      <button type="submit" class="btn btn-primary">Criar Administrador</button>
    </form>
  </div></div>`;
}
function renderLogin() {
  return `<div class="auth-page"><div class="auth-card">
    <div class="logo">
      <svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="3" fill="#3d3d3d"/><rect x="4" y="28" width="40" height="12" rx="2" fill="#4a4a4a"/><circle cx="38" cy="34" r="2" fill="#60cdff"/><rect x="8" y="12" width="32" height="14" rx="1" fill="#60cdff" opacity="0.3"/></svg>
      <h1>EBM SERVER</h1>
      <p>Faça login para acessar seus arquivos</p>
    </div>
    <div id="auth-error" class="auth-error"></div>
    <form id="login-form">
      <div class="form-group"><label>Usuário</label><input class="form-input" id="login-user" placeholder="Seu nome de usuário" required autocomplete="off"></div>
      <div class="form-group"><label>Senha</label><input class="form-input" id="login-pass" type="password" placeholder="••••••••" required></div>
      <button type="submit" class="btn btn-primary">Entrar</button>
    </form>
  </div></div>`;
}
