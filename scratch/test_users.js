const bcrypt = require('bcryptjs');
const { readJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');

const usersPath = path.join(DATA_DIR, 'users.json');
const users = readJSON(usersPath);

console.log('Users found:', users ? users.length : 'null');
if (users) {
    users.forEach(u => {
        console.log('User:', u.username, 'Role:', u.role);
    });

    const admin = users.find(u => u.username === 'admin');
    if (admin) {
        console.log('Admin password hash:', admin.password);
    }
} else {
    console.log('Could not read users from:', usersPath);
}
