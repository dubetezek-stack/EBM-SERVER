const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { readJSON, writeJSON, DATA_DIR } = require('./utils/storage');
const { exec } = require('child_process');

let statusInterval = null;

function pingDomain(domain) {
  return new Promise((resolve) => {
    exec(`ping -n 1 -w 2000 ${domain}`, (err, stdout) => {
      if (stdout) {
        const match = stdout.match(/\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?/);
        if (match && match[1]) return resolve(match[1]);
      }
      resolve('---');
    });
  });
}

async function getPublicIP() {
  const services = ['https://api.ipify.org', 'https://icanhazip.com', 'https://checkip.amazonaws.com'];
  for (const url of services) {
    try {
      return await new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 8000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const ip = data.trim();
            if (ip && ip.includes('.')) resolve(ip);
            else reject(new Error('IP inválido'));
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      });
    } catch (e) { /* try next */ }
  }
  return null;
}

function duckDnsUpdate(domain, token, ip) {
  return new Promise((resolve, reject) => {
    const url = `https://www.duckdns.org/update/${domain}/${token}/${ip}`;
    if (global.addLog) global.addLog('SYSTEM', `Enviando: ${url}`, 'DDNS');
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000, rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

// STATUS ONLY — runs on configurable check interval (default 1 min). Just pings.
async function checkStatus(config) {
  const records = config.dnsRecords || [];
  if (!records.length) return;

  let changed = false;
  try {
    const currentIp = await getPublicIP();
    
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (!rec.domains || !rec.enabled) continue;

      const domainList = rec.domains.split(',').map(d => d.trim()).filter(Boolean);
      const primaryDomain = domainList[0].includes('.') ? domainList[0] : domainList[0] + '.duckdns.org';

      const dnsIp = await pingDomain(primaryDomain);
      
      records[i].lastDnsIp = dnsIp;
      if (currentIp) {
        records[i].lastIp = currentIp;
        records[i].lastStatus = (currentIp === dnsIp) ? 'OK' : 'KO';
      }
      changed = true;
    }

    if (changed) saveRecords(records);
  } catch (err) {
    if (global.addLog) global.addLog('ERROR', `Erro no Ping/Status: ${err.message}`, 'DDNS');
  }
}

// FULL UPDATE — runs on startup, manual trigger, or when enabling a record.
async function updateDDNS(config, force = false) {
  const records = config.dnsRecords || [];
  if (!records.length) return { success: false, results: [] };

  const results = [];
  try {
    const currentIp = await getPublicIP();
    if (!currentIp) throw new Error('Não foi possível detectar o IP Público');
    if (global.addLog) global.addLog('INFO', `IP Público: ${currentIp}`, 'DDNS');

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (!rec.token || !rec.domains) continue;

      const domainList = rec.domains.split(',').map(d => d.trim()).filter(Boolean);
      const primaryDomain = domainList[0].includes('.') ? domainList[0] : domainList[0] + '.duckdns.org';

      if (!rec.enabled) {
        records[i].lastStatus = 'OFF';
        results.push({ domains: rec.domains, status: 'OFF' });
        continue;
      }

      const dnsIp = await pingDomain(primaryDomain);
      records[i].lastDnsIp = dnsIp;
      if (global.addLog) global.addLog('INFO', `ping ${primaryDomain} → ${dnsIp}`, 'DDNS');

      let allOk = true;
      for (const singleDomain of domainList) {
        const cleanDomain = singleDomain.replace('.duckdns.org', '').replace('www.', '').trim();
        try {
          const response = await duckDnsUpdate(cleanDomain, rec.token, currentIp);
          if (!response.startsWith('OK')) allOk = false;
          if (global.addLog) global.addLog(response.startsWith('OK') ? 'SUCCESS' : 'ERROR', `DuckDNS → ${response}`, 'DDNS');
        } catch (err) {
          allOk = false;
          if (global.addLog) global.addLog('ERROR', `Falha: ${err.message}`, 'DDNS');
        }
      }

      records[i].lastIp = currentIp;
      records[i].lastStatus = allOk ? 'OK' : 'KO';
      results.push({ domains: rec.domains, status: records[i].lastStatus, ip: currentIp, dnsIp });
    }

    saveRecords(records);
    return { ip: results[0] && results[0].ip, results, success: true };
  } catch (err) {
    if (global.addLog) global.addLog('ERROR', `Erro DDNS: ${err.message}`, 'DDNS');
    return { success: false, error: err.message };
  }
}

function saveRecords(records) {
  try {
    const configPath = path.join(DATA_DIR, 'config.json');
    const config = readJSON(configPath) || {};
    config.dnsRecords = records;
    writeJSON(configPath, config);
  } catch (e) {}
}

function initDDNS() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  if (global.updateInterval) {
    clearInterval(global.updateInterval);
    global.updateInterval = null;
  }

  const configPath = path.join(DATA_DIR, 'config.json');
  if (!fs.existsSync(configPath)) return;

  const config = readJSON(configPath);
  if (!config) return;
  
  if (config.dnsAutoRefresh === false) {
    if (global.addLog) global.addLog('SYSTEM', 'DDNS Automático desativado nas configurações', 'DDNS');
    return;
  }

  const records = config.dnsRecords || [];
  const hasEnabled = records.some(r => r.enabled);
  if (!hasEnabled) {
    if (global.addLog) global.addLog('SYSTEM', 'DDNS Suspenso: Nenhum domínio habilitado', 'DDNS');
    return;
  }

  const checkMs = (parseInt(config.dnsCheckInterval) || 1) * 60000;
  const updateMs = (parseInt(config.dnsInterval) || 5) * 60000;

  global.nextCheckTime = Date.now() + checkMs;
  global.nextUpdateTime = Date.now() + updateMs;

  if (global.addLog) global.addLog('SYSTEM', `DDNS Iniciado — Check: ${config.dnsCheckInterval || 1}m | Update: ${config.dnsInterval || 5}m`, 'DDNS');

  // On start: full update (get IP + DuckDNS update + ping)
  updateDDNS(config).catch(() => {});

  // On interval: status ping only
  statusInterval = setInterval(() => {
    global.nextCheckTime = Date.now() + checkMs;
    const cfg = readJSON(configPath);
    if (cfg.dnsAutoRefresh === false) return;
    checkStatus(cfg).catch(() => {});
  }, checkMs);

  // On interval: full update
  global.updateInterval = setInterval(() => {
    global.nextUpdateTime = Date.now() + updateMs;
    const cfg = readJSON(configPath);
    if (cfg.dnsAutoRefresh === false) return;
    updateDDNS(cfg).catch(() => {});
  }, updateMs);
}

module.exports = { initDDNS, updateDDNS, checkStatus, getPublicIP };

