// Session tracking (Persistent)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Access DATA_DIR from storage utility
const DATA_DIR = path.join(os.homedir(), '.webfileexplorer');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');

let sessions = new Map();

// Load sessions on startup
try {
  if (fs.existsSync(SESSIONS_PATH)) {
    const data = JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf8'));
    sessions = new Map(Object.entries(data));
  }
} catch (e) {
  sessions = new Map();
}

function saveSessions() {
  try {
    const data = Object.fromEntries(sessions);
    fs.writeFileSync(SESSIONS_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function getSessionId(token) {
  return token ? token.substring(token.length - 32) : null;
}

function addSession(token, data) {
  const id = getSessionId(token);
  if (!id) return;
  
  let mac = 'N/A';
  try {
    if (data.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
      const cleanIp = data.ip.replace('::ffff:', '');
      const result = execSync(`arp -a ${cleanIp}`, { encoding: 'utf8', timeout: 3000 });
      const match = result.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
      if (match) mac = match[0].toUpperCase();
    }
  } catch (e) {}

  sessions.set(id, {
    sessionId: id,
    userId: data.userId,
    username: data.username,
    role: data.role,
    ip: (data.ip || '').replace('::ffff:', ''),
    mac,
    userAgent: data.userAgent || '',
    device: parseDevice(data.userAgent || ''),
    loginTime: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  });
  saveSessions();
}

function updateActivity(token) {
  const id = getSessionId(token);
  const session = sessions.get(id);
  if (session) {
    session.lastActivity = new Date().toISOString();
    saveSessions();
  }
}

function isSessionActive(token) {
  const id = getSessionId(token);
  return sessions.has(id);
}

function removeSession(token) {
  const id = getSessionId(token);
  sessions.delete(id);
  saveSessions();
}

function removeSessionById(sessionId) {
  sessions.delete(sessionId);
  saveSessions();
}

function clearAllSessions() {
  sessions.clear();
  saveSessions();
}

function getActiveSessions() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [id, s] of sessions) {
    if (new Date(s.lastActivity).getTime() < cutoff) {
      sessions.delete(id);
      changed = true;
    }
  }
  if (changed) saveSessions();
  return Array.from(sessions.values());
}

function parseDevice(ua) {
  if (!ua) return 'Desconhecido';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Outro';
}

function getSession(token) {
  const id = getSessionId(token);
  return sessions.get(id);
}

module.exports = { addSession, updateActivity, removeSession, removeSessionById, clearAllSessions, getActiveSessions, getSessionId, isSessionActive, getSession };
