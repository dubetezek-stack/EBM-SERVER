import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        date: 'desc'
      },
      include: {
        invoice: {
          select: {
            bank: true,
            dueDate: true
          }
        }
      }
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // Fetch the current transaction to save originals if first edit
    const current = await prisma.transaction.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const updateData: any = {};

    // Track if this is a meaningful edit (not just category)
    let isSubstantiveEdit = false;

    if (updates.description !== undefined && updates.description !== current.description) {
      updateData.description = updates.description;
      isSubstantiveEdit = true;
    }
    if (updates.amount !== undefined && updates.amount !== current.amount) {
      updateData.amount = updates.amount;
      isSubstantiveEdit = true;
    }
    if (updates.category !== undefined) {
      updateData.category = updates.category;
    }
    if (updates.isInstallment !== undefined) {
      updateData.isInstallment = updates.isInstallment;
      if (!updates.isInstallment) {
        updateData.currentInstallment = null;
        updateData.totalInstallments = null;
      }
    }
    if (updates.currentInstallment !== undefined) {
      updateData.currentInstallment = updates.currentInstallment;
    }
    if (updates.totalInstallments !== undefined) {
      updateData.totalInstallments = updates.totalInstallments;
    }
    if (updates.startMonth !== undefined) {
      updateData.startMonth = updates.startMonth ? new Date(updates.startMonth + 'T12:00:00') : null;
    }

    // If a substantive edit happened on an imported transaction, save originals
    if (isSubstantiveEdit && !current.isManual && !current.isEdited) {
      updateData.isEdited = true;
      updateData.originalAmount = current.amount;
      updateData.originalDescription = current.description;
    }

    // If user is resolving divergence
    if (updates.resolveDivergence === 'accept_pdf') {
      // Restore to PDF values
      if (current.originalAmount !== null) updateData.amount = current.originalAmount;
      if (current.originalDescription !== null) updateData.description = current.originalDescription;
      updateData.hasDivergence = false;
      updateData.isEdited = false;
      updateData.originalAmount = null;
      updateData.originalDescription = null;
    } else if (updates.resolveDivergence === 'keep_mine') {
      updateData.hasDivergence = false;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { description, amount, category, bank, isInstallment, currentInstallment, totalInstallments, startMonth, originalAmount, originalDescription, isEdited } = data;

    if (!description || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Descrição e valor são obrigatórios' }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        date: startMonth ? new Date(startMonth + 'T12:00:00') : new Date(),
        description,
        amount: parseFloat(amount),
        category: category || 'Outros',
        bank: bank || 'Manual',
        isInstallment: isInstallment || false,
        currentInstallment: isInstallment ? (currentInstallment || 1) : null,
        totalInstallments: isInstallment ? (totalInstallments || 1) : null,
        startMonth: startMonth ? new Date(startMonth + 'T12:00:00') : null,
        isManual: true,
        originalAmount: originalAmount !== undefined ? parseFloat(originalAmount) : null,
        originalDescription: originalDescription || null,
        isEdited: isEdited || false,
      }
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
