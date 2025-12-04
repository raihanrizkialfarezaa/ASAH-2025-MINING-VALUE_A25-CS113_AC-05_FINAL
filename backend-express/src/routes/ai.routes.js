import express from 'express';
import aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = express.Router();

/**
 * Public routes (no authentication required)
 */

// Health check for AI service
router.get('/health', aiController.checkHealth);

/**
 * Protected routes (authentication required)
 */

// Apply authentication middleware to all routes below
router.use(authenticate);

// GET real-time operational conditions
router.get('/realtime-conditions', aiController.getRealtimeConditions);

// POST get AI strategic recommendations
router.post('/recommendations', aiController.getRecommendations);

// POST get AI recommendations WITH hauling data integration
router.post('/recommendations-with-hauling', aiController.getRecommendationsWithHauling);

// POST analyze existing hauling activities for production
router.post('/analyze-hauling', aiController.analyzeHaulingActivities);

// POST apply hauling recommendation (create or update hauling activities based on AI recommendation)
router.post('/apply-hauling-recommendation', aiController.applyHaulingRecommendation);

// POST save selected recommendation
router.post('/recommendations/save', aiController.saveRecommendation);

// PUT update recommendation with actual results
router.put('/recommendations/:id/results', aiController.updateRecommendationResults);

// POST chatbot interaction
router.post('/chatbot', aiController.chatbot);

// GET chatbot interaction history
router.get('/chatbot/history', aiController.getChatbotHistory);

// GET prediction history
router.get('/predictions/history', aiController.getPredictionHistory);

// GET recommendation analytics
router.get('/analytics', aiController.getAnalytics);

/**
 * Admin only routes
 */

// POST export training data (admin/supervisor only)
router.post(
  '/export-training-data',
  authorize(['ADMIN', 'SUPERVISOR']),
  aiController.exportTrainingData
);

export default router;
