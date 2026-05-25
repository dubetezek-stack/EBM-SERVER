const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate, requireMaster } = require('../middleware/auth');
const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');
const appsManager = require('../utils/apps-manager');

const appsConfigPath = path.join(DATA_DIR, 'apps.json');
const INSTALLERS_DIR = path.join(__dirname, '..', 'Installers');

// Default App Definitions
const DEFAULT_APPS = [
  { id: 'explorer', name: 'Arquivos', icon: 'folder', description: 'Gerenciador de arquivos do servidor', category: 'Sistema' },
  { id: 'speedtest', name: 'Speed Test', icon: 'speed', description: 'Teste a velocidade da sua rede local', category: 'Utilidades' },
  { id: 'cameras', name: 'Câmeras', icon: 'camera', description: 'Monitoramento de câmeras ao vivo', category: 'Segurança' },
  { id: 'settings', name: 'Configurações', icon: 'settings', description: 'Configurações do sistema', category: 'Sistema' },
  { id: 'plex', name: 'Plex', icon: 'plex', description: 'Organize e transmita sua coleção de mídia', category: 'Mídia', official: false },
  { id: 'transmission', name: 'Transmission', icon: 'download', description: 'Cliente BitTorrent leve e rápido', category: 'Utilidades', official: false },
  { id: 'homeassistant', name: 'Home Assistant', icon: 'home', description: 'Automação residencial de código aberto', category: 'Smart Home', official: false },
  { 
    id: 'icloud', 
    name: 'iCloud', 
    icon: 'icloud', 
    description: 'Acesse suas fotos, arquivos e notas da Apple', 
    category: 'Nuvem', 
    official: false,
    url: 'https://www.icloud.com',
    newTabOnly: true
  },
  { 
    id: 'jellyfin', 
    name: 'Jellyfin', 
    icon: 'jellyfin', 
    description: 'O servidor de mídia livre e aberto', 
    category: 'Mídia', 
    official: false, 
    isLocal: true, 
    port: 8096, 
    installerPath: 'jellyfin_10.11.8-amd64.zip',
    execPath: 'jellyfin/jellyfin.exe',
    args: ['--service', '--datadir', '../data', '--configdir', '../config', '--logdir', '../log', '--cachedir', '../cache']
  },
  { 
    id: 'browser', 
    name: 'Navegador', 
    icon: 'browser', 
    description: 'Navegue na internet de dentro do seu servidor', 
    category: 'Utilidades', 
    official: true 
  },
  {
    id: 'gpx-dashboard',
    name: 'GPX Dashboard',
    icon: 'map',
    description: 'Análise de telemetria e visualização de rotas GPX',
    category: 'Utilidades',
    official: true
  }
];

function ensureAppsConfig() {
  let config = readJSON(appsConfigPath);
  if (!config || !config.available || !config.installed) {
    config = {
      available: DEFAULT_APPS,
      installed: ['explorer', 'speedtest', 'cameras', 'settings', 'browser', 'gpx-dashboard'],
      permissions: {}
    };
    config.installed.forEach(id => {
      config.permissions[id] = { 
        byRole: { admin: true, master: true, user: true },
        byUser: {}
      };
    });
    writeJSON(appsConfigPath, config);
  } else {
    // Update available apps list if changed
    // Force update app definitions if they exist in defaults
    DEFAULT_APPS.forEach(defaultApp => {
      const idx = config.available.findIndex(a => a.id === defaultApp.id);
      if (idx > -1) {
        config.available[idx] = { ...config.available[idx], ...defaultApp };
      } else {
        config.available.push(defaultApp);
      }
    });

    // FORCE: Ensure 'browser' is in the installed list if it's a new official app
    if (!config.installed.includes('browser')) {
      config.installed.push('browser');
      if (!config.permissions['browser']) {
        config.permissions['browser'] = { 
          byRole: { admin: true, master: true, user: true },
          byUser: {}
        };
      }
    }

    // FORCE: Ensure 'gpx-dashboard' is in the installed list
    if (!config.installed.includes('gpx-dashboard')) {
      config.installed.push('gpx-dashboard');
      if (!config.permissions['gpx-dashboard']) {
        config.permissions['gpx-dashboard'] = { 
          byRole: { admin: true, master: true, user: true },
          byUser: {}
        };
      }
    }

    writeJSON(appsConfigPath, config);
  }
  return config;
}

ensureAppsConfig();

router.use(authenticate);

// Get all available apps
router.get('/list', (req, res) => {
  const config = ensureAppsConfig();
  const list = (config.available || []).map(app => {
    const hasInstaller = app.installerPath && fs.existsSync(path.join(INSTALLERS_DIR, app.installerPath));
    return { ...app, hasInstaller };
  });
  res.json(list);
});

