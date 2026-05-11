const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// AES-256-CBC Encryption settings
const ALGORITHM = 'aes-256-cbc';
// In a real production environment, this key should be in an environment variable
const STORAGE_KEY = Buffer.from('4a616d6573426f6e643030375365637265744b65793132333435363738393031', 'hex'); // Exactly 32 bytes

// Centralized Data Directory Logic
const os = require('os');
const DATA_DIR = process.env.EBMSERVER_DATA_DIR || path.join(os.homedir(), '.webfileexplorer');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, STORAGE_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return null;
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, STORAGE_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    // console.error('Decryption Error:', e.message);
    return null;
  }
}

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return null;

    // Check if it's likely encrypted (iv:hex)
    if (raw.includes(':') && !raw.startsWith('{') && !raw.startsWith('[')) {
      const decrypted = decrypt(raw);
      if (decrypted) {
        try {
          return JSON.parse(decrypted);
        } catch (parseErr) {
          console.error('Storage Parse Error (Encrypted):', parseErr.message);
          return null;
        }
      }
      console.error('Storage Decryption Failed for:', filePath);
      return null;
    }

    // If it's plain text, parse it and then encrypt it for next time
    try {
      const data = JSON.parse(raw);
      writeJSON(filePath, data);
      return data;
    } catch (parseErr) {
      console.error('Storage Parse Error (Plain):', parseErr.message);
      return null;
    }
  } catch (e) {
    console.error('Storage Read Error:', e.message);
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    const text = JSON.stringify(data, null, 2);
    const encrypted = encrypt(text);
    fs.writeFileSync(filePath, encrypted);
    return true;
  } catch (e) {
    console.error('Storage Write Error:', e.message);
    return false;
  }
}

module.exports = {
  readJSON,
  writeJSON,
  encrypt,
  decrypt,
  DATA_DIR
};
