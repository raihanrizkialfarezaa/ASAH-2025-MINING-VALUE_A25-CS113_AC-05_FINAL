import { PrismaClient } from './backend-express/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function analyzeCurrentState() {
  console.log('='.repeat(80));
  console.log('ANALISIS DATABASE & SCHEMA SAAT INI');
  console.log('='.repeat(80));

  try {
    const counts = {
      trucks: await prisma.truck.count(),
      excavators: await prisma.excavator.count(),
      operators: await prisma.operator.count(),
      roadSegments: await prisma.roadSegment.count(),
      productionRecords: await prisma.productionRecord.count(),
      haulingActivities: await prisma.haulingActivity.count(),
      miningSites: await prisma.miningSite.count(),
      loadingPoints: await prisma.loadingPoint.count(),
      dumpingPoints: await prisma.dumpingPoint.count(),
      vessels: await prisma.vessel.count(),
      schedules: await prisma.sailingSchedule.count(),
    };

    console.log('\n📊 JUMLAH DATA PER TABEL:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table.padEnd(20)}: ${count} records`);
    });

    const truck = await prisma.truck.findFirst();
    console.log('\n🚛 TRUCK FIELDS:', Object.keys(truck || {}));

    const excavator = await prisma.excavator.findFirst();
    console.log('\n🏗️ EXCAVATOR FIELDS:', Object.keys(excavator || {}));

    const operator = await prisma.operator.findFirst();
    console.log('\n👷 OPERATOR FIELDS:', Object.keys(operator || {}));
    if (operator) {
      console.log('   Salary:', operator.salary);
    }

    const road = await prisma.roadSegment.findFirst();
    console.log('\n🛣️ ROAD SEGMENT FIELDS:', Object.keys(road || {}));

    const production = await prisma.productionRecord.findFirst();
    console.log('\n📦 PRODUCTION RECORD FIELDS:', Object.keys(production || {}));
    if (production) {
      console.log('   Sample:', {
        recordNumber: production.recordNumber,
        targetTonnage: production.targetTonnage,
        actualTonnage: production.actualTonnage,
        totalTrips: production.totalTrips,
        totalDistance: production.totalDistance,
        totalFuel: production.totalFuel,
        avgCycleTime: production.avgCycleTime,
      });
    }

    const weather = await prisma.weatherLog.findFirst();
    console.log('\n🌤️ WEATHER LOG FIELDS:', Object.keys(weather || {}));

    console.log('\n✅ ANALISIS SELESAI');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCurrentState();
