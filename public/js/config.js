"use strict";

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() { }; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

// Config Panel Renderer
var DRIVE_COLORS = ['#0078d4', '#0fa36b', '#f44336', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63', '#607d8b'];

function renderConfigPanel() {
  return '<div class="config-overlay" id="config-overlay">' + '<div class="config-backdrop" id="config-close-backdrop"></div>' + '<div class="config-panel">' + '<div class="config-header">' + '<h2>' + Icons.settings + ' Configurações</h2>' + '<button class="btn-icon" id="config-close">' + Icons.close + '</button>' + '</div>' + '<div class="config-tabs">' + '<button class="config-tab active" data-tab="drives">Drives</button>' + '<button class="config-tab" data-tab="users">Usuários</button>' + '<button class="config-tab" data-tab="sessions">Conectados</button>' + '<button class="config-tab" data-tab="server">Servidor</button>' + '<button class="config-tab" data-tab="apps">Apps Instalados</button>' + '<button class="config-tab" data-tab="cameras">DVR LUXvision</button>' + '<button class="config-tab" data-tab="logs">Logs</button>' + '</div>' + '<div class="config-body" id="config-body">' + '<div class="loading"><div class="spinner"></div></div>' + '</div>' + '</div>' + '</div>';
}

function renderDrivesConfig(drives, users, currentUserIsAdmin) {
  var cols = ['', '', ''];

  drives.forEach(function (d, index) {
    var p = d.permissions || { master: { read: true, upload: true }, user: { read: true } };
    var byUser = p.byUser || {};
    var colIndex = index % 3;

    cols[colIndex] += '<div class="config-card drive-cfg-card" data-drive-id="' + d.id + '">' +
      '<div class="config-card-header">' +
      '<div class="config-card-icon" style="background:rgba(255,255,255,0.03)">' + Icons.folder + '</div>' +
      '<div class="config-card-info">' +
      '<div class="config-card-name">' + escapeHtml(d.name) + '</div>' +
      '<div class="config-card-detail">' + escapeHtml(d.path) + '</div>' +
      '</div>' +
      '<div class="config-card-actions" style="position:absolute; top:20px; right:20px">' +
      '<button class="btn-icon cfg-del-drive" data-id="' + d.id + '" title="Remover" style="color:var(--danger); background:rgba(244,67,54,0.05)">' + Icons.trash + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="config-card-body">' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px">' +
      '<div class="form-group"><label>Nome de Exibição</label><input class="form-input cfg-drive-name" value="' + escapeHtml(d.name) + '"></div>' +
      '<div class="form-group"><label>Cor do Ícone</label><div class="color-options">' +
      DRIVE_COLORS.map(function (c) {
        return '<div class="color-option ' + (c === (d.color || '#0078d4') ? 'selected' : '') + '" data-color="' + c + '" style="background:' + c + '"></div>';
      }).join('') +
      '</div></div>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:24px"><label>Caminho da Pasta</label>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<button class="btn btn-secondary btn-browse-path" style="flex:1;text-align:left;padding-left:16px;height:42px;font-weight:600;background:rgba(255,255,255,0.03);border-color:var(--border)">' + Icons.folder + ' <span style="margin-left:8px">' + escapeHtml(d.path) + '</span></button>' +
      '<input type="hidden" class="cfg-drive-path" value="' + escapeHtml(d.path) + '">' +
      '</div>' +
      '</div>' +

      (currentUserIsAdmin ?
        '<div style="font-size:12px; font-weight:600; margin-bottom:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Permissões de Grupo</div>' +
        '<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:24px">' +
        '<div class="card-perm-row">' +
        '<span style="font-size:13px">Administradores</span><span class="admin-pill">Acesso Total</span>' +
        '</div>' +
        '<div class="card-perm-row">' +
        '<span style="font-size:13px">Usuários Master</span>' +
        '<div style="display:flex;gap:16px">' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;color:var(--accent);font-weight:600"><input type="checkbox" class="p-m-manage" ' + (p.master?.manage ? 'checked' : '') + '> Acesso</label>' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-m-read" ' + (p.master?.read ? 'checked' : '') + '> Leitura</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-m-upload" ' + (p.master?.upload ? 'checked' : '') + '> Escrita</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-m-delete" ' + (p.master?.delete ? 'checked' : '') + '> Apagar</label>' +
        '</div>' +
        '</div>' +
        '<div class="card-perm-row">' +
        '<span style="font-size:13px">Usuários Comuns</span>' +
        '<div style="display:flex;gap:16px">' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-u-read" ' + (p.user?.read ? 'checked' : '') + '> Leitura</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-u-upload" ' + (p.user?.upload ? 'checked' : '') + '> Escrita</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-u-delete" ' + (p.user?.delete ? 'checked' : '') + '> Apagar</label>' +
        '</div>' +
        '</div>' +
        '</div>' : '') +

      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">' +
      '<div style="font-size:12px; font-weight:600; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Acesso Individual</div>' +
      '<div class="search-box-mini" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:4px 10px; display:flex; align-items:center; gap:6px; width:150px">' +
      Icons.search + '<input class="user-search-input" placeholder="Buscar..." style="background:transparent; border:none; color:#fff; font-size:11px; outline:none; width:100%"></div>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:4px; max-height:200px; overflow-y:auto" class="user-list-container">' +
      (users || []).filter(function (u) { return u.role !== 'admin'; }).map(function (u) {
        var up = byUser[u.id] || (u.role === 'master' ? p.master : p.user) || {};
        return '<div class="card-user-row" data-user-id="' + u.id + '">' +
          '<div style="display:flex; flex-direction:column"><span style="font-size:13px; font-weight:500">' + escapeHtml(u.username) + '</span><span style="font-size:11px; color:var(--text-secondary)">' + (u.role === 'master' ? 'Master' : 'Usuário') + '</span></div>' +
          '<div style="display:flex;gap:12px">' +
          (currentUserIsAdmin ? '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;color:var(--accent);font-weight:600"><input type="checkbox" class="p-user-manage" ' + (up.manage ? 'checked' : '') + ' title="Permissão de gerenciamento"> Acesso</label>' : '') +
          '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-user-read" ' + (up.read ? 'checked' : '') + '> Leitura</label>' +
          '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-user-upload" ' + (up.upload ? 'checked' : '') + '> Escrita</label>' +
          '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-user-delete" ' + (up.delete ? 'checked' : '') + '> Apagar</label>' +
          '</div>' +
          '</div>';
      }).join('') +
      '</div>' +
      '<div style="margin-top:24px; border-top:1px solid var(--border); padding-top:20px; display:flex; gap:12px">' +
      '<button class="btn btn-secondary btn-close-card" style="flex:1; height:44px; font-weight:600">Fechar</button>' +
      '<button class="btn btn-primary drive-save-btn" style="flex:2; height:44px; font-weight:700">Salvar Alterações</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  });

  // Add drive card in next col
  var nextCol = drives.length % 3;
  cols[nextCol] += '<div class="config-card add-drive-card" id="btn-add-drive-card" style="border: 2px dashed var(--border); background: transparent; align-items: center; justify-content: center; opacity: 0.6; min-height: 110px">' +
    '<div class="config-card-icon" style="background:transparent; color:var(--text-muted)">' + Icons.add + '</div>' +
    '<div style="font-weight:600; color:var(--text-muted); margin-top:10px">Adicionar Novo Drive</div>' +
    '</div>';

  var html = '<div class="config-columns">' +
    '<div class="config-column">' + cols[0] + '</div>' +
    '<div class="config-column">' + cols[1] + '</div>' +
    '<div class="config-column">' + cols[2] + '</div>' +
    '</div>';

  html += '<div id="new-drive-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; align-items:center; justify-content:center">' +
    '<div class="config-panel" style="width:90%; max-width:500px; max-height:90vh; overflow-y:auto; position:relative; border-radius:24px; background:var(--bg-surface)">' +
    '<div class="config-header" style="border-bottom:1px solid var(--border); padding:20px 24px"><h2>' + Icons.add + ' Novo Drive</h2><button class="btn-icon" id="close-new-drive-modal">' + Icons.close + '</button></div>' +
    '<div style="padding:24px" id="new-drive-form-container"></div>' +
    '</div>' +
    '</div>';

  return html;
}

function renderUsersConfig(users) {
  var cols = ['', '', ''];
  var role = getUserRole();
  var isAdmin = role === 'admin';

  users.forEach(function (u, index) {
    // SECURITY: Master users NEVER see Admins in the list (double-layer protection)
    if (role === 'master' && u.role === 'admin') return;

    var colIndex = index % 3;
    var badgeClass = u.role === 'admin' ? 'badge-admin' : u.role === 'master' ? 'badge-master' : 'badge-user';
    var badgeLabel = u.role === 'admin' ? 'Admin' : u.role === 'master' ? 'Master' : 'Usuário';

    // Master can edit anyone EXCEPT Admins and themselves
    var canEdit = isAdmin || (role === 'master' && u.role !== 'admin' && u.id !== window.app.user.id);

    var cardHtml = '<div class="config-card user-cfg-card" data-user-id="' + u.id + '">' +
      '<div class="config-card-header">' +
      '<div class="config-card-icon" style="background:rgba(255,255,255,0.03); color:var(--accent)">' + Icons.user + '</div>' +
      '<div class="config-card-info">' +
      '<div class="config-card-name">' + escapeHtml(u.username) + ' <span class="badge ' + badgeClass + '">' + badgeLabel + '</span></div>' +
      '<div class="config-card-detail">Criado em ' + formatDate(u.createdAt) + '</div>' +
      '</div>' +
      '<div class="config-card-actions" style="position:absolute; top:20px; right:20px">' +
      (canEdit ? '<button class="btn-icon cfg-del-user" data-id="' + u.id + '" title="Remover" style="color:var(--danger); background:rgba(244,67,54,0.05)">' + Icons.trash + '</button>' : '') +
      '</div>' +
      '</div>' +
      '<div class="config-card-body">' +
      '<div style="font-size:12px; font-weight:600; margin-bottom:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Editar Usuário</div>' +
      '<div class="form-group"><label>Novo Nome (Opcional)</label><input class="form-input cfg-edit-name" value="' + escapeHtml(u.username) + '"></div>' +
      (role === 'master' ? '<div class="form-group"><label>Senha Atual (Obrigatória)</label><input class="form-input cfg-edit-old-pass" type="password" placeholder="Senha atual deste usuário"></div>' : '') +
      '<div class="form-group"><label>Nova Senha</label><input class="form-input cfg-edit-pass" type="password" placeholder="Deixe em branco para manter"></div>' +
      '<div class="form-group"><label>Tipo de Conta</label>' +
      '<select class="form-input cfg-edit-role">' +
      '<option value="user" ' + (u.role === 'user' ? 'selected' : '') + '>Usuário (somente leitura)</option>' +
      '<option value="master" ' + (u.role === 'master' ? 'selected' : '') + '>Master (ler + enviar)</option>' +
      (isAdmin ? '<option value="admin" ' + (u.role === 'admin' ? 'selected' : '') + '>Administrador (tudo)</option>' : '') +
      '</select>' +
      '</div>' +
      '<div style="margin-top:24px; border-top:1px solid var(--border); padding-top:20px; display:flex; gap:12px">' +
      '<button class="btn btn-secondary btn-close-card" style="flex:1; height:44px; font-weight:600">Fechar</button>' +
      '<button class="btn btn-primary user-save-btn" data-id="' + u.id + '" style="flex:2; height:44px; font-weight:700">Salvar Alterações</button>' +
      '</div>' +
      '</div>' +
      '</div>';
    cols[colIndex] += cardHtml;
  });

  // Add User Card
  var nextCol = users.length % 3;
  cols[nextCol] += '<div class="config-card add-user-card" id="btn-add-user-card" style="border: 2px dashed var(--border); background: transparent; align-items: center; justify-content: center; opacity: 0.6; min-height: 110px">' +
    '<div class="config-card-icon" style="background:transparent; color:var(--text-muted)">' + Icons.add + '</div>' +
    '<div style="font-weight:600; color:var(--text-muted); margin-top:10px">Adicionar Novo Usuário</div>' +
    '</div>';

  var html = '<div class="config-columns">' +
    '<div class="config-column">' + cols[0] + '</div>' +
    '<div class="config-column">' + cols[1] + '</div>' +
    '<div class="config-column">' + cols[2] + '</div>' +
    '</div>';

  // Add User Modal
  html += '<div id="new-user-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; align-items:center; justify-content:center">' +
    '<div class="config-panel" style="width:90%; max-width:500px; max-height:90vh; overflow-y:auto; position:relative; border-radius:24px; background:var(--bg-surface)">' +
    '<div class="config-header" style="border-bottom:1px solid var(--border); padding:20px 24px"><h2>' + Icons.add + ' Novo Usuário</h2><button class="btn-icon" id="close-new-user-modal">' + Icons.close + '</button></div>' +
    '<div style="padding:24px">' +
    '<div id="cfg-new-user-error" style="color:var(--danger);font-size:12px;margin-bottom:12px;display:none"></div>' +
    '<div class="form-group"><label>Nome de Usuário</label><input class="form-input" id="new-user-name" placeholder="Ex: joao"></div>' +
    '<div class="form-group"><label>Senha</label><input class="form-input" id="new-user-pass" type="password" placeholder="••••••••"></div>' +
    '<div class="form-group"><label>Tipo</label>' +
    '<select class="form-input" id="new-user-role">' +
    '<option value="user">Usuário (somente leitura)</option>' +
    '<option value="master">Master (ler + enviar)</option>' +
    (isAdmin ? '<option value="admin">Administrador (tudo)</option>' : '') +
    '</select>' +
    '</div>' +
    '<div class="form-actions" style="margin-top:24px">' +
    '<button class="btn btn-primary" id="btn-save-new-user" style="width:100%; height:48px; font-weight:700">Criar Usuário</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

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
    '<input class="form-input" id="cfg-server-name" value="' + escapeHtml(serverConfig.serverName || '') + '" placeholder="EBM SERVER">' +
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
    '<div class="config-form" style="border-color:var(--border);margin-top:16px">' + '<h3>Controle do Servidor</h3>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<div style="display:flex;align-items:center;gap:8px">' +
    '<span>Iniciar com o Windows</span>' +
    '<label class="switch"><input type="checkbox" id="cfg-server-startup"><span class="slider"></span></label>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-muted)">' + (serverConfig.version || '...') + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap">' + 
    '<button class="btn btn-sm" id="server-update" type="button" style="background:var(--accent);color:#fff">' + Icons.refresh + 'Atualizar Sistema' + '</button>' +
    '<button class="btn btn-sm" id="server-restart" type="button" style="background:var(--accent-blue);color:#fff">' + Icons.refresh + 'Reiniciar' + '</button>' + 
    '<button class="btn btn-sm" id="server-shutdown" type="button" style="background:var(--danger);color:#fff">' + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>' + 'Desligar' + '</button>' + 
    '</div>' + '</div>';
}

function renderCamerasConfig(serverConfig) {
  var cam = serverConfig.camera || { ip: '', port: '', user: '', pass: '', rtspPort: 554 };
  return '<div class="config-form" style="background:var(--bg-primary);border-radius:8px;padding:16px;border:1px solid var(--border)">' +
    '<h3 style="margin-top:0">Configuração do DVR LUXvision</h3>' +
    '<div class="form-group"><label>Endereço IP Local</label><input class="form-input" id="cfg-cam-ip" placeholder="192.168.2.40" value="' + (cam.ip || '') + '"></div>' +
    '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="form-group"><label>Porta HTTP</label><input class="form-input" id="cfg-cam-port" placeholder="40001" value="' + (cam.port || '') + '"></div>' +
    '<div class="form-group"><label>Porta RTSP</label><input class="form-input" id="cfg-cam-rtsp" placeholder="554" value="' + (cam.rtspPort || 554) + '"></div>' +
    '</div>' +
    '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="form-group"><label>Usuário</label><input class="form-input" id="cfg-cam-user" value="' + (cam.user || '') + '"></div>' +
    '<div class="form-group"><label>Senha</label><input class="form-input" id="cfg-cam-pass" type="password" value="' + (cam.pass || '') + '"></div>' +
    '</div>' +
    '<div class="form-actions" style="margin-top:16px">' +
    '<button class="btn btn-primary" id="cam-config-save" style="width:100%">Salvar Configurações de Câmeras</button>' +
    '</div>' +
    '</div>';
}

function renderAppsConfig(apps, isAdmin) {
  if (!apps || !apps.length) {
    return '<div style="text-align:center;padding:40px;color:var(--text-muted)"><p>Nenhum app instalado</p></div>';
  }

  var cols = ['', '', ''];

  for (var i = 0; i < apps.length; i++) {
    var app = apps[i];
    var colIndex = i % 3;
    var perms = app.permissions || { byRole: {}, byUser: {} };
    var rolePerms = perms.byRole || {};
    var icon = Icons[app.icon] || Icons[app.id] || Icons.folder;

    var cardHtml = '<div class="config-card app-cfg-card" data-app-id="' + app.id + '">' +
      '<div class="config-card-header">' +
      '<div class="config-card-icon" style="background:rgba(255,255,255,0.03); color:var(--accent-blue)">' + icon + '</div>' +
      '<div class="config-card-info">' +
      '<div class="config-card-name">' + escapeHtml(app.name) + '</div>' +
      '<div class="config-card-detail">' + escapeHtml(app.description) + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="config-card-body">' +
      (isAdmin ?
        '<div style="font-size:12px; font-weight:600; margin-bottom:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Acesso por Grupo</div>' +
        '<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:24px">' +
        '<div class="card-perm-row">' +
        '<span style="font-size:13px">Administradores</span><span class="admin-pill">Acesso Automático</span>' +
        '</div>' +
        '<div class="card-perm-row">' +
        '<span style="font-size:13px">Usuários Master</span>' +
        '<label class="switch" style="transform:scale(0.8)"><input type="checkbox" class="app-role-toggle" data-app-id="' + app.id + '" data-role="master" ' + (rolePerms.master ? 'checked' : '') + '><span class="slider"></span></label>' +
        '</div>' +
        '<div class="card-perm-row">' +
        '<span style="font-size:13px">Usuários Comuns</span>' +
        '<label class="switch" style="transform:scale(0.8)"><input type="checkbox" class="app-role-toggle" data-app-id="' + app.id + '" data-role="user" ' + (rolePerms.user ? 'checked' : '') + '><span class="slider"></span></label>' +
        '</div>' +
        '</div>' : '') +

      (app.users && app.users.length > 0 ?
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">' +
        '<div style="font-size:12px; font-weight:600; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Acesso Individual</div>' +
        '<div class="search-box-mini" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:4px 10px; display:flex; align-items:center; gap:6px; width:150px">' +
        Icons.search + '<input class="user-search-input" placeholder="Buscar..." style="background:transparent; border:none; color:#fff; font-size:11px; outline:none; width:100%"></div>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:4px; max-height:200px; overflow-y:auto" class="user-list-container">' +
        app.users.map(function (user) {
          var isAdmin = user.role === 'admin';
          return '<div class="card-user-row" data-user-id="' + user.id + '">' +
            '<div style="display:flex; flex-direction:column"><span style="font-size:13px; font-weight:500">' + escapeHtml(user.username) + '</span><span style="font-size:11px; color:var(--text-secondary)">' + (user.role === 'master' ? 'Master' : 'Usuário') + '</span></div>' +
            (isAdmin ? '<span style="font-size:11px; color:#0fa36b; font-weight:600">Automático</span>' :
              '<label class="switch" style="transform:scale(0.8)"><input type="checkbox" class="app-user-toggle" data-app-id="' + app.id + '" data-user-id="' + user.id + '" ' + (user.hasAccess ? 'checked' : '') + '><span class="slider"></span></label>'
            ) +
            '</div>';
        }).join('') +
        '</div>' : '') +

      '<div style="margin-top:24px; border-top:1px solid var(--border); padding-top:20px">' +
      '<button class="btn btn-secondary btn-close-card" style="width:100%; height:44px; font-weight:600">Fechar</button>' +
      '</div>' +
      '</div>' +
      '</div>';
    cols[colIndex] += cardHtml;
  }

  return '<div class="config-columns">' +
    '<div class="config-column">' + cols[0] + '</div>' +
    '<div class="config-column">' + cols[1] + '</div>' +
    '<div class="config-column">' + cols[2] + '</div>' +
    '</div>';
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
