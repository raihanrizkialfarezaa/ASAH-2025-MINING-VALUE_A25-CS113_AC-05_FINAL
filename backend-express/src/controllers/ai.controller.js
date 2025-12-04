import aiService from '../services/ai.service.js';
import logger from '../config/logger.js';

class AIController {
  /**
   * GET /api/ai/health
   * Check AI service health status
   */
  async checkHealth(req, res) {
    try {
      const health = await aiService.checkAIServiceHealth();
      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Error checking AI service health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check AI service health',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/ai/realtime-conditions
   * Get real-time operational conditions
   */
  async getRealtimeConditions(req, res) {
    try {
      const conditions = await aiService.getRealtimeConditions();
      res.json({
        success: true,
        data: conditions,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error getting realtime conditions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get realtime conditions',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/ai/recommendations
   * Get strategic recommendations from AI
   */
  async getRecommendations(req, res) {
    try {
      const {
        weatherCondition,
        roadCondition,
        shift,
        targetRoadId,
        targetExcavatorId,
        targetScheduleId,
        minTrucks,
        maxTrucks,
        minExcavators,
        maxExcavators,
        financialParams,
        totalProductionTarget,
      } = req.body;

      const aiParams = {
        fixed_conditions: {
          weatherCondition: weatherCondition || 'Cerah',
          roadCondition: roadCondition || 'GOOD',
          shift: shift || 'SHIFT_1',
          target_road_id: targetRoadId || null,
          target_excavator_id: targetExcavatorId || null,
          target_schedule_id: targetScheduleId || null,
          simulation_start_date: new Date().toISOString(),
          totalProductionTarget: totalProductionTarget || 0,
        },
        decision_variables: {
          min_trucks: minTrucks || 5,
          max_trucks: maxTrucks || 15,
          min_excavators: minExcavators || 1,
          max_excavators: maxExcavators || 3,
        },
      };

      if (financialParams) {
        aiParams.financial_params = financialParams;
      }

      logger.info('Requesting AI recommendations with params:', aiParams);

      const recommendations = await aiService.getStrategicRecommendations(aiParams);

      res.json({
        success: true,
        data: recommendations,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error getting AI recommendations:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * POST /api/ai/recommendations-with-hauling
   * Get strategic recommendations WITH hauling activity data integration
   * This enables production creation from REAL hauling data
   */
  async getRecommendationsWithHauling(req, res) {
    try {
      const {
        weatherCondition,
        roadCondition,
        shift,
        targetRoadId,
        targetExcavatorId,
        targetScheduleId,
        minTrucks,
        maxTrucks,
        minExcavators,
        maxExcavators,
        financialParams,
        totalProductionTarget,
        miningSiteId,
        simulationDate,
      } = req.body;

      const aiParams = {
        fixed_conditions: {
          weatherCondition: weatherCondition || 'Cerah',
          roadCondition: roadCondition || 'GOOD',
          shift: shift || 'SHIFT_1',
          target_road_id: targetRoadId || null,
          target_excavator_id: targetExcavatorId || null,
          target_schedule_id: targetScheduleId || null,
          simulation_start_date: simulationDate || new Date().toISOString(),
          totalProductionTarget: totalProductionTarget || 0,
          miningSiteId: miningSiteId || null,
        },
        decision_variables: {
          min_trucks: minTrucks || 5,
          max_trucks: maxTrucks || 15,
          min_excavators: minExcavators || 1,
          max_excavators: maxExcavators || 3,
        },
      };

      if (financialParams) {
        aiParams.financial_params = financialParams;
      }

      logger.info('Requesting AI recommendations WITH hauling integration:', aiParams);

      const recommendations = await aiService.getStrategicRecommendationsWithHauling(aiParams);

      res.json({
        success: true,
        data: recommendations,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error getting AI recommendations with hauling:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * POST /api/ai/analyze-hauling
   * Analyze existing hauling activities for production aggregation
   */
  async analyzeHaulingActivities(req, res) {
    try {
      const { weatherCondition, roadCondition, shift, simulationDate, miningSiteId } = req.body;

      const conditions = {
        weatherCondition: weatherCondition || 'Cerah',
        roadCondition: roadCondition || 'GOOD',
        shift: shift || 'SHIFT_1',
        simulation_start_date: simulationDate || new Date().toISOString(),
        miningSiteId: miningSiteId || null,
      };

      logger.info('Analyzing hauling activities with conditions:', conditions);

      const analysis = await aiService.analyzeHaulingActivities(conditions);

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error analyzing hauling activities:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  async applyHaulingRecommendation(req, res) {
    try {
      const {
        action,
        existingHaulingId,
        recommendation,
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
      } = req.body;

      const userId = req.user?.id;

      logger.info('Applying hauling recommendation:', {
        action,
        existingHaulingId,
        truckCount: truckIds?.length,
      });

      const result = await aiService.applyHaulingRecommendation({
        action,
        existingHaulingId,
        recommendation,
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
        supervisorId: userId,
      });

      res.json({
        success: true,
        data: result,
        message:
          action === 'update'
            ? 'Hauling activity updated successfully'
            : 'Hauling activities created successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error applying hauling recommendation:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * POST /api/ai/chatbot
   * Ask chatbot a question
   */
  async chatbot(req, res) {
    try {
      const { question, context } = req.body;

      if (!question || question.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Question is required',
        });
      }

      const userId = req.user?.id || null;

      logger.info('Chatbot question from user:', userId, question);

      const response = await aiService.askChatbot(question, context || [], userId);

      res.json({
        success: true,
        data: response,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error in chatbot interaction:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * POST /api/ai/recommendations/save
   * Save selected recommendation
   */
  async saveRecommendation(req, res) {
    try {
      const { scenario, recommendations, selectedStrategy } = req.body;

      if (selectedStrategy === undefined || selectedStrategy === null) {
        return res.status(400).json({
          success: false,
          message: 'selectedStrategy is required',
        });
      }

      const userId = req.user?.id || null;

      const log = await aiService.saveRecommendationLog({
        recommendationType: 'STRATEGIC',
        scenario,
        recommendations,
        selectedStrategy: parseInt(selectedStrategy),
        implementedBy: userId,
      });

      logger.info('Recommendation saved:', log.id);

      res.json({
        success: true,
        data: log,
        message: 'Recommendation saved successfully',
      });
    } catch (error) {
      logger.error('Error saving recommendation:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/ai/recommendations/:id/results
   * Update recommendation with actual results
   */
  async updateRecommendationResults(req, res) {
    try {
      const { id } = req.params;
      const { profitActual, feedback } = req.body;

      if (profitActual === undefined) {
        return res.status(400).json({
          success: false,
          message: 'profitActual is required',
        });
      }

      const updated = await aiService.updateRecommendationResults(id, {
        profitActual: parseFloat(profitActual),
        feedback,
      });

      logger.info('Recommendation results updated:', id);

      res.json({
        success: true,
        data: updated,
        message: 'Results updated successfully',
      });
    } catch (error) {
      logger.error('Error updating recommendation results:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/ai/predictions/history
   * Get prediction history
   */
  async getPredictionHistory(req, res) {
    try {
      const { limit, type, startDate, endDate } = req.query;

      const predictions = await aiService.getPredictionHistory({
        limit: limit ? parseInt(limit) : 10,
        type,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        count: predictions.length,
        data: predictions,
      });
    } catch (error) {
      logger.error('Error getting prediction history:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/ai/chatbot/history
   * Get chatbot interaction history
   */
  async getChatbotHistory(req, res) {
    try {
      const { limit, sessionId } = req.query;
      const userId = req.user?.id;

      const history = await aiService.getChatbotHistory({
        limit: limit ? parseInt(limit) : 50,
        userId,
        sessionId,
      });

      res.json({
        success: true,
        count: history.length,
        data: history,
      });
    } catch (error) {
      logger.error('Error getting chatbot history:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/ai/analytics
   * Get recommendation analytics
   */
  async getAnalytics(req, res) {
    try {
      const analytics = await aiService.getRecommendationAnalytics();

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting analytics:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/ai/export-training-data
   * Export data for ML training (Admin only)
   */
  async exportTrainingData(req, res) {
    try {
      const { limit } = req.body;

      logger.info('Exporting training data...');

      const data = await aiService.exportDataForTraining(limit ? parseInt(limit) : 10000);

      res.json({
        success: true,
        count: data.length,
        data: data,
        message: 'Training data exported successfully',
      });
    } catch (error) {
      logger.error('Error exporting training data:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new AIController();
