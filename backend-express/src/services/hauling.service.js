import prisma from '../config/database.js';
import ApiError from '../utils/apiError.js';
import { getPaginationParams, calculatePagination } from '../utils/pagination.js';
import { HAULING_STATUS, TRUCK_STATUS } from '../config/constants.js';

const updateProductionAchievementByHaulingId = async (haulingActivityId) => {
  try {
    const productionRecords = await prisma.productionRecord.findMany({
      where: {
        equipmentAllocation: {
          path: ['hauling_activity_ids'],
          array_contains: haulingActivityId,
        },
      },
    });

    for (const record of productionRecords) {
      const haulingIds = record.equipmentAllocation?.hauling_activity_ids || [];
      if (haulingIds.length === 0) continue;

      const activities = await prisma.haulingActivity.findMany({
        where: { id: { in: haulingIds } },
      });

      const completedAndAchieved = activities.filter(
        (a) =>
          a.status === HAULING_STATUS.COMPLETED &&
          a.loadWeight !== null &&
          a.loadWeight >= a.targetWeight
      );

      const totalLoadWeight = activities.reduce(
        (sum, a) => sum + (parseFloat(a.loadWeight) || 0),
        0
      );
      const achievement =
        activities.length > 0 ? (completedAndAchieved.length / activities.length) * 100 : 0;

      await prisma.productionRecord.update({
        where: { id: record.id },
        data: {
          achievement: parseFloat(achievement.toFixed(2)),
          actualProduction: parseFloat(totalLoadWeight.toFixed(2)),
        },
      });
    }
  } catch (error) {
    console.error('Failed to update production achievement:', error);
  }
};

