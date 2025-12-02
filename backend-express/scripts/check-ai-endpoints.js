import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function checkAIEndpoints() {
  try {
    console.log('=== CHECKING AI ENDPOINTS ===\n');

    console.log('1. Checking database connection...');
    const truckCount = await prisma.truck.count();
    const excavatorCount = await prisma.excavator.count();
    const operatorCount = await prisma.operator.count();
    const weatherCount = await prisma.weatherLog.count();
    const roadCount = await prisma.roadSegment.count();
    console.log(
      `✓ Database connected: ${truckCount} trucks, ${excavatorCount} excavators, ${operatorCount} operators`
    );
    console.log(`  Weather logs: ${weatherCount}, Road segments: ${roadCount}\n`);

    console.log('2. Checking Python AI service...');
    try {
      const healthCheck = await axios.get('http://localhost:8000/health', { timeout: 5000 });
      console.log(`✓ AI service health: ${JSON.stringify(healthCheck.data)}\n`);
    } catch (error) {
      console.log(`✗ AI service NOT responding on port 8000`);
      console.log(`  Error: ${error.message}\n`);
    }

    console.log('3. Checking realtime conditions data...');
    const latestWeather = await prisma.weatherLog.findFirst({
      orderBy: { timestamp: 'desc' },
      include: { miningSite: true },
    });
    const latestRoad = await prisma.roadSegment.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    console.log(
      'Latest weather:',
      latestWeather
        ? {
            condition: latestWeather.condition,
            temperature: latestWeather.temperature,
            timestamp: latestWeather.timestamp,
            site: latestWeather.miningSite?.name,
          }
        : 'None'
    );
    console.log(
      'Latest road:',
      latestRoad
        ? {
            condition: latestRoad.roadCondition,
            maxSpeed: latestRoad.maxSpeed,
            updatedAt: latestRoad.updatedAt,
          }
        : 'None\n'
    );

    console.log('4. Checking available resources for simulation...');
    const availableTrucks = await prisma.truck.findMany({
      where: { status: 'IDLE' },
      take: 5,
    });
    const availableExcavators = await prisma.excavator.findMany({
      where: { status: 'IDLE' },
      take: 5,
    });
    const availableOperators = await prisma.operator.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
    });
    console.log(
      `Available resources: ${availableTrucks.length} trucks, ${availableExcavators.length} excavators, ${availableOperators.length} operators\n`
    );

    console.log('5. Sample truck data:');
    if (availableTrucks[0]) {
      console.log(JSON.stringify(availableTrucks[0], null, 2));
    }

    console.log('\n6. Sample excavator data:');
    if (availableExcavators[0]) {
      console.log(JSON.stringify(availableExcavators[0], null, 2));
    }

    console.log('\n7. Sample operator data:');
    if (availableOperators[0]) {
      console.log(JSON.stringify(availableOperators[0], null, 2));
    }

    console.log('\n=== CHECK COMPLETE ===');
  } catch (error) {
    console.error('Error during check:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAIEndpoints();
