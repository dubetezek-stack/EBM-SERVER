const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { authenticate, requireAdmin, requireMaster } = require('../middleware/auth');
const { getActiveSessions, removeSessionById } = require('../sessions');

const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');

const dataDir = DATA_DIR;
const configPath = path.join(dataDir, 'config.json');
const usersPath = path.join(dataDir, 'users.json');

router.use(authenticate);

// === DRIVES ===

// Helper to check if Master can manage a drive/user
const canMasterManage = (user) => {
  if (user.role === 'admin') return false;
  return true;
};

router.get('/drives', (req, res) => {
  const config = readJSON(configPath) || { drives: [] };
  const user = req.user;
  
  if (user.role === 'admin') {
    return res.json(config.drives || []);
  }
  
  // Filter for Masters: only drives where byUser[id].manage === true
  const drives = (config.drives || []).filter(d => {
    if (!d.permissions || !d.permissions.byUser || !d.permissions.byUser[user.id]) return false;
    return !!d.permissions.byUser[user.id].manage;
  });
  
  res.json(drives);
});

router.post('/drives', requireMaster, (req, res) => {
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
      master: { read: true, upload: true, delete: true },
      user: { read: true, upload: false, delete: false },
      byUser: {}
    },
    createdAt: new Date().toISOString()
  };

  // Automatically grant 'manage' permission to Master users on creation
  if (req.user.role === 'master') {
    if (!drive.permissions.byUser) drive.permissions.byUser = {};
    drive.permissions.byUser[req.user.id] = {
      read: true,
      upload: true,
      delete: true,
      manage: true
    };
  }

  if (!config.drives) config.drives = [];
  config.drives.push(drive);
  writeJSON(configPath, config);
  res.json(drive);
});

router.put('/drives/:id', requireMaster, (req, res) => {
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
  
  if (permissions) {
    // Only Admin can change group permissions
    if (req.user.role === 'admin') {
      config.drives[idx].permissions = permissions;
    } else {
      // Master can only change individual user permissions (byUser)
      // AND cannot change the 'manage' permission
      if (!config.drives[idx].permissions) {
        config.drives[idx].permissions = { 
          master: { read: true, upload: true, delete: true }, 
          user: { read: true, upload: false, delete: false }, 
          byUser: {} 
        };
      }
      
      const oldByUser = config.drives[idx].permissions.byUser || {};
      const newByUser = permissions.byUser || {};
      
      // Merge, preserving the 'manage' flag from the current config
      for (const uid in newByUser) {
        const oldManage = oldByUser[uid] ? !!oldByUser[uid].manage : false;
        newByUser[uid].manage = oldManage;
      }
      
      config.drives[idx].permissions.byUser = newByUser;
    }
  }

  writeJSON(configPath, config);
  res.json(config.drives[idx]);
});

router.delete('/drives/:id', requireMaster, (req, res) => {
  const config = readJSON(configPath) || { drives: [] };
  config.drives = (config.drives || []).filter(d => d.id !== req.params.id);
  writeJSON(configPath, config);
  res.json({ success: true });
});

router.get('/browse/drives', requireMaster, (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  if (role !== 'admin') {
    const config = readJSON(configPath) || { drives: [] };
    const drives = config.drives || [];
    const managed = drives.filter(d => {
      return d.permissions?.byUser?.[userId]?.manage === true;
    });

    return res.json(managed.map(d => ({
      name: d.name,
      path: d.path,
      free: 0,
      total: 0
    })));
  }

  try {
    // Admin sees all system drives
    const command = 'powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free, @{Name=\'Total\';Expression={$_.Used + $_.Free}}, @{Name=\'Description\';Expression={(Get-WmiObject Win32_LogicalDisk -Filter \\"DeviceID=\'$($_.Name):\'\\").VolumeName}} | ConvertTo-Json"';
    const output = execSync(command).toString();
    const data = JSON.parse(output);
    const drives = Array.isArray(data) ? data : [data];
    
    const result = drives.map(d => ({
      name: d.Description || `Disco (${d.Name}:)`,
      path: `${d.Name}:\\`,
      free: d.Free || 0,
      total: d.Total || 0,
      isNetwork: false
    }));
    
    res.json(result);
  } catch (err) {
    const drives = [];
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i) + ':';
      try {
        if (fs.existsSync(letter)) {
          drives.push({ name: `Disco (${letter})`, path: letter + '\\', free: 0, total: 0 });
        }
      } catch(e) {}
    }
    res.json(drives);
  }
});