// Get installed apps for current user
router.get('/installed', (req, res) => {
  const config = ensureAppsConfig();
  const available = config.available || [];
  const installedIds = config.installed || [];
  const permissions = config.permissions || {};
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const installedApps = available.filter(app => {
    if (!installedIds.includes(app.id)) return false;
    if (userRole === 'admin') return true;
    const appPerm = permissions[app.id];
    if (!appPerm) return true;
    if (appPerm.byUser && userId in appPerm.byUser) return appPerm.byUser[userId] === true;
    return (appPerm.byRole || {})[userRole] === true;
  });
  
  res.json(installedApps);
});

// App Status
router.get('/status/:id', (req, res) => {
  const appId = req.params.id;
  const isRunning = appsManager.isAppRunning(appId);
  const isInstalled = fs.existsSync(appsManager.getAppDir(appId));
  res.json({ isRunning, isInstalled });
});

// Install Local App
router.post('/install-local/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  
  const appId = req.params.id;
  const config = ensureAppsConfig();
  const appDef = config.available.find(a => a.id === appId);
  
  if (!appDef || !appDef.isLocal) return res.status(400).json({ error: 'App não suporta instalação local' });
  
  const zipPath = path.join(INSTALLERS_DIR, appDef.installerPath);
  if (!fs.existsSync(zipPath)) return res.status(404).json({ error: 'Instalador não encontrado' });
  
  appsManager.installApp(appId, zipPath)
    .then(() => {
      // Add to installed list if not there
      if (!config.installed.includes(appId)) {
        config.installed.push(appId);
        if (!config.permissions[appId]) {
          config.permissions[appId] = { byRole: { admin: true, master: true, user: true }, byUser: {} };
        }
        writeJSON(appsConfigPath, config);
      }
      res.json({ success: true });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// Start App
router.post('/start/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const appId = req.params.id;
  const config = ensureAppsConfig();
  const appDef = config.available.find(a => a.id === appId);
  
  if (!appDef || !appDef.execPath) return res.status(400).json({ error: 'App não executável' });
  
  try {
    appsManager.spawnApp(appId, appDef.execPath, appDef.args || []);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stop App
router.post('/stop/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const appId = req.params.id;
  const success = appsManager.stopApp(appId);
  res.json({ success });
});

// ... (previous admin routes remain the same, simplified for brevity in this replace)
// (Actually I should keep the rest of the file)

// Get all installed apps with permissions info (admin only)
router.get('/admin/installed-with-permissions', requireMaster, (req, res) => {
  
  const config = ensureAppsConfig();
  const available = config.available || [];
  const installedIds = config.installed || [];
  const permissions = config.permissions || {};
  
  // Also get users list (exclude admins from individual permission list)
  const usersPath = path.join(DATA_DIR, 'users.json');
  const allUsers = readJSON(usersPath) || [];
  const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');
  
  const installedApps = available
    .filter(app => installedIds.includes(app.id))
    .map(app => ({
      ...app,
      permissions: permissions[app.id] || { byRole: {}, byUser: {} },
      users: nonAdminUsers.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        hasAccess: hasUserAccessToApp(u.id, u.role, app.id, permissions[app.id])
      }))
    }));
  
  res.json(installedApps);
});

// Helper function to check if user has access
function hasUserAccessToApp(userId, userRole, appId, appPerm) {
  if (userRole === 'admin') return true;
  if (!appPerm) return true;
  
  // Check user-specific permission first
  if (appPerm.byUser && userId in appPerm.byUser) {
    return appPerm.byUser[userId] === true;
  }
  
  const rolePerms = appPerm.byRole || {};
  // If no role permissions are defined, default to true for compatibility
  if (Object.keys(rolePerms).length === 0) return true;
  
  return rolePerms[userRole] === true;
}

// Install app
router.post('/install/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const appId = req.params.id;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  
  if (!config.installed) config.installed = [];
  if (!config.installed.includes(appId)) {
    config.installed.push(appId);
    if (!config.permissions) config.permissions = {};
    if (!config.permissions[appId]) {
      config.permissions[appId] = { 
        byRole: { admin: true, master: true, user: true },
        byUser: {}
      };
    }
    writeJSON(appsConfigPath, config);
  }
  
  res.json({ success: true, appId });
});

