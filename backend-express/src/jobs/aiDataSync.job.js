import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Parser } from 'json2csv';
import aiService from '../services/ai.service.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIDataSyncJob {
  constructor() {
    this.AI_DATA_PATH = path.join(__dirname, '../../../mining-ops-ai-main/data');
    this.isRunning = false;
  }

  /**
   * Start scheduled jobs
   */
  start() {
    // Job 1: Daily data export at 02:00
    cron.schedule('0 2 * * *', async () => {
      await this.runDataExport();
    });

    // Job 2: Hourly incremental sync (optional)
    cron.schedule('0 * * * *', async () => {
      await this.runIncrementalSync();
    });

    logger.info('✅ AI Data Sync Jobs scheduled:');
    logger.info('   - Full export: Daily at 02:00');
    logger.info('   - Incremental sync: Every hour');
  }

  /**
   * Full data export for ML training
   */
  async runDataExport() {
    if (this.isRunning) {
      logger.warn('Data export already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('🔄 Starting AI data export job...');

    try {
      // Ensure AI data directory exists
      if (!fs.existsSync(this.AI_DATA_PATH)) {
        logger.info(`Creating AI data directory: ${this.AI_DATA_PATH}`);
        fs.mkdirSync(this.AI_DATA_PATH, { recursive: true });
      }

      // Export all required tables
      await Promise.all([
        this.exportTrucks(),
        this.exportExcavators(),
        this.exportOperators(),
        this.exportRoadSegments(),
        this.exportSailingSchedules(),
        this.exportVessels(),
        this.exportMaintenanceLogs(),
        this.exportHaulingActivities(),
      ]);

      logger.info('✅ AI data export completed successfully');
    } catch (error) {
      logger.error('❌ AI data export failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Incremental sync for real-time updates
   */
  async runIncrementalSync() {
    try {
      // Only sync dynamic data (hauling activities in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentActivities = await prisma.haulingActivity.findMany({
        where: {
          updatedAt: { gte: oneHourAgo },
        },
      });

      if (recentActivities.length > 0) {
        logger.info(`Incremental sync: ${recentActivities.length} new activities`);
        // Append to existing file or trigger re-export
        await this.exportHaulingActivities();
      }
    } catch (error) {
      logger.error('Incremental sync failed:', error);
    }
  }

  /**
   * Export Trucks
   */
  async exportTrucks() {
    try {
      const trucks = await prisma.truck.findMany({
        select: {
          id: true,
          code: true,
          brand: true,
          model: true,
          capacity: true,
          fuelCapacity: true,
          purchaseDate: true,
          status: true,
          yearOfManufacture: true,
        },
      });

      const csvPath = path.join(this.AI_DATA_PATH, 'trucks.csv');
      this.writeCSV(trucks, csvPath);
      logger.info(`✓ Exported ${trucks.length} trucks`);
    } catch (error) {
      logger.error('Error exporting trucks:', error);
      throw error;
    }
  }

  /**
   * Export Excavators
   */
  async exportExcavators() {
    try {
      const excavators = await prisma.excavator.findMany({
        select: {
          id: true,
          code: true,
          brand: true,
          model: true,
          bucketCapacity: true,
          purchaseDate: true,
          status: true,
          yearOfManufacture: true,
        },
      });

      const csvPath = path.join(this.AI_DATA_PATH, 'excavators.csv');
      this.writeCSV(excavators, csvPath);
      logger.info(`✓ Exported ${excavators.length} excavators`);
    } catch (error) {
      logger.error('Error exporting excavators:', error);
      throw error;
    }
  }

  /**
   * Export Operators
   */
  async exportOperators() {
    try {
      const operators = await prisma.operator.findMany({
        select: {
          id: true,
          employeeNumber: true,
          licenseNumber: true,
          licenseType: true,
          rating: true,
          competency: true,
          status: true,
        },
      });

      const csvPath = path.join(this.AI_DATA_PATH, 'operators.csv');
      this.writeCSV(operators, csvPath);
      logger.info(`✓ Exported ${operators.length} operators`);
    } catch (error) {
      logger.error('Error exporting operators:', error);
      throw error;
    }
  }

  /**
   * Export Road Segments
   */
  async exportRoadSegments() {
    try {
      const roads = await prisma.roadSegment.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          distance: true,
          gradient: true,
          roadCondition: true,
          surfaceType: true,
          miningSiteId: true,
        },
      });

      const csvPath = path.join(this.AI_DATA_PATH, 'road_segments.csv');
      this.writeCSV(roads, csvPath);
      logger.info(`✓ Exported ${roads.length} road segments`);
    } catch (error) {
      logger.error('Error exporting road segments:', error);
      throw error;
    }
  }

  /**
   * Export Sailing Schedules
   */
  async exportSailingSchedules() {
    try {
      const schedules = await prisma.sailingSchedule.findMany({
        select: {
          id: true,
          vesselId: true,
          loadingPort: true,
          destination: true,
          etaLoading: true,
          etsLoading: true,
          plannedQuantity: true,
          actualQuantity: true,
          status: true,
          buyer: true,
        },
      });

      const csvPath = path.join(this.AI_DATA_PATH, 'sailing_schedules.csv');
      this.writeCSV(schedules, csvPath);
      logger.info(`✓ Exported ${schedules.length} sailing schedules`);
    } catch (error) {
      logger.error('Error exporting sailing schedules:', error);
      throw error;
    }
  }

  /**
   * Export Vessels
   */
  async exportVessels() {
    try {
      const vessels = await prisma.vessel.findMany({
        select: {
          id: true,
          name: true,
          vesselType: true,
          capacity: true,
          // flag: true, // Removed as not in schema
          // imo: true, // Removed as not in schema
        },
      });

      const csvPath = path.join(this.AI_DATA_PATH, 'vessels.csv');
      this.writeCSV(vessels, csvPath);
      logger.info(`✓ Exported ${vessels.length} vessels`);
    } catch (error) {
      logger.error('Error exporting vessels:', error);
      throw error;
    }
  }

  /**
   * Export Maintenance Logs
   */
  async exportMaintenanceLogs() {
    try {
      const logs = await prisma.maintenanceLog.findMany({
        where: {
          status: 'COMPLETED',
        },
        select: {
          id: true,
          truckId: true,
          excavatorId: true,
          maintenanceType: true,
          description: true,
          scheduledDate: true,
          completionDate: true,
          cost: true,
          status: true,
        },
        orderBy: { completionDate: 'desc' },
        take: 5000, // Last 5000 maintenance records
      });

      const csvPath = path.join(this.AI_DATA_PATH, 'maintenance_logs.csv');
      this.writeCSV(logs, csvPath);
      logger.info(`✓ Exported ${logs.length} maintenance logs`);
    } catch (error) {
      logger.error('Error exporting maintenance logs:', error);
      throw error;
    }
  }

  /**
   * Export Hauling Activities for ML Training
   */
  async exportHaulingActivities() {
    try {
      logger.info('Exporting hauling activities with full feature set...');

      const data = await aiService.exportDataForTraining(10000);

      const csvPath = path.join(this.AI_DATA_PATH, 'hauling_activities.csv');
      this.writeCSV(data, csvPath);
      logger.info(`✓ Exported ${data.length} hauling activities with features`);
    } catch (error) {
      logger.error('Error exporting hauling activities:', error);
      throw error;
    }
  }

  /**
   * Write data to CSV file
   */
  writeCSV(data, filePath) {
    if (data.length === 0) {
      logger.warn(`No data to write for ${filePath}`);
      return;
    }

    try {
      const parser = new Parser();
      const csv = parser.parse(data);
      fs.writeFileSync(filePath, csv);
    } catch (error) {
      logger.error(`Error writing CSV ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Manual trigger (can be called via API endpoint)
   */
  async triggerManualExport() {
    logger.info('Manual export triggered');
    return await this.runDataExport();
  }
}

export default new AIDataSyncJob();
