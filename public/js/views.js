"use strict";

// Views - Compatible with all browsers (no optional chaining)
function getUserRole() {
  if (window.app && window.app.user) return window.app.user.role;
  return '';
}
function renderExplorer(user) {
  var role = user ? user.role : '';
  var isAdmin = role === 'admin';
  var isMasterPlus = role === 'master' || role === 'admin';
  var username = user ? user.username : 'Usuário';
  
  return '<div class="explorer-layout">' + 
    '<div class="top-bar">' + 
      '<div class="nav-buttons">' + 
        '<button class="btn-icon" id="btn-back" title="Voltar">' + Icons.back + '</button>' + 
        '<button class="btn-icon" id="btn-forward" title="Avançar">' + Icons.forward + '</button>' + 
        '<button class="btn-icon" id="btn-up" title="Subir">' + Icons.up + '</button>' + 
      '</div>' + 
      '<div class="breadcrumb" id="breadcrumb"><span class="breadcrumb-item active">Este Computador</span></div>' + 
      '<div class="top-bar-actions">' + 
      '</div>' + 
    '</div>' + 
    '<div class="toolbar">' + 
      '<div class="search-box">' + Icons.search + '<input id="search-input" placeholder="Buscar neste diretório..." autocomplete="off"></div>' + 
      '<button class="toolbar-btn" id="btn-upload" style="display:none">' + Icons.upload + ' <span>Upload</span></button>' + 
      '<button class="toolbar-btn" id="btn-new-folder" style="display:none">' + Icons.folderPlus + ' <span>Nova Pasta</span></button>' + 
    '</div>' + 
    renderUploadZone() +
    '<div class="content-area" id="content-area"><div class="loading"><div class="spinner"></div></div></div>' + 
  '</div>';
}
function renderSpeedTestView() {
  return '<div class="app-page-view">' +
           '<div class="app-page-header" style="background:var(--bg-secondary);padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
             '<div style="display:flex;align-items:center;gap:12px">' +
               '<div style="color:var(--accent-blue);font-size:24px">' + Icons.speed + '</div>' +
               '<div>' +
                 '<div style="font-size:18px;font-weight:700">Speed Test</div>' +
                 '<div style="font-size:12px;color:var(--text-secondary)">Teste a velocidade da sua rede local</div>' +
               '</div>' +
             '</div>' +
           '</div>' +
           '<div class="app-page-content" style="flex:1;padding:24px;background:#000">' +
             '<iframe src="/speedtest/index.html" style="width:100%; height:100%; border:none; border-radius:12px"></iframe>' +
           '</div>' +
         '</div>';
}
function renderCamerasView() {
  var gridHtml = '';
  for (var i = 1; i <= 16; i++) {
    gridHtml += '<div class="cam-slot" data-cam="' + i + '" style="background:transparent;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:flex-start;justify-content:flex-start;cursor:pointer;aspect-ratio:16/9;position:relative;z-index:2">' +
                '<span style="margin:4px;font-weight:bold;color:#fff;background:rgba(0,0,0,0.4);padding:0 6px;border-radius:2px;z-index:3;font-size:10px">' + i + '</span>' +
                '</div>';
  }

  var content = '<div class="cameras-view" style="display:flex;flex-direction:column;gap:16px;height:100%">' +
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

  return '<div class="app-page-view">' +
           '<div class="app-page-header" style="background:var(--bg-secondary);padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
             '<div style="display:flex;align-items:center;gap:12px">' +
               '<div style="color:var(--accent-green);font-size:24px">' + Icons.camera + '</div>' +
               '<div>' +
                 '<div style="font-size:18px;font-weight:700">Câmeras</div>' +
                 '<div style="font-size:12px;color:var(--text-secondary)">Monitoramento de câmeras ao vivo</div>' +
               '</div>' +
             '</div>' +
           '</div>' +
           '<div class="app-page-content" style="flex:1;overflow-y:auto;padding:24px">' +
             content +
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
  var canRename = isAdmin;
  if (!isAdmin && drivePermissions) {
    canDelete = !!drivePermissions.delete;
    canRename = !!drivePermissions.upload;
  } else if (!isAdmin && role === 'master') {
    canDelete = true; 
    canRename = true;
  }

  var html = '<div class="file-table-wrapper"><table class="file-table"><thead><tr>' + '<th data-sort="name">Nome <span class="sort-icon">▲</span></th>' + '<th data-sort="date">Data de modificação <span class="sort-icon">▲</span></th>' + '<th data-sort="type">Tipo <span class="sort-icon">▲</span></th>' + '<th data-sort="size">Tamanho <span class="sort-icon">▲</span></th>' + (canDelete || canRename ? '<th style="width:' + (canDelete && canRename ? '80px' : '40px') + '"></th>' : '') + '</tr></thead><tbody>';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var filePath = subpath ? subpath + '/' + f.name : f.name;
    html += '<tr class="file-row" data-name="' + escapeHtml(f.name) + '" data-drive-id="' + driveId + '" data-subpath="' + escapeHtml(filePath) + '" data-is-dir="' + (f.isDirectory ? 'true' : 'false') + '" data-size="' + (f.size || 0) + '">' + 
            '<td><div class="file-name-cell"><div class="file-icon">' + getFileIcon(f) + '</div><span class="file-name">' + escapeHtml(f.name) + '</span></div></td>' + 
            '<td class="file-date">' + formatDate(f.modified) + '</td>' + 
            '<td class="file-type">' + escapeHtml(f.isDirectory ? 'Pasta' : (f.extension || '').toUpperCase().replace('.', '') || 'Arquivo') + '</td>' + 
            '<td class="file-size">' + (f.isDirectory ? '' : formatSize(f.size)) + '</td>' + 
            (canRename || canDelete ? '<td><div style="display:flex;gap:4px">' + 
              (canRename ? '<button class="btn-icon btn-rename-file" data-name="' + escapeHtml(f.name) + '" data-drive-id="' + driveId + '" data-subpath="' + escapeHtml(filePath) + '" title="Renomear">' + Icons.edit + '</button>' : '') + 
              (canDelete ? '<button class="btn-icon btn-delete-file" data-name="' + escapeHtml(f.name) + '" data-drive-id="' + driveId + '" data-subpath="' + escapeHtml(filePath) + '" data-is-dir="' + (f.isDirectory ? 'true' : 'false') + '" title="Apagar">' + Icons.trash + '</button>' : '') + 
            '</div></td>' : '') + '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function renderUploadZone() {
  return '<div class="upload-zone" id="upload-zone">' + Icons.upload + '<p>Arraste arquivos aqui ou clique para fazer upload</p>' + '<input type="file" id="upload-input" multiple style="display:none">' + '</div>';
}

