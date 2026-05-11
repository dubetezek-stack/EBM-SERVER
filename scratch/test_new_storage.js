const { DATA_DIR } = require('../utils/storage');
const fs = require('fs');
const path = require('path');

console.log('DATA_DIR:', DATA_DIR);

if (fs.existsSync(DATA_DIR)) {
    console.log('Diretório existe!');
} else {
    console.log('Diretório não existe, tentando criar...');
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('Diretório criado com sucesso!');
    } catch (e) {
        console.error('Erro ao criar diretório:', e.message);
    }
}

const testFile = path.join(DATA_DIR, 'test.txt');
try {
    fs.writeFileSync(testFile, 'test');
    console.log('Arquivo de teste criado:', testFile);
    fs.unlinkSync(testFile);
    console.log('Arquivo de teste removido.');
} catch (e) {
    console.error('Erro de escrita no novo diretório:', e.message);
}
