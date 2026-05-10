// Main App
class App {
  constructor() {
    this.user = null;
    this.currentDriveId = null;
    this.currentSubpath = '';
    this.history = [];
    this.historyIndex = -1;
    this.sortCol = 'name';
    this.sortAsc = true;
    this.allFiles = [];
    this.configTab = 'drives';
    this.init();
  }

  async init() {
    try {
      var status = await API.get('/auth/status');
      if (!status || !status.setupComplete) { this.navigate('setup'); return; }
      if (!API.token) { this.navigate('login'); return; }
      try {
        this.user = await API.get('/auth/me');
        if (this.user) {
          this.navigate('explorer');
        } else {
          API.clearToken();
          this.navigate('login');
        }
      } catch(e) { API.clearToken(); this.navigate('login'); }
    } catch(e) { this.navigate('login'); }
  }

  navigate(view) {
    var appEl = document.getElementById('app');
    try {
      if (view === 'setup') {
        appEl.innerHTML = renderSetup();
        this.bindSetup();
      } else if (view === 'login') {
        appEl.innerHTML = renderLogin();
        this.bindLogin();
      } else if (view === 'explorer') {
        appEl.innerHTML = renderExplorer();
        this.bindExplorer();
        this.loadDrives();
      }
    } catch(e) {
      appEl.innerHTML = '<div style="padding:40px;text-align:center;color:#999"><p>Erro ao carregar: ' + (e.message || 'Desconhecido') + '</p><button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#0078d4;color:#fff;border:none;border-radius:6px;cursor:pointer">Recarregar</button></div>';
    }
  }

  // === AUTH ===
  bindSetup() {
    document.getElementById('setup-form').onsubmit = async function(e) {
      e.preventDefault();
      var errEl = document.getElementById('auth-error');
      var btn = e.target.querySelector('button[type=submit]');
      var user = document.getElementById('setup-user').value.trim();
      var pass = document.getElementById('setup-pass').value;
      var pass2 = document.getElementById('setup-pass2').value;
      if (pass !== pass2) { errEl.textContent = 'As senhas não coincidem'; errEl.classList.add('visible'); return; }
      btn.disabled = true; btn.textContent = 'Criando...';
      try {
        var res = await API.post('/auth/setup', { username: user, password: pass });
        if (res && res.token) {
          API.setToken(res.token);
          window.app.user = res.user;
          showToast('Administrador criado com sucesso!', 'success');
          window.app.navigate('explorer');
        } else {
          errEl.textContent = 'Resposta inválida do servidor'; errEl.classList.add('visible');
        }
      } catch(err) { errEl.textContent = err.message; errEl.classList.add('visible'); }
      btn.disabled = false; btn.textContent = 'Criar Administrador';
    };
  }

  bindLogin() {
    document.getElementById('login-form').onsubmit = async function(e) {
      e.preventDefault();
      var errEl = document.getElementById('auth-error');
      var btn = e.target.querySelector('button[type=submit]');
      errEl.classList.remove('visible');
      var userVal = document.getElementById('login-user').value.trim();
      var passVal = document.getElementById('login-pass').value;
      if (!userVal) { errEl.textContent = 'Digite o nome de usuário'; errEl.classList.add('visible'); return; }
      if (!passVal) { errEl.textContent = 'Digite a senha'; errEl.classList.add('visible'); return; }
      btn.disabled = true; btn.textContent = 'Entrando...';
      try {
        var res = await API.post('/auth/login', { username: userVal, password: passVal });
        if (res && res.token) {
          API.setToken(res.token);
          window.app.user = res.user;
          window.app.navigate('explorer');
        } else {
          errEl.textContent = 'Erro: servidor não retornou token de acesso';
          errEl.classList.add('visible');
        }
      } catch(err) {
        errEl.textContent = err.message || 'Erro de conexão com o servidor';
        errEl.classList.add('visible');
      }
      btn.disabled = false; btn.textContent = 'Entrar';
    };
  }

