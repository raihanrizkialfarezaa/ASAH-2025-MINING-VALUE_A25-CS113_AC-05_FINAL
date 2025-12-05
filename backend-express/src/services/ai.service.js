import axios from 'axios';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '120000'); // 2 minutes

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

        const updated = await prisma.haulingActivity.update({
          where: { id: existingHaulingId },
          data: {
            truckId: primaryTruckId,
            excavatorId: primaryExcavatorId,
            operatorId: primaryOperatorId,
            loadingPointId: loadingPointId || existingActivity.loadingPointId,
            dumpingPointId: dumpingPointId || existingActivity.dumpingPointId,
            roadSegmentId: roadSegmentId || existingActivity.roadSegmentId,
            shift: shift || existingActivity.shift,
            loadWeight:
              loadWeight !== undefined ? parseFloat(loadWeight) : existingActivity.loadWeight,
            targetWeight:
              targetWeight !== undefined ? parseFloat(targetWeight) : existingActivity.targetWeight,
            distance: distance !== undefined ? parseFloat(distance) : existingActivity.distance,
            remarks: `Updated by AI Recommendation`,
          },
          include: {
            truck: { select: { id: true, code: true, name: true } },
            excavator: { select: { id: true, code: true, name: true } },
            operator: { include: { user: { select: { fullName: true } } } },
          },
        });

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

        let effectiveOperatorIds = operatorIds;
        if (!effectiveOperatorIds || effectiveOperatorIds.length === 0) {
          const availableOperators = await prisma.operator.findMany({
            where: {
              status: 'ACTIVE',
            },
            take: Math.max(truckIds.length, 10),
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          if (availableOperators.length === 0) {
            throw new Error('No available operators found in database');
          }
          effectiveOperatorIds = availableOperators.map((op) => op.id);
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

        for (let i = 0; i < truckIds.length; i++) {
          const truckId = truckIds[i];
          const excavatorId = excavatorIds[i % excavatorIds.length];
          const operatorId = effectiveOperatorIds[i % effectiveOperatorIds.length];

          const activityNumber = `HA-${dateStr}-${(sequence + i).toString().padStart(3, '0')}`;

          // Get actual fuel consumption from equipment data
          const truckData = truckMap.get(truckId);
          const excavatorData = excavatorMap.get(excavatorId);

          // Truck fuel consumption (L/km) - use actual data or default
          const truckFuelConsumptionPerKm = truckData?.fuelConsumption || 1.0;

          // Excavator fuel consumption (L/hr) - use actual data or default
          const excavatorFuelConsumptionPerHr = excavatorData?.fuelConsumption || 50;

          // Calculate estimated loading time (hours) based on excavator production rate
          const excavatorProductionRate = excavatorData?.productionRate || 5; // ton/min
          const estimatedLoadingTimeHours = targetWeightPerHauling / excavatorProductionRate / 60;

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
            excavatorId,
            operatorId,
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

          const activity = await prisma.haulingActivity.create({
            data: activityData,
            include: {
              truck: {
                select: { id: true, code: true, name: true, fuelConsumption: true, capacity: true },
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
            },
          });

          createdActivities.push(activity);
        }

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
   */
  async askChatbot(question, context = [], userId = null) {
    try {
      logger.info('Sending question to chatbot:', question);

      const startTime = Date.now();

      let strategiesContext = [];
      if (Array.isArray(context)) {
        strategiesContext = context;
      } else if (context && typeof context === 'object') {
        strategiesContext = [];
      }

      const response = await axios.post(
        `${AI_SERVICE_URL}/ask_chatbot`,
        {
          pertanyaan_user: question,
          top_3_strategies_context: strategiesContext,
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
      });

      logger.info('Chatbot response received');
      return response.data;
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
      const { userId, question, answer, context, responseTime } = data;

      // Generate session ID (could be enhanced with actual session tracking)
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return await prisma.chatbotInteraction.create({
        data: {
          userId,
          sessionId,
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
