const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');
const usersPath = path.join(DATA_DIR, 'users.json');

// Reset users to an empty array to trigger the Setup screen
writeJSON(usersPath, []);

console.log('Banco de usuários resetado.');
console.log('O servidor agora pedirá para criar um novo administrador ao abrir o navegador.');
