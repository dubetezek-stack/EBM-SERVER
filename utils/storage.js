const fs = require('fs');
const crypto = require('crypto');

// Use a unique key for the application
const SECRET_KEY = crypto.createHash('sha256').update('LUXvision_Secure_Storage_Key_2026').digest();
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return null;
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return null; // Failed to decrypt (maybe not encrypted)
  }
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return null;

  // Try to decrypt
  const decrypted = decrypt(content);
  if (decrypted) {
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      // Decrypted but not valid JSON? Should not happen.
    }
  }

  // Fallback: Check if it's plain JSON (for migration)
  try {
    const data = JSON.parse(content);
    // It's plain JSON! Migrate it by saving back (encrypted)
    // We delay this to avoid write during read if possible, but here it's safe
    const encrypted = encrypt(JSON.stringify(data, null, 2));
    fs.writeFileSync(filePath, encrypted);
    return data;
  } catch (e) {
    return null;
  }
}

function writeJSON(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  const encrypted = encrypt(json);
  fs.writeFileSync(filePath, encrypted);
}

module.exports = { readJSON, writeJSON };