  // === EXPLORER ===
  bindExplorer() {
    var self = this;
    var el;
    el = document.getElementById('btn-back'); if (el) el.addEventListener('click', function() { self.goBack(); });
    el = document.getElementById('btn-up'); if (el) el.addEventListener('click', function() { self.goUp(); });
    el = document.getElementById('btn-home'); if (el) el.addEventListener('click', function() { self.loadDrives(); });
    el = document.getElementById('btn-config'); if (el) el.addEventListener('click', function() { self.openConfig(); });
    el = document.getElementById('btn-logout'); if (el) el.addEventListener('click', function() { API.clearToken(); self.navigate('login'); });
    el = document.getElementById('btn-upload'); if (el) el.addEventListener('click', function() { self.showUpload(); });
    
    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', function() { self.filterFiles(searchInput.value); });

    // Drag & drop on content area (master+ only)
    var role = (self.user && self.user.role) || '';
    var content = document.getElementById('content-area');
    if (content && (role === 'master' || role === 'admin')) {
      content.addEventListener('dragover', function(e) { e.preventDefault(); });
      content.addEventListener('drop', function(e) {
        e.preventDefault();
        if (self.currentDriveId && e.dataTransfer.files.length) {
          self.doUpload(e.dataTransfer.files);
        }
      });
    }
  }

  updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let html = `<span class="breadcrumb-item" data-nav="home">Este Computador</span>`;
    if (this.currentDriveId) {
      html += `<span class="breadcrumb-sep">›</span><span class="breadcrumb-item" data-nav="drive">${escapeHtml(this._driveName || '')}</span>`;
      if (this.currentSubpath) {
        const parts = this.currentSubpath.split('/');
        parts.forEach((p, i) => {
          const sub = parts.slice(0, i + 1).join('/');
          const isLast = i === parts.length - 1;
          html += `<span class="breadcrumb-sep">›</span><span class="breadcrumb-item ${isLast ? 'active' : ''}" data-nav="sub" data-subpath="${escapeHtml(sub)}">${escapeHtml(p)}</span>`;
        });
      }
    }
    bc.innerHTML = html;
    bc.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', () => {
        const nav = item.dataset.nav;
        if (nav === 'home') this.loadDrives();
        else if (nav === 'drive') this.loadFiles(this.currentDriveId, '');
        else if (nav === 'sub') this.loadFiles(this.currentDriveId, item.dataset.subpath);
      });
    });
    // Scroll breadcrumb to end
    bc.scrollLeft = bc.scrollWidth;
  }

  pushHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ driveId: this.currentDriveId, subpath: this.currentSubpath });
    this.historyIndex = this.history.length - 1;
  }

  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const h = this.history[this.historyIndex];
      if (h.driveId) this.loadFiles(h.driveId, h.subpath, true);
      else this.loadDrives(true);
    }
  }

  goUp() {
    if (!this.currentDriveId) return;
    if (!this.currentSubpath) { this.loadDrives(); return; }
    const parts = this.currentSubpath.split('/');
    parts.pop();
    this.loadFiles(this.currentDriveId, parts.join('/'));
  }

  async loadDrives(noHistory) {
    this.currentDriveId = null;
    this.currentSubpath = '';
    this._driveName = '';
    if (!noHistory) this.pushHistory();
    this.updateBreadcrumb();
    const content = document.getElementById('content-area');
    if (!content) return;
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const drives = await API.get('/files/drives');
      content.innerHTML = renderDrives(drives);
      content.querySelectorAll('.drive-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.driveId;
          const d = drives.find(x => x.id === id);
          if (d) this.loadFiles(id, '', false, d.name);
        });
      });
    } catch (err) { content.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`; }
  }

  async loadFiles(driveId, subpath, noHistory, driveName) {
    this.currentDriveId = driveId;
    this.currentSubpath = subpath || '';
    if (driveName) this._driveName = driveName;
    if (!noHistory) this.pushHistory();
    this.updateBreadcrumb();
    const content = document.getElementById('content-area');
    if (!content) return;
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const data = await API.get(`/files/list?driveId=${driveId}&subpath=${encodeURIComponent(subpath || '')}`);
      this._driveName = data.driveName;
      this.updateBreadcrumb();
      this.allFiles = data.files;
      this.sortAndRender(data);
    } catch (err) { content.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`; }
  }

  sortAndRender(data) {
    var srcFiles = (data && data.files) ? data.files : this.allFiles;
    var files = srcFiles.slice();
    // Folders first, then sort
    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      let va, vb;
      if (this.sortCol === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (this.sortCol === 'modified') { va = a.modified; vb = b.modified; }
      else if (this.sortCol === 'type') { va = a.type || ''; vb = b.type || ''; }
      else if (this.sortCol === 'size') { va = a.size || 0; vb = b.size || 0; }
      if (va < vb) return this.sortAsc ? -1 : 1;
      if (va > vb) return this.sortAsc ? 1 : -1;
      return 0;
    });

    const renderData = {
      driveId: this.currentDriveId,
      driveName: this._driveName,
      subpath: this.currentSubpath,
      files
    };

    var content = document.getElementById('content-area');
    if (!content) return;
    content.innerHTML = renderFileList(files, this.currentDriveId, this.currentSubpath);
    this.bindFileList();
  }

  bindFileList() {
    // Sort headers
    document.querySelectorAll('.file-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (this.sortCol === col) this.sortAsc = !this.sortAsc;
        else { this.sortCol = col; this.sortAsc = true; }
        this.sortAndRender();
      });
    });

    // File rows
    document.querySelectorAll('.file-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking the delete button
        if (e.target.closest('.btn-delete-file')) return;
        if (row.dataset.isDir === 'true') {
          this.loadFiles(row.dataset.driveId, row.dataset.subpath);
        } else {
          const file = this.allFiles.find(f => f.name === row.dataset.name);
          if (file && canPreview(file)) {
            this.openPreview(file, row.dataset.driveId, row.dataset.subpath);
          } else {
            this.downloadFile(row.dataset.driveId, row.dataset.subpath);
          }
        }
      });
    });

    // Delete buttons (admin only)
    document.querySelectorAll('.btn-delete-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.dataset.name;
        const isDir = btn.dataset.isDir === 'true';
        const tipo = isDir ? 'a pasta' : 'o arquivo';
        const msg = `Tem certeza que deseja apagar ${tipo} "${name}"?${isDir ? '\n\nTodo o conteúdo da pasta será apagado permanentemente!' : ''}`;
        if (confirm(msg)) {
          this.deleteFile(btn.dataset.driveId, btn.dataset.subpath, name);
        }
      });
    });
  }

  filterFiles(query) {
    if (!query) { this.sortAndRender(); return; }
    var q = query.toLowerCase();
    var filtered = this.allFiles.filter(function(f) { return f.name.toLowerCase().indexOf(q) >= 0; });
    var content = document.getElementById('content-area');
    if (!content) return;
    content.innerHTML = renderFileList(filtered, this.currentDriveId, this.currentSubpath);
    this.bindFileList();
  }

  // === PREVIEW ===
  openPreview(file, driveId, subpath) {
    const modal = document.getElementById('preview-modal');
    const title = document.getElementById('preview-title');
    const body = document.getElementById('preview-content');
    title.textContent = file.name;
    modal.classList.remove('hidden');

    const previewUrl = `/api/files/preview?driveId=${driveId}&subpath=${encodeURIComponent(subpath)}`;
    var ext = (file.extension || '').toLowerCase();
    var imgExts = ['.jpg','.jpeg','.png','.gif','.bmp','.webp','.svg'];
    var vidExts = ['.mp4','.mkv','.avi','.mov','.webm'];
    var audExts = ['.mp3','.wav','.flac','.ogg'];

    if (imgExts.indexOf(ext) >= 0) {
      body.innerHTML = '<img src="' + previewUrl + '&token=' + API.token + '" alt="' + escapeHtml(file.name) + '">';
    } else if (vidExts.indexOf(ext) >= 0) {
      body.innerHTML = '<video controls autoplay src="' + previewUrl + '&token=' + API.token + '"></video>';
    } else if (audExts.indexOf(ext) >= 0) {
      body.innerHTML = '<audio controls autoplay src="' + previewUrl + '&token=' + API.token + '" style="width:100%;max-width:500px"></audio>';
    } else if (ext === '.pdf') {
      body.innerHTML = `<iframe src="${previewUrl}&token=${API.token}"></iframe>`;
    } else {
      // Text preview
      body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      fetch(previewUrl, { headers: { Authorization: 'Bearer ' + API.token } })
        .then(r => r.json())
        .then(d => { body.innerHTML = `<pre>${escapeHtml(d.content || '')}</pre>`; })
        .catch(() => { body.innerHTML = '<p>Erro ao carregar preview</p>'; });
    }

    // Bind close
    document.getElementById('preview-close').onclick = () => modal.classList.add('hidden');
    document.querySelector('.modal-backdrop').onclick = () => modal.classList.add('hidden');
    document.getElementById('preview-download').onclick = () => this.downloadFile(driveId, subpath);
  }

  downloadFile(driveId, subpath) {
    const url = `/api/files/download?driveId=${driveId}&subpath=${encodeURIComponent(subpath)}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    // Add auth token as query param for download
    var separator = url.indexOf('?') >= 0 ? '&' : '?';
    a.href = url + separator + 'token=' + API.token;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // === DELETE ===
  async deleteFile(driveId, subpath, name) {
    try {
      await API.request(`/files/delete?driveId=${driveId}&subpath=${encodeURIComponent(subpath)}`, { method: 'DELETE' });
      showToast(`"${name}" apagado com sucesso`, 'success');
      this.loadFiles(this.currentDriveId, this.currentSubpath, true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // === UPLOAD ===
  showUpload() {
    if (!this.currentDriveId) { showToast('Selecione um drive primeiro', 'error'); return; }
    const content = document.getElementById('content-area');
    const existing = document.getElementById('upload-zone');
    if (existing) { existing.remove(); return; }
    content.insertAdjacentHTML('afterbegin', renderUploadZone());
    
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('upload-input');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); this.doUpload(e.dataTransfer.files); });
    input.addEventListener('change', () => { if (input.files.length) this.doUpload(input.files); });
  }

  async doUpload(files) {
    const zone = document.getElementById('upload-zone');
    if (zone) zone.innerHTML = `<div class="upload-progress"><div class="upload-progress-bar"><div class="upload-progress-fill" id="upload-fill" style="width:0%"></div></div><span class="upload-progress-text" id="upload-text">0%</span></div>`;
    try {
      await API.uploadFiles(this.currentDriveId, this.currentSubpath, files, pct => {
        const fill = document.getElementById('upload-fill');
        const text = document.getElementById('upload-text');
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = pct + '%';
      });
      showToast('Upload concluído!', 'success');
      this.loadFiles(this.currentDriveId, this.currentSubpath, true);
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  }

  // === CONFIG ===
  openConfig() {
    document.body.insertAdjacentHTML('beforeend', renderConfigPanel());
    this.bindConfig();
    this.loadConfigTab('drives');
  }

  closeConfig() {
    var el = document.getElementById('config-overlay'); if (el) el.remove();
  }

  bindConfig() {
    var self = this;
    var el;
    el = document.getElementById('config-close'); if (el) el.addEventListener('click', function() { self.closeConfig(); });
    el = document.getElementById('config-close-backdrop'); if (el) el.addEventListener('click', function() { self.closeConfig(); });
    document.querySelectorAll('.config-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.configTab = tab.dataset.tab;
        this.loadConfigTab(tab.dataset.tab);
      });
    });
  }

  async loadConfigTab(tab) {
    var body = document.getElementById('config-body');
    if (!body) return;
    body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      if (tab === 'drives') {
        var drives = await API.get('/admin/drives');
        body.innerHTML = renderDrivesConfig(drives || []);
        this.bindDrivesConfig(drives || []);
      } else if (tab === 'users') {
        var users = await API.get('/admin/users');
        body.innerHTML = renderUsersConfig(users || []);
        this.bindUsersConfig(users || []);
      } else if (tab === 'sessions') {
        var sessions = await API.get('/admin/sessions');
        body.innerHTML = renderSessionsConfig(sessions || []);
        this.bindSessionsConfig();
      } else if (tab === 'server') {
        var serverCfg = await API.get('/admin/server');
        body.innerHTML = renderServerConfig(serverCfg || {});
        this.bindServerConfig();
      }
    } catch(err) { body.innerHTML = '<p style="padding:20px;color:var(--text-muted)">' + (err.message || 'Erro') + '</p>'; }
  }

  bindDrivesConfig(drives) {
    let selectedColor = DRIVE_COLORS[0];
    document.querySelectorAll('.color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedColor = opt.dataset.color;
      });
    });

    document.querySelectorAll('.cfg-edit-drive').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = drives.find(x => x.id === btn.dataset.id);
        if (!d) return;
        document.getElementById('drive-edit-id').value = d.id;
        document.getElementById('cfg-drive-name').value = d.name;
        document.getElementById('cfg-drive-path').value = d.path;
        document.getElementById('drive-form-title').textContent = 'Editar Drive';
        document.querySelectorAll('.color-option').forEach(o => {
          o.classList.toggle('selected', o.dataset.color === d.color);
          if (o.dataset.color === d.color) selectedColor = d.color;
        });
      });
    });

    document.querySelectorAll('.cfg-del-drive').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover este drive?')) return;
        try {
          await API.del('/admin/drives/' + btn.dataset.id);
          showToast('Drive removido', 'success');
          this.loadConfigTab('drives');
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    var cancelBtn = document.getElementById('drive-form-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function() {
      document.getElementById('drive-edit-id').value = '';
      document.getElementById('cfg-drive-name').value = '';
      document.getElementById('cfg-drive-path').value = '';
      document.getElementById('drive-form-title').textContent = 'Adicionar Drive';
    });

    var saveBtn = document.getElementById('drive-form-save');
    if (saveBtn) saveBtn.addEventListener('click', async function() {
      const editId = document.getElementById('drive-edit-id').value;
      const name = document.getElementById('cfg-drive-name').value.trim();
      const path = document.getElementById('cfg-drive-path').value.trim();
      if (!name || !path) { showToast('Nome e caminho são obrigatórios', 'error'); return; }
      try {
        if (editId) {
          await API.put('/admin/drives/' + editId, { name, path, color: selectedColor });
          showToast('Drive atualizado', 'success');
        } else {
          await API.post('/admin/drives', { name, path, color: selectedColor });
          showToast('Drive adicionado', 'success');
        }
        this.loadConfigTab('drives');
      } catch (err) { showToast(err.message, 'error'); }
    });
  }

  bindUsersConfig(users) {
    document.querySelectorAll('.cfg-edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('user-edit-id').value = btn.dataset.id;
        document.getElementById('cfg-user-name').value = btn.dataset.username;
        document.getElementById('cfg-user-pass').value = '';
        document.getElementById('cfg-user-role').value = btn.dataset.role;
        document.getElementById('user-form-title').textContent = 'Editar Usuário';
      });
    });

    document.querySelectorAll('.cfg-del-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover este usuário?')) return;
        try {
          await API.del('/admin/users/' + btn.dataset.id);
          showToast('Usuário removido', 'success');
          this.loadConfigTab('users');
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    var cancelBtn2 = document.getElementById('user-form-cancel');
    if (cancelBtn2) cancelBtn2.addEventListener('click', function() {
      document.getElementById('user-edit-id').value = '';
      document.getElementById('cfg-user-name').value = '';
      document.getElementById('cfg-user-pass').value = '';
      document.getElementById('user-form-title').textContent = 'Adicionar Usuário';
    });

    var saveBtn2 = document.getElementById('user-form-save');
    if (saveBtn2) saveBtn2.addEventListener('click', async function() {
      const editId = document.getElementById('user-edit-id').value;
      const username = document.getElementById('cfg-user-name').value.trim();
      const password = document.getElementById('cfg-user-pass').value;
      const role = document.getElementById('cfg-user-role').value;
      if (!username) { showToast('Nome é obrigatório', 'error'); return; }
      if (!editId && !password) { showToast('Senha é obrigatória', 'error'); return; }
      try {
        const body = { username, role };
        if (password) body.password = password;
        if (editId) {
          await API.put('/admin/users/' + editId, body);
          showToast('Usuário atualizado', 'success');
        } else {
          await API.post('/admin/users', body);
          showToast('Usuário criado', 'success');
        }
        this.loadConfigTab('users');
      } catch (err) { showToast(err.message, 'error'); }
    });
  }
  bindSessionsConfig() {
    document.querySelectorAll('.cfg-kick-session').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Desconectar "' + btn.dataset.username + '"?')) return;
        try {
          await API.del('/admin/sessions/' + btn.dataset.id);
          showToast('Sessão encerrada', 'success');
          window.app.loadConfigTab('sessions');
        } catch(err) { showToast(err.message, 'error'); }
      });
    });
  }

  bindServerConfig() {
    var saveBtn = document.getElementById('server-config-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', async function() {
        var name = document.getElementById('cfg-server-name').value.trim();
        var port = document.getElementById('cfg-server-port').value;
        try {
          var res = await API.put('/admin/server', { serverName: name, port: parseInt(port) });
          showToast('Configurações salvas!', 'success');
          if (res && res.needsRestart) {
            showToast('Reinicie o servidor para aplicar a nova porta', 'warning');
          }
        } catch(err) { showToast(err.message, 'error'); }
      });
    }
    var restartBtn = document.getElementById('server-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', function() {
        if (!confirm('Reiniciar o servidor? Todos os usuários serão desconectados temporariamente.')) return;
        API.post('/admin/server/restart').then(function() {
          showToast('Servidor reiniciando... Aguarde.', 'warning');
          setTimeout(function() { location.reload(); }, 3000);
        }).catch(function(err) { showToast(err.message, 'error'); });
      });
    }
    var shutdownBtn = document.getElementById('server-shutdown');
    if (shutdownBtn) {
      shutdownBtn.addEventListener('click', function() {
        if (!confirm('DESLIGAR o servidor? Todos os usuários perderão acesso.')) return;
        API.post('/admin/server/shutdown').then(function() {
          showToast('Servidor desligando...', 'warning');
          document.getElementById('app').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--text-muted)"><div style="text-align:center"><h2>Servidor Desligado</h2><p>O servidor foi encerrado. Execute start.bat para reiniciar.</p></div></div>';
        }).catch(function(err) { showToast(err.message, 'error'); });
      });
    }
  }
}

// Initialize
window.app = new App();