router.get('/browse/path', requireMaster, (req, res) => {
  const { path: folderPath } = req.query;
  const userId = req.user.id;
  const role = req.user.role;

  if (!folderPath) return res.status(400).json({ error: 'Caminho não especificado' });

  // Security check for Masters
  if (role !== 'admin') {
    const config = readJSON(configPath) || { drives: [] };
    const drives = config.drives || [];
    const isAllowed = drives.some(d => {
      return d.permissions?.byUser?.[userId]?.manage === true && folderPath.toLowerCase().startsWith(d.path.toLowerCase());
    });
    if (!isAllowed) return res.status(403).json({ error: 'Acesso negado a este caminho' });
  }

  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    const folders = [];
    
    for (const f of files) {
      if (f.isDirectory()) {
        try {
          // Verify access by joining properly
          const fullPath = path.join(folderPath, f.name);
          // Just a quick check to see if we can read it
          fs.accessSync(fullPath, fs.constants.R_OK);
          folders.push({
            name: f.name,
            path: fullPath
          });
        } catch (e) {
          // Skip folders with no access (e.g. System Volume Information)
        }
      }
    }
    
    folders.sort((a, b) => a.name.localeCompare(b.name));
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === USERS ===

router.get('/users', requireMaster, (req, res) => {
  const users = readJSON(usersPath) || [];
  
  // Master users cannot see Admin users
  let filteredUsers = users;
  if (req.user.role === 'master') {
    filteredUsers = users.filter(u => u.role !== 'admin');
  }

  res.json(filteredUsers.map(u => ({
    id: u.id, username: u.username, role: u.role, createdAt: u.createdAt
  })));
});

router.post('/users', requireMaster, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
  }

  // Master can only create 'master' or 'user'
  if (req.user.role === 'master' && role === 'admin') {
    return res.status(403).json({ error: 'Você não pode criar usuários administradores' });
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

router.put('/users/:id', requireMaster, async (req, res) => {
  const { username, password, role } = req.body;
  const users = readJSON(usersPath) || [];
  const idx = users.findIndex(u => u.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const targetUser = users[idx];
  if (global.addLog) global.addLog('DEBUG', `Update user: ${req.user.username}(${req.user.role}) -> ${targetUser.username}(${targetUser.role}) to role: ${role}`, req.ip);

  if (req.user.role === 'master') {
    // Master can edit anyone EXCEPT Admins and themselves (the self-edit check is usually in the UI or handled by ID)
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Você não pode modificar administradores' });
    }
    // Cannot promote anyone to Admin
    if (role === 'admin') {
      return res.status(403).json({ error: 'Você não pode promover usuários a administradores' });
    }
  }

  if (username) {
    if (users.find(u => u.username === username && u.id !== req.params.id)) {
      return res.status(400).json({ error: 'Nome já em uso' });
    }
    users[idx].username = username;
  }
  if (password) {
    // SECURITY: Master can only change password if they know the old one
    if (req.user.role === 'master') {
      const { oldPassword } = req.body;
      if (!oldPassword) {
        return res.status(400).json({ error: 'A senha atual do usuário é obrigatória para realizar a alteração' });
      }
      const isMatch = await bcrypt.compare(oldPassword, targetUser.password);
      if (!isMatch) {
        return res.status(403).json({ error: 'Senha atual do usuário incorreta' });
      }
    }
    users[idx].password = await bcrypt.hash(password, 10);
  }
  if (role) {
    users[idx].role = role;
  }

  writeJSON(usersPath, users);
  res.json({ id: users[idx].id, username: users[idx].username, role: users[idx].role });
});

router.delete('/users/:id', requireMaster, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Não é possível remover seu próprio usuário' });
  }

  const users = readJSON(usersPath) || [];
  const targetUser = users.find(u => u.id === req.params.id);
  
  if (!targetUser) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  // Master Restriction
  if (req.user.role === 'master' && targetUser.role === 'admin') {
    return res.status(403).json({ error: 'Você não pode remover administradores' });
  }

  // Admin Deletion Safety: Always keep at least one admin
  if (targetUser.role === 'admin') {
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Não é possível remover o último administrador do sistema' });
    }
  }

  writeJSON(usersPath, users.filter(u => u.id !== req.params.id));
  res.json({ success: true });
});

// === SESSIONS ===

router.get('/sessions', requireAdmin, (req, res) => {
  res.json(getActiveSessions());
});

router.delete('/sessions/:id', requireAdmin, (req, res) => {
  removeSessionById(req.params.id);
  res.json({ success: true });
});

// === SERVER CONFIG ===

