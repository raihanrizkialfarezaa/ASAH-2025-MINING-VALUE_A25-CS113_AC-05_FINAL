import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sites = await prisma.miningSite.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  const byShift = await prisma.haulingActivity.groupBy({
    by: ['shift'],
    _count: { _all: true },
    _sum: { loadWeight: true },
  });

  const candidatesByShift = await prisma.haulingActivity.groupBy({
    by: ['shift'],
    where: {
      loadWeight: 0,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    _count: { _all: true },
  });

  const candidatesSample = await prisma.haulingActivity.findMany({
    where: {
      loadWeight: 0,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      activityNumber: true,
      shift: true,
      status: true,
      loadWeight: true,
      targetWeight: true,
      loadingPointId: true,
      createdAt: true,
    },
  });

  const candidatesBySite = await prisma.haulingActivity.groupBy({
    by: ['loadingPointId'],
    where: {
      loadWeight: 0,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    _count: { _all: true },
  });

  const loadingPoints = await prisma.loadingPoint.findMany({
    select: { id: true, name: true, code: true, miningSiteId: true },
  });

  const lpMap = new Map(loadingPoints.map((lp) => [lp.id, lp]));
  const siteMap = new Map(sites.map((s) => [s.id, s]));

  const siteAgg = new Map();
  for (const row of candidatesBySite) {
    const lp = lpMap.get(row.loadingPointId);
    const siteId = lp?.miningSiteId || 'UNKNOWN_SITE';
    const prev = siteAgg.get(siteId) || 0;
    siteAgg.set(siteId, prev + (row._count?._all || 0));
  }

  const siteAggSorted = Array.from(siteAgg.entries())
    .map(([siteId, count]) => ({
      siteId,
      count,
      name: siteMap.get(siteId)?.name || 'UNKNOWN',
      code: siteMap.get(siteId)?.code || 'UNKNOWN',
    }))
    .sort((a, b) => b.count - a.count);

  console.log('=== Mining Sites ===');
  for (const s of sites) {
    console.log(`${s.id} | ${s.code || '-'} | ${s.name}`);
  }

  console.log('\n=== Hauling Count By Shift (All) ===');
  for (const row of byShift) {
    console.log(`${row.shift} | count=${row._count._all} | sumLoad=${row._sum.loadWeight ?? 0}`);
  }

  console.log(
    '\n=== Available-For-Production Candidates By Shift (loadWeight=0, status!=COMPLETED/CANCELLED) ==='
  );
  for (const row of candidatesByShift) {
    console.log(`${row.shift} | count=${row._count._all}`);
  }

  console.log('\n=== Candidates By Mining Site (derived via loadingPoint.miningSiteId) ===');
  for (const row of siteAggSorted.slice(0, 20)) {
    console.log(`${row.siteId} | ${row.code} | ${row.name} | count=${row.count}`);
  }

  console.log('\n=== Candidate Sample (latest 10) ===');
  for (const h of candidatesSample) {
    const lp = lpMap.get(h.loadingPointId);
    const site = siteMap.get(lp?.miningSiteId);
    console.log(
      `${h.id} | ${h.activityNumber} | ${h.shift} | ${h.status} | load=${h.loadWeight} | target=${h.targetWeight} | site=${site?.code || '-'} | lp=${lp?.code || '-'}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
