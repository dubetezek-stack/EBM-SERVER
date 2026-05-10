"use strict";

function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Main App
var App = /*#__PURE__*/function () {
  function App() {
    _classCallCheck(this, App);
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
  return _createClass(App, [{
    key: "init",
    value: function init() {
      var self = this;
      API.get('/auth/status').then(function (status) {
        if (!status || !status.setupComplete) {
          self.navigate('setup');
          return;
        }
        if (!API.token) {
          self.navigate('login');
          return;
        }
        API.get('/auth/me').then(function (user) {
          if (user) {
            self.user = user;
            self.navigate('explorer');
          } else {
            API.clearToken();
            self.navigate('login');
          }
        }).catch(function (e) {
          API.clearToken();
          self.navigate('login');
        });
      }).catch(function (e) {
        self.navigate('login');
      });
    }
  }, {
    key: "navigate",
    value: function navigate(view) {
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
      } catch (e) {
        appEl.innerHTML = '<div style="padding:40px;text-align:center;color:#999"><p>Erro ao carregar: ' + (e.message || 'Desconhecido') + '</p><button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#0078d4;color:#fff;border:none;border-radius:6px;cursor:pointer">Recarregar</button></div>';
      }
    }

    // === AUTH ===
  }, {
    key: "bindSetup",
    value: function bindSetup() {
      document.getElementById('setup-form').onsubmit = /*#__PURE__*/function () {
        var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(e) {
          var errEl, btn, user, pass, pass2, res, _t;
          return _regenerator().w(function (_context) {
            while (1) switch (_context.p = _context.n) {
              case 0:
                e.preventDefault();
                errEl = document.getElementById('auth-error');
                btn = e.target.querySelector('button[type=submit]');
                user = document.getElementById('setup-user').value.trim();
                pass = document.getElementById('setup-pass').value;
                pass2 = document.getElementById('setup-pass2').value;
                if (!(pass !== pass2)) {
                  _context.n = 1;
                  break;
                }
                errEl.textContent = 'As senhas não coincidem';
                errEl.classList.add('visible');
                return _context.a(2);
              case 1:
                btn.disabled = true;
                btn.textContent = 'Criando...';
                _context.p = 2;
                _context.n = 3;
                return API.post('/auth/setup', {
                  username: user,
                  password: pass
                });
              case 3:
                res = _context.v;
                if (res && res.token) {
                  API.setToken(res.token);
                  window.app.user = res.user;
                  showToast('Administrador criado com sucesso!', 'success');
                  window.app.navigate('explorer');
                } else {
                  errEl.textContent = 'Resposta inválida do servidor';
                  errEl.classList.add('visible');
                }
                _context.n = 5;
                break;
              case 4:
                _context.p = 4;
                _t = _context.v;
                errEl.textContent = _t.message;
                errEl.classList.add('visible');
              case 5:
                btn.disabled = false;
                btn.textContent = 'Criar Administrador';
              case 6:
                return _context.a(2);
            }
          }, _callee, null, [[2, 4]]);
        }));
        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }();
    }
  }, {
    key: "bindLogin",
    value: function bindLogin() {
      document.getElementById('login-form').onsubmit = /*#__PURE__*/function () {
        var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(e) {
          var errEl, btn, userVal, passVal, res, _t2;
          return _regenerator().w(function (_context2) {
            while (1) switch (_context2.p = _context2.n) {
              case 0:
                e.preventDefault();
                errEl = document.getElementById('auth-error');
                btn = e.target.querySelector('button[type=submit]');
                errEl.classList.remove('visible');
                userVal = document.getElementById('login-user').value.trim();
                passVal = document.getElementById('login-pass').value;
                if (userVal) {
                  _context2.n = 1;
                  break;
                }
                errEl.textContent = 'Digite o nome de usuário';
                errEl.classList.add('visible');
                return _context2.a(2);
              case 1:
                if (passVal) {
                  _context2.n = 2;
                  break;
                }
                errEl.textContent = 'Digite a senha';
                errEl.classList.add('visible');
                return _context2.a(2);
              case 2:
                btn.disabled = true;
                btn.textContent = 'Entrando...';
                _context2.p = 3;
                _context2.n = 4;
                return API.post('/auth/login', {
                  username: userVal,
                  password: passVal
                });
              case 4:
                res = _context2.v;
                if (res && res.token) {
                  API.setToken(res.token);
                  window.app.user = res.user;
                  window.app.navigate('explorer');
                } else {
                  errEl.textContent = 'Erro: servidor não retornou token de acesso';
                  errEl.classList.add('visible');
                }
                _context2.n = 6;
                break;
              case 5:
                _context2.p = 5;
                _t2 = _context2.v;
                errEl.textContent = _t2.message || 'Erro de conexão com o servidor';
                errEl.classList.add('visible');
              case 6:
                btn.disabled = false;
                btn.textContent = 'Entrar';
              case 7:
                return _context2.a(2);
            }
          }, _callee2, null, [[3, 5]]);
        }));
        return function (_x2) {
          return _ref2.apply(this, arguments);
        };
      }();
    }

    // === EXPLORER ===
  }, {
    key: "bindExplorer",
    value: function bindExplorer() {
      var self = this;
      var el;
      el = document.getElementById('btn-back');
      if (el) el.addEventListener('click', function () {
        self.goBack();
      });
      el = document.getElementById('btn-up');
      if (el) el.addEventListener('click', function () {
        self.goUp();
      });
      el = document.getElementById('btn-home');
      if (el) el.addEventListener('click', function () {
        self.loadDrives();
      });
      el = document.getElementById('btn-config');
      if (el) el.addEventListener('click', function () {
        self.openConfig();
      });
      el = document.getElementById('btn-logout');
      if (el) el.addEventListener('click', function () {
        API.clearToken();
        self.navigate('login');
      });
      el = document.getElementById('btn-upload');
      if (el) el.addEventListener('click', function () {
        self.showUpload();
      });
      var searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.addEventListener('input', function () {
        self.filterFiles(searchInput.value);
      });

      // Drag & drop on content area (master+ only)
      var role = self.user && self.user.role || '';
      var content = document.getElementById('content-area');
      if (content && (role === 'master' || role === 'admin')) {
        content.addEventListener('dragover', function (e) {
          e.preventDefault();
        });
        content.addEventListener('drop', function (e) {
          e.preventDefault();
          if (self.currentDriveId && e.dataTransfer.files.length) {
            self.doUpload(e.dataTransfer.files);
          }
        });
      }
    }
  }, {
    key: "updateBreadcrumb",
    value: function updateBreadcrumb() {
      var _this = this;
      var bc = document.getElementById('breadcrumb');
      if (!bc) return;
      var html = "<span class=\"breadcrumb-item\" data-nav=\"home\">Este Computador</span>";
      if (this.currentDriveId) {
        html += "<span class=\"breadcrumb-sep\">\u203A</span><span class=\"breadcrumb-item\" data-nav=\"drive\">".concat(escapeHtml(this._driveName || ''), "</span>");
        if (this.currentSubpath) {
          var parts = this.currentSubpath.split('/');
          parts.forEach(function (p, i) {
            var sub = parts.slice(0, i + 1).join('/');
            var isLast = i === parts.length - 1;
            html += "<span class=\"breadcrumb-sep\">\u203A</span><span class=\"breadcrumb-item ".concat(isLast ? 'active' : '', "\" data-nav=\"sub\" data-subpath=\"").concat(escapeHtml(sub), "\">").concat(escapeHtml(p), "</span>");
          });
        }
      }
      bc.innerHTML = html;
      bc.querySelectorAll('.breadcrumb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var nav = item.dataset.nav;
          if (nav === 'home') _this.loadDrives();else if (nav === 'drive') _this.loadFiles(_this.currentDriveId, '');else if (nav === 'sub') _this.loadFiles(_this.currentDriveId, item.dataset.subpath);
        });
      });
      // Scroll breadcrumb to end
      bc.scrollLeft = bc.scrollWidth;
    }
  }, {
    key: "pushHistory",
    value: function pushHistory() {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push({
        driveId: this.currentDriveId,
        subpath: this.currentSubpath
      });
      this.historyIndex = this.history.length - 1;
    }
  }, {
    key: "goBack",
    value: function goBack() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        var h = this.history[this.historyIndex];
        if (h.driveId) this.loadFiles(h.driveId, h.subpath, true);else this.loadDrives(true);
      }
    }
  }, {
    key: "goUp",
    value: function goUp() {
      if (!this.currentDriveId) return;
      if (!this.currentSubpath) {
        this.loadDrives();
        return;
      }
      var parts = this.currentSubpath.split('/');
      parts.pop();
      this.loadFiles(this.currentDriveId, parts.join('/'));
    }
  }, {
    key: "loadDrives",
    value: function () {
      var _loadDrives = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(noHistory) {
        var _this2 = this;
        var content, drives, _t3;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              this.currentDriveId = null;
              this.currentSubpath = '';
              this._driveName = '';
              if (!noHistory) this.pushHistory();
              this.updateBreadcrumb();
              content = document.getElementById('content-area');
              if (content) {
                _context3.n = 1;
                break;
              }
              return _context3.a(2);
            case 1:
              content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
              _context3.p = 2;
              _context3.n = 3;
              return API.get('/files/drives');
            case 3:
              drives = _context3.v;
              content.innerHTML = renderDrives(drives);
              content.querySelectorAll('.drive-card').forEach(function (card) {
                card.addEventListener('click', function () {
                  var id = card.dataset.driveId;
                  var d = drives.find(function (x) {
                    return x.id === id;
                  });
                  if (d) _this2.loadFiles(id, '', false, d.name);
                });
              });
              _context3.n = 5;
              break;
            case 4:
              _context3.p = 4;
              _t3 = _context3.v;
              content.innerHTML = "<div class=\"empty-state\"><p>".concat(_t3.message, "</p></div>");
            case 5:
              return _context3.a(2);
          }
        }, _callee3, this, [[2, 4]]);
      }));
      function loadDrives(_x3) {
        return _loadDrives.apply(this, arguments);
      }
      return loadDrives;
    }()
  }, {
    key: "loadFiles",
    value: function () {
      var _loadFiles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(driveId, subpath, noHistory, driveName) {
        var content, data, _t4;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              this.currentDriveId = driveId;
              this.currentSubpath = subpath || '';
              if (driveName) this._driveName = driveName;
              if (!noHistory) this.pushHistory();
              this.updateBreadcrumb();
              content = document.getElementById('content-area');
              if (content) {
                _context4.n = 1;
                break;
              }
              return _context4.a(2);
            case 1:
              content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
              _context4.p = 2;
              _context4.n = 3;
              return API.get("/files/list?driveId=".concat(driveId, "&subpath=").concat(encodeURIComponent(subpath || '')));
            case 3:
              data = _context4.v;
              this._driveName = data.driveName;
              this.updateBreadcrumb();
              this.allFiles = data.files;
              this.sortAndRender(data);
              _context4.n = 5;
              break;
            case 4:
              _context4.p = 4;
              _t4 = _context4.v;
              content.innerHTML = "<div class=\"empty-state\"><p>".concat(_t4.message, "</p></div>");
            case 5:
              return _context4.a(2);
          }
        }, _callee4, this, [[2, 4]]);
      }));
      function loadFiles(_x4, _x5, _x6, _x7) {
        return _loadFiles.apply(this, arguments);
      }
      return loadFiles;
    }()
  }, {
    key: "sortAndRender",
    value: function sortAndRender(data) {
      var _this3 = this;
      var srcFiles = data && data.files ? data.files : this.allFiles;
      var files = srcFiles.slice();
      // Folders first, then sort
      files.sort(function (a, b) {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        var va, vb;
        if (_this3.sortCol === 'name') {
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
        } else if (_this3.sortCol === 'modified') {
          va = a.modified;
          vb = b.modified;
        } else if (_this3.sortCol === 'type') {
          va = a.type || '';
          vb = b.type || '';
        } else if (_this3.sortCol === 'size') {
          va = a.size || 0;
          vb = b.size || 0;
        }
        if (va < vb) return _this3.sortAsc ? -1 : 1;
        if (va > vb) return _this3.sortAsc ? 1 : -1;
        return 0;
      });
      var renderData = {
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
  }, {
    key: "bindFileList",
    value: function bindFileList() {
      var _this4 = this;
      // Sort headers
      document.querySelectorAll('.file-table th[data-sort]').forEach(function (th) {
        th.addEventListener('click', function () {
          var col = th.dataset.sort;
          if (_this4.sortCol === col) _this4.sortAsc = !_this4.sortAsc;else {
            _this4.sortCol = col;
            _this4.sortAsc = true;
          }
          _this4.sortAndRender();
        });
      });

      // File rows
      document.querySelectorAll('.file-row').forEach(function (row) {
        row.addEventListener('click', function (e) {
          // Don't navigate if clicking the delete button
          if (e.target.closest('.btn-delete-file')) return;
          if (row.dataset.isDir === 'true') {
            _this4.loadFiles(row.dataset.driveId, row.dataset.subpath);
          } else {
            var file = _this4.allFiles.find(function (f) {
              return f.name === row.dataset.name;
            });
            if (file && canPreview(file)) {
              _this4.openPreview(file, row.dataset.driveId, row.dataset.subpath);
            } else {
              _this4.downloadFile(row.dataset.driveId, row.dataset.subpath);
            }
          }
        });
      });

      // Delete buttons (admin only)
      document.querySelectorAll('.btn-delete-file').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var name = btn.dataset.name;
          var isDir = btn.dataset.isDir === 'true';
          var tipo = isDir ? 'a pasta' : 'o arquivo';
          var msg = "Tem certeza que deseja apagar ".concat(tipo, " \"").concat(name, "\"?").concat(isDir ? '\n\nTodo o conteúdo da pasta será apagado permanentemente!' : '');
          if (confirm(msg)) {
            _this4.deleteFile(btn.dataset.driveId, btn.dataset.subpath, name);
          }
        });
      });
    }
  }, {
    key: "filterFiles",
    value: function filterFiles(query) {
      if (!query) {
        this.sortAndRender();
        return;
      }
      var q = query.toLowerCase();
      var filtered = this.allFiles.filter(function (f) {
        return f.name.toLowerCase().indexOf(q) >= 0;
      });
      var content = document.getElementById('content-area');
      if (!content) return;
      content.innerHTML = renderFileList(filtered, this.currentDriveId, this.currentSubpath);
      this.bindFileList();
    }

    // === PREVIEW ===
  }, {
    key: "openPreview",
    value: function openPreview(file, driveId, subpath) {
      var _this5 = this;
      var modal = document.getElementById('preview-modal');
      var title = document.getElementById('preview-title');
      var body = document.getElementById('preview-content');
      title.textContent = file.name;
      modal.classList.remove('hidden');
      var previewUrl = "/api/files/preview?driveId=".concat(driveId, "&subpath=").concat(encodeURIComponent(subpath));
      var ext = (file.extension || '').toLowerCase();
      var imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      var vidExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
      var audExts = ['.mp3', '.wav', '.flac', '.ogg'];
      if (imgExts.indexOf(ext) >= 0) {
        body.innerHTML = '<img src="' + previewUrl + '&token=' + API.token + '" alt="' + escapeHtml(file.name) + '">';
      } else if (vidExts.indexOf(ext) >= 0) {
        body.innerHTML = '<video controls autoplay src="' + previewUrl + '&token=' + API.token + '"></video>';
      } else if (audExts.indexOf(ext) >= 0) {
        body.innerHTML = '<audio controls autoplay src="' + previewUrl + '&token=' + API.token + '" style="width:100%;max-width:500px"></audio>';
      } else if (ext === '.pdf') {
        body.innerHTML = "<iframe src=\"".concat(previewUrl, "&token=").concat(API.token, "\"></iframe>");
      } else {
        // Text preview
        body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        fetch(previewUrl, {
          headers: {
            Authorization: 'Bearer ' + API.token
          }
        }).then(function (r) {
          return r.json();
        }).then(function (d) {
          body.innerHTML = "<pre>".concat(escapeHtml(d.content || ''), "</pre>");
        }).catch(function () {
          body.innerHTML = '<p>Erro ao carregar preview</p>';
        });
      }

      // Bind close
      document.getElementById('preview-close').onclick = function () {
        return modal.classList.add('hidden');
      };
      document.querySelector('.modal-backdrop').onclick = function () {
        return modal.classList.add('hidden');
      };
      document.getElementById('preview-download').onclick = function () {
        return _this5.downloadFile(driveId, subpath);
      };
    }
  }, {
    key: "downloadFile",
    value: function downloadFile(driveId, subpath) {
      var url = "/api/files/download?driveId=".concat(driveId, "&subpath=").concat(encodeURIComponent(subpath));
      var a = document.createElement('a');
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
  }, {
    key: "deleteFile",
    value: function () {
      var _deleteFile = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(driveId, subpath, name) {
        var _t5;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.p = _context5.n) {
            case 0:
              _context5.p = 0;
              _context5.n = 1;
              return API.request("/files/delete?driveId=".concat(driveId, "&subpath=").concat(encodeURIComponent(subpath)), {
                method: 'DELETE'
              });
            case 1:
              showToast("\"".concat(name, "\" apagado com sucesso"), 'success');
              this.loadFiles(this.currentDriveId, this.currentSubpath, true);
              _context5.n = 3;
              break;
            case 2:
              _context5.p = 2;
              _t5 = _context5.v;
              showToast(_t5.message, 'error');
            case 3:
              return _context5.a(2);
          }
        }, _callee5, this, [[0, 2]]);
      }));
      function deleteFile(_x8, _x9, _x0) {
        return _deleteFile.apply(this, arguments);
      }
      return deleteFile;
    }() // === UPLOAD ===
  }, {
    key: "showUpload",
    value: function showUpload() {
      var _this6 = this;
      if (!this.currentDriveId) {
        showToast('Selecione um drive primeiro', 'error');
        return;
      }
      var content = document.getElementById('content-area');
      var existing = document.getElementById('upload-zone');
      if (existing) {
        existing.remove();
        return;
      }
      content.insertAdjacentHTML('afterbegin', renderUploadZone());
      var zone = document.getElementById('upload-zone');
      var input = document.getElementById('upload-input');
      zone.addEventListener('click', function () {
        return input.click();
      });
      zone.addEventListener('dragover', function (e) {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      zone.addEventListener('dragleave', function () {
        return zone.classList.remove('dragover');
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        _this6.doUpload(e.dataTransfer.files);
      });
      input.addEventListener('change', function () {
        if (input.files.length) _this6.doUpload(input.files);
      });
    }
  }, {
    key: "doUpload",
    value: function () {
      var _doUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(files) {
        var zone, _t6;
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.p = _context6.n) {
            case 0:
              zone = document.getElementById('upload-zone');
              if (zone) zone.innerHTML = "<div class=\"upload-progress\"><div class=\"upload-progress-bar\"><div class=\"upload-progress-fill\" id=\"upload-fill\" style=\"width:0%\"></div></div><span class=\"upload-progress-text\" id=\"upload-text\">0%</span></div>";
              _context6.p = 1;
              _context6.n = 2;
              return API.uploadFiles(this.currentDriveId, this.currentSubpath, files, function (pct) {
                var fill = document.getElementById('upload-fill');
                var text = document.getElementById('upload-text');
                if (fill) fill.style.width = pct + '%';
                if (text) text.textContent = pct + '%';
              });
            case 2:
              showToast('Upload concluído!', 'success');
              this.loadFiles(this.currentDriveId, this.currentSubpath, true);
              _context6.n = 4;
              break;
            case 3:
              _context6.p = 3;
              _t6 = _context6.v;
              showToast('Erro: ' + _t6.message, 'error');
            case 4:
              return _context6.a(2);
          }
        }, _callee6, this, [[1, 3]]);
      }));
      function doUpload(_x1) {
        return _doUpload.apply(this, arguments);
      }
      return doUpload;
    }() // === CONFIG ===
  }, {
    key: "openConfig",
    value: function openConfig() {
      document.body.insertAdjacentHTML('beforeend', renderConfigPanel());
      this.bindConfig();
      window.app.loadConfigTab('drives');
    }
  }, {
    key: "closeConfig",
    value: function closeConfig() {
      var el = document.getElementById('config-overlay');
      if (el) el.remove();
    }
  }, {
    key: "bindConfig",
    value: function bindConfig() {
      var _this7 = this;
      var self = this;
      var el;
      el = document.getElementById('config-close');
      if (el) el.addEventListener('click', function () {
        self.closeConfig();
      });
      el = document.getElementById('config-close-backdrop');
      if (el) el.addEventListener('click', function () {
        self.closeConfig();
      });
      document.querySelectorAll('.config-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          document.querySelectorAll('.config-tab').forEach(function (t) {
            return t.classList.remove('active');
          });
          tab.classList.add('active');
          _this7.configTab = tab.dataset.tab;
          _this7.loadConfigTab(tab.dataset.tab);
        });
      });
    }
  }, {
    key: "loadConfigTab",
    value: function () {
      var _loadConfigTab = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(tab) {
        var body, drives, users, sessions, serverCfg, _t7;
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.p = _context7.n) {
            case 0:
              body = document.getElementById('config-body');
              if (body) {
                _context7.n = 1;
                break;
              }
              return _context7.a(2);
            case 1:
              body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
              _context7.p = 2;
              if (!(tab === 'drives')) {
                _context7.n = 4;
                break;
              }
              _context7.n = 3;
              return API.get('/admin/drives');
            case 3:
              drives = _context7.v;
              body.innerHTML = renderDrivesConfig(drives || []);
              this.bindDrivesConfig(drives || []);
              _context7.n = 10;
              break;
            case 4:
              if (!(tab === 'users')) {
                _context7.n = 6;
                break;
              }
              _context7.n = 5;
              return API.get('/admin/users');
            case 5:
              users = _context7.v;
              body.innerHTML = renderUsersConfig(users || []);
              this.bindUsersConfig(users || []);
              _context7.n = 10;
              break;
            case 6:
              if (!(tab === 'sessions')) {
                _context7.n = 8;
                break;
              }
              _context7.n = 7;
              return API.get('/admin/sessions');
            case 7:
              sessions = _context7.v;
              body.innerHTML = renderSessionsConfig(sessions || []);
              this.bindSessionsConfig();
              _context7.n = 10;
              break;
            case 8:
              if (!(tab === 'server')) {
                _context7.n = 10;
                break;
              }
              _context7.n = 9;
              return API.get('/admin/server');
            case 9:
              serverCfg = _context7.v;
              body.innerHTML = renderServerConfig(serverCfg || {});
              this.bindServerConfig();
            case 10:
              _context7.n = 12;
              break;
            case 11:
              _context7.p = 11;
              _t7 = _context7.v;
              body.innerHTML = '<p style="padding:20px;color:var(--text-muted)">' + (_t7.message || 'Erro') + '</p>';
            case 12:
              return _context7.a(2);
          }
        }, _callee7, this, [[2, 11]]);
      }));
      function loadConfigTab(_x10) {
        return _loadConfigTab.apply(this, arguments);
      }
      return loadConfigTab;
    }()
  }, {
    key: "bindDrivesConfig",
    value: function bindDrivesConfig(drives) {
      var _this8 = this;
      var selectedColor = DRIVE_COLORS[0];
      document.querySelectorAll('.color-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          document.querySelectorAll('.color-option').forEach(function (o) {
            return o.classList.remove('selected');
          });
          opt.classList.add('selected');
          selectedColor = opt.dataset.color;
        });
      });
      document.querySelectorAll('.cfg-edit-drive').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var d = drives.find(function (x) {
            return x.id === btn.dataset.id;
          });
          if (!d) return;
          document.getElementById('drive-edit-id').value = d.id;
          document.getElementById('cfg-drive-name').value = d.name;
          document.getElementById('cfg-drive-path').value = d.path;
          document.getElementById('drive-form-title').textContent = 'Editar Drive';
          document.querySelectorAll('.color-option').forEach(function (o) {
            o.classList.toggle('selected', o.dataset.color === d.color);
            if (o.dataset.color === d.color) selectedColor = d.color;
          });
        });
      });
      document.querySelectorAll('.cfg-del-drive').forEach(function (btn) {
        btn.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
          var _t8;
          return _regenerator().w(function (_context8) {
            while (1) switch (_context8.p = _context8.n) {
              case 0:
                if (confirm('Remover este drive?')) {
                  _context8.n = 1;
                  break;
                }
                return _context8.a(2);
              case 1:
                _context8.p = 1;
                _context8.n = 2;
                return API.del('/admin/drives/' + btn.dataset.id);
              case 2:
                showToast('Drive removido', 'success');
                _this8.loadConfigTab('drives');
                _context8.n = 4;
                break;
              case 3:
                _context8.p = 3;
                _t8 = _context8.v;
                showToast(_t8.message, 'error');
              case 4:
                return _context8.a(2);
            }
          }, _callee8, null, [[1, 3]]);
        })));
      });
      var cancelBtn = document.getElementById('drive-form-cancel');
      if (cancelBtn) cancelBtn.addEventListener('click', function () {
        document.getElementById('drive-edit-id').value = '';
        document.getElementById('cfg-drive-name').value = '';
        document.getElementById('cfg-drive-path').value = '';
        document.getElementById('drive-form-title').textContent = 'Adicionar Drive';
      });
      var saveBtn = document.getElementById('drive-form-save');
      if (saveBtn) saveBtn.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
        var editId, name, path, _t9;
        return _regenerator().w(function (_context9) {
          while (1) switch (_context9.p = _context9.n) {
            case 0:
              editId = document.getElementById('drive-edit-id').value;
              name = document.getElementById('cfg-drive-name').value.trim();
              path = document.getElementById('cfg-drive-path').value.trim();
              if (!(!name || !path)) {
                _context9.n = 1;
                break;
              }
              showToast('Nome e caminho são obrigatórios', 'error');
              return _context9.a(2);
            case 1:
              _context9.p = 1;
              if (!editId) {
                _context9.n = 3;
                break;
              }
              _context9.n = 2;
              return API.put('/admin/drives/' + editId, {
                name,
                path,
                color: selectedColor
              });
            case 2:
              showToast('Drive atualizado', 'success');
              _context9.n = 5;
              break;
            case 3:
              _context9.n = 4;
              return API.post('/admin/drives', {
                name,
                path,
                color: selectedColor
              });
            case 4:
              showToast('Drive adicionado', 'success');
            case 5:
              window.app.loadConfigTab('drives');
              _context9.n = 7;
              break;
            case 6:
              _context9.p = 6;
              _t9 = _context9.v;
              showToast(_t9.message, 'error');
            case 7:
              return _context9.a(2);
          }
        }, _callee9, this, [[1, 6]]);
      })));
    }
  }, {
    key: "bindUsersConfig",
    value: function bindUsersConfig(users) {
      var _this9 = this;
      document.querySelectorAll('.cfg-edit-user').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.getElementById('user-edit-id').value = btn.dataset.id;
          document.getElementById('cfg-user-name').value = btn.dataset.username;
          document.getElementById('cfg-user-pass').value = '';
          document.getElementById('cfg-user-role').value = btn.dataset.role;
          document.getElementById('user-form-title').textContent = 'Editar Usuário';
        });
      });
      document.querySelectorAll('.cfg-del-user').forEach(function (btn) {
        btn.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
          var _t0;
          return _regenerator().w(function (_context0) {
            while (1) switch (_context0.p = _context0.n) {
              case 0:
                if (confirm('Remover este usuário?')) {
                  _context0.n = 1;
                  break;
                }
                return _context0.a(2);
              case 1:
                _context0.p = 1;
                _context0.n = 2;
                return API.del('/admin/users/' + btn.dataset.id);
              case 2:
                showToast('Usuário removido', 'success');
                _this9.loadConfigTab('users');
                _context0.n = 4;
                break;
              case 3:
                _context0.p = 3;
                _t0 = _context0.v;
                showToast(_t0.message, 'error');
              case 4:
                return _context0.a(2);
            }
          }, _callee0, null, [[1, 3]]);
        })));
      });
      var cancelBtn2 = document.getElementById('user-form-cancel');
      if (cancelBtn2) cancelBtn2.addEventListener('click', function () {
        document.getElementById('user-edit-id').value = '';
        document.getElementById('cfg-user-name').value = '';
        document.getElementById('cfg-user-pass').value = '';
        document.getElementById('user-form-title').textContent = 'Adicionar Usuário';
      });
      var saveBtn2 = document.getElementById('user-form-save');
      if (saveBtn2) saveBtn2.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
        var editId, username, password, role, body, _t1;
        return _regenerator().w(function (_context1) {
          while (1) switch (_context1.p = _context1.n) {
            case 0:
              editId = document.getElementById('user-edit-id').value;
              username = document.getElementById('cfg-user-name').value.trim();
              password = document.getElementById('cfg-user-pass').value;
              role = document.getElementById('cfg-user-role').value;
              if (username) {
                _context1.n = 1;
                break;
              }
              showToast('Nome é obrigatório', 'error');
              return _context1.a(2);
            case 1:
              if (!(!editId && !password)) {
                _context1.n = 2;
                break;
              }
              showToast('Senha é obrigatória', 'error');
              return _context1.a(2);
            case 2:
              _context1.p = 2;
              body = {
                username,
                role
              };
              if (password) body.password = password;
              if (!editId) {
                _context1.n = 4;
                break;
              }
              _context1.n = 3;
              return API.put('/admin/users/' + editId, body);
            case 3:
              showToast('Usuário atualizado', 'success');
              _context1.n = 6;
              break;
            case 4:
              _context1.n = 5;
              return API.post('/admin/users', body);
            case 5:
              showToast('Usuário criado', 'success');
            case 6:
              window.app.loadConfigTab('users');
              _context1.n = 8;
              break;
            case 7:
              _context1.p = 7;
              _t1 = _context1.v;
              showToast(_t1.message, 'error');
            case 8:
              return _context1.a(2);
          }
        }, _callee1, this, [[2, 7]]);
      })));
    }
  }, {
    key: "bindSessionsConfig",
    value: function bindSessionsConfig() {
      document.querySelectorAll('.cfg-kick-session').forEach(function (btn) {
        btn.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
          var _t10;
          return _regenerator().w(function (_context10) {
            while (1) switch (_context10.p = _context10.n) {
              case 0:
                if (confirm('Desconectar "' + btn.dataset.username + '"?')) {
                  _context10.n = 1;
                  break;
                }
                return _context10.a(2);
              case 1:
                _context10.p = 1;
                _context10.n = 2;
                return API.del('/admin/sessions/' + btn.dataset.id);
              case 2:
                showToast('Sessão encerrada', 'success');
                window.app.loadConfigTab('sessions');
                _context10.n = 4;
                break;
              case 3:
                _context10.p = 3;
                _t10 = _context10.v;
                showToast(_t10.message, 'error');
              case 4:
                return _context10.a(2);
            }
          }, _callee10, null, [[1, 3]]);
        })));
      });
    }
  }, {
    key: "bindServerConfig",
    value: function bindServerConfig() {
      var saveBtn = document.getElementById('server-config-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
          var name, port, res, _t11;
          return _regenerator().w(function (_context11) {
            while (1) switch (_context11.p = _context11.n) {
              case 0:
                name = document.getElementById('cfg-server-name').value.trim();
                port = document.getElementById('cfg-server-port').value;
                _context11.p = 1;
                _context11.n = 2;
                return API.put('/admin/server', {
                  serverName: name,
                  port: parseInt(port)
                });
              case 2:
                res = _context11.v;
                showToast('Configurações salvas!', 'success');
                if (res && res.needsRestart) {
                  showToast('Reinicie o servidor para aplicar a nova porta', 'warning');
                }
                _context11.n = 4;
                break;
              case 3:
                _context11.p = 3;
                _t11 = _context11.v;
                showToast(_t11.message, 'error');
              case 4:
                return _context11.a(2);
            }
          }, _callee11, null, [[1, 3]]);
        })));
      }
      var restartBtn = document.getElementById('server-restart');
      if (restartBtn) {
        restartBtn.addEventListener('click', function () {
          if (!confirm('Reiniciar o servidor? Todos os usuários serão desconectados temporariamente.')) return;
          API.post('/admin/server/restart').then(function () {
            showToast('Servidor reiniciando... Aguarde.', 'warning');
            setTimeout(function () {
              location.reload();
            }, 3000);
          }).catch(function (err) {
            showToast(err.message, 'error');
          });
        });
      }
      var shutdownBtn = document.getElementById('server-shutdown');
      if (shutdownBtn) {
        shutdownBtn.addEventListener('click', function () {
          if (!confirm('DESLIGAR o servidor? Todos os usuários perderão acesso.')) return;
          API.post('/admin/server/shutdown').then(function () {
            showToast('Servidor desligando...', 'warning');
            document.getElementById('app').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--text-muted)"><div style="text-align:center"><h2>Servidor Desligado</h2><p>O servidor foi encerrado. A janela será fechada ou execute start.bat para reiniciar.</p></div></div>';
            setTimeout(function() { window.close(); }, 1500);
          }).catch(function (err) {
            showToast(err.message, 'error');
          });
        });
      }
    }
  }]);
}(); 

// Wrapper to add logs tab support after babel transpilation
var _originalLoadConfigTab = App.prototype.loadConfigTab;
App.prototype.loadConfigTab = function(tab) {
  if (tab === 'logs') {
    var body = document.getElementById('config-body');
    if (body) body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    API.get('/admin/logs').then(function(logs) {
      if (body) {
        body.innerHTML = renderLogsConfig(logs || []);
        var btn = document.getElementById('btn-refresh-logs');
        if (btn) {
          var self = window.app;
          btn.addEventListener('click', function() { self.loadConfigTab('logs'); });
        }
      }
    }).catch(function(e) {
      if (body) body.innerHTML = '<p style="padding:20px;color:red">' + e.message + '</p>';
    });
  } else {
    return _originalLoadConfigTab.call(this, tab);
  }
};

// Initialize
window.app = new App();