router.get('/server', requireAdmin, (req, res) => {
  const config = readJSON(configPath) || {};
  res.json({
    port: config.port || 3000,
    serverName: config.serverName || 'EBM SERVER',
    dnsRecords: config.dnsRecords || [],
    dnsAutoRefresh: config.dnsAutoRefresh !== false,
    dnsInterval: config.dnsInterval || 5,
    dnsCheckInterval: config.dnsCheckInterval || 1,
    nextCheckSeconds: global.nextCheckTime ? Math.max(0, Math.floor((global.nextCheckTime - Date.now()) / 1000)) : 0,
    nextUpdateSeconds: global.nextUpdateTime ? Math.max(0, Math.floor((global.nextUpdateTime - Date.now()) / 1000)) : 0,
    camera: config.camera || { ip: '', port: '', user: '', pass: '', rtspPort: 554 }
  });
});

router.get('/server/ip', requireAdmin, async (req, res) => {
  try {
    const { getPublicIP } = require('../ddns');
    const ip = await getPublicIP();
    res.json({ ip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/server', requireAdmin, (req, res) => {
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
    nextCheckSeconds: global.nextCheckTime ? Math.max(0, Math.floor((global.nextCheckTime - Date.now()) / 1000)) : 0,
    nextUpdateSeconds: global.nextUpdateTime ? Math.max(0, Math.floor((global.nextUpdateTime - Date.now()) / 1000)) : 0,
    needsRestart: port ? true : false
  });
});

router.post('/server/ddns/test', requireAdmin, async (req, res) => {
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
router.get('/logs', requireAdmin, (req, res) => {
  res.json(global.serverLogs || []);
});

// === SERVER CONTROL ===

router.post('/server/shutdown', requireAdmin, (req, res) => {
  const { clearAllSessions } = require('../sessions');
  clearAllSessions();
  res.json({ success: true, message: 'Servidor desligando...' });
  setTimeout(() => { process.exit(0); }, 500);
});

router.post('/server/restart', requireAdmin, (req, res) => {
  const { clearAllSessions } = require('../sessions');
  clearAllSessions();
  res.json({ success: true, message: 'Servidor reiniciando...' });
  setTimeout(() => { process.exit(99); }, 500);
});

// === STARTUP CONTROL ===
router.get('/server/startup', requireAdmin, (req, res) => {
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

router.post('/server/startup', requireAdmin, (req, res) => {
  const { enabled } = req.body;
  const { execSync } = require('child_process');
  
  const projectRoot = path.resolve(__dirname, '..');
  const runnerBatPath = path.join(projectRoot, 'run_at_boot.bat');
  const startupPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'EBMSERVER.lnk');

  // Always try to remove the old shortcut if it exists
  if (fs.existsSync(startupPath)) {
    try { fs.unlinkSync(startupPath); } catch(e) {}
  }

  if (enabled) {
    try {
      // Create a runner batch file that sets the environment and starts the server
      const runnerContent = `@echo off\r\nset EBMSERVER_DATA_DIR=${DATA_DIR}\r\nset EBMSERVER_TASK=1\r\ncd /d "${projectRoot}"\r\ncall start.bat`;
      fs.writeFileSync(runnerBatPath, runnerContent);
      
      // Create a temporary batch file to perform the registration with elevation
      const setupBatPath = path.join(os.tmpdir(), 'setup_ebm_task.bat');
      // Simple quoting for the batch file
      const taskCmd = `@echo off\r\nschtasks /create /tn EBMSERVER /tr "${runnerBatPath}" /sc onstart /ru SYSTEM /rl HIGHEST /f`;
      fs.writeFileSync(setupBatPath, taskCmd);
      
      const psCommand = `powershell -Command "Start-Process '${setupBatPath}' -Verb RunAs -Wait"`;
      execSync(psCommand);
      
      // Check if it actually worked
      try {
        execSync('schtasks /query /tn EBMSERVER', { stdio: 'ignore' });
      } catch (e) {
        throw new Error('A tarefa não foi criada. Verifique se você aceitou o aviso de Administrador do Windows.');
      }

      if (fs.existsSync(setupBatPath)) fs.unlinkSync(setupBatPath);
      res.json({ success: true, enabled: true });
    } catch (err) {
      console.error('Startup Setup Error:', err);
      res.status(500).json({ error: err.message });
    }
  } else {
    try {
      if (fs.existsSync(runnerBatPath)) fs.unlinkSync(runnerBatPath);
      const psCommand = `powershell -Command "Start-Process schtasks -ArgumentList '/delete /tn EBMSERVER /f' -Verb RunAs -Wait"`;
      execSync(psCommand);
      res.json({ success: true, enabled: false });
    } catch (err) {
      res.json({ success: true, enabled: false });
    }
  }
});

module.exports = router;
