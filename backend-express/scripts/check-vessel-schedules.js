import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVesselSchedules() {
  console.log('=== CHECKING VESSEL SCHEDULES ===\n');

  try {
    const schedules = await prisma.sailingSchedule.findMany({
      include: {
        vessel: {
          select: {
            code: true,
            vesselType: true,
          },
        },
      },
      orderBy: {
        etsLoading: 'asc',
      },
    });

    console.log(`Total schedules: ${schedules.length}\n`);

    if (schedules.length > 0) {
      console.log('Sample schedules:');
      schedules.slice(0, 10).forEach((schedule, idx) => {
        console.log(`\n${idx + 1}. Schedule ID: ${schedule.id}`);
        console.log(`   Vessel: ${schedule.vessel?.name || 'N/A'}`);
        console.log(`   ETA Loading: ${schedule.etaLoading}`);
        console.log(`   ETS Loading: ${schedule.etsLoading}`);
        console.log(`   Status: ${schedule.status}`);
        console.log(`   Planned Quantity: ${schedule.plannedQuantity} tons`);
      });

      const now = new Date();
      const pastSchedules = schedules.filter((s) => new Date(s.etsLoading) < now);
      const futureSchedules = schedules.filter((s) => new Date(s.etsLoading) >= now);

      console.log(`\n\nSchedule Status:`);
      console.log(`   Past schedules (already late): ${pastSchedules.length}`);
      console.log(`   Future schedules: ${futureSchedules.length}`);

      if (pastSchedules.length > 0) {
        console.log(
          `\n   Oldest past schedule: ${new Date(pastSchedules[0].etsLoading).toISOString()}`
        );
        console.log(
          `   Most recent past schedule: ${new Date(pastSchedules[pastSchedules.length - 1].etsLoading).toISOString()}`
        );
      }
    }

    console.log('\n✅ Schedule check completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkVesselSchedules();
