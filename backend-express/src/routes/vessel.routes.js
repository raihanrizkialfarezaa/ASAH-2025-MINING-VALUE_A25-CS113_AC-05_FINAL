import express from 'express';
import { vesselController } from '../controllers/vessel.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createVesselValidator,
  updateVesselValidator,
  getVesselByIdValidator,
  getVesselsQueryValidator,
} from '../validators/vessel.validator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getVesselsQueryValidator, validate, vesselController.getAll);
router.get('/schedules', vesselController.getAllSchedules);
// ===== NEW: Get vessels available for loading with capacity validation =====
router.get('/available-for-loading', vesselController.getAvailableForLoading);
// ===== NEW: Validate vessel/schedule capacity for additional load =====
router.post('/validate-capacity', vesselController.validateCapacity);

router.get('/:id', getVesselByIdValidator, validate, vesselController.getById);
router.post(
  '/',
  authorize('ADMIN', 'SUPERVISOR'),
  createVesselValidator,
  validate,
  vesselController.create
);
router.put(
  '/:id',
  authorize('ADMIN', 'SUPERVISOR'),
  updateVesselValidator,
  validate,
  vesselController.update
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  getVesselByIdValidator,
  validate,
  vesselController.delete
);

export default router;
