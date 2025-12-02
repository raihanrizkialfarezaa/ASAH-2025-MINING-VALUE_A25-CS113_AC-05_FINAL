const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchedules() {
  try {
    console.log('Checking Sailing Schedules...');
    const count = await prisma.sailingSchedule.count();
    console.log(`Total schedules: ${count}`);

    const scheduled = await prisma.sailingSchedule.findMany({
      where: { status: 'SCHEDULED' },
      include: { vessel: true },
    });
    console.log(`Scheduled status count: ${scheduled.length}`);
    console.log('Sample scheduled items:', JSON.stringify(scheduled.slice(0, 3), null, 2));

    const allStatuses = await prisma.sailingSchedule.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });
    console.log('Status distribution:', allStatuses);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchedules();
