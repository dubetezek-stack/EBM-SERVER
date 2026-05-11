const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.WebFileExplorer', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

config.camera = {
  ip: '192.168.2.40',
  port: '40001',
  user: 'admin',
  pass: 'Eduardo1',
  rtspPort: 554
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Config updated with camera settings.');
