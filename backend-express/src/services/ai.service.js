import axios from 'axios';
import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { TRUCK_STATUS, EXCAVATOR_STATUS } from '../config/constants.js';
import { haulingService } from './hauling.service.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '120000'); // 2 minutes

/**
 * Helper: Validate equipment availability (STANDBY only for new hauling)
 */
async function validateEquipmentAvailability(truckIds, excavatorIds) {
  const errors = [];

  // Check trucks - only STANDBY status allowed
  if (truckIds && truckIds.length > 0) {
    const trucks = await prisma.truck.findMany({
      where: { id: { in: truckIds } },
      select: { id: true, code: true, status: true, isActive: true },
    });

    const unavailableTrucks = trucks.filter(
      (t) => !t.isActive || (t.status !== TRUCK_STATUS.STANDBY && t.status !== TRUCK_STATUS.IDLE)
    );

    if (unavailableTrucks.length > 0) {
      errors.push(
        `Truck(s) not available: ${unavailableTrucks
          .map((t) => `${t.code} (status: ${t.status})`)
          .join(', ')}. Only STANDBY/IDLE trucks can be assigned.`
      );
    }

    const notFoundTrucks = truckIds.filter((id) => !trucks.find((t) => t.id === id));
    if (notFoundTrucks.length > 0) {
      errors.push(`Truck ID(s) not found: ${notFoundTrucks.join(', ')}`);
    }
  }

  // Check excavators - only STANDBY/IDLE/ACTIVE status allowed
  if (excavatorIds && excavatorIds.length > 0) {
    const excavators = await prisma.excavator.findMany({
      where: { id: { in: excavatorIds } },
      select: { id: true, code: true, status: true, isActive: true },
    });

    const unavailableExcavators = excavators.filter(
      (e) =>
        !e.isActive ||
        ![EXCAVATOR_STATUS.STANDBY, EXCAVATOR_STATUS.IDLE, EXCAVATOR_STATUS.ACTIVE].includes(
          e.status
        )
    );

    if (unavailableExcavators.length > 0) {
      errors.push(
        `Excavator(s) not available: ${unavailableExcavators
          .map((e) => `${e.code} (status: ${e.status})`)
          .join(', ')}. Only STANDBY/IDLE/ACTIVE excavators can be assigned.`
      );
    }

    const notFoundExcavators = excavatorIds.filter((id) => !excavators.find((e) => e.id === id));
    if (notFoundExcavators.length > 0) {
      errors.push(`Excavator ID(s) not found: ${notFoundExcavators.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Helper: Allocate operators based on competency matching
 * DUMP_TRUCK competency for trucks, EXCAVATOR competency for excavators
 */
async function allocateOperatorsByCompetency(truckIds, excavatorIds, requestedOperatorIds = []) {
  const allocatedOperators = [];
  const usedOperatorIds = new Set();

  // Get available operators
  const availableOperators = await prisma.operator.findMany({
    where: {
      status: 'ACTIVE',
      // Exclude operators already assigned to active hauling
      NOT: {
        id: {
          in: (
            await prisma.haulingActivity.findMany({
              where: { status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] } },
              select: { operatorId: true },
            })
          ).map((h) => h.operatorId),
        },
      },
    },
    select: { id: true, competency: true, rating: true },
    orderBy: { rating: 'desc' },
  });

  // Parse competency and categorize operators
  const truckOperators = [];
  const excavatorOperators = [];
  const generalOperators = [];

  for (const op of availableOperators) {
    let competencyData = {};
    try {
      competencyData =
        typeof op.competency === 'string' ? JSON.parse(op.competency) : op.competency || {};
    } catch {
      competencyData = {};
    }

    const equipmentType = competencyData.equipment_type || competencyData.equipmentType || '';

    if (
      equipmentType.toUpperCase().includes('TRUCK') ||
      equipmentType.toUpperCase().includes('DUMP')
    ) {
      truckOperators.push(op);
    } else if (equipmentType.toUpperCase().includes('EXCAVATOR')) {
      excavatorOperators.push(op);
    } else {
      generalOperators.push(op);
    }
  }

  // Allocate operators for trucks (prefer DUMP_TRUCK competency)
  for (let i = 0; i < truckIds.length; i++) {
    // Check if requested operator is available
    if (requestedOperatorIds[i] && !usedOperatorIds.has(requestedOperatorIds[i])) {
      allocatedOperators.push(requestedOperatorIds[i]);
      usedOperatorIds.add(requestedOperatorIds[i]);
      continue;
    }

    // Find best operator: truck specialists > general > any
    const operator =
      truckOperators.find((op) => !usedOperatorIds.has(op.id)) ||
      generalOperators.find((op) => !usedOperatorIds.has(op.id)) ||
      availableOperators.find((op) => !usedOperatorIds.has(op.id));

    if (operator) {
      allocatedOperators.push(operator.id);
      usedOperatorIds.add(operator.id);
    }
  }

  return allocatedOperators;
}

/**
 * Helper: Update equipment status after hauling creation
 */
async function updateEquipmentStatusForHauling(truckId, excavatorId, operatorId, tx) {
  // Update truck status to LOADING
  await tx.truck.update({
    where: { id: truckId },
    data: {
      status: TRUCK_STATUS.LOADING,
      currentOperatorId: operatorId,
    },
  });

  // Update excavator status to ACTIVE
  await tx.excavator.update({
    where: { id: excavatorId },
    data: { status: EXCAVATOR_STATUS.ACTIVE },
  });

  // Update operator-truck relationship
  await tx.operator.update({
    where: { id: operatorId },
    data: {
      trucks: {
        connect: { id: truckId },
      },
    },
  });
}

class AIService {
  /**
   * Get real-time operational conditions from database
   * Digunakan untuk menyediakan context terkini ke AI service
   */
  async getRealtimeConditions() {
    try {
      const [
        weatherData,
        activeHauling,
        availableTrucks,
        availableExcavators,
        operationalTrucks,
        operationalExcavators,
        activeSchedules,
        recentIncidents,
        todayProduction,
      ] = await Promise.all([
        // Latest weather data
        prisma.weatherLog.findFirst({
          orderBy: { timestamp: 'desc' },
          select: {
            condition: true,
            temperature: true,
            rainfall: true,
            windSpeed: true,
            timestamp: true,
          },
        }),

        // Active hauling count
        prisma.haulingActivity.count({
          where: {
            status: { in: ['LOADING', 'HAULING', 'DUMPING'] },
          },
        }),

        // Available trucks
        prisma.truck.count({
          where: { status: 'IDLE' },
        }),

        // Available excavators
        prisma.excavator.count({
          where: { status: { in: ['IDLE', 'ACTIVE'] } },
        }),

        // All operational trucks
        prisma.truck.findMany({
          where: { status: { in: ['IDLE', 'STANDBY'] } },
          select: {
            id: true,
            code: true,
            capacity: true,
            brand: true,
            status: true,
          },
        }),

        // All operational excavators
        prisma.excavator.findMany({
          where: { status: { in: ['IDLE', 'ACTIVE'] } },
          select: {
            id: true,
            code: true,
            model: true,
            bucketCapacity: true,
            status: true,
          },
        }),

        // Upcoming sailing schedules (next 7 days)
        prisma.sailingSchedule.findMany({
          where: {
            status: 'SCHEDULED',
            etsLoading: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { etsLoading: 'asc' },
          take: 5,
          include: {
            vessel: {
              select: {
                name: true,
                capacity: true,
                vesselType: true,
              },
            },
          },
        }),

        // Recent incidents (last 24 hours)
        prisma.incidentReport.count({
          where: {
            incidentDate: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Today's production
        prisma.productionRecord.aggregate({
          where: {
            recordDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          _sum: {
            actualProduction: true,
          },
        }),
      ]);

      // Get road segments with conditions
      const roadSegments = await prisma.roadSegment.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          distance: true,
          gradient: true,
          roadCondition: true,
        },
      });

      return {
        weather: weatherData || {
          condition: 'Cerah',
          temperature: 30,
          rainfall: 0,
          timestamp: new Date(),
        },
        operational: {
          activeHauling,
          availableTrucks,
          availableExcavators,
          totalTrucks: operationalTrucks.length,
          totalExcavators: operationalExcavators.length,
          recentIncidents,
          todayProduction: todayProduction._sum.actualProduction || 0,
        },
        resources: {
          trucks: operationalTrucks,
          excavators: operationalExcavators,
          roadSegments,
        },
        upcomingSchedules: activeSchedules,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting realtime conditions:', error);
      throw error;
    }
  }

  /**
   * Get strategic recommendations from AI service
   * Mengirim parameter ke FastAPI untuk simulasi hybrid
   */
  async getStrategicRecommendations(params) {
    try {
      logger.info('Requesting strategic recommendations from AI service');

      // Validasi dan enrichment parameters
      const enrichedParams = await this.enrichParameters(params);

      // Call AI service
      const response = await axios.post(`${AI_SERVICE_URL}/get_top_3_strategies`, enrichedParams, {
        timeout: AI_SERVICE_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Save prediction log
      await this.savePredictionLog({
        type: 'STRATEGIC_RECOMMENDATION',
        input: enrichedParams,
        output: response.data,
        executionTime: response.headers['x-execution-time'],
      });

      logger.info('Strategic recommendations received successfully');
      return response.data;
    } catch (error) {
      logger.error('Error getting strategic recommendations:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('AI Service is not available. Please ensure the AI service is running.');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('AI Service request timed out. The simulation may be taking too long.');
      }

      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  /**
   * Get strategic recommendations WITH hauling activity data integration
   * Returns AI strategies combined with matching existing hauling activities
   */
  async getStrategicRecommendationsWithHauling(params) {
    try {
      logger.info('Requesting strategic recommendations WITH hauling integration from AI service');

      // Validasi dan enrichment parameters
      const enrichedParams = await this.enrichParameters(params);

      // Call enhanced AI service endpoint
      const response = await axios.post(
        `${AI_SERVICE_URL}/get_strategies_with_hauling`,
        enrichedParams,
        {
          timeout: AI_SERVICE_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Save prediction log
      await this.savePredictionLog({
        type: 'STRATEGIC_RECOMMENDATION_WITH_HAULING',
        input: enrichedParams,
        output: response.data,
        executionTime: response.headers['x-execution-time'],
      });

      logger.info('Strategic recommendations with hauling received successfully');
      return response.data;
    } catch (error) {
      logger.error('Error getting strategic recommendations with hauling:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('AI Service is not available. Please ensure the AI service is running.');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('AI Service request timed out. The simulation may be taking too long.');
      }

      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  async applyHaulingRecommendation(params) {
    try {
      const {
        action,
        existingHaulingId,
        truckIds,
        excavatorIds,
        operatorIds,
        loadingPointId,
        dumpingPointId,
        roadSegmentId,
        shift,
        loadWeight,
        targetWeight,
        distance,
        supervisorId,
        totalProductionTarget, // New: untuk membagi target ke setiap hauling
      } = params;

      logger.info('Applying hauling recommendation:', {
        action,
        existingHaulingId,
        truckCount: truckIds?.length,
        supervisorId,
      });

      let effectiveSupervisorId = supervisorId;
      if (!effectiveSupervisorId) {
        const adminUser = await prisma.user.findFirst({
          where: {
            OR: [{ role: 'ADMIN' }, { role: 'SUPERVISOR' }],
            isActive: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        if (adminUser) {
          effectiveSupervisorId = adminUser.id;
        } else {
          throw new Error('No supervisor or admin user found. Please provide a supervisorId.');
        }
      }

      if (action === 'update' && existingHaulingId) {
        const existingActivity = await prisma.haulingActivity.findUnique({
          where: { id: existingHaulingId },
        });

        if (!existingActivity) {
          throw new Error(`Hauling activity with ID ${existingHaulingId} not found`);
        }

        const primaryTruckId =
          truckIds && truckIds.length > 0 ? truckIds[0] : existingActivity.truckId;
        const primaryExcavatorId =
          excavatorIds && excavatorIds.length > 0 ? excavatorIds[0] : existingActivity.excavatorId;
        const primaryOperatorId =
          operatorIds && operatorIds.length > 0 ? operatorIds[0] : existingActivity.operatorId;

        const updateData = {
          truckId: primaryTruckId,
          excavatorId: primaryExcavatorId,
          operatorId: primaryOperatorId,
          loadingPointId: loadingPointId || existingActivity.loadingPointId,
          dumpingPointId: dumpingPointId || existingActivity.dumpingPointId,
          roadSegmentId: roadSegmentId || existingActivity.roadSegmentId,
          shift: shift || existingActivity.shift,
          ...(loadWeight !== undefined ? { loadWeight: parseFloat(loadWeight) } : {}),
          ...(targetWeight !== undefined ? { targetWeight: parseFloat(targetWeight) } : {}),
          ...(distance !== undefined ? { distance: parseFloat(distance) } : {}),
          remarks: 'Updated by AI Recommendation',
        };

        if (existingActivity.status === 'COMPLETED') {
          delete updateData.truckId;
          delete updateData.excavatorId;
          delete updateData.operatorId;
          delete updateData.loadingPointId;
          delete updateData.dumpingPointId;
          delete updateData.roadSegmentId;
          delete updateData.shift;
        }

        const updated = await haulingService.update(existingHaulingId, updateData);

        return {
          action: 'update',
          updatedActivity: updated,
          multiEquipment: {
            truckIds,
            excavatorIds,
            operatorIds,
          },
        };
      } else {
        if (!truckIds || truckIds.length === 0) {
          throw new Error('At least one truck ID is required');
        }
        if (!excavatorIds || excavatorIds.length === 0) {
          throw new Error('At least one excavator ID is required');
        }

        // ===== VALIDASI STATUS EQUIPMENT: Hanya STANDBY/IDLE yang bisa dipilih =====
        const equipmentErrors = await validateEquipmentAvailability(truckIds, excavatorIds);
        if (equipmentErrors.length > 0) {
          throw new Error(`Equipment validation failed: ${equipmentErrors.join('; ')}`);
        }

        // ===== ALOKASI OPERATOR BERDASARKAN COMPETENCY =====
        let effectiveOperatorIds = await allocateOperatorsByCompetency(
          truckIds,
          excavatorIds,
          operatorIds || []
        );

        if (effectiveOperatorIds.length < truckIds.length) {
          // Fallback: use any available operators
          const additionalOperators = await prisma.operator.findMany({
            where: {
              status: 'ACTIVE',
              NOT: { id: { in: effectiveOperatorIds } },
            },
            take: truckIds.length - effectiveOperatorIds.length,
            orderBy: { rating: 'desc' },
            select: { id: true },
          });
          effectiveOperatorIds = [
            ...effectiveOperatorIds,
            ...additionalOperators.map((op) => op.id),
          ];
        }

        if (effectiveOperatorIds.length === 0) {
          throw new Error('No available operators found in database');
        }

        let effectiveLoadingPointId = loadingPointId;
        let effectiveDumpingPointId = dumpingPointId;

        if (!effectiveLoadingPointId) {
          const defaultLoadingPoint = await prisma.loadingPoint.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          });
          if (defaultLoadingPoint) {
            effectiveLoadingPointId = defaultLoadingPoint.id;
          } else {
            throw new Error('No active loading point found');
          }
        }

        if (!effectiveDumpingPointId) {
          const defaultDumpingPoint = await prisma.dumpingPoint.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          });
          if (defaultDumpingPoint) {
            effectiveDumpingPointId = defaultDumpingPoint.id;
          } else {
            throw new Error('No active dumping point found');
          }
        }

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastActivity = await prisma.haulingActivity.findFirst({
          where: { activityNumber: { startsWith: `HA-${dateStr}` } },
          orderBy: { activityNumber: 'desc' },
        });

        let sequence = 1;
        if (lastActivity) {
          const parts = lastActivity.activityNumber.split('-');
          const lastSequence = parseInt(parts[parts.length - 1]);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }

        // Fetch truck and excavator data with fuel consumption for accurate calculation
        const trucksData = await prisma.truck.findMany({
          where: { id: { in: truckIds } },
          select: {
            id: true,
            code: true,
            name: true,
            fuelConsumption: true,
            capacity: true,
            averageSpeed: true,
          },
        });

        const excavatorsData = await prisma.excavator.findMany({
          where: { id: { in: excavatorIds } },
          select: {
            id: true,
            code: true,
            name: true,
            fuelConsumption: true,
            productionRate: true,
          },
        });

        // Create a map for quick lookup
        const truckMap = new Map(trucksData.map((t) => [t.id, t]));
        const excavatorMap = new Map(excavatorsData.map((e) => [e.id, e]));

        // Calculate target weight per hauling (divided evenly from totalProductionTarget)
        const numHaulingActivities = truckIds.length;
        const targetWeightPerHauling = totalProductionTarget
          ? parseFloat(totalProductionTarget) / numHaulingActivities
          : parseFloat(targetWeight) || 30;

        const createdActivities = [];
        let totalCalculatedFuel = 0;

        const activeExcavatorOperatorRows = await prisma.haulingActivity.findMany({
          where: {
            status: { in: ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'] },
            excavatorOperatorId: { not: null },
          },
          select: { excavatorOperatorId: true },
        });
        const assignedActiveExcavatorOperatorIds = new Set(
          activeExcavatorOperatorRows
            .map((h) => h.excavatorOperatorId)
            .filter((v) => typeof v === 'string' && v.length > 0)
        );
        const excavatorOperators = await prisma.operator.findMany({
          where: {
            status: 'ACTIVE',
            licenseType: 'OPERATOR_ALAT_BERAT',
          },
          select: { id: true, rating: true, shift: true },
          orderBy: { rating: 'desc' },
        });
        const effectiveExcavatorOperators = excavatorOperators.filter((op) => {
          if (assignedActiveExcavatorOperatorIds.has(op.id)) return false;
          if (shift && op.shift && op.shift !== shift) return false;
          return true;
        });
        const usedExcavatorOperatorIds = new Set();
        let excavatorOperatorPickIndex = 0;

        // ===== USE TRANSACTION TO CREATE HAULING AND UPDATE EQUIPMENT STATUS =====
        const results = await prisma.$transaction(async (tx) => {
          const activities = [];

          for (let i = 0; i < truckIds.length; i++) {
            const truckId = truckIds[i];
            const excavatorId = excavatorIds[i % excavatorIds.length];
            const operatorId = effectiveOperatorIds[i % effectiveOperatorIds.length];

            let excavatorOperatorId = null;
            if (excavatorId && effectiveExcavatorOperators.length > 0) {
              const next =
                effectiveExcavatorOperators.find((op) => !usedExcavatorOperatorIds.has(op.id)) ||
                effectiveExcavatorOperators[
                  excavatorOperatorPickIndex % effectiveExcavatorOperators.length
                ];
              excavatorOperatorId = next?.id || null;
              if (excavatorOperatorId) usedExcavatorOperatorIds.add(excavatorOperatorId);
              excavatorOperatorPickIndex += 1;
            }

            const assignedExcavatorId = excavatorId && excavatorOperatorId ? excavatorId : null;

            const activityNumber = `HA-${dateStr}-${(sequence + i).toString().padStart(3, '0')}`;

            // Get actual fuel consumption from equipment data
            const truckData = truckMap.get(truckId);
            const excavatorData = assignedExcavatorId
              ? excavatorMap.get(assignedExcavatorId)
              : null;

            // Truck fuel consumption (L/km) - use actual data or default
            const truckFuelConsumptionPerKm = truckData?.fuelConsumption || 1.0;

            // Excavator fuel consumption (L/hr) - use actual data or default
            const excavatorFuelConsumptionPerHr = assignedExcavatorId
              ? excavatorData?.fuelConsumption || 50
              : 0;

            // Calculate estimated loading time (hours) based on excavator production rate
            const excavatorProductionRate = assignedExcavatorId
              ? excavatorData?.productionRate || 5
              : 0;
            const estimatedLoadingTimeHours =
              assignedExcavatorId && excavatorProductionRate > 0
                ? targetWeightPerHauling / excavatorProductionRate / 60
                : 0;

            // Calculate fuel consumed
            // Truck: distance * fuel rate (round trip = distance * 2)
            const actualDistance = parseFloat(distance) || 3;
            const truckFuel = actualDistance * 2 * truckFuelConsumptionPerKm;

            // Excavator: loading time * fuel rate per hour
            const excavatorFuel = estimatedLoadingTimeHours * excavatorFuelConsumptionPerHr;

            // Total fuel consumed for this hauling activity
            const fuelConsumed = parseFloat((truckFuel + excavatorFuel).toFixed(2));
            totalCalculatedFuel += fuelConsumed;

            const activityData = {
              activityNumber,
              truckId,
              excavatorId: assignedExcavatorId,
              operatorId,
              excavatorOperatorId: assignedExcavatorId ? excavatorOperatorId : null,
              supervisorId: effectiveSupervisorId,
              loadingPointId: effectiveLoadingPointId,
              dumpingPointId: effectiveDumpingPointId,
              shift: shift || 'SHIFT_1',
              loadingStartTime: new Date(),
              loadWeight: 0,
              targetWeight: parseFloat(targetWeightPerHauling.toFixed(2)),
              distance: actualDistance,
              fuelConsumed: fuelConsumed,
              status: 'LOADING',
              remarks: `Created by AI Recommendation | Truck Fuel: ${truckFuelConsumptionPerKm} L/km | Excavator Fuel: ${excavatorFuelConsumptionPerHr} L/hr`,
            };

            if (roadSegmentId) {
              activityData.roadSegmentId = roadSegmentId;
            }

            // Create hauling activity
            const activity = await tx.haulingActivity.create({
              data: activityData,
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
                operator: { include: { user: { select: { fullName: true } } } },
                excavatorOperator: { include: { user: { select: { fullName: true } } } },
              },
            });

            // ===== UPDATE EQUIPMENT STATUS WITHIN TRANSACTION =====
            // Update truck status to LOADING
            await tx.truck.update({
              where: { id: truckId },
              data: {
                status: TRUCK_STATUS.LOADING,
                currentOperatorId: operatorId,
              },
            });

            // Update excavator status to ACTIVE (if not already)
            if (assignedExcavatorId) {
              await tx.excavator.update({
                where: { id: assignedExcavatorId },
                data: { status: EXCAVATOR_STATUS.ACTIVE },
              });
            }

            activities.push(activity);
          }

          return activities;
        });

        createdActivities.push(...results);

        return {
          action: 'create',
          createdCount: createdActivities.length,
          createdActivities,
          totalCalculatedFuel, // Return total fuel for use in frontend
          targetWeightPerHauling, // Return divided target weight
          multiEquipment: {
            truckIds,
            excavatorIds,
            operatorIds: effectiveOperatorIds,
          },
        };
      }
    } catch (error) {
      logger.error('Error applying hauling recommendation:', error);
      throw error;
    }
  }

  /**
   * Analyze existing hauling activities for production aggregation
   * Returns aggregated metrics and activity IDs for production creation
   */
  async analyzeHaulingActivities(conditions) {
    try {
      logger.info('Requesting hauling activity analysis from AI service');

      // Call AI service analyze endpoint
      const response = await axios.post(
        `${AI_SERVICE_URL}/analyze_hauling_activities`,
        conditions,
        {
          timeout: AI_SERVICE_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Save prediction log
      await this.savePredictionLog({
        type: 'HAULING_ANALYSIS',
        input: conditions,
        output: response.data,
        executionTime: response.headers['x-execution-time'],
      });

      logger.info('Hauling analysis received successfully');
      return response.data;
    } catch (error) {
      logger.error('Error analyzing hauling activities:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('AI Service is not available. Please ensure the AI service is running.');
      }

      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  /**
   * Enrich parameters with real-time data from database
   */
  async enrichParameters(params) {
    const enriched = { ...params };

    // Validate IDs and get real data
    if (params.fixed_conditions) {
      const { target_road_id, target_excavator_id, target_schedule_id } = params.fixed_conditions;

      // Validate road exists
      if (target_road_id) {
        const road = await prisma.roadSegment.findUnique({
          where: { id: target_road_id },
        });
        if (!road) {
          throw new Error(`Road segment with ID ${target_road_id} not found`);
        }
      }

      // Validate excavator exists
      if (target_excavator_id) {
        const excavator = await prisma.excavator.findUnique({
          where: { id: target_excavator_id },
        });
        if (!excavator) {
          throw new Error(`Excavator with ID ${target_excavator_id} not found`);
        }
      }

      // Validate schedule exists
      if (target_schedule_id) {
        const schedule = await prisma.sailingSchedule.findUnique({
          where: { id: target_schedule_id },
        });
        if (!schedule) {
          throw new Error(`Sailing schedule with ID ${target_schedule_id} not found`);
        }
      }

      // Auto-fill simulation start date if not provided
      if (!params.fixed_conditions.simulation_start_date) {
        enriched.fixed_conditions.simulation_start_date = new Date().toISOString();
      }
    }

    return enriched;
  }

  /**
   * Ask chatbot with context
   * Mengirim pertanyaan ke Ollama LLM service
   * Mendukung conversation history untuk pertanyaan berkelanjutan
   */
  async askChatbot(
    question,
    context = [],
    userId = null,
    sessionId = null,
    conversationHistory = []
  ) {
    try {
      logger.info('Sending question to chatbot:', question);

      const startTime = Date.now();

      let strategiesContext = [];
      if (Array.isArray(context)) {
        strategiesContext = context;
      } else if (context && typeof context === 'object') {
        strategiesContext = [];
      }

      // Generate session ID if not provided
      const chatSessionId =
        sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await axios.post(
        `${AI_SERVICE_URL}/ask_chatbot`,
        {
          pertanyaan_user: question,
          top_3_strategies_context: strategiesContext,
          session_id: chatSessionId,
          conversation_history: conversationHistory,
        },
        {
          timeout: 180000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const responseTime = Date.now() - startTime;

      await this.saveChatbotInteraction({
        userId,
        question,
        answer: response.data,
        context,
        responseTime,
        sessionId: chatSessionId,
      });

      logger.info('Chatbot response received');

      // Include session_id in response for frontend to track
      return {
        ...response.data,
        session_id: chatSessionId,
      };
    } catch (error) {
      logger.error('Error asking chatbot:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Chatbot service is not available. Please ensure Ollama is running.');
      }

      throw new Error(`Chatbot Error: ${error.message}`);
    }
  }

  /**
   * Save prediction log to database
   */
  async savePredictionLog(data) {
    try {
      const { type, input, output, executionTime } = data;

      return await prisma.predictionLog.create({
        data: {
          predictionType: type,
          inputParameters: input,
          results: output,
          executionTime: executionTime ? parseInt(executionTime) : null,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error saving prediction log:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Save chatbot interaction to database
   */
  async saveChatbotInteraction(data) {
    try {
      const { userId, question, answer, context, responseTime, sessionId } = data;

      // Use provided sessionId or generate a new one
      const chatSessionId =
        sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return await prisma.chatbotInteraction.create({
        data: {
          userId,
          sessionId: chatSessionId,
          userQuestion: question,
          aiResponse: JSON.stringify(answer),
          context: context || null,
          responseTime,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error saving chatbot interaction:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Save recommendation log when user selects a strategy
   */
  async saveRecommendationLog(data) {
    try {
      const {
        recommendationType = 'STRATEGIC',
        scenario,
        recommendations,
        selectedStrategy,
        implementedBy,
      } = data;

      return await prisma.recommendationLog.create({
        data: {
          recommendationType,
          scenario,
          recommendations,
          selectedStrategy,
          implementedBy,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error saving recommendation log:', error);
      throw error;
    }
  }

  /**
   * Update recommendation log with actual results
   */
  async updateRecommendationResults(logId, results) {
    try {
      const { profitActual, variance, feedback } = results;

      // Get the log to calculate variance
      const log = await prisma.recommendationLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        throw new Error('Recommendation log not found');
      }

      // Extract predicted profit from the selected strategy
      const recommendations = log.recommendations;
      const selectedRec = recommendations[log.selectedStrategy];
      const profitPredicted = selectedRec?.profit_bersih || 0;

      return await prisma.recommendationLog.update({
        where: { id: logId },
        data: {
          implementedAt: new Date(),
          results: results,
          profitActual,
          profitPredicted,
          variance: profitActual - profitPredicted,
          feedback,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error updating recommendation results:', error);
      throw error;
    }
  }

  /**
   * Export hauling data for ML training
   * Query kompleks untuk mendapatkan semua fitur yang dibutuhkan
   */
  async exportDataForTraining(limit = 10000) {
    try {
      logger.info('Exporting data for ML training...');

      const haulingData = await prisma.$queryRaw`
        SELECT 
          ha.id,
          ha."startTime",
          ha."endTime",
          ha.status,
          ha."loadWeight",
          ha."fuelConsumed",
          ha."cycleTime",
          ha.shift,
          
          -- Truck data
          t.id as "truckId",
          t.code as "truckCode",
          t.brand,
          t.capacity,
          t."purchaseDate" as "truckPurchaseDate",
          
          -- Excavator data
          e.id as "excavatorId",
          e.code as "excavatorCode",
          e.model as "excavatorModel",
          e."bucketCapacity",
          
          -- Operator data
          o.id as "operatorId",
          o."employeeNumber",
          o.rating,
          o.competency,
          
          -- Road segment data
          rs.id as "roadSegmentId",
          rs.code as "roadCode",
          rs.distance,
          rs.gradient,
          rs."roadCondition",
          
          -- Weather data (join by date)
          w.condition as "weatherCondition",
          w.temperature,
          w.rainfall,
          
          -- Delay information
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM delay_reasons dr 
              WHERE dr."haulingActivityId" = ha.id
            ) THEN true 
            ELSE false 
          END as "isDelayed"
          
        FROM hauling_activities ha
        LEFT JOIN trucks t ON ha."truckId" = t.id
        LEFT JOIN excavators e ON ha."excavatorId" = e.id
        LEFT JOIN operators o ON ha."operatorId" = o.id
        LEFT JOIN road_segments rs ON ha."roadSegmentId" = rs.id
        LEFT JOIN LATERAL (
          SELECT condition, temperature, rainfall
          FROM weather_logs
          WHERE DATE(timestamp) = DATE(ha."startTime")
          ORDER BY timestamp DESC
          LIMIT 1
        ) w ON true
        WHERE ha.status = 'COMPLETED'
          AND ha."endTime" IS NOT NULL
          AND ha."loadWeight" IS NOT NULL
          AND ha."fuelConsumed" IS NOT NULL
        ORDER BY ha."startTime" DESC
        LIMIT ${limit}
      `;

      logger.info(`Exported ${haulingData.length} records for training`);
      return haulingData;
    } catch (error) {
      logger.error('Error exporting training data:', error);
      throw error;
    }
  }

  /**
   * Get prediction history
   */
  async getPredictionHistory(filters = {}) {
    try {
      const { limit = 10, type, startDate, endDate } = filters;

      const where = {};
      if (type) where.predictionType = type;
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      return await prisma.predictionLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
      });
    } catch (error) {
      logger.error('Error getting prediction history:', error);
      throw error;
    }
  }

  /**
   * Get chatbot interaction history
   */
  async getChatbotHistory(filters = {}) {
    try {
      const { limit = 50, userId, sessionId } = filters;

      const where = {};
      if (userId) where.userId = userId;
      if (sessionId) where.sessionId = sessionId;

      return await prisma.chatbotInteraction.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        include: {
          user: {
            select: {
              username: true,
              fullName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error getting chatbot history:', error);
      throw error;
    }
  }

  /**
   * Get recommendation analytics
   * Statistik performa rekomendasi yang sudah diimplementasikan
   */
  async getRecommendationAnalytics() {
    try {
      const [totalRecommendations, implementedRecommendations, avgVariance, successRate] =
        await Promise.all([
          prisma.recommendationLog.count(),

          prisma.recommendationLog.count({
            where: { implementedAt: { not: null } },
          }),

          prisma.recommendationLog.aggregate({
            where: {
              implementedAt: { not: null },
              variance: { not: null },
            },
            _avg: { variance: true },
          }),

          prisma.recommendationLog.count({
            where: {
              implementedAt: { not: null },
              variance: { gte: 0 }, // Positive variance = actual > predicted (good)
            },
          }),
        ]);

      const implementationRate =
        totalRecommendations > 0 ? (implementedRecommendations / totalRecommendations) * 100 : 0;

      const successPercentage =
        implementedRecommendations > 0 ? (successRate / implementedRecommendations) * 100 : 0;

      return {
        total: totalRecommendations,
        implemented: implementedRecommendations,
        implementationRate: implementationRate.toFixed(2),
        averageVariance: avgVariance._avg.variance || 0,
        successRate: successPercentage.toFixed(2),
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting recommendation analytics:', error);
      throw error;
    }
  }

  /**
   * Check AI service health
   */
  async checkAIServiceHealth() {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/`, {
        timeout: 5000,
      });
      return {
        status: 'online',
        service: response.data.service || 'AI Service',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'offline',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}

export default new AIService();
