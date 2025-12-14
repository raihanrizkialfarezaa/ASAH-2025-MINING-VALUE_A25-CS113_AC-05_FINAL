import prisma from '../config/database.js';
import ApiError from '../utils/apiError.js';
import { getPaginationParams, calculatePagination } from '../utils/pagination.js';

export const vesselService = {
  /**
   * Get vessels available for loading (enhanced validation)
   * Returns only vessels with schedules that have remaining capacity
   */
  async getAvailableForLoading(query = {}) {
    const { minRemainingCapacity = 0 } = query;

    // Get schedules that are SCHEDULED or LOADING with vessels
    const schedules = await prisma.sailingSchedule.findMany({
      where: {
        status: { in: ['SCHEDULED', 'LOADING'] },
        etsLoading: { gte: new Date() }, // Future or today
      },
      include: {
        vessel: {
          select: {
            id: true,
            code: true,
            name: true,
            capacity: true,
            vesselType: true,
            status: true,
            isActive: true,
          },
        },
      },
      orderBy: { etsLoading: 'asc' },
    });

    // Filter vessels with remaining capacity
    const availableSchedules = schedules
      .filter((schedule) => {
        if (!schedule.vessel || !schedule.vessel.isActive) return false;
        const remainingCapacity =
          (schedule.plannedQuantity || schedule.vessel.capacity || 0) -
          (schedule.actualQuantity || 0);
        return remainingCapacity > minRemainingCapacity;
      })
      .map((schedule) => ({
        scheduleId: schedule.id,
        vesselId: schedule.vessel.id,
        vesselCode: schedule.vessel.code,
        vesselName: schedule.vessel.name,
        vesselCapacity: schedule.vessel.capacity,
        plannedQuantity: schedule.plannedQuantity || schedule.vessel.capacity,
        actualQuantity: schedule.actualQuantity || 0,
        remainingCapacity:
          (schedule.plannedQuantity || schedule.vessel.capacity || 0) -
          (schedule.actualQuantity || 0),
        loadingPercentage:
          schedule.plannedQuantity > 0
            ? ((schedule.actualQuantity || 0) / schedule.plannedQuantity) * 100
            : 0,
        etsLoading: schedule.etsLoading,
        status: schedule.status,
        vesselStatus: schedule.vessel.status,
        canAcceptLoad: true,
      }));

    return {
      availableSchedules,
      totalCount: availableSchedules.length,
    };
  },

  /**
   * Validate if a vessel/schedule can accept additional load
   */
  async validateVesselCapacity(scheduleId, additionalLoad) {
    const schedule = await prisma.sailingSchedule.findUnique({
      where: { id: scheduleId },
      include: { vessel: true },
    });

    if (!schedule) {
      return { valid: false, error: 'Schedule not found' };
    }

    if (!schedule.vessel || !schedule.vessel.isActive) {
      return { valid: false, error: 'Vessel not found or inactive' };
    }

    if (!['SCHEDULED', 'LOADING'].includes(schedule.status)) {
      return {
        valid: false,
        error: `Schedule status is ${schedule.status}. Only SCHEDULED or LOADING schedules can accept load.`,
      };
    }

    const plannedCapacity = schedule.plannedQuantity || schedule.vessel.capacity || 0;
    const currentLoad = schedule.actualQuantity || 0;
    const remainingCapacity = plannedCapacity - currentLoad;

    if (additionalLoad > remainingCapacity) {
      return {
        valid: false,
        error: `Insufficient capacity. Remaining: ${remainingCapacity.toFixed(2)} tons, Requested: ${additionalLoad.toFixed(2)} tons`,
        remainingCapacity,
        currentLoad,
        plannedCapacity,
      };
    }

    return {
      valid: true,
      remainingCapacity,
      currentLoad,
      plannedCapacity,
      afterLoad: currentLoad + additionalLoad,
      loadPercentageAfter: ((currentLoad + additionalLoad) / plannedCapacity) * 100,
    };
  },

  async getAll(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {};

    if (query.status) where.status = query.status;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [vessels, total] = await Promise.all([
      prisma.vessel.findMany({ where, skip, take: limit, orderBy: { code: 'asc' } }),
      prisma.vessel.count({ where }),
    ]);

    return { vessels, pagination: calculatePagination(page, limit, total) };
  },

  async getById(id) {
    const vessel = await prisma.vessel.findUnique({ where: { id } });
    if (!vessel) throw ApiError.notFound('Vessel not found');
    return vessel;
  },

  async create(data) {
    const existing = await prisma.vessel.findUnique({ where: { code: data.code } });
    if (existing) throw ApiError.conflict('Vessel code already exists');
    const vessel = await prisma.vessel.create({ data });
    return vessel;
  },

  async update(id, data) {
    const vessel = await prisma.vessel.findUnique({ where: { id } });
    if (!vessel) throw ApiError.notFound('Vessel not found');
    if (data.code && data.code !== vessel.code) {
      const existing = await prisma.vessel.findUnique({ where: { code: data.code } });
      if (existing) throw ApiError.conflict('Vessel code already exists');
    }
    const updated = await prisma.vessel.update({ where: { id }, data });
    return updated;
  },

  async delete(id) {
    const vessel = await prisma.vessel.findUnique({ where: { id } });
    if (!vessel) throw ApiError.notFound('Vessel not found');
    const linkedShipment = await prisma.shipmentRecord.findFirst({ where: { vesselId: id } });
    if (linkedShipment)
      throw ApiError.badRequest('Cannot delete vessel with existing shipment records');
    await prisma.vessel.delete({ where: { id } });
    return { message: 'Vessel deleted successfully' };
  },

  async getAllSchedules(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {};

    if (query.status) where.status = query.status;
    if (query.vesselId) where.vesselId = query.vesselId;

    const [schedules, total] = await Promise.all([
      prisma.sailingSchedule.findMany({
        where,
        skip,
        take: limit,
        include: { vessel: true },
        orderBy: { etsLoading: 'asc' },
      }),
      prisma.sailingSchedule.count({ where }),
    ]);

    return { schedules, pagination: calculatePagination(page, limit, total) };
  },
};
