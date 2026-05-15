const { readJSON, writeJSON, DATA_DIR } = require('./utils/storage');
const path = require('path');

const appsConfigPath = path.join(DATA_DIR, 'apps.json');
const config = readJSON(appsConfigPath);

if (config && config.available) {
  const jellyfin = config.available.find(a => a.id === 'jellyfin');
  if (jellyfin) {
    console.log('Updating Jellyfin definition in apps.json');
    jellyfin.installerPath = 'jellyfin_10.11.8-amd64.zip';
    jellyfin.execPath = 'jellyfin/jellyfin.exe'; // Use the nested path for now
    writeJSON(appsConfigPath, config);
    console.log('Updated.');
  }
}
