import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data || !data.transactions) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Limpar banco atual
      await tx.transaction.deleteMany();
      await tx.invoice.deleteMany();
      await tx.category.deleteMany();

      // Inserir Categories
      if (data.categories && data.categories.length > 0) {
        for (const c of data.categories) {
          await tx.category.create({
            data: {
              id: c.id,
              name: c.name,
              createdAt: new Date(c.createdAt),
            }
          });
        }
      }

      // Inserir Invoices
      if (data.invoices && data.invoices.length > 0) {
        for (const i of data.invoices) {
          await tx.invoice.create({
            data: {
              id: i.id,
              filename: i.filename,
              bank: i.bank,
              dueDate: i.dueDate ? new Date(i.dueDate) : null,
              total: i.total,
              createdAt: new Date(i.createdAt),
            }
          });
        }
      }

      // Inserir Transactions
      if (data.transactions && data.transactions.length > 0) {
        for (const t of data.transactions) {
          await tx.transaction.create({
            data: {
              id: t.id,
              date: new Date(t.date),
              description: t.description,
              amount: t.amount,
              category: t.category,
              isInstallment: t.isInstallment,
              currentInstallment: t.currentInstallment,
              totalInstallments: t.totalInstallments,
              bank: t.bank,
              isManual: t.isManual,
              isEdited: t.isEdited,
              hasDivergence: t.hasDivergence,
              originalAmount: t.originalAmount,
              originalDescription: t.originalDescription,
              startMonth: t.startMonth ? new Date(t.startMonth) : null,
              invoiceId: t.invoiceId,
              createdAt: new Date(t.createdAt),
            }
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
