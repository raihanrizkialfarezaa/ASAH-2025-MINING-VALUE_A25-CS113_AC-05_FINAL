import prisma from '../src/config/database.js';

const activityNumber = process.argv[2] || 'HA-20251214-002';

const main = async () => {
  const activity = await prisma.haulingActivity.findFirst({
    where: { activityNumber },
    include: {
      truck: { select: { id: true, code: true, name: true, status: true } },
      excavator: { select: { id: true, code: true, name: true, status: true } },
      operator: {
        select: {
          id: true,
          employeeNumber: true,
          licenseType: true,
          status: true,
          user: { select: { id: true, fullName: true } },
        },
      },
      excavatorOperator: {
        select: {
          id: true,
          employeeNumber: true,
          licenseType: true,
          status: true,
          user: { select: { id: true, fullName: true } },
        },
      },
      loadingPoint: { select: { id: true, code: true, name: true, miningSiteId: true } },
      dumpingPoint: { select: { id: true, code: true, name: true } },
      roadSegment: { select: { id: true, code: true, name: true, distance: true } },
    },
  });

  if (!activity) {
    console.log(JSON.stringify({ ok: false, activityNumber, error: 'NOT_FOUND' }, null, 2));
    return;
  }

  const raw = await prisma.haulingActivity.findUnique({
    where: { id: activity.id },
    select: {
      id: true,
      activityNumber: true,
      shift: true,
      status: true,
      truckId: true,
      operatorId: true,
      excavatorId: true,
      excavatorOperatorId: true,
      supervisorId: true,
      loadingPointId: true,
      dumpingPointId: true,
      roadSegmentId: true,
      loadWeight: true,
      targetWeight: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let candidates = [];
  if (raw?.excavatorId) {
    const rows = await prisma.haulingActivity.findMany({
      where: {
        excavatorId: raw.excavatorId,
        excavatorOperatorId: { not: null },
        shift: raw.shift,
      },
      orderBy: { loadingStartTime: 'desc' },
      take: 15,
      include: {
        excavatorOperator: {
          select: {
            id: true,
            employeeNumber: true,
            licenseType: true,
            status: true,
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    candidates = rows.map((r) => ({
      activityNumber: r.activityNumber,
      loadingStartTime: r.loadingStartTime,
      excavatorOperatorId: r.excavatorOperatorId,
      excavatorOperator: r.excavatorOperator,
    }));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        activityNumber,
        raw,
        suggestedCandidates: candidates,
        hydrated: {
          truck: activity.truck,
          excavator: activity.excavator,
          operator: activity.operator,
          excavatorOperator: activity.excavatorOperator,
          loadingPoint: activity.loadingPoint,
          dumpingPoint: activity.dumpingPoint,
          roadSegment: activity.roadSegment,
        },
      },
      null,
      2
    )
  );
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
