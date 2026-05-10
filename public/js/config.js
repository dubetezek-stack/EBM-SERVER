"use strict";

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

// Config Panel Renderer
var DRIVE_COLORS = ['#0078d4', '#0fa36b', '#f44336', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63', '#607d8b'];

function renderConfigPanel() {
  return '<div class="config-overlay" id="config-overlay">' + '<div class="config-backdrop" id="config-close-backdrop"></div>' + '<div class="config-panel">' + '<div class="config-header">' + '<h2>' + Icons.settings + ' Configurações</h2>' + '<button class="btn-icon" id="config-close">' + Icons.close + '</button>' + '</div>' + '<div class="config-tabs">' + '<button class="config-tab active" data-tab="drives">Drives</button>' + '<button class="config-tab" data-tab="users">Usuários</button>' + '<button class="config-tab" data-tab="sessions">Conectados</button>' + '<button class="config-tab" data-tab="server">Servidor</button>' + '<button class="config-tab" data-tab="logs">Logs</button>' + '</div>' + '<div class="config-body" id="config-body">' + '<div class="loading"><div class="spinner"></div></div>' + '</div>' + '</div>' + '</div>';
}

function renderDrivesConfig(drives) {
  var html = '';
  var _iterator = _createForOfIteratorHelper(drives),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var d = _step.value;
      html += "<div class=\"config-item\" data-drive-id=\"".concat(d.id, "\">\n      <div class=\"drive-icon\" style=\"width:32px;height:32px\">").concat(Icons.drive(d.color || '#0078d4'), "</div>\n      <div class=\"config-item-info\">\n        <div class=\"config-item-name\">").concat(escapeHtml(d.name), "</div>\n        <div class=\"config-item-detail\">").concat(escapeHtml(d.path), "</div>\n      </div>\n      <div class=\"config-item-actions\">\n        <button class=\"btn-icon cfg-edit-drive\" data-id=\"").concat(d.id, "\" title=\"Editar\">").concat(Icons.edit, "</button>\n        <button class=\"btn-icon cfg-del-drive\" data-id=\"").concat(d.id, "\" title=\"Remover\">").concat(Icons.trash, "</button>\n      </div>\n    </div>");
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  html += "<div class=\"config-form\" id=\"drive-form\">\n    <h3 id=\"drive-form-title\">Adicionar Drive</h3>\n    <input type=\"hidden\" id=\"drive-edit-id\">\n    <div class=\"form-group\"><label>Nome de Exibi\xE7\xE3o</label><input class=\"form-input\" id=\"cfg-drive-name\" placeholder=\"Servidor F\"></div>\n    <div class=\"form-group\"><label>Caminho da Pasta</label><input class=\"form-input\" id=\"cfg-drive-path\" placeholder=\"X:\\ ou \\\\servidor\\pasta\"></div>\n    <div class=\"form-group\"><label>Cor</label><div class=\"color-options\" id=\"cfg-drive-colors\">\n      ".concat(DRIVE_COLORS.map(function (c, i) {
    return '<div class="color-option ' + (i === 0 ? 'selected' : '') + '" data-color="' + c + '" style="background:' + c + '"></div>';
  }).join(''), "\n    </div></div>\n    <div class=\"form-actions\">\n      <button class=\"btn btn-secondary btn-sm\" id=\"drive-form-cancel\" type=\"button\">Cancelar</button>\n      <button class=\"btn btn-primary btn-sm\" id=\"drive-form-save\" type=\"button\">Salvar</button>\n    </div>\n  </div>");
  return html;
}

function renderUsersConfig(users) {
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var badgeClass = u.role === 'admin' ? 'badge-admin' : u.role === 'master' ? 'badge-master' : 'badge-user';
    var badgeLabel = u.role === 'admin' ? 'Admin' : u.role === 'master' ? 'Master' : 'Usuário';
    html += '<div class="config-item">' + '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">' + Icons.user + '</div>' + '<div class="config-item-info">' + '<div class="config-item-name">' + escapeHtml(u.username) + ' <span class="badge ' + badgeClass + '">' + badgeLabel + '</span></div>' + '<div class="config-item-detail">Criado em ' + formatDate(u.createdAt) + '</div>' + '</div>' + '<div class="config-item-actions">' + '<button class="btn-icon cfg-edit-user" data-id="' + u.id + '" data-username="' + escapeHtml(u.username) + '" data-role="' + u.role + '" title="Editar">' + Icons.edit + '</button>' + '<button class="btn-icon cfg-del-user" data-id="' + u.id + '" title="Remover">' + Icons.trash + '</button>' + '</div>' + '</div>';
  }
  html += "<div class=\"config-form\" id=\"user-form\">\n    <h3 id=\"user-form-title\">Adicionar Usu\xE1rio</h3>\n    <input type=\"hidden\" id=\"user-edit-id\">\n    <div class=\"form-group\"><label>Nome de Usu\xE1rio</label><input class=\"form-input\" id=\"cfg-user-name\" placeholder=\"nome\"></div>\n    <div class=\"form-group\"><label>Senha</label><input class=\"form-input\" id=\"cfg-user-pass\" type=\"password\" placeholder=\"\u2022\u2022\u2022\u2022\u2022\u2022\"></div>\n    <div class=\"form-group\"><label>Tipo</label>\n      <select class=\"form-input\" id=\"cfg-user-role\">\n        <option value=\"user\">Usu\xE1rio (somente leitura)</option>\n        <option value=\"master\">Master (ler + enviar)</option>\n        <option value=\"admin\">Administrador (tudo)</option>\n      </select>\n    </div>\n    <div class=\"form-actions\">\n      <button class=\"btn btn-secondary btn-sm\" id=\"user-form-cancel\" type=\"button\">Cancelar</button>\n      <button class=\"btn btn-primary btn-sm\" id=\"user-form-save\" type=\"button\">Salvar</button>\n    </div>\n  </div>";
  return html;
}

