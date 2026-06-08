const fs = require('fs'); 
const pdfParse = require('pdf-parse'); 
const path = 'C:\\Users\\ebm_6\\Downloads\\Faturas\\Bradesco'; 
const files = fs.readdirSync(path).filter(f => f.endsWith('.pdf')); 

async function test() { 
  for (const file of files) { 
    const text = (await pdfParse(fs.readFileSync(path + '\\\\' + file))).text; 
    const lines = text.split('\n'); 
    let sum = 0; 
    const regex = /^(\d{2}\/\d{2})\s+(.*?)(?:(\d{2}\/\d{2}))?([a-zA-Z\s]*?)((?:-)?\d{1,3}(?:\.\d{3})*,\d{2}-?)$/; 
    for (let i = 0; i < lines.length; i++) { 
      let lineStr = lines[i].trim(); 
      let match = lineStr.match(regex); 
      if (!match && /^\d{2}\/\d{2}\s+/.test(lineStr)) { 
        for (let j = 1; j <= 3; j++) { 
          if (i + j < lines.length) { 
            lineStr += ' ' + lines[i + j].trim(); 
            match = lineStr.match(regex); 
            if (match) { 
              i += j; 
              break; 
            } 
          } 
        } 
      } 
      if (match) { 
        const desc = match[2].trim(); 
        let amountStr = match[5]; 
        if (amountStr.endsWith('-')) amountStr = '-' + amountStr.slice(0, -1); 
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')); 
        const lowerDesc = desc.toLowerCase(); 
        if (lowerDesc.includes('pagto') || lowerDesc.includes('pagamento') || lowerDesc.includes('limite') || lowerDesc.includes('previsão') || lowerDesc.includes('comprasr$')) continue; 
        sum += amount; 
      } 
    } 
    console.log(file, sum.toFixed(2)); 
  } 
} 
test();
