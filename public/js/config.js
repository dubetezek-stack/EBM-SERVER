// Config Panel Renderer
const DRIVE_COLORS = ['#0078d4','#0fa36b','#f44336','#ff9800','#9c27b0','#00bcd4','#e91e63','#607d8b'];

function renderConfigPanel() {
  return '<div class="config-overlay" id="config-overlay">' +
    '<div class="config-backdrop" id="config-close-backdrop"></div>' +
    '<div class="config-panel">' +
      '<div class="config-header">' +
        '<h2>' + Icons.settings + ' Configurações</h2>' +
        '<button class="btn-icon" id="config-close">' + Icons.close + '</button>' +
      '</div>' +
      '<div class="config-tabs">' +
        '<button class="config-tab active" data-tab="drives">Drives</button>' +
        '<button class="config-tab" data-tab="users">Usuários</button>' +
        '<button class="config-tab" data-tab="sessions">Conectados</button>' +
        '<button class="config-tab" data-tab="server">Servidor</button>' +
        '<button class="config-tab" data-tab="logs">Logs</button>' +
      '</div>' +
      '<div class="config-body" id="config-body">' +
        '<div class="loading"><div class="spinner"></div></div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderDrivesConfig(drives) {
  let html = '';
  for (const d of drives) {
    html += `<div class="config-item" data-drive-id="${d.id}">
      <div class="drive-icon" style="width:32px;height:32px">${Icons.drive(d.color || '#0078d4')}</div>
      <div class="config-item-info">
        <div class="config-item-name">${escapeHtml(d.name)}</div>
        <div class="config-item-detail">${escapeHtml(d.path)}</div>
      </div>
      <div class="config-item-actions">
        <button class="btn-icon cfg-edit-drive" data-id="${d.id}" title="Editar">${Icons.edit}</button>
        <button class="btn-icon cfg-del-drive" data-id="${d.id}" title="Remover">${Icons.trash}</button>
      </div>
    </div>`;
  }

  html += `<div class="config-form" id="drive-form">
    <h3 id="drive-form-title">Adicionar Drive</h3>
    <input type="hidden" id="drive-edit-id">
    <div class="form-group"><label>Nome de Exibição</label><input class="form-input" id="cfg-drive-name" placeholder="Servidor F"></div>
    <div class="form-group"><label>Caminho da Pasta</label><input class="form-input" id="cfg-drive-path" placeholder="X:\\ ou \\\\servidor\\pasta"></div>
    <div class="form-group"><label>Cor</label><div class="color-options" id="cfg-drive-colors">
      ${DRIVE_COLORS.map(function(c,i) { return '<div class="color-option ' + (i===0?'selected':'') + '" data-color="' + c + '" style="background:' + c + '"></div>'; }).join('')}
    </div></div>
    <div class="form-actions">
      <button class="btn btn-secondary btn-sm" id="drive-form-cancel" type="button">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="drive-form-save" type="button">Salvar</button>
    </div>
  </div>`;
  return html;
}

function renderUsersConfig(users) {
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var badgeClass = u.role==='admin' ? 'badge-admin' : u.role==='master' ? 'badge-master' : 'badge-user';
    var badgeLabel = u.role==='admin' ? 'Admin' : u.role==='master' ? 'Master' : 'Usuário';
    html += '<div class="config-item">' +
      '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">' + Icons.user + '</div>' +
      '<div class="config-item-info">' +
        '<div class="config-item-name">' + escapeHtml(u.username) + ' <span class="badge ' + badgeClass + '">' + badgeLabel + '</span></div>' +
        '<div class="config-item-detail">Criado em ' + formatDate(u.createdAt) + '</div>' +
      '</div>' +
      '<div class="config-item-actions">' +
        '<button class="btn-icon cfg-edit-user" data-id="' + u.id + '" data-username="' + escapeHtml(u.username) + '" data-role="' + u.role + '" title="Editar">' + Icons.edit + '</button>' +
        '<button class="btn-icon cfg-del-user" data-id="' + u.id + '" title="Remover">' + Icons.trash + '</button>' +
      '</div>' +
    '</div>';
  }

  html += `<div class="config-form" id="user-form">
    <h3 id="user-form-title">Adicionar Usuário</h3>
    <input type="hidden" id="user-edit-id">
    <div class="form-group"><label>Nome de Usuário</label><input class="form-input" id="cfg-user-name" placeholder="nome"></div>
    <div class="form-group"><label>Senha</label><input class="form-input" id="cfg-user-pass" type="password" placeholder="••••••"></div>
    <div class="form-group"><label>Tipo</label>
      <select class="form-input" id="cfg-user-role">
        <option value="user">Usuário (somente leitura)</option>
        <option value="master">Master (ler + enviar)</option>
        <option value="admin">Administrador (tudo)</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary btn-sm" id="user-form-cancel" type="button">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="user-form-save" type="button">Salvar</button>
    </div>
  </div>`;
  return html;
}

