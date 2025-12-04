import express from 'express';
import { supportEquipmentController } from '../controllers/supportEquipment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createSupportEquipmentValidator,
  updateSupportEquipmentValidator,
  getSupportEquipmentByIdValidator,
  getSupportEquipmentQueryValidator,
} from '../validators/supportEquipment.validator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getSupportEquipmentQueryValidator, validate, supportEquipmentController.getAll);
router.get('/:id', getSupportEquipmentByIdValidator, validate, supportEquipmentController.getById);
router.post(
  '/',
  authorize('ADMIN', 'SUPERVISOR'),
  createSupportEquipmentValidator,
  validate,
  supportEquipmentController.create
);
router.put(
  '/:id',
  authorize('ADMIN', 'SUPERVISOR'),
  updateSupportEquipmentValidator,
  validate,
  supportEquipmentController.update
);
router.delete('/:id', authorize('ADMIN'), supportEquipmentController.delete);

export default router;
