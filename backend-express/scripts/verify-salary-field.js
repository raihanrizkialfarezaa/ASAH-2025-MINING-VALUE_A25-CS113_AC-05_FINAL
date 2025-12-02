import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFields() {
  try {
    const operator = await prisma.operator.findFirst();

    console.log('=== OPERATOR FIELD VERIFICATION ===');
    if (operator) {
      console.log('Sample operator:', JSON.stringify(operator, null, 2));
      console.log('\nField "salary" exists:', 'salary' in operator);
      console.log('Salary value:', operator.salary);
    } else {
      console.log('No operators found in database');
    }

    const production = await prisma.productionRecord.findFirst();
    console.log('\n=== PRODUCTION RECORD FIELD VERIFICATION ===');
    if (production) {
      console.log('Sample production record keys:', Object.keys(production));
      console.log('Field "utilizationRate" exists:', 'utilizationRate' in production);
      console.log(
        'Field "remarks" count:',
        Object.keys(production).filter((k) => k === 'remarks').length
      );
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyFields();
