import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }
    
    // Check if it already exists
    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'Categoria já existe' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name: name.trim() }
    });
    
    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da categoria é obrigatório' }, { status: 400 });
    }

    // Get the category to know its name
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    if (category.name === 'Outros') {
      return NextResponse.json({ error: 'A categoria "Outros" não pode ser excluída' }, { status: 400 });
    }

    // Update all transactions that had this category back to 'Outros'
    await prisma.transaction.updateMany({
      where: { category: category.name },
      data: { category: 'Outros' }
    });

    // Delete the category
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
