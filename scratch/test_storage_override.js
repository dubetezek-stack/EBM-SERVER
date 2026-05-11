const path = require('path');
const os = require('os');

// Set the env var
const testPath = 'C:\\Temp\\.ebmtest';
process.env.EBMSERVER_DATA_DIR = testPath;

// Reload storage (using a fresh require might be needed if it was already cached, 
// but in a script it's fine)
const { DATA_DIR } = require('../utils/storage');

console.log('Expected:', testPath);
console.log('Actual:', DATA_DIR);

if (DATA_DIR === testPath) {
    console.log('SUCCESS: DATA_DIR override works!');
} else {
    console.log('FAILURE: DATA_DIR override failed!');
    process.exit(1);
}
