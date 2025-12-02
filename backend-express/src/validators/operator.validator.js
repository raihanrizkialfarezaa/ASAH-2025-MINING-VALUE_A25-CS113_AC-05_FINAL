import { body, param, query } from 'express-validator';

export const createOperatorValidator = [
  body('userId').trim().notEmpty().withMessage('User ID is required'),
  body('employeeNumber')
    .trim()
    .notEmpty()
    .withMessage('Employee number is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Employee number must be between 3 and 50 characters'),
  body('licenseType')
    .isIn(['SIM_A', 'SIM_B1', 'SIM_B2', 'OPERATOR_ALAT_BERAT'])
    .withMessage('Invalid license type'),
  body('licenseNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('License number must not exceed 50 characters'),
  body('licenseExpiry').optional().isISO8601().withMessage('Invalid license expiry date format'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'ON_LEAVE', 'SICK', 'RESIGNED', 'SUSPENDED'])
    .withMessage('Invalid status'),
  body('shift').optional().isIn(['SHIFT_1', 'SHIFT_2', 'SHIFT_3']).withMessage('Invalid shift'),
  body('joinDate').isISO8601().withMessage('Invalid join date format'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
];

export const updateOperatorValidator = [
  param('id').trim().notEmpty().withMessage('Operator ID is required'),
  body('licenseNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('License number must not exceed 50 characters'),
  body('licenseExpiry').optional().isISO8601().withMessage('Invalid license expiry date format'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'ON_LEAVE', 'SICK', 'RESIGNED', 'SUSPENDED'])
    .withMessage('Invalid status'),
  body('shift').optional().isIn(['SHIFT_1', 'SHIFT_2', 'SHIFT_3']).withMessage('Invalid shift'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
];

export const getOperatorByIdValidator = [
  param('id').trim().notEmpty().withMessage('Operator ID is required'),
];

export const getOperatorsQueryValidator = [
  query('status')
    .optional()
    .isIn(['ACTIVE', 'ON_LEAVE', 'SICK', 'RESIGNED', 'SUSPENDED'])
    .withMessage('Invalid status'),
  query('shift').optional().isIn(['SHIFT_1', 'SHIFT_2', 'SHIFT_3']).withMessage('Invalid shift'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
