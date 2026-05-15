const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { authenticate, getUsers } = require('../middleware/auth');
const { addSession } = require('../sessions');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Simple In-Memory Rate Limiting
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function checkRateLimit(req, res, next) {
  const ip = (req.ip || '').replace('::ffff:', '');
  const now = Date.now();
  const attemptData = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  // Reset if window has passed
  if (now - attemptData.lastAttempt > RATE_LIMIT_WINDOW) {
    attemptData.count = 0;
  }

  if (attemptData.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - attemptData.lastAttempt)) / 60000);
    return res.status(429).json({ 
      error: 'Muitas tentativas de login. Por segurança, aguarde ' + minutesLeft + ' minuto(s).' 
    });
  }

  next();
}

// Middleware to authenticate during mandatory 2FA setup
function authenticateSetup(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query?.token || req.cookies?.ebm_auth_token;
  if (!token) return res.status(401).json({ error: 'Token ausente' });

  const { getConfig, getUsers } = require('../middleware/auth');
  const config = getConfig();
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    // Allow either fully authenticated OR setup-pending
    if (!decoded.twoFactorSetupPending) {
       // If it's not a setup token, it MUST be a regular session token
       const { isSessionActive } = require('../sessions');
       if (!isSessionActive(token)) return res.status(401).json({ error: 'Sessão inválida' });
    }
    
    const users = getUsers();
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    
    req.user = user;
    req.isSetupToken = !!decoded.twoFactorSetupPending;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token expirado ou inválido' });
  }
}

function recordLoginAttempt(ip, success) {
  const cleanIp = (ip || '').replace('::ffff:', '');
  const now = Date.now();
  if (success) {
    loginAttempts.delete(cleanIp);
  } else {
    const data = loginAttempts.get(cleanIp) || { count: 0, lastAttempt: 0 };
    data.count++;
    data.lastAttempt = now;
    loginAttempts.set(cleanIp, data);
  }
}

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
      role: admin.role,
      ip: session ? session.ip : (req.ip || '').replace('::ffff:', ''),
      mac: session ? session.mac : 'N/A',
      settings: admin.settings || {}
    } 
  });
});

// Login
router.post('/login', checkRateLimit, async (req, res) => {
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
    recordLoginAttempt(req.ip, false);
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    console.log('Login failed: Invalid password for:', username);
    global.addLog('WARN', 'Login falhou: Senha inválida para: ' + username, req.ip);
    recordLoginAttempt(req.ip, false);
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  console.log('Login success:', username);

  const config = readJSON(configPath) || { jwtSecret: 'defaultSecret' };

  if (user.twoFactorEnabled) {
    console.log('[Auth] 2FA Pendente para:', user.username);
    const tempToken = jwt.sign({ id: user.id, twoFactorPending: true }, config.jwtSecret, { expiresIn: '5m' });
    return res.json({ twoFactorRequired: true, tempToken });
  }
  
  // New Security Rule: Force 2FA for Admin and Master
  const userRole = (user.role || '').toLowerCase();
  if (userRole === 'admin' || userRole === 'master') {
    console.log('[Auth] Setup 2FA OBRIGATORIO para:', user.username, '(' + user.role + ')');
    const setupToken = jwt.sign({ id: user.id, twoFactorSetupPending: true }, config.jwtSecret, { expiresIn: '10m' });
    return res.json({ twoFactorSetupRequired: true, tempToken: setupToken });
  }

  const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });
  const sessionData = { userId: user.id, username: user.username, role: user.role, ip: req.ip, userAgent: req.headers['user-agent'] };
  addSession(token, sessionData);
  recordLoginAttempt(req.ip, true);

  // Get the session we just created to have the MAC
  const { getSession } = require('../sessions');
  const session = getSession(token);

  res.json({ 
    token, 
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      twoFactorEnabled: !!user.twoFactorEnabled,
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
    twoFactorEnabled: !!req.user.twoFactorEnabled,
    ip: req.user.ip || '',
    mac: req.user.mac || 'N/A',
    settings: req.user.settings || {}
  });
});

// --- 2FA Endpoints ---

// Get 2FA Setup (Secret + QR)
router.get('/2fa/setup', authenticateSetup, async (req, res) => {
  const user = req.user;
  const secret = speakeasy.generateSecret({
    name: `EBM SERVER (${user.username})`
  });
  
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  
  res.json({
    secret: secret.base32,
    qrCode: qrCodeDataUrl
  });
});

// Enable 2FA
router.post('/2fa/enable', authenticateSetup, async (req, res) => {
  const { secret, code } = req.body;
  
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: code
  });
  
  if (!verified) {
    return res.status(400).json({ error: 'Código de verificação inválido' });
  }

  const recoveryCodes = [];
  for (let i = 0; i < 10; i++) {
    recoveryCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  
  const users = getUsers();
  const userIdx = users.findIndex(u => u.id === req.user.id);
  if (userIdx === -1) return res.status(404).json({ error: 'Usuário não encontrado' });
  
  users[userIdx].twoFactorSecret = secret;
  users[userIdx].twoFactorEnabled = true;
  users[userIdx].recoveryCodes = recoveryCodes;
  writeJSON(usersPath, users);
  
  // If this was a mandatory setup, issue the final token
  if (req.isSetupToken) {
    const config = readJSON(configPath) || { jwtSecret: 'defaultSecret' };
    const finalToken = jwt.sign({ id: req.user.id }, config.jwtSecret, { expiresIn: '7d' });
    const sessionData = { userId: req.user.id, username: req.user.username, role: req.user.role, ip: req.ip, userAgent: req.headers['user-agent'] };
    addSession(finalToken, sessionData);
    
    const { getSession } = require('../sessions');
    const session = getSession(finalToken);
    
    return res.json({ 
      success: true,
      recoveryCodes,
      token: finalToken, 
      user: { 
        id: req.user.id, 
        username: req.user.username, 
        role: req.user.role,
        ip: session ? session.ip : (req.ip || '').replace('::ffff:', ''),
        mac: session ? session.mac : 'N/A',
        settings: req.user.settings || {}
      } 
    });
  }

  res.json({ success: true, recoveryCodes });
});

