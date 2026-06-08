import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function normalizeDesc(desc: string): string {
  return desc.replace(/\s+/g, '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { bank, transactions, dueDate: dueDateStr } = data;

    if (!bank || !transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'Banco e transações são obrigatórios.' }, { status: 400 });
    }

    // Gerar hash único para esta importação
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(transactions) + bank + Date.now())
      .digest('hex');

    const filename = `screenshot_${bank}_${contentHash.substring(0, 8)}`;

    // Verificar se já existe
    const existing = await prisma.invoice.findUnique({
      where: { filename },
    });

    if (existing) {
      return NextResponse.json({ error: 'Esta importação já foi processada.' }, { status: 409 });
    }

    // Parsear dueDate se fornecida
    let dueDate: Date | undefined;
    if (dueDateStr) {
      // Adiciona T12:00:00 para evitar problemas de fuso horário (ex: meia-noite UTC vira 21:00 do dia anterior no Brasil)
      dueDate = new Date(dueDateStr + '-01T12:00:00');
    }

    // Buscar transações editadas para detectar divergências
    const editedTransactions = await prisma.transaction.findMany({
      where: {
        isEdited: true,
        invoice: { bank }
      },
      include: { invoice: { select: { bank: true } } }
    });

    const editedMap = new Map<string, typeof editedTransactions[0]>();
    editedTransactions.forEach(t => {
      const key = normalizeDesc(t.originalDescription || t.description);
      editedMap.set(key, t);
    });

    let divergenceCount = 0;
    const transactionsToCreate: any[] = [];

    for (const t of transactions) {
      // Categorização automática básica
      const desc = t.description.toLowerCase();
      let category = 'Outros';

      if (t.amount < 0 || desc.includes('estorno') || desc.includes('cancelamento')) {
        category = 'Cancelado';
      } else if (desc.includes('uber') || desc.includes('posto') || desc.includes('combustivel') || desc.includes('auto posto')) {
        category = 'Combustível';
      } else if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('supermercado') || desc.includes('padaria') || desc.includes('pizzaria') || desc.includes('farma')) {
        category = 'Alimentação';
      }

      // Verificar divergência
      const normalizedKey = normalizeDesc(t.description);
      const editedTx = editedMap.get(normalizedKey);

      if (editedTx) {
        const amountDiffers = Math.abs(editedTx.amount - t.amount) > 0.01;
        if (amountDiffers) {
          await prisma.transaction.update({
            where: { id: editedTx.id },
            data: {
              hasDivergence: true,
              originalAmount: t.amount,
              originalDescription: t.description,
            }
          });
          divergenceCount++;
          continue;
        }
      }

      transactionsToCreate.push({
        date: dueDate || new Date(),
        description: t.description,
        amount: t.amount,
        category,
        bank,
        isInstallment: t.isInstallment || false,
        currentInstallment: t.currentInstallment || null,
        totalInstallments: t.totalInstallments || null,
      });
    }

    // Salvar no banco de dados
    const invoice = await prisma.invoice.create({
      data: {
        filename,
        bank,
        dueDate: dueDate || null,
        total: transactionsToCreate.reduce((sum: number, t: any) => sum + t.amount, 0),
        transactions: {
          create: transactionsToCreate,
        },
      },
    });

    let message = `${transactionsToCreate.length} transação(ões) importada(s) com sucesso do screenshot!`;
    if (divergenceCount > 0) {
      message += ` ${divergenceCount} divergência(s) detectada(s).`;
    }

    return NextResponse.json({ success: true, invoice, divergenceCount, message });
  } catch (error: any) {
    console.error('Erro ao confirmar importação:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar transações: ' + error.message },
      { status: 500 }
    );
  }
}
