import prisma from '../../src/config/database.js';
import { seedUsers } from './users.seed.large.js';
import {
  seedMiningSites,
  seedLoadingPoints,
  seedDumpingPoints,
  seedRoadSegments,
} from './locations.seed.large.js';
import {
  seedTrucks,
  seedExcavators,
  seedOperators,
  seedSupportEquipment,
} from './equipment.seed.large.js';
import {
  seedDelayReasons,
  seedWeatherLogs,
  seedMaintenanceLogs,
  seedProductionRecords,
  seedFuelConsumptions,
  seedIncidentReports,
  seedHaulingActivities,
  seedQueueLogs,
  seedEquipmentStatusLogs,
  seedPredictionLogs,
  seedRecommendationLogs,
  seedChatbotInteractions,
  seedSystemConfigs,
} from './operational.seed.large.js';
import { seedVessels } from './vessels.seed.large.js';
import logger from '../../src/config/logger.js';

async function cleanDatabase() {
  logger.info('Membersihkan database...');

  await prisma.chatbotInteraction.deleteMany({});
  await prisma.systemConfig.deleteMany({});
  await prisma.recommendationLog.deleteMany({});
  await prisma.predictionLog.deleteMany({});
  await prisma.equipmentStatusLog.deleteMany({});
  await prisma.queueLog.deleteMany({});
  await prisma.haulingActivity.deleteMany({});
  await prisma.fuelConsumption.deleteMany({});
  await prisma.incidentReport.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.productionRecord.deleteMany({});
  await prisma.weatherLog.deleteMany({});
  await prisma.delayReason.deleteMany({});
  await prisma.roadSegment.deleteMany({});
  await prisma.dumpingPoint.deleteMany({});
  await prisma.loadingPoint.deleteMany({});
  await prisma.berthingLog.deleteMany({});
  await prisma.bargeLoadingLog.deleteMany({});
  await prisma.shipmentRecord.deleteMany({});
  await prisma.sailingSchedule.deleteMany({});
  await prisma.jettyBerth.deleteMany({});
  await prisma.vessel.deleteMany({});
  await prisma.operator.deleteMany({});
  await prisma.supportEquipment.deleteMany({});
  await prisma.excavator.deleteMany({});
  await prisma.truck.deleteMany({});
  await prisma.miningSite.deleteMany({});
  await prisma.user.deleteMany({});

  logger.info('Database berhasil dibersihkan');
}

