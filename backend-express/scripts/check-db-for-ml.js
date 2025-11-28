import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

async function checkDatabaseStructure() {
  console.log('\n=== DATABASE STRUCTURE CHECK ===\n');

  try {
    const tables = [
      { name: 'Users', model: 'user' },
      { name: 'Trucks', model: 'truck' },
      { name: 'Excavators', model: 'excavator' },
      { name: 'Operators', model: 'operator' },
      { name: 'Road Segments', model: 'roadSegment' },
      { name: 'Hauling Activities', model: 'haulingActivity' },
      { name: 'Maintenance Logs', model: 'maintenanceLog' },
      { name: 'Fuel Consumption', model: 'fuelConsumption' },
      { name: 'Vessels', model: 'vessel' },
      { name: 'Sailing Schedules', model: 'sailingSchedule' },
    ];

    for (const table of tables) {
      try {
        const count = await prisma[table.model].count();
        console.log(`✅ ${table.name.padEnd(25)} : ${count} records`);
      } catch (err) {
        console.log(`❌ ${table.name.padEnd(25)} : Error - ${err.message}`);
      }
    }

    console.log('\n=== RECENT HAULING ACTIVITIES (Last 10) ===\n');
    const recentActivities = await prisma.haulingActivity.findMany({
      take: 10,
      orderBy: { loadingStartTime: 'desc' },
      select: {
        id: true,
        activityNumber: true,
        loadingStartTime: true,
        loadWeight: true,
        fuelConsumed: true,
        distance: true,
        status: true,
        weatherCondition: true,
      },
    });

    console.table(recentActivities);

    console.log('\n=== SAMPLE DATA FOR ML ===\n');
    const sampleForML = await prisma.haulingActivity.findFirst({
      where: {
        status: 'COMPLETED',
        fuelConsumed: { gt: 0 },
        loadWeight: { gt: 0 },
      },
      include: {
        truck: true,
        excavator: true,
        operator: true,
        roadSegment: true,
      },
    });

    if (sampleForML) {
      console.log('Sample Hauling Activity with Relations:');
      console.log(
        JSON.stringify(
          {
            activity: {
              id: sampleForML.id,
              loadWeight: sampleForML.loadWeight,
              fuelConsumed: sampleForML.fuelConsumed,
              distance: sampleForML.distance,
              weatherCondition: sampleForML.weatherCondition,
              roadCondition: sampleForML.roadCondition,
              shift: sampleForML.shift,
            },
            truck: {
              capacity: sampleForML.truck?.capacity,
              brand: sampleForML.truck?.brand,
              purchaseDate: sampleForML.truck?.purchaseDate,
            },
            excavator: {
              bucketCapacity: sampleForML.excavator?.bucketCapacity,
              model: sampleForML.excavator?.model,
            },
            operator: {
              rating: sampleForML.operator?.rating,
              competency: sampleForML.operator?.competency,
            },
            road: {
              distance: sampleForML.roadSegment?.distance,
              gradient: sampleForML.roadSegment?.gradient,
            },
          },
          null,
          2
        )
      );
    } else {
      console.log('⚠️  No completed hauling activities with fuel/load data found');
    }

    console.log('\n=== DATABASE CONNECTION TEST ===');
    console.log('✅ Database connection successful');
    console.log(`📊 Database ready for ML training pipeline\n`);
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStructure();
