const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const batPath = path.resolve(__dirname, '..', 'start.bat');
const dataDir = 'C:\\Users\\ebm_6\\.webfileexplorer';

try {
  const setupBatPath = path.join(os.tmpdir(), 'setup_ebm_task.bat');
  const taskCmd = `@echo off\nschtasks /create /tn EBMSERVER /tr "cmd /c \\"set EBMSERVER_DATA_DIR=${dataDir} && set EBMSERVER_TASK=1 && \\"${batPath}\\"\\"" /sc onstart /ru SYSTEM /rl HIGHEST /f`;
  
  console.log('Task command:', taskCmd);
  fs.writeFileSync(setupBatPath, taskCmd);
  
  const psCommand = `powershell -Command "Start-Process '${setupBatPath}' -Verb RunAs -Wait"`;
  console.log('PS command:', psCommand);
  
  execSync(psCommand);
  console.log('Command executed (supposedly).');
} catch (err) {
  console.error('Error during execution:', err.message);
}
