if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {
    constructor() {}
  };
}

const pdf = require('pdf-parse');

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  isInstallment: boolean;
  currentInstallment: number | null;
  totalInstallments: number | null;
}

export interface ParsedInvoice {
  bank: string;
  transactions: ParsedTransaction[];
}

export function parseAmount(amountStr: string): number {
  let cleaned = amountStr.replace(/[R$\s\n]/g, '').trim();
  // Handle format 1.000,00
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  // Handle minus sign
  if (cleaned.includes('−') || cleaned.includes('-')) {
    cleaned = '-' + cleaned.replace(/[−-]/g, '');
  }
  return parseFloat(cleaned);
}

export function extractInstallment(description: string): { desc: string; current: number | null; total: number | null; isInstallment: boolean } {
  // Look for formats like "10/12", "Parcela 1/2", "01/10"
  const match = description.match(/(?:Parcela\s)?(\d{1,2})\/(\d{1,2})/);
  if (match) {
    return {
      desc: description.replace(match[0], '').trim().replace(/\s{2,}/g, ' '), // Remove a parcela da descrição para agrupar compras do mesmo lugar
      current: parseInt(match[1]),
      total: parseInt(match[2]),
      isInstallment: true,
    };
  }
  return {
    desc: description.trim(),
    current: null,
    total: null,
    isInstallment: false,
  };
}

export function parseNubank(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // O Nubank costuma ter resumos no topo com datas. Vamos focar apenas da aba de Transações em diante.
  let relevantText = text;
  const transacoesIndex = text.search(/transa[çc][õo]es/i);
  if (transacoesIndex !== -1) {
    relevantText = text.substring(transacoesIndex);
  }

  // A regex procura pelo padrão "DD MMM" (ex: 15 ABR) no início de uma linha
  const blockRegex = /(\d{2}\s(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+((?:(?!\d{2}\s(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))[\s\S])+)/g;
  let match;
  
  while ((match = blockRegex.exec(relevantText)) !== null) {
    const dateStr = match[1];
    let block = match[2].trim();

    // Se for o último bloco, ele pode ter "engolido" o rodapé do PDF (limites, saldo, totais).
    // Cortamos o bloco assim que encontrarmos essas palavras-chave.
    const footerKeywords = ['limite disponivel', 'limite total', 'no credito', 'pix no credito', 'total da fatura', 'saldo', 'proximas faturas', 'historico de pagamentos'];
    let lowestIndex = block.length;
    
    // Normalizar para buscar o rodapé
    const normalizedForFooter = block.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const kw of footerKeywords) {
      const idx = normalizedForFooter.indexOf(kw);
      if (idx !== -1 && idx < lowestIndex) {
        lowestIndex = idx;
      }
    }
    block = block.substring(0, lowestIndex).trim();

    // Se após cortar o lixo o bloco ficou vazio, pulamos
    if (!block) continue;

    // A descrição é geralmente a primeira linha do bloco
    let lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let desc = lines[0] || '';
    
    // Proteção: Se a primeira linha for apenas o ano do cabeçalho da página (ex: 2024, 2026)
    if (/^20\d{2}$/.test(desc) && lines.length > 1) {
      desc = lines[1];
    }
    
    // Normalizar a descrição para verificação de filtros
    const normalizedDesc = desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Filtros de exclusão refinados para não engolir taxas como "IOF de pagamento em atraso"
    if (normalizedDesc.startsWith('pagamento em ') || 
        normalizedDesc.includes('pagamento de fatura') ||
        normalizedDesc.includes('pagamento recebido') ||
        normalizedDesc.includes('eduardo b monteiro') ||
        normalizedDesc.includes('limite total') ||
        normalizedDesc.includes('limite disponivel') ||
        normalizedDesc.includes('pix no credito') ||
        normalizedDesc === 'no credito' ||
        normalizedDesc === 'pagamento') {
      continue;
    }

    // Limpeza prévia da descrição para extrair parcelamento
    let cleanDesc = desc.split('Total a pagar')[0].replace('↳', '').trim();
    // Use the robust amount regex here too to clean the description
    cleanDesc = cleanDesc.replace(/[-−]?R\$\s*[\d]+(?:[\s.,\n]*[\d]+)*/g, '').trim();

    const inst = extractInstallment(cleanDesc);

    // Encontrar todos os valores monetários no bloco limpo com regex robusto (suporta "R$ 21 ,98" ou com quebra de linha)
    const amountRegex = /[-−]?R\$\s*[\d]+(?:[\s.,\n]*[\d]+)*/g;
    const amounts = [];
    let amtMatch;
    while ((amtMatch = amountRegex.exec(block)) !== null) {
      amounts.push(amtMatch[0]);
    }
    
    if (amounts.length === 0) continue;

    // Se for parcelamento (como Chini Fisioterapia), o Nubank mostra o valor TOTAL primeiro e o valor da parcela por último.
    // Se for compra normal/internacional, o valor cobrado é o PRIMEIRO e detalhamentos (IOF, cotação) ficam por último.
    const amountStr = inst.isInstallment ? amounts[amounts.length - 1] : amounts[0];
    const amount = parseAmount(amountStr);

    transactions.push({
      date: new Date(),
      description: inst.desc,
      amount,
      isInstallment: inst.isInstallment,
      currentInstallment: inst.current,
      totalInstallments: inst.total,
    });
  }
  return transactions;
}

export function parseItau(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  // Ignora lançamentos listados na sessão de próximas faturas para evitar duplicação
  const relevantText = text.split(/compras\s*parceladas\s*-\s*pr[óo]ximas\s*faturas/i)[0];
  const lines = relevantText.split('\n');
  
  const regex = /(\d{2}\/\d{2})\s*([a-zA-Z*]+.*?)(?:(\d{2}\/\d{2}))?((?:-)?\d{1,3}(?:\.\d{3})*,\d{2})(?=\d{2}\/\d{2}|$|\n)/g;

  let match;
  while ((match = regex.exec(relevantText)) !== null) {
    const dateStr = match[1];
    const desc = match[2].trim();
    const amountStr = match[4];

    const amount = parseAmount(amountStr);
    if (desc.toLowerCase().includes('pagamento')) continue;

    // Extract installment if match[3] is present or from description
    let inst = extractInstallment(desc);
    if (match[3] && !inst.isInstallment) {
      const parts = match[3].split('/');
      inst = {
        desc: desc,
        current: parseInt(parts[0]),
        total: parseInt(parts[1]),
        isInstallment: true
      };
    }

    transactions.push({
      date: new Date(),
      description: inst.desc,
      amount,
      isInstallment: inst.isInstallment,
      currentInstallment: inst.current,
      totalInstallments: inst.total,
    });
  }
  return transactions;
}

export function parseBradesco(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  
  // Regex simplificado para capturar a descrição inteira e o valor no final, sem se perder com nomes de cidades
  const regex = /^(\d{2}\/\d{2})\s+(.*?)((?:-)?\d{1,3}(?:\.\d{3})*,\d{2}-?)$/;

  for (let i = 0; i < lines.length; i++) {
    let lineStr = lines[i].trim();
    let match = lineStr.match(regex);
    
    // Se a linha começar com data seguida de espaço, mas não bater no regex inteiro, pode ter quebrado.
    if (!match && /^\d{2}\/\d{2}\s+/.test(lineStr)) {
      for (let j = 1; j <= 3; j++) {
        if (i + j < lines.length) {
          lineStr += " " + lines[i + j].trim();
          match = lineStr.match(regex);
          if (match) {
            i += j; // Pula as linhas que foram combinadas com sucesso
            break;
          }
        }
      }
    }

    if (match) {
      const dateStr = match[1];
      const desc = match[2].trim();
      let amountStr = match[3];
      
      // se tiver o - no final, coloca pro inicio
      if (amountStr.endsWith('-')) {
        amountStr = '-' + amountStr.slice(0, -1);
      } else if (i + 1 < lines.length && lines[i + 1].trim() === '-') {
        // Se o PDF quebrou o sinal de negativo para a linha de baixo
        amountStr = '-' + amountStr;
        i++; // pula a linha do '-'
      }

      const amount = parseAmount(amountStr);
      const lowerDesc = desc.toLowerCase();
      // Ignorar pagamentos e textos informativos da fatura
      if (lowerDesc.includes('pagto') || lowerDesc.includes('pagamento') || lowerDesc.includes('limite de compras') || lowerDesc.includes('previsão') || lowerDesc.includes('comprasr$')) continue;

      let inst = extractInstallment(desc);

      transactions.push({
        date: new Date(),
        description: inst.desc,
        amount,
        isInstallment: inst.isInstallment,
        currentInstallment: inst.current,
        totalInstallments: inst.total,
      });
    }
  }
  return transactions;
}

export interface ParsedInvoice {
  bank: string;
  dueDate?: Date;
  transactions: ParsedTransaction[];
}

const MONTH_MAP: any = { 'JAN': 0, 'FEV': 1, 'MAR': 2, 'ABR': 3, 'MAI': 4, 'JUN': 5, 'JUL': 6, 'AGO': 7, 'SET': 8, 'OUT': 9, 'NOV': 10, 'DEZ': 11 };

function parseDateStr(str: string): Date | undefined {
  if (!str) return undefined;
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  } else {
    const parts = str.split(' ');
    if (parts.length === 3) {
      const m = MONTH_MAP[parts[1].toUpperCase()];
      if (m !== undefined) return new Date(parseInt(parts[2]), m, parseInt(parts[0]));
    }
  }
  return undefined;
}

