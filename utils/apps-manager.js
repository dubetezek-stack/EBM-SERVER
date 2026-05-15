const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { DATA_DIR } = require('./storage');

const APPS_BASE_DIR = path.join(DATA_DIR, 'apps');
if (!fs.existsSync(APPS_BASE_DIR)) fs.mkdirSync(APPS_BASE_DIR, { recursive: true });

class AppsManager {
  constructor() {
    this.processes = {}; // appId -> ChildProcess
  }

  /**
   * Installs an app from a ZIP file
   */
  async installApp(appId, zipPath) {
    const dest = path.join(APPS_BASE_DIR, appId);
    
    // Clean existing directory for a fresh install
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.mkdirSync(dest, { recursive: true });
    
    // Extract ZIP
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(dest, true);
      
      // Some ZIPs have a nested folder. Let's check if we should flatten it.
      const entries = fs.readdirSync(dest);
      if (entries.length === 1 && fs.statSync(path.join(dest, entries[0])).isDirectory()) {
        const nestedDir = path.join(dest, entries[0]);
        const files = fs.readdirSync(nestedDir);
        files.forEach(f => {
          fs.renameSync(path.join(nestedDir, f), path.join(dest, f));
        });
        fs.rmdirSync(nestedDir);
      }
      
      return dest;
    } catch (err) {
      throw new Error(`Falha na extração do ZIP: ${err.message}`);
    }
  }

  /**
   * Spawns an app process
   */
  spawnApp(appId, execRelativePath) {
    if (this.processes[appId]) {
       // Already running? Check if process is still alive
       try {
         process.kill(this.processes[appId].pid, 0);
         return this.processes[appId];
       } catch (e) {
         delete this.processes[appId];
       }
    }

    const appDir = path.join(APPS_BASE_DIR, appId);
    const fullExecPath = path.join(appDir, execRelativePath);
    const exeDir = path.dirname(fullExecPath);

    if (!fs.existsSync(fullExecPath)) {
      throw new Error(`Executável não encontrado: ${fullExecPath}`);
    }

    const child = spawn(fullExecPath, [], {
      cwd: exeDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    child.unref();
    this.processes[appId] = child;

    child.on('exit', (code) => {
      delete this.processes[appId];
      if (global.addLog) global.addLog('INFO', `App ${appId} encerrado com código ${code}`);
    });

    child.on('error', (err) => {
      delete this.processes[appId];
      if (global.addLog) global.addLog('ERROR', `Erro no App ${appId}: ${err.message}`);
    });

    if (global.addLog) global.addLog('INFO', `App ${appId} iniciado com PID ${child.pid}`);
    return child;
  }

  /**
   * Stops a running app
   */
  stopApp(appId) {
    const child = this.processes[appId];
    if (child) {
      // On Windows, child.kill() might not kill sub-processes. 
      // But for simple apps it works.
      try {
        process.kill(child.pid, 'SIGTERM');
      } catch (e) {
        // Fallback to taskkill on Windows if needed
        if (process.platform === 'win32') {
           spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
        }
      }
      delete this.processes[appId];
      return true;
    }
    return false;
  }

  isAppRunning(appId) {
    if (!this.processes[appId]) return false;
    try {
      process.kill(this.processes[appId].pid, 0);
      return true;
    } catch (e) {
      delete this.processes[appId];
      return false;
    }
  }

  getAppDir(appId) {
    return path.join(APPS_BASE_DIR, appId);
  }
}

module.exports = new AppsManager();