// Disable 2FA
router.post('/2fa/disable', authenticate, async (req, res) => {
  const users = getUsers();
  const userIdx = users.findIndex(u => u.id === req.user.id);
  if (userIdx === -1) return res.status(404).json({ error: 'Usuário não encontrado' });
  
  users[userIdx].twoFactorSecret = null;
  users[userIdx].twoFactorEnabled = false;
  writeJSON(usersPath, users);
  
  res.json({ success: true });
});

// Verify 2FA during Login
router.post('/2fa/verify', checkRateLimit, async (req, res) => {
  const { token, code } = req.body;
  if (!token || !code) return res.status(400).json({ error: 'Token e código são obrigatórios' });
  
  const config = readJSON(configPath) || { jwtSecret: 'defaultSecret' };
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded.twoFactorPending) return res.status(400).json({ error: 'Token inválido' });
    
    const users = getUsers();
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    let isRecovery = false;
    if (!verified) {
      // Check recovery codes
      const recoveryIdx = (user.recoveryCodes || []).indexOf(code.toUpperCase());
      if (recoveryIdx !== -1) {
        isRecovery = true;
        user.recoveryCodes.splice(recoveryIdx, 1);
        const usersAll = getUsers();
        const uIdx = usersAll.findIndex(u => u.id === user.id);
        if (uIdx !== -1) {
          usersAll[uIdx].recoveryCodes = user.recoveryCodes;
          writeJSON(usersPath, usersAll);
        }
      }
    }
    
    if (!verified && !isRecovery) {
      recordLoginAttempt(req.ip, false);
      return res.status(401).json({ error: 'Código inválido' });
    }
    
    // Success - Issue final token
    const finalToken = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });
    const sessionData = { userId: user.id, username: user.username, role: user.role, ip: req.ip, userAgent: req.headers['user-agent'] };
    addSession(finalToken, sessionData);
    recordLoginAttempt(req.ip, true);
    
    const { getSession } = require('../sessions');
    const session = getSession(finalToken);
    
    res.json({ 
      token: finalToken, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        ip: session ? session.ip : (req.ip || '').replace('::ffff:', ''),
        mac: session ? session.mac : 'N/A',
        settings: user.settings || {}
      } 
    });
    
  } catch (e) {
    return res.status(401).json({ error: 'Sessão expirada' });
  }
});

// Reset Password using Recovery Code
router.post('/reset-password', checkRateLimit, async (req, res) => {
  try {
    const { username, recoveryCode, newPassword } = req.body;
    if (!username || !recoveryCode || !newPassword) {
      return res.status(400).json({ error: 'Preencha todos os campos (Usuário, Código e Nova Senha)' });
    }

    console.log('Password reset attempt for:', username);
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      return res.status(400).json({ error: 'Usuário "' + username + '" não encontrado' });
    }

    if (!user.twoFactorEnabled || !user.recoveryCodes || user.recoveryCodes.length === 0) {
      return res.status(400).json({ error: 'A recuperação por código não está ativa para este usuário' });
    }

    const cleanCode = recoveryCode.trim().toUpperCase();
    const recoveryIdx = user.recoveryCodes.indexOf(cleanCode);
    
    if (recoveryIdx === -1) {
      recordLoginAttempt(req.ip, false);
      global.addLog('WARN', 'Tentativa de reset de senha com código inválido: ' + username, req.ip);
      return res.status(401).json({ error: 'Código de recuperação inválido ou já utilizado' });
    }

    // Validated! Reset password
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    // Consume the recovery code
    user.recoveryCodes.splice(recoveryIdx, 1);
    
    writeJSON(usersPath, users);
    recordLoginAttempt(req.ip, true);
    
    global.addLog('SUCCESS', 'Senha resetada com sucesso via código: ' + username, req.ip);
    res.json({ success: true, message: 'Sua senha foi alterada! Você já pode fazer login.' });
  } catch (err) {
    console.error('Erro no reset de senha:', err);
    res.status(500).json({ error: 'Erro interno no servidor ao resetar senha' });
  }
});

// Reset password using recovery code
router.post('/2fa/reset-password', async (req, res) => {
  try {
    const { username, recoveryCode, newPassword } = req.body;
    if (!username || !recoveryCode || !newPassword) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const config = await readConfig();
    const user = config.users.find(u => u.username === username);

    if (!user || !user.twoFactorEnabled || !user.recoveryCodes) {
      return res.status(400).json({ error: 'Usuário não encontrado ou 2FA não ativo' });
    }

    // Verify recovery code
    const codeIndex = user.recoveryCodes.indexOf(recoveryCode.toUpperCase());
    if (codeIndex === -1) {
      return res.status(401).json({ error: 'Código de recuperação inválido' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Remove the used recovery code
    user.recoveryCodes.splice(codeIndex, 1);

    await writeConfig(config);

    res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
