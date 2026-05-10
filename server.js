const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');
const { initDDNS } = require('./ddns');

const app = express();

global.serverLogs = [];
function addLog(level, msg, ip) {
  global.serverLogs.unshift({ time: new Date().toISOString(), level: level, msg: msg, ip: ip });
  if (global.serverLogs.length > 200) global.serverLogs.pop();
}
global.addLog = addLog;

// Ensure data directory and default files exist
const dataDir = path.join(os.homedir(), '.WebFileExplorer');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const configPath = path.join(dataDir, 'config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({
    drives: [], jwtSecret: '', port: 3000, serverName: 'Web File Explorer',
    ddns: { enabled: false, provider: 'cloudflare', token: '', zoneId: '', recordName: '', proxied: true, lastIp: '' }
  }, null, 2));
}

const usersPath = path.join(dataDir, 'users.json');
if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, JSON.stringify([], null, 2));
}

// Read port from config
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const PORT = process.env.PORT || config.port || 3000;
const SERVER_NAME = config.serverName || 'Web File Explorer';

// Middleware
app.set('trust proxy', true);
app.use(cors());
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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
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
});