function renderDesktopIcons(installedApps) {
  var appsHtml = '';
  var hasExplorer = installedApps.find(function(a){return a.id === 'explorer';});

  // "Meu Servidor" icon (always first if permitted)
  if (hasExplorer) {
    appsHtml += '<div class="desktop-icon" id="icon-explorer">' +
                  '<div class="icon-wrapper" style="background:#0078d4">' + Icons.monitor + '</div>' +
                  '<span>Meu Servidor</span>' +
                '</div>';
  }

  installedApps.forEach(function(app) {
    if (app.id === 'explorer') return; // Skip explorer as it's already handled
    var icon = Icons[app.icon] || Icons[app.id] || Icons.file;
    // Umbrel apps often have a specific background color
    var bg = '#1c1c1e';
    if (app.id === 'speedtest') bg = 'var(--accent-blue)';
    else if (app.id === 'cameras') bg = 'var(--accent-green)';
    else if (app.id === 'plex') bg = '#E5A00D';
    else if (app.id === 'homeassistant') bg = '#03A9F4';
    else if (app.id === 'settings') bg = '#333';

    appsHtml += '<div class="desktop-icon" data-app-id="' + app.id + '">' +
                  '<div class="icon-wrapper" style="background:' + bg + '">' + icon + '</div>' +
                  '<span>' + escapeHtml(app.name) + '</span>' +
                '</div>';
  });
  return appsHtml;
}

function renderDesktop(installedApps, user, appWindow) {
  var appsHtml = renderDesktopIcons(installedApps);

  var greeting = getGreeting();
  var userName = user ? user.username : 'Usuário';
  var wallpaper = (user && user.settings && user.settings.wallpaper) || '';
  if (!wallpaper && user && user.username) {
    var seed = 0;
    for (var i = 0; i < user.username.length; i++) seed += user.username.charCodeAt(i);
    var wallNum = (seed % 22) + 1;
    wallpaper = '/wallpapers/' + wallNum + '.jpg';
  }
  var style = wallpaper ? ' style="background-image:url(' + wallpaper + '); background-size:cover; background-position:center"' : '';

  return '<div class="desktop-view"' + style + '>' +
           '<div class="desktop-header">' +
             '<div class="desktop-greeting">' + greeting + ', ' + escapeHtml(userName) + '. <button id="btn-personalize" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;margin-left:10px;text-decoration:underline">Personalizar</button></div>' +
           '</div>' +
           '<div class="desktop-content">' +
             '<div class="desktop-widgets-row">' +
               '<div id="desktop-widgets"></div>' +
             '</div>' +
             '<div class="desktop-icons">' + appsHtml + '</div>' +
           '</div>' +
           '<div class="desktop-footer">' +
             '<div class="desktop-pagination" id="desktop-pagination"><div class="page-pill active"></div></div>' +
             '<div class="desktop-search">' +
               Icons.search +
               '<input type="text" placeholder="Pesquisar..." id="desktop-search-input">' +
               '<span class="shortcut-hint">Pesquisar</span>' +
             '</div>' +
           '</div>' +
           (appWindow ? '<div class="app-window-overlay">' + appWindow + '</div>' : '') +
           renderDock() +
         '</div>';
}

