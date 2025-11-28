import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeFinancialCalculation() {
  console.log('\n=== FINANCIAL CALCULATION ANALYSIS ===\n');

  try {
    const schedule = await prisma.sailingSchedule.findFirst({
      where: {
        status: {
          in: ['SCHEDULED', 'LOADING'],
        },
      },
      include: {
        vessel: true,
      },
    });

    if (!schedule) {
      console.log('No active schedules found');
      await prisma.$disconnect();
      return;
    }

    console.log('Sample Schedule Data:');
    console.log(`Vessel: ${schedule.vessel?.name || 'N/A'}`);
    console.log(`Planned Quantity: ${schedule.plannedQuantity} tons`);
    console.log(`Actual Quantity: ${schedule.actualQuantity || 0} tons`);
    console.log(`Remaining: ${schedule.plannedQuantity - (schedule.actualQuantity || 0)} tons`);
    console.log(`ETS Loading (Deadline): ${schedule.etsLoading}`);
    console.log(`ETA Loading: ${schedule.etaLoading}`);

    const now = new Date();
    const deadline = new Date(schedule.etsLoading);
    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

    console.log(`\nCurrent Time: ${now.toISOString()}`);
    console.log(
      `Time Remaining: ${hoursRemaining.toFixed(2)} hours (${(hoursRemaining / 24).toFixed(2)} days)`
    );

    const simulatedProduction8h = 2110;
    const prodPerHour = simulatedProduction8h / 8;
    const dailyProdRate = prodPerHour * 16;
    const remaining = schedule.plannedQuantity - (schedule.actualQuantity || 0);

    console.log(`\n=== PRODUCTION CALCULATION ===`);
    console.log(`Simulated Production (8h): ${simulatedProduction8h} tons`);
    console.log(`Production per hour: ${prodPerHour.toFixed(2)} tons/h`);
    console.log(`Daily Production Rate (16h): ${dailyProdRate.toFixed(2)} tons/day`);

    const hoursNeeded = (remaining / dailyProdRate) * 24;
    const daysNeeded = hoursNeeded / 24;

    console.log(`Hours needed to complete: ${hoursNeeded.toFixed(2)} hours`);
    console.log(`Days needed to complete: ${daysNeeded.toFixed(2)} days`);

    const variance = hoursRemaining - hoursNeeded;

    console.log(`\n=== RISK ANALYSIS ===`);
    console.log(`Variance: ${variance.toFixed(2)} hours`);

    if (variance < 0) {
      console.log(`Status: ⚠️ DELAY RISK`);
      console.log(`Hours short: ${Math.abs(variance).toFixed(2)} hours`);

      const demurrage_5M = Math.abs(variance) * 5000000;
      const demurrage_50M = Math.abs(variance) * 50000000;

      console.log(`\nDemurrage Cost Options:`);
      console.log(`  @ 5 Juta/jam: ${(demurrage_5M / 1000000).toFixed(2)} Juta IDR`);
      console.log(`  @ 50 Juta/jam: ${(demurrage_50M / 1000000).toFixed(2)} Juta IDR`);
    } else {
      console.log(`Status: ✅ ON SCHEDULE`);
      console.log(`Buffer time: ${variance.toFixed(2)} hours`);
    }

    console.log(`\n=== PROFIT CALCULATION EXAMPLE ===`);
    const revenue = simulatedProduction8h * 800000;
    const fuelCost = simulatedProduction8h * 0.64 * 15000;
    const queueCost = 0.5 * 100000;
    const incidentCost = 0.1 * 500000;

    console.log(
      `Revenue (${simulatedProduction8h} ton @ 800k): ${(revenue / 1000000).toFixed(2)} Juta IDR`
    );
    console.log(`Fuel Cost: ${(fuelCost / 1000000).toFixed(2)} Juta IDR`);
    console.log(`Queue Cost: ${(queueCost / 1000000).toFixed(2)} Juta IDR`);
    console.log(`Incident Cost: ${(incidentCost / 1000000).toFixed(2)} Juta IDR`);

    if (variance < 0) {
      const demurrage = Math.abs(variance) * 5000000;
      console.log(`Demurrage Cost: ${(demurrage / 1000000).toFixed(2)} Juta IDR`);
      const profit = revenue - fuelCost - queueCost - incidentCost - demurrage;
      console.log(`\nNet Profit: ${(profit / 1000000).toFixed(2)} Juta IDR`);
    } else {
      const profit = revenue - fuelCost - queueCost - incidentCost;
      console.log(`Demurrage Cost: 0 Juta IDR`);
      console.log(`\nNet Profit: ${(profit / 1000000).toFixed(2)} Juta IDR`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeFinancialCalculation();