export const haulingService = {
  async getAll(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.shift) {
      where.shift = query.shift;
    }

    if (query.truckId) {
      where.truckId = query.truckId;
    }

    if (query.excavatorId) {
      where.excavatorId = query.excavatorId;
    }

    if (query.isDelayed !== undefined) {
      where.isDelayed = query.isDelayed === 'true';
    }

    if (query.startDate || query.endDate) {
      where.loadingStartTime = {};
      if (query.startDate) where.loadingStartTime.gte = new Date(query.startDate);
      if (query.endDate) where.loadingStartTime.lte = new Date(query.endDate);
    }

    const [activities, total] = await Promise.all([
      prisma.haulingActivity.findMany({
        where,
        skip,
        take: limit,
        include: {
          truck: { select: { id: true, code: true, name: true } },
          excavator: { select: { id: true, code: true, name: true } },
          operator: {
            include: {
              user: { select: { id: true, fullName: true } },
            },
          },
          loadingPoint: { select: { id: true, code: true, name: true } },
          dumpingPoint: { select: { id: true, code: true, name: true } },
        },
        orderBy: { loadingStartTime: 'desc' },
      }),
      prisma.haulingActivity.count({ where }),
    ]);

    return {
      activities,
      pagination: calculatePagination(page, limit, total),
    };
  },

  async getById(id) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: {
        truck: true,
        excavator: true,
        operator: {
          include: {
            user: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        loadingPoint: true,
        dumpingPoint: true,
        roadSegment: true,
        delayReason: true,
      },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    return activity;
  },

  async create(data, supervisorId) {
    const [truck, excavator, operator, loadingPoint, dumpingPoint] = await Promise.all([
      prisma.truck.findUnique({ where: { id: data.truckId } }),
      prisma.excavator.findUnique({ where: { id: data.excavatorId } }),
      prisma.operator.findUnique({ where: { id: data.operatorId } }),
      prisma.loadingPoint.findUnique({ where: { id: data.loadingPointId } }),
      prisma.dumpingPoint.findUnique({ where: { id: data.dumpingPointId } }),
    ]);

    if (!truck || !truck.isActive) {
      throw ApiError.notFound('Truck not found or inactive');
    }

    if (truck.status !== TRUCK_STATUS.IDLE && truck.status !== TRUCK_STATUS.STANDBY) {
      throw ApiError.badRequest('Truck is not available for hauling');
    }

    if (!excavator || !excavator.isActive) {
      throw ApiError.notFound('Excavator not found or inactive');
    }

    if (!operator || operator.status !== 'ACTIVE') {
      throw ApiError.notFound('Operator not found or not active');
    }

    if (!loadingPoint || !loadingPoint.isActive) {
      throw ApiError.notFound('Loading point not found or inactive');
    }

    if (!dumpingPoint || !dumpingPoint.isActive) {
      throw ApiError.notFound('Dumping point not found or inactive');
    }

    const activityNumber = await this.generateActivityNumber();

    const activity = await prisma.$transaction(async (tx) => {
      const newActivity = await tx.haulingActivity.create({
        data: {
          ...data,
          activityNumber,
          supervisorId,
          loadingStartTime: new Date(),
          status: HAULING_STATUS.LOADING,
          loadWeight: data.loadWeight || 0,
        },
        include: {
          truck: { select: { id: true, code: true, name: true } },
          excavator: { select: { id: true, code: true, name: true } },
          operator: {
            include: {
              user: { select: { id: true, fullName: true } },
            },
          },
          loadingPoint: { select: { id: true, code: true, name: true } },
          dumpingPoint: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.truck.update({
        where: { id: data.truckId },
        data: { status: TRUCK_STATUS.LOADING },
      });

      return newActivity;
    });

    return activity;
  },

  async update(id, data) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: { truck: true },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    const isOnlyStatusChange = Object.keys(data).length === 1 && 'status' in data;
    const isOnlyRemarksChange = Object.keys(data).length === 1 && 'remarks' in data;
    const isMinorUpdate = isOnlyStatusChange || isOnlyRemarksChange;

    if (activity.status === HAULING_STATUS.COMPLETED && !isMinorUpdate) {
      throw ApiError.badRequest(
        'Cannot update completed activity. Only status and remarks can be changed.'
      );
    }

    if (data.truckId && data.truckId !== activity.truckId) {
      const truck = await prisma.truck.findUnique({ where: { id: data.truckId } });
      if (!truck || !truck.isActive) {
        throw ApiError.notFound('Truck not found or inactive');
      }
    }

    if (data.excavatorId && data.excavatorId !== activity.excavatorId) {
      const excavator = await prisma.excavator.findUnique({ where: { id: data.excavatorId } });
      if (!excavator || !excavator.isActive) {
        throw ApiError.notFound('Excavator not found or inactive');
      }
    }

    if (data.operatorId && data.operatorId !== activity.operatorId) {
      const operator = await prisma.operator.findUnique({ where: { id: data.operatorId } });
      if (!operator || operator.status !== 'ACTIVE') {
        throw ApiError.notFound('Operator not found or not active');
      }
    }

    if (data.loadingPointId && data.loadingPointId !== activity.loadingPointId) {
      const loadingPoint = await prisma.loadingPoint.findUnique({
        where: { id: data.loadingPointId },
      });
      if (!loadingPoint || !loadingPoint.isActive) {
        throw ApiError.notFound('Loading point not found or inactive');
      }
    }

    if (data.dumpingPointId && data.dumpingPointId !== activity.dumpingPointId) {
      const dumpingPoint = await prisma.dumpingPoint.findUnique({
        where: { id: data.dumpingPointId },
      });
      if (!dumpingPoint || !dumpingPoint.isActive) {
        throw ApiError.notFound('Dumping point not found or inactive');
      }
    }

    const updateData = { ...data };

    if (data.loadWeight && data.targetWeight) {
      const loadEfficiency = (data.loadWeight / data.targetWeight) * 100;
      updateData.loadEfficiency = parseFloat(loadEfficiency.toFixed(2));
    }

    if (data.status === HAULING_STATUS.COMPLETED && activity.status !== HAULING_STATUS.COMPLETED) {
      const returnTime = data.returnTime ? new Date(data.returnTime) : new Date();
      updateData.returnTime = returnTime;
      if (activity.dumpingEndTime) {
        updateData.returnDuration = Math.round(
          (returnTime - new Date(activity.dumpingEndTime)) / 60000
        );
      }
      if (activity.loadingStartTime) {
        updateData.totalCycleTime = Math.round(
          (returnTime - new Date(activity.loadingStartTime)) / 60000
        );
      }
      updateData.isDelayed = false;
    }

    const updatedActivity = await prisma.$transaction(async (tx) => {
      const updated = await tx.haulingActivity.update({
        where: { id },
        data: updateData,
        include: {
          truck: { select: { id: true, code: true, name: true } },
          excavator: { select: { id: true, code: true, name: true } },
          operator: {
            include: {
              user: { select: { id: true, fullName: true } },
            },
          },
          loadingPoint: { select: { id: true, code: true, name: true } },
          dumpingPoint: { select: { id: true, code: true, name: true } },
          roadSegment: { select: { id: true, code: true, name: true } },
        },
      });

      if (updateData.status && updateData.status !== activity.status) {
        if (updateData.status === HAULING_STATUS.COMPLETED) {
          await tx.truck.update({
            where: { id: activity.truckId },
            data: { status: TRUCK_STATUS.IDLE },
          });
        } else if (updateData.status === HAULING_STATUS.LOADING) {
          await tx.truck.update({
            where: { id: activity.truckId },
            data: { status: TRUCK_STATUS.LOADING },
          });
        } else if (updateData.status === HAULING_STATUS.HAULING) {
          await tx.truck.update({
            where: { id: activity.truckId },
            data: { status: TRUCK_STATUS.HAULING },
          });
        }
      }

      return updated;
    });

    return updatedActivity;
  },

  async completeLoading(id, loadWeight, loadingDuration) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: { truck: true },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    if (activity.status !== HAULING_STATUS.LOADING) {
      throw ApiError.badRequest('Activity is not in loading status');
    }

    const loadingEndTime = new Date();
    const calculatedDuration =
      loadingDuration || Math.round((loadingEndTime - activity.loadingStartTime) / 60000);

    const loadEfficiency = (loadWeight / activity.targetWeight) * 100;

    const updatedActivity = await prisma.$transaction(async (tx) => {
      const updated = await tx.haulingActivity.update({
        where: { id },
        data: {
          loadingEndTime,
          loadWeight,
          loadingDuration: calculatedDuration,
          loadEfficiency: parseFloat(loadEfficiency.toFixed(2)),
          departureTime: loadingEndTime,
          status: HAULING_STATUS.HAULING,
        },
        include: {
          truck: { select: { id: true, code: true, name: true } },
          excavator: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.truck.update({
        where: { id: activity.truckId },
        data: { status: TRUCK_STATUS.HAULING },
      });

      return updated;
    });

    return updatedActivity;
  },

  async completeDumping(id, dumpingDuration) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: { truck: true },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    if (activity.status !== HAULING_STATUS.DUMPING && activity.status !== HAULING_STATUS.HAULING) {
      throw ApiError.badRequest('Invalid activity status for completing dumping');
    }

    const now = new Date();
    const dumpingStartTime = activity.dumpingStartTime || now;
    const dumpingEndTime = now;
    const arrivalTime = activity.arrivalTime || dumpingStartTime;

    const calculatedDumpingDuration =
      dumpingDuration || Math.round((dumpingEndTime - dumpingStartTime) / 60000);

    const haulingDuration = Math.round((arrivalTime - activity.departureTime) / 60000);

    const updatedActivity = await prisma.$transaction(async (tx) => {
      const updated = await tx.haulingActivity.update({
        where: { id },
        data: {
          dumpingStartTime: activity.dumpingStartTime || dumpingStartTime,
          dumpingEndTime,
          arrivalTime: activity.arrivalTime || arrivalTime,
          dumpingDuration: calculatedDumpingDuration,
          haulingDuration,
          status: HAULING_STATUS.RETURNING,
        },
        include: {
          truck: { select: { id: true, code: true, name: true } },
          excavator: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.truck.update({
        where: { id: activity.truckId },
        data: {
          status: TRUCK_STATUS.HAULING,
          currentLocation: 'Returning',
        },
      });

      return updated;
    });

    return updatedActivity;
  },

  async complete(id, returnTime) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: { truck: true },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    if (activity.status === HAULING_STATUS.COMPLETED) {
      throw ApiError.badRequest('Activity already completed');
    }

    const finalReturnTime = returnTime ? new Date(returnTime) : new Date();
    const returnDuration = activity.dumpingEndTime
      ? Math.round((finalReturnTime - activity.dumpingEndTime) / 60000)
      : 0;

    const totalCycleTime = Math.round((finalReturnTime - activity.loadingStartTime) / 60000);

    const updatedActivity = await prisma.$transaction(async (tx) => {
      const updated = await tx.haulingActivity.update({
        where: { id },
        data: {
          returnTime: finalReturnTime,
          returnDuration,
          totalCycleTime,
          status: HAULING_STATUS.COMPLETED,
        },
        include: {
          truck: { select: { id: true, code: true, name: true } },
          excavator: { select: { id: true, code: true, name: true } },
          loadingPoint: { select: { id: true, code: true, name: true } },
          dumpingPoint: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.truck.update({
        where: { id: activity.truckId },
        data: {
          status: TRUCK_STATUS.IDLE,
          totalHours: { increment: Math.round(totalCycleTime / 60) },
          totalDistance: { increment: activity.distance },
        },
      });

      await tx.excavator.update({
        where: { id: activity.excavatorId },
        data: {
          totalHours: { increment: Math.round(activity.loadingDuration / 60) },
        },
      });

      return updated;
    });

    return updatedActivity;
  },

  async cancel(id, reason) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: { truck: true },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    if (activity.status === HAULING_STATUS.COMPLETED) {
      throw ApiError.badRequest('Cannot cancel completed activity');
    }

    const updatedActivity = await prisma.$transaction(async (tx) => {
      const updated = await tx.haulingActivity.update({
        where: { id },
        data: {
          status: HAULING_STATUS.CANCELLED,
          remarks: reason,
        },
      });

      await tx.truck.update({
        where: { id: activity.truckId },
        data: { status: TRUCK_STATUS.IDLE },
      });

      return updated;
    });

    return updatedActivity;
  },

  async addDelay(id, delayData) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    const updatedActivity = await prisma.haulingActivity.update({
      where: { id },
      data: {
        isDelayed: true,
        delayMinutes: { increment: delayData.delayMinutes },
        delayReasonId: delayData.delayReasonId || activity.delayReasonId,
        delayReasonDetail: delayData.delayReasonDetail || activity.delayReasonDetail,
        status: HAULING_STATUS.DELAYED,
      },
      include: {
        delayReason: true,
      },
    });

    return updatedActivity;
  },

  async getStatistics(query) {
    const where = {};

    if (query.startDate || query.endDate) {
      where.loadingStartTime = {};
      if (query.startDate) where.loadingStartTime.gte = new Date(query.startDate);
      if (query.endDate) where.loadingStartTime.lte = new Date(query.endDate);
    }

    if (query.shift) {
      where.shift = query.shift;
    }

    const [totalActivities, completedActivities, delayedActivities, avgMetrics] = await Promise.all(
      [
        prisma.haulingActivity.count({ where }),
        prisma.haulingActivity.count({ where: { ...where, status: HAULING_STATUS.COMPLETED } }),
        prisma.haulingActivity.count({ where: { ...where, isDelayed: true } }),
        prisma.haulingActivity.aggregate({
          where: { ...where, status: HAULING_STATUS.COMPLETED },
          _avg: {
            totalCycleTime: true,
            loadWeight: true,
            loadEfficiency: true,
            delayMinutes: true,
          },
          _sum: {
            loadWeight: true,
            distance: true,
            fuelConsumed: true,
          },
        }),
      ]
    );

    const delayRate = totalActivities > 0 ? (delayedActivities / totalActivities) * 100 : 0;
    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    return {
      totalActivities,
      completedActivities,
      delayedActivities,
      delayRate: parseFloat(delayRate.toFixed(2)),
      completionRate: parseFloat(completionRate.toFixed(2)),
      avgCycleTime: avgMetrics._avg.totalCycleTime || 0,
      avgLoadWeight: avgMetrics._avg.loadWeight || 0,
      avgLoadEfficiency: avgMetrics._avg.loadEfficiency || 0,
      avgDelayMinutes: avgMetrics._avg.delayMinutes || 0,
      totalLoadWeight: avgMetrics._sum.loadWeight || 0,
      totalDistance: avgMetrics._sum.distance || 0,
      totalFuelConsumed: avgMetrics._sum.fuelConsumed || 0,
    };
  },

  async getActive() {
    const activities = await prisma.haulingActivity.findMany({
      where: {
        status: {
          notIn: [HAULING_STATUS.COMPLETED, HAULING_STATUS.CANCELLED],
        },
      },
      include: {
        truck: { select: { id: true, code: true, name: true, status: true } },
        excavator: { select: { id: true, code: true, name: true } },
        operator: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        loadingPoint: { select: { id: true, code: true, name: true } },
        dumpingPoint: { select: { id: true, code: true, name: true } },
      },
      orderBy: { loadingStartTime: 'desc' },
    });

    return activities;
  },

  async generateActivityNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastActivity = await prisma.haulingActivity.findFirst({
      where: {
        activityNumber: {
          startsWith: `HA-${dateStr}`,
        },
      },
      orderBy: {
        activityNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastActivity) {
      const lastSequence = parseInt(lastActivity.activityNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `HA-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  },

  /**
   * Get hauling activities by production record's equipment allocation
   * Used to show related hauling activities in Production Edit modal
   */
  async getByEquipmentAllocation(truckIds = [], excavatorIds = [], options = {}) {
    const { startDate, endDate, limit = 50 } = options;

    const where = {
      OR: [{ truckId: { in: truckIds } }, { excavatorId: { in: excavatorIds } }],
    };

    // Filter by date range if provided
    if (startDate || endDate) {
      where.loadingStartTime = {};
      if (startDate) where.loadingStartTime.gte = new Date(startDate);
      if (endDate) where.loadingStartTime.lte = new Date(endDate);
    }

    const activities = await prisma.haulingActivity.findMany({
      where,
      take: limit,
      include: {
        truck: {
          select: {
            id: true,
            code: true,
            name: true,
            fuelConsumption: true,
            capacity: true,
          },
        },
        excavator: {
          select: {
            id: true,
            code: true,
            name: true,
            fuelConsumption: true,
            productionRate: true,
          },
        },
        operator: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        loadingPoint: { select: { id: true, code: true, name: true } },
        dumpingPoint: { select: { id: true, code: true, name: true } },
      },
      orderBy: { loadingStartTime: 'desc' },
    });

    // Calculate achievement based on status and load weight
    const activitiesWithAchievement = activities.map((activity) => ({
      ...activity,
      isAchieved:
        activity.status === HAULING_STATUS.COMPLETED &&
        activity.loadWeight !== null &&
        activity.loadWeight >= activity.targetWeight,
    }));

    return activitiesWithAchievement;
  },

  /**
   * Quick update hauling activity - only loadWeight and status
   * For use in Production Edit modal shortcuts
   */
  async quickUpdate(id, data) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    // Only allow loadWeight and status updates
    const updateData = {};
    if (data.loadWeight !== undefined) {
      updateData.loadWeight = data.loadWeight !== null ? parseFloat(data.loadWeight) : null;
    }
    if (data.status !== undefined) {
      if (!Object.values(HAULING_STATUS).includes(data.status)) {
        throw ApiError.badRequest('Invalid status value');
      }
      updateData.status = data.status;

      // If status changed to COMPLETED, set completion time
      if (data.status === HAULING_STATUS.COMPLETED && !activity.dumpingEndTime) {
        updateData.dumpingEndTime = new Date();
      }
    }

    const updated = await prisma.haulingActivity.update({
      where: { id },
      data: updateData,
      include: {
        truck: {
          select: { id: true, code: true, name: true, fuelConsumption: true, capacity: true },
        },
        excavator: {
          select: { id: true, code: true, name: true, fuelConsumption: true, productionRate: true },
        },
        operator: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    updated.isAchieved =
      updated.status === HAULING_STATUS.COMPLETED &&
      updated.loadWeight !== null &&
      updated.loadWeight >= updated.targetWeight;

    updateProductionAchievementByHaulingId(id);

    return updated;
  },

  async calculateProductionAchievement(
    truckIds = [],
    excavatorIds = [],
    startDate,
    endDate,
    haulingActivityIds = []
  ) {
    let activities = [];

    if (haulingActivityIds && haulingActivityIds.length > 0) {
      activities = await this.getByIds(haulingActivityIds);
    } else {
      activities = await this.getByEquipmentAllocation(truckIds, excavatorIds, {
        startDate,
        endDate,
      });
    }

    if (activities.length === 0) {
      return {
        achievement: 0,
        completedCount: 0,
        totalCount: 0,
        totalLoadWeight: 0,
        totalTargetWeight: 0,
        loadWeightProgress: 0,
      };
    }

    // Count completed haulings (status = COMPLETED and loadWeight >= targetWeight)
    const completedAndAchieved = activities.filter(
      (a) =>
        a.status === HAULING_STATUS.COMPLETED &&
        a.loadWeight !== null &&
        a.loadWeight >= a.targetWeight
    );

    const totalLoadWeight = activities.reduce((sum, a) => sum + (parseFloat(a.loadWeight) || 0), 0);
    const totalTargetWeight = activities.reduce(
      (sum, a) => sum + (parseFloat(a.targetWeight) || 0),
      0
    );

    const loadWeightProgress =
      totalTargetWeight > 0
        ? parseFloat(((totalLoadWeight / totalTargetWeight) * 100).toFixed(2))
        : 0;

    // Simple achievement formula: (completedCount / totalCount) * 100
    const achievement = parseFloat(
      ((completedAndAchieved.length / activities.length) * 100).toFixed(2)
    );

    return {
      achievement: Math.min(achievement, 100),
      completedCount: completedAndAchieved.length,
      totalCount: activities.length,
      totalLoadWeight: parseFloat(totalLoadWeight.toFixed(2)),
      totalTargetWeight: parseFloat(totalTargetWeight.toFixed(2)),
      loadWeightProgress,
    };
  },

  async delete(id) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: { truck: true },
    });

    if (!activity) {
      throw ApiError.notFound('Hauling activity not found');
    }

    await prisma.$transaction(async (tx) => {
      if (
        activity.truck &&
        activity.status !== HAULING_STATUS.COMPLETED &&
        activity.status !== HAULING_STATUS.CANCELLED
      ) {
        await tx.truck.update({
          where: { id: activity.truckId },
          data: { status: TRUCK_STATUS.IDLE },
        });
      }

      await tx.haulingActivity.delete({
        where: { id },
      });
    });

    return { message: 'Hauling activity deleted successfully', id };
  },

  async getByIds(ids = []) {
    if (!ids || ids.length === 0) return [];

    const activities = await prisma.haulingActivity.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        truck: { select: { id: true, code: true, name: true, capacity: true } },
        excavator: { select: { id: true, code: true, name: true, productionRate: true } },
        operator: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        loadingPoint: { select: { id: true, code: true, name: true } },
        dumpingPoint: { select: { id: true, code: true, name: true } },
        roadSegment: { select: { id: true, code: true, name: true, distance: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return activities.map((a) => ({
      ...a,
      isAchieved:
        a.status === HAULING_STATUS.COMPLETED &&
        a.loadWeight !== null &&
        a.loadWeight >= a.targetWeight,
    }));
  },
};
