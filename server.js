const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');
const cookieParser = require('cookie-parser');
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
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cameras', cameraRouter);
app.use('/api/apps', require('./routes/apps'));
app.use('/api/user', require('./routes/user'));

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

// Reverse Proxy for Apps
const http = require('http');
const { authenticate } = require('./middleware/auth');

app.all('/api/apps/proxy/:appId/*', authenticate, (req, res) => {
  const appId = req.params.appId;
  
  // Set cookie if token is in query for future requests from this iframe
  if (req.query.token) {
    res.cookie('auth_token', req.query.token, { 
      path: `/api/apps/proxy/${appId}`, 
      httpOnly: true,
      maxAge: 86400000 // 24h
    });
  }
  const { readJSON } = require('./utils/storage');
  const config = readJSON(path.join(DATA_DIR, 'apps.json'));
  const appDef = config ? config.available.find(a => a.id === appId) : null;
  
  if (!appDef || !appDef.port) return res.status(404).send('App não configurado para proxy');

  const targetPath = '/' + req.params[0] + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
  
  const options = {
    hostname: '127.0.0.1',
    port: appDef.port,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers }
  };
  
  // Clean up headers
  delete options.headers.host;
  delete options.headers.connection;
  
  const proxyReq = http.request(options, (proxyRes) => {
    // Rewrite redirects
    if (proxyRes.headers.location && proxyRes.headers.location.startsWith('/')) {
      proxyRes.headers.location = `/api/apps/proxy/${appId}${proxyRes.headers.location}`;
    }
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    res.status(502).send('Erro no proxy: ' + err.message);
  });
  
  req.pipe(proxyReq);
});

