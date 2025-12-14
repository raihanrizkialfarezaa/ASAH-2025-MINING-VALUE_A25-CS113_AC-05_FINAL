import prisma from '../config/database.js';
import ApiError from '../utils/apiError.js';
import { getPaginationParams, calculatePagination } from '../utils/pagination.js';
import { HAULING_STATUS, TRUCK_STATUS, EXCAVATOR_STATUS } from '../config/constants.js';

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

      const totalLoadWeight = activities.reduce(
        (sum, a) => sum + (parseFloat(a.loadWeight) || 0),
        0
      );
      const targetProduction = parseFloat(record.targetProduction) || 0;
      const achievement = targetProduction > 0 ? (totalLoadWeight / targetProduction) * 100 : 0;

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
  async getAvailableForProduction(query) {
    const limit = query.limit ? Math.min(parseInt(query.limit, 10) || 200, 1000) : 200;

    const where = {
      loadWeight: 0,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };

    if (query.shift) {
      where.shift = query.shift;
    }

    if (query.miningSiteId) {
      where.loadingPoint = { miningSiteId: query.miningSiteId };
    }

    const productionRecords = await prisma.productionRecord.findMany({
      select: { equipmentAllocation: true },
    });

    const usedHaulingIds = new Set();
    for (const record of productionRecords) {
      const ids = record.equipmentAllocation?.hauling_activity_ids || [];
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (id) usedHaulingIds.add(id);
        }
      }
    }

    if (usedHaulingIds.size > 0) {
      where.id = { notIn: Array.from(usedHaulingIds) };
    }

    const activities = await prisma.haulingActivity.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        truck: { select: { id: true, code: true, name: true, capacity: true } },
        excavator: { select: { id: true, code: true, name: true } },
        operator: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        excavatorOperator: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        loadingPoint: { select: { id: true, code: true, name: true, miningSiteId: true } },
        dumpingPoint: { select: { id: true, code: true, name: true } },
        roadSegment: { select: { id: true, code: true, name: true, distance: true } },
      },
    });

    return activities;
  },

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
          excavatorOperator: {
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
        excavatorOperator: {
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
    // Validate truck (required)
    const truck = await prisma.truck.findUnique({ where: { id: data.truckId } });
    if (!truck || !truck.isActive) {
      throw ApiError.notFound('Truck not found or inactive');
    }

    if (truck.status !== TRUCK_STATUS.IDLE && truck.status !== TRUCK_STATUS.STANDBY) {
      throw ApiError.badRequest(
        `Truck is not available for hauling (current status: ${truck.status}). Only STANDBY or IDLE trucks can be assigned.`
      );
    }

    // Validate excavator (optional - only validate if provided)
    let excavator = null;
    if (data.excavatorId) {
      excavator = await prisma.excavator.findUnique({ where: { id: data.excavatorId } });
      if (!excavator || !excavator.isActive) {
        throw ApiError.notFound('Excavator not found or inactive');
      }

      const validExcavatorStatuses = [
        EXCAVATOR_STATUS.IDLE,
        EXCAVATOR_STATUS.STANDBY,
        EXCAVATOR_STATUS.ACTIVE,
      ];
      if (!validExcavatorStatuses.includes(excavator.status)) {
        throw ApiError.badRequest(
          `Excavator is not available (current status: ${excavator.status}). Only IDLE/STANDBY/ACTIVE excavators can be assigned.`
        );
      }
    }

    // Validate excavator operator (required if excavator is set)
    if (data.excavatorId) {
      if (!data.excavatorOperatorId || data.excavatorOperatorId === '') {
        throw ApiError.badRequest('Excavator operator is required when excavator is set');
      }

      const excavatorOperator = await prisma.operator.findUnique({
        where: { id: data.excavatorOperatorId },
        select: { id: true, status: true, licenseType: true, shift: true },
      });

      if (!excavatorOperator || excavatorOperator.status !== 'ACTIVE') {
        throw ApiError.notFound('Excavator operator not found or not active');
      }

      if (excavatorOperator.licenseType !== 'OPERATOR_ALAT_BERAT') {
        throw ApiError.badRequest('Excavator operator does not have valid excavator license');
      }

      if (excavatorOperator.shift && data.shift && excavatorOperator.shift !== data.shift) {
        throw ApiError.badRequest('Excavator operator shift does not match hauling shift');
      }

      const existingActiveForExcavatorOperator = await prisma.haulingActivity.findFirst({
        where: {
          excavatorOperatorId: data.excavatorOperatorId,
          status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
        },
        select: { id: true, activityNumber: true },
      });

      if (existingActiveForExcavatorOperator) {
        throw ApiError.badRequest(
          `Excavator operator is already assigned to active hauling activity: ${existingActiveForExcavatorOperator.activityNumber}`
        );
      }
    } else if (data.excavatorOperatorId) {
      throw ApiError.badRequest('Excavator operator cannot be set without excavator');
    }

    // Validate operator (required)
    const operator = await prisma.operator.findUnique({ where: { id: data.operatorId } });
    if (!operator || operator.status !== 'ACTIVE') {
      throw ApiError.notFound('Operator not found or not active');
    }

    if (!['SIM_A', 'SIM_B1', 'SIM_B2'].includes(operator.licenseType)) {
      throw ApiError.badRequest('Operator does not have valid truck driving license');
    }

    if (operator.shift && data.shift && operator.shift !== data.shift) {
      throw ApiError.badRequest('Operator shift does not match hauling shift');
    }

    // Validate operator not in active hauling
    const existingActiveHauling = await prisma.haulingActivity.findFirst({
      where: {
        operatorId: data.operatorId,
        status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
      },
    });

    if (existingActiveHauling) {
      throw ApiError.badRequest(
        `Operator is already assigned to active hauling activity: ${existingActiveHauling.activityNumber}`
      );
    }

    // Validate loading and dumping points (required)
    const [loadingPoint, dumpingPoint] = await Promise.all([
      prisma.loadingPoint.findUnique({ where: { id: data.loadingPointId } }),
      prisma.dumpingPoint.findUnique({ where: { id: data.dumpingPointId } }),
    ]);

    if (!loadingPoint || !loadingPoint.isActive) {
      throw ApiError.notFound('Loading point not found or inactive');
    }

    if (!dumpingPoint || !dumpingPoint.isActive) {
      throw ApiError.notFound('Dumping point not found or inactive');
    }

    const activityNumber = await this.generateActivityNumber();

    const activity = await prisma.$transaction(async (tx) => {
      const parsedLoadWeight =
        data.loadWeight === undefined || data.loadWeight === null || data.loadWeight === ''
          ? 0
          : parseFloat(data.loadWeight);
      const parsedTargetWeight =
        data.targetWeight === undefined || data.targetWeight === null || data.targetWeight === ''
          ? 0
          : parseFloat(data.targetWeight);
      const parsedDistance =
        data.distance === undefined || data.distance === null || data.distance === ''
          ? 0
          : parseFloat(data.distance);

      // Build data object with optional excavatorId
      const createData = {
        ...data,
        activityNumber,
        supervisorId,
        loadingStartTime: new Date(),
        status: HAULING_STATUS.LOADING,
        loadWeight: Number.isFinite(parsedLoadWeight) ? parsedLoadWeight : 0,
        targetWeight: Number.isFinite(parsedTargetWeight) ? parsedTargetWeight : 0,
        distance: Number.isFinite(parsedDistance) ? parsedDistance : 0,
      };

      // Handle null excavatorId - set to null if empty string or not provided
      if (!data.excavatorId || data.excavatorId === '') {
        createData.excavatorId = null;
      }

      if (!createData.excavatorId) {
        createData.excavatorOperatorId = null;
      } else if (!data.excavatorOperatorId || data.excavatorOperatorId === '') {
        createData.excavatorOperatorId = null;
      }

      const newActivity = await tx.haulingActivity.create({
        data: createData,
        include: {
          truck: { select: { id: true, code: true, name: true } },
          excavator: { select: { id: true, code: true, name: true } },
          operator: {
            include: {
              user: { select: { id: true, fullName: true } },
            },
          },
          excavatorOperator: {
            include: {
              user: { select: { id: true, fullName: true } },
            },
          },
          loadingPoint: { select: { id: true, code: true, name: true } },
          dumpingPoint: { select: { id: true, code: true, name: true } },
        },
      });

      // Update truck status to LOADING and assign operator
      await tx.truck.update({
        where: { id: data.truckId },
        data: {
          status: TRUCK_STATUS.LOADING,
          currentOperatorId: data.operatorId,
        },
      });

      // Update excavator status to ACTIVE (only if excavator is provided)
      if (data.excavatorId && excavator) {
        await tx.excavator.update({
          where: { id: data.excavatorId },
          data: { status: EXCAVATOR_STATUS.ACTIVE },
        });
      }

      // Update operator-truck relationship
      await tx.operator.update({
        where: { id: data.operatorId },
        data: {
          trucks: {
            connect: { id: data.truckId },
          },
        },
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

    if (activity.status === HAULING_STATUS.COMPLETED) {
      const forbiddenKeys = [
        'truckId',
        'operatorId',
        'excavatorId',
        'excavatorOperatorId',
        'loadingPointId',
        'dumpingPointId',
        'roadSegmentId',
        'shift',
        'supervisorId',
        'activityNumber',
      ];
      const forbiddenAttempt = forbiddenKeys.some((key) => key in data);
      if (forbiddenAttempt) {
        throw ApiError.badRequest('Cannot reassign equipment/route/shift for completed activity.');
      }
    }

    if (data.truckId && data.truckId !== activity.truckId) {
      const truck = await prisma.truck.findUnique({ where: { id: data.truckId } });
      if (!truck || !truck.isActive) {
        throw ApiError.notFound('Truck not found or inactive');
      }

      if (truck.status !== TRUCK_STATUS.IDLE && truck.status !== TRUCK_STATUS.STANDBY) {
        throw ApiError.badRequest(
          `Truck is not available for hauling (current status: ${truck.status}). Only STANDBY or IDLE trucks can be assigned.`
        );
      }

      const existingActiveForTruck = await prisma.haulingActivity.findFirst({
        where: {
          id: { not: id },
          truckId: data.truckId,
          status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
        },
        select: { id: true, activityNumber: true },
      });

      if (existingActiveForTruck) {
        throw ApiError.badRequest(
          `Truck is already assigned to active hauling activity: ${existingActiveForTruck.activityNumber}`
        );
      }
    }

    if (data.excavatorId && data.excavatorId !== activity.excavatorId) {
      const excavator = await prisma.excavator.findUnique({ where: { id: data.excavatorId } });
      if (!excavator || !excavator.isActive) {
        throw ApiError.notFound('Excavator not found or inactive');
      }

      const validExcavatorStatuses = [
        EXCAVATOR_STATUS.IDLE,
        EXCAVATOR_STATUS.STANDBY,
        EXCAVATOR_STATUS.ACTIVE,
      ];
      if (!validExcavatorStatuses.includes(excavator.status)) {
        throw ApiError.badRequest(
          `Excavator is not available (current status: ${excavator.status}). Only IDLE/STANDBY/ACTIVE excavators can be assigned.`
        );
      }
    }

    if (data.excavatorOperatorId && data.excavatorOperatorId !== activity.excavatorOperatorId) {
      const excavatorOperator = await prisma.operator.findUnique({
        where: { id: data.excavatorOperatorId },
        select: { id: true, status: true, licenseType: true, shift: true },
      });

      if (!excavatorOperator || excavatorOperator.status !== 'ACTIVE') {
        throw ApiError.notFound('Excavator operator not found or not active');
      }

      if (excavatorOperator.licenseType !== 'OPERATOR_ALAT_BERAT') {
        throw ApiError.badRequest('Excavator operator does not have valid excavator license');
      }

      const desiredShift = data.shift || activity.shift;
      if (excavatorOperator.shift && desiredShift && excavatorOperator.shift !== desiredShift) {
        throw ApiError.badRequest('Excavator operator shift does not match hauling shift');
      }

      const existingActiveForExcavatorOperator = await prisma.haulingActivity.findFirst({
        where: {
          id: { not: id },
          excavatorOperatorId: data.excavatorOperatorId,
          status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
        },
        select: { id: true, activityNumber: true },
      });

      if (existingActiveForExcavatorOperator) {
        throw ApiError.badRequest(
          `Excavator operator is already assigned to active hauling activity: ${existingActiveForExcavatorOperator.activityNumber}`
        );
      }
    }

    if (data.operatorId && data.operatorId !== activity.operatorId) {
      const operator = await prisma.operator.findUnique({ where: { id: data.operatorId } });
      if (!operator || operator.status !== 'ACTIVE') {
        throw ApiError.notFound('Operator not found or not active');
      }

      if (!['SIM_A', 'SIM_B1', 'SIM_B2'].includes(operator.licenseType)) {
        throw ApiError.badRequest('Operator does not have valid truck driving license');
      }

      const desiredShift = data.shift || activity.shift;
      if (operator.shift && desiredShift && operator.shift !== desiredShift) {
        throw ApiError.badRequest('Operator shift does not match hauling shift');
      }

      const existingActiveForOperator = await prisma.haulingActivity.findFirst({
        where: {
          id: { not: id },
          operatorId: data.operatorId,
          status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
        },
        select: { id: true, activityNumber: true },
      });

      if (existingActiveForOperator) {
        throw ApiError.badRequest(
          `Operator is already assigned to active hauling activity: ${existingActiveForOperator.activityNumber}`
        );
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

    if ('excavatorId' in updateData && (!updateData.excavatorId || updateData.excavatorId === '')) {
      updateData.excavatorId = null;
    }
    if (
      'excavatorOperatorId' in updateData &&
      (!updateData.excavatorOperatorId || updateData.excavatorOperatorId === '')
    ) {
      updateData.excavatorOperatorId = null;
    }

    const nextExcavatorId =
      updateData.excavatorId !== undefined ? updateData.excavatorId : activity.excavatorId;
    const nextExcavatorOperatorId =
      updateData.excavatorOperatorId !== undefined
        ? updateData.excavatorOperatorId
        : activity.excavatorOperatorId;

    const assignmentKeys = [
      'truckId',
      'operatorId',
      'excavatorId',
      'excavatorOperatorId',
      'loadingPointId',
      'dumpingPointId',
      'roadSegmentId',
      'shift',
    ];
    const isAssignmentUpdate = assignmentKeys.some((k) => k in updateData);

    if (!nextExcavatorId) {
      updateData.excavatorOperatorId = null;
    } else if (!nextExcavatorOperatorId && isAssignmentUpdate) {
      throw ApiError.badRequest('Excavator operator is required when excavator is set');
    }

    if (
      updateData.loadWeight !== undefined &&
      updateData.loadWeight !== null &&
      updateData.loadWeight !== ''
    ) {
      const v = parseFloat(updateData.loadWeight);
      if (Number.isFinite(v)) updateData.loadWeight = v;
    }
    if (
      updateData.targetWeight !== undefined &&
      updateData.targetWeight !== null &&
      updateData.targetWeight !== ''
    ) {
      const v = parseFloat(updateData.targetWeight);
      if (Number.isFinite(v)) updateData.targetWeight = v;
    }
    if (
      updateData.distance !== undefined &&
      updateData.distance !== null &&
      updateData.distance !== ''
    ) {
      const v = parseFloat(updateData.distance);
      if (Number.isFinite(v)) updateData.distance = v;
    }
    if (
      updateData.fuelConsumed !== undefined &&
      updateData.fuelConsumed !== null &&
      updateData.fuelConsumed !== ''
    ) {
      const v = parseFloat(updateData.fuelConsumed);
      if (Number.isFinite(v)) updateData.fuelConsumed = v;
    }

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
      const nextTruckId = updateData.truckId || activity.truckId;
      const nextOperatorId = updateData.operatorId || activity.operatorId;
      const nextStatus = updateData.status || activity.status;

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
          excavatorOperator: {
            include: {
              user: { select: { id: true, fullName: true } },
            },
          },
          loadingPoint: { select: { id: true, code: true, name: true } },
          dumpingPoint: { select: { id: true, code: true, name: true } },
          roadSegment: { select: { id: true, code: true, name: true } },
        },
      });

      if (activity.truckId !== nextTruckId) {
        const oldTruckActiveCount = await tx.haulingActivity.count({
          where: {
            id: { not: id },
            truckId: activity.truckId,
            status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
          },
        });

        if (oldTruckActiveCount === 0) {
          await tx.truck.update({
            where: { id: activity.truckId },
            data: { status: TRUCK_STATUS.IDLE, currentOperatorId: null },
          });
        }
      }

      const statusToTruckStatus = {
        [HAULING_STATUS.IN_QUEUE]: TRUCK_STATUS.IN_QUEUE,
        [HAULING_STATUS.LOADING]: TRUCK_STATUS.LOADING,
        [HAULING_STATUS.HAULING]: TRUCK_STATUS.HAULING,
        [HAULING_STATUS.DUMPING]: TRUCK_STATUS.DUMPING,
        [HAULING_STATUS.RETURNING]: TRUCK_STATUS.HAULING,
        [HAULING_STATUS.COMPLETED]: TRUCK_STATUS.IDLE,
        [HAULING_STATUS.CANCELLED]: TRUCK_STATUS.IDLE,
      };

      const desiredTruckStatus = statusToTruckStatus[nextStatus];
      if (desiredTruckStatus) {
        const desiredOperatorId =
          desiredTruckStatus === TRUCK_STATUS.IDLE ? null : nextOperatorId || null;
        await tx.truck.update({
          where: { id: nextTruckId },
          data: {
            status: desiredTruckStatus,
            currentOperatorId: desiredOperatorId,
          },
        });
      }

      if (nextTruckId && nextOperatorId) {
        await tx.operator.update({
          where: { id: nextOperatorId },
          data: { trucks: { connect: { id: nextTruckId } } },
        });
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

      // ===== PERBAIKAN: Reset truck status to STANDBY (siap untuk hauling berikutnya) =====
      await tx.truck.update({
        where: { id: activity.truckId },
        data: {
          status: TRUCK_STATUS.STANDBY, // Changed from IDLE to STANDBY
          totalHours: { increment: Math.round(totalCycleTime / 60) },
          totalDistance: { increment: activity.distance },
          currentOperatorId: null, // Clear operator assignment
        },
      });

      // ===== PERBAIKAN: Check and update excavator status =====
      // Hitung berapa hauling aktif yang menggunakan excavator ini
      const activeHaulingsForExcavator = await tx.haulingActivity.count({
        where: {
          excavatorId: activity.excavatorId,
          status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
          id: { not: id }, // Exclude current hauling being completed
        },
      });

      // Jika tidak ada hauling aktif lain, reset excavator ke STANDBY
      if (activeHaulingsForExcavator === 0) {
        await tx.excavator.update({
          where: { id: activity.excavatorId },
          data: { status: EXCAVATOR_STATUS.STANDBY },
        });
      }

      await tx.excavator.update({
        where: { id: activity.excavatorId },
        data: {
          totalHours: { increment: Math.round((activity.loadingDuration || 0) / 60) },
        },
      });

      return updated;
    });

    return updatedActivity;
  },

  async cancel(id, reason) {
    const activity = await prisma.haulingActivity.findUnique({
      where: { id },
      include: { truck: true, excavator: true },
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

      // Reset truck to STANDBY
      await tx.truck.update({
        where: { id: activity.truckId },
        data: {
          status: TRUCK_STATUS.STANDBY,
          currentOperatorId: null,
        },
      });

      // ===== PERBAIKAN: Check and reset excavator status =====
      const activeHaulingsForExcavator = await tx.haulingActivity.count({
        where: {
          excavatorId: activity.excavatorId,
          status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
          id: { not: id },
        },
      });

      if (activeHaulingsForExcavator === 0) {
        await tx.excavator.update({
          where: { id: activity.excavatorId },
          data: { status: EXCAVATOR_STATUS.STANDBY },
        });
      }

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
        excavatorOperator: {
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
        excavatorOperator: {
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
    haulingActivityIds = [],
    targetProduction
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

    const targetProdNum =
      targetProduction !== undefined && targetProduction !== null
        ? parseFloat(targetProduction)
        : NaN;
    const achievementBase = !Number.isNaN(targetProdNum) && targetProdNum > 0 ? targetProdNum : 0;
    const achievement =
      achievementBase > 0 ? parseFloat(((totalLoadWeight / achievementBase) * 100).toFixed(2)) : 0;

    const completionRate = parseFloat(
      ((completedAndAchieved.length / activities.length) * 100).toFixed(2)
    );

    return {
      achievement: Math.min(achievement, 9999),
      completedCount: completedAndAchieved.length,
      totalCount: activities.length,
      totalLoadWeight: parseFloat(totalLoadWeight.toFixed(2)),
      totalTargetWeight: parseFloat(totalTargetWeight.toFixed(2)),
      loadWeightProgress,
      targetProduction: achievementBase,
      completionRate: Math.min(completionRate, 100),
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
        excavatorOperator: {
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