async function main() {
  try {
    await cleanDatabase();

    logger.info('Memulai seeding database...');

    logger.info('Seeding users...');
    const users = await seedUsers();
    logger.info(`Berhasil membuat ${users.length} users`);

    logger.info('Seeding mining sites...');
    const miningSites = await seedMiningSites();
    logger.info(`Berhasil membuat ${miningSites.length} mining sites`);

    logger.info('Seeding loading points...');
    const loadingPoints = await seedLoadingPoints(miningSites);
    logger.info(`Berhasil membuat ${loadingPoints.length} loading points`);

    logger.info('Seeding dumping points...');
    const dumpingPoints = await seedDumpingPoints(miningSites);
    logger.info(`Berhasil membuat ${dumpingPoints.length} dumping points`);

    logger.info('Seeding road segments...');
    const roadSegments = await seedRoadSegments(miningSites);
    logger.info(`Berhasil membuat ${roadSegments.length} road segments`);

    logger.info('Seeding operators...');
    const operatorUsers = users.filter((u) => u.role === 'OPERATOR');
    const operators = await seedOperators(operatorUsers);
    logger.info(`Berhasil membuat ${operators.length} operators`);

    logger.info('Seeding trucks...');
    const trucks = await seedTrucks(operators);
    logger.info(`Berhasil membuat ${trucks.length} trucks`);

    logger.info('Seeding excavators...');
    const excavators = await seedExcavators();
    logger.info(`Berhasil membuat ${excavators.length} excavators`);

    logger.info('Seeding support equipment...');
    const supportEquipment = await seedSupportEquipment();
    logger.info(`Berhasil membuat ${supportEquipment.length} support equipment`);

    logger.info('Seeding vessels and shipping data...');
    const vessels = await seedVessels();
    logger.info(`Berhasil membuat ${vessels.length} vessels`);

    logger.info('Seeding delay reasons...');
    const delayReasons = await seedDelayReasons();
    logger.info(`Berhasil membuat ${delayReasons.length} delay reasons`);

    logger.info('Seeding weather logs...');
    const weatherLogs = await seedWeatherLogs(miningSites);
    logger.info(`Berhasil membuat ${weatherLogs.length} weather logs`);

    logger.info('Seeding maintenance logs...');
    const maintenanceLogs = await seedMaintenanceLogs(trucks, excavators, supportEquipment);
    logger.info(`Berhasil membuat ${maintenanceLogs.length} maintenance logs`);

    logger.info('Seeding fuel consumptions...');
    const fuelConsumptions = await seedFuelConsumptions(trucks, excavators, supportEquipment);
    logger.info(`Berhasil membuat ${fuelConsumptions.length} fuel consumptions`);

    logger.info('Seeding production records...');
    const productionRecords = await seedProductionRecords(miningSites);
    logger.info(`Berhasil membuat ${productionRecords.length} production records`);

    logger.info('Seeding incident reports...');
    const incidentReports = await seedIncidentReports(users, trucks, excavators, operators);
    logger.info(`Berhasil membuat ${incidentReports.length} incident reports`);

    logger.info('Seeding hauling activities...');
    const haulingActivities = await seedHaulingActivities(
      trucks,
      excavators,
      operators,
      users,
      loadingPoints,
      dumpingPoints,
      roadSegments,
      delayReasons
    );
    logger.info(`Berhasil membuat ${haulingActivities.length} hauling activities`);

    logger.info('Seeding queue logs...');
    const queueLogs = await seedQueueLogs(loadingPoints);
    logger.info(`Berhasil membuat ${queueLogs.length} queue logs`);

    logger.info('Seeding equipment status logs...');
    const equipmentStatusLogs = await seedEquipmentStatusLogs(trucks, excavators, supportEquipment);
    logger.info(`Berhasil membuat ${equipmentStatusLogs.length} equipment status logs`);

    logger.info('Seeding prediction logs...');
    const predictionLogs = await seedPredictionLogs();
    logger.info(`Berhasil membuat ${predictionLogs.length} prediction logs`);

    logger.info('Seeding recommendation logs...');
    const recommendationLogs = await seedRecommendationLogs(users);
    logger.info(`Berhasil membuat ${recommendationLogs.length} recommendation logs`);

    logger.info('Seeding chatbot interactions...');
    const chatbotInteractions = await seedChatbotInteractions(users);
    logger.info(`Berhasil membuat ${chatbotInteractions.length} chatbot interactions`);

    logger.info('Seeding system configs...');
    const systemConfigs = await seedSystemConfigs();
    logger.info(`Berhasil membuat ${systemConfigs.length} system configs`);

    logger.info('Seeding database berhasil diselesaikan!');
    logger.info('====================================');
    logger.info('SUMMARY:');
    logger.info(`Total Users: ${users.length}`);
    logger.info(`Total Operators: ${operators.length}`);
    logger.info(`Total Mining Sites: ${miningSites.length}`);
    logger.info(`Total Loading Points: ${loadingPoints.length}`);
    logger.info(`Total Dumping Points: ${dumpingPoints.length}`);
    logger.info(`Total Road Segments: ${roadSegments.length}`);
    logger.info(`Total Trucks: ${trucks.length}`);
    logger.info(`Total Excavators: ${excavators.length}`);
    logger.info(`Total Support Equipment: ${supportEquipment.length}`);
    logger.info(`Total Vessels: ${vessels.length}`);
    logger.info(`Total Hauling Activities: ${haulingActivities.length}`);
    logger.info(`Total Production Records: ${productionRecords.length}`);
    logger.info(`Total Weather Logs: ${weatherLogs.length}`);
    logger.info(`Total Maintenance Logs: ${maintenanceLogs.length}`);
    logger.info(`Total Fuel Consumptions: ${fuelConsumptions.length}`);
    logger.info(`Total Incident Reports: ${incidentReports.length}`);
    logger.info(`Total Queue Logs: ${queueLogs.length}`);
    logger.info(`Total Equipment Status Logs: ${equipmentStatusLogs.length}`);
    logger.info(`Total Recommendation Logs: ${recommendationLogs.length}`);
    logger.info(`Total Prediction Logs: ${predictionLogs.length}`);
    logger.info(`Total Chatbot Interactions: ${chatbotInteractions.length}`);
    logger.info(`Total System Configs: ${systemConfigs.length}`);
    logger.info('====================================');
  } catch (error) {
    logger.error('Error saat seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
