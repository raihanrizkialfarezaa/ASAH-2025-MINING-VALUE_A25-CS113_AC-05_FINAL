import prisma from '../src/config/database.js';

const arg = (name) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
};

const toDayRangeUtc = (dt) => {
  const d = new Date(dt);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
  );
  return { start, end };
};

const main = async () => {
  const activityNumber = arg('--activityNumber');

  const where = {
    excavatorId: { not: null },
    excavatorOperatorId: null,
  };
  if (activityNumber) where.activityNumber = activityNumber;

  const targets = await prisma.haulingActivity.findMany({
    where,
    select: {
      id: true,
      activityNumber: true,
      excavatorId: true,
      excavatorOperatorId: true,
      shift: true,
      loadingStartTime: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { loadingStartTime: 'desc' },
  });

  const results = [];

  for (const t of targets) {
    const { start, end } = toDayRangeUtc(t.loadingStartTime);

    const candidates = await prisma.haulingActivity.findMany({
      where: {
        excavatorId: t.excavatorId,
        shift: t.shift,
        loadingStartTime: { gte: start, lte: end },
        excavatorOperatorId: { not: null },
      },
      select: {
        excavatorOperatorId: true,
        activityNumber: true,
        loadingStartTime: true,
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
      orderBy: { loadingStartTime: 'desc' },
      take: 50,
    });

    const unique = new Map();
    for (const c of candidates) {
      if (!c.excavatorOperatorId) continue;
      if (!unique.has(c.excavatorOperatorId)) unique.set(c.excavatorOperatorId, c);
    }

    if (unique.size !== 1) {
      results.push({
        activityNumber: t.activityNumber,
        id: t.id,
        shift: t.shift,
        excavatorId: t.excavatorId,
        action: 'SKIP',
        reason: unique.size === 0 ? 'NO_CANDIDATE_SAME_DAY' : 'AMBIGUOUS_MULTIPLE_CANDIDATES',
        candidateCount: unique.size,
        candidates: Array.from(unique.values()).slice(0, 10),
      });
      continue;
    }

    const chosen = Array.from(unique.values())[0];
    const chosenId = chosen.excavatorOperatorId;

    const operator = chosen.excavatorOperator;
    if (!operator || operator.licenseType !== 'OPERATOR_ALAT_BERAT') {
      results.push({
        activityNumber: t.activityNumber,
        id: t.id,
        shift: t.shift,
        excavatorId: t.excavatorId,
        action: 'SKIP',
        reason: 'CANDIDATE_INVALID_LICENSE',
        chosen: chosen,
      });
      continue;
    }

    await prisma.haulingActivity.update({
      where: { id: t.id },
      data: { excavatorOperatorId: chosenId },
    });

    results.push({
      activityNumber: t.activityNumber,
      id: t.id,
      shift: t.shift,
      excavatorId: t.excavatorId,
      action: 'UPDATED',
      chosen: chosen,
    });
  }

  const summary = {
    scanned: targets.length,
    updated: results.filter((r) => r.action === 'UPDATED').length,
    skipped: results.filter((r) => r.action === 'SKIP').length,
  };

  console.log(JSON.stringify({ ok: true, summary, results }, null, 2));
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
