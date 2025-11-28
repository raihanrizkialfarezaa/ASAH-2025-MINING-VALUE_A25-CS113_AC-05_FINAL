import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createValidSchedules() {
  console.log('\n=== CREATING VALID VESSEL SCHEDULES ===\n');

  try {
    const vessels = await prisma.vessel.findMany({ take: 3 });

    if (vessels.length === 0) {
      console.log('No vessels found in database');
      await prisma.$disconnect();
      return;
    }

    const now = new Date();
    const schedules = [];

    for (let i = 0; i < vessels.length; i++) {
      const vessel = vessels[i];
      const etaLoading = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      const etsLoading = new Date(now.getTime() + (i + 3) * 24 * 60 * 60 * 1000);

      const schedule = await prisma.sailingSchedule.create({
        data: {
          scheduleNumber: `SCH-VALID-${Date.now()}-${i}`,
          vesselId: vessel.id,
          voyageNumber: `VOY-2025-${100 + i}`,
          loadingPort: 'Samarinda',
          destination: 'Singapore',
          etaLoading: etaLoading,
          etsLoading: etsLoading,
          plannedQuantity: 5000 + i * 1000,
          actualQuantity: 0,
          buyer: 'Test Buyer',
          status: 'SCHEDULED',
        },
      });

      schedules.push(schedule);
      console.log(`✅ Created schedule: ${schedule.scheduleNumber}`);
      console.log(`   Vessel: ${vessel.name}`);
      console.log(`   Planned: ${schedule.plannedQuantity} tons`);
      console.log(`   ETA: ${etaLoading.toISOString()}`);
      console.log(`   ETS: ${etsLoading.toISOString()}`);
      console.log(
        `   Days until deadline: ${((etsLoading - now) / (1000 * 60 * 60 * 24)).toFixed(1)} days\n`
      );
    }

    console.log(`\n✅ Created ${schedules.length} valid vessel schedules`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createValidSchedules();
