const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getActiveSessions, removeSessionById } = require('../sessions');

const dataDir = path.join(__dirname, '..', 'data');
const configPath = path.join(dataDir, 'config.json');
const usersPath = path.join(dataDir, 'users.json');

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJSON(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2)); }

router.use(authenticate, requireAdmin);

// === DRIVES ===

router.get('/drives', (req, res) => {
  const config = readJSON(configPath);
  res.json(config.drives || []);
});

router.post('/drives', (req, res) => {
  const { name, path: drivePath, color } = req.body;
  if (!name || !drivePath) {
    return res.status(400).json({ error: 'Nome e caminho são obrigatórios' });
  }

  if (!fs.existsSync(drivePath)) {
    return res.status(400).json({ error: 'Caminho não encontrado: ' + drivePath });
  }

  const config = readJSON(configPath);
  const drive = {
    id: crypto.randomUUID(),
    name,
    path: drivePath,
    color: color || '#0078d4',
    createdAt: new Date().toISOString()
  };

  config.drives.push(drive);
  writeJSON(configPath, config);
  res.json(drive);
});

router.put('/drives/:id', (req, res) => {
  const { name, path: drivePath, color } = req.body;
  const config = readJSON(configPath);
  const idx = config.drives.findIndex(d => d.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Drive não encontrado' });
  }

  if (drivePath && !fs.existsSync(drivePath)) {
    return res.status(400).json({ error: 'Caminho não encontrado: ' + drivePath });
  }

  if (name) config.drives[idx].name = name;
  if (drivePath) config.drives[idx].path = drivePath;
  if (color) config.drives[idx].color = color;

  writeJSON(configPath, config);
  res.json(config.drives[idx]);
});

router.delete('/drives/:id', (req, res) => {
  const config = readJSON(configPath);
  config.drives = config.drives.filter(d => d.id !== req.params.id);
  writeJSON(configPath, config);
  res.json({ success: true });
});

// === USERS ===

router.get('/users', (req, res) => {
  const users = readJSON(usersPath);
  res.json(users.map(u => ({
    id: u.id, username: u.username, role: u.role, createdAt: u.createdAt
  })));
});

router.post('/users', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
  }

  const users = readJSON(usersPath);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username,
    password: hashed,
    role: role || 'user',
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeJSON(usersPath, users);
  res.json({ id: user.id, username: user.username, role: user.role });
});

router.put('/users/:id', async (req, res) => {
  const { username, password, role } = req.body;
  const users = readJSON(usersPath);
  const idx = users.findIndex(u => u.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  if (username) {
    if (users.find(u => u.username === username && u.id !== req.params.id)) {
      return res.status(400).json({ error: 'Nome já em uso' });
    }
    users[idx].username = username;
  }
  if (password) {
    users[idx].password = await bcrypt.hash(password, 10);
  }
  if (role) {
    users[idx].role = role;
  }

  writeJSON(usersPath, users);
  res.json({ id: users[idx].id, username: users[idx].username, role: users[idx].role });
});

router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Não é possível remover seu próprio usuário' });
  }

  const users = readJSON(usersPath);
  writeJSON(usersPath, users.filter(u => u.id !== req.params.id));
  res.json({ success: true });
});

// === SESSIONS ===

router.get('/sessions', (req, res) => {
  res.json(getActiveSessions());
});

router.delete('/sessions/:id', (req, res) => {
  removeSessionById(req.params.id);
  res.json({ success: true });
});

// === SERVER CONFIG ===

router.get('/server', (req, res) => {
  const config = readJSON(configPath);
  res.json({
    port: config.port || 3000,
    serverName: config.serverName || 'Web File Explorer',
    dnsRecords: config.dnsRecords || [],
    dnsAutoRefresh: config.dnsAutoRefresh !== false,
    dnsInterval: config.dnsInterval || 5,
    dnsCheckInterval: config.dnsCheckInterval || 1,
    nextCheckTime: global.nextCheckTime || 0,
    nextUpdateTime: global.nextUpdateTime || 0
  });
});

router.get('/server/ip', async (req, res) => {
  try {
    const { getPublicIP } = require('../ddns');
    const ip = await getPublicIP();
    res.json({ ip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/server', (req, res) => {
  const { port, serverName, dnsRecords, dnsAutoRefresh, dnsInterval, dnsCheckInterval } = req.body;
  const config = readJSON(configPath);
  if (port) config.port = parseInt(port);
  if (serverName !== undefined) config.serverName = serverName;
  if (dnsRecords) config.dnsRecords = dnsRecords;
  if (dnsAutoRefresh !== undefined) config.dnsAutoRefresh = dnsAutoRefresh;
  if (dnsInterval !== undefined) config.dnsInterval = parseInt(dnsInterval);
  if (dnsCheckInterval !== undefined) config.dnsCheckInterval = parseInt(dnsCheckInterval);
  writeJSON(configPath, config);
  
  // Re-initialize DNS service
  try {
    const { initDDNS } = require('../ddns');
    initDDNS();
  } catch(e) {}

  res.json({
    port: config.port || 3000,
    serverName: config.serverName || 'Web File Explorer',
    dnsRecords: config.dnsRecords || [],
    dnsAutoRefresh: config.dnsAutoRefresh !== false,
    dnsInterval: config.dnsInterval || 5,
    dnsCheckInterval: config.dnsCheckInterval || 1,
    needsRestart: port ? true : false
  });
});

router.post('/server/ddns/test', async (req, res) => {
  const { index } = req.body;
  try {
    const { updateDDNS } = require('../ddns');
    const config = readJSON(configPath);
    
    if (index !== undefined) {
      // Test only one record
      const records = config.dnsRecords || [];
      const record = records[index];
      if (!record) return res.status(404).json({ error: 'Registro não encontrado' });
      if (!record.enabled) return res.status(400).json({ error: 'Ative o domínio primeiro para atualizar' });
      
      const { updateDDNS: updateSingle } = require('../ddns');
      // We pass a fake config with only one record and force=true
      const result = await updateSingle({ dnsRecords: [record] }, true);
      res.json({ success: true, result });
    } else {
      // Test all with force=true
      await updateDDNS(config, true);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === LOGS ===
router.get('/logs', (req, res) => {
  res.json(global.serverLogs || []);
});

// === SERVER CONTROL ===

router.post('/server/shutdown', (req, res) => {
  const { clearAllSessions } = require('../sessions');
  clearAllSessions();
  res.json({ success: true, message: 'Servidor desligando...' });
  setTimeout(() => { process.exit(0); }, 500);
});

router.post('/server/restart', (req, res) => {
  const { clearAllSessions } = require('../sessions');
  clearAllSessions();
  res.json({ success: true, message: 'Servidor reiniciando...' });
  setTimeout(() => { process.exit(99); }, 500);
});

module.exports = router;
