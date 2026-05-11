const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getActiveSessions, removeSessionById } = require('../sessions');

const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');

const dataDir = DATA_DIR;
const configPath = path.join(dataDir, 'config.json');
const usersPath = path.join(dataDir, 'users.json');

router.use(authenticate, requireAdmin);

// === DRIVES ===

router.get('/drives', (req, res) => {
  const config = readJSON(configPath) || { drives: [] };
  res.json(config.drives || []);
});

router.post('/drives', (req, res) => {
  const { name, path: drivePath, color, permissions } = req.body;
  if (!name || !drivePath) {
    return res.status(400).json({ error: 'Nome e caminho são obrigatórios' });
  }

  if (!fs.existsSync(drivePath)) {
    return res.status(400).json({ error: 'Caminho não encontrado: ' + drivePath });
  }

  const config = readJSON(configPath) || { drives: [] };
  const drive = {
    id: crypto.randomUUID(),
    name,
    path: drivePath,
    color: color || '#0078d4',
    permissions: permissions || { 
      master: { read: true, upload: true, delete: false },
      user: { read: true, upload: false, delete: false }
    },
    createdAt: new Date().toISOString()
  };

  if (!config.drives) config.drives = [];
  config.drives.push(drive);
  writeJSON(configPath, config);
  res.json(drive);
});

router.put('/drives/:id', (req, res) => {
  const { name, path: drivePath, color, permissions } = req.body;
  const config = readJSON(configPath) || { drives: [] };
  const idx = (config.drives || []).findIndex(d => d.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Drive não encontrado' });
  }

  if (drivePath && !fs.existsSync(drivePath)) {
    return res.status(400).json({ error: 'Caminho não encontrado: ' + drivePath });
  }

  if (name) config.drives[idx].name = name;
  if (drivePath) config.drives[idx].path = drivePath;
  if (color) config.drives[idx].color = color;
  if (permissions) config.drives[idx].permissions = permissions;

  writeJSON(configPath, config);
  res.json(config.drives[idx]);
});

router.delete('/drives/:id', (req, res) => {
  const config = readJSON(configPath) || { drives: [] };
  config.drives = (config.drives || []).filter(d => d.id !== req.params.id);
  writeJSON(configPath, config);
  res.json({ success: true });
});

// === USERS ===

router.get('/users', (req, res) => {
  const users = readJSON(usersPath) || [];
  res.json(users.map(u => ({
    id: u.id, username: u.username, role: u.role, createdAt: u.createdAt
  })));
});

router.post('/users', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
  }

  const users = readJSON(usersPath) || [];
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
  const users = readJSON(usersPath) || [];
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

  const users = readJSON(usersPath) || [];
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
  const config = readJSON(configPath) || {};
  res.json({
    port: config.port || 3000,
    serverName: config.serverName || 'EBM SERVER',
    dnsRecords: config.dnsRecords || [],
    dnsAutoRefresh: config.dnsAutoRefresh !== false,
    dnsInterval: config.dnsInterval || 5,
    dnsCheckInterval: config.dnsCheckInterval || 1,
    nextCheckTime: global.nextCheckTime || 0,
    nextUpdateTime: global.nextUpdateTime || 0,
    camera: config.camera || { ip: '', port: '', user: '', pass: '', rtspPort: 554 }
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
  const config = readJSON(configPath) || {};
  if (port) config.port = parseInt(port);
  if (serverName !== undefined) config.serverName = serverName;
  if (dnsRecords) config.dnsRecords = dnsRecords;
  if (dnsAutoRefresh !== undefined) config.dnsAutoRefresh = dnsAutoRefresh;
  if (dnsInterval !== undefined) config.dnsInterval = parseInt(dnsInterval);
  if (dnsCheckInterval !== undefined) config.dnsCheckInterval = parseInt(dnsCheckInterval);
  if (req.body.camera) config.camera = req.body.camera;
  writeJSON(configPath, config);
  
  // Re-initialize DNS service
  try {
    const { initDDNS } = require('../ddns');
    initDDNS();
  } catch(e) {}

  res.json({
    port: config.port || 3000,
    serverName: config.serverName || 'EBM SERVER',
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
    const config = readJSON(configPath) || {};
    
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

// === STARTUP CONTROL ===
router.get('/server/startup', (req, res) => {
  try {
    const { execSync } = require('child_process');
    // Check if the task exists in Task Scheduler
    execSync('schtasks /query /tn EBMSERVER', { stdio: 'ignore' });
    res.json({ enabled: true });
  } catch (e) {
    // Also check for the old shortcut for backward compatibility during migration
    const startupPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'EBMSERVER.lnk');
    res.json({ enabled: fs.existsSync(startupPath) });
  }
});

router.post('/server/startup', (req, res) => {
  const { enabled } = req.body;
  const { execSync } = require('child_process');
  
  // Always try to remove the old shortcut if it exists
  const startupPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'EBMSERVER.lnk');
  if (fs.existsSync(startupPath)) {
    try { fs.unlinkSync(startupPath); } catch(e) {}
  }

  if (enabled) {
    try {
      const batPath = path.resolve(__dirname, '..', 'start.bat');
      const dataDir = DATA_DIR;
      
      // Create a temporary batch file to handle the complex escaping for schtasks
      const setupBatPath = path.join(os.tmpdir(), 'setup_ebm_task.bat');
      // The task will run at boot (onstart) as SYSTEM, with highest privileges
      const taskCmd = `@echo off\nschtasks /create /tn EBMSERVER /tr "cmd /c \\"set EBMSERVER_DATA_DIR=${dataDir} && set EBMSERVER_TASK=1 && \\"${batPath}\\"\\"" /sc onstart /ru SYSTEM /rl HIGHEST /f`;
      
      fs.writeFileSync(setupBatPath, taskCmd);
      
      // Use PowerShell to run the batch file with elevation (UAC prompt)
      const psCommand = `powershell -Command "Start-Process '${setupBatPath}' -Verb RunAs -Wait"`;
      
      execSync(psCommand);
      if (fs.existsSync(setupBatPath)) fs.unlinkSync(setupBatPath);
      
      res.json({ success: true, enabled: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao configurar tarefa de inicialização: ' + err.message });
    }
  } else {
    try {
      // Use PowerShell to delete the task with elevation
      const psCommand = `powershell -Command "Start-Process schtasks -ArgumentList '/delete /tn EBMSERVER /f' -Verb RunAs -Wait"`;
      
      execSync(psCommand);
      res.json({ success: true, enabled: false });
    } catch (err) {
      // If it fails because the task doesn't exist, it's fine
      res.json({ success: true, enabled: false });
    }
  }
});

module.exports = router;
