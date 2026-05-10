const https = require('https');
const fs = require('fs');
const path = require('path');

let checkInterval = null;

async function getPublicIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data).ip);
        } catch (e) {
          reject(new Error('Falha ao obter IP público'));
        }
      });
    }).on('error', reject);
  });
}

async function cfRequest(zoneId, path, method, token, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4/zones/${zoneId}${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Resposta inválida do Cloudflare'));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function updateDDNS(config) {
  const records = config.ddnsRecords || [];
  if (!records.length) return;

  try {
    const currentIp = await getPublicIP();
    let changed = false;

    for (let i = 0; i < records.length; i++) {
      const ddns = records[i];
      if (!ddns.enabled || !ddns.token || !ddns.zoneId || !ddns.recordName) continue;

      if (currentIp === ddns.lastIp) continue;

      try {
        // 1. Find the record
        const listRes = await cfRequest(ddns.zoneId, `/dns_records?name=${ddns.recordName}`, 'GET', ddns.token);
        if (!listRes.success) throw new Error(listRes.errors?.[0]?.message || 'Falha ao listar records');
        
        const record = listRes.result?.[0];
        if (!record) throw new Error(`DNS Record "${ddns.recordName}" não encontrado.`);

        if (record.content === currentIp) {
          records[i].lastIp = currentIp;
          changed = true;
          continue;
        }

        // 2. Update the record
        const updateRes = await cfRequest(ddns.zoneId, `/dns_records/${record.id}`, 'PATCH', ddns.token, {
          content: currentIp,
          proxied: !!ddns.proxied
        });

        if (!updateRes.success) throw new Error(updateRes.errors?.[0]?.message || 'Falha ao atualizar');

        console.log(`[DDNS] Atualizado: ${ddns.recordName} -> ${currentIp}`);
        records[i].lastIp = currentIp;
        changed = true;
        if (global.addLog) global.addLog('INFO', `DDNS: ${ddns.recordName} atualizado para ${currentIp}`, 'System');
      } catch (err) {
        console.error(`[DDNS Error] ${ddns.recordName}:`, err.message);
        if (global.addLog) global.addLog('ERROR', `DDNS (${ddns.recordName}): ${err.message}`, 'System');
      }
    }

    if (changed) {
      saveRecords(records);
    }

  } catch (err) {
    console.error('[DDNS Error]', err.message);
  }
}

function saveRecords(records) {
  try {
    const configPath = path.join(__dirname, 'data', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.ddnsRecords = records;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {}
}

function initDDNS() {
  if (checkInterval) clearInterval(checkInterval);

  const check = () => {
    try {
      const configPath = path.join(__dirname, 'data', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        updateDDNS(config);
      }
    } catch (e) {}
  };

  // Check every 5 minutes
  check();
  checkInterval = setInterval(check, 300000);
}

module.exports = { initDDNS, updateDDNS, getPublicIP };
