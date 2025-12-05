const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeDataForAI() {
  console.log('=== Mining Operations Data Analysis for AI Enhancement ===\n');

  try {
    const trucksStats = await prisma.truck.aggregate({
      _count: true,
      _avg: { capacity: true, fuelConsumption: true, averageSpeed: true },
      _max: { capacity: true },
      _min: { capacity: true },
    });
    console.log('TRUCKS STATISTICS:');
    console.log(JSON.stringify(trucksStats, null, 2));

    const trucksByStatus = await prisma.truck.groupBy({
      by: ['status'],
      _count: true,
    });
    console.log('\nTRUCKS BY STATUS:');
    console.log(JSON.stringify(trucksByStatus, null, 2));

    const sampleTrucks = await prisma.truck.findMany({
      take: 5,
      select: {
        code: true,
        name: true,
        capacity: true,
        fuelConsumption: true,
        averageSpeed: true,
        status: true,
      },
    });
    console.log('\nSAMPLE TRUCKS:');
    console.log(JSON.stringify(sampleTrucks, null, 2));

    const excavatorStats = await prisma.excavator.aggregate({
      _count: true,
      _avg: { bucketCapacity: true, productionRate: true, fuelConsumption: true },
    });
    console.log('\n\nEXCAVATOR STATISTICS:');
    console.log(JSON.stringify(excavatorStats, null, 2));

    const sampleExcavators = await prisma.excavator.findMany({
      take: 3,
      select: {
        code: true,
        name: true,
        bucketCapacity: true,
        productionRate: true,
        fuelConsumption: true,
        status: true,
      },
    });
    console.log('\nSAMPLE EXCAVATORS:');
    console.log(JSON.stringify(sampleExcavators, null, 2));

    const haulingStats = await prisma.haulingActivity.aggregate({
      _count: true,
      _avg: { loadWeight: true, distance: true, totalCycleTime: true, fuelConsumed: true },
      _sum: { loadWeight: true, fuelConsumed: true },
    });
    console.log('\n\nHAULING STATISTICS:');
    console.log(JSON.stringify(haulingStats, null, 2));

    const recentHauling = await prisma.haulingActivity.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        activityNumber: true,
        loadWeight: true,
        distance: true,
        totalCycleTime: true,
        fuelConsumed: true,
        status: true,
        shift: true,
      },
    });
    console.log('\nRECENT HAULING:');
    console.log(JSON.stringify(recentHauling, null, 2));

    const productionStats = await prisma.productionRecord.aggregate({
      _count: true,
      _avg: { targetProduction: true, actualProduction: true, achievement: true, totalFuel: true },
      _sum: { actualProduction: true, totalFuel: true, totalTrips: true },
    });
    console.log('\n\nPRODUCTION STATISTICS:');
    console.log(JSON.stringify(productionStats, null, 2));

    const miningSites = await prisma.miningSite.findMany({
      take: 5,
      select: { code: true, name: true, siteType: true, isActive: true },
    });
    console.log('\n\nMINING SITES:');
    console.log(JSON.stringify(miningSites, null, 2));

    const loadingPoints = await prisma.loadingPoint.findMany({
      take: 3,
      select: { code: true, name: true, stockpileLevel: true, maxCapacity: true },
    });
    console.log('\n\nLOADING POINTS:');
    console.log(JSON.stringify(loadingPoints, null, 2));

    const dumpingPoints = await prisma.dumpingPoint.findMany({
      take: 3,
      select: { code: true, name: true, dumperType: true, currentLevel: true, maxCapacity: true },
    });
    console.log('\n\nDUMPING POINTS:');
    console.log(JSON.stringify(dumpingPoints, null, 2));

    const roadSegments = await prisma.roadSegment.findMany({
      take: 3,
      select: { code: true, name: true, distance: true, maxSpeed: true, condition: true },
    });
    console.log('\n\nROAD SEGMENTS:');
    console.log(JSON.stringify(roadSegments, null, 2));

    const fuelConsumption = await prisma.fuelConsumption.aggregate({
      _avg: { quantity: true, costPerLiter: true },
      _sum: { quantity: true, totalCost: true },
    });
    console.log('\n\nFUEL CONSUMPTION:');
    console.log(JSON.stringify(fuelConsumption, null, 2));

    const systemConfigs = await prisma.systemConfig.findMany({
      where: { category: 'FINANCIAL' },
      select: { configKey: true, configValue: true },
    });
    console.log('\n\nFINANCIAL CONFIGS:');
    console.log(JSON.stringify(systemConfigs, null, 2));

    console.log('\n\n=== Analysis Complete ===');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDataForAI();
