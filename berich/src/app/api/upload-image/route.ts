import { NextResponse } from 'next/server';
import { parseImageToTransactions } from '@/lib/imageParser';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bankOverride = formData.get('bank') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido. Envie PNG, JPG ou WEBP.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Pré-processamento com sharp para melhorar qualidade do OCR
    try {
      const processed = await sharp(buffer)
        .greyscale()           // Converter para escala de cinza
        .normalize()           // Normalizar contraste
        .sharpen()             // Aumentar nitidez
        .resize({ width: 1800, withoutEnlargement: true }) // Redimensionar se muito pequeno
        .png()                 // Converter para PNG
        .toBuffer();
      buffer = Buffer.from(processed);
    } catch {
      // Se o sharp falhar, usa o buffer original
      console.warn('Sharp processing failed, using original buffer');
    }

    // Fazer OCR e parsear transações
    const result = await parseImageToTransactions(buffer, bankOverride || null);

    return NextResponse.json({
      success: true,
      bank: result.bank,
      transactions: result.transactions.map((t, i) => ({
        _tempId: `img_${Date.now()}_${i}`,
        description: t.description,
        amount: t.amount,
        isInstallment: t.isInstallment,
        currentInstallment: t.currentInstallment,
        totalInstallments: t.totalInstallments,
      })),
      confidence: result.confidence,
      rawText: result.rawText,
      needsBankSelection: !result.bank,
    });
  } catch (error: any) {
    console.error('Erro ao processar imagem:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a imagem: ' + error.message },
      { status: 500 }
    );
  }
}
