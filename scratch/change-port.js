const path = require('path');
const storage = require(path.join(__dirname, '../utils/storage'));
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.webfileexplorer');
const configPath = path.join(DATA_DIR, 'config.json');

let config = storage.readJSON(configPath) || {};
config.port = 3002;
config.jwtSecret = 'ebm_server_ultra_secure_secret_2026';

storage.writeJSON(configPath, config);
console.log('Port changed to 3002. Ready to start.');