function renderSessionsConfig(sessions) {
  if (!sessions || !sessions.length) {
    return '<div style="text-align:center;padding:40px;color:var(--text-muted)"><p>Nenhuma sessão ativa</p></div>';
  }
  var html = '<div class="sessions-header" style="margin-bottom:16px;color:var(--text-secondary);font-size:13px">' + sessions.length + ' sessão(ões) ativa(s)</div>';
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var deviceIcon = s.device === 'iPhone' || s.device === 'Android' ? Icons.phone : Icons.monitor;
    var badgeClass = s.role === 'admin' ? 'badge-admin' : s.role === 'master' ? 'badge-master' : 'badge-user';
    var badgeLabel = s.role === 'admin' ? 'Admin' : s.role === 'master' ? 'Master' : 'Usuário';
    var timeDiff = getTimeDiff(s.lastActivity);
    html += '<div class="config-item session-item">' + '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--accent)">' + deviceIcon + '</div>' + '<div class="config-item-info" style="min-width:0">' + '<div class="config-item-name">' + escapeHtml(s.username) + ' <span class="badge ' + badgeClass + '">' + badgeLabel + '</span></div>' + '<div class="session-details">' + '<span title="Dispositivo">' + escapeHtml(s.device) + '</span>' + '<span title="IP"> · ' + escapeHtml(s.ip || 'N/A') + '</span>' + '<span title="MAC"> · ' + escapeHtml(s.mac || 'N/A') + '</span>' + '</div>' + '<div class="config-item-detail">' + 'Login: ' + formatDate(s.loginTime) + ' · Ativo: ' + timeDiff + '</div>' + '</div>' + '<div class="config-item-actions">' + '<button class="btn-icon cfg-kick-session" data-id="' + s.sessionId + '" data-username="' + escapeHtml(s.username) + '" title="Desconectar" style="color:var(--danger)">' + Icons.logout + '</button>' + '</div>' + '</div>';
  }
  return html;
}

