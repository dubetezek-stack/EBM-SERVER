const { readJSON, writeJSON } = require('../utils/storage');

const configPath = path.join(os.homedir(), '.WebFileExplorer', 'config.json');
const config = readJSON(configPath);

config.camera = {
  ip: '192.168.2.40',
  port: '40001',
  user: 'admin',
  pass: 'Eduardo1',
  rtspPort: 554
};

writeJSON(configPath, config);
console.log('Config updated with camera settings.');
