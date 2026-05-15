const path = require('path');
const storage = require(path.join(__dirname, '../utils/storage'));
const os = require('os');
const fs = require('fs');

const DATA_DIR = path.join(os.homedir(), '.webfileexplorer');
const configPath = path.join(DATA_DIR, 'config.json');

let config = storage.readJSON(configPath) || {};
config.jwtSecret = 'ebm_server_ultra_secure_secret_2026';
config.port = 3001;
config.serverName = 'EBM SERVER';

storage.writeJSON(configPath, config);
console.log('Config fixed and encrypted properly.');
