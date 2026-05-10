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
  return '<div class="explorer-layout">' + '<div class="top-bar">' + '<div class="nav-buttons">' + '<button class="btn-icon" id="btn-back" title="Voltar">' + Icons.back + '</button>' + '<button class="btn-icon" id="btn-up" title="Subir">' + Icons.up + '</button>' + '<button class="btn-icon" id="btn-home" title="Início">' + Icons.home + '</button>' + '</div>' + '<div class="breadcrumb" id="breadcrumb"><span class="breadcrumb-item active">Este Computador</span></div>' + '<div class="top-bar-actions">' + (isAdmin ? '<button class="btn-icon" id="btn-config" title="Configurações">' + Icons.settings + '</button>' : '') + '<button class="btn-icon" id="btn-logout" title="Sair">' + Icons.logout + '</button>' + '</div>' + '</div>' + '<div class="toolbar">' + '<div class="search-box">' + Icons.search + '<input id="search-input" placeholder="Buscar neste diretório..." autocomplete="off"></div>' + (isMasterPlus ? '<button class="toolbar-btn" id="btn-upload">' + Icons.upload + ' <span>Upload</span></button>' : '') + '<button class="toolbar-btn" id="btn-speedtest" style="background:var(--accent-blue);color:#fff;font-weight:600;gap:8px">' + Icons.speed + ' <span>Speed Test</span></button>' + '</div>' + '<div class="content-area" id="content-area"><div class="loading"><div class="spinner"></div></div></div>' + '</div>';
}
function renderSpeedTestView() {
  return '<div class="speedtest-view" style="height: 100%; min-height: 500px; border-radius: var(--radius); overflow: hidden; background: #000;">' + '<iframe src="/speedtest/index.html" style="width:100%; height:100%; border:none;"></iframe>' + '</div>';
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
    if (d.totalSize && d.freeSpace != null) {
      usedPct = Math.round((d.totalSize - d.freeSpace) / d.totalSize * 100);
      spaceText = formatSize(d.freeSpace) + ' livre(s) de ' + formatSize(d.totalSize);
    } else if (d.error) {
      spaceText = 'Indisponível';
    }
    var barColor = usedPct > 90 ? 'var(--danger)' : d.color || 'var(--accent-blue)';
    var offlineClass = d.error ? ' drive-offline' : '';
    html += '<div class="drive-card' + offlineClass + '" data-drive-id="' + d.id + '">' + '<div class="drive-icon">' + Icons.drive(d.color || '#0078d4') + '</div>' + '<div class="drive-info">' + '<div class="drive-name">' + escapeHtml(d.name) + '</div>' + '<div class="drive-bar"><div class="drive-bar-fill" style="width:' + usedPct + '%;background:' + barColor + '"></div></div>' + '<div class="drive-space">' + spaceText + '</div>' + '</div>' + '</div>';
  }
  html += '</div></div>';
  return html;
}
function renderFileList(files, driveId, subpath) {
  if (!files || !files.length) {
    return '<div class="empty-state">' + Icons.emptyFolder + '<p>Esta pasta está vazia</p></div>';
  }
  var role = getUserRole();
  var isAdmin = role === 'admin';
  var html = '<div class="file-table-wrapper"><table class="file-table"><thead><tr>' + '<th data-sort="name">Nome <span class="sort-icon">▲</span></th>' + '<th data-sort="date">Data de modificação <span class="sort-icon">▲</span></th>' + '<th data-sort="type">Tipo <span class="sort-icon">▲</span></th>' + '<th data-sort="size">Tamanho <span class="sort-icon">▲</span></th>' + (isAdmin ? '<th style="width:40px"></th>' : '') + '</tr></thead><tbody>';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var filePath = subpath ? subpath + '/' + f.name : f.name;
    html += '<tr class="file-row" data-name="' + escapeHtml(f.name) + '" data-drive-id="' + driveId + '" data-subpath="' + escapeHtml(filePath) + '" data-is-dir="' + (f.isDirectory ? 'true' : 'false') + '">' + '<td><div class="file-name-cell"><div class="file-icon">' + getFileIcon(f) + '</div><span class="file-name">' + escapeHtml(f.name) + '</span></div></td>' + '<td class="file-date">' + formatDate(f.modified) + '</td>' + '<td class="file-type">' + escapeHtml(f.isDirectory ? 'Pasta' : (f.extension || '').toUpperCase().replace('.', '') || 'Arquivo') + '</td>' + '<td class="file-size">' + (f.isDirectory ? '' : formatSize(f.size)) + '</td>' + (isAdmin ? '<td><button class="btn-icon btn-delete-file" data-name="' + escapeHtml(f.name) + '" data-drive-id="' + driveId + '" data-subpath="' + escapeHtml(filePath) + '" data-is-dir="' + (f.isDirectory ? 'true' : 'false') + '" title="Apagar">' + Icons.trash + '</button></td>' : '') + '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function renderUploadZone() {
  return '<div class="upload-zone" id="upload-zone">' + Icons.upload + '<p>Arraste arquivos aqui ou clique para fazer upload</p>' + '<input type="file" id="upload-input" multiple style="display:none">' + '</div>';
}
