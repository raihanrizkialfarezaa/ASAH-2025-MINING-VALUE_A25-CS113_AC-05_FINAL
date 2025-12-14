import { body, param, query } from 'express-validator';

export const createHaulingValidator = [
  body('truckId').trim().notEmpty().withMessage('Truck ID is required'),
  body('excavatorId').optional({ nullable: true, checkFalsy: true }).trim(),
  body('excavatorOperatorId').optional({ nullable: true, checkFalsy: true }).trim(),
  body('operatorId').trim().notEmpty().withMessage('Operator ID is required'),
  body('loadingPointId').trim().notEmpty().withMessage('Loading point ID is required'),
  body('dumpingPointId').trim().notEmpty().withMessage('Dumping point ID is required'),
  body('roadSegmentId').optional().trim(),
  body('shift').isIn(['SHIFT_1', 'SHIFT_2', 'SHIFT_3']).withMessage('Invalid shift'),
  body().custom((_, { req }) => {
    const excavatorId = req.body?.excavatorId;
    const excavatorOperatorId = req.body?.excavatorOperatorId;
    if (excavatorId && (!excavatorOperatorId || excavatorOperatorId === '')) {
      throw new Error('Excavator operator ID is required when excavator is set');
    }
    return true;
  }),
  body('loadWeight')
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Load weight must be a positive number'),
  body('targetWeight')
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Target weight must be a positive number'),
  body('distance').isFloat({ min: 0 }).toFloat().withMessage('Distance must be a positive number'),
];

export const updateHaulingValidator = [
  param('id').trim().notEmpty().withMessage('Hauling activity ID is required'),
  body('activityNumber').optional().trim(),
  body('truckId').optional().trim(),
  body('excavatorId').optional({ nullable: true, checkFalsy: true }).trim(),
  body('excavatorOperatorId').optional({ nullable: true, checkFalsy: true }).trim(),
  body('operatorId').optional().trim(),
  body('loadingPointId').optional().trim(),
  body('dumpingPointId').optional().trim(),
  body('roadSegmentId').optional().trim(),
  body('shift').optional().isIn(['SHIFT_1', 'SHIFT_2', 'SHIFT_3']).withMessage('Invalid shift'),
  body('loadingStartTime').optional().isISO8601().withMessage('Invalid loading start time format'),
  body('loadingEndTime').optional().isISO8601().withMessage('Invalid loading end time format'),
  body('departureTime').optional().isISO8601().withMessage('Invalid departure time format'),
  body('arrivalTime').optional().isISO8601().withMessage('Invalid arrival time format'),
  body('dumpingStartTime').optional().isISO8601().withMessage('Invalid dumping start time format'),
  body('dumpingEndTime').optional().isISO8601().withMessage('Invalid dumping end time format'),
  body('returnTime').optional().isISO8601().withMessage('Invalid return time format'),
  body('loadWeight')
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Load weight must be a positive number'),
  body('targetWeight')
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Target weight must be a positive number'),
  body('distance')
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Distance must be a positive number'),
  body('fuelConsumed')
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Fuel consumed must be a positive number'),
  body('status')
    .optional()
    .isIn([
      'PLANNED',
      'IN_QUEUE',
      'LOADING',
      'HAULING',
      'DUMPING',
      'RETURNING',
      'COMPLETED',
      'DELAYED',
      'CANCELLED',
      'INCIDENT',
    ])
    .withMessage('Invalid status'),
  body('weatherCondition').optional().trim(),
  body('roadCondition')
    .optional()
    .isIn(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'])
    .withMessage('Invalid road condition'),
  body('remarks').optional().trim(),
];

export const completeLoadingValidator = [
  param('id').trim().notEmpty().withMessage('Hauling activity ID is required'),
  body('loadWeight').isFloat({ min: 0 }).withMessage('Load weight must be a positive number'),
  body('loadingDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Loading duration must be a non-negative integer'),
];

export const completeDumpingValidator = [
  param('id').trim().notEmpty().withMessage('Hauling activity ID is required'),
  body('dumpingDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Dumping duration must be a non-negative integer'),
];

export const addDelayValidator = [
  param('id').trim().notEmpty().withMessage('Hauling activity ID is required'),
  body('delayReasonId').optional().trim(),
  body('delayMinutes').isInt({ min: 1 }).withMessage('Delay minutes must be a positive integer'),
  body('delayReasonDetail')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Delay reason detail must not exceed 500 characters'),
];

export const getHaulingsQueryValidator = [
  query('status')
    .optional()
    .isIn([
      'PLANNED',
      'IN_QUEUE',
      'LOADING',
      'HAULING',
      'DUMPING',
      'RETURNING',
      'COMPLETED',
      'DELAYED',
      'CANCELLED',
      'INCIDENT',
    ])
    .withMessage('Invalid status'),
  query('shift').optional().isIn(['SHIFT_1', 'SHIFT_2', 'SHIFT_3']).withMessage('Invalid shift'),
  query('truckId').optional().trim(),
  query('excavatorId').optional().trim(),
  query('isDelayed').optional().isBoolean().withMessage('isDelayed must be a boolean'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Limit must be between 1 and 10000'),
  query('search').optional().trim().isString().withMessage('Search must be a string'),
];
