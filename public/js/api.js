"use strict";

// API Client - Maximum browser compatibility (no ?., no ..., no includes)
var API = {
  token: function () {
    try {
      return localStorage.getItem('token');
    } catch (e) {
      return null;
    }
  }(),
  setToken: function setToken(t) {
    this.token = t;
    try {
      localStorage.setItem('token', t);
    } catch (e) {}
  },
  clearToken: function clearToken() {
    this.token = null;
    try {
      localStorage.removeItem('token');
    } catch (e) {}
  },
  request: function request(url, options) {
    var self = this;
    options = options || {};
    var headers = {};
    var key;
    // Copy existing headers
    if (options.headers) {
      for (key in options.headers) {
        if (options.headers.hasOwnProperty(key)) {
          headers[key] = options.headers[key];
        }
      }
    }
    if (self.token) headers['Authorization'] = 'Bearer ' + self.token;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    var fetchOptions = {
      method: options.method || 'GET',
      headers: headers
    };
    if (options.body) fetchOptions.body = options.body;
    return fetch('/api' + url, fetchOptions).then(function (res) {
      if (res.status === 401) {
        self.clearToken();
        if (window.app) window.app.navigate('login');
        return null;
      }
      return res.text().then(function (text) {
        var data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {}
        if (!res.ok) {
          var errMsg = data && data.error ? data.error : 'Erro na requisição';
          throw new Error(errMsg);
        }
        return data;
      });
    }).catch(function (e) {
      if (e.message && e.message.indexOf('Erro') < 0 && e.message.indexOf('requisição') < 0) {
        throw new Error('Erro de conexão com o servidor');
      }
      throw e;
    });
  },
  get: function get(url) {
    return this.request(url);
  },
  post: function post(url, body) {
    return this.request(url, {
      method: 'POST',
      body: body
    });
  },
  put: function put(url, body) {
    return this.request(url, {
      method: 'PUT',
      body: body
    });
  },
  del: function del(url) {
    return this.request(url, {
      method: 'DELETE'
    });
  },
  uploadFiles: function uploadFiles(driveId, subpath, files, onProgress) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var fd = new FormData();
      for (var i = 0; i < files.length; i++) fd.append('files', files[i]);
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files/upload?driveId=' + driveId + '&subpath=' + encodeURIComponent(subpath || ''));
      if (self.token) xhr.setRequestHeader('Authorization', 'Bearer ' + self.token);
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
      };
      xhr.onload = function () {
        xhr.status === 200 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error('Upload falhou'));
      };
      xhr.onerror = function () {
        reject(new Error('Erro de rede'));
      };
      xhr.send(fd);
    });
  }
};
