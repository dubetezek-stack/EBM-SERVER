try {
  require('express');
  require('cookie-parser');
} catch (e) {
  console.error('\n[!] ERRO CRITICO: Dependencias nao encontradas.');
  console.error('[*] Tentando instalar automaticamente, por favor aguarde...\n');
  const { execSync } = require('child_process');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('\n[*] Dependencias instaladas! Por favor, execute o servidor novamente.\n');
    process.exit(0);
  } catch (err) {
    console.error('[!] Falha na instalacao automatica. Execute "npm install" manualmente.');
    process.exit(1);
  }
}

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');
const cookieParser = require('cookie-parser');
const http = require('http');
const { initDDNS } = require('./ddns');
const { router: cameraRouter, initCameraWS } = require('./routes/cameras');
const { readJSON, writeJSON, DATA_DIR } = require('./utils/storage');

const app = express();

global.serverLogs = [];
function addLog(level, msg, ip) {
  global.serverLogs.unshift({ time: new Date().toISOString(), level: level, msg: msg, ip: ip });
  if (global.serverLogs.length > 200) global.serverLogs.pop();
}
global.addLog = addLog;

const dataDir = DATA_DIR;
global.nextCheckTime = 0;
global.nextUpdateTime = 0;

const configPath = path.join(dataDir, 'config.json');
if (!fs.existsSync(configPath)) {
  writeJSON(configPath, {
    drives: [], jwtSecret: '', port: 3000, serverName: 'EBM SERVER',
    ddns: { enabled: false, provider: 'cloudflare', token: '', zoneId: '', recordName: '', proxied: true, lastIp: '' }
  });
}

const usersPath = path.join(dataDir, 'users.json');
if (!fs.existsSync(usersPath)) {
  writeJSON(usersPath, []);
}

// Read port from config
// Read port from config with fallbacks
const config = readJSON(configPath) || {
  drives: [], jwtSecret: '', port: 3000, serverName: 'EBM SERVER',
  ddns: { enabled: false, provider: 'cloudflare', token: '', zoneId: '', recordName: '', proxied: true, lastIp: '' }
};
const PORT = process.env.PORT || config.port || 3000;
const SERVER_NAME = config.serverName || 'EBM SERVER';

// Middleware
// Global Request Logger for Debugging
app.use((req, res, next) => {
  res.on('finish', () => {
    const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode}\n`;
    const fs = require('fs');
    const path = require('path');
    try {
      fs.appendFileSync(path.join(DATA_DIR, 'requests.log'), logMsg);
    } catch (e) {}
  });
  
  
  next();
});
app.set('trust proxy', true);
app.use(cors());

// OpenSpeedTest Upload Endpoint (must be before body parsers to avoid memory overhead)
app.post('/speedtest/upload', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  req.on('data', () => {}); // Discard data stream immediately
  req.on('end', () => res.status(200).send('OK'));
});
app.options('/speedtest/upload', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.status(200).send();
});

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  if (!req.path.startsWith('/api/admin/logs')) {
    addLog('INFO', req.method + ' ' + req.path, req.ip.replace('::ffff:', ''));
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// API Routes
const { authenticate } = require('./middleware/auth');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cameras', cameraRouter);
app.use('/api/apps', require('./routes/apps'));
app.use('/api/user', require('./routes/user'));

// Proxy with relaxed auth for sub-resources to fix 401s
app.all(['/proxy/:appId', '/proxy/:appId/*', '/api/apps/proxy/:appId/*'], (req, res, next) => {
  // If it's the main entry point (with token), authenticate and set cookies
  if (req.query.token) {
    return authenticate(req, res, () => {
      const appId = req.params.appId;
      res.cookie('current_app', appId, { path: '/', maxAge: 3600000 });
      res.cookie('ebm_auth_token', req.query.token, { path: '/', httpOnly: true, maxAge: 86400000 });
      proxyRequest(req, res, appId, req.params[0] || '');
    });
  }
  
  // For sub-resources, check for auth_token in cookies
  const token = req.cookies?.ebm_auth_token;
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  
  // Forward to proxy
  proxyRequest(req, res, req.params.appId, req.params[0] || '');
});

// Original route for root app access
app.all('/api/apps/proxy/:appId', authenticate, (req, res) => {
  const appId = req.params.appId;
  proxyRequest(req, res, appId, '');
});

function proxyRequest(req, res, appId, subPath) {
  const config = readJSON(path.join(DATA_DIR, 'apps.json'));
  const appDef = config ? config.available.find(a => a.id === appId) : null;
  if (!appDef || !appDef.port) return res.status(404).send('App não configurado para proxy');

  // Construct target path
  let targetPath = '/' + subPath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
  if (appId === 'jellyfin') {
    if (subPath === '' || subPath === '/' || subPath === 'jellyfin' || subPath === 'jellyfin/') {
      targetPath = '/' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
    }
  }

  const options = {
    hostname: '127.0.0.1',
    port: appDef.port,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers }
  };
  
  options.headers.host = `127.0.0.1:${appDef.port}`;
  options.headers.referer = `http://127.0.0.1:${appDef.port}/`;
  options.headers.origin = `http://127.0.0.1:${appDef.port}`;
  delete options.headers.connection;
  
  const proxyReq = http.request(options, (proxyRes) => {
    let location = proxyRes.headers.location;
    if (location) {
      if (location.startsWith('/')) {
        proxyRes.headers.location = `/api/apps/proxy/${appId}${location}`;
      } else if (location.includes(`127.0.0.1:${appDef.port}`)) {
        proxyRes.headers.location = location.replace(`http://127.0.0.1:${appDef.port}`, `/api/apps/proxy/${appId}`);
      }
    }
    
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['access-control-allow-origin'];
    delete proxyRes.headers['content-disposition'];
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const logMsg = `[${new Date().toISOString()}] PROXY ${appId}: ${targetPath} -> ${proxyRes.statusCode}\n`;
    try { fs.appendFileSync(path.join(DATA_DIR, 'proxy.log'), logMsg); } catch(e) {}

    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => res.status(502).send('Erro no proxy: ' + err.message));
  req.pipe(proxyReq);
}

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  // Find local network IP
  let localIP = 'localhost';
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const cfg of iface) {
      if (cfg.family === 'IPv4' && !cfg.internal) {
        localIP = cfg.address;
        break;
      }
    }
  }

  console.log('');
  console.log('  ============================================');
  console.log(`    ${SERVER_NAME} v1.0`);
  console.log('  ============================================');
  console.log('');
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Rede:     http://${localIP}:${PORT}`);
  console.log(`  Dados:    ${dataDir}`);
  console.log('');
  console.log('  Acesse pelo celular usando o endereco de Rede');
  console.log('  ============================================');
  console.log('');

  initDDNS();
  initCameraWS(server);

  // Auto-start installed apps
  const { readJSON } = require('./utils/storage');
  const appsManager = require('./utils/apps-manager');
  const appsConfigPath = path.join(DATA_DIR, 'apps.json');
  
  const startApps = () => {
    const config = readJSON(appsConfigPath);
    if (config && config.installed) {
      config.installed.forEach(appId => {
        const appDef = config.available.find(a => a.id === appId);
        if (appDef && appDef.isLocal && appDef.execPath) {
          try {
            const appDir = appsManager.getAppDir(appId);
            if (fs.existsSync(appDir)) {
              appsManager.spawnApp(appId, appDef.execPath);
            }
          } catch (e) {
            console.error(`Falha ao auto-iniciar ${appId}:`, e.message);
          }
        }
      });
    }
  };
  
  // Start apps after a short delay to ensure system is ready
  setTimeout(startApps, 2000);
});


