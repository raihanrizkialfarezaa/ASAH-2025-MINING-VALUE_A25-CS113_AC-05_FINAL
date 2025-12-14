import express from 'express';
import { haulingController } from '../controllers/hauling.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createHaulingValidator,
  updateHaulingValidator,
  completeLoadingValidator,
  completeDumpingValidator,
  addDelayValidator,
  getHaulingsQueryValidator,
} from '../validators/hauling.validator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getHaulingsQueryValidator, validate, haulingController.getAll);
router.get('/available-for-production', haulingController.getAvailableForProduction);
router.get('/active', haulingController.getActive);
router.get('/statistics', haulingController.getStatistics);
router.get('/:id', haulingController.getById);
router.post(
  '/',
  authorize('SUPERVISOR', 'DISPATCHER', 'ADMIN'),
  createHaulingValidator,
  validate,
  haulingController.create
);
router.put(
  '/:id',
  authorize('SUPERVISOR', 'DISPATCHER', 'ADMIN'),
  updateHaulingValidator,
  validate,
  haulingController.update
);
router.patch(
  '/:id/complete-loading',
  authorize('SUPERVISOR', 'DISPATCHER', 'OPERATOR'),
  completeLoadingValidator,
  validate,
  haulingController.completeLoading
);
router.patch(
  '/:id/complete-dumping',
  authorize('SUPERVISOR', 'DISPATCHER', 'OPERATOR'),
  completeDumpingValidator,
  validate,
  haulingController.completeDumping
);
router.patch(
  '/:id/complete',
  authorize('SUPERVISOR', 'DISPATCHER', 'OPERATOR'),
  haulingController.complete
);
router.patch('/:id/cancel', authorize('SUPERVISOR', 'ADMIN'), haulingController.cancel);
router.post(
  '/:id/delay',
  authorize('SUPERVISOR', 'DISPATCHER', 'ADMIN'),
  addDelayValidator,
  validate,
  haulingController.addDelay
);

// New endpoints for Production Edit modal integration
router.get('/by-equipment', haulingController.getByEquipment);
router.patch(
  '/:id/quick-update',
  authorize('SUPERVISOR', 'DISPATCHER', 'ADMIN'),
  haulingController.quickUpdate
);
router.post('/calculate-achievement', haulingController.calculateAchievement);
router.post('/by-ids', haulingController.getByIds);
router.delete('/:id', authorize('SUPERVISOR', 'ADMIN'), haulingController.delete);

export default router;
