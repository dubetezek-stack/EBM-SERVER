const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
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
      installed: ['explorer', 'speedtest', 'cameras', 'settings']
    };
    writeJSON(appsConfigPath, config);
  }
  return config;
}

ensureAppsConfig();

router.use(authenticate);

router.get('/list', (req, res) => {
  const config = ensureAppsConfig();
  res.json(config.available || []);
});

router.get('/installed', (req, res) => {
  const config = ensureAppsConfig();
  const available = config.available || [];
  const installedIds = config.installed || [];
  
  const installedApps = available.filter(app => installedIds.includes(app.id));
  res.json(installedApps);
});

router.post('/install/:id', (req, res) => {
  const appId = req.params.id;
  const config = readJSON(appsConfigPath);
  
  if (!config.installed) config.installed = [];
  if (!config.installed.includes(appId)) {
    config.installed.push(appId);
    writeJSON(appsConfigPath, config);
  }
  
  res.json({ success: true, appId });
});

router.post('/uninstall/:id', (req, res) => {
  const appId = req.params.id;
  const config = readJSON(appsConfigPath);
  
  if (config.installed) {
    config.installed = config.installed.filter(id => id !== appId);
    writeJSON(appsConfigPath, config);
  }
  
  res.json({ success: true, appId });
});

module.exports = router;