// Update app permissions (by role or by user)
router.put('/permissions/:id', requireMaster, (req, res) => {
  const appId = req.params.id;
  const { byRole, byUser } = req.body;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  const userRole = req.user.role;
  const userId = req.user.id;

  // Only Admins can change group-level role permissions
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado: apenas administradores podem alterar permissões de grupo' });
  }

  if (!config.permissions) config.permissions = {};
  
  config.permissions[appId] = {
    byRole: byRole || {},
    byUser: byUser || {}
  };
  
  writeJSON(appsConfigPath, config);
  res.json({ success: true });
});

// Update permissions for specific user and app
router.put('/user-access/:appId/:userId', requireMaster, (req, res) => {
  const { appId, userId } = req.params;
  const { hasAccess } = req.body;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  const userRole = req.user.role;
  const currentUserId = req.user.id;

  // Master Restriction
  if (userRole === 'master') {
    // Must have access to the app themselves
    const canI = hasUserAccessToApp(currentUserId, userRole, appId, config.permissions[appId]);
    if (!canI) return res.status(403).json({ error: 'Acesso negado: você não tem acesso a este app' });

    // Cannot change Admin or Master users
    const users = readJSON(path.join(DATA_DIR, 'users.json')) || [];
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'admin' || targetUser?.role === 'master') {
      return res.status(403).json({ error: 'Você não pode alterar o acesso de administradores ou outros usuários master' });
    }
  }

  if (!config.permissions) config.permissions = {};
  if (!config.permissions[appId]) {
    config.permissions[appId] = { byRole: {}, byUser: {} };
  }
  
  if (!config.permissions[appId].byUser) {
    config.permissions[appId].byUser = {};
  }
  
  config.permissions[appId].byUser[userId] = hasAccess === true;
  
  writeJSON(appsConfigPath, config);
  res.json({ success: true });
});

// Uninstall app
router.post('/uninstall/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const appId = req.params.id;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  
  if (config.installed) {
    config.installed = config.installed.filter(id => id !== appId);
    writeJSON(appsConfigPath, config);
  }
  
  res.json({ success: true, appId });
});

// Secure Browser Proxy to bypass X-Frame-Options and inject Translator
router.get('/browser-proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL missing');

  try {
    const url = new URL(targetUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return res.status(403).send('Protocol blocked');

    const protocol = url.protocol === 'https:' ? require('https') : require('http');
    
    const proxyReq = protocol.get(targetUrl, (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || '';
      const headers = { ...proxyRes.headers };
      
      delete headers['x-frame-options'];
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      headers['access-control-allow-origin'] = req.headers.origin || '*';
      headers['access-control-allow-credentials'] = 'true';

      if (contentType.includes('text/html')) {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
          let body = Buffer.concat(chunks).toString('utf8');
          
          // Chrome-Style Translation Bar Injection
          const chromeInjection = `
            <base href="${url.origin}${url.pathname}">
            <style>
              #ebm-chrome-bar { 
                position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
                background: #f1f3f4; border-bottom: 1px solid #dadce0; 
                height: 40px; display: flex; align-items: center; padding: 0 15px;
                font-family: 'Segoe UI', Tahoma, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              body { margin-top: 40px !important; }
              .goog-te-banner-frame.skiptranslate { display: none !important; } 
              .goog-te-gadget { font-family: inherit !important; font-size: 13px !important; color: #3c4043 !important; }
              .goog-te-gadget-simple { background-color: transparent !important; border: none !important; }
            </style>
            <div id="ebm-chrome-bar">
              <div id="google_translate_element"></div>
            </div>
            <script type="text/javascript">
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({
                  pageLanguage: 'auto', 
                  includedLanguages: 'pt,en,zh-CN',
                  layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL,
                  autoDisplay: true
                }, 'google_translate_element');
                
                // Auto-trigger logic
                var timer = setInterval(function() {
                  var select = document.querySelector('#google_translate_element select');
                  if (select) {
                    select.value = 'pt';
                    select.dispatchEvent(new Event('change'));
                    clearInterval(timer);
                  }
                }, 500);
              }
            </script>
            <script type="text/javascript" src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
          `;
          
          // Inject at the very beginning of the body
          if (body.includes('<body>')) {
            body = body.replace('<body>', '<body>' + chromeInjection);
          } else if (body.includes('<head>')) {
             body = body.replace('</head>', '</head><body>' + chromeInjection);
          } else {
             body = '<body>' + chromeInjection + body + '</body>';
          }
          
          if (headers['content-length']) headers['content-length'] = Buffer.byteLength(body);
          res.writeHead(proxyRes.statusCode, headers);
          res.end(body);
        });
      } else {
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', (err) => {
      res.status(500).send('Proxy Error: ' + err.message);
    });
  } catch (err) {
    res.status(400).send('Invalid URL');
  }
});

module.exports = router;
