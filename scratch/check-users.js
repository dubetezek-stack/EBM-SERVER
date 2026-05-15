const { readJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');
const usersPath = path.join(DATA_DIR, 'users.json');
const users = readJSON(usersPath);
console.log(JSON.stringify(users, null, 2));
