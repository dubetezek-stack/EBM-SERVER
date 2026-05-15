const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { updateActivity, getSession, isSessionActive } = require('../sessions');
const { readJSON, DATA_DIR } = require('../utils/storage');

const dataDir = DATA_DIR;
const configPath = path.join(dataDir, 'config.json');
const usersPath = path.join(dataDir, 'users.json');

function getConfig() {
  const cfg = readJSON(configPath) || {};
  if (!cfg.drives) cfg.drives = [];
  return cfg;
}

function getUsers() {
  return readJSON(usersPath) || [];
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query?.token || req.cookies?.ebm_auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const config = getConfig();
  if (!config.jwtSecret) {
    return res.status(401).json({ error: 'Sistema não configurado' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const { isSessionActive } = require('../sessions');
    if (!isSessionActive(token)) {
      return res.status(401).json({ error: 'Sessão encerrada remotamente' });
    }
    const users = getUsers();
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    req.user = { 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      twoFactorEnabled: !!user.twoFactorEnabled,
      settings: user.settings || {} 
    };

    // Inject session info (IP, MAC)
    const session = getSession(token);
    if (session) {
      req.user.ip = session.ip;
      req.user.mac = session.mac;
    }

    // Track session activity
    updateActivity(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

function requireMaster(req, res, next) {
  if (req.user.role === 'user') {
    return res.status(403).json({ error: 'Sem permissão para esta ação' });
  }
  next();
}

// Protected Windows system paths that cannot be deleted
const PROTECTED_PATHS = [
  'windows', '$recycle.bin', '$winreagent', 'system volume information',
  'programdata', 'program files', 'program files (x86)',
  'recovery', 'perflogs', 'config.msi', 'msocache',
  'boot', 'bootmgr', 'pagefile.sys', 'hiberfil.sys', 'swapfile.sys',
  'ntldr', 'ntdetect.com', 'io.sys', 'msdos.sys'
];

function isProtectedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const parts = normalized.split('/');
  // Check if any part of the path matches a protected name
  for (const part of parts) {
    if (PROTECTED_PATHS.includes(part.toLowerCase())) return true;
  }
  return false;
}

module.exports = { authenticate, requireAdmin, requireMaster, isProtectedPath, getConfig, getUsers };
