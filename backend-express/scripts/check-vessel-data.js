import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVesselData() {
  console.log('\n=== VESSEL & SCHEDULE DATA CHECK ===\n');

  try {
    const schedules = await prisma.sailingSchedule.findMany({
      take: 5,
      orderBy: { etsLoading: 'asc' },
      include: {
        vessel: true,
      },
    });

    console.log('Sample Sailing Schedules:');
    schedules.forEach((schedule) => {
      console.log('\n---');
      console.log(`Schedule ID: ${schedule.id}`);
      console.log(`Vessel: ${schedule.vessel?.name || 'N/A'}`);
      console.log(`Planned Quantity: ${schedule.plannedQuantity} tons`);
      console.log(`Actual Quantity: ${schedule.actualQuantity || 0} tons`);
      console.log(`ETS Loading: ${schedule.etsLoading}`);
      console.log(`ETA Loading: ${schedule.etaLoading}`);
      console.log(`Status: ${schedule.status}`);
    });

    const now = new Date();
    console.log(`\n\nCurrent Time: ${now.toISOString()}`);

    const upcomingSchedules = await prisma.sailingSchedule.findMany({
      where: {
        etsLoading: {
          gte: now,
        },
        status: {
          in: ['SCHEDULED', 'LOADING'],
        },
      },
      take: 3,
      orderBy: { etsLoading: 'asc' },
    });

    console.log('\n\nUpcoming Schedules (Not Late):');
    console.table(
      upcomingSchedules.map((s) => ({
        id: s.id,
        plannedQty: s.plannedQuantity,
        actualQty: s.actualQuantity || 0,
        remaining: s.plannedQuantity - (s.actualQuantity || 0),
        deadline: s.etsLoading,
        hoursUntilDeadline: ((new Date(s.etsLoading) - now) / (1000 * 60 * 60)).toFixed(2),
      }))
    );
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkVesselData();
