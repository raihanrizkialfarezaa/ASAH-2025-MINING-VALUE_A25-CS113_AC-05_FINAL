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

    console.log('\n🚛 SAMPLE TRUCK DATA (dengan field penting):');
    const sampleTruck = await prisma.truck.findFirst();
    if (sampleTruck) {
      console.log(
        JSON.stringify(
          {
            code: sampleTruck.code,
            capacity: sampleTruck.capacity,
            fuelConsumption: sampleTruck.fuelConsumption,
            maintenanceCost: sampleTruck.maintenanceCost,
            status: sampleTruck.status,
          },
          null,
          2
        )
      );
    }

    console.log('\n🏗️ SAMPLE EXCAVATOR DATA:');
    const sampleExcavator = await prisma.excavator.findFirst({
      select: {
        code: true,
        bucketCapacity: true,
        productionRate: true,
        fuelConsumption: true,
        status: true,
      },
    });
    console.log(JSON.stringify(sampleExcavator, null, 2));

    console.log('\n👷 SAMPLE OPERATOR DATA:');
    const sampleOperator = await prisma.operator.findFirst({
      select: {
        employeeNumber: true,
        salary: true,
        rating: true,
        status: true,
        shift: true,
      },
    });
    console.log(JSON.stringify(sampleOperator, null, 2));

    console.log('\n🛣️ SAMPLE ROAD SEGMENT DATA:');
    const sampleRoad = await prisma.roadSegment.findFirst({
      select: {
        code: true,
        name: true,
        distance: true,
        gradient: true,
        roadCondition: true,
        maxSpeed: true,
      },
    });
    console.log(JSON.stringify(sampleRoad, null, 2));

    console.log('\n📦 SAMPLE PRODUCTION RECORD:');
    const sampleProduction = await prisma.productionRecord.findFirst({
      select: {
        recordNumber: true,
        targetTonnage: true,
        actualTonnage: true,
        totalTrips: true,
        totalDistance: true,
        totalFuel: true,
        avgCycleTime: true,
      },
    });
    console.log(JSON.stringify(sampleProduction, null, 2));

    console.log('\n🌤️ SAMPLE WEATHER LOG:');
    const sampleWeather = await prisma.weatherLog.findFirst({
      select: {
        weatherCondition: true,
        temperature: true,
        windSpeed: true,
        visibility: true,
        riskLevel: true,
      },
    });
    console.log(JSON.stringify(sampleWeather, null, 2));

    console.log('\n🚢 SAMPLE VESSEL:');
    const sampleVessel = await prisma.vessel.findFirst({
      select: {
        name: true,
        vesselCode: true,
        capacity: true,
        currentLoad: true,
        status: true,
      },
    });
    console.log(JSON.stringify(sampleVessel, null, 2));

    console.log('\n✅ ANALISIS SELESAI');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCurrentState();
