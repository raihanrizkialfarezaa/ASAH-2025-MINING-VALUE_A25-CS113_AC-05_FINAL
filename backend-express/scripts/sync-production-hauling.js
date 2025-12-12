import prisma from '../src/config/database.js';
import { HAULING_STATUS } from '../src/config/constants.js';

const round2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const sum = (arr) => arr.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);

const almostEqual = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;

const buildTargets = (activities, targetProduction) => {
  const tp = Number(targetProduction);
  if (!Number.isFinite(tp) || tp <= 0) return null;

  const loads = activities.map((a) => round2(a.loadWeight ?? 0));
  const realizedTotal = sum(loads);

  if (activities.length === 0) return null;

  if (realizedTotal > 0 && tp > 0 && realizedTotal >= tp) {
    const scale = tp / realizedTotal;
    const scaled = loads.map((lw) => round2(lw * scale));
    const scaledSum = sum(scaled);
    const delta = round2(tp - scaledSum);
    if (activities.length > 0 && delta !== 0) {
      scaled[scaled.length - 1] = round2(scaled[scaled.length - 1] + delta);
    }
    return scaled;
  }

  const completedIndexes = [];
  const incompleteIndexes = [];
  for (let i = 0; i < activities.length; i++) {
    if (activities[i].status === HAULING_STATUS.COMPLETED) completedIndexes.push(i);
    else incompleteIndexes.push(i);
  }

  const targets = new Array(activities.length).fill(0);

  if (completedIndexes.length === 0) {
    const per = round2(tp / activities.length);
    for (let i = 0; i < activities.length; i++) targets[i] = per;
    const baseSum = sum(targets);
    const delta = round2(tp - baseSum);
    targets[targets.length - 1] = round2(targets[targets.length - 1] + delta);
    return targets;
  }

  for (const idx of completedIndexes) {
    targets[idx] = round2(activities[idx].loadWeight ?? activities[idx].targetWeight ?? 0);
  }

  const completedSum = sum(targets);
  const remaining = round2(tp - completedSum);

  if (incompleteIndexes.length === 0) {
    if (completedSum <= 0) {
      targets[targets.length - 1] = round2(tp);
      return targets;
    }
    const scale = tp / completedSum;
    for (let i = 0; i < targets.length; i++) targets[i] = round2(targets[i] * scale);
    const newSum = sum(targets);
    const delta = round2(tp - newSum);
    targets[targets.length - 1] = round2(targets[targets.length - 1] + delta);
    return targets;
  }

  const perIncomplete = round2(remaining / incompleteIndexes.length);
  for (const idx of incompleteIndexes) targets[idx] = perIncomplete;

  const afterSum = sum(targets);
  const delta = round2(tp - afterSum);
  const lastIdx = incompleteIndexes[incompleteIndexes.length - 1];
  targets[lastIdx] = round2(targets[lastIdx] + delta);

  return targets;
};

const main = async () => {
  const fix = process.argv.includes('--fix') || true;

  const records = await prisma.productionRecord.findMany({
    select: {
      id: true,
      targetProduction: true,
      actualProduction: true,
      achievement: true,
      equipmentAllocation: true,
      recordDate: true,
      shift: true,
    },
    orderBy: { recordDate: 'desc' },
  });

  let scanned = 0;
  let updatedRecords = 0;
  let updatedActivities = 0;
  let mismatchedTargets = 0;
  let mismatchedAchievement = 0;

  for (const record of records) {
    scanned++;

    const haulingIds = record.equipmentAllocation?.hauling_activity_ids || [];
    const hasHauling = Array.isArray(haulingIds) && haulingIds.length > 0;

    if (!hasHauling) {
      const tp = Number(record.targetProduction) || 0;
      const ap = Number(record.actualProduction) || 0;
      const desiredAchievement = tp > 0 ? round2((ap / tp) * 100) : 0;
      if (!almostEqual(round2(record.achievement || 0), desiredAchievement, 0.01)) {
        mismatchedAchievement++;
        if (fix) {
          await prisma.productionRecord.update({
            where: { id: record.id },
            data: { achievement: desiredAchievement },
          });
          updatedRecords++;
        }
      }
      continue;
    }

    const activities = await prisma.haulingActivity.findMany({
      where: { id: { in: haulingIds } },
      select: { id: true, status: true, loadWeight: true, targetWeight: true },
    });

    const tp = Number(record.targetProduction) || 0;
    const totalLoad = round2(sum(activities.map((a) => round2(a.loadWeight ?? 0))));
    const totalTarget = round2(sum(activities.map((a) => round2(a.targetWeight ?? 0))));

    const desiredAchievement = tp > 0 ? round2((totalLoad / tp) * 100) : 0;

    const needsAchievementUpdate = !almostEqual(
      round2(record.achievement || 0),
      desiredAchievement,
      0.01
    );
    if (needsAchievementUpdate) mismatchedAchievement++;

    const targetPlan = buildTargets(activities, tp);
    const needsTargetUpdate = targetPlan ? !almostEqual(totalTarget, round2(tp), 0.05) : false;
    if (needsTargetUpdate) mismatchedTargets++;

    if (!fix) continue;

    if (!needsAchievementUpdate && !needsTargetUpdate) {
      const needsActualProdUpdate = !almostEqual(
        round2(record.actualProduction || 0),
        totalLoad,
        0.01
      );
      if (needsActualProdUpdate) {
        await prisma.productionRecord.update({
          where: { id: record.id },
          data: { actualProduction: totalLoad },
        });
        updatedRecords++;
      }
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (needsTargetUpdate && targetPlan) {
        for (let i = 0; i < activities.length; i++) {
          const current = round2(activities[i].targetWeight ?? 0);
          const next = round2(targetPlan[i]);
          if (!almostEqual(current, next, 0.01)) {
            await tx.haulingActivity.update({
              where: { id: activities[i].id },
              data: { targetWeight: next },
            });
            updatedActivities++;
          }
        }
      }

      await tx.productionRecord.update({
        where: { id: record.id },
        data: {
          actualProduction: totalLoad,
          achievement: desiredAchievement,
        },
      });
      updatedRecords++;
    });
  }

  const summary = {
    scanned,
    mismatchedTargets,
    mismatchedAchievement,
    updatedRecords,
    updatedActivities,
  };

  console.log(JSON.stringify(summary, null, 2));
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
