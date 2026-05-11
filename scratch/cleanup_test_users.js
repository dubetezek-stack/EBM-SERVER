const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');
const usersPath = path.join(DATA_DIR, 'users.json');

const users = readJSON(usersPath) || [];
const originalCount = users.length;

// Keep only users that are NOT 'master' or 'normal'
const filteredUsers = users.filter(u => u.username !== 'master' && u.username !== 'normal');

if (filteredUsers.length !== originalCount) {
    writeJSON(usersPath, filteredUsers);
    console.log(`Limpeza concluída. Usuários removidos: ${originalCount - filteredUsers.length}`);
    console.log('Usuários restantes:', filteredUsers.map(u => u.username));
} else {
    console.log('Nenhum usuário de teste encontrado para remover.');
}
