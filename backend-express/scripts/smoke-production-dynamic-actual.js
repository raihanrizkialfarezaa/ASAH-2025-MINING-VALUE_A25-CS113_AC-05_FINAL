import prisma from '../src/config/database.js';
import { haulingService } from '../src/services/hauling.service.js';

const toRecordDate = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const run = async () => {
  const hauling = await prisma.haulingActivity.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { loadingPoint: { select: { miningSiteId: true } } },
  });
  if (!hauling) throw new Error('No hauling activity found');

  const miningSiteId = hauling.loadingPoint?.miningSiteId;
  if (!miningSiteId) throw new Error('Hauling has no loadingPoint.miningSiteId');

  const recordDate = toRecordDate(hauling.loadingStartTime || new Date());
  const shift = hauling.shift;

  const targetProduction = 500;

  const payload = {
    recordDate,
    shift,
    miningSite: { connect: { id: miningSiteId } },
    targetProduction,
    actualProduction: 0,
    achievement: 0,
    totalTrips: 1,
    totalDistance: 0,
    totalFuel: 0,
    trucksOperating: 1,
    excavatorsOperating: hauling.excavatorId ? 1 : 0,
    equipmentAllocation: {
      truck_ids: hauling.truckId ? [hauling.truckId] : [],
      excavator_ids: hauling.excavatorId ? [hauling.excavatorId] : [],
      operator_ids: hauling.operatorId ? [hauling.operatorId] : [],
      truck_count: hauling.truckId ? 1 : 0,
      excavator_count: hauling.excavatorId ? 1 : 0,
      hauling_activity_ids: [hauling.id],
      created_from: 'smoke',
    },
    remarks: 'smoke dynamic actual',
  };

  const record = await prisma.productionRecord.upsert({
    where: {
      recordDate_shift_miningSiteId: { recordDate, shift, miningSiteId },
    },
    update: payload,
    create: payload,
    select: { id: true, actualProduction: true, achievement: true },
  });

  const nextLoad = (Number(hauling.loadWeight) || 0) + 1;
  await haulingService.quickUpdate(hauling.id, { loadWeight: nextLoad });

  const refreshed = await prisma.productionRecord.findUnique({
    where: { id: record.id },
    select: { id: true, actualProduction: true, achievement: true, targetProduction: true },
  });

  console.log('OK', {
    haulingId: hauling.id,
    loadWeight: nextLoad,
    productionId: refreshed?.id,
    actualProduction: refreshed?.actualProduction,
    achievement: refreshed?.achievement,
    targetProduction: refreshed?.targetProduction,
  });
};

run()
  .catch((e) => {
    console.error('FAILED', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
