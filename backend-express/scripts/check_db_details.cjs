const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Checking Database Schema & Data for Detailed Breakdown ---');

    // 1. Check Vessels & Schedules for Vessel Status Breakdown
    const vessels = await prisma.vessel.findMany({ take: 1 });
    const schedules = await prisma.sailingSchedule.findMany({ take: 1 });
    console.log('\n[Vessels Sample]:', vessels[0]);
    console.log('[Schedules Sample]:', schedules[0]);

    // 2. Check Trucks & Fuel for Fuel Efficiency Breakdown
    const trucks = await prisma.truck.findMany({ take: 1 });
    const fuelLogs = await prisma.fuelConsumption.findMany({ take: 1 });
    console.log('\n[Trucks Sample]:', trucks[0]);
    console.log('[Fuel Logs Sample]:', fuelLogs[0]);

    // 3. Check Road Segments for Distance/Route Breakdown
    const roads = await prisma.roadSegment.findMany({ take: 1 });
    console.log('\n[Road Segments Sample]:', roads[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
