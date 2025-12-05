import api from '../config/api';

/**
 * AI Service - Frontend integration dengan Backend AI endpoints
 */
class AIService {
  /**
   * Check AI service health
   */
  async checkHealth() {
    try {
      const response = await api.get('/ai/health');
      return response.data;
    } catch (error) {
      console.error('AI health check failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await api.get('/ai/health');
      const data = response.data;
      const isOnline = data?.success === true || data?.status === 'healthy' || data?.status === 'online' || data?.data?.status === 'online' || data?.data?.status === 'healthy';
      return { success: isOnline };
    } catch (error) {
      console.error('AI health check failed:', error);
      return { success: false };
    }
  }

  /**
   * Get real-time operational conditions
   */
  async getRealtimeConditions() {
    try {
      const response = await api.get('/ai/realtime-conditions');
      return response.data;
    } catch (error) {
      console.error('Failed to get realtime conditions:', error);
      throw error;
    }
  }

  async getRecommendations(params) {
    try {
      const requestPayload = {
        ...params,
        _timestamp: Date.now(),
        _requestId: Math.random().toString(36).substring(7),
      };

      console.log('[AI Service] Sending request:', requestPayload);

      const response = await api.post('/ai/recommendations', requestPayload);

      console.log('[AI Service] Received response:', response.data);

      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  /**
   * Get AI recommendations WITH hauling activity data integration
   * This enables production creation from real hauling data
   * @param {Object} params - Recommendation parameters
   */
  async getRecommendationsWithHauling(params) {
    try {
      const requestPayload = {
        ...params,
        _timestamp: Date.now(),
        _requestId: Math.random().toString(36).substring(7),
      };

      console.log('[AI Service] Sending hauling-integrated request:', requestPayload);

      const response = await api.post('/ai/recommendations-with-hauling', requestPayload);

      console.log('[AI Service] Received hauling-integrated response:', response.data);

      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations with hauling:', error);
      throw error;
    }
  }

  /**
   * Analyze existing hauling activities for production aggregation
   * @param {Object} conditions - Filter conditions (shift, weather, road, date)
   */
  async analyzeHaulingActivities(conditions) {
    try {
      console.log('[AI Service] Analyzing hauling activities:', conditions);

      const response = await api.post('/ai/analyze-hauling', conditions);

      console.log('[AI Service] Hauling analysis response:', response.data);

      return response.data;
    } catch (error) {
      console.error('Failed to analyze hauling activities:', error);
      throw error;
    }
  }

  /**
   * Save selected recommendation
   * @param {Object} data - Recommendation data to save
   */
  async saveRecommendation(data) {
    try {
      const response = await api.post('/ai/recommendations/save', data);
      return response.data;
    } catch (error) {
      console.error('Failed to save recommendation:', error);
      throw error;
    }
  }

  /**
   * Update recommendation with actual results
   * @param {string} id - Recommendation log ID
   * @param {Object} results - Actual results
   */
  async updateRecommendationResults(id, results) {
    try {
      const response = await api.put(`/ai/recommendations/${id}/results`, results);
      return response.data;
    } catch (error) {
      console.error('Failed to update recommendation results:', error);
      throw error;
    }
  }

  /**
   * Ask chatbot a question
   * @param {string} question - User's question
   * @param {Array} context - Context data (strategies, etc.)
   */
  async askChatbot(question, context = []) {
    try {
      const response = await api.post('/ai/chatbot', {
        question,
        context,
      });
      return response.data;
    } catch (error) {
      console.error('Chatbot request failed:', error);
      throw error;
    }
  }

  /**
   * Get chatbot interaction history
   * @param {Object} filters - Query filters
   */
  async getChatbotHistory(filters = {}) {
    try {
      const response = await api.get('/ai/chatbot/history', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to get chatbot history:', error);
      throw error;
    }
  }

  /**
   * Get prediction history
   * @param {Object} filters - Query filters
   */
  async getPredictionHistory(filters = {}) {
    try {
      const response = await api.get('/ai/predictions/history', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to get prediction history:', error);
      throw error;
    }
  }

  /**
   * Get recommendation analytics
   */
  async getAnalytics() {
    try {
      const response = await api.get('/ai/analytics');
      return response.data;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Export training data (Admin only)
   * @param {number} limit - Maximum records to export
   */
  async exportTrainingData(limit = 10000) {
    try {
      const response = await api.post('/ai/export-training-data', { limit });
      return response.data;
    } catch (error) {
      console.error('Failed to export training data:', error);
      throw error;
    }
  }

  async applyHaulingRecommendation(params) {
    try {
      console.log('[AI Service] Applying hauling recommendation:', params);
      const response = await api.post('/ai/apply-hauling-recommendation', params);
      console.log('[AI Service] Hauling recommendation applied:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to apply hauling recommendation:', error);
      throw error;
    }
  }
}

const aiService = new AIService();
export default aiService;
