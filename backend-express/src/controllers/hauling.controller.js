import { haulingService } from '../services/hauling.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/apiResponse.js';

export const haulingController = {
  getAll: catchAsync(async (req, res) => {
    const result = await haulingService.getAll(req.query);
    res.json(ApiResponse.paginated(result.activities, result.pagination));
  }),

  getAvailableForProduction: catchAsync(async (req, res) => {
    const activities = await haulingService.getAvailableForProduction(req.query);
    res.json(ApiResponse.success(activities));
  }),

  getById: catchAsync(async (req, res) => {
    const activity = await haulingService.getById(req.params.id);
    res.json(ApiResponse.success(activity));
  }),

  create: catchAsync(async (req, res) => {
    const activity = await haulingService.create(req.body, req.user.id);
    res.status(201).json(ApiResponse.created(activity, 'Hauling activity created successfully'));
  }),

  update: catchAsync(async (req, res) => {
    const activity = await haulingService.update(req.params.id, req.body);
    res.json(ApiResponse.success(activity, 'Hauling activity updated successfully'));
  }),

  completeLoading: catchAsync(async (req, res) => {
    const { loadWeight, loadingDuration } = req.body;
    const activity = await haulingService.completeLoading(
      req.params.id,
      loadWeight,
      loadingDuration
    );
    res.json(ApiResponse.success(activity, 'Loading completed successfully'));
  }),

  completeDumping: catchAsync(async (req, res) => {
    const { dumpingDuration } = req.body;
    const activity = await haulingService.completeDumping(req.params.id, dumpingDuration);
    res.json(ApiResponse.success(activity, 'Dumping completed successfully'));
  }),

  complete: catchAsync(async (req, res) => {
    const { returnTime } = req.body;
    const activity = await haulingService.complete(req.params.id, returnTime);
    res.json(ApiResponse.success(activity, 'Hauling activity completed successfully'));
  }),

  cancel: catchAsync(async (req, res) => {
    const { reason } = req.body;
    const activity = await haulingService.cancel(req.params.id, reason);
    res.json(ApiResponse.success(activity, 'Hauling activity cancelled successfully'));
  }),

  addDelay: catchAsync(async (req, res) => {
    const activity = await haulingService.addDelay(req.params.id, req.body);
    res.json(ApiResponse.success(activity, 'Delay added successfully'));
  }),

  getStatistics: catchAsync(async (req, res) => {
    const statistics = await haulingService.getStatistics(req.query);
    res.json(ApiResponse.success(statistics));
  }),

  getActive: catchAsync(async (req, res) => {
    const activities = await haulingService.getActive();
    res.json(ApiResponse.success(activities));
  }),

  /**
   * Get hauling activities by equipment allocation (truck/excavator IDs)
   * Used for Production Edit modal to show related hauling activities
   */
  getByEquipment: catchAsync(async (req, res) => {
    const { truckIds, excavatorIds, startDate, endDate, limit } = req.query;

    const truckIdArray = truckIds ? (Array.isArray(truckIds) ? truckIds : truckIds.split(',')) : [];
    const excavatorIdArray = excavatorIds
      ? Array.isArray(excavatorIds)
        ? excavatorIds
        : excavatorIds.split(',')
      : [];

    const activities = await haulingService.getByEquipmentAllocation(
      truckIdArray,
      excavatorIdArray,
      { startDate, endDate, limit: limit ? parseInt(limit) : 50 }
    );

    res.json(ApiResponse.success(activities));
  }),

  /**
   * Quick update hauling activity - only loadWeight and status
   * For Production Edit modal shortcuts
   */
  quickUpdate: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { loadWeight, status } = req.body;

    const activity = await haulingService.quickUpdate(id, { loadWeight, status });
    res.json(ApiResponse.success(activity, 'Hauling activity updated successfully'));
  }),

  /**
   * Calculate achievement for production based on hauling activities
   */
  calculateAchievement: catchAsync(async (req, res) => {
    const { truckIds, excavatorIds, startDate, endDate, haulingActivityIds, targetProduction } =
      req.body;

    const truckIdArray = truckIds || [];
    const excavatorIdArray = excavatorIds || [];
    const haulingIdsArray = haulingActivityIds || [];

    const achievement = await haulingService.calculateProductionAchievement(
      truckIdArray,
      excavatorIdArray,
      startDate,
      endDate,
      haulingIdsArray,
      targetProduction
    );

    res.json(ApiResponse.success(achievement));
  }),

  delete: catchAsync(async (req, res) => {
    const result = await haulingService.delete(req.params.id);
    res.json(ApiResponse.success(result, 'Hauling activity deleted successfully'));
  }),

  getByIds: catchAsync(async (req, res) => {
    const { ids } = req.body;
    const activities = await haulingService.getByIds(ids || []);
    res.json(ApiResponse.success(activities));
  }),
};