function renderSessionsConfig(sessions) {
  if (!sessions || !sessions.length) {
    return '<div style="text-align:center;padding:40px;color:var(--text-muted)"><p>Nenhuma sessão ativa</p></div>';
  }

  var html = '<div class="sessions-header" style="margin-bottom:16px;color:var(--text-secondary);font-size:13px">' +
    sessions.length + ' sessão(ões) ativa(s)</div>';

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var deviceIcon = s.device === 'iPhone' || s.device === 'Android' ? Icons.phone : Icons.monitor;
    var badgeClass = s.role==='admin' ? 'badge-admin' : s.role==='master' ? 'badge-master' : 'badge-user';
    var badgeLabel = s.role==='admin' ? 'Admin' : s.role==='master' ? 'Master' : 'Usuário';
    var timeDiff = getTimeDiff(s.lastActivity);

    html += '<div class="config-item session-item">' +
      '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--accent)">' + deviceIcon + '</div>' +
      '<div class="config-item-info" style="min-width:0">' +
        '<div class="config-item-name">' + escapeHtml(s.username) + ' <span class="badge ' + badgeClass + '">' + badgeLabel + '</span></div>' +
        '<div class="session-details">' +
          '<span title="Dispositivo">' + escapeHtml(s.device) + '</span>' +
          '<span title="IP"> · ' + escapeHtml(s.ip || 'N/A') + '</span>' +
          '<span title="MAC"> · ' + escapeHtml(s.mac || 'N/A') + '</span>' +
        '</div>' +
        '<div class="config-item-detail">' +
          'Login: ' + formatDate(s.loginTime) + ' · Ativo: ' + timeDiff +
        '</div>' +
      '</div>' +
      '<div class="config-item-actions">' +
        '<button class="btn-icon cfg-kick-session" data-id="' + s.sessionId + '" data-username="' + escapeHtml(s.username) + '" title="Desconectar" style="color:var(--danger)">' + Icons.logout + '</button>' +
      '</div>' +
    '</div>';
  }
  return html;
}

function renderServerConfig(serverConfig) {
  return '<div class="config-form" style="border:none;margin-top:0">' +
    '<h3>Configurações do Servidor</h3>' +
    '<div class="form-group"><label>Nome do Servidor</label>' +
      '<input class="form-input" id="cfg-server-name" value="' + escapeHtml(serverConfig.serverName || '') + '" placeholder="Web File Explorer">' +
    '</div>' +
    '<div class="form-group"><label>Porta</label>' +
      '<input class="form-input" id="cfg-server-port" type="number" value="' + (serverConfig.port || 3000) + '" min="1" max="65535" placeholder="3000">' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">⚠ Alterar a porta requer reiniciar o servidor</div>' +
    '</div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary btn-sm" id="server-config-save" type="button">Salvar</button>' +
    '</div>' +
  '</div>' +
  '<div class="config-form" style="border-color:var(--border);margin-top:16px">' +
    '<h3>Controle do Servidor</h3>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" id="server-restart" type="button" style="background:var(--accent-blue);color:#fff">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>' +
        'Reiniciar' +
      '</button>' +
      '<button class="btn btn-sm" id="server-shutdown" type="button" style="background:var(--danger);color:#fff">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>' +
        'Desligar' +
      '</button>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Reiniciar aplica mudanças de porta. Desligar encerra o servidor completamente.</div>' +
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
