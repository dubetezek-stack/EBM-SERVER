const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');
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
  console.log('');
  console.log('  Acesse pelo celular usando o endereco de Rede');
  console.log('  ============================================');
  console.log('');

  initDDNS();
  initCameraWS(server);
});

