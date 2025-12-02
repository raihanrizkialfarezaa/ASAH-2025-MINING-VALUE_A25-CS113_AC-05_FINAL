import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatusEnums() {
  try {
    console.log('=== CHECKING STATUS ENUMS ===\n');

    const truckStatuses = await prisma.truck.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    console.log('Truck statuses in database:');
    truckStatuses.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count.status} trucks`);
    });

    console.log('\n');

    const excavatorStatuses = await prisma.excavator.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    console.log('Excavator statuses in database:');
    excavatorStatuses.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count.status} excavators`);
    });

    console.log('\n=== CHECK COMPLETE ===');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatusEnums();
