// Session tracking (in-memory)
const { execSync } = require('child_process');

const sessions = new Map();

function getSessionId(token) {
  // Use last 32 chars of token as session key to allow multiple connections per user
  return token ? token.substring(token.length - 32) : null;
}

function addSession(token, data) {
  const id = getSessionId(token);
  if (!id) return;
  // Try to get MAC address from IP
  let mac = 'N/A';
  try {
    if (data.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
      const cleanIp = data.ip.replace('::ffff:', '');
      const result = execSync(`arp -a ${cleanIp}`, { encoding: 'utf8', timeout: 3000 });
      const match = result.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
      if (match) mac = match[0].toUpperCase();
    }
  } catch (e) { /* ARP may fail */ }

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
}

function updateActivity(token) {
  const id = getSessionId(token);
  const session = sessions.get(id);
  if (session) session.lastActivity = new Date().toISOString();
}

function removeSession(token) {
  const id = getSessionId(token);
  sessions.delete(id);
}

function removeSessionById(sessionId) {
  sessions.delete(sessionId);
}

function getActiveSessions() {
  // Remove sessions older than 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [id, s] of sessions) {
    if (new Date(s.lastActivity).getTime() < cutoff) sessions.delete(id);
  }
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

module.exports = { addSession, updateActivity, removeSession, removeSessionById, getActiveSessions, getSessionId };
