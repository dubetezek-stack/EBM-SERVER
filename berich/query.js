const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany();
  const categories = await prisma.category.findMany();
  const transactions = await prisma.transaction.findMany();
  
  console.log("Found:", invoices.length, categories.length, transactions.length);
  
  try {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany();
      await tx.invoice.deleteMany();
      await tx.category.deleteMany();

      if (categories.length > 0) {
        await tx.category.createMany({ data: categories });
      }
      if (invoices.length > 0) {
        await tx.invoice.createMany({ data: invoices });
      }
      if (transactions.length > 0) {
        await tx.transaction.createMany({ data: transactions });
      }
    });
    console.log("Success!");
  } catch (e) {
    console.error("Error during import simulation:", e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