function renderAppWindow(content) {
  return '<div class="app-window">' +
           '<button class="window-close-btn" id="btn-window-close" title="Fechar">' + Icons.close + '</button>' +
           '<div class="app-window-content" style="height:100%; overflow:hidden; border-radius:inherit">' + content + '</div>' +
         '</div>';
}

function getGreeting() {
  var hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function renderWallpaperMenu(wallpapers) {
  var html = '<div class="wallpaper-modal-overlay" id="wallpaper-overlay">' +
               '<div class="wallpaper-modal">' +
                 '<div class="wallpaper-modal-header">' +
                   '<h3 style="font-size:18px">Perfil e Personalização</h3>' +
                   '<button class="btn-icon" id="btn-close-wallpaper">' + Icons.close + '</button>' +
                 '</div>' +
                 '<div class="wallpaper-tabs">' +
                    '<div class="wallpaper-tab active" data-tab="gallery">Galeria</div>' +
                    '<div class="wallpaper-tab" data-tab="upload">Enviar Imagem</div>' +
                 '</div>' +
                 '<div class="wallpaper-modal-content" id="wallpaper-modal-gallery">' +
                   '<div class="wallpaper-grid">';
                   
  (wallpapers || []).forEach(function(w) {
    html += '<div class="wallpaper-item" data-url="' + w + '">' +
               '<img src="' + w + '" loading="lazy">' +
             '</div>';
  });

  html +=          '</div>' +
                 '</div>' +
                 '<div class="wallpaper-modal-content" id="wallpaper-modal-upload" style="display:none">' +
                    '<div class="upload-zone" id="wallpaper-upload-zone" style="height:200px; border:2px dashed var(--border); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer">' +
                      Icons.upload +
                      '<p style="margin-top:10px">Selecione uma imagem do seu computador</p>' +
                      '<input type="file" id="wallpaper-upload-input" accept="image/*" style="display:none">' +
                    '</div>' +
                 '</div>' +
               '</div>' +
             '</div>';
  return html;
}

function render2FASetup(qrCode, secret, showPasswordChange) {
  var passwordHtml = '';
  if (showPasswordChange) {
    passwordHtml = '<div style="margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:24px">' +
                     '<h4 style="margin-bottom:16px;color:var(--accent)">Trocar Senha Padrão</h4>' +
                     '<div class="form-group" style="text-align:left"><label style="font-size:11px">Senha Atual</label><input type="password" id="confirm-old-pass" class="form-input" placeholder="Senha atual" style="background:rgba(255,255,255,0.05)"></div>' +
                     '<div class="form-group" style="text-align:left"><label style="font-size:11px">Nova Senha</label><input type="password" id="confirm-new-pass" class="form-input" placeholder="Mínimo 4 caracteres" style="background:rgba(255,255,255,0.05)"></div>' +
                     '<div class="form-group" style="text-align:left"><label style="font-size:11px">Confirmar Nova Senha</label><input type="password" id="confirm-new-pass2" class="form-input" placeholder="Repita a nova senha" style="background:rgba(255,255,255,0.05)"></div>' +
                   '</div>';
  }

  return '<div style="text-align:center">' +
           passwordHtml +
           '<h4 style="margin-bottom:16px">Escaneie este QR Code</h4>' +
           '<div style="background:#fff;padding:10px;border-radius:8px;display:inline-block;margin-bottom:16px"><img src="' + qrCode + '" style="display:block;width:180px;height:180px"></div>' +
           '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Ou digite o código manualmente:</p>' +
           '<div style="background:rgba(255,255,255,0.05);padding:10px 12px;border-radius:8px;font-family:monospace;font-weight:bold;letter-spacing:1px;color:var(--accent-blue);margin-bottom:24px;word-break:break-all;font-size:11px;line-height:1.4">' + secret + '</div>' +
           '<div style="margin-top:24px;text-align:left">' +
             '<label style="display:block;font-size:11px;color:var(--text-secondary);margin-bottom:8px">Digite o código de 6 dígitos do app:</label>' +
             '<input type="text" id="confirm-2fa-code" class="form-input" placeholder="000000" maxlength="6" style="text-align:center;font-size:18px;letter-spacing:4px;width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:#fff;padding:10px;border-radius:8px;outline:none">' +
           '</div>' +
           '<button class="btn btn-primary" id="btn-confirm-2fa" style="width:100%;margin-top:16px;background:var(--accent-blue);color:white;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer">Verificar e Ativar</button>' +
         '</div>';
}

function renderRecoveryCodes(codes) {
  var codesHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0">';
  codes.forEach(function(c) {
    codesHtml += '<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:4px;font-family:monospace;font-size:13px;font-weight:bold">' + c + '</div>';
  });
  codesHtml += '</div>';

  return '<div style="text-align:center">' +
           '<div style="color:var(--accent-green);font-size:48px;margin-bottom:12px;display:flex;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:64px;height:64px"><polyline points="20 6 9 17 4 12"/></svg></div>' +
           '<h4>2FA Ativado!</h4>' +
           '<p style="font-size:12px;color:var(--text-secondary);margin-top:8px">Guarde estes códigos de recuperação em um lugar seguro. Eles permitem o acesso se você perder o celular:</p>' +
           codesHtml +
           '<button class="btn btn-primary" onclick="window.location.reload()" style="width:100%;background:var(--accent-blue);color:white;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer">Concluir</button>' +
         '</div>';
}


function renderDock() {
  var user = (window.app && window.app.user) ? window.app.user : null;
  var role = user ? user.role : 'guest';
  var isAdmin = role === 'admin';
  var isMaster = role === 'master' || isAdmin;
  var userName = user ? user.username : 'admin';
  var roleLabel = (role === 'admin' ? 'ADMIN' : (role === 'master' ? 'MASTER' : 'USER'));
  
  var hasExplorer = true;
  if (window.app && window.app.apps) {
    hasExplorer = !!window.app.apps.find(function(a){return a.id === 'explorer';});
  }

  return '<div class="dock-container">' + 
    '<div class="dock">' + 
      '<div class="dock-row">' + 
        '<div class="dock-item active home" data-view="home" id="dock-home" title="Início"><div class="dock-icon-bg">' + Icons.home + '</div><div class="dock-dot"></div></div>' + 
        (isMaster && hasExplorer ? '<div class="dock-item explorer" data-view="files" id="dock-explorer" title="Arquivos"><div class="dock-icon-bg">' + Icons.explorer + '</div></div>' : '') + 
        '<div class="dock-item appstore" data-view="store" id="dock-appstore" title="App Store"><div class="dock-icon-bg">' + Icons.appstore + '</div></div>' + 
        '<div class="dock-item settings" data-view="settings" id="dock-settings" title="Configurações"><div class="dock-icon-bg">' + Icons.settings + '</div></div>' + 
        '<div class="dock-item logout" data-view="logout" id="dock-logout" title="Sair"><div class="dock-icon-bg">' + Icons.logout + '</div></div>' + 
      '</div>' + 
      '<div class="dock-user-info">' + roleLabel + ' — ' + window.location.hostname + ' | N/A</div>' + 
    '</div>' + 
  '</div>';
}

function renderAppStore(availableApps, installedIds) {
  var appsHtml = '';
  availableApps.forEach(function(app) {
    var isInstalled = installedIds.indexOf(app.id) !== -1;
    var icon = Icons[app.icon] || Icons.file;
    var isCore = ['explorer', 'settings', 'cameras', 'speedtest'].indexOf(app.id) !== -1;
    
    var actionBtn = '';
    if (isInstalled) {
      actionBtn = isCore ? '<button class="btn-install installed" disabled>Sistema</button>' : '<button class="btn-uninstall-store" data-app-id="' + app.id + '">Desinstalar</button>';
    } else if (app.isLocal && app.hasInstaller) {
      actionBtn = '<button class="btn-install-local" data-app-id="' + app.id + '" style="background:var(--accent-blue)">Instalar Local</button>';
    } else {
      actionBtn = '<button class="btn-install" data-app-id="' + app.id + '">Instalar</button>';
    }

    appsHtml += '<div class="app-card">' +
                  '<div class="app-card-icon">' + icon + '</div>' +
                  '<div class="app-card-info">' +
                    '<div class="app-card-name">' + escapeHtml(app.name) + '</div>' +
                    '<div class="app-card-desc">' + escapeHtml(app.description) + '</div>' +
                    '<div class="app-card-actions">' + actionBtn + '</div>' +
                  '</div>' +
                '</div>';
  });

  return '<div class="app-store-view">' +
           '<div class="app-store-header" style="position:relative">' +
             '<h2>App Store</h2>' +
             '<p>Descubra e instale novos aplicativos no seu servidor</p>' +
             '<button class="btn-icon" id="btn-store-close" style="position:absolute;top:20px;right:20px">' + Icons.close + '</button>' +
           '</div>' +
           '<div class="app-store-grid">' + appsHtml + '</div>' +
         '</div>';
}

function renderGenericAppView(app) {
  var url = '/' + app.id + '/';
  var hostname = window.location.hostname;
  
  if (app.port) {
    url = '/api/apps/proxy/' + app.id + '/?token=' + (API.token || '') + '&cb=' + Date.now();
  } else if (app.url) {
    url = app.url;
  } else {
    var cb = Date.now();
    if (app.id === 'plex') url = 'http://' + hostname + ':32400/web?cb=' + cb;
    if (app.id === 'transmission') url = 'http://' + hostname + ':9091?cb=' + cb;
    if (app.id === 'homeassistant') url = 'http://' + hostname + ':8123?cb=' + cb;
    if (app.id === 'portainer') url = 'http://' + hostname + ':9000?cb=' + cb;
  }

  var iconHtml = Icons[app.icon] || Icons.file;
  if (typeof iconHtml === 'function') iconHtml = iconHtml('#fff');

  var isExternal = !!app.url;

  return '<div class="app-page-view" style="height:100%; display:flex; flex-direction:column; background:#111">' +
           '<div class="app-page-header" style="background:var(--bg-secondary); padding:8px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; height:40px">' +
             '<div style="display:flex; align-items:center; gap:10px">' +
               '<div style="color:var(--accent); font-size:16px; display:flex">' + iconHtml + '</div>' +
               '<div style="font-size:13px; font-weight:600; color:#fff">' + escapeHtml(app.name) + '</div>' +
             '</div>' +
             (isExternal ? '<a href="' + url + '" target="_blank" style="font-size:11px; color:var(--accent); text-decoration:none; display:flex; align-items:center; gap:4px">' + Icons.forward + ' Abrir em nova aba</a>' : '') +
           '</div>' +
           '<div class="app-page-content" style="flex:1; position:relative; overflow:hidden; background:#000">' +
             '<iframe src="' + url + '" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; background:#000" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' +
           '</div>' +
         '</div>';
}

function renderAppsConfig(apps) {
  var html = '<div class="config-grid">';
  apps.forEach(function(app) {
    var p = app.permissions || { byRole: {} };
    var icon = Icons[app.icon] || Icons.file;
    var isCore = ['explorer', 'settings', 'cameras', 'speedtest'].indexOf(app.id) !== -1;
    
    html += '<div class="config-card app-cfg-card" data-app-id="' + app.id + '">' +
              '<div class="config-card-header">' +
                '<div class="config-card-icon">' + icon + '</div>' +
                '<div class="config-card-info">' +
                  '<div class="config-card-name">' + escapeHtml(app.name) + '</div>' +
                  '<div class="config-card-detail">ID: ' + app.id + '</div>' +
                '</div>' +
                (!isCore ? '<div class="config-card-actions"><button class="btn-icon btn-uninstall-app" data-app-id="' + app.id + '" title="Desinstalar">' + Icons.trash + '</button></div>' : '') +
              '</div>' +
              '<div class="config-card-body">' +
                '<div style="font-size:12px; font-weight:600; margin-bottom:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Acesso por Grupo</div>' +
                '<div style="display:flex; flex-direction:column; margin-bottom:24px">' +
                  '<div class="card-perm-row">' +
                    '<span style="font-size:13px; color:var(--text-secondary)">Administradores</span>' +
                    '<span class="admin-pill">Acesso Automático</span>' +
                  '</div>' +
                  '<div class="card-perm-row">' +
                    '<span style="font-size:13px">Usuários Master</span>' +
                    '<label class="switch"><input type="checkbox" class="app-role-toggle" data-app-id="' + app.id + '" data-role="master" ' + (p.byRole?.master !== false ? 'checked' : '') + '><span class="slider"></span></label>' +
                  '</div>' +
                  '<div class="card-perm-row">' +
                    '<span style="font-size:13px">Usuários Comuns</span>' +
                    '<label class="switch"><input type="checkbox" class="app-role-toggle" data-app-id="' + app.id + '" data-role="user" ' + (p.byRole?.user !== false ? 'checked' : '') + '><span class="slider"></span></label>' +
                  '</div>' +
                '</div>' +
                '<div style="font-size:12px; font-weight:600; margin-bottom:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Acesso Individual</div>' +
                '<div class="app-user-list" style="display:flex; flex-direction:column; max-height:240px; overflow-y:auto; gap:4px">' +
                  (app.users || []).map(function(u) {
                    return '<div class="card-user-row">' +
                             '<div style="display:flex; flex-direction:column">' +
                               '<span style="font-size:13px; font-weight:500; color:var(--text-primary)">' + escapeHtml(u.username) + '</span>' +
                               '<span style="font-size:11px; color:var(--text-secondary)">' + (u.role === 'master' ? 'Master' : 'Usuário') + '</span>' +
                             '</div>' +
                             '<label class="switch"><input type="checkbox" class="app-user-toggle" data-app-id="' + app.id + '" data-user-id="' + u.id + '" ' + (u.hasAccess ? 'checked' : '') + '><span class="slider"></span></label>' +
                           '</div>';
                  }).join('') +
                '</div>' +
                '<div style="margin-top:24px; border-top:1px solid var(--border); padding-top:20px; display:flex; gap:12px">' +
                  '<button class="btn btn-secondary btn-close-card" style="flex:1; height:44px; font-weight:600">Fechar</button>' +
                '</div>' +
              '</div>' +
            '</div>';
  });
  html += '</div>';
  return html;
}

function renderBrowseDialog(drives) {
  var drivesHtml = '';
  if (drives && drives.length) {
    drives.forEach(function(d) {
      var usedPct = d.total ? Math.round((d.total - d.free) / d.total * 100) : 0;
      var barColor = usedPct > 90 ? 'var(--danger)' : 'var(--accent-blue)';
      var freeText = formatSize(d.free) + ' livre(s) de ' + formatSize(d.total);
      
      drivesHtml += '<div class="browse-drive-item" data-path="' + escapeHtml(d.path) + '" style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border);display:flex;gap:12px;cursor:pointer;margin-bottom:10px">' +
                      '<div style="color:var(--accent);font-size:24px">' + Icons.drive('#0078d4') + '</div>' +
                      '<div style="flex:1">' +
                        '<div style="font-weight:600;font-size:13px">' + escapeHtml(d.name) + ' (' + d.path.replace('\\','') + ')</div>' +
                        '<div style="height:4px;background:rgba(255,255,255,0.1);border-radius:20px;margin:6px 0;overflow:hidden">' +
                          '<div style="height:100%;background:' + barColor + ';width:' + usedPct + '%"></div>' +
                        '</div>' +
                        '<div style="font-size:11px;color:var(--text-secondary)">' + freeText + '</div>' +
                      '</div>' +
                    '</div>';
    });
  }

  return '<div class="browse-dialog-overlay" id="browse-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center">' +
           '<div class="browse-dialog" style="width:90%;max-width:500px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);display:flex;flex-direction:column;max-height:80vh">' +
             '<div class="browse-header" style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
               '<h3 style="margin:0">Selecionar Pasta</h3>' +
               '<button class="btn-icon" id="browse-close">' + Icons.close + '</button>' +
             '</div>' +
             '<div class="browse-breadcrumb" id="browse-breadcrumb" style="padding:8px 20px;background:var(--bg-secondary);font-size:12px;border-bottom:1px solid var(--border);color:var(--text-secondary)">Drives</div>' +
             '<div class="selected-path-banner" style="padding:10px 20px;background:rgba(0,120,212,0.1);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">' +
               '<span style="font-size:11px;font-weight:600;color:var(--accent-blue);text-transform:uppercase">Selecionado:</span>' +
               '<span id="browse-selected-path" style="font-size:12px;color:#fff;word-break:break-all">Nenhum</span>' +
             '</div>' +
             '<div class="browse-content" id="browse-content" style="padding:20px;overflow-y:auto;flex:1">' +
               drivesHtml +
             '</div>' +
             '<div class="browse-footer" style="padding:16px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:12px">' +
               '<button class="btn btn-secondary btn-sm" id="browse-cancel">Cancelar</button>' +
               '<button class="btn btn-primary btn-sm" id="browse-select">Selecionar Pasta</button>' +
             '</div>' +
           '</div>' +
         '</div>';
}

function renderNewDriveForm(users, currentUserIsAdmin) {
  var usersList = (users || []).filter(function(u){return u.role !== 'admin';}).map(function(u) {
    return '<div class="card-user-row" data-user-id="' + u.id + '">' +
             '<div style="display:flex; flex-direction:column"><span style="font-size:13px; font-weight:500">' + escapeHtml(u.username) + '</span><span style="font-size:11px; color:var(--text-secondary)">' + (u.role === 'master' ? 'Master' : 'Usuário') + '</span></div>' +
             '<div style="display:flex;gap:12px">' +
               (currentUserIsAdmin ? '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;color:var(--accent);font-weight:600"><input type="checkbox" class="p-user-manage"> Acesso</label>' : '') +
               '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-user-read" checked> Leitura</label>' +
               '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-user-upload"> Escrita</label>' +
               '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-user-delete"> Apagar</label>' +
             '</div>' +
           '</div>';
  }).join('');

  return '<div class="form-group"><label>Nome de Exibição</label><input class="form-input" id="new-drive-name" placeholder="Ex: Meu Servidor"></div>' +
         '<div class="form-group"><label>Caminho da Pasta</label>' +
           '<div style="display:flex;gap:8px;align-items:center">' +
             '<button class="btn btn-secondary" id="btn-browse-new" style="flex:1;text-align:center;height:38px;font-weight:600">Escolher Pasta...</button>' +
             '<input type="hidden" id="new-drive-path">' +
           '</div>' +
         '</div>' +
         '<div class="form-group"><label>Cor</label><div class="color-options" id="new-drive-colors">' +
           DRIVE_COLORS.map(function (c, i) {
             return '<div class="color-option ' + (i === 0 ? 'selected' : '') + '" data-color="' + c + '" style="background:' + c + '"></div>';
           }).join('') +
         '</div></div>' +

         (currentUserIsAdmin ? 
           '<div style="margin-top:20px; border-top:1px solid var(--border); padding-top:20px" id="new-drive-group-perms">' +
             '<div style="font-size:12px; font-weight:600; margin-bottom:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Permissões de Grupo</div>' +
             '<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:24px">' +
               '<div class="card-perm-row">' +
                 '<span style="font-size:13px">Administradores</span><span class="admin-pill">Acesso Total</span>' +
               '</div>' +
               '<div class="card-perm-row">' +
                 '<span style="font-size:13px">Usuários Master</span>' +
                 '<div style="display:flex;gap:16px">' +
                   '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;color:var(--accent);font-weight:600"><input type="checkbox" class="p-m-manage"> Acesso</label>' +
                   '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-m-read" checked> Leitura</label>' +
                   '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-m-upload" checked> Escrita</label>' +
                   '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-m-delete"> Apagar</label>' +
                 '</div>' +
               '</div>' +
               '<div class="card-perm-row">' +
                 '<span style="font-size:13px">Usuários Comuns</span>' +
                 '<div style="display:flex;gap:16px">' +
                   '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-u-read" checked> Leitura</label>' +
                   '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-u-upload"> Escrita</label>' +
                   '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" class="p-u-delete"> Apagar</label>' +
                 '</div>' +
               '</div>' +
             '</div>' +
           '</div>' : '') +

         '<div style="margin-top:20px; border-top:1px solid var(--border); padding-top:20px">' +
           '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">' +
             '<div style="font-size:12px; font-weight:600; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em">Acesso Individual</div>' +
             '<div class="search-box-mini" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:4px 10px; display:flex; align-items:center; gap:6px; width:150px">' +
               Icons.search + '<input class="user-search-input" placeholder="Buscar..." style="background:transparent; border:none; color:#fff; font-size:11px; outline:none; width:100%"></div>' +
           '</div>' +
           '<div style="display:flex; flex-direction:column; gap:4px; max-height:200px; overflow-y:auto" id="new-drive-permissions" class="user-list-container">' +
             usersList +
           '</div>' +
         '</div>' +
         '<div class="form-actions" style="margin-top:30px">' +
           '<button class="btn btn-primary" id="save-new-drive" style="width:100%">Adicionar Drive</button>' +
         '</div>';
}

function renderPreviewModal(driveId, subpath, file) {
  var ext = (file.name.split('.').pop() || '').toLowerCase();
  var name = escapeHtml(file.name);
  var previewUrl = '/api/files/preview?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath);
  var downloadUrl = '/api/files/download?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath);
  var token = API.token;
  if (token) {
    previewUrl += '&token=' + token;
    downloadUrl += '&token=' + token;
  }

  var contentHtml = '';
  var imgExts = ['jpg','jpeg','png','gif','bmp','webp','svg'];
  var vidExts = ['mp4','mkv','avi','mov','webm'];
  var audExts = ['mp3','wav','flac','ogg'];

  if (imgExts.indexOf(ext) >= 0) {
    contentHtml = '<img src="' + previewUrl + '" style="max-width:100%; max-height:calc(90vh - 120px); border-radius:4px">';
  } else if (vidExts.indexOf(ext) >= 0) {
    contentHtml = '<video src="' + previewUrl + '" controls style="max-width:100%; max-height:calc(90vh - 120px); border-radius:4px"></video>';
  } else if (audExts.indexOf(ext) >= 0) {
    contentHtml = '<div style="padding:40px; text-align:center"><div style="font-size:48px; margin-bottom:20px">' + Icons.audio + '</div><audio src="' + previewUrl + '" controls style="width:100%"></audio></div>';
  } else if (ext === 'pdf') {
    contentHtml = '<iframe src="' + previewUrl + '" style="width:100%; height:calc(90vh - 120px); border:none; background:#fff; border-radius:4px"></iframe>';
  } else {
    contentHtml = '<div id="preview-text-content" style="background:#000; color:#eee; padding:20px; font-family:monospace; font-size:13px; width:100%; height:calc(90vh - 120px); overflow:auto; white-space:pre-wrap; border-radius:4px">Carregando...</div>';
  }

  return '<div class="modal-overlay" id="preview-overlay" style="z-index:2000">' +
           '<div class="modal-content" style="width:90%; max-width:1000px; max-height:95vh; padding:0; overflow:hidden; background:var(--bg-primary); border:1px solid var(--border)">' +
             '<div class="modal-header" style="padding:15px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">' +
               '<div style="display:flex; align-items:center; gap:12px">' +
                 '<div style="width:32px; height:32px">' + getFileIcon({name: file.name, isDirectory: false, extension: '.'+ext}) + '</div>' +
                 '<div style="display:flex; flex-direction:column"><span style="font-weight:600; font-size:14px">' + name + '</span><span style="font-size:11px; color:var(--text-secondary)">' + formatSize(file.size) + '</span></div>' +
               '</div>' +
               '<div style="display:flex; gap:10px">' +
                 '<a href="' + downloadUrl + '" class="btn btn-icon" title="Download" download>' + Icons.download + '</a>' +
                 '<button class="btn btn-icon" id="btn-close-preview">' + Icons.close + '</button>' +
               '</div>' +
             '</div>' +
             '<div class="modal-body" style="padding:10px; background:rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:center; min-height:200px">' +
               contentHtml +
             '</div>' +
           '</div>' +
         '</div>';
}

function renderSystemWidget(stats) {
  if (!stats) return '';
  
  var memUsed = (stats.memory.used / (1024 * 1024 * 1024)).toFixed(2);
  var netIn = formatSize(stats.network.in) + '/s';
  var netOut = formatSize(stats.network.out) + '/s';

  return '<div class="system-widget pill-style">' +
           '<div class="widget-pill">' +
             '<div class="widget-icon">' + Icons.clock + '</div>' +
             '<div class="widget-label">Hora</div>' +
             '<div class="widget-value" id="stat-time">--:--</div>' +
           '</div>' +
           '<div class="widget-pill">' +
             '<div class="widget-icon">' + Icons.weather + '</div>' +
             '<div class="widget-label">Clima</div>' +
             '<div style="display:flex; flex-direction:column; align-items:center">' +
               '<div class="widget-value" id="stat-weather">--°C</div>' +
               '<div id="stat-weather-desc" style="font-size:11px; color:rgba(255,255,255,0.9); margin-top:4px; text-align:center; font-weight:500; white-space:nowrap">--</div>' +
               '<div id="stat-weather-city" style="font-size:10px; color:rgba(255,255,255,0.6); text-align:center; white-space:nowrap">--</div>' +
             '</div>' +
           '</div>' +
           '<div class="widget-pill">' +
             '<div class="widget-icon">' + Icons.cpu + '</div>' +
             '<div class="widget-label">CPU</div>' +
             '<div class="widget-value" id="stat-cpu">' + stats.cpu + '%</div>' +
           '</div>' +
           '<div class="widget-pill">' +
             '<div class="widget-icon">' + Icons.ram + '</div>' +
             '<div class="widget-label">RAM</div>' +
             '<div class="widget-value" id="stat-mem">' + memUsed + ' GB</div>' +
           '</div>' +
           '<div class="widget-pill">' +
             '<div class="widget-icon">' + Icons.speed + '</div>' +
             '<div class="widget-label">Rede</div>' +
             '<div style="display:flex; flex-direction:column; align-items:center; gap:2px">' +
               '<div class="widget-value" id="stat-net-out" style="font-size:9px; display:flex; align-items:center; gap:2px">' + Icons.up + ' ' + netOut + '</div>' +
               '<div class="widget-value" id="stat-net-in" style="font-size:9px; display:flex; align-items:center; gap:2px">' + Icons.down + ' ' + netIn + '</div>' +
             '</div>' +
           '</div>' +
         '</div>';
}

function renderForcedPasswordChange(user) {
  return '<div class="auth-page">' +
           '<div class="auth-card" style="max-width:400px">' +
             '<div class="logo" style="color:var(--accent);margin-bottom:24px"><div style="font-size:48px;margin-bottom:16px">' + Icons.shield + '</div><h1 style="font-size:20px">Alteração Obrigatória</h1><p style="font-size:12px;color:var(--text-secondary);margin-top:8px">Para sua segurança, você deve alterar sua senha padrão no primeiro acesso.</p></div>' +
             '<div id="auth-error" class="auth-error"></div>' +
             '<form id="force-change-form">' +
               '<div class="form-group"><label>Senha Atual</label><input type="password" id="force-old-pass" class="form-input" required placeholder="Sua senha atual"></div>' +
               '<div class="form-group"><label>Nova Senha</label><input type="password" id="force-new-pass" class="form-input" required placeholder="Mínimo 4 caracteres"></div>' +
               '<div class="form-group"><label>Confirmar Nova Senha</label><input type="password" id="force-confirm-pass" class="form-input" required placeholder="Repita a nova senha"></div>' +
               '<button type="submit" class="btn btn-primary" style="margin-top:20px;height:48px;font-weight:700">Atualizar e Entrar</button>' +
             '</form>' +
           '</div>' +
         '</div>';
}

function renderBrowserView() {
  return '<div class="app-page-view" style="height:100%; display:flex; flex-direction:column; background:#111">' +
           '<div class="app-page-header browser-toolbar" style="background:var(--bg-secondary); padding:8px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; flex-shrink:0; height:48px">' +
             '<div style="display:flex; align-items:center; gap:4px">' +
               '<button class="btn-icon btn-sm" id="browser-back" title="Voltar">' + Icons.back + '</button>' +
               '<button class="btn-icon btn-sm" id="browser-forward" title="Avançar">' + Icons.forward + '</button>' +
               '<button class="btn-icon btn-sm" id="browser-refresh" title="Recarregar">' + Icons.refresh + '</button>' +
             '</div>' +
             '<div class="browser-address-bar" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:20px; padding:4px 16px; display:flex; align-items:center; gap:8px">' +
               '<div style="color:var(--text-secondary); font-size:12px">' + Icons.browser + '</div>' +
               '<input type="text" id="browser-url" value="https://www.google.com/search?igu=1" style="flex:1; background:transparent; border:none; color:#fff; font-size:13px; outline:none" placeholder="Digite uma URL ou pesquise...">' +
             '</div>' +
             '<div style="display:flex; align-items:center; gap:8px">' +
               '<button class="btn btn-primary btn-sm" id="browser-go" style="padding:4px 16px; border-radius:15px; font-size:12px">Ir</button>' +
             '</div>' +
           '</div>' +
           '<div class="app-page-content" style="flex:1; position:relative; overflow:hidden; background:#fff">' +
             '<iframe id="browser-iframe" src="https://www.google.com/search?igu=1" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; background:#fff" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' +
           '</div>' +
         '</div>';
}
