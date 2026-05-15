const { readJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');
const apps = readJSON(path.join(DATA_DIR, 'apps.json'));
console.log(JSON.stringify(apps, null, 2));
