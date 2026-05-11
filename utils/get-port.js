const path = require('path');
const { readJSON, DATA_DIR } = require(path.join(__dirname, 'storage'));

try {
  const config = readJSON(path.join(DATA_DIR, 'config.json'));
  console.log(config && config.port ? config.port : 3000);
} catch (e) {
  console.log(3000);
}
