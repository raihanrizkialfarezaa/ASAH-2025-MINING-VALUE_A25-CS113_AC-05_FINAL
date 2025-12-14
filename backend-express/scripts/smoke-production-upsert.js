import prisma from '../src/config/database.js';

const run = async () => {
  const miningSite = await prisma.miningSite.findFirst({
    select: { id: true, code: true, name: true },
  });
  if (!miningSite) {
    throw new Error('No mining site found');
  }

  const recordDate = new Date('2025-12-14T00:00:00.000Z');
  recordDate.setUTCHours(0, 0, 0, 0);

  const data = {
    recordDate,
    shift: 'SHIFT_1',
    miningSiteId: miningSite.id,
    targetProduction: 500,
    actualProduction: null,
    totalTrips: 2,
    totalDistance: 12.960920102799085,
    totalFuel: 202.18,
    avgCycleTime: 16.11,
    trucksOperating: 2,
    excavatorsOperating: 2,
    equipmentAllocation: {
      truck_ids: ['cmiopph2p04h896tetgm9ahu5', 'cmiopph2s04hc96tets60fvsz'],
      excavator_ids: ['cmipmvy3q000252cad535arki', 'cmioppi9w05dl96teprixsjyc'],
      operator_ids: ['cmioppgux04ae96tembdc1oq5', 'cmioppgw204be96tea3zictyh'],
      truck_count: 2,
      excavator_count: 2,
      hauling_activity_ids: ['cmj5xf9k80006vuqje52hfsy7', 'cmj5xv0ig000avuqjnljg3x26'],
      created_from: 'manual',
    },
    remarks: 'Manual hauling: 2 trips | IDs: cmj5xf9k80006vuqje52hfsy7, cmj5xv0ig000avuqjnljg3x26',
  };

  const targetProduction = Number(data.targetProduction);
  const actualProduction = Number.isFinite(Number(data.actualProduction))
    ? Number(data.actualProduction)
    : 0;
  const achievement = targetProduction > 0 ? (actualProduction / targetProduction) * 100 : 0;
  const miningSiteId = data.miningSiteId;

  const payload = { ...data };
  delete payload.miningSiteId;
  payload.actualProduction = actualProduction;
  payload.targetProduction = targetProduction;
  payload.achievement = achievement;
  payload.miningSite = { connect: { id: miningSiteId } };

  const record = await prisma.productionRecord.upsert({
    where: {
      recordDate_shift_miningSiteId: {
        recordDate,
        shift: data.shift,
        miningSiteId,
      },
    },
    update: payload,
    create: payload,
    include: {
      miningSite: { select: { id: true, code: true, name: true } },
    },
  });

  console.log('OK', {
    id: record.id,
    recordDate: record.recordDate,
    shift: record.shift,
    miningSiteId: record.miningSiteId,
    miningSite: record.miningSite,
    targetProduction: record.targetProduction,
    actualProduction: record.actualProduction,
    achievement: record.achievement,
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
