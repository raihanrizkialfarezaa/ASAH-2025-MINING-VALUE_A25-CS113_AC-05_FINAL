import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function getRandomDate(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

async function main() {
  console.log('=== UPDATING VESSEL SCHEDULES ===\n');

  const startDate = new Date('2025-12-15T00:00:00+07:00');
  const endDate = new Date('2025-12-31T23:59:59+07:00');

  const schedules = await prisma.sailingSchedule.findMany({
    select: { id: true },
  });

  console.log(`Found ${schedules.length} schedules to update\n`);

  let updated = 0;

  for (const schedule of schedules) {
    const etaLoading = getRandomDate(startDate, endDate);
    const loadingDuration = Math.floor(Math.random() * 24) + 6;
    const etsLoading = addHours(etaLoading, loadingDuration);

    await prisma.sailingSchedule.update({
      where: { id: schedule.id },
      data: {
        etaLoading,
        etsLoading,
      },
    });

    updated++;
    if (updated % 100 === 0) {
      console.log(`Updated ${updated}/${schedules.length} schedules...`);
    }
  }

  console.log(`\n✅ Successfully updated ${updated} schedules`);
  console.log(`All schedules now have dates between Dec 15-31, 2025\n`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
