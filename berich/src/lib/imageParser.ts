import Tesseract from 'tesseract.js';
import { ParsedTransaction, extractInstallment, parseAmount } from './pdfParser';

export interface ImageParseResult {
  bank: string | null;
  transactions: ParsedTransaction[];
  rawText: string;
  confidence: number;
}

/**
 * Detecta o banco a partir do texto OCR extraído da imagem
 */
export function detectBankFromText(text: string): string | null {
  const lower = text.toLowerCase();
  
  // Itaú - keywords
  if (lower.includes('itau') || lower.includes('itaú') || lower.includes('uniclass') || lower.includes('cartão físico') || lower.includes('cartao fisico')) {
    return 'Itaú';
  }
  
  // Bradesco - keywords
  if (lower.includes('bradesco') || lower.includes('fatura do cartão') || lower.includes('fatura do cartao') || lower.includes('busque por nome ou valor')) {
    return 'Bradesco';
  }
  
  // Nubank - keywords
  if (lower.includes('nubank') || lower.includes('nu pagamentos') || lower.includes('nupay') || lower.includes('fatura paga') || lower.includes('gráfico') || lower.includes('grafico') || lower.includes('fatura atual')) {
    return 'Nubank';
  }
  
  return null;
}

/**
 * Parser para screenshots do Itaú
 * Formato do app: 
 *   "4 de junho"
 *   "Nike*nike fisiasao paulobra"
 *   "Cartão físico"
 *   "R$ 185,73"
 *   "Parcela 1 de 10"
 */
function parseItauScreenshot(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Procurar por valores monetários R$ XX,XX, suportando negativos (ex: -R$ 5,00)
    const amountMatch = line.match(/[-−]?\s*R\$\s*[-−]?\s*[\d.,]+/);
    if (!amountMatch) continue;
    
    const amount = parseAmount(amountMatch[0]);
    if (isNaN(amount) || amount === 0) continue;
    
    // Encontrar descrição - procura para trás a partir do valor
    let description = '';
    for (let j = i - 1; j >= 0; j--) {
      const prevLine = lines[j];
      // Pula linhas de "Cartão físico", "Cartão virtual", datas
      if (/cart[aã]o\s+(f[ií]sico|virtual)/i.test(prevLine)) continue;
      if (/^\d{1,2}\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i.test(prevLine)) continue;
      // Pula linhas que são só números ou valores
      if (/^[-−]?\s*R\$/.test(prevLine)) continue;
      if (/^\d{1,2}$/.test(prevLine)) continue;
      description = prevLine;
      break;
    }
    
    if (!description) continue;
    
    // Pula resumo de meses no topo da tela do Itaú (ex: "Mai Jun Jul Ago Set")
    if (/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i.test(description)) continue;

    // Verificar parcela - pode estar na mesma linha ou na próxima
    let isInstallment = false;
    let currentInstallment: number | null = null;
    let totalInstallments: number | null = null;
    
    // Checar "Parcela X de Y" nas linhas próximas
    for (let k = i; k <= Math.min(i + 2, lines.length - 1); k++) {
      const parcelaMatch = lines[k].match(/[Pp]arcela\s+(\d+)\s+de\s+(\d+)/);
      if (parcelaMatch) {
        isInstallment = true;
        currentInstallment = parseInt(parcelaMatch[1]);
        totalInstallments = parseInt(parcelaMatch[2]);
        break;
      }
    }
    
    // Também verificar formato XX/XX na descrição
    if (!isInstallment) {
      const inst = extractInstallment(description);
      if (inst.isInstallment) {
        isInstallment = true;
        currentInstallment = inst.current;
        totalInstallments = inst.total;
        description = inst.desc;
      }
    }
    
    // Filtrar pagamentos
    if (description.toLowerCase().includes('pagamento')) continue;
    
    transactions.push({
      date: new Date(),
      description: description.trim(),
      amount,
      isInstallment,
      currentInstallment,
      totalInstallments,
    });
  }
  
  return transactions;
}

/**
 * Parser para screenshots do Bradesco
 * Formato do app:
 *   "05   o APPLE.COM/BILL        R$ 66,90 >"
 *   "Jun"
 *   "03   • SALGADO FILHO 47      R$ 42,98 >"
 */
