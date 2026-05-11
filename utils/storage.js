const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// AES-256-CBC Encryption settings
const ALGORITHM = 'aes-256-cbc';
// In a real production environment, this key should be in an environment variable
const STORAGE_KEY = Buffer.from('4a616d6573426f6e643030375365637265744b6579313233343536373839303132', 'hex'); // 32 bytes

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
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, STORAGE_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text; // Return original if decryption fails (might be plain text)
  }
}

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return null;

    // Check if it's already encrypted (our format is hex:hex)
    if (raw.includes(':') && !raw.startsWith('{') && !raw.startsWith('[')) {
      const decrypted = decrypt(raw);
      return JSON.parse(decrypted);
    }

    // If it's plain text, parse it and then encrypt it for next time
    const data = JSON.parse(raw);
    writeJSON(filePath, data);
    return data;
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
  decrypt
};
