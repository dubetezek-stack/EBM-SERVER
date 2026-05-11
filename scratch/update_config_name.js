const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');
const configPath = path.join(DATA_DIR, 'config.json');
const config = readJSON(configPath) || {};
config.serverName = 'EBM SERVER';
writeJSON(configPath, config);
console.log('Config updated to EBM SERVER');