function parseBradescoScreenshot(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Remover setas e bullets do layout do app
    line = line.replace(/[>›»→]/g, '').replace(/[○●•·°]/g, '').trim();
    
    // Tentar casar padrão: DD (mês opcional) DESCRIÇÃO R$ VALOR
    // O Bradesco no app mostra "DD\nMês" separados, ou "DD Mês" juntos
    const match = line.match(/^(\d{1,2})\s+(?:Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)?\s*(.*?)\s+[-−]?\s*R\$\s*[-−]?\s*([\d.,\s]+)$/i);
    
    if (!match) {
      // Tentar sem o dia no início (caso a linha tenha apenas DESCRIÇÃO R$ VALOR)
      const simpleMatch = line.match(/^([A-Za-z].*?)\s+[-−]?\s*R\$\s*[-−]?\s*([\d.,\s]+)$/);
      if (simpleMatch) {
        const desc = simpleMatch[1].trim();
        // Extract the full amount match with the minus sign if it exists
        const amountStrMatch = line.match(/[-−]?\s*R\$\s*[-−]?\s*[\d.,\s]+/);
        const amountStr = amountStrMatch ? amountStrMatch[0] : ('R$ ' + simpleMatch[2].trim());
        const amount = parseAmount(amountStr);
        
        if (isNaN(amount) || amount === 0) continue;
        
        // Filtrar pagamentos e saldo anterior
        const lower = desc.toLowerCase();
        if (lower.includes('pagto') || lower.includes('pagamento') || lower.includes('saldo anterior') || lower.includes('total de')) continue;
        
        const inst = extractInstallment(desc);
        
        transactions.push({
          date: new Date(),
          description: inst.desc,
          amount,
          isInstallment: inst.isInstallment,
          currentInstallment: inst.current,
          totalInstallments: inst.total,
        });
      }
      continue;
    }
    
    const desc = match[2].trim();
    const amountStrMatch = line.match(/[-−]?\s*R\$\s*[-−]?\s*[\d.,\s]+/);
    const amountStr = amountStrMatch ? amountStrMatch[0] : ('R$ ' + match[3].trim());
    const amount = parseAmount(amountStr);
    
    if (isNaN(amount) || amount === 0) continue;
    
    // Filtrar
    const lower = desc.toLowerCase();
    if (lower.includes('pagto') || lower.includes('pagamento') || lower.includes('saldo anterior') || lower.includes('total de') || lower.includes('voltar ao topo')) continue;
    
    // Checar parcelas nas próximas linhas
    let isInstallment = false;
    let currentInstallment: number | null = null;
    let totalInstallments: number | null = null;
    
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const parcelaMatch = nextLine.match(/[Pp]arcela\s+(\d+)\s+de\s+(\d+)/);
      if (parcelaMatch) {
        isInstallment = true;
        currentInstallment = parseInt(parcelaMatch[1]);
        totalInstallments = parseInt(parcelaMatch[2]);
        i++; // Skip parcela line
      }
    }
    
    // Também verificar formato XX/XX na descrição
    if (!isInstallment) {
      const inst = extractInstallment(desc);
      if (inst.isInstallment) {
        isInstallment = true;
        currentInstallment = inst.current;
        totalInstallments = inst.total;
      }
    }
    
    transactions.push({
      date: new Date(),
      description: isInstallment ? extractInstallment(desc).desc : desc,
      amount: Math.abs(amount),
      isInstallment,
      currentInstallment,
      totalInstallments,
    });
  }
  
  return transactions;
}

/**
 * Parser para screenshots do Nubank
 * Formato do app:
 *   "05 ABR   Danielecristinade            R$ 16,00"
 *   "28 MAR   Raia Drogasil - NuPay - Parcela 1/2    R$ 58,59"
 */
function parseNubankScreenshot(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Procura valor monetário com R$
    const amountMatch = line.match(/[-−]?\s*R\$\s*[-−]?\s*[\d.,]+/);
    if (!amountMatch) continue;

    const amountStr = amountMatch[0];
    const amount = parseAmount(amountStr);
    if (isNaN(amount) || Math.abs(amount) < 0.01) continue;

    // Procura descrição olhando para trás ou na mesma linha
    let description = '';
    for (let j = i; j >= 0; j--) {
      const prevLine = lines[j].replace(amountStr, '').trim();
      if (prevLine.length > 3) {
        description = prevLine;
        break;
      }
    }
    
    if (!description) continue;

    // Filtrar lixo
    const lower = description.toLowerCase();
    if (lower.includes('pagamento') || lower.includes('fatura atual') || lower.includes('fatura paga') || lower.includes('vencimento') || lower.includes('total') || lower.includes('gráfico') || lower.includes('grafico') || lower.includes('cartões')) continue;

    const isNegative = amountStr.startsWith('-') || amountStr.includes('−') || amountStr.includes('recebido') || lower.includes('estorno') || lower.includes('cancelamento');
    
    // Limpeza extra da descrição
    let cleanDesc = description.replace(/^\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*/i, '').trim();
    cleanDesc = cleanDesc.replace(/\s*-\s*NuPay\s*/gi, '').replace(/\s*-\s*$/, '').trim();
    
    const inst = extractInstallment(cleanDesc);

    transactions.push({
      date: new Date(),
      description: inst.desc,
      amount: isNegative ? -Math.abs(amount) : Math.abs(amount),
      isInstallment: inst.isInstallment,
      currentInstallment: inst.current,
      totalInstallments: inst.total,
    });
  }
  
  return transactions;
}

/**
 * Faz OCR na imagem e extrai transações
 */
export async function parseImageToTransactions(
  buffer: Buffer,
  bank?: string | null
): Promise<ImageParseResult> {
  // Fazer OCR com Tesseract.js
  const { data } = await Tesseract.recognize(buffer, 'por', {
    logger: () => {}, // Silenciar logs
  });
  
  const rawText = data.text;
  const confidence = data.confidence;
  
  // Detectar banco se não fornecido
  const detectedBank = bank || detectBankFromText(rawText);
  
  let transactions: ParsedTransaction[] = [];
  
  if (detectedBank === 'Itaú') {
    transactions = parseItauScreenshot(rawText);
  } else if (detectedBank === 'Bradesco') {
    transactions = parseBradescoScreenshot(rawText);
  } else if (detectedBank && detectedBank.toLowerCase() === 'nubank') {
    transactions = parseNubankScreenshot(rawText);
  } else {
    transactions = parseItauScreenshot(rawText);
  }
  
  return {
    bank: detectedBank,
    transactions,
    rawText,
    confidence,
  };
}
