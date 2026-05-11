const bcrypt = require('bcryptjs');
const { readJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');

async function testLogin(username, password) {
    const usersPath = path.join(DATA_DIR, 'users.json');
    const users = readJSON(usersPath) || [];
    const user = users.find(u => u.username === username);
    
    if (!user) {
        console.log('User not found');
        return;
    }
    
    const valid = await bcrypt.compare(password, user.password);
    console.log('Login result for', username, ':', valid);
}

testLogin('admin', 'admin').catch(console.error);
