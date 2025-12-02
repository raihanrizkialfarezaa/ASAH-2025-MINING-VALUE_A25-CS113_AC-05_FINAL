import { PrismaClient } from './backend-express/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();

async function checkDatabaseData() {
  try {
    const tables = {
      trucks: await prisma.truck.count(),
      excavators: await prisma.excavator.count(),
      operators: await prisma.operator.count(),
      roadSegments: await prisma.roadSegment.count(),
      haulingActivities: await prisma.haulingActivity.count(),
      schedules: await prisma.sailingSchedule.count(),
      vessels: await prisma.vessel.count(),
      miningSites: await prisma.miningSite.count(),
      loadingPoints: await prisma.loadingPoint.count(),
      dumpingPoints: await prisma.dumpingPoint.count(),
      maintenanceLogs: await prisma.maintenanceLog.count(),
      systemConfigs: await prisma.systemConfig.count(),
    };

    console.log('\n📊 Database Table Counts:');
    console.log(JSON.stringify(tables, null, 2));

    const sampleTruck = await prisma.truck.findFirst({
      include: { currentOperator: true },
    });
    console.log('\n🚛 Sample Truck:', JSON.stringify(sampleTruck, null, 2));

    const sampleExcavator = await prisma.excavator.findFirst();
    console.log('\n⛏️ Sample Excavator:', JSON.stringify(sampleExcavator, null, 2));

    const sampleRoad = await prisma.roadSegment.findFirst({
      include: { miningSite: true },
    });
    console.log('\n🛣️ Sample Road Segment:', JSON.stringify(sampleRoad, null, 2));

    const sampleSchedule = await prisma.sailingSchedule.findFirst({
      include: { vessel: true },
    });
    console.log('\n🚢 Sample Schedule:', JSON.stringify(sampleSchedule, null, 2));

    await prisma.$disconnect();
  } catch (e) {
    console.error('❌ Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDatabaseData();
