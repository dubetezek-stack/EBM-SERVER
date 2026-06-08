import { NextResponse } from 'next/server';
import { parseInvoiceFile } from '@/lib/pdfParser';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function normalizeDesc(desc: string): string {
  return desc.replace(/\s+/g, '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Hash do arquivo para evitar duplicatas (Requisito 7)
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Verifica se já existe
    const existing = await prisma.invoice.findUnique({
      where: { filename: file.name + "_" + fileHash }, // Combine para ser mais único
    });

    if (existing) {
      return NextResponse.json({ error: 'Fatura já foi processada anteriormente.' }, { status: 409 });
    }

    // Extrai transações do PDF
    const parsed = await parseInvoiceFile(buffer);
    
    // Calcula o total
    let total = 0;
    parsed.transactions.forEach(t => {
      total += t.amount;
    });

    // Buscar transações editadas pelo usuário para o mesmo banco para detectar divergências
    const editedTransactions = await prisma.transaction.findMany({
      where: {
        isEdited: true,
        invoice: { bank: parsed.bank }
      },
      include: { invoice: { select: { bank: true } } }
    });

    const editedMap = new Map<string, typeof editedTransactions[0]>();
    editedTransactions.forEach(t => {
      // Use original description for matching since user may have changed it
      const key = normalizeDesc(t.originalDescription || t.description);
      editedMap.set(key, t);
    });

    let divergenceCount = 0;
    const transactionsToCreate: any[] = [];

    for (const t of parsed.transactions) {
      // Regra para cancelamento (Requisito 4)
      const isCancelled = t.amount < 0 || t.description.toLowerCase().includes('estorno') || t.description.toLowerCase().includes('cancelamento');
      let category = "Outros";
      if (isCancelled) category = "Cancelado";
      
      // Regra básica de categorização por palavra chave
      const desc = t.description.toLowerCase();
      if (desc.includes('uber') || desc.includes('posto') || desc.includes('combustivel')) {
        category = "Combustível";
      } else if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('supermercado') || desc.includes('padaria') || desc.includes('outback') || desc.includes('panificadora')) {
        category = "Alimentação";
      }

      // Check for divergence with edited transactions
      const normalizedKey = normalizeDesc(t.description);
      const editedTx = editedMap.get(normalizedKey);

      if (editedTx) {
        // Found a matching edited transaction - check if values diverge
        const amountDiffers = Math.abs(editedTx.amount - t.amount) > 0.01;
        
        if (amountDiffers) {
          // Mark existing transaction as having divergence
          await prisma.transaction.update({
            where: { id: editedTx.id },
            data: {
              hasDivergence: true,
              originalAmount: t.amount,
              originalDescription: t.description,
            }
          });
          divergenceCount++;
          continue; // Don't create a duplicate, just flag the existing one
        }
      }

      transactionsToCreate.push({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: category,
        bank: parsed.bank,
        isInstallment: t.isInstallment,
        currentInstallment: t.currentInstallment,
        totalInstallments: t.totalInstallments,
      });
    }

    // Salva no banco de dados
    const invoice = await prisma.invoice.create({
      data: {
        filename: file.name + "_" + fileHash,
        bank: parsed.bank,
        dueDate: parsed.dueDate,
        total: total,
        transactions: {
          create: transactionsToCreate,
        },
      },
    });

    let message = 'Fatura processada com sucesso!';
    if (divergenceCount > 0) {
      message += ` ${divergenceCount} transação(ões) com divergência detectada(s).`;
    }

    return NextResponse.json({ success: true, invoice, divergenceCount, message });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao processar o arquivo: ' + error.message }, { status: 500 });
  }
}
