import { PrismaClient } from '@prisma/client';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const exportsDir = path.join(__dirname, '../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

async function exportTableToCSV(model, filename) {
  try {
    console.log(`Exporting ${model}...`);
    const data = await prisma[model].findMany();

    if (data.length === 0) {
      console.log(`No data found in ${model}`);
      return;
    }

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    const filepath = path.join(exportsDir, filename);
    fs.writeFileSync(filepath, csv);

    console.log(`Exported ${data.length} records to ${filename}`);
  } catch (error) {
    console.error(`Error exporting ${model}:`, error.message);
  }
}

async function exportAll() {
  console.log('Starting database export to CSV...\n');

  try {
    await exportTableToCSV('user', 'users.csv');
    await exportTableToCSV('operator', 'operators.csv');
    await exportTableToCSV('miningSite', 'mining_sites.csv');
    await exportTableToCSV('loadingPoint', 'loading_points.csv');
    await exportTableToCSV('dumpingPoint', 'dumping_points.csv');
    await exportTableToCSV('roadSegment', 'road_segments.csv');
    await exportTableToCSV('excavator', 'excavators.csv');
    await exportTableToCSV('truck', 'trucks.csv');
    await exportTableToCSV('supportEquipment', 'support_equipment.csv');
    await exportTableToCSV('haulingActivity', 'hauling_activities.csv');
    await exportTableToCSV('queueLog', 'queue_logs.csv');
    await exportTableToCSV('productionRecord', 'production_records.csv');
    await exportTableToCSV('weatherLog', 'weather_logs.csv');
    await exportTableToCSV('maintenanceLog', 'maintenance_logs.csv');
    await exportTableToCSV('incidentReport', 'incident_reports.csv');
    await exportTableToCSV('fuelConsumption', 'fuel_consumption.csv');
    await exportTableToCSV('delayReason', 'delay_reasons.csv');
    await exportTableToCSV('equipmentStatusLog', 'equipment_status_logs.csv');
    await exportTableToCSV('predictionLog', 'prediction_logs.csv');
    await exportTableToCSV('recommendationLog', 'recommendation_logs.csv');
    await exportTableToCSV('chatbotInteraction', 'chatbot_interactions.csv');
    await exportTableToCSV('systemConfig', 'system_configs.csv');

    console.log('\nAll exports completed!');
    console.log(`Files saved to: ${exportsDir}`);
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportAll();
