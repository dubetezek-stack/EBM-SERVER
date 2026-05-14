"use strict";

var App = /*#__PURE__*/function () {
  function App() {
    this.user = null;
    this.currentView = null;
    this.currentParams = null;
    this.history = [];
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
      }).catch(function() {
        self.navigate('login', null, true);
      });
    });
  };

  _proto.navigate = function navigate(view, params, skipHistory) {
    var self = this; // Define self for use in event handlers
    var appEl = document.getElementById('app');
    if (!appEl) return;

    if (this.currentView === view && JSON.stringify(this.currentParams) === JSON.stringify(params)) return;
    
    if (!skipHistory && this.currentView && this.currentView !== 'login' && this.currentView !== 'setup') {
      this.history.push({ view: this.currentView, params: this.currentParams });
    }

    this.currentView = view;
    this.currentParams = params;
    console.log('Navegando para:', view, params);

    try {
      if (view === 'setup') {
        appEl.innerHTML = renderSetup();
        this.bindSetup();
      } else if (view === 'login') {
        appEl.innerHTML = renderLogin();
        this.bindLogin();
      } else if (view === 'desktop') {
        this.showDesktop();
      } else if (view === 'appstore') {
        this.showAppStore();
      } else if (view === 'explorer') {
        appEl.innerHTML = renderExplorer(this.user);
        this.bindExplorer(params ? params.driveId : null, params ? params.subpath : '');
        this.bindDock('files');
      } else if (view === 'speedtest') {
        appEl.innerHTML = renderExplorer(this.user);
        var contentArea = document.getElementById('content-area');
        if (contentArea) contentArea.innerHTML = renderSpeedTestView();
        this.bindExplorerActions();
        this.bindDock('files');
      } else if (view === 'cameras') {
        appEl.innerHTML = renderExplorer(this.user);
        var contentArea = document.getElementById('content-area');
        if (contentArea) {
          contentArea.innerHTML = renderCamerasView();
          this.bindCameras();
        }
        this.bindExplorerActions();
        this.bindDock('files');
      } else if (view === 'admin') {
        appEl.innerHTML = '<div class="admin-page-view">' + 
                            '<div class="admin-header" style="background:var(--bg-secondary);padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
                              '<div style="display:flex;align-items:center;gap:12px">' +
                                '<div style="color:var(--accent);font-size:24px">' + Icons.settings + '</div>' +
                                '<div>' +
                                  '<div style="font-size:18px;font-weight:700">Configurações do Sistema</div>' +
                                  '<div style="font-size:12px;color:var(--text-secondary)">Gerencie drives, usuários e segurança</div>' +
                                '</div>' +
                              '</div>' +
                              '<button class="btn-icon" id="btn-admin-close" style="background:rgba(255,255,255,0.05);border-radius:50%">' + Icons.close + '</button>' +
                            '</div>' +
                            '<div class="config-tabs" style="background:var(--bg-secondary);padding:0 24px;border-bottom:1px solid var(--border);display:flex;gap:20px">' +
                              '<button class="config-tab active" data-tab="drives" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent">Drives</button>' +
                              '<button class="config-tab" data-tab="users" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent">Usuários</button>' +
                              '<button class="config-tab" data-tab="sessions" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent">Conectados</button>' +
                              '<button class="config-tab" data-tab="server" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent">Servidor</button>' +
                              '<button class="config-tab" data-tab="cameras" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent">Câmeras</button>' +
                              '<button class="config-tab" data-tab="logs" style="padding:15px 0;background:none;border:none;color:var(--text-secondary);cursor:pointer;font-weight:500;border-bottom:2px solid transparent">Logs</button>' +
                            '</div>' +
                            '<div class="admin-content" id="config-body" style="flex:1;overflow-y:auto;padding:24px">' +
                              '<div class="loading"><div class="spinner"></div></div>' +
                            '</div>' +
                            renderDock() +
                          '</div>';
        this.bindConfig();
        this.loadConfigTab('drives');
        this.bindDock('settings');
        var btnClose = document.getElementById('btn-admin-close');
        if (btnClose) btnClose.onclick = function() { self.back(); };
      }
    } catch (e) {
      console.error('Navegação falhou:', e);
      appEl.innerHTML = '<div style="padding:40px;text-align:center;color:#fff;background:#000;height:100vh"><h2>Erro de Sistema</h2><p>' + e.message + '</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#0078d4;color:#fff;border:none;border-radius:4px;cursor:pointer">Recarregar</button></div>';
    }
  };

  _proto.back = function back() {
    var last = this.history.pop();
    if (last) {
      this.navigate(last.view, last.params, true);
    } else {
      this.navigate('desktop', null, true);
    }
  };

  // --- Auth Bindings ---
  _proto.bindLogin = function bindLogin() {
    var self = this;
    var form = document.getElementById('login-form');
    if (!form) return;
    form.onsubmit = function(e) {
      e.preventDefault();
      var user = document.getElementById('login-user').value.trim();
      var pass = document.getElementById('login-pass').value;
      var errEl = document.getElementById('auth-error');
      var btn = form.querySelector('button[type=submit]');
      
      btn.disabled = true;
      btn.textContent = 'Entrando...';
      
      API.post('/auth/login', { username: user, password: pass }).then(function(res) {
        if (res && res.token) {
          API.setToken(res.token);
          self.user = res.user;
          self.navigate('desktop');
        }
      }).catch(function(err) {
        errEl.textContent = err.message;
        errEl.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Entrar';
      });
    };
  };

  _proto.bindSetup = function bindSetup() {
    var self = this;
    var form = document.getElementById('setup-form');
    if (!form) return;
    form.onsubmit = function(e) {
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
      
      API.post('/auth/setup', { username: user, password: pass }).then(function(res) {
        if (res && res.token) {
          API.setToken(res.token);
          self.user = res.user;
          self.navigate('desktop');
        }
      }).catch(function(err) {
        errEl.textContent = err.message;
        errEl.classList.add('visible');
      });
    };
  };

  // --- Desktop & Dock ---
  _proto.showDesktop = function showDesktop() {
    var self = this;
    var appEl = document.getElementById('app');
    appEl.innerHTML = renderDesktop([], this.user);
    this.bindDock('home');
    this.bindDesktopEvents();
    
    API.get('/apps/installed').then(function(apps) {
      if (apps && self.currentView === 'desktop') {
        var grid = document.querySelector('.desktop-icons');
        if (grid) grid.innerHTML = renderDesktopIcons(apps);
      }
    }).catch(function(err) {
      console.error('Falha ao carregar apps:', err);
    });
  };

  _proto.bindDesktopEvents = function bindDesktopEvents() {
    var self = this;
    var appEl = document.getElementById('app');
    if (appEl._desktopBound) return;
    appEl._desktopBound = true;
    
    appEl.addEventListener('click', function(e) {
      var icon = e.target.closest('.desktop-icon');
      if (!icon) return;
      
      var appId = icon.getAttribute('data-app-id');
      if (icon.id === 'icon-explorer') appId = 'explorer';
      
      if (appId === 'explorer') self.navigate('explorer');
      else if (appId === 'speedtest') self.navigate('speedtest');
      else if (appId === 'cameras') self.navigate('cameras');
      else if (appId === 'settings') self.navigate('admin');
      else if (appId === 'plex') window.open('http://' + window.location.hostname + ':32400', '_blank');
      else if (appId === 'homeassistant') window.open('http://' + window.location.hostname + ':8123', '_blank');
    });

    document.addEventListener('input', function(e) {
      if (e.target.id === 'desktop-search-input') {
        var q = e.target.value.toLowerCase();
        document.querySelectorAll('.desktop-icon').forEach(function(icon) {
          var name = icon.querySelector('span').textContent.toLowerCase();
          icon.style.display = name.indexOf(q) > -1 ? 'flex' : 'none';
        });
      }
    });
  };

  _proto.bindDock = function bindDock(active) {
    var self = this;
    document.querySelectorAll('.dock-item').forEach(function(el) {
      var view = el.getAttribute('data-view');
      if (view === active) el.classList.add('active');
      else el.classList.remove('active');
      
      var newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      
      newEl.addEventListener('click', function() {
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
    
    Promise.all([API.get('/apps/list'), API.get('/apps/installed')]).then(function(res) {
      if (self.currentView === 'appstore') {
        appEl.innerHTML = renderAppStore(res[0] || [], (res[1] || []).map(function(a){return a.id;}));
        self.bindDock('store');
        self.bindAppStoreEvents();
        var header = document.querySelector('.app-store-header');
        if (header) {
          var btn = document.createElement('button');
          btn.className = 'btn-icon';
          btn.style.position = 'absolute';
          btn.style.top = '20px';
          btn.style.right = '20px';
          btn.innerHTML = Icons.close;
          btn.onclick = function() { self.back(); };
          header.style.position = 'relative';
          header.appendChild(btn);
        }
      }
    });
  };

  _proto.bindAppStoreEvents = function bindAppStoreEvents() {
    var self = this;
    document.querySelectorAll('.btn-install').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var appId = this.getAttribute('data-app-id');
        this.disabled = true;
        this.textContent = 'Instalando...';
        var currentBtn = this;
        API.post('/apps/install/' + appId).then(function() {
          showToast('App instalado!', 'success');
          currentBtn.textContent = 'Instalado';
          currentBtn.classList.add('installed');
        }).catch(function(e) {
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
    document.querySelectorAll('.config-tab').forEach(function(tab) {
      tab.onclick = function() {
        document.querySelectorAll('.config-tab').forEach(function(t){t.classList.remove('active');});
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

    if (tab === 'drives') {
      API.get('/admin/drives').then(function(drives) {
        body.innerHTML = renderDrivesConfig(drives || []);
        
        var btnSave = document.getElementById('drive-form-save');
        if (btnSave) {
          btnSave.onclick = function() {
            var id = document.getElementById('drive-edit-id').value;
            var data = {
              name: document.getElementById('cfg-drive-name').value,
              path: document.getElementById('cfg-drive-path').value,
              color: document.querySelector('.color-option.selected')?.getAttribute('data-color') || '#0078d4'
            };
            var promise = id ? API.put('/admin/drives/' + id, data) : API.post('/admin/drives', data);
            promise.then(function() {
              showToast('Drive salvo!', 'success');
              self.loadConfigTab('drives');
            }).catch(function(e) { showToast(e.message, 'error'); });
          };
        }
        
        document.querySelectorAll('.cfg-edit-drive').forEach(function(btn) {
          btn.onclick = function() {
            var id = this.getAttribute('data-id');
            var d = drives.find(function(x){return x.id === id;});
            if (d) {
              document.getElementById('drive-edit-id').value = d.id;
              document.getElementById('cfg-drive-name').value = d.name;
              document.getElementById('cfg-drive-path').value = d.path;
              document.getElementById('drive-form-title').textContent = 'Editar Drive';
            }
          };
        });

        document.querySelectorAll('.cfg-del-drive').forEach(function(btn) {
          btn.onclick = function() {
            var id = this.getAttribute('data-id');
            if (confirm('Remover drive?')) {
              API.del('/admin/drives/' + id).then(function() { self.loadConfigTab('drives'); });
            }
          };
        });
      }).catch(function(e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar drives: ' + e.message + '</div>'; });
    } else if (tab === 'users') {
      API.get('/admin/users').then(function(users) {
        body.innerHTML = renderUsersConfig(users || []);
        var btnSave = document.getElementById('user-form-save');
        if (btnSave) {
          btnSave.onclick = function() {
            var id = document.getElementById('user-edit-id').value;
            var data = {
              username: document.getElementById('cfg-user-name').value,
              password: document.getElementById('cfg-user-pass').value,
              role: document.getElementById('cfg-user-role').value
            };
            var promise = id ? API.put('/admin/users/' + id, data) : API.post('/admin/users', data);
            promise.then(function() {
              showToast('Usuário salvo!', 'success');
              self.loadConfigTab('users');
            }).catch(function(e) { showToast(e.message, 'error'); });
          };
        }
        document.querySelectorAll('.cfg-edit-user').forEach(function(btn) {
          btn.onclick = function() {
            document.getElementById('user-edit-id').value = this.getAttribute('data-id');
            document.getElementById('cfg-user-name').value = this.getAttribute('data-username');
            document.getElementById('cfg-user-role').value = this.getAttribute('data-role');
          };
        });
        document.querySelectorAll('.cfg-del-user').forEach(function(btn) {
          btn.onclick = function() {
            var id = this.getAttribute('data-id');
            if (confirm('Remover usuário?')) {
              API.del('/admin/users/' + id).then(function() { self.loadConfigTab('users'); });
            }
          };
        });
      }).catch(function(e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar usuários: ' + e.message + '</div>'; });
    } else if (tab === 'sessions') {
      API.get('/admin/sessions').then(function(sessions) {
        body.innerHTML = renderSessionsConfig(sessions || []);
        document.querySelectorAll('.cfg-kick-session').forEach(function(btn) {
          btn.onclick = function() {
            var id = this.getAttribute('data-id');
            API.del('/admin/sessions/' + id).then(function() { self.loadConfigTab('sessions'); });
          };
        });
      }).catch(function(e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar sessões: ' + e.message + '</div>'; });
    } else if (tab === 'server') {
      API.get('/admin/server').then(function(cfg) {
        body.innerHTML = renderServerConfig(cfg || {});
        
        var updateIP = function() {
          var el = document.getElementById('dns-public-ip');
          if (el) el.textContent = 'IP Atual: ...';
          API.get('/admin/server/ip').then(function(res) {
            if (el) el.textContent = 'IP Atual: ' + (res.ip || 'Erro');
          });
        };
        updateIP();

        // Bind IP Refresh
        var btnIpRefresh = document.getElementById('dns-ip-refresh');
        if (btnIpRefresh) btnIpRefresh.onclick = updateIP;

        // Startup status
        API.get('/admin/server/startup').then(function(res) {
          var toggle = document.getElementById('cfg-server-startup');
          if (toggle) toggle.checked = !!res.enabled;
        });

        // Toggle Startup
        var toggleStartup = document.getElementById('cfg-server-startup');
        if (toggleStartup) {
          toggleStartup.onchange = function() {
            API.post('/admin/server/startup', { enabled: this.checked }).then(function() {
              showToast('Configuração de inicialização alterada!', 'success');
            });
          };
        }

        // Save Server Name/Port
        var btnSaveServer = document.getElementById('server-config-save');
        if (btnSaveServer) {
          btnSaveServer.onclick = function() {
            var data = {
              serverName: document.getElementById('cfg-server-name').value,
              port: document.getElementById('cfg-server-port').value
            };
            API.put('/admin/server', data).then(function(res) {
              showToast('Configurações salvas!', 'success');
            });
          };
        }

        // Save DNS intervals
        var btnSaveDnsIntervals = document.getElementById('dns-auto-save');
        if (btnSaveDnsIntervals) {
          btnSaveDnsIntervals.onclick = function() {
            var data = {
              dnsAutoRefresh: document.getElementById('cfg-dns-auto').checked,
              dnsInterval: document.getElementById('cfg-dns-interval').value,
              dnsCheckInterval: document.getElementById('cfg-dns-check-interval').value
            };
            API.put('/admin/server', data).then(function() {
              showToast('Intervalos salvos!', 'success');
            });
          };
        }

        // Save/Edit DNS Record
        var btnSaveDns = document.getElementById('dns-form-save');
        if (btnSaveDns) {
          btnSaveDns.onclick = function() {
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

            API.put('/admin/server', { dnsRecords: records }).then(function() {
              showToast('Domínio salvo!', 'success');
              self.loadConfigTab('server');
            });
          };
        }

        // Test All DNS
        var btnTestAll = document.getElementById('server-dns-test');
        if (btnTestAll) {
          btnTestAll.onclick = function() {
            btnTestAll.disabled = true;
            API.post('/admin/server/ddns/test').then(function() {
              showToast('Sincronização iniciada!', 'success');
              btnTestAll.disabled = false;
              setTimeout(function() { self.loadConfigTab('server'); }, 2000);
            });
          };
        }

        // Row actions (Edit, Delete, Test, Toggle)
        document.querySelectorAll('.cfg-edit-dns').forEach(function(btn) {
          btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-index'));
            var r = cfg.dnsRecords[idx];
            document.getElementById('cfg-dns-index').value = idx;
            document.getElementById('cfg-dns-token').value = r.token;
            document.getElementById('cfg-dns-domains').value = r.domains;
            document.getElementById('cfg-dns-enabled').checked = r.enabled;
            document.getElementById('dns-form-title').textContent = 'Editar Domínio';
          };
        });

        document.querySelectorAll('.cfg-del-dns').forEach(function(btn) {
          btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-index'));
            if (confirm('Remover este domínio?')) {
              var records = cfg.dnsRecords || [];
              records.splice(idx, 1);
              API.put('/admin/server', { dnsRecords: records }).then(function() {
                self.loadConfigTab('server');
              });
            }
          };
        });

        document.querySelectorAll('.cfg-test-dns').forEach(function(btn) {
          btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-index'));
            API.post('/admin/server/ddns/test', { index: idx }).then(function() {
              showToast('Teste iniciado!', 'success');
              setTimeout(function() { self.loadConfigTab('server'); }, 2000);
            });
          };
        });

        document.querySelectorAll('.cfg-toggle-dns').forEach(function(el) {
          el.onchange = function() {
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
        var updateCountdowns = function() {
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
        var pollDdns = function() {
          var countdownEl = document.getElementById('dns-update-countdown');
          if (countdownEl) {
            API.get('/admin/server').then(function(newCfg) {
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
        var showOverlay = function(title, msg) {
          var over = document.createElement('div');
          over.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center';
          over.innerHTML = '<div class="spinner" style="margin-bottom:20px"></div><h2 style="margin-bottom:10px">' + title + '</h2><p style="color:var(--text-secondary)">' + msg + '</p>';
          document.body.appendChild(over);
        };

        var btnRestart = document.getElementById('server-restart');
        if (btnRestart) btnRestart.onclick = function() {
          if (confirm('Reiniciar o servidor?')) {
            showOverlay('Reiniciando Servidor', 'O sistema retornará em alguns segundos...');
            API.post('/admin/server/restart');
            setTimeout(function() { location.reload(); }, 8000);
          }
        };
        var btnShutdown = document.getElementById('server-shutdown');
        if (btnShutdown) btnShutdown.onclick = function() {
          if (confirm('Desligar o servidor?')) {
            showOverlay('Desligando Servidor', 'O sistema foi encerrado. Feche esta janela.');
            API.post('/admin/server/shutdown');
          }
        };
      }).catch(function(e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar servidor: ' + e.message + '</div>'; });
    } else if (tab === 'cameras') {
      API.get('/admin/server').then(function(cfg) {
        body.innerHTML = renderCamerasConfig(cfg || {});
        var btnSave = document.getElementById('cam-config-save');
        if (btnSave) {
          btnSave.onclick = function() {
            var camData = {
              ip: document.getElementById('cfg-cam-ip').value,
              port: document.getElementById('cfg-cam-port').value,
              rtspPort: document.getElementById('cfg-cam-rtsp').value,
              user: document.getElementById('cfg-cam-user').value,
              pass: document.getElementById('cfg-cam-pass').value
            };
            API.put('/admin/server', { camera: camData }).then(function() {
              showToast('Câmeras salvas!', 'success');
            });
          };
        }
      }).catch(function(e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar câmeras: ' + e.message + '</div>'; });
    } else if (tab === 'logs') {
      API.get('/admin/logs').then(function(logs) {
        var html = '<div class="logs-container" style="background:#000;padding:10px;border-radius:4px;font-family:monospace;font-size:12px;height:400px;overflow-y:auto;color:#0f0">';
        logs.reverse().forEach(function(l) {
          html += '<div>[' + l.time + '] [' + l.level + '] ' + escapeHtml(l.msg) + '</div>';
        });
        html += '</div>';
        body.innerHTML = html;
      }).catch(function(e) { body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Erro ao carregar logs: ' + e.message + '</div>'; });
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
      gridPlayers.forEach(function(p){ if(p) p.destroy(); });
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
      } catch(e) { console.error('Player error:', e); }
    }

    function playAll() {
      stopAll();
      if (mainPlayer) mainPlayer.style.display = 'none';
      
      slots.forEach(function(slot) {
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
        } catch(e) { console.error('Grid player error:', e); }
      });
    }

    slots.forEach(function(slot) {
      slot.onclick = function() {
        var camId = this.getAttribute('data-cam');
        slots.forEach(function(s){
          s.style.borderColor = 'rgba(255,255,255,0.1)';
          var c = s.querySelector('canvas');
          if (c) c.remove();
        });
        this.style.borderColor = 'var(--accent-blue)';
        playCam(camId, currentQuality);
      };
    });

    qualityBtns.forEach(function(btn) {
      btn.onclick = function() {
        qualityBtns.forEach(function(b){b.classList.remove('active'); b.style.background='transparent';});
        this.classList.add('active');
        this.style.background = 'var(--accent-blue)';
        currentQuality = this.getAttribute('data-quality');
        playCam(currentCam, currentQuality);
      };
    });

    if (btnToggleGrid) {
      btnToggleGrid.onclick = function() {
        playAll();
      };
    }
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

  _proto.bindExplorerActions = function bindExplorerActions() {
    var self = this;
    var search = document.getElementById('search-input');
    if (search) {
      search.oninput = function(e) {
        var q = e.target.value.toLowerCase();
        document.querySelectorAll('.file-row, .drive-card').forEach(function(item) {
          var name = (item.querySelector('.file-name') || item.querySelector('.drive-name')).textContent.toLowerCase();
          item.style.display = name.indexOf(q) > -1 ? '' : 'none';
        });
      };
    }
    var btnHome = document.getElementById('btn-home');
    if (btnHome) btnHome.onclick = function() { self.navigate('desktop'); };
    
    var btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.onclick = function() { self.back(); };

    var btnSpeed = document.getElementById('btn-speedtest');
    if (btnSpeed) btnSpeed.onclick = function() { self.navigate('speedtest'); };

    var btnCams = document.getElementById('btn-cameras');
    if (btnCams) btnCams.onclick = function() { self.navigate('cameras'); };

    var btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.onclick = function() { API.clearToken(); self.navigate('login'); };

    var btnConfig = document.getElementById('btn-config');
    if (btnConfig) btnConfig.onclick = function() { self.navigate('admin'); };

    var topBar = document.querySelector('.top-bar-actions');
    if (topBar && !document.getElementById('btn-topbar-close')) {
      var btnClose = document.createElement('button');
      btnClose.id = 'btn-topbar-close';
      btnClose.className = 'btn-icon';
      btnClose.innerHTML = Icons.close;
      btnClose.onclick = function() { self.navigate('desktop'); };
      topBar.insertBefore(btnClose, topBar.firstChild);
    }
  };

  _proto.loadDrives = function loadDrives() {
    var self = this;
    var content = document.getElementById('content-area');
    if (content) content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    API.get('/files/drives').then(function(drives) {
      self.drives = drives || [];
      if (content) {
        content.innerHTML = renderDrives(drives);
        document.querySelectorAll('.drive-card').forEach(function(el) {
          el.onclick = function() {
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
    
    API.get('/files/list?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath)).then(function(res) {
      if (content && res) {
        content.innerHTML = renderFileList(res.files || [], driveId, subpath, res.permissions);
        self.bindFileActions(driveId, subpath);
      }
    });
  };

  _proto.bindFileActions = function bindFileActions(driveId, subpath) {
    var self = this;
    document.querySelectorAll('.file-row').forEach(function(el) {
      el.onclick = function(e) {
        if (e.target.closest('.btn-delete-file')) return;
        var name = this.getAttribute('data-name');
        var isDir = this.getAttribute('data-is-dir') === 'true';
        if (isDir) {
          var newPath = subpath ? subpath + '/' + name : name;
          self.navigate('explorer', { driveId: driveId, subpath: newPath });
        }
      };
    });
  };

  return App;
}();

window.app = new App();
