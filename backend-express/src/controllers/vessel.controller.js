import { vesselService } from '../services/vessel.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/apiResponse.js';

export const vesselController = {
  getAll: catchAsync(async (req, res) => {
    const result = await vesselService.getAll(req.query);
    res.json(ApiResponse.paginated(result.vessels, result.pagination));
  }),

  getById: catchAsync(async (req, res) => {
    const vessel = await vesselService.getById(req.params.id);
    res.json(ApiResponse.success(vessel));
  }),

  create: catchAsync(async (req, res) => {
    const vessel = await vesselService.create(req.body);
    res.status(201).json(ApiResponse.created(vessel, 'Vessel created successfully'));
  }),

  update: catchAsync(async (req, res) => {
    const vessel = await vesselService.update(req.params.id, req.body);
    res.json(ApiResponse.success(vessel, 'Vessel updated successfully'));
  }),

  delete: catchAsync(async (req, res) => {
    const result = await vesselService.delete(req.params.id);
    res.json(ApiResponse.success(result));
  }),

  getAllSchedules: catchAsync(async (req, res) => {
    const result = await vesselService.getAllSchedules(req.query);
    res.json(ApiResponse.paginated(result.schedules, result.pagination));
  }),

  // ===== NEW: Get vessels available for loading =====
  getAvailableForLoading: catchAsync(async (req, res) => {
    const result = await vesselService.getAvailableForLoading(req.query);
    res.json(ApiResponse.success(result, 'Available vessels retrieved successfully'));
  }),

  // ===== NEW: Validate vessel/schedule capacity =====
  validateCapacity: catchAsync(async (req, res) => {
    const { scheduleId, additionalLoad } = req.body;

    if (!scheduleId) {
      return res.status(400).json(ApiResponse.error('scheduleId is required'));
    }

    if (!additionalLoad || additionalLoad <= 0) {
      return res.status(400).json(ApiResponse.error('additionalLoad must be a positive number'));
    }

    const result = await vesselService.validateVesselCapacity(
      scheduleId,
      parseFloat(additionalLoad)
    );

    if (result.valid) {
      res.json(ApiResponse.success(result, 'Vessel has sufficient capacity'));
    } else {
      res.status(400).json(ApiResponse.error(result.error, result));
    }
  }),
};
