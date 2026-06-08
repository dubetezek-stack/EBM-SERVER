import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany();
    const categories = await prisma.category.findMany();
    const transactions = await prisma.transaction.findMany();

    return NextResponse.json({
      invoices,
      categories,
      transactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
