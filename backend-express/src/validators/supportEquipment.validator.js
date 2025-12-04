import { body, param, query } from 'express-validator';

export const getSupportEquipmentQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Limit must be between 1 and 10000'),
  query('status').optional().isString().withMessage('Status must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const getSupportEquipmentByIdValidator = [
  param('id').isString().notEmpty().withMessage('Equipment ID is required'),
];

export const createSupportEquipmentValidator = [
  body('code').isString().notEmpty().withMessage('Code is required'),
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('equipmentType').isString().notEmpty().withMessage('Equipment type is required'),
  body('brand').optional().isString(),
  body('model').optional().isString(),
  body('yearManufacture')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('status').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('fuelCapacity').optional().isFloat({ min: 0 }),
  body('fuelConsumption').optional().isFloat({ min: 0 }),
  body('currentLocation').optional().isString(),
  body('remarks').optional().isString(),
];

export const updateSupportEquipmentValidator = [
  param('id').isString().notEmpty().withMessage('Equipment ID is required'),
  body('code').optional().isString(),
  body('name').optional().isString(),
  body('equipmentType').optional().isString(),
  body('brand').optional().isString(),
  body('model').optional().isString(),
  body('yearManufacture')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('status').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('fuelCapacity').optional().isFloat({ min: 0 }),
  body('fuelConsumption').optional().isFloat({ min: 0 }),
  body('currentLocation').optional().isString(),
  body('remarks').optional().isString(),
];
