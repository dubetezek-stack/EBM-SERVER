const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate, requireMaster } = require('../middleware/auth');
const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');

const appsConfigPath = path.join(DATA_DIR, 'apps.json');

// Default App Definitions
const DEFAULT_APPS = [
  { id: 'explorer', name: 'Arquivos', icon: 'folder', description: 'Gerenciador de arquivos do servidor', category: 'Sistema' },
  { id: 'speedtest', name: 'Speed Test', icon: 'speed', description: 'Teste a velocidade da sua rede local', category: 'Utilidades' },
  { id: 'cameras', name: 'Câmeras', icon: 'camera', description: 'Monitoramento de câmeras ao vivo', category: 'Segurança' },
  { id: 'settings', name: 'Configurações', icon: 'settings', description: 'Configurações do sistema', category: 'Sistema' },
  { id: 'plex', name: 'Plex', icon: 'plex', description: 'Organize e transmita sua coleção de mídia', category: 'Mídia', official: false },
  { id: 'transmission', name: 'Transmission', icon: 'download', description: 'Cliente BitTorrent leve e rápido', category: 'Utilidades', official: false },
  { id: 'homeassistant', name: 'Home Assistant', icon: 'home', description: 'Automação residencial de código aberto', category: 'Smart Home', official: false }
];

function ensureAppsConfig() {
  let config = readJSON(appsConfigPath);
  if (!config || !config.available || !config.installed) {
    config = {
      available: DEFAULT_APPS,
      installed: ['explorer', 'speedtest', 'cameras', 'settings'],
      permissions: {} // appId -> { byRole: { admin, master, user }, byUser: { userId: true/false } }
    };
    // Default: all installed apps are allowed for everyone
    config.installed.forEach(id => {
      config.permissions[id] = { 
        byRole: { admin: true, master: true, user: true },
        byUser: {}
      };
    });
    writeJSON(appsConfigPath, config);
  }
  
  // Migrate old format to new format if needed
  if (!config.permissions) config.permissions = {};
  Object.keys(config.permissions).forEach(appId => {
    const perm = config.permissions[appId];
    if (!perm.byRole) {
      // Old format, migrate it
      config.permissions[appId] = {
        byRole: {
          admin: perm.admin !== false,
          master: perm.master !== false,
          user: perm.user !== false
        },
        byUser: perm.byUser || {}
      };
    }
  });
  
  return config;
}

ensureAppsConfig();

router.use(authenticate);

// Get all available apps
router.get('/list', (req, res) => {
  const config = ensureAppsConfig();
  res.json(config.available || []);
});

// Get installed apps for current user
router.get('/installed', (req, res) => {
  const config = ensureAppsConfig();
  const available = config.available || [];
  const installedIds = config.installed || [];
  const permissions = config.permissions || {};
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const installedApps = available.filter(app => {
    if (!installedIds.includes(app.id)) return false;
    
    // Admin always has access to everything installed
    if (userRole === 'admin') return true;
    
    const appPerm = permissions[app.id];
    if (!appPerm) return true; // Default allow if no permissions set
    
    // Check user-specific permission first
    if (appPerm.byUser && userId in appPerm.byUser) {
      return appPerm.byUser[userId] === true;
    }
    
    // Check role-based permission
    const rolePerms = appPerm.byRole || {};
    return rolePerms[userRole] === true;
  });
  
  res.json(installedApps);
});

// Get all installed apps with permissions info (admin only)
router.get('/admin/installed-with-permissions', requireMaster, (req, res) => {
  
  const config = ensureAppsConfig();
  const available = config.available || [];
  const installedIds = config.installed || [];
  const permissions = config.permissions || {};
  
  // Also get users list (exclude admins from individual permission list)
  const usersPath = path.join(DATA_DIR, 'users.json');
  const allUsers = readJSON(usersPath) || [];
  const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');
  
  const installedApps = available
    .filter(app => installedIds.includes(app.id))
    .map(app => ({
      ...app,
      permissions: permissions[app.id] || { byRole: {}, byUser: {} },
      users: nonAdminUsers.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        hasAccess: hasUserAccessToApp(u.id, u.role, app.id, permissions[app.id])
      }))
    }));
  
  res.json(installedApps);
});

// Helper function to check if user has access
function hasUserAccessToApp(userId, userRole, appId, appPerm) {
  if (userRole === 'admin') return true;
  if (!appPerm) return true;
  
  // Check user-specific permission first
  if (appPerm.byUser && userId in appPerm.byUser) {
    return appPerm.byUser[userId] === true;
  }
  
  const rolePerms = appPerm.byRole || {};
  // If no role permissions are defined, default to true for compatibility
  if (Object.keys(rolePerms).length === 0) return true;
  
  return rolePerms[userRole] === true;
}

// Install app
router.post('/install/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const appId = req.params.id;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  
  if (!config.installed) config.installed = [];
  if (!config.installed.includes(appId)) {
    config.installed.push(appId);
    if (!config.permissions) config.permissions = {};
    if (!config.permissions[appId]) {
      config.permissions[appId] = { 
        byRole: { admin: true, master: true, user: true },
        byUser: {}
      };
    }
    writeJSON(appsConfigPath, config);
  }
  
  res.json({ success: true, appId });
});

// Update app permissions (by role or by user)
router.put('/permissions/:id', requireMaster, (req, res) => {
  const appId = req.params.id;
  const { byRole, byUser } = req.body;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  const userRole = req.user.role;
  const userId = req.user.id;

  // Only Admins can change group-level role permissions
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado: apenas administradores podem alterar permissões de grupo' });
  }

  if (!config.permissions) config.permissions = {};
  
  config.permissions[appId] = {
    byRole: byRole || {},
    byUser: byUser || {}
  };
  
  writeJSON(appsConfigPath, config);
  res.json({ success: true });
});

// Update permissions for specific user and app
router.put('/user-access/:appId/:userId', requireMaster, (req, res) => {
  const { appId, userId } = req.params;
  const { hasAccess } = req.body;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  const userRole = req.user.role;
  const currentUserId = req.user.id;

  // Master Restriction
  if (userRole === 'master') {
    // Must have access to the app themselves
    const canI = hasUserAccessToApp(currentUserId, userRole, appId, config.permissions[appId]);
    if (!canI) return res.status(403).json({ error: 'Acesso negado: você não tem acesso a este app' });

    // Cannot change Admin or Master users
    const users = readJSON(path.join(DATA_DIR, 'users.json')) || [];
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'admin' || targetUser?.role === 'master') {
      return res.status(403).json({ error: 'Você não pode alterar o acesso de administradores ou outros usuários master' });
    }
  }

  if (!config.permissions) config.permissions = {};
  if (!config.permissions[appId]) {
    config.permissions[appId] = { byRole: {}, byUser: {} };
  }
  
  if (!config.permissions[appId].byUser) {
    config.permissions[appId].byUser = {};
  }
  
  config.permissions[appId].byUser[userId] = hasAccess === true;
  
  writeJSON(appsConfigPath, config);
  res.json({ success: true });
});

// Uninstall app
router.post('/uninstall/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const appId = req.params.id;
  const config = readJSON(appsConfigPath) || ensureAppsConfig();
  
  if (config.installed) {
    config.installed = config.installed.filter(id => id !== appId);
    writeJSON(appsConfigPath, config);
  }
  
  res.json({ success: true, appId });
});

module.exports = router;