export async function parseInvoiceFile(buffer: Buffer): Promise<ParsedInvoice> {
  const data = await pdf(buffer);
  const text = data.text;
  
  let bank = "Unknown";
  let dueDate: Date | undefined = undefined;
  let transactions: ParsedTransaction[] = [];

  if (text.includes("Nu Pagamentos S.A.") || text.includes("Nubank")) {
    bank = "NuBank";
    transactions = parseNubank(text);
    const m = text.match(/FATURA\s+(\d{2}\s+[A-Z]{3}\s+\d{4})/i);
    if (m) dueDate = parseDateStr(m[1]);
  } else if (text.includes("Itaú") || text.includes("Itaú Uniclass")) {
    bank = "Itaú";
    transactions = parseItau(text);
    // Look for Vencimento: 17/04/2026 or Com vencimento em: 17/04/2026
    const m = text.match(/Vencimento:?\s*(\d{2}\/\d{2}\/\d{4})/i) || 
              text.match(/Com\s*vencimento\s*em:?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
              text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (m) dueDate = parseDateStr(m[1]);
  } else if (text.includes("Bradesco") || text.includes("bradesco")) {
    bank = "Bradesco";
    transactions = parseBradesco(text);
    const m = text.match(/Vencimento\s*(\d{2}\/\d{2}\/\d{4})/i) || text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (m) dueDate = parseDateStr(m[1]);
  } else {
    throw new Error("Formato de fatura não reconhecido.");
  }

  return { bank, dueDate, transactions };
}
