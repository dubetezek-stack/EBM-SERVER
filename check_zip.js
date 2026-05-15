const AdmZip = require('adm-zip');
const path = require('path');

const zipPath = 'u:/Projetos/Drive/Installers/jellyfin_10.11.8-amd64.zip';
try {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  console.log('Total entries:', entries.length);
  console.log('First 10 entries:');
  entries.slice(0, 10).forEach(e => console.log(e.entryName));
} catch (e) {
  console.error('Error reading zip:', e.message);
}
