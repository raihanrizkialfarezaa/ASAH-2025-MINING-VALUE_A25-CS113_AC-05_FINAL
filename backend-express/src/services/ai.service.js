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
          where: { status: 'AVAILABLE' },
        }),

        // Available excavators
        prisma.excavator.count({
          where: { status: 'OPERATIONAL' },
        }),

        // All operational trucks
        prisma.truck.findMany({
          where: { status: { in: ['AVAILABLE', 'ASSIGNED'] } },
          select: {
            id: true,
            code: true,
            capacity: true,
            brand: true,
            fuelLevel: true,
            status: true,
          },
        }),

        // All operational excavators
        prisma.excavator.findMany({
          where: { status: 'OPERATIONAL' },
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
                type: true,
              },
            },
          },
        }),

        // Recent incidents (last 24 hours)
        prisma.incidentReport.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Today's production
        prisma.productionRecord.aggregate({
          where: {
            productionDate: {
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

      const response = await axios.post(
        `${AI_SERVICE_URL}/ask_chatbot`,
        {
          pertanyaan_user: question,
          top_3_strategies_context: context,
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
