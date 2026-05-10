"use strict";

// Utilities
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
  return "<div class=\"auth-page\"><div class=\"auth-card\">\n    <div class=\"logo\">\n      <svg viewBox=\"0 0 48 48\"><rect x=\"4\" y=\"8\" width=\"40\" height=\"32\" rx=\"3\" fill=\"#3d3d3d\"/><rect x=\"4\" y=\"28\" width=\"40\" height=\"12\" rx=\"2\" fill=\"#4a4a4a\"/><circle cx=\"38\" cy=\"34\" r=\"2\" fill=\"#60cdff\"/><rect x=\"8\" y=\"12\" width=\"32\" height=\"14\" rx=\"1\" fill=\"#60cdff\" opacity=\"0.3\"/></svg>\n      <h1>Web File Explorer</h1>\n      <p>Configura\xE7\xE3o Inicial \u2014 Crie o administrador</p>\n    </div>\n    <div id=\"auth-error\" class=\"auth-error\"></div>\n    <form id=\"setup-form\">\n      <div class=\"form-group\"><label>Nome de Usu\xE1rio</label><input class=\"form-input\" id=\"setup-user\" placeholder=\"admin\" required autocomplete=\"off\"></div>\n      <div class=\"form-group\"><label>Senha</label><input class=\"form-input\" id=\"setup-pass\" type=\"password\" placeholder=\"\u2022\u2022\u2022\u2022\u2022\u2022\" required></div>\n      <div class=\"form-group\"><label>Confirmar Senha</label><input class=\"form-input\" id=\"setup-pass2\" type=\"password\" placeholder=\"\u2022\u2022\u2022\u2022\u2022\u2022\" required></div>\n      <button type=\"submit\" class=\"btn btn-primary\">Criar Administrador</button>\n    </form>\n  </div></div>";
}
function renderLogin() {
  return "<div class=\"auth-page\"><div class=\"auth-card\">\n    <div class=\"logo\">\n      <svg viewBox=\"0 0 48 48\"><rect x=\"4\" y=\"8\" width=\"40\" height=\"32\" rx=\"3\" fill=\"#3d3d3d\"/><rect x=\"4\" y=\"28\" width=\"40\" height=\"12\" rx=\"2\" fill=\"#4a4a4a\"/><circle cx=\"38\" cy=\"34\" r=\"2\" fill=\"#60cdff\"/><rect x=\"8\" y=\"12\" width=\"32\" height=\"14\" rx=\"1\" fill=\"#60cdff\" opacity=\"0.3\"/></svg>\n      <h1>Web File Explorer</h1>\n      <p>Fa\xE7a login para acessar seus arquivos</p>\n    </div>\n    <div id=\"auth-error\" class=\"auth-error\"></div>\n    <form id=\"login-form\">\n      <div class=\"form-group\"><label>Usu\xE1rio</label><input class=\"form-input\" id=\"login-user\" placeholder=\"Seu nome de usu\xE1rio\" required autocomplete=\"off\"></div>\n      <div class=\"form-group\"><label>Senha</label><input class=\"form-input\" id=\"login-pass\" type=\"password\" placeholder=\"\u2022\u2022\u2022\u2022\u2022\u2022\" required></div>\n      <button type=\"submit\" class=\"btn btn-primary\">Entrar</button>\n    </form>\n  </div></div>";
}
