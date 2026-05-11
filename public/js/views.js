"use strict";

// Views - Compatible with all browsers (no optional chaining)
function getUserRole() {
  if (window.app && window.app.user) return window.app.user.role;
  return '';
}
function renderExplorer() {
  var role = getUserRole();
  var isAdmin = role === 'admin';
  var isMasterPlus = role === 'master' || role === 'admin';
  
  return '<div class="explorer-layout">' + 
    '<div class="top-bar">' + 
      '<div class="nav-buttons">' + 
        '<button class="btn-icon" id="btn-back" title="Voltar">' + Icons.back + '</button>' + 
        '<button class="btn-icon" id="btn-up" title="Subir">' + Icons.up + '</button>' + 
        '<button class="btn-icon" id="btn-home" title="Início">' + Icons.home + '</button>' + 
      '</div>' + 
      '<div class="breadcrumb" id="breadcrumb"><span class="breadcrumb-item active">Este Computador</span></div>' + 
      '<div class="top-bar-actions">' + 
        '<div class="user-badge">' + 
          '<div class="user-badge-main">' + 
            '<span class="user-badge-name">' + escapeHtml(window.app.user.username) + '</span>' + 
            '<span class="user-badge-role ' + role + '">' + (isAdmin ? 'ADMIN' : (role === 'master' ? 'MASTER' : 'COMUM')) + '</span>' + 
          '</div>' + 
          '<div class="user-badge-details">' + (window.app.user.ip || '---') + ' • ' + (window.app.user.mac || '---') + '</div>' + 
        '</div>' + 
        (isAdmin ? '<button class="btn-icon" id="btn-config" title="Configurações">' + Icons.settings + '</button>' : '') + 
        '<button class="btn-icon" id="btn-logout" title="Sair">' + Icons.logout + '</button>' + 
      '</div>' + 
    '</div>' + 
    '<div class="toolbar">' + 
      '<div class="search-box">' + Icons.search + '<input id="search-input" placeholder="Buscar neste diretório..." autocomplete="off"></div>' + 
      '<button class="toolbar-btn" id="btn-upload" style="display:none">' + Icons.upload + ' <span>Upload</span></button>' + 
      '<button class="toolbar-btn" id="btn-speedtest" style="background:var(--accent-blue);color:#fff;font-weight:600;gap:8px">' + Icons.speed + ' <span>Speed Test</span></button>' + 
      (isMasterPlus ? '<button class="toolbar-btn" id="btn-cameras" style="background:var(--accent-green);color:#fff;font-weight:600;gap:8px">' + Icons.camera + ' <span>Câmeras</span></button>' : '') + 
    '</div>' + 
    '<div class="content-area" id="content-area"><div class="loading"><div class="spinner"></div></div></div>' + 
  '</div>';
}
function renderSpeedTestView() {
  return '<div class="speedtest-view" style="height: 100%; min-height: 500px; border-radius: var(--radius); overflow: hidden; background: #000;">' + '<iframe src="/speedtest/index.html" style="width:100%; height:100%; border:none;"></iframe>' + '</div>';
}
function renderCamerasView() {
  var gridHtml = '';
  for (var i = 1; i <= 16; i++) {
    gridHtml += '<div class="cam-slot" data-cam="' + i + '" style="background:transparent;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:flex-start;justify-content:flex-start;cursor:pointer;aspect-ratio:16/9;position:relative;z-index:2">' +
                '<span style="margin:4px;font-weight:bold;color:#fff;background:rgba(0,0,0,0.4);padding:0 6px;border-radius:2px;z-index:3;font-size:10px">' + i + '</span>' +
                '</div>';
  }

  return '<div class="cameras-view" style="display:flex;flex-direction:column;gap:16px;height:100%">' +
           '<div class="cameras-header" style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius);border:1px solid var(--border);display:flex;flex-direction:column;gap:12px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:0 8px">' +
              '<div style="font-size:14px;font-weight:600">Monitoramento ao Vivo</div>' +
              '<div style="display:flex;gap:8px;align-items:center">' +
               '<button id="btn-toggle-grid" class="toolbar-btn" style="background:var(--bg-secondary);border:1px solid var(--border);padding:4px 12px;font-weight:600">Ver Todas</button>' +
               '<div class="cam-quality-toggle" id="quality-toggle-container" style="display:flex;background:var(--bg-secondary);padding:3px;border-radius:20px;border:1px solid var(--border)">' +
                 '<button class="quality-btn active" data-quality="1" style="border:none;background:var(--accent-blue);color:white;padding:4px 12px;border-radius:15px;font-size:11px;font-weight:600;cursor:pointer">SD</button>' +
                 '<button class="quality-btn" data-quality="0" style="border:none;background:transparent;color:var(--text-secondary);padding:4px 12px;border-radius:15px;font-size:11px;font-weight:600;cursor:pointer">HD</button>' +
               '</div>' +
              '</div>' +
            '</div>' +
           '</div>' +
           
           '<div id="cam-main-player" style="flex:1;background:#000;border-radius:var(--radius);border:1px solid #333;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;min-height:400px">' +
             '<div id="cam-no-signal" style="display:flex;flex-direction:column;align-items:center;gap:12px;color:#555">' + Icons.camera + '<span>Selecione uma câmera</span></div>' +
             '<canvas id="cam-canvas" style="width:100%;height:100%;display:none;object-fit:contain"></canvas>' +
           '</div>' +

           '<div id="cam-grid-container" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:4px;padding:4px;background:#000;border-radius:var(--radius)">' +
             gridHtml +
           '</div>' +
         '</div>';
}
function renderDrives(drives) {
  if (!drives || !drives.length) {
    return '<div class="empty-state">' + Icons.emptyFolder + '<p>Nenhum drive configurado</p></div>';
  }
  var html = '<div class="drives-section"><div class="section-title">Locais de Rede</div><div class="drives-grid">';
  for (var i = 0; i < drives.length; i++) {
    var d = drives[i];
    var usedPct = 0;
    var spaceText = '';
    if (d.disk && d.disk.total) {
      var total = d.disk.total;
      var free = d.disk.free;
      usedPct = Math.round((total - free) / total * 100);
      spaceText = formatSize(free) + ' livre(s) de ' + formatSize(total);
    } else if (!d.accessible) {
      spaceText = 'Indisponível';
    }
    var barColor = usedPct > 90 ? 'var(--danger)' : d.color || 'var(--accent-blue)';
    var offlineClass = !d.accessible ? ' drive-offline' : '';
    var displayPath = d.path || '';
    var driveMatch = displayPath.match(/^([a-zA-Z]):\\?$/);
    if (driveMatch) {
      displayPath = driveMatch[1].toUpperCase() + ':';
    }
    html += '<div class="drive-card' + offlineClass + '" data-drive-id="' + d.id + '" title="' + escapeHtml(d.path) + '">' + 
            '<div class="drive-icon">' + Icons.drive(d.color || '#0078d4') + '</div>' + 
            '<div class="drive-info">' + 
              '<div class="drive-name" style="margin-bottom:2px">' + escapeHtml(d.name) + '</div>' + 
              '<div class="drive-path-info" style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">(' + escapeHtml(displayPath) + ')</div>' + 
              '<div class="drive-bar"><div class="drive-bar-fill" style="width:' + usedPct + '%;background:' + barColor + '"></div></div>' + 
              '<div class="drive-space" style="font-size:12px;color:var(--text-secondary);margin-top:2px">' + spaceText + '</div>' + 
            '</div>' + 
          '</div>';
  }
  html += '</div></div>';
  return html;
}
function renderFileList(files, driveId, subpath, drivePermissions) {
  if (!files || !files.length) {
    return '<div class="empty-state">' + Icons.emptyFolder + '<p>Esta pasta está vazia</p></div>';
  }
  var role = getUserRole();
  var isAdmin = role === 'admin';
  
  // Resolve granular permission for current user
  var canDelete = isAdmin;
  if (!isAdmin && drivePermissions) {
    var p = drivePermissions;
    if (role === 'master') canDelete = !!(p.master && p.master.delete);
    else if (role === 'user') canDelete = !!(p.user && p.user.delete);
  } else if (!isAdmin && !drivePermissions) {
    // Default fallback if no permissions object (older config)
    canDelete = role === 'master';
  }

  var html = '<div class="file-table-wrapper"><table class="file-table"><thead><tr>' + '<th data-sort="name">Nome <span class="sort-icon">▲</span></th>' + '<th data-sort="date">Data de modificação <span class="sort-icon">▲</span></th>' + '<th data-sort="type">Tipo <span class="sort-icon">▲</span></th>' + '<th data-sort="size">Tamanho <span class="sort-icon">▲</span></th>' + (canDelete ? '<th style="width:40px"></th>' : '') + '</tr></thead><tbody>';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var filePath = subpath ? subpath + '/' + f.name : f.name;
    html += '<tr class="file-row" data-name="' + escapeHtml(f.name) + '" data-drive-id="' + driveId + '" data-subpath="' + escapeHtml(filePath) + '" data-is-dir="' + (f.isDirectory ? 'true' : 'false') + '">' + '<td><div class="file-name-cell"><div class="file-icon">' + getFileIcon(f) + '</div><span class="file-name">' + escapeHtml(f.name) + '</span></div></td>' + '<td class="file-date">' + formatDate(f.modified) + '</td>' + '<td class="file-type">' + escapeHtml(f.isDirectory ? 'Pasta' : (f.extension || '').toUpperCase().replace('.', '') || 'Arquivo') + '</td>' + '<td class="file-size">' + (f.isDirectory ? '' : formatSize(f.size)) + '</td>' + (canDelete ? '<td><button class="btn-icon btn-delete-file" data-name="' + escapeHtml(f.name) + '" data-drive-id="' + driveId + '" data-subpath="' + escapeHtml(filePath) + '" data-is-dir="' + (f.isDirectory ? 'true' : 'false') + '" title="Apagar">' + Icons.trash + '</button></td>' : '') + '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function renderUploadZone() {
  return '<div class="upload-zone" id="upload-zone">' + Icons.upload + '<p>Arraste arquivos aqui ou clique para fazer upload</p>' + '<input type="file" id="upload-input" multiple style="display:none">' + '</div>';
}
