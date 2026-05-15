const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.webfileexplorer');
const configPath = path.join(DATA_DIR, 'config.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
console.log('Secret in config:', config.jwtSecret);

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMyMTFkM2NlLTQyOTgtNGFmMC1hNDkxLWFkMTc5ZDVkZTE5NyIsImlhdCI6MTc3ODgxOTU0NywiZXhwIjoxNzc5NDI0MzQ3fQ.sxxvZFxDPfwkf3Ve06bj7KDVYdJ53DMWcOXRSGm4QTc';

try {
    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('Verification SUCCESS:', decoded);
} catch (e) {
    console.log('Verification FAILED:', e.message);
}