function renderServerConfig(serverConfig) {
  var dnsHtml = '';
  var records = serverConfig.dnsRecords || [];
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    var ipMatch = r.lastIp && r.lastDnsIp && r.lastIp === r.lastDnsIp;
    var isOk = r.lastStatus === 'OK';
    
    var statusColor = '#ffb142'; // Pending/Syncing (Orange)
    var statusText = 'Sincronizando...';
    
    if (!r.enabled) {
      statusColor = 'var(--text-muted)';
      statusText = 'Desativado';
    } else if (r.lastStatus === 'KO') {
      statusColor = '#ff5252';
      statusText = 'Erro (KO)';
    } else if (ipMatch && isOk) {
      statusColor = '#0fa36b';
      statusText = 'Online';
    } else if (!ipMatch) {
      statusColor = '#ff5252';
      statusText = 'Offline (IP Divergente)';
    }
    
    dnsHtml += '<div class="config-item" style="padding:10px">' + 
               '<div style="width:24px;display:flex;align-items:center;font-size:18px;color:' + statusColor + '" title="' + statusText + '">●</div>' + 
               '<div class="config-item-info">' + 
                 '<div class="config-item-name">' + escapeHtml(r.domains) + '.duckdns.org ' + 
                   '<span style="font-size:10px;font-weight:bold;color:' + statusColor + ';margin-left:8px;text-transform:uppercase">' + statusText + '</span>' +
                 '</div>' + 
                 '<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--text-muted)">' +
                   '<span>IP Atual: <b style="color:var(--text-secondary)">' + (r.lastIp || '---') + '</b></span>' +
                   '<span>IP Lido (DNS): <b style="color:' + (ipMatch ? 'var(--text-secondary)' : '#ff5252') + '">' + (r.lastDnsIp || '---') + '</b></span>' +
                 '</div>' +
               '</div>' + 
               '<div class="config-item-actions">' + 
                 '<label class="switch" style="transform:scale(0.8);margin-right:8px" title="Ativar/Desativar">' +
                   '<input type="checkbox" class="cfg-toggle-dns" data-index="' + i + '" ' + (r.enabled ? 'checked' : '') + '>' +
                   '<span class="slider"></span>' +
                 '</label>' +
                 '<button class="btn-icon cfg-test-dns" data-index="' + i + '" title="Testar este">' + (Icons.refresh || '↺') + '</button>' + 
                 '<button class="btn-icon cfg-edit-dns" data-index="' + i + '" title="Editar">' + Icons.edit + '</button>' + 
                 '<button class="btn-icon cfg-del-dns" data-index="' + i + '" title="Remover">' + Icons.trash + '</button>' + 
               '</div>' + 
             '</div>';
  }
  if (!records.length) {
    dnsHtml = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Nenhum domínio DuckDNS configurado</div>';
  }

  var autoRefreshChecked = serverConfig.dnsAutoRefresh !== false ? 'checked' : '';

  return '<div class="config-form" style="border:none;margin-top:0">' + 
    '<h3>Configurações do Servidor</h3>' + 
    '<div class="form-row">' + 
      '<div class="form-group" style="flex:2"><label>Nome do Servidor</label>' + 
        '<input class="form-input" id="cfg-server-name" value="' + escapeHtml(serverConfig.serverName || '') + '" placeholder="Web File Explorer">' + 
      '</div>' + 
      '<div class="form-group" style="flex:1"><label>Porta</label>' + 
        '<input class="form-input" id="cfg-server-port" type="number" value="' + (serverConfig.port || 3000) + '" min="1" max="65535" placeholder="3000">' + 
      '</div>' + 
    '</div>' + 
    '<div class="form-actions" style="margin-top:0;margin-bottom:16px"><button class="btn btn-primary btn-sm" id="server-config-save" type="button">Salvar Nome/Porta</button></div>' + 
    
    '<div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<h3>DuckDNS (DNS Dinâmico)</h3>' +
      '<div id="dns-public-ip-container" style="display:flex;align-items:center;gap:8px">' +
        '<div id="dns-public-ip" style="font-size:12px;background:var(--accent-alpha);color:var(--accent);padding:4px 10px;border-radius:20px;font-weight:600">IP Atual: ...</div>' +
        '<button class="btn-icon" id="dns-ip-refresh" title="Atualizar IP Atual" style="padding:4px">' + (Icons.refresh || '↺') + '</button>' +
      '</div>' +
    '</div>' +

    '<div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:16px;border:1px solid var(--border)">' +
      // Update row
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<label class="switch"><input type="checkbox" id="cfg-dns-auto" ' + autoRefreshChecked + '><span class="slider"></span></label>' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:13px;font-weight:500">Atualização Automática (DuckDNS)</span>' +
              '<span id="dns-update-ok" style="display:none;color:#0fa36b;font-size:12px;font-weight:600">✓ Atualizado</span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-muted)">Próximo update em: <span id="dns-update-countdown" style="color:var(--accent);font-weight:600">--:--</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<label style="font-size:12px;color:var(--text-muted)">Update (min)</label>' +
          '<input type="number" id="cfg-dns-interval" class="form-input" style="width:60px;padding:4px 8px;background:var(--bg-primary)" value="' + (serverConfig.dnsInterval || 5) + '" min="1">' +
        '</div>' +
      '</div>' +
      // Check row
      '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:8px;margin-top:4px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:12px;font-weight:500">Verificação de Status (Ping)</span>' +
              '<span id="dns-check-ok" style="display:none;color:#0fa36b;font-size:12px;font-weight:600">✓ Verificado</span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-muted)">Próximo check em: <span id="dns-check-countdown" style="color:var(--accent);font-weight:600">--:--</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<label style="font-size:12px;color:var(--text-muted)">Check (min)</label>' +
          '<input type="number" id="cfg-dns-check-interval" class="form-input" style="width:60px;padding:4px 8px;background:var(--bg-primary)" value="' + (serverConfig.dnsCheckInterval || 1) + '" min="1">' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:8px">' +
        '<button class="btn btn-primary btn-sm" id="dns-auto-save" type="button" style="padding:4px 12px;font-size:11px">Salvar Intervalos</button>' +
      '</div>' +
    '</div>' +

    '<div id="dns-list" style="margin-bottom:16px">' + dnsHtml + '</div>' +
    
    '<div class="config-form" id="dns-form" style="background:var(--bg-primary);border-radius:8px;padding:16px;border:1px solid var(--border)">' +
    '<h4 id="dns-form-title" style="margin-top:0">Configurar Domínio</h4>' +
    '<input type="hidden" id="cfg-dns-index" value="-1">' +
    '<div class="form-group"><label>Token (DuckDNS)</label>' +
    '<input class="form-input" id="cfg-dns-token" type="password" placeholder="Seu Token">' +
    '</div>' +
    '<div class="form-group"><label>Domínio(s)</label>' +
    '<input class="form-input" id="cfg-dns-domains" placeholder="ex: meudominio (sem .duckdns.org)">' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Para múltiplos domínios, use vírgula (ex: dom1,dom2)</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:flex-end;align-items:center;margin-bottom:16px">' +
    '<div style="display:flex;align-items:center;gap:8px">' +
    '<label style="margin:0;font-size:13px">Ativo</label> <label class="switch"><input type="checkbox" id="cfg-dns-enabled" checked><span class="slider"></span></label>' +
    '</div>' +
    '</div>' +
    '<div class="form-actions" style="margin-top:0">' + 
    '<button class="btn btn-secondary btn-sm" id="dns-form-cancel" type="button">Limpar</button>' +
    '<button class="btn btn-primary btn-sm" id="dns-form-save" type="button">Salvar DNS</button>' + 
    '<button class="btn btn-sm" id="server-dns-test" type="button" style="margin-left:8px;background:var(--accent);color:#fff">Forçar Atualização Agora</button>' +
    '</div>' +
    '</div>' +
    '</div>' + 
  '</div>' + 
  
  '<div class="config-form" style="border-color:var(--border);margin-top:16px">' + '<h3>Controle do Servidor</h3>' + '<div style="display:flex;gap:12px;flex-wrap:wrap">' + '<button class="btn btn-sm" id="server-restart" type="button" style="background:var(--accent-blue);color:#fff">' + Icons.refresh + 'Reiniciar' + '</button>' + '<button class="btn btn-sm" id="server-shutdown" type="button" style="background:var(--danger);color:#fff">' + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>' + 'Desligar' + '</button>' + '</div>' + '</div>';
}

function getTimeDiff(dateStr) {
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return mins + ' min atrás';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h atrás';
  var days = Math.floor(hours / 24);
  return days + 'd atrás';
}

function renderSpeedTestConfig() {
  return '<div style="width: 100%; height: 600px; max-height: 80vh; overflow: hidden; border-radius: var(--radius); background: #111;">' +
         '<iframe src="/speedtest/index.html" style="width: 100%; height: 100%; border: none;"></iframe>' +
         '</div>';
}
