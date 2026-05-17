"use strict";

var App = /*#__PURE__*/function () {
  function App() {
    this.user = null;
    this.currentView = null;
    this.currentParams = null;
    this.history = [];
    this.forwardHistory = [];
    this.drives = [];
    this.currentDriveId = null;
    this.currentPath = '';
    this.init();
  }

  var _proto = App.prototype;

  _proto.init = function init() {
    var self = this;
    API.get('/auth/status').then(function (status) {
      if (status && status.setupComplete === false) {
        self.navigate('setup');
        return;
      }
      if (!API.token) {
        self.navigate('login', null, true);
        return;
      }
      API.get('/auth/me').then(function (user) {
        if (user) {
          self.user = user;
          self.navigate('desktop', null, true);
        } else {
          self.navigate('login', null, true);
        }
      }).catch(function () {
        self.navigate('login', null, true);
      });
    });
  };

  _proto.navigate = function navigate(view, params, isBack) {
    var self = this;
    var appEl = document.getElementById('app');

    var paramsChanged = JSON.stringify(this.currentParams) !== JSON.stringify(params);
    if (!isBack && this.currentView && (this.currentView !== view || paramsChanged) && this.currentView !== 'login' && this.currentView !== 'setup') {
      this.history.push({ view: this.currentView, params: this.currentParams });
      this.forwardHistory = [];
    }

    if (view === 'setup' || view === 'login') {
      this.currentView = view;
      this.currentParams = params;
      appEl.innerHTML = (view === 'setup' ? renderSetup() : renderLogin());
      (view === 'setup' ? this.bindSetup() : this.bindLogin());
      return;
    }

    var desktopView = document.querySelector('.desktop-view');
    if (!desktopView) {
      this.currentView = view;
      this.currentParams = params;
      this.showDesktop(view !== 'desktop' ? view : null, params);
      return;
    }

    this.currentView = view;
    this.currentParams = params;

    if (view === 'desktop') {
      var overlay = document.querySelector('.app-window-overlay');
      if (overlay) overlay.remove();
      this.bindDock('home');
      return;
    }

    var windowContent = '';
    if (view === 'explorer') {
      windowContent = renderExplorer(this.user);
    } else if (view === 'speedtest') {
      windowContent = renderSpeedTestView();
    } else if (view === 'cameras') {
      windowContent = renderCamerasView();
    } else if (view === 'admin') {
      var role = (getUserRole() || '').toLowerCase();
      var isAdmin = role === 'admin';
      var isMaster = role === 'master';
      var isPrivileged = isAdmin || isMaster;
      
      var tabsHtml = '';
      
      if (isPrivileged) {
        tabsHtml += '<button class="config-tab active" data-tab="drives" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Drives</button>';
      }
      
      // We always want Users and Security to be visible
      tabsHtml += '<button class="config-tab' + (!isPrivileged ? ' active' : '') + '" data-tab="security" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Segurança</button>';
      tabsHtml += '<button class="config-tab" data-tab="users" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Usuários</button>';
      
      if (isPrivileged) {
        tabsHtml += '<button class="config-tab" data-tab="apps" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Apps Instalados</button>';
      }

      if (isAdmin) {
        tabsHtml += '<button class="config-tab" data-tab="sessions" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Conectados</button>' +
          '<button class="config-tab" data-tab="server" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Servidor</button>' +
          '<button class="config-tab" data-tab="cameras" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Câmeras</button>' +
          '<button class="config-tab" data-tab="logs" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap">Logs</button>';
      }
      windowContent = '<div class="admin-page-view">' +
        '<div class="admin-header" style="background:var(--bg-secondary);padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="color:var(--accent);font-size:24px">' + Icons.settings + '</div>' +
        '<div>' +
        '<div style="font-size:18px;font-weight:700">Configurações do Sistema</div>' +
        '<div style="font-size:12px;color:var(--text-secondary)">' + (isPrivileged ? 'Gerencie drives, usuários e segurança' : 'Gerencie sua segurança e 2FA') + '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="config-tabs" style="background:var(--bg-secondary);padding:0 24px;border-bottom:1px solid var(--border);display:flex;gap:20px;overflow-x:auto">' +
        tabsHtml +
        '</div>' +
        '<div class="admin-content" id="config-body" style="flex:1;overflow-y:auto;padding:24px">' +
        '<div class="loading"><div class="spinner"></div></div>' +
        '</div>' +
        '</div>';
    } else if (view === 'appstore') {
      windowContent = '<div class="appstore-view" style="display:flex;flex-direction:column;height:100%">' +
        '<div class="appstore-header" style="background:var(--bg-secondary);padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="color:var(--accent-blue);font-size:24px">' + Icons.appstore + '</div>' +
        '<div>' +
        '<div style="font-size:18px;font-weight:700">App Store</div>' +
        '<div style="font-size:12px;color:var(--text-secondary)">Instale novos aplicativos no seu servidor</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="appstore-content" id="appstore-body" style="flex:1;overflow-y:auto;padding:24px">' +
        '<div class="loading"><div class="spinner"></div></div>' +
        '</div>' +
        '</div>';
    } else if (view === 'browser') {
      windowContent = renderBrowserView();
    } else {
      var appInfo = (this.apps || []).find(function (a) { return a.id === view; });
      if (appInfo) {
        if (appInfo.newTabOnly && appInfo.url) {
          window.open(appInfo.url, '_blank');
          return;
        }
        windowContent = renderGenericAppView(appInfo);
      }
    }

    var overlay = document.querySelector('.app-window-overlay');
    if (!overlay) {
      var div = document.createElement('div');
      div.className = 'app-window-overlay';
      div.innerHTML = renderAppWindow(windowContent);
      desktopView.appendChild(div);
      overlay = div;
    } else {
      var windowContentArea = overlay.querySelector('.app-window-content');
      if (windowContentArea) {
        windowContentArea.innerHTML = windowContent;
      } else {
        overlay.innerHTML = renderAppWindow(windowContent);
      }
    }

    // Bindings
    if (view === 'explorer') {
      this.bindExplorer(params ? params.driveId : null, params ? params.subpath : '');
      this.bindDock('files');
    } else if (view === 'speedtest') {
      this.bindDock('files');
    } else if (view === 'cameras') {
      this.bindCameras();
      this.bindDock('files');
    } else if (view === 'admin') {
      var role = (getUserRole() || '').toLowerCase();
      var isAdmin = role === 'admin';
      var isMaster = role === 'master';
      var isPrivileged = isAdmin || isMaster;
      this.bindConfig();
      // Default to drives for admins/masters, but always security for common users
      this.loadConfigTab(isPrivileged ? 'drives' : 'security');
      this.bindDock('settings');
    } else if (view === 'appstore') {
      this.bindAppStore();
      this.bindDock('store');
    } else if (view === 'browser') {
      this.bindBrowser();
      this.bindDock('home');
    }

    var btnClose = document.getElementById('btn-window-close');
    if (btnClose) btnClose.onclick = function () { self.navigate('desktop'); };
  };

  _proto.back = function back() {
    var last = this.history.pop();
    if (last) {
      this.forwardHistory.push({ view: this.currentView, params: this.currentParams });
      this.navigate(last.view, last.params, true);
    } else {
      this.navigate('desktop', null, true);
    }
  };

  _proto.forward = function forward() {
    var next = this.forwardHistory.pop();
    if (next) {
      this.history.push({ view: this.currentView, params: this.currentParams });
      this.navigate(next.view, next.params, true);
    }
  };

  // --- Auth Bindings ---
  _proto.bindLogin = function bindLogin() {
    var self = this;
    var form = document.getElementById('login-form');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      var user = document.getElementById('login-user').value.trim();
      var pass = document.getElementById('login-pass').value;
      var errEl = document.getElementById('auth-error');
      var btn = form.querySelector('button[type=submit]');

      btn.disabled = true;
      btn.textContent = 'Entrando...';

      API.post('/auth/login', { username: user, password: pass }).then(function (res) {
        console.log('[Auth] Resposta do servidor:', res);
        if (res.twoFactorRequired) {
          console.log('[Auth] Redirecionando para Verificação 2FA');
          document.getElementById('app').innerHTML = render2FA();
          self.bind2FA(res.tempToken);
          return;
        }

        if (res.twoFactorSetupRequired) {
          console.log('[Auth] Redirecionando para Setup 2FA Obrigatório');
          if (res.user) self.user = res.user;
          self.force2FASetup(res.tempToken);
          return;
        }
        if (res && res.token) {
          console.log('[Auth] Login Direto Sucesso');
          API.setToken(res.token);
          self.user = res.user;
          self.navigate('desktop');
        }
      }).catch(function (err) {
        errEl.textContent = err.message;
        errEl.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Entrar';
      });
    };

    var btnForgot = document.getElementById('btn-forgot-pass');
    if (btnForgot) {
      btnForgot.onclick = function() {
        document.getElementById('app').innerHTML = renderResetPassword();
        self.bindResetPassword();
      };
    }
  };

  _proto.bind2FA = function bind2FA(tempToken) {
    var self = this;
    var form = document.getElementById('2fa-form');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      var code = document.getElementById('login-2fa-code').value.trim();
      var errEl = document.getElementById('auth-error');
      var btn = form.querySelector('button[type=submit]');

      btn.disabled = true;
      btn.textContent = 'Verificando...';

      API.post('/auth/2fa/verify', { token: tempToken, code: code }).then(function (res) {
        if (res && res.token) {
          API.setToken(res.token);
          self.user = res.user;
          self.navigate('desktop');
        }
      }).catch(function (err) {
        errEl.textContent = err.message;
        errEl.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Verificar e Entrar';
      });
    };
  };

  _proto.bindResetPassword = function bindResetPassword() {
    var self = this;
    var form = document.getElementById('reset-form');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      var user = document.getElementById('reset-user').value.trim();
      var code = document.getElementById('reset-code').value.trim();
      var newPass = document.getElementById('reset-new-pass').value;
      var errEl = document.getElementById('auth-error');
      var btn = form.querySelector('button[type=submit]');

      btn.disabled = true;
      btn.textContent = 'Processando...';

      API.post('/auth/reset-password', { username: user, recoveryCode: code, newPassword: newPass }).then(function (res) {
        showToast('Senha alterada com sucesso!', 'success');
        setTimeout(function() { window.location.reload(); }, 1500);
      }).catch(function (err) {
        errEl.textContent = err.message;
        errEl.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Redefinir Senha';
      });
    };
  };

  _proto.bindResetPassword = function () {
    var self = this;
    var form = document.getElementById('reset-form');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      var data = {
        username: document.getElementById('reset-user').value,
        recoveryCode: document.getElementById('reset-code').value,
        newPassword: document.getElementById('reset-new-pass').value
      };
      API.post('/auth/2fa/reset-password', data).then(function () {
        showToast('Senha redefinida com sucesso!', 'success');
        self.navigate('login');
      }).catch(function (err) {
        var errEl = document.getElementById('auth-error');
        if (errEl) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
        }
      });
    };
  };

  _proto.bindSetup = function bindSetup() {
    var self = this;
    var form = document.getElementById('setup-form');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      var user = document.getElementById('setup-user').value.trim();
      var pass = document.getElementById('setup-pass').value;
      var pass2 = document.getElementById('setup-pass2').value;
      var errEl = document.getElementById('auth-error');

      if (pass !== pass2) {
        errEl.textContent = 'Senhas não conferem';
        errEl.classList.add('visible');
        return;
      }

      API.post('/auth/setup', { username: user, password: pass }).then(function (res) {
        if (res && res.token) {
          API.setToken(res.token);
          self.user = res.user;
          self.navigate('desktop');
        }
      }).catch(function (err) {
        errEl.textContent = err.message;
        errEl.classList.add('visible');
      });
    };
  };

  // --- Desktop & Dock ---
  _proto.showDesktop = function showDesktop(initialApp, params) {
    var self = this;
    var appEl = document.getElementById('app');

    // SECURITY: Force password change if required
    console.log('[Security] Checking force password change:', this.user ? this.user.mustChangePassword : 'no user');
    if (this.user && (this.user.mustChangePassword === true || this.user.mustChangePassword === 'true')) {
      console.log('[Security] Force password change TRIGGERED');
      this.showForcedPasswordChange();
      return;
    }

    API.get('/apps/installed').then(function (apps) {
      self.apps = apps || [];
      var role = (self.user ? self.user.role : '').toLowerCase();
      var isAdmin = role === 'admin';

      // Only force Settings icon for Admins if it's not in the list.
      // Other users (Master/User) will only see it if it's returned by the backend based on their permissions.
      if (isAdmin && !self.apps.find(function (a) { return a.id === 'settings'; })) {
        self.apps.push({ id: 'settings', name: 'Configurações', icon: 'settings', description: 'Configurações do sistema' });
      }

      appEl.innerHTML = renderDesktop(self.apps, self.user);
      self.bindDock('home');
      self.bindDesktopEvents();
      self.startStatsUpdate();

      if (initialApp) {
        self.navigate(initialApp, params, true);
      }
    }).catch(function (err) {
      console.error('Falha ao carregar apps:', err);
      appEl.innerHTML = renderDesktop([], self.user);
      self.bindDock('home');
    });
  };

  _proto.bindDesktopEvents = function bindDesktopEvents() {
    var self = this;
    var appEl = document.getElementById('app');
    if (appEl._desktopBound) return;
    appEl._desktopBound = true;

    appEl.addEventListener('click', function (e) {
      if (e.target.id === 'btn-personalize') {
        self.showWallpaperMenu();
        return;
      }
      var icon = e.target.closest('.desktop-icon');
      if (!icon) return;

      e.preventDefault();
      e.stopPropagation();

      var appId = icon.getAttribute('data-app-id');
      if (icon.id === 'icon-explorer') appId = 'explorer';

      // Force navigation for apps to avoid accidental file previews
      if (appId === 'explorer') self.navigate('explorer');
      else if (appId === 'speedtest') self.navigate('speedtest');
      else if (appId === 'cameras') self.navigate('cameras');
      else if (appId === 'settings') self.navigate('admin');
      else if (appId === 'plex') window.open('http://' + window.location.hostname + ':32400', '_blank');
      else if (appId === 'homeassistant') window.open('http://' + window.location.hostname + ':8123', '_blank');
      else if (appId === 'jellyfin') window.open('http://' + window.location.hostname + ':8096', '_blank');
      else if (appId) self.navigate(appId);
    });

    document.addEventListener('input', function (e) {
      if (e.target.id === 'desktop-search-input') {
        var q = e.target.value.toLowerCase();
        document.querySelectorAll('.desktop-icon').forEach(function (icon) {
          var name = icon.querySelector('span').textContent.toLowerCase();
          icon.style.display = name.indexOf(q) > -1 ? 'flex' : 'none';
        });
      }
    });
  };

  _proto.showForcedPasswordChange = function showForcedPasswordChange() {
    var appEl = document.getElementById('app');
    appEl.innerHTML = renderForcedPasswordChange(this.user);
    this.bindForcedPasswordChange();
  };

  _proto.bindForcedPasswordChange = function bindForcedPasswordChange() {
    var self = this;
    var form = document.getElementById('force-change-form');
    if (!form) return;

    form.onsubmit = function (e) {
      e.preventDefault();
      var oldPass = document.getElementById('force-old-pass').value;
      var newPass = document.getElementById('force-new-pass').value;
      var confirmPass = document.getElementById('force-confirm-pass').value;
      var errEl = document.getElementById('auth-error');

      if (newPass.length < 4) {
        errEl.textContent = 'A nova senha deve ter no mínimo 4 caracteres';
        errEl.classList.add('visible');
        return;
      }

      if (newPass !== confirmPass) {
        errEl.textContent = 'As novas senhas não conferem';
        errEl.classList.add('visible');
        return;
      }

      if (newPass === oldPass) {
        errEl.textContent = 'A nova senha deve ser diferente da atual';
        errEl.classList.add('visible');
        return;
      }

      var btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Atualizando...';

      // Use the admin update API to change password
      API.put('/admin/users/' + self.user.id, {
        password: newPass,
        oldPassword: oldPass
      }).then(function (res) {
        showToast('Senha atualizada com sucesso!', 'success');
        // Update local user state
        self.user.mustChangePassword = false;
        // Refresh UI
        self.showDesktop();
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Atualizar e Entrar';
        errEl.textContent = err.message;
        errEl.classList.add('visible');
      });
    };
  };

  _proto.bindDock = function bindDock(active) {
    var self = this;
    document.querySelectorAll('.dock-item').forEach(function (el) {
      var view = el.getAttribute('data-view');
      if (view === active) el.classList.add('active');
      else el.classList.remove('active');

      var newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);

      newEl.addEventListener('click', function () {
        if (view === 'home') self.navigate('desktop');
        else if (view === 'files') self.navigate('explorer');
        else if (view === 'store') self.navigate('appstore');
        else if (view === 'settings') self.navigate('admin');
        else if (view === 'logout') {
          API.clearToken();
          self.navigate('login');
        }
      });
    });
  };

  _proto.showAppStore = function showAppStore() {
    var self = this;
    var appEl = document.getElementById('app');
    appEl.innerHTML = renderAppStore([], []);
    this.bindDock('store');

    Promise.all([API.get('/apps/list'), API.get('/apps/installed')]).then(function (res) {
      if (self.currentView === 'appstore') {
        appEl.innerHTML = renderAppStore(res[0] || [], (res[1] || []).map(function (a) { return a.id; }));
        self.bindDock('store');
        self.bindAppStoreEvents();
        var btnClose = document.getElementById('btn-store-close');
        if (btnClose) btnClose.onclick = function () { self.back(); };
      }
    });
  };

  _proto.bindAppStoreEvents = function bindAppStoreEvents() {
    var self = this;
    document.querySelectorAll('.btn-install').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var appId = this.getAttribute('data-app-id');
        this.disabled = true;
        this.textContent = 'Instalando...';
        var currentBtn = this;
        API.post('/apps/install/' + appId).then(function () {
          showToast('App instalado!', 'success');
          currentBtn.textContent = 'Instalado';
          currentBtn.classList.add('installed');
        }).catch(function (e) {
          showToast('Erro: ' + e.message, 'error');
          currentBtn.disabled = false;
          currentBtn.textContent = 'Instalar';
        });
      });
    });
  };

  // --- Config Logic ---
  _proto.bindConfig = function bindConfig() {
    var self = this;
    document.querySelectorAll('.config-tab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('.config-tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        self.loadConfigTab(this.getAttribute('data-tab'));
      };
    });
  };

  _proto.loadConfigTab = function loadConfigTab(tab) {
    var self = this;
    var body = document.getElementById('config-body');
    if (!body) return;
    body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    if (tab === 'security') {
      API.get('/auth/me').then(function(u) {
        self.user = u;
        body.innerHTML = renderSecurityConfig(self.user);
        self.bind2FAEvents();
      }).catch(function() {
        body.innerHTML = renderSecurityConfig(self.user);
        self.bind2FAEvents();
      });
    } else if (tab === 'drives') {
      Promise.all([API.get('/admin/drives'), API.get('/admin/users')]).then(function (results) {
        var drives = results[0] || [];
        var users = results[1] || [];
        var role = self.user ? self.user.role : '';
        var isAdmin = role === 'admin';

        body.innerHTML = renderDrivesConfig(drives, users, isAdmin);
        self.bindBrowse();

        // Logic for each card
        document.querySelectorAll('.drive-cfg-card').forEach(function (card) {
          self.bindPermissionLogic(card);
          self.bindUserSearch(card);

          card.querySelectorAll('.color-option').forEach(function (opt) {
            opt.onclick = function () {
              card.querySelectorAll('.color-option').forEach(function (x) { x.classList.remove('selected'); });
              this.classList.add('selected');
            };
          });
        });

        // Save logic for each card
        document.querySelectorAll('.drive-save-btn').forEach(function (btn) {
          btn.onclick = function () {
            var card = this.closest('.drive-cfg-card');
            var id = card.getAttribute('data-drive-id');
            var byUser = {};
            card.querySelectorAll('.card-user-row').forEach(function (row) {
              var uid = row.getAttribute('data-user-id');
              var manageEl = row.querySelector('.p-user-manage');
              byUser[uid] = {
                manage: manageEl ? manageEl.checked : false,
                read: row.querySelector('.p-user-read').checked,
                upload: row.querySelector('.p-user-upload').checked,
                delete: row.querySelector('.p-user-delete').checked
              };
            });

            var data = {
              name: card.querySelector('.cfg-drive-name').value,
              path: card.querySelector('.cfg-drive-path').value,
              color: card.querySelector('.color-option.selected')?.getAttribute('data-color') || '#0078d4',
              permissions: {
                byUser: byUser
              }
            };

            // Only add group permissions if they are present in the DOM (Admin only)
            if (card.querySelector('.p-m-read')) {
              data.permissions.master = {
                manage: !!card.querySelector('.p-m-manage')?.checked,
                read: card.querySelector('.p-m-read').checked,
                upload: card.querySelector('.p-m-upload').checked,
                delete: card.querySelector('.p-m-delete').checked
              };
            }
            if (card.querySelector('.p-u-read')) {
              data.permissions.user = {
                read: card.querySelector('.p-u-read').checked,
                upload: card.querySelector('.p-u-upload').checked,
                delete: card.querySelector('.p-u-delete').checked
              };
            }

            API.put('/admin/drives/' + id, data).then(function () {
              showToast('Drive atualizado!', 'success');
              self.loadConfigTab('drives');
            }).catch(function (e) { showToast(e.message, 'error'); });
          };
        });

        // Add Drive Card logic
        var btnAddDrive = document.getElementById('btn-add-drive-card');
        if (btnAddDrive) {
          btnAddDrive.onclick = function () {
            API.get('/admin/users').then(function (users) {
              var modal = document.getElementById('new-drive-modal');
              var container = document.getElementById('new-drive-form-container');
              var isAdmin = self.user && self.user.role === 'admin';

              container.innerHTML = renderNewDriveForm(users, isAdmin);
              modal.style.display = 'flex';

              // Apply checkbox dependency logic (Leitura disables others)
              self.bindPermissionLogic(container);
              self.bindUserSearch(container);

              document.getElementById('close-new-drive-modal').onclick = function () { modal.style.display = 'none'; };
              document.getElementById('btn-browse-new').onclick = function () {
                self.bindBrowseForElement('new-drive-path', 'btn-browse-new');
              };

              document.getElementById('new-drive-colors').querySelectorAll('.color-option').forEach(function (opt) {
                opt.onclick = function () {
                  this.parentNode.querySelectorAll('.color-option').forEach(function (x) { x.classList.remove('selected'); });
                  this.classList.add('selected');
                };
              });


              document.getElementById('save-new-drive').onclick = function () {
                var byUser = {};
                document.querySelectorAll('#new-drive-permissions .card-user-row').forEach(function (row) {
                  var uid = row.getAttribute('data-user-id');
                  byUser[uid] = {
                    read: row.querySelector('.p-user-read').checked,
                    upload: row.querySelector('.p-user-upload').checked,
                    delete: row.querySelector('.p-user-delete').checked,
                    manage: row.querySelector('.p-user-manage') ? row.querySelector('.p-user-manage').checked : false
                  };
                });

                var data = {
                  name: document.getElementById('new-drive-name').value,
                  path: document.getElementById('new-drive-path').value,
                  color: document.getElementById('new-drive-colors').querySelector('.color-option.selected')?.getAttribute('data-color') || '#0078d4',
                  permissions: {
                    master: { read: true, upload: true, delete: true },
                    user: { read: true, upload: false, delete: false },
                    byUser: byUser
                  }
                };

                // Add group permissions if present (Admin only)
                var mRead = document.querySelector('#new-drive-group-perms .p-m-read');
                if (mRead) {
                  data.permissions.master = {
                    manage: !!document.querySelector('#new-drive-group-perms .p-m-manage')?.checked,
                    read: mRead.checked,
                    upload: document.querySelector('#new-drive-group-perms .p-m-upload').checked,
                    delete: document.querySelector('#new-drive-group-perms .p-m-delete').checked
                  };
                }
                var uRead = document.querySelector('#new-drive-group-perms .p-u-read');
                if (uRead) {
                  data.permissions.user = {
                    read: uRead.checked,
                    upload: document.querySelector('#new-drive-group-perms .p-u-upload').checked,
                    delete: document.querySelector('#new-drive-group-perms .p-u-delete').checked
                  };
                }

                if (!data.name || !data.path) return showToast('Preencha nome e caminho', 'warning');
                API.post('/admin/drives', data).then(function () {
                  showToast('Drive adicionado!', 'success');
                  modal.style.display = 'none';
                  self.loadConfigTab('drives');
                }).catch(function (e) { showToast(e.message, 'error'); });
              };
            });
          };
        }

        // Bind browse path for existing cards
        document.querySelectorAll('.btn-browse-path').forEach(function (btn) {
          btn.onclick = function () {
            var card = this.closest('.drive-cfg-card');
            var pathInput = card.querySelector('.cfg-drive-path');
            var btnId = 'temp-btn-' + Date.now();
            this.id = btnId;
            self.bindBrowseForElement(pathInput.className, btnId);
          };
        });

        // Bind card expansion
        self.bindCardExpansion(body);

        // Bind permission logic (Reading required for Writing/Deleting)
        self.bindPermissionLogic(body);

        // Delete drive
        document.querySelectorAll('.cfg-del-drive').forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            if (confirm('Remover drive?')) {
              API.del('/admin/drives/' + id).then(function () { self.loadConfigTab('drives'); });
            }
          };
        });

        // Bind Close Card button
        document.querySelectorAll('.btn-close-card').forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var card = this.closest('.config-card');
            if (card) card.classList.remove('active');
          };
        });
      }).catch(function (e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar dados: ' + e.message + '</div>'; });
    } else if (tab === 'users') {
      API.get('/admin/users').then(function (users) {
        body.innerHTML = renderUsersConfig(users || []);

        // Save user from expanded card
        document.querySelectorAll('.user-save-btn').forEach(function (btn) {
          btn.onclick = function () {
            var card = this.closest('.config-card');
            var id = this.getAttribute('data-id');
            var data = {
              username: card.querySelector('.cfg-edit-name').value,
              password: card.querySelector('.cfg-edit-pass').value,
              oldPassword: card.querySelector('.cfg-edit-old-pass')?.value || '',
              role: card.querySelector('.cfg-edit-role').value
            };
            API.put('/admin/users/' + id, data).then(function () {
              showToast('Usuário atualizado!', 'success');
              self.loadConfigTab('users');
            }).catch(function (e) { showToast(e.message, 'error'); });
          };
        });

        // Delete user
        document.querySelectorAll('.cfg-del-user').forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            if (confirm('Remover usuário?')) {
              API.del('/admin/users/' + id).then(function () { self.loadConfigTab('users'); });
            }
          };
        });

        // Add User Modal logic
        var addCard = document.getElementById('btn-add-user-card');
        var modal = document.getElementById('new-user-modal');
        if (addCard && modal) {
          addCard.onclick = function () { modal.style.display = 'flex'; };
          document.getElementById('close-new-user-modal').onclick = function () { modal.style.display = 'none'; };
          document.getElementById('btn-save-new-user').onclick = function () {
            var data = {
              username: document.getElementById('new-user-name').value,
              password: document.getElementById('new-user-pass').value,
              role: document.getElementById('new-user-role').value
            };
            if (!data.username || !data.password) return showToast('Preencha nome e senha', 'warning');
            API.post('/admin/users', data).then(function () {
              showToast('Usuário criado!', 'success');
              self.loadConfigTab('users');
            }).catch(function (e) { showToast(e.message, 'error'); });
          };
        }

        // Bind card expansion
        self.bindCardExpansion(body);
      }).catch(function (e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar usuários: ' + e.message + '</div>'; });
    } else if (tab === 'apps') {
      API.get('/apps/admin/installed-with-permissions').then(function (apps) {
        var role = self.user ? self.user.role : '';
        var isAdmin = role === 'admin';
        body.innerHTML = renderAppsConfig(apps || [], isAdmin);

        // Bind user search for each app card
        document.querySelectorAll('.app-cfg-card').forEach(function (card) {
          self.bindUserSearch(card);
        });

        // Bind card expansion
        self.bindCardExpansion(body);

        // Bind Close Card button
        document.querySelectorAll('.btn-close-card').forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var card = this.closest('.config-card');
            if (card) card.classList.remove('active');
          };
        });

        // Bind group-specific toggles
        document.querySelectorAll('.app-role-toggle').forEach(function (toggle) {
          toggle.onchange = function () {
            var appId = this.getAttribute('data-app-id');
            var role = this.getAttribute('data-role');
            var appData = apps.find(function (a) { return a.id === appId; });
            if (!appData) return;

            var newPerms = appData.permissions || { byRole: {} };
            newPerms.byRole[role] = this.checked;

            API.put('/apps/permissions/' + appId, newPerms).then(function () {
              showToast('Permissão atualizada!', 'success');
            }).catch(function (e) {
              showToast('Erro: ' + e.message, 'error');
              toggle.checked = !toggle.checked;
            });
          };
        });

        // Bind user-specific toggles
        document.querySelectorAll('.app-user-toggle').forEach(function (toggle) {
          toggle.onchange = function () {
            var appId = this.getAttribute('data-app-id');
            var userId = this.getAttribute('data-user-id');
            var hasAccess = this.checked;

            // Master Restriction Frontend Check
            if (self.user && self.user.role === 'master') {
              var appData = apps.find(function (a) { return a.id === appId; });
              var targetUser = appData?.users?.find(function (u) { return u.id === userId; });

              if (targetUser && (targetUser.role === 'master' || targetUser.role === 'admin')) {
                showToast('Ação não permitida: Você não pode alterar o acesso de outros Masters ou Admins', 'warning');
                this.checked = !this.checked;
                return;
              }
            }

            API.put('/apps/user-access/' + appId + '/' + userId, { hasAccess: hasAccess }).then(function () {
              showToast('Acesso do usuário atualizado!', 'success');
            }).catch(function (e) {
              showToast(e.message, 'error');
              toggle.checked = !toggle.checked;
            });
          };
        });

        // Bind Uninstall App
        document.querySelectorAll('.btn-uninstall-app').forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var appId = this.getAttribute('data-app-id');
            if (confirm('Tem certeza que deseja desinstalar este aplicativo? Isso removerá o acesso de todos os usuários.')) {
              API.post('/apps/uninstall/' + appId).then(function () {
                showToast('Aplicativo desinstalado com sucesso!', 'success');
                self.loadConfigTab('apps'); // Refresh
                self.showDesktop(); // Update desktop icons
              }).catch(function (e) { showToast(e.message, 'error'); });
            }
          };
        });

        // Bind Close Card button
        document.querySelectorAll('.btn-close-card').forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var card = this.closest('.config-card');
            if (card) card.classList.remove('active');
          };
        });
      }).catch(function (e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar apps: ' + e.message + '</div>'; });
    } else if (tab === 'sessions') {
      API.get('/admin/sessions').then(function (sessions) {
        body.innerHTML = renderSessionsConfig(sessions || []);
        document.querySelectorAll('.cfg-kick-session').forEach(function (btn) {
          btn.onclick = function () {
            var id = this.getAttribute('data-id');
            API.del('/admin/sessions/' + id).then(function () { self.loadConfigTab('sessions'); });
          };
        });
      }).catch(function (e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar sessões: ' + e.message + '</div>'; });
    } else if (tab === 'server') {
      API.get('/admin/server').then(function (cfg) {
        body.innerHTML = renderServerConfig(cfg || {});

        var updateIP = function () {
          var el = document.getElementById('dns-public-ip');
          if (el) el.textContent = 'IP Atual: ...';
          API.get('/admin/server/ip').then(function (res) {
            if (el) el.textContent = 'IP Atual: ' + (res.ip || 'Erro');
          });
        };
        updateIP();

        // Bind IP Refresh
        var btnIpRefresh = document.getElementById('dns-ip-refresh');
        if (btnIpRefresh) btnIpRefresh.onclick = updateIP;

        // Startup status
        API.get('/admin/server/startup').then(function (res) {
          var toggle = document.getElementById('cfg-server-startup');
          if (toggle) toggle.checked = !!res.enabled;
        });

        // Toggle Startup
        var toggleStartup = document.getElementById('cfg-server-startup');
        if (toggleStartup) {
          toggleStartup.onchange = function () {
            API.post('/admin/server/startup', { enabled: this.checked }).then(function () {
              showToast('Configuração de inicialização alterada!', 'success');
            });
          };
        }

        // Save Server Name/Port
        var btnSaveServer = document.getElementById('server-config-save');
        if (btnSaveServer) {
          btnSaveServer.onclick = function () {
            var data = {
              serverName: document.getElementById('cfg-server-name').value,
              port: document.getElementById('cfg-server-port').value
            };
            API.put('/admin/server', data).then(function (res) {
              showToast('Configurações salvas!', 'success');
            });
          };
        }

        // Save DNS intervals
        var btnSaveDnsIntervals = document.getElementById('dns-auto-save');
        if (btnSaveDnsIntervals) {
          btnSaveDnsIntervals.onclick = function () {
            var data = {
              dnsAutoRefresh: document.getElementById('cfg-dns-auto').checked,
              dnsInterval: document.getElementById('cfg-dns-interval').value,
              dnsCheckInterval: document.getElementById('cfg-dns-check-interval').value
            };
            API.put('/admin/server', data).then(function () {
              showToast('Intervalos salvos!', 'success');
            });
          };
        }

        // Save/Edit DNS Record
        var btnSaveDns = document.getElementById('dns-form-save');
        if (btnSaveDns) {
          btnSaveDns.onclick = function () {
            var index = parseInt(document.getElementById('cfg-dns-index').value);
            var records = cfg.dnsRecords || [];
            var newRecord = {
              token: document.getElementById('cfg-dns-token').value,
              domains: document.getElementById('cfg-dns-domains').value,
              enabled: document.getElementById('cfg-dns-enabled').checked,
              provider: 'duckdns'
            };

            if (index === -1) records.push(newRecord);
            else records[index] = newRecord;

            API.put('/admin/server', { dnsRecords: records }).then(function () {
              showToast('Domínio salvo!', 'success');
              self.loadConfigTab('server');
            });
          };
        }

        // Test All DNS
        var btnTestAll = document.getElementById('server-dns-test');
        if (btnTestAll) {
          btnTestAll.onclick = function () {
            btnTestAll.disabled = true;
            API.post('/admin/server/ddns/test').then(function () {
              showToast('Sincronização iniciada!', 'success');
              btnTestAll.disabled = false;
              setTimeout(function () { self.loadConfigTab('server'); }, 2000);
            });
          };
        }

        // Row actions (Edit, Delete, Test, Toggle)
        document.querySelectorAll('.cfg-edit-dns').forEach(function (btn) {
          btn.onclick = function () {
            var idx = parseInt(this.getAttribute('data-index'));
            var r = cfg.dnsRecords[idx];
            document.getElementById('cfg-dns-index').value = idx;
            document.getElementById('cfg-dns-token').value = r.token;
            document.getElementById('cfg-dns-domains').value = r.domains;
            document.getElementById('cfg-dns-enabled').checked = r.enabled;
            document.getElementById('dns-form-title').textContent = 'Editar Domínio';
          };
        });

        document.querySelectorAll('.cfg-del-dns').forEach(function (btn) {
          btn.onclick = function () {
            var idx = parseInt(this.getAttribute('data-index'));
            if (confirm('Remover este domínio?')) {
              var records = cfg.dnsRecords || [];
              records.splice(idx, 1);
              API.put('/admin/server', { dnsRecords: records }).then(function () {
                self.loadConfigTab('server');
              });
            }
          };
        });

        document.querySelectorAll('.cfg-test-dns').forEach(function (btn) {
          btn.onclick = function () {
            var idx = parseInt(this.getAttribute('data-index'));
            API.post('/admin/server/ddns/test', { index: idx }).then(function () {
              showToast('Teste iniciado!', 'success');
              setTimeout(function () { self.loadConfigTab('server'); }, 2000);
            });
          };
        });

        document.querySelectorAll('.cfg-toggle-dns').forEach(function (el) {
          el.onchange = function () {
            var idx = parseInt(this.getAttribute('data-index'));
            var records = cfg.dnsRecords || [];
            records[idx].enabled = this.checked;
            API.put('/admin/server', { dnsRecords: records });
          };
        });

        // Handle Countdowns (Relative)
        var updateSec = cfg.nextUpdateSeconds || 0;
        var checkSec = cfg.nextCheckSeconds || 0;

        if (self._ddnsTimer) clearInterval(self._ddnsTimer);
        var updateCountdowns = function () {
          var updateEl = document.getElementById('dns-update-countdown');
          var checkEl = document.getElementById('dns-check-countdown');

          if (updateEl) {
            if (updateSec > 0) {
              var m = Math.floor(updateSec / 60);
              var s = updateSec % 60;
              updateEl.textContent = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
              updateSec--;
            } else {
              updateEl.textContent = 'Atualizando...';
            }
          }
          if (checkEl) {
            if (checkSec > 0) {
              var m = Math.floor(checkSec / 60);
              var s = checkSec % 60;
              checkEl.textContent = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
              checkSec--;
            } else {
              checkEl.textContent = 'Verificando...';
            }
          }
        };
        self._ddnsTimer = setInterval(updateCountdowns, 1000);
        updateCountdowns();

        // Poll for fresh data and refresh list if needed
        var pollDdns = function () {
          var countdownEl = document.getElementById('dns-update-countdown');
          if (countdownEl) {
            API.get('/admin/server').then(function (newCfg) {
              var syncFinished = (checkSec <= 0 && newCfg.nextCheckSeconds > 0) || (updateSec <= 0 && newCfg.nextUpdateSeconds > 0);
              updateSec = newCfg.nextUpdateSeconds || 0;
              checkSec = newCfg.nextCheckSeconds || 0;

              if (syncFinished) {
                // Refresh only the list and IP
                var list = document.getElementById('dns-list');
                if (list) {
                  var tempDiv = document.createElement('div');
                  tempDiv.innerHTML = renderServerConfig(newCfg);
                  list.innerHTML = tempDiv.querySelector('#dns-list').innerHTML;
                }
                var ipEl = document.getElementById('dns-public-ip');
                if (ipEl) ipEl.textContent = 'IP Atual: ' + (newCfg.dnsRecords[0] ? newCfg.dnsRecords[0].lastIp : '...');
              }
            });
          } else {
            clearInterval(self._ddnsPoll);
          }
        };
        if (self._ddnsPoll) clearInterval(self._ddnsPoll);
        self._ddnsPoll = setInterval(pollDdns, 10000); // Poll more frequently for snappier UI

        // Restart/Shutdown with Overlay
        var showOverlay = function (title, msg) {
          var over = document.createElement('div');
          over.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center';
          over.innerHTML = '<div class="spinner" style="margin-bottom:20px"></div><h2 style="margin-bottom:10px">' + title + '</h2><p style="color:var(--text-secondary)">' + msg + '</p>';
          document.body.appendChild(over);
        };

        var btnUpdate = document.getElementById('server-update');
        if (btnUpdate) btnUpdate.onclick = function () {
          if (confirm('Deseja buscar atualizações no repositório Git? O servidor irá reiniciar se houver um novo commit.')) {
            showOverlay('Buscando Atualizações', 'Sincronizando com o repositório Git...');
            API.post('/admin/server/update').then(function (res) {
              if (res.updated) {
                showOverlay('Reiniciando', 'Atualização aplicada com sucesso. O sistema retornará em instantes...');
                setTimeout(function () { location.reload(); }, 10000);
              } else {
                // Remove overlay if no update
                var over = document.querySelector('div[style*="z-index: 9999"]');
                if (over) over.remove();
                showToast(res.message || 'O sistema já está atualizado.', 'info');
              }
            }).catch(function (err) {
              var over = document.querySelector('div[style*="z-index: 9999"]');
              if (over) over.remove();
              showToast('Erro ao atualizar: ' + (err.response?.data?.error || err.message), 'danger');
            });
          }
        };

        var btnRestart = document.getElementById('server-restart');
        if (btnRestart) btnRestart.onclick = function () {
          if (confirm('Reiniciar o servidor?')) {
            showOverlay('Reiniciando Servidor', 'O sistema retornará em alguns segundos...');
            API.post('/admin/server/restart');
            setTimeout(function () { location.reload(); }, 8000);
          }
        };
        var btnShutdown = document.getElementById('server-shutdown');
        if (btnShutdown) btnShutdown.onclick = function () {
          if (confirm('Desligar o servidor?')) {
            showOverlay('Desligando Servidor', 'O sistema foi encerrado. Feche esta janela.');
            API.post('/admin/server/shutdown');
          }
        };
      }).catch(function (e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar servidor: ' + e.message + '</div>'; });
    } else if (tab === 'cameras') {
      API.get('/admin/server').then(function (cfg) {
        body.innerHTML = renderCamerasConfig(cfg || {});
        var btnSave = document.getElementById('cam-config-save');
        if (btnSave) {
          btnSave.onclick = function () {
            var camData = {
              ip: document.getElementById('cfg-cam-ip').value,
              port: document.getElementById('cfg-cam-port').value,
              rtspPort: document.getElementById('cfg-cam-rtsp').value,
              user: document.getElementById('cfg-cam-user').value,
              pass: document.getElementById('cfg-cam-pass').value
            };
            API.put('/admin/server', { camera: camData }).then(function () {
              showToast('Câmeras salvas!', 'success');
            });
          };
        }
      }).catch(function (e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar câmeras: ' + e.message + '</div>'; });
    } else if (tab === 'logs') {
      API.get('/admin/logs').then(function (logs) {
        var html = '<div class="logs-container" style="background:#000;padding:10px;border-radius:4px;font-family:monospace;font-size:12px;height:400px;overflow-y:auto;color:#0f0">';
        logs.reverse().forEach(function (l) {
          html += '<div>[' + l.time + '] [' + l.level + '] ' + escapeHtml(l.msg) + '</div>';
        });
        html += '</div>';
        body.innerHTML = html;
      }).catch(function (e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar logs: ' + e.message + '</div>'; });
    }
  };

  // --- Cameras Logic ---
  _proto.bindCameras = function bindCameras() {
    var self = this;
    var slots = document.querySelectorAll('.cam-slot');
    var canvas = document.getElementById('cam-canvas');
    var noSignal = document.getElementById('cam-no-signal');
    var qualityBtns = document.querySelectorAll('.quality-btn');
    var btnToggleGrid = document.getElementById('btn-toggle-grid');
    var mainPlayer = document.getElementById('cam-main-player');

    var currentCam = 1;
    var currentQuality = '1'; // Default SD
    var currentPlayer = null;
    var gridPlayers = [];

    function stopAll() {
      if (currentPlayer) currentPlayer.destroy();
      currentPlayer = null;
      gridPlayers.forEach(function (p) { if (p) p.destroy(); });
      gridPlayers = [];
    }

    function playCam(id, quality) {
      stopAll();
      currentCam = id;
      if (noSignal) noSignal.style.display = 'none';
      if (canvas) canvas.style.display = 'block';
      if (mainPlayer) mainPlayer.style.display = 'flex';

      var url = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
        window.location.host + '/api/cameras/stream?token=' + API.token +
        '&channel=' + id + '&quality=' + quality;

      try {
        currentPlayer = new JSMpeg.Player(url, { canvas: canvas, autoplay: true });
      } catch (e) { console.error('Player error:', e); }
    }

    function playAll() {
      stopAll();
      if (mainPlayer) mainPlayer.style.display = 'none';

      slots.forEach(function (slot) {
        var id = slot.getAttribute('data-cam');
        var cv = document.createElement('canvas');
        cv.style.width = '100%';
        cv.style.height = '100%';
        cv.style.position = 'absolute';
        cv.style.top = '0';
        cv.style.left = '0';
        slot.appendChild(cv);

        var url = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
          window.location.host + '/api/cameras/stream?token=' + API.token +
          '&channel=' + id + '&quality=1&grid=1';

        try {
          var p = new JSMpeg.Player(url, { canvas: cv, autoplay: true });
          gridPlayers.push(p);
        } catch (e) { console.error('Grid player error:', e); }
      });
    }

    slots.forEach(function (slot) {
      slot.onclick = function () {
        var camId = this.getAttribute('data-cam');
        slots.forEach(function (s) {
          s.style.borderColor = 'rgba(255,255,255,0.1)';
          var c = s.querySelector('canvas');
          if (c) c.remove();
        });
        this.style.borderColor = 'var(--accent-blue)';
        playCam(camId, currentQuality);
      };
    });

    qualityBtns.forEach(function (btn) {
      btn.onclick = function () {
        qualityBtns.forEach(function (b) { b.classList.remove('active'); b.style.background = 'transparent'; });
        this.classList.add('active');
        this.style.background = 'var(--accent-blue)';
        currentQuality = this.getAttribute('data-quality');
        playCam(currentCam, currentQuality);
      };
    });

    if (btnToggleGrid) {
      btnToggleGrid.onclick = function () {
        playAll();
      };
    }
  };

  _proto.bindBrowser = function bindBrowser() {
    var self = this;
    var iframe = document.getElementById('browser-iframe');
    var input = document.getElementById('browser-url');
    var btnGo = document.getElementById('browser-go');
    var btnBack = document.getElementById('browser-back');
    var btnForward = document.getElementById('browser-forward');
    var btnRefresh = document.getElementById('browser-refresh');
    var btnHome = document.getElementById('browser-home');
    var overlay = document.getElementById('browser-error-overlay');
    var btnProxy = document.getElementById('browser-btn-proxy');

    var btnTranslate = document.getElementById('browser-translate');

    if (!iframe || !input) return;

    function navigateTo(url) {
      if (overlay) overlay.style.display = 'none';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.indexOf('.') > -1 && url.indexOf(' ') === -1) {
          url = 'http://' + url;
        } else {
          url = 'http://www.google.com/search?q=' + encodeURIComponent(url) + '&igu=1';
        }
      }

      var isLocal = url.includes('192.168.') || url.includes('10.') || url.includes('172.16.') || url.includes('172.31.') || url.includes('127.0.0.1') || url.includes('localhost');

      // Detect Chinese sites and force auto-translation (only for public sites)
      var isChinese = url.includes('.cn') || url.includes('baidu.com') || url.includes('alibaba.com') || url.includes('taobao.com') || url.includes('aliexpress.com');
      if (isChinese && !isLocal && !url.includes('translate.google.com')) {
        showToast('Site chinês detectado! Traduzindo automaticamente para Português...');
        url = 'https://translate.google.com/translate?sl=zh-CN&tl=pt&u=' + encodeURIComponent(url);
      }

      input.value = url;
      iframe.src = url;
    }

    input.onkeydown = function (e) {
      if (e.key === 'Enter') navigateTo(input.value);
    };

    if (btnTranslate) btnTranslate.onclick = function() {
       var currentUrl = input.value;
       if (!currentUrl || currentUrl.includes('about:blank')) return;
       
       var isLocal = currentUrl.includes('192.168.') || currentUrl.includes('10.') || currentUrl.includes('127.0.0.1') || currentUrl.includes('localhost');
       if (isLocal) {
         showToast('Endereço local detectado. Ativando Tradução Local...', 'info');
         var proxyUrl = '/api/apps/browser-proxy?url=' + encodeURIComponent(currentUrl) + '&token=' + API.token;
         iframe.src = proxyUrl;
         return;
       }

       // If already translated, extract original URL
       if (currentUrl.includes('translate.google.com')) {
         try {
           var urlParams = new URLSearchParams(currentUrl.split('?')[1]);
           currentUrl = urlParams.get('u') || currentUrl;
         } catch(e) {}
       }
       
       showToast('Traduzindo para Português...');
       var translateUrl = 'https://translate.google.com/translate?sl=auto&tl=pt&u=' + encodeURIComponent(currentUrl);
       iframe.src = translateUrl;
    };

    if (btnGo) btnGo.onclick = function () {
      navigateTo(input.value);
    };

    if (btnRefresh) btnRefresh.onclick = function () {
      iframe.src = iframe.src;
    };

    if (btnHome) btnHome.onclick = function () {
      navigateTo('http://www.google.com/search?igu=1');
    };

    if (btnBack) btnBack.onclick = function () {
      try { iframe.contentWindow.history.back(); } catch (e) { console.warn('CORS restricted history.back()'); }
    };

    if (btnForward) btnForward.onclick = function () {
      try { iframe.contentWindow.history.forward(); } catch (e) { console.warn('CORS restricted history.forward()'); }
    };

    if (btnProxy) btnProxy.onclick = function() {
       var currentUrl = input.value;
       if (!currentUrl) return;
       showToast('Iniciando modo de compatibilidade...');
       var proxyUrl = '/api/apps/browser-proxy?url=' + encodeURIComponent(currentUrl) + '&token=' + API.token;
       iframe.src = proxyUrl;
    };
  };

  // --- Explorer Logic ---
  _proto.bindExplorer = function bindExplorer(driveId, subpath) {
    this.currentDriveId = driveId;
    this.currentPath = subpath || '';
    this.bindExplorerActions();
    this.bindDock('files');
    if (!driveId) this.loadDrives();
    else this.loadFiles(driveId, subpath);
  };

  _proto.bindBrowse = function bindBrowse() {
    var self = this;
    var btnBrowse = document.getElementById('btn-browse-path');
    if (!btnBrowse) return;

    btnBrowse.onclick = function () {
      API.get('/admin/browse/drives').then(function (drives) {
        var modalHtml = renderBrowseDialog(drives);
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var overlay = document.getElementById('browse-overlay');
        var content = document.getElementById('browse-content');
        var breadcrumb = document.getElementById('browse-breadcrumb');
        var selectedPathEl = document.getElementById('browse-selected-path');
        var currentPath = '';

        function loadPath(path) {
          currentPath = path;
          breadcrumb.textContent = path || 'Drives';
          if (selectedPathEl) selectedPathEl.textContent = path || 'Nenhum';
          content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

          API.get('/admin/browse/path?path=' + encodeURIComponent(path)).then(function (folders) {
            var html = '';
            // Add back button if not at root
            if (path.length > 3) { // Greater than "C:\"
              html += '<div class="browse-folder-item" data-back="true" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">' +
                '<div style="color:var(--accent)">' + Icons.up + '</div>' +
                '<span>.. (Voltar)</span>' +
                '</div>';
            } else {
              html += '<div class="browse-folder-item" data-back-to-drives="true" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">' +
                '<div style="color:var(--accent)">' + Icons.back + '</div>' +
                '<span>Voltar aos Drives</span>' +
                '</div>';
            }

            folders.forEach(function (f) {
              html += '<div class="browse-folder-item" data-folder="' + escapeHtml(f) + '" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">' +
                '<div style="color:var(--accent)">' + Icons.folder + '</div>' +
                '<span>' + escapeHtml(f) + '</span>' +
                '</div>';
            });
            content.innerHTML = html;

            content.querySelectorAll('.browse-folder-item').forEach(function (item) {
              item.onclick = function () {
                if (this.getAttribute('data-back')) {
                  var parts = currentPath.split('\\');
                  parts.pop(); // Remove trailing empty
                  parts.pop(); // Remove last folder
                  loadPath(parts.join('\\') + '\\');
                } else if (this.getAttribute('data-back-to-drives')) {
                  showDrives();
                } else {
                  var folder = this.getAttribute('data-folder');
                  loadPath(currentPath + folder + '\\');
                }
              };
            });
          });
        }

        function showDrives() {
          currentPath = '';
          breadcrumb.textContent = 'Drives';
          if (selectedPathEl) selectedPathEl.textContent = 'Nenhum';
          content.innerHTML = '';
          drives.forEach(function (d) {
            var usedPct = d.total ? Math.round((d.total - d.free) / d.total * 100) : 0;
            var barColor = usedPct > 90 ? 'var(--danger)' : 'var(--accent-blue)';
            var freeText = formatSize(d.free) + ' livre(s) de ' + formatSize(d.total);

            var div = document.createElement('div');
            div.className = 'browse-drive-item';
            div.style.cssText = 'background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border);display:flex;gap:12px;cursor:pointer;margin-bottom:10px';
            div.innerHTML = '<div style="color:var(--accent);font-size:24px">' + Icons.drive('#0078d4') + '</div>' +
              '<div style="flex:1">' +
              '<div style="font-weight:600;font-size:13px">' + escapeHtml(d.name) + ' (' + d.path.replace('\\', '') + ')</div>' +
              '<div style="height:4px;background:rgba(255,255,255,0.1);border-radius:20px;margin:6px 0;overflow:hidden">' +
              '<div style="height:100%;background:' + barColor + ';width:' + usedPct + '%"></div>' +
              '</div>' +
              '<div style="font-size:11px;color:var(--text-secondary)">' + freeText + '</div>' +
              '</div>';
            div.onclick = function () { loadPath(d.path); };
            content.appendChild(div);
          });
        }

        document.getElementById('browse-close').onclick = document.getElementById('browse-cancel').onclick = function () {
          overlay.remove();
        };

        document.getElementById('browse-select').onclick = function () {
          if (currentPath) {
            document.getElementById('cfg-drive-path').value = currentPath;
            btnBrowse.textContent = currentPath;
            overlay.remove();
          } else {
            showToast('Selecione um drive primeiro', 'warning');
          }
        };

        // Initial drives click binding (for the HTML we just inserted)
        content.querySelectorAll('.browse-drive-item').forEach(function (item) {
          item.onclick = function () { loadPath(this.getAttribute('data-path')); };
        });
      });
    };
  };

  _proto.bindExplorerActions = function bindExplorerActions() {
    var self = this;
    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.oninput = function (e) {
        var subpath = self.currentPath || '';
        var query = searchInput.value.trim().toLowerCase();

        // Hide upload zone during search
        var zone = document.getElementById('upload-zone');
        if (zone) zone.style.display = query ? 'none' : 'flex';

        if (!query) {
          self.loadFiles(self.currentDriveId, subpath);
          return;
        }

        var isAdmin = self.user && self.user.role === 'admin';
        // Only trigger deep search for admins and if we have a drive context
        if (isAdmin && self.currentDriveId && query.length > 2) {
          API.get('/files/search?driveId=' + self.currentDriveId + '&subpath=' + encodeURIComponent(subpath) + '&query=' + encodeURIComponent(query))
            .then(function (results) {
              if (self.currentView === 'explorer') {
                var content = document.getElementById('content-area');
                content.innerHTML = renderFileList(results || [], self.currentDriveId, subpath, self.currentDrivePermissions);
                self.bindFileActions(self.currentDriveId, subpath);
              }
            });
        } else {
          // Local filter
          document.querySelectorAll('.file-row').forEach(function (item) {
            var name = item.querySelector('.file-name').textContent.toLowerCase();
            item.style.display = name.indexOf(query) > -1 ? '' : 'none';
          });
        }
      };
    }
    var btnBack = document.getElementById('btn-back');
    if (btnBack) {
      btnBack.onclick = function () { self.back(); };
      btnBack.style.opacity = self.history.length > 0 ? '1' : '0.3';
      btnBack.style.pointerEvents = self.history.length > 0 ? 'auto' : 'none';
    }

    var btnForward = document.getElementById('btn-forward');
    if (btnForward) {
      btnForward.onclick = function () { self.forward(); };
      btnForward.style.opacity = self.forwardHistory.length > 0 ? '1' : '0.3';
      btnForward.style.pointerEvents = self.forwardHistory.length > 0 ? 'auto' : 'none';
    }

    var btnUp = document.getElementById('btn-up');
    if (btnUp) {
      btnUp.onclick = function () {
        if (!self.currentDriveId) return;
        if (!self.currentPath) {
          self.navigate('explorer');
        } else {
          var parts = self.currentPath.split('/');
          parts.pop();
          self.navigate('explorer', { driveId: self.currentDriveId, subpath: parts.join('/') });
        }
      };
      btnUp.style.opacity = self.currentDriveId ? '1' : '0.3';
      btnUp.style.pointerEvents = self.currentDriveId ? 'auto' : 'none';
    }
    var btnSpeed = document.getElementById('btn-speedtest');
    if (btnSpeed) btnSpeed.onclick = function () { self.navigate('speedtest'); };

    var btnCams = document.getElementById('btn-cameras');
    if (btnCams) {
      btnCams.onclick = function () { self.navigate('cameras'); };
      // Check permission for cameras
      API.get('/apps/installed').then(function (apps) {
        var canAccess = apps.find(function (a) { return a.id === 'cameras'; });
        if (canAccess) btnCams.style.display = 'flex';
      });
    }

    var btnUpload = document.getElementById('btn-upload');
    if (btnUpload) {
      btnUpload.onclick = function () {
        var zone = document.getElementById('upload-zone');
        if (zone) {
          var isHidden = zone.style.display === 'none' || zone.style.display === '';
          zone.style.display = isHidden ? 'flex' : 'none';
          btnUpload.classList.toggle('active', isHidden);
        }
      };
    }

    var btnNewFolder = document.getElementById('btn-new-folder');
    if (btnNewFolder) {
      btnNewFolder.onclick = function () {
        var name = prompt('Nome da nova pasta:');
        if (!name || !name.trim()) return;
        API.post('/files/mkdir', {
          driveId: self.currentDriveId,
          subpath: self.currentPath,
          name: name.trim()
        }).then(function () {
          showToast('Pasta criada!', 'success');
          self.loadFiles(self.currentDriveId, self.currentPath);
        }).catch(function (e) { showToast(e.message, 'error'); });
      };
    }

    // Bind Drag & Drop
    self.bindDragAndDrop();



  };

  _proto.loadDrives = function loadDrives() {
    var self = this;
    var content = document.getElementById('content-area');
    if (content) content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    // Hide upload zone when viewing drives
    var zone = document.getElementById('upload-zone');
    if (zone) zone.style.display = 'none';

    API.get('/files/drives').then(function (drives) {
      self.drives = drives || [];
      var breadcrumb = document.getElementById('breadcrumb');
      if (breadcrumb) breadcrumb.innerHTML = '<span class="breadcrumb-item active">Este Computador</span>';

      if (content) {
        content.innerHTML = renderDrives(drives);
        document.querySelectorAll('.drive-card').forEach(function (el) {
          el.onclick = function () {
            var id = this.getAttribute('data-drive-id');
            self.navigate('explorer', { driveId: id, subpath: '' });
          };
        });
      }
    });
  };

  _proto.loadFiles = function loadFiles(driveId, subpath) {
    var self = this;
    var content = document.getElementById('content-area');
    if (content) content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    API.get('/files/list?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath)).then(function (data) {
      self.currentDriveId = driveId;
      self.currentPath = subpath;
      self.currentDrivePermissions = data.permissions;

      // Show upload and new folder buttons in toolbar if permitted
      var btnUpload = document.getElementById('btn-upload');
      var btnNewFolder = document.getElementById('btn-new-folder');
      var canUpload = !!(data.permissions && data.permissions.upload);

      if (btnUpload) btnUpload.style.display = canUpload ? 'flex' : 'none';
      if (btnNewFolder) btnNewFolder.style.display = canUpload ? 'flex' : 'none';

      if (content) {
        content.innerHTML = renderFileList(data.files || [], driveId, subpath, data.permissions);
        self.bindFileActions(driveId, subpath);

        // Update Breadcrumb
        var breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
          var pathHtml = '<span class="breadcrumb-item clickable" data-path="root">Este Computador</span>';
          pathHtml += '<span class="breadcrumb-sep">/</span><span class="breadcrumb-item clickable" data-drive="' + driveId + '" data-path="">' + escapeHtml(data.driveName || 'Drive') + '</span>';

          if (subpath) {
            var parts = subpath.split('/');
            var current = '';
            parts.forEach(function (p) {
              if (!p) return;
              current = current ? current + '/' + p : p;
              pathHtml += '<span class="breadcrumb-sep">/</span><span class="breadcrumb-item clickable" data-drive="' + driveId + '" data-path="' + current + '">' + escapeHtml(p) + '</span>';
            });
          }
          breadcrumb.innerHTML = pathHtml;
          self.bindBreadcrumb();
        }
      }
    });
  };

  _proto.previewFile = function previewFile(driveId, subpath, file) {
    var self = this;
    var modalHtml = renderPreviewModal(driveId, subpath, file);
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    var overlay = document.getElementById('preview-overlay');
    document.getElementById('btn-close-preview').onclick = function () { overlay.remove(); };
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };

    // If it's a text file, we need to fetch the content via API
    var textContainer = document.getElementById('preview-text-content');
    if (textContainer) {
      API.get('/files/preview?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath)).then(function (res) {
        if (!res) return;
        if (res.type === 'text') {
          textContainer.textContent = res.content;
        } else if (res.type === 'zip') {
          var html = '<div style="width:100%; display:flex; flex-direction:column; gap:8px">';
          html += '<div style="font-weight:600; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); color:var(--accent)">Conteúdo do arquivo ZIP:</div>';
          (res.entries || []).forEach(function (e) {
            var icon = e.isDirectory ? Icons.folder : Icons.file;
            html += '<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03)">' +
              '<div style="display:flex; align-items:center; gap:8px"><span>' + icon + '</span><span>' + escapeHtml(e.name) + '</span></div>' +
              '<span style="color:var(--text-secondary)">' + (e.isDirectory ? '' : formatSize(e.size)) + '</span>' +
              '</div>';
          });
          html += '</div>';
          textContainer.style.fontFamily = 'inherit';
          textContainer.innerHTML = html;
        } else if (res.type === 'office') {
          var downloadUrl = '/api/files/download?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath) + '&token=' + API.token;
          var fullUrl = window.location.origin + downloadUrl;

          if (window.location.hostname === 'localhost' || /^\d{1,3}\.\d{1,3}/.test(window.location.hostname)) {
            textContainer.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-primary)">' +
              '<div style="font-size:48px; margin-bottom:20px">📂</div>' +
              '<div style="font-size:16px; font-weight:600; margin-bottom:10px">Pré-visualização do Office</div>' +
              '<p style="font-size:13px; color:var(--text-secondary); max-width:400px; margin:0 auto 20px">A visualização online requer um endereço público (ex: DuckDNS). Como você está acessando via IP local, a Microsoft não consegue carregar este arquivo.</p>' +
              '<a href="' + downloadUrl + '" class="btn btn-primary" style="display:inline-block; padding:10px 24px" download>Baixar Arquivo para Abrir</a>' +
              '</div>';
          } else {
            var officeViewer = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(fullUrl);
            textContainer.innerHTML = '<iframe src="' + officeViewer + '" style="width:100%; height:calc(90vh - 120px); border:none; background:#fff; border-radius:4px"></iframe>';
          }
        }
      }).catch(function (e) {
        textContainer.textContent = 'Erro: ' + e.message;
      });
    }
  };

  _proto.bindBreadcrumb = function bindBreadcrumb() {
    var self = this;
    document.querySelectorAll('.breadcrumb-item.clickable').forEach(function (el) {
      el.onclick = function () {
        var driveId = this.getAttribute('data-drive');
        var path = this.getAttribute('data-path');
        if (path === 'root') self.navigate('explorer');
        else self.navigate('explorer', { driveId: driveId, subpath: path });
      };
    });
  };

  _proto.bindFileActions = function bindFileActions(driveId, subpath) {
    var self = this;

    var role = getUserRole();
    var isAdmin = role === 'admin';
    var canDelete = isAdmin;
    var canRename = isAdmin;
    if (!isAdmin && self.currentDrivePermissions) {
      canDelete = !!self.currentDrivePermissions.delete;
      canRename = !!self.currentDrivePermissions.upload;
    } else if (!isAdmin && role === 'master') {
      canDelete = true;
      canRename = true;
    }

    // Hide bulk delete button in toolbar if user lacks delete permission
    var btnBulkDelete = document.getElementById('btn-bulk-delete');
    if (btnBulkDelete) {
      btnBulkDelete.style.display = canDelete ? 'flex' : 'none';
    }

    // Reset selection state and context menus on navigate
    var oldMenu = document.querySelector('.custom-context-menu');
    if (oldMenu) oldMenu.remove();
    var bulkBar = document.getElementById('bulk-actions-wrapper');
    if (bulkBar) bulkBar.style.display = 'none';

    function updateSelectionState() {
      var selectedRows = document.querySelectorAll('.file-row.selected');
      var count = selectedRows.length;
      var bar = document.getElementById('bulk-actions-wrapper');
      var countLabel = document.getElementById('bulk-selected-count');
      var selectAllCheckbox = document.getElementById('select-all-files');
      
      if (bar && countLabel) {
        if (count > 0) {
          bar.style.display = 'flex';
          countLabel.textContent = count + (count === 1 ? ' item selecionado' : ' itens selecionados');
        } else {
          bar.style.display = 'none';
        }
      }
      
      if (selectAllCheckbox) {
        var allCheckboxes = document.querySelectorAll('.file-checkbox');
        var checkedCount = 0;
        allCheckboxes.forEach(function(cb) { if (cb.checked) checkedCount++; });
        selectAllCheckbox.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
      }
    }

    function getSelectedPaths() {
      var paths = [];
      document.querySelectorAll('.file-row.selected').forEach(function(row) {
        paths.push(row.getAttribute('data-subpath'));
      });
      return paths;
    }

    // Bind Select All Checkbox
    var selectAllCheckbox = document.getElementById('select-all-files');
    if (selectAllCheckbox) {
      selectAllCheckbox.onchange = function() {
        var checked = this.checked;
        document.querySelectorAll('.file-row').forEach(function(row) {
          row.classList.toggle('selected', checked);
          var cb = row.querySelector('.file-checkbox');
          if (cb) cb.checked = checked;
        });
        updateSelectionState();
      };
    }

    // Bind Single Row Checkboxes
    document.querySelectorAll('.file-checkbox').forEach(function(cb) {
      cb.onclick = function(e) {
        e.stopPropagation();
        var row = this.closest('.file-row');
        if (row) {
          row.classList.toggle('selected', this.checked);
        }
        updateSelectionState();
      };
    });

    document.querySelectorAll('.file-row').forEach(function (el) {
      // Dynamic draggable toggle based on hovering name cell
      var nameCell = el.querySelector('.file-name-cell');
      if (nameCell) {
        nameCell.onmouseenter = function() {
          el.setAttribute('draggable', 'true');
        };
        nameCell.onmouseleave = function() {
          el.setAttribute('draggable', 'false');
        };
      }

      // Row click selection or navigate/preview
      el.onclick = function (e) {
        if (e.target.closest('.btn-icon') || e.target.closest('.file-checkbox')) return;
        
        var checkbox = this.querySelector('.file-checkbox');
        var name = this.getAttribute('data-name');
        var isDir = this.getAttribute('data-is-dir') === 'true';
        
        // If selection mode is active, row click toggles selection
        var selectedCount = document.querySelectorAll('.file-row.selected').length;
        if (selectedCount > 0) {
          var isSelected = !this.classList.contains('selected');
          this.classList.toggle('selected', isSelected);
          if (checkbox) checkbox.checked = isSelected;
          updateSelectionState();
          return;
        }
        
        // Standard Navigation/Preview
        if (isDir) {
          var newPath = subpath ? subpath + '/' + name : name;
          self.navigate('explorer', { driveId: driveId, subpath: newPath });
        } else {
          var filePath = subpath ? subpath + '/' + name : name;
          var size = parseInt(this.getAttribute('data-size')) || 0;
          self.previewFile(driveId, filePath, { name: name, size: size });
        }
      };

      // Multi-drag supporting dragging single or multiple zipped items to desktop
      el.ondragstart = function (e) {
        var name = this.getAttribute('data-name');
        var isDir = this.getAttribute('data-is-dir') === 'true';
        var driveId = this.getAttribute('data-drive-id');
        var subpath = this.getAttribute('data-subpath');
        
        var isSelected = this.classList.contains('selected');
        var selectedPaths = getSelectedPaths();
        
        var mimeType, filename, downloadUrl;
        
        if (isSelected && selectedPaths.length > 1) {
          mimeType = 'application/zip';
          filename = 'selecao_' + Date.now() + '.zip';
          downloadUrl = window.location.origin + '/api/files/download?driveId=' + driveId + '&subpath=' + encodeURIComponent(JSON.stringify(selectedPaths)) + '&token=' + API.token;
        } else {
          var ext = isDir ? '.zip' : '';
          filename = name + ext;
          mimeType = isDir ? 'application/zip' : 'application/octet-stream';
          downloadUrl = window.location.origin + '/api/files/download?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath) + '&token=' + API.token;
        }
        
        e.dataTransfer.setData('DownloadURL', mimeType + ':' + filename + ':' + downloadUrl);
      };

      // Premium Desktop-grade Right Click Context Menu
      el.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var row = this;
        var name = row.getAttribute('data-name');
        var isDir = row.getAttribute('data-is-dir') === 'true';
        var rowDriveId = row.getAttribute('data-drive-id');
        var rowSubpath = row.getAttribute('data-subpath');
        
        // Auto-select row if not selected
        if (!row.classList.contains('selected')) {
          if (!e.ctrlKey && !e.metaKey) {
            document.querySelectorAll('.file-row').forEach(function(r) {
              r.classList.remove('selected');
              var cb = r.querySelector('.file-checkbox');
              if (cb) cb.checked = false;
            });
          }
          row.classList.add('selected');
          var checkbox = row.querySelector('.file-checkbox');
          if (checkbox) checkbox.checked = true;
          updateSelectionState();
        }
        
        var oldMenu = document.querySelector('.custom-context-menu');
        if (oldMenu) oldMenu.remove();
        
        var selectedPaths = getSelectedPaths();
        var isMulti = selectedPaths.length > 1;
        
        var menu = document.createElement('div');
        menu.className = 'custom-context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        
        var items = [];
        
        if (!isMulti) {
          items.push({
            text: isDir ? 'Abrir Pasta' : 'Abrir / Visualizar',
            icon: isDir ? Icons.explorer : Icons.file,
            action: function() {
              if (isDir) {
                var newPath = subpath ? subpath + '/' + name : name;
                self.navigate('explorer', { driveId: rowDriveId, subpath: newPath });
              } else {
                var size = parseInt(row.getAttribute('data-size')) || 0;
                self.previewFile(rowDriveId, rowSubpath, { name: name, size: size });
              }
            }
          });
          
          items.push({
            text: 'Baixar Item',
            icon: Icons.download,
            action: function() {
              var downloadUrl = '/api/files/download?driveId=' + rowDriveId + '&subpath=' + encodeURIComponent(rowSubpath) + '&token=' + API.token;
              var a = document.createElement('a');
              a.href = downloadUrl;
              a.download = isDir ? name + '.zip' : name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          });
          
          if (canRename || canDelete) {
            items.push({ type: 'separator' });
          }
          
          if (canRename) {
            items.push({
              text: 'Renomear',
              icon: Icons.edit,
              action: function() {
                var renameBtn = row.querySelector('.btn-rename-file');
                if (renameBtn) renameBtn.click();
              }
            });
          }
          
          if (canDelete) {
            items.push({
              text: 'Apagar',
              icon: Icons.trash,
              class: 'danger',
              action: function() {
                var deleteBtn = row.querySelector('.btn-delete-file');
                if (deleteBtn) deleteBtn.click();
              }
            });
          }
        } else {
          // Multi actions
          items.push({
            text: 'Baixar Seleção (' + selectedPaths.length + ')',
            icon: Icons.download,
            action: function() {
              var bulkDownloadBtn = document.getElementById('btn-bulk-download');
              if (bulkDownloadBtn) bulkDownloadBtn.click();
            }
          });
          
          if (canDelete) {
            items.push({
              text: 'Apagar Seleção (' + selectedPaths.length + ')',
              icon: Icons.trash,
              class: 'danger',
              action: function() {
                var bulkDeleteBtn = document.getElementById('btn-bulk-delete');
                if (bulkDeleteBtn) bulkDeleteBtn.click();
              }
            });
          }
        }
        
        items.push({ type: 'separator' });
        items.push({
          text: 'Selecionar Tudo',
          icon: Icons.add,
          action: function() {
            document.querySelectorAll('.file-row').forEach(function(r) {
              r.classList.add('selected');
              var cb = r.querySelector('.file-checkbox');
              if (cb) cb.checked = true;
            });
            updateSelectionState();
          }
        });
        
        items.forEach(function(item) {
          if (item.type === 'separator') {
            var sep = document.createElement('div');
            sep.className = 'context-menu-sep';
            menu.appendChild(sep);
          } else {
            var elItem = document.createElement('div');
            elItem.className = 'context-menu-item' + (item.class ? ' ' + item.class : '');
            elItem.innerHTML = item.icon + '<span>' + item.text + '</span>';
            elItem.onclick = function() {
              menu.remove();
              item.action();
            };
            menu.appendChild(elItem);
          }
        });
        
        document.body.appendChild(menu);
        
        // Prevent offscreen positioning
        var rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
          menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
          menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
        }
      };
    });

    // Bind direct download buttons
    document.querySelectorAll('.btn-download-file').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var name = this.getAttribute('data-name');
        var isDir = this.getAttribute('data-is-dir') === 'true';
        var driveId = this.getAttribute('data-drive-id');
        var subpath = this.getAttribute('data-subpath');
        
        var downloadUrl = '/api/files/download?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath) + '&token=' + API.token;
        
        var a = document.createElement('a');
        a.href = downloadUrl;
        a.download = isDir ? name + '.zip' : name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    });

    // Bind Bulk Toolbar actions
    var btnBulkClear = document.getElementById('btn-bulk-clear');
    if (btnBulkClear) {
      btnBulkClear.onclick = function() {
        document.querySelectorAll('.file-row').forEach(function(row) {
          row.classList.remove('selected');
          var cb = row.querySelector('.file-checkbox');
          if (cb) cb.checked = false;
        });
        updateSelectionState();
      };
    }
    
    var btnBulkDownload = document.getElementById('btn-bulk-download');
    if (btnBulkDownload) {
      btnBulkDownload.onclick = function() {
        var selectedPaths = getSelectedPaths();
        if (selectedPaths.length === 0) return;
        
        var downloadUrl = '/api/files/download?driveId=' + driveId + '&subpath=' + encodeURIComponent(JSON.stringify(selectedPaths)) + '&token=' + API.token;
        var a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'selecao_' + Date.now() + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    }
    
    var btnBulkDelete = document.getElementById('btn-bulk-delete');
    if (btnBulkDelete) {
      btnBulkDelete.onclick = function() {
        var selectedPaths = getSelectedPaths();
        if (selectedPaths.length === 0) return;
        
        if (confirm('Tem certeza que deseja apagar os ' + selectedPaths.length + ' itens selecionados? Esta ação não pode ser desfeita.')) {
          API.del('/files/delete?driveId=' + driveId + '&subpath=' + encodeURIComponent(JSON.stringify(selectedPaths)))
            .then(function() {
              showToast(selectedPaths.length + ' itens apagados com sucesso', 'success');
              var selectAllCheckbox = document.getElementById('select-all-files');
              if (selectAllCheckbox) selectAllCheckbox.checked = false;
              self.loadFiles(driveId, self.currentPath);
            })
            .catch(function(err) {
              showToast(err.message, 'error');
            });
        }
      };
    }

    // Dismiss context menu on left click globally
    if (!window._contextMenuGlobalBound) {
      window._contextMenuGlobalBound = true;
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-context-menu')) {
          var menu = document.querySelector('.custom-context-menu');
          if (menu) menu.remove();
        }
      });
    }

    // Bind delete buttons
    document.querySelectorAll('.btn-delete-file').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var name = this.getAttribute('data-name');
        var driveId = this.getAttribute('data-drive-id');
        var subpath = this.getAttribute('data-subpath');
        var isDir = this.getAttribute('data-is-dir') === 'true';

        if (confirm('Tem certeza que deseja apagar ' + (isDir ? 'esta pasta' : 'este arquivo') + ': ' + name + '?')) {
          API.del('/files/delete?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath))
            .then(function () {
              showToast('Apagado com sucesso', 'success');
              self.loadFiles(driveId, self.currentPath);
            })
            .catch(function (err) { showToast(err.message, 'error'); });
        }
      };
    });

    // Bind rename buttons
    document.querySelectorAll('.btn-rename-file').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var oldName = this.getAttribute('data-name');
        var path = this.getAttribute('data-subpath');
        var newName = prompt('Renomear para:', oldName);
        if (newName && newName !== oldName) {
          API.post('/files/rename', { driveId: driveId, subpath: path, newName: newName }).then(function () {
            showToast('Renomeado com sucesso!', 'success');
            self.loadFiles(driveId, self.currentPath);
          }).catch(function (err) { showToast(err.message, 'error'); });
        }
      };
    });

    // Premium Drag Selection Marquee (Windows Explorer Style)
    var contentArea = document.getElementById('content-area');
    if (contentArea) {
      var isSelecting = false;
      var startX = 0, startY = 0;
      var selectionBox = null;
      
      var onMouseMove = function (e) {
        if (!isSelecting || !selectionBox) return;
        
        var currentX = e.clientX;
        var currentY = e.clientY;
        
        var x = Math.min(startX, currentX);
        var y = Math.min(startY, currentY);
        var w = Math.abs(startX - currentX);
        var h = Math.abs(startY - currentY);
        
        selectionBox.style.left = x + 'px';
        selectionBox.style.top = y + 'px';
        selectionBox.style.width = w + 'px';
        selectionBox.style.height = h + 'px';
        
        // Dynamic collision detection with file rows
        document.querySelectorAll('.file-row').forEach(function(row) {
          var rect = row.getBoundingClientRect();
          var overlaps = !(rect.right < x || rect.left > x + w || rect.bottom < y || rect.top > y + h);
          
          row.classList.toggle('selected', overlaps);
          var cb = row.querySelector('.file-checkbox');
          if (cb) cb.checked = overlaps;
        });
        
        updateSelectionState();
      };
      
      var onMouseUp = function (e) {
        if (isSelecting) {
          isSelecting = false;
          if (selectionBox) {
            selectionBox.remove();
            selectionBox = null;
          }
          updateSelectionState();
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      contentArea.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return; // Only left click
        
        // Ignore if clicking checkboxes, buttons, inputs, context menus, or exactly the file name/icon cell
        if (e.target.closest('.file-checkbox') || e.target.closest('.btn-icon') || e.target.closest('.toolbar-btn') || e.target.closest('#search-input') || e.target.closest('.custom-context-menu') || e.target.closest('.file-name-cell') || e.target.closest('.file-icon')) {
          return;
        }
        
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // Clear selection unless holding Ctrl/Shift
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          document.querySelectorAll('.file-row').forEach(function(row) {
            row.classList.remove('selected');
            var cb = row.querySelector('.file-checkbox');
            if (cb) cb.checked = false;
          });
          updateSelectionState();
        }
        
        // Create blue glassmorphic marquee box
        selectionBox = document.createElement('div');
        selectionBox.className = 'selection-marquee';
        selectionBox.style.position = 'fixed';
        selectionBox.style.border = '1px solid var(--accent-blue)';
        selectionBox.style.background = 'rgba(0, 120, 212, 0.18)';
        selectionBox.style.pointerEvents = 'none';
        selectionBox.style.zIndex = '99999';
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        document.body.appendChild(selectionBox);
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        e.preventDefault();
      });
    }
  };

  _proto.bindBrowseForElement = function (idField, btnId) {
    var self = this;
    API.get('/admin/browse/drives').then(function (drives) {
      var modalHtml = renderBrowseDialog(drives);
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      var overlay = document.getElementById('browse-overlay');
      var content = document.getElementById('browse-content');
      var selectedPathEl = document.getElementById('browse-selected-path');
      var currentPath = '';

      function loadPath(path) {
        var btnSelect = document.getElementById('browse-select');
        if (btnSelect) btnSelect.disabled = true;

        if (selectedPathEl) selectedPathEl.textContent = path || 'Nenhum';
        content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        API.get('/admin/browse/path?path=' + encodeURIComponent(path)).then(function (folders) {
          currentPath = path; // Only update currentPath on success
          if (btnSelect) btnSelect.disabled = false;

          var html = '';
          if (path.length > 3) {
            html += '<div class="browse-folder-item" data-back="true" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">' + Icons.up + ' <span>.. (Voltar)</span></div>';
          } else {
            html += '<div class="browse-folder-item" data-back-to-drives="true" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">' + Icons.back + ' <span>Voltar aos Drives</span></div>';
          }
          folders.forEach(function (f) {
            var name = typeof f === 'object' ? f.name : f;
            var fPath = typeof f === 'object' ? f.path : (path + (path.endsWith('\\') ? '' : '\\') + f);
            html += '<div class="browse-folder-item" data-path="' + escapeHtml(fPath) + '" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">' + Icons.folder + ' <span>' + escapeHtml(name) + '</span></div>';
          });
          content.innerHTML = html;
          content.querySelectorAll('.browse-folder-item').forEach(function (item) {
            item.onclick = function () {
              if (this.hasAttribute('data-back')) {
                var parts = currentPath.split('\\').filter(Boolean);
                parts.pop();
                var parent = parts.join('\\') + (parts.length > 0 ? '\\' : '');
                loadPath(parent);
              } else if (this.hasAttribute('data-back-to-drives')) {
                overlay.remove();
                self.bindBrowseForElement(idField, btnId);
              } else {
                loadPath(this.getAttribute('data-path'));
              }
            };
          });
        }).catch(function (e) {
          content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger)">Erro: ' + e.message + '</div>';
          currentPath = ''; // Reset on error
          if (btnSelect) btnSelect.disabled = true;
        });
      }

      content.querySelectorAll('.browse-drive-item').forEach(function (item) {
        item.onclick = function () {
          loadPath(this.getAttribute('data-path'));
        };
      });
      document.getElementById('browse-close').onclick = function () {
        overlay.remove();
      };
      document.getElementById('browse-cancel').onclick = function () {
        overlay.remove();
      };
      document.getElementById('browse-select').onclick = function () {
        if (!currentPath) return showToast('Selecione uma pasta', 'warning');
        var input = document.getElementById(idField) || document.querySelector('.' + idField);
        if (input) input.value = currentPath;
        var btn = document.getElementById(btnId);
        if (btn) btn.textContent = currentPath;
        overlay.remove();
      };
    });
  };

  _proto.bindPermissionLogic = function (container) {
    var self = this;

    function updateState(row) {
      var read = row.querySelector('input[class*="-read"]');
      var write = row.querySelector('input[class*="-upload"]');
      var del = row.querySelector('input[class*="-delete"]');

      if (read && write && del) {
        if (!read.checked) {
          write.checked = false;
          del.checked = false;
          write.disabled = true;
          del.disabled = true;
          write.parentElement.style.opacity = '0.5';
          del.parentElement.style.opacity = '0.5';
        } else {
          write.disabled = false;
          del.disabled = false;
          write.parentElement.style.opacity = '1';
          del.parentElement.style.opacity = '1';
        }
      }
    }

    // Handle Group Master
    container.querySelectorAll('.card-perm-row').forEach(function (row) {
      var read = row.querySelector('input[class*="-read"]');
      if (read) {
        read.onchange = function () { updateState(row); };
        updateState(row); // Initial state
      }
    });

    // Handle Individual Users
    container.querySelectorAll('.card-user-row').forEach(function (row) {
      var read = row.querySelector('.p-user-read');
      if (read) {
        read.onchange = function () { updateState(row); };
        updateState(row); // Initial state
      }
    });
  };

  _proto.bindUserSearch = function (container) {
    var searchInput = container.querySelector('.user-search-input');
    var listContainer = container.querySelector('.user-list-container');
    if (!searchInput || !listContainer) return;

    searchInput.oninput = function () {
      var query = this.value.toLowerCase();
      var rows = listContainer.querySelectorAll('.card-user-row');
      rows.forEach(function (row) {
        var username = row.querySelector('span').textContent.toLowerCase();
        if (username.indexOf(query) !== -1) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    };
  };

  _proto.bindDragAndDrop = function () {
    var self = this;
    var zone = document.getElementById('upload-zone');
    if (!zone) return;

    var input = zone.querySelector('#upload-input');
    var folderInput = zone.querySelector('#upload-folder-input');
    var btnFiles = zone.querySelector('#btn-upload-files');
    var btnFolder = zone.querySelector('#btn-upload-folder');

    // Recursive directory traversal for Drag & Drop
    function traverseDirectory(entry, path) {
      path = path || '';
      return new Promise(function (resolve) {
        if (entry.isFile) {
          entry.file(function (file) {
            file.relativeFolder = path;
            resolve([file]);
          }, function () {
            resolve([]);
          });
        } else if (entry.isDirectory) {
          var dirReader = entry.createReader();
          var allEntries = [];

          function readAllEntries() {
            dirReader.readEntries(function (entries) {
              if (entries.length === 0) {
                var promises = allEntries.map(function (childEntry) {
                  return traverseDirectory(childEntry, path ? path + '/' + entry.name : entry.name);
                });
                Promise.all(promises).then(function (results) {
                  var files = [];
                  results.forEach(function (res) {
                    files = files.concat(res);
                  });
                  resolve(files);
                });
              } else {
                allEntries = allEntries.concat(entries);
                readAllEntries();
              }
            }, function () {
              resolve([]);
            });
          }

          readAllEntries();
        } else {
          resolve([]);
        }
      });
    }

    zone.onclick = function (e) {
      // Don't trigger if click was inside buttons
      if (e.target.closest('#btn-upload-files') || e.target.closest('#btn-upload-folder')) {
        return;
      }
      if (input) input.click();
    };

    if (btnFiles && input) {
      btnFiles.onclick = function (e) {
        e.stopPropagation();
        input.click();
      };
    }

    if (btnFolder && folderInput) {
      btnFolder.onclick = function (e) {
        e.stopPropagation();
        folderInput.click();
      };
    }

    if (input) {
      input.onchange = function (e) {
        var files = e.target.files;
        if (!files || !files.length) return;
        self.uploadFiles(files);
      };
    }

    if (folderInput) {
      folderInput.onchange = function (e) {
        var files = e.target.files;
        if (!files || !files.length) return;
        self.uploadFiles(files);
      };
    }

    zone.ondragover = function (e) {
      e.preventDefault();
      if (!self.currentDrivePermissions || !self.currentDrivePermissions.upload) return;
      zone.classList.add('drag-over');
      zone.classList.add('dragover');
    };

    zone.ondragleave = function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      zone.classList.remove('dragover');
    };

    zone.ondrop = function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      zone.classList.remove('dragover');
      if (!self.currentDrivePermissions || !self.currentDrivePermissions.upload) {
        return showToast('Você não possui permissão para enviar arquivos para este drive', 'warning');
      }

      var items = e.dataTransfer.items;
      if (items && items.length) {
        var promises = [];
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          if (typeof item.webkitGetAsEntry === 'function') {
            var entry = item.webkitGetAsEntry();
            if (entry) {
              promises.push(traverseDirectory(entry));
            }
          }
        }

        if (promises.length) {
          showToast('Processando pastas e arquivos...', 'info');
          Promise.all(promises).then(function (results) {
            var allFiles = [];
            results.forEach(function (res) {
              allFiles = allFiles.concat(res);
            });
            if (allFiles.length) {
              self.uploadFiles(allFiles);
            } else {
              showToast('Nenhum arquivo válido encontrado para upload', 'warning');
            }
          }).catch(function (err) {
            showToast('Erro ao processar itens: ' + err.message, 'error');
          });
          return;
        }
      }

      var files = e.dataTransfer.files;
      if (!files || !files.length) return;
      self.uploadFiles(files);
    };
  };

  _proto.uploadFiles = function (files) {
    var self = this;
    showToast('Enviando ' + files.length + ' arquivo(s)...', 'info');
    API.uploadFiles(self.currentDriveId, self.currentPath, files)
      .then(function () {
        showToast('Upload concluído!', 'success');

        // Hide zone after upload
        var zone = document.getElementById('upload-zone');
        if (zone) zone.style.display = 'none';
        var btnUpload = document.getElementById('btn-upload');
        if (btnUpload) btnUpload.classList.remove('active');

        self.loadFiles(self.currentDriveId, self.currentPath);
      })
      .catch(function (err) { showToast(err.message, 'error'); });
  };

  _proto.bindCardExpansion = function (container) {
    container.querySelectorAll('.config-card:not(.add-drive-card):not(.add-user-card)').forEach(function (card) {
      card.onclick = function (e) {
        var isAction = e.target.closest('.config-card-actions') || e.target.closest('.btn-icon') || e.target.closest('.switch') || e.target.closest('button');
        var isBody = e.target.closest('.config-card-body');

        if (isAction || isBody) return;

        e.stopPropagation();
        var wasActive = this.classList.contains('active');
        document.querySelectorAll('.config-card.active').forEach(function (c) {
          c.classList.remove('active');
        });
        if (!wasActive) this.classList.add('active');
      };
    });
  };

  // Global click to close cards when clicking background
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.config-card')) {
      document.querySelectorAll('.config-card.active').forEach(function (c) {
        c.classList.remove('active');
      });
    }
  });

  _proto.showWallpaperMenu = function () {
    var self = this;
    if (this._wallpaperLoading || document.getElementById('wallpaper-overlay')) return;

    this._wallpaperLoading = true;
    API.get('/user/wallpapers').then(function (wallpapers) {
      self._wallpaperLoading = false;
      if (document.getElementById('wallpaper-overlay')) return;
      document.body.insertAdjacentHTML('beforeend', renderWallpaperMenu(wallpapers));
      self.bindWallpaperEvents();
    }).catch(function () {
      self._wallpaperLoading = false;
    });
  };

  _proto.force2FASetup = function (tempToken) {
    var self = this;
    if (tempToken) API.setToken(tempToken);

    var setupHtml = '<div class="auth-page"><div class="auth-card" style="max-width:450px">' +
                 '<div class="logo">' +
                   '<svg viewBox="0 0 24 24" fill="none" stroke="#60cdff" stroke-width="2" style="width:48px;height:48px;margin-bottom:10px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
                   '<h1>Segurança Obrigatória</h1>' +
                   '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px">Como você é um usuário Admin/Master, precisa ativar a autenticação em duas etapas para continuar.</p>' +
                 '</div>' +
                 '<div id="setup-area-forced">' +
                   '<div style="text-align:center;padding:40px"><div class="spinner"></div><p style="margin-top:10px">Gerando QR Code...</p></div>' +
                 '</div>' +
               '</div></div>';
    
    document.getElementById('app').innerHTML = setupHtml;

    API.get('/auth/2fa/setup').then(function(res) {
       var area = document.getElementById('setup-area-forced');
       if (!area) return;
        var showPass = self.user && (self.user.mustChangePassword === true || self.user.mustChangePassword === 'true');
        area.innerHTML = render2FASetup(res.qrCode, res.secret, showPass);

       
       var confirmBtn = area.querySelector('#btn-confirm-2fa');
       var input = area.querySelector('#confirm-2fa-code');

       if (confirmBtn && input) {
         confirmBtn.onclick = function() {
           var code = input.value.trim();
           if (code.length !== 6) return showToast('Digite o código de 6 dígitos', 'error');

            var payload = { secret: res.secret, code: code };
            
            // If password change is shown, collect those fields
            var oldPassInput = area.querySelector('#confirm-old-pass');
            var newPassInput = area.querySelector('#confirm-new-pass');
            var newPassInput2 = area.querySelector('#confirm-new-pass2');
            if (oldPassInput && newPassInput) {
              var oldP = oldPassInput.value;
              var newP = newPassInput.value;
              var newP2 = newPassInput2 ? newPassInput2.value : newP;
              
              if (oldP || newP || (newPassInput2 && newP2)) { 
                if (!oldP || !newP || !newP2) return showToast('Preencha todos os campos de senha', 'error');
                if (newP !== newP2) return showToast('As novas senhas não conferem', 'error');
                if (newP.length < 4) return showToast('A nova senha deve ter 4+ caracteres', 'error');
                payload.oldPassword = oldP;
                payload.newPassword = newP;
              }
            }

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Verificando...';

            API.post('/auth/2fa/enable', payload).then(function(res2) {

              showToast('2FA Ativado com sucesso!', 'success');
              if (res2.token) API.setToken(res2.token);
              if (res2.user) self.user = res2.user;
              
              area.innerHTML = renderRecoveryCodes(res2.recoveryCodes);
              var finishBtn = area.querySelector('button');
              if (finishBtn) {
                finishBtn.onclick = function() { self.navigate('desktop'); };
              }
           }).catch(function(err) {
              showToast(err.message, 'error');
              confirmBtn.disabled = false;
              confirmBtn.textContent = 'Verificar e Ativar';
           });
         };
       }
    }).catch(function(err) {
       showToast('Erro ao carregar setup: ' + err.message, 'error');
    });
  };

  _proto.bind2FAEvents = function () {
    var self = this;
    // Look for elements in the document since they could be in the modal or the admin page
    var container = document.getElementById('config-body') || document.getElementById('config-overlay');
    if (!container) return;

    // Enable 2FA button
    var btnSetup = container.querySelector('#btn-setup-2fa');
    if (btnSetup) {
      btnSetup.onclick = function() {
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'Carregando...';
        
        API.get('/auth/2fa/setup').then(function(res) {
           var area = container.querySelector('#status-2fa-area');
           if (!area) return;
           var showPass = self.user && (self.user.mustChangePassword === true || self.user.mustChangePassword === 'true');
        area.innerHTML = render2FASetup(res.qrCode, res.secret, showPass);
           
           var confirmBtn = area.querySelector('#btn-confirm-2fa');
           var input = area.querySelector('#confirm-2fa-code');

           confirmBtn.onclick = function() {
             var code = input.value.trim();
             if (code.length !== 6) return showToast('Digite o código de 6 dígitos', 'error');
             confirmBtn.disabled = true;
             confirmBtn.textContent = 'Verificando...';

             var payload = { secret: res.secret, code: code };
            
            // If password change is shown, collect those fields
            var oldPassInput = area.querySelector('#confirm-old-pass');
            var newPassInput = area.querySelector('#confirm-new-pass');
            var newPassInput2 = area.querySelector('#confirm-new-pass2');
            if (oldPassInput && newPassInput) {
              var oldP = oldPassInput.value;
              var newP = newPassInput.value;
              var newP2 = newPassInput2 ? newPassInput2.value : newP;
              
              if (oldP || newP || (newPassInput2 && newP2)) { 
                if (!oldP || !newP || !newP2) return showToast('Preencha todos os campos de senha', 'error');
                if (newP !== newP2) return showToast('As novas senhas não conferem', 'error');
                if (newP.length < 4) return showToast('A nova senha deve ter 4+ caracteres', 'error');
                payload.oldPassword = oldP;
                payload.newPassword = newP;
              }
            }

            API.post('/auth/2fa/enable', payload).then(function(res2) {
                showToast('2FA Ativado!', 'success');
                // Refresh user state
                API.get('/auth/me').then(function(u) {
                  self.user = u;
                  self.loadConfigTab('security');
                });
             }).catch(function(err) {
                showToast(err.message, 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Verificar e Ativar';
             });
           };
        }).catch(function(err) {
           showToast(err.message, 'error');
           btn.disabled = false;
           btn.textContent = 'Configurar Agora';
        });
      };
    }

    // Disable 2FA button
    var btnDisable = container.querySelector('#btn-disable-2fa');
    if (btnDisable) {
      btnDisable.onclick = function() {
        if (!confirm('Tem certeza que deseja desativar o 2FA? Sua conta ficará menos segura.')) return;
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'Desativando...';
        
        API.post('/auth/2fa/disable').then(function() {
          showToast('2FA Desativado com sucesso', 'info');
          // Refresh user state
          API.get('/auth/me').then(function(u) {
            self.user = u;
            self.loadConfigTab('security');
          });
        }).catch(function(err) {
          showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Desativar Autenticação 2FA';
        });
      };
    }
  };

  _proto.bindWallpaperEvents = function () {
    var self = this;
    var overlay = document.getElementById('wallpaper-overlay');
    if (!overlay) return;

    var btnClose = overlay.querySelector('#btn-close-wallpaper');
    if (btnClose) btnClose.onclick = function () { overlay.remove(); };

    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };

    // Tabs
    overlay.querySelectorAll('.wallpaper-tab').forEach(function (tab) {
      tab.onclick = function () {
        overlay.querySelectorAll('.wallpaper-tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        var target = this.getAttribute('data-tab');
        
        overlay.querySelectorAll('.wallpaper-modal-content').forEach(function (c) { c.style.display = 'none'; });
        var targetEl = overlay.querySelector('#wallpaper-modal-' + target);
        if (targetEl) targetEl.style.display = 'block';
      };
    });

    // Gallery selection
    overlay.querySelectorAll('.wallpaper-item').forEach(function (item) {
      item.onclick = function () {
        var url = this.getAttribute('data-url');
        self.updateWallpaper(url);
        overlay.remove();
      };
    });

    // Upload
    var zone = overlay.querySelector('#wallpaper-upload-zone');
    var input = overlay.querySelector('#wallpaper-upload-input');
    if (zone && input) {
      zone.onclick = function () { input.click(); };
      input.onchange = function (e) {
        var file = e.target.files[0];
        if (file) self.uploadWallpaper(file, overlay);
      };
    }
  };

  _proto.updateWallpaper = function (url) {
    var self = this;
    API.post('/user/wallpaper', { wallpaper: url }).then(function (res) {
      if (res.success) {
        if (self.user) {
          self.user.settings = self.user.settings || {};
          self.user.settings.wallpaper = url;
        }
        var desktop = document.querySelector('.desktop-view');
        if (desktop) desktop.style.backgroundImage = 'url(' + url + ')';
        showToast('Papel de parede atualizado!', 'success');
      }
    });
  };

  _proto.uploadWallpaper = function (file, modal) {
    var self = this;
    var formData = new FormData();
    formData.append('wallpaper', file);

    showToast('Enviando imagem...', 'info');
    fetch('/api/user/wallpaper/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API.token },
      body: formData
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          if (self.user) {
            self.user.settings = self.user.settings || {};
            self.user.settings.wallpaper = res.wallpaper;
          }
          var desktop = document.querySelector('.desktop-view');
          if (desktop) desktop.style.backgroundImage = 'url(' + res.wallpaper + ')';
          if (modal) modal.remove();
          showToast('Papel de parede personalizado ativado!', 'success');
        } else {
          showToast(res.error || 'Erro no upload', 'error');
        }
      }).catch(function (err) { showToast(err.message, 'error'); });
  };

  _proto.bindAppStore = function bindAppStore() {
    var self = this;
    var body = document.getElementById('appstore-body');
    if (!body) return;

    API.get('/apps/list').then(function (available) {
      API.get('/apps/installed').then(function (installed) {
        var installedIds = (installed || []).map(function (a) { return a.id; });
        body.innerHTML = renderAppStore(available, installedIds);

        // Bind install buttons
        body.querySelectorAll('.btn-install:not(.installed)').forEach(function (btn) {
          btn.onclick = function () {
            var appId = this.getAttribute('data-app-id');
            var btnEl = this;
            btnEl.disabled = true;
            btnEl.textContent = 'Instalando...';

            API.post('/apps/install/' + appId).then(function (res) {
              if (res.success) {
                showToast('Aplicativo instalado!', 'success');
                self.bindAppStore(); // Refresh
              } else {
                btnEl.disabled = false;
                btnEl.textContent = 'Instalar';
                showToast(res.error || 'Falha na instalação', 'error');
              }
            }).catch(function (err) {
              btnEl.disabled = false;
              btnEl.textContent = 'Instalar';
              showToast(err.message, 'error');
            });
          };
        });

        // Bind install local buttons
        body.querySelectorAll('.btn-install-local').forEach(function (btn) {
          btn.onclick = function () {
            var appId = this.getAttribute('data-app-id');
            var btnEl = this;
            btnEl.disabled = true;
            btnEl.textContent = 'Extraindo...';

            showToast('Instalando aplicativo localmente (extraindo arquivos)...', 'info');

            API.post('/apps/install-local/' + appId).then(function (res) {
              if (res.success) {
                showToast('Aplicativo instalado com sucesso!', 'success');
                // Auto start after install
                API.post('/apps/start/' + appId).then(function () {
                  self.bindAppStore(); // Refresh
                });
              } else {
                btnEl.disabled = false;
                btnEl.textContent = 'Instalar Local';
                showToast(res.error || 'Falha na instalação local', 'error');
              }
            }).catch(function (err) {
              btnEl.disabled = false;
              btnEl.textContent = 'Instalar Local';
              showToast(err.message, 'error');
            });
          };
        });

        // Bind uninstall buttons
        body.querySelectorAll('.btn-uninstall-store').forEach(function (btn) {
          btn.onclick = function () {
            var appId = this.getAttribute('data-app-id');
            if (confirm('Tem certeza que deseja desinstalar este aplicativo?')) {
              API.post('/apps/uninstall/' + appId).then(function () {
                showToast('Aplicativo desinstalado!', 'success');
                self.bindAppStore(); // Refresh
                self.showDesktop(); // Update desktop
              }).catch(function (err) { showToast(err.message, 'error'); });
            }
          };
        });

        var btnClose = document.getElementById('btn-store-close');
        if (btnClose) btnClose.onclick = function () { self.navigate('desktop'); };
      });
    });
  };

  _proto.updateWeather = function updateWeather() {
    var self = this;
    self._lastWeather = Date.now();
    API.get('/admin/weather').then(function (data) {
      var weatherEl = document.getElementById('stat-weather');
      var descEl = document.getElementById('stat-weather-desc');
      var cityEl = document.getElementById('stat-weather-city');
      if (data && data.temp) {
        if (weatherEl) weatherEl.textContent = data.temp + '°C';
        if (descEl) descEl.textContent = data.desc || '--';
        if (cityEl) cityEl.textContent = data.city || '--';
      }
    }).catch(function (err) { console.log('Weather err:', err); });
  };

  _proto.startStatsUpdate = function startStatsUpdate() {
    var self = this;
    if (this._statsInterval) clearInterval(this._statsInterval);
    if (this._clockInterval) clearInterval(this._clockInterval);

    var updateStats = function () {
      if (self.currentView !== 'desktop') return;
      var container = document.getElementById('desktop-widgets');
      if (!container) return;

      API.get('/admin/stats').then(function (stats) {
        var cpuEl = document.getElementById('stat-cpu');
        var memEl = document.getElementById('stat-mem');
        var netInEl = document.getElementById('stat-net-in');
        var netOutEl = document.getElementById('stat-net-out');

        if (cpuEl && memEl && netInEl && netOutEl) {
          cpuEl.textContent = stats.cpu + '%';
          memEl.textContent = (stats.memory.used / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
          netInEl.innerHTML = Icons.down + ' ' + formatSize(stats.network.in) + '/s';
          netOutEl.innerHTML = Icons.up + ' ' + formatSize(stats.network.out) + '/s';
        } else {
          container.innerHTML = renderSystemWidget(stats);
        }
      }).catch(function (e) { console.error('Stats error:', e); });
    };

    var updateClock = function () {
      var timeEl = document.getElementById('stat-time');
      if (timeEl) {
        var now = new Date();
        timeEl.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      }
      if (!self._lastWeather || Date.now() - self._lastWeather > 3600000) {
        self.updateWeather();
      }
    };

    updateStats();
    updateClock();
    this._statsInterval = setInterval(updateStats, 5000);
    this._clockInterval = setInterval(updateClock, 1000);
  };

  return App;
}();

window.app = new App();
