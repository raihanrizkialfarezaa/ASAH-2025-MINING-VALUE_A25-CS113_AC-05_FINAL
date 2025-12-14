import prisma from '../config/database.js';
import ApiError from '../utils/apiError.js';
import { getPaginationParams, calculatePagination } from '../utils/pagination.js';

const normalizeRecordDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const calculateActualAchievement = async (record) => {
  if (!record.equipmentAllocation) {
    return {
      ...record,
      calculatedAchievement: record.achievement,
      haulingBasedActual: record.actualProduction,
    };
  }

  const haulingIds = record.equipmentAllocation.hauling_activity_ids || [];
  if (haulingIds.length === 0) {
    return {
      ...record,
      calculatedAchievement: record.achievement,
      haulingBasedActual: record.actualProduction,
    };
  }

  const haulingActivities = await prisma.haulingActivity.findMany({
    where: { id: { in: haulingIds } },
    select: { loadWeight: true, status: true },
  });

  const totalLoadWeight = haulingActivities.reduce((sum, h) => sum + (h.loadWeight || 0), 0);
  const calculatedAchievement =
    record.targetProduction > 0 ? (totalLoadWeight / record.targetProduction) * 100 : 0;

  return {
    ...record,
    calculatedAchievement: parseFloat(calculatedAchievement.toFixed(2)),
    haulingBasedActual: totalLoadWeight,
  };
};

export const productionService = {
  async getAll(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {};

    if (query.miningSiteId) {
      where.miningSiteId = query.miningSiteId;
    }

    if (query.startDate || query.endDate) {
      where.recordDate = {};
      if (query.startDate) where.recordDate.gte = new Date(query.startDate);
      if (query.endDate) where.recordDate.lte = new Date(query.endDate);
    }

    if (query.shift) {
      where.shift = query.shift;
    }

    if (query.search) {
      where.OR = [
        { miningSite: { name: { contains: query.search, mode: 'insensitive' } } },
        { miningSite: { code: { contains: query.search, mode: 'insensitive' } } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy = { recordDate: 'desc' };
    if (query.sortBy) {
      const direction = query.sortOrder === 'asc' ? 'asc' : 'desc';
      const validSortFields = [
        'recordDate',
        'targetProduction',
        'actualProduction',
        'achievement',
        'totalTrips',
        'createdAt',
      ];
      if (validSortFields.includes(query.sortBy)) {
        orderBy = { [query.sortBy]: direction };
      }
    }

    const [records, total] = await Promise.all([
      prisma.productionRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          miningSite: {
            select: {
              id: true,
              code: true,
              name: true,
              siteType: true,
            },
          },
        },
        orderBy,
      }),
      prisma.productionRecord.count({ where }),
    ]);

    const recordsWithCalculatedAchievement = await Promise.all(
      records.map((record) => calculateActualAchievement(record))
    );

    return {
      records: recordsWithCalculatedAchievement,
      pagination: calculatePagination(page, limit, total),
    };
  },

  async getById(id) {
    const record = await prisma.productionRecord.findUnique({
      where: { id },
      include: {
        miningSite: true,
      },
    });

    if (!record) {
      throw ApiError.notFound('Production record not found');
    }

    return record;
  },

  async create(data) {
    const recordDate = normalizeRecordDate(data.recordDate);
    if (!recordDate) {
      throw ApiError.badRequest('Invalid record date');
    }

    const targetProduction = Number(data.targetProduction);
    if (!Number.isFinite(targetProduction) || targetProduction <= 0) {
      throw ApiError.badRequest('Invalid target production');
    }
    const miningSiteId = data.miningSiteId;
    if (!miningSiteId) {
      throw ApiError.badRequest('Mining site is required');
    }

    const uniqueKey = {
      recordDate_shift_miningSiteId: {
        recordDate,
        shift: data.shift,
        miningSiteId,
      },
    };

    const existing = await prisma.productionRecord.findUnique({
      where: uniqueKey,
      select: { id: true, actualProduction: true },
    });

    const incomingActualRaw = Number(data.actualProduction);
    const hasIncomingActual = Number.isFinite(incomingActualRaw);

    let derivedActual = null;
    if (!existing && !hasIncomingActual) {
      const haulingIds = Array.isArray(data?.equipmentAllocation?.hauling_activity_ids)
        ? data.equipmentAllocation.hauling_activity_ids.filter(Boolean)
        : [];
      if (haulingIds.length > 0) {
        const activities = await prisma.haulingActivity.findMany({
          where: { id: { in: haulingIds } },
          select: { loadWeight: true },
        });
        const totalLoadWeight = activities.reduce((sum, a) => sum + (Number(a.loadWeight) || 0), 0);
        derivedActual = Number.isFinite(totalLoadWeight) ? totalLoadWeight : 0;
      }
    }

    const actualProduction = hasIncomingActual
      ? incomingActualRaw
      : existing
        ? Number(existing.actualProduction) || 0
        : derivedActual !== null
          ? derivedActual
          : 0;

    const achievement = targetProduction > 0 ? (actualProduction / targetProduction) * 100 : 0;

    const rest = { ...data };
    delete rest.miningSiteId;

    const payload = {
      ...rest,
      recordDate,
      shift: data.shift,
      miningSite: { connect: { id: miningSiteId } },
      targetProduction,
      actualProduction,
      achievement,
    };

    const record = await prisma.productionRecord.upsert({
      where: uniqueKey,
      update: payload,
      create: payload,
      include: {
        miningSite: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return record;
  },

  async update(id, data) {
    const record = await prisma.productionRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw ApiError.notFound('Production record not found');
    }

    const nextTargetRaw = data.targetProduction ?? record.targetProduction;
    const nextActualRaw = data.actualProduction ?? record.actualProduction;
    const targetProduction = Number(nextTargetRaw);
    const actualProductionCandidate = Number(nextActualRaw);
    const actualProduction = Number.isFinite(actualProductionCandidate)
      ? actualProductionCandidate
      : 0;
    const achievement = targetProduction > 0 ? (actualProduction / targetProduction) * 100 : 0;

    const miningSiteId = data.miningSiteId;
    const rest = { ...data };
    delete rest.miningSiteId;

    const updatedRecord = await prisma.productionRecord.update({
      where: { id },
      data: {
        ...rest,
        ...(miningSiteId ? { miningSite: { connect: { id: miningSiteId } } } : {}),
        ...(data.targetProduction !== undefined ? { targetProduction } : {}),
        ...(data.actualProduction !== undefined ? { actualProduction } : {}),
        achievement,
      },
    });

    return updatedRecord;
  },

  async delete(id) {
    const record = await prisma.productionRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw ApiError.notFound('Production record not found');
    }

    await prisma.productionRecord.delete({
      where: { id },
    });

    return { message: 'Production record deleted successfully' };
  },

  async getStatistics(miningSiteId, startDate, endDate) {
    const where = {};

    if (miningSiteId) {
      where.miningSiteId = miningSiteId;
    }

    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) where.recordDate.gte = new Date(startDate);
      if (endDate) where.recordDate.lte = new Date(endDate);
    }

    const aggregates = await prisma.productionRecord.aggregate({
      where,
      _sum: {
        actualProduction: true,
        targetProduction: true,
        totalTrips: true,
      },
      _avg: {
        achievement: true,
        avgCycleTime: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalProduction: aggregates._sum.actualProduction || 0,
      avgAchievement: aggregates._avg.achievement || 0,
      totalTrips: aggregates._sum.totalTrips || 0,
      avgCycleTime: aggregates._avg.avgCycleTime || 0,
      totalRecords: aggregates._count.id || 0,
    };
  },
};
