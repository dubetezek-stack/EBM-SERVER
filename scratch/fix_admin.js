const bcrypt = require('bcryptjs');
const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');
const path = require('path');

async function fixAdmin() {
    const usersPath = path.join(DATA_DIR, 'users.json');
    const configPath = path.join(DATA_DIR, 'config.json');

    const users = readJSON(usersPath) || [];
    const config = readJSON(configPath) || {};

    console.log('Current users:', users.map(u => u.username));

    const admin = users.find(u => u.username === 'admin');
    if (admin) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        admin.password = hashedPassword;
        console.log('Updated admin password to "admin"');
    } else {
        const hashedPassword = await bcrypt.hash('admin', 10);
        users.push({
            id: 'fixed-admin-id',
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        console.log('Created new admin user with password "admin"');
    }

    if (!config.jwtSecret) {
        config.jwtSecret = require('crypto').randomBytes(64).toString('hex');
        console.log('Generated new jwtSecret');
    }

    writeJSON(usersPath, users);
    writeJSON(configPath, config);
    console.log('Done.');
}

fixAdmin().catch(console.error);
