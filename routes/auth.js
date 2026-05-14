const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { authenticate } = require('../middleware/auth');
const { addSession } = require('../sessions');

const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');

const dataDir = DATA_DIR;
const configPath = path.join(dataDir, 'config.json');
const usersPath = path.join(dataDir, 'users.json');

// Check if admin exists
router.get('/status', (req, res) => {
  const users = readJSON(usersPath) || [];
  const config = readJSON(configPath) || {};
  const hasAdmin = users.some(u => u.role === 'admin');
  res.json({ setupComplete: hasAdmin, serverName: config.serverName || 'EBM SERVER' });
});

// First-time setup
router.post('/setup', async (req, res) => {
  const users = readJSON(usersPath) || [];
  if (users.some(u => u.role === 'admin')) {
    return res.status(400).json({ error: 'Administrador já configurado' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const jwtSecret = crypto.randomBytes(64).toString('hex');

  const admin = {
    id: crypto.randomUUID(),
    username,
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  users.push(admin);
  writeJSON(usersPath, users);

  const config = readJSON(configPath) || {};
  config.jwtSecret = jwtSecret;
  writeJSON(configPath, config);

  const token = jwt.sign({ id: admin.id }, jwtSecret, { expiresIn: '7d' });
  const sessionData = { userId: admin.id, username: admin.username, role: admin.role, ip: req.ip, userAgent: req.headers['user-agent'] };
  addSession(token, sessionData);
  
  // Get the session we just created to have the MAC
  const { getSession } = require('../sessions');
  const session = getSession(token);
  
  res.json({ 
    token, 
    user: { 
      id: admin.id, 
      username: admin.username, 
      ip: session ? session.ip : (req.ip || '').replace('::ffff:', ''),
      mac: session ? session.mac : 'N/A',
      settings: admin.settings || {}
    } 
  });
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
  }

  console.log('Login attempt:', username);
  const users = readJSON(usersPath) || [];
  const user = users.find(u => u.username === username);
  
  if (!user) {
    console.log('Login failed: User not found:', username);
    global.addLog('WARN', 'Login falhou: Usuário não encontrado: ' + username, req.ip);
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    console.log('Login failed: Invalid password for:', username);
    global.addLog('WARN', 'Login falhou: Senha inválida para: ' + username, req.ip);
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  console.log('Login success:', username);

  const config = readJSON(configPath) || { jwtSecret: 'defaultSecret' };
  const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });
  const sessionData = { userId: user.id, username: user.username, role: user.role, ip: req.ip, userAgent: req.headers['user-agent'] };
  addSession(token, sessionData);

  // Get the session we just created to have the MAC
  const { getSession } = require('../sessions');
  const session = getSession(token);

  res.json({ 
    token, 
    user: { 
      id: user.id, 
      username: user.username, 
      ip: session ? session.ip : (req.ip || '').replace('::ffff:', ''),
      mac: session ? session.mac : 'N/A',
      settings: user.settings || {}
    } 
  });
});

// Current user info
router.get('/me', authenticate, (req, res) => {
  res.json({ 
    id: req.user.id, 
    username: req.user.username, 
    role: req.user.role,
    ip: req.user.ip || '',
    mac: req.user.mac || 'N/A',
    settings: req.user.settings || {}
  });
});

module.exports = router;
