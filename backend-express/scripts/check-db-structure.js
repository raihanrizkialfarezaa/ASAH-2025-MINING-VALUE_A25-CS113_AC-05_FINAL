import prisma from '../src/config/database.js';

async function checkDatabaseStructure() {
  try {
    console.log('=== CHECKING DATABASE STRUCTURE ===\n');

    const trucks = await prisma.truck.count();
    const excavators = await prisma.excavator.count();
    const operators = await prisma.operator.count();
    const roadSegments = await prisma.roadSegment.count();
    const schedules = await prisma.sailingSchedule.count();
    const maintenanceLogs = await prisma.maintenanceLog.count();
    const haulingActivities = await prisma.haulingActivity.count();
    const weatherLogs = await prisma.weatherLog.count();

    console.log('Table Counts:');
    console.log(`- Trucks: ${trucks}`);
    console.log(`- Excavators: ${excavators}`);
    console.log(`- Operators: ${operators}`);
    console.log(`- Road Segments: ${roadSegments}`);
    console.log(`- Sailing Schedules: ${schedules}`);
    console.log(`- Maintenance Logs: ${maintenanceLogs}`);
    console.log(`- Hauling Activities: ${haulingActivities}`);
    console.log(`- Weather Logs: ${weatherLogs}`);

    console.log('\n=== SAMPLE DATA ===\n');

    const sampleTruck = await prisma.truck.findFirst({
      select: { id: true, code: true, capacity: true, brand: true, status: true },
    });
    console.log('Sample Truck:', JSON.stringify(sampleTruck, null, 2));

    const sampleExcavator = await prisma.excavator.findFirst({
      select: { id: true, code: true, model: true, bucketCapacity: true, status: true },
    });
    console.log('Sample Excavator:', JSON.stringify(sampleExcavator, null, 2));

    const sampleRoad = await prisma.roadSegment.findFirst({
      select: {
        id: true,
        code: true,
        name: true,
        distance: true,
        gradient: true,
        roadCondition: true,
      },
    });
    console.log('Sample Road:', JSON.stringify(sampleRoad, null, 2));

    const sampleSchedule = await prisma.sailingSchedule.findFirst({
      include: { vessel: { select: { name: true, capacity: true } } },
    });
    console.log('Sample Schedule:', JSON.stringify(sampleSchedule, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStructure();
