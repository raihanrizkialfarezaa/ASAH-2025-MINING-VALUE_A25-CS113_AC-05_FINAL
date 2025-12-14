import apiClient from './apiClient';

export const haulingService = {
  getAll: async (params) => {
    const response = await apiClient.get('/hauling', { params });
    return response.data;
  },

  getActive: async () => {
    const response = await apiClient.get('/hauling/active');
    return response.data;
  },

  getStatistics: async (params) => {
    const response = await apiClient.get('/hauling/statistics', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/hauling/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/hauling', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/hauling/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/hauling/${id}`);
    return response.data;
  },

  completeLoading: async (id, data) => {
    const response = await apiClient.patch(`/hauling/${id}/complete-loading`, data);
    return response.data;
  },

  completeDumping: async (id, data) => {
    const response = await apiClient.patch(`/hauling/${id}/complete-dumping`, data);
    return response.data;
  },

  complete: async (id) => {
    const response = await apiClient.patch(`/hauling/${id}/complete`);
    return response.data;
  },

  cancel: async (id, reason) => {
    const response = await apiClient.patch(`/hauling/${id}/cancel`, { reason });
    return response.data;
  },

  addDelay: async (id, delayData) => {
    const response = await apiClient.post(`/hauling/${id}/delay`, delayData);
    return response.data;
  },

  getByEquipment: async (truckIds = [], excavatorIds = [], options = {}) => {
    const params = {
      truckIds: truckIds.join(','),
      excavatorIds: excavatorIds.join(','),
      ...options,
    };
    const response = await apiClient.get('/hauling/by-equipment', { params });
    return response.data;
  },

  getAvailableForProduction: async (params = {}) => {
    const response = await apiClient.get('/hauling/available-for-production', { params });
    return response.data;
  },

  getByIds: async (ids = []) => {
    const response = await apiClient.post('/hauling/by-ids', { ids });
    return response.data;
  },

  quickUpdate: async (id, data) => {
    const response = await apiClient.patch(`/hauling/${id}/quick-update`, data);
    return response.data;
  },

  calculateAchievement: async (truckIds = [], excavatorIds = [], startDate, endDate, haulingActivityIds = [], targetProduction) => {
    const response = await apiClient.post('/hauling/calculate-achievement', {
      truckIds,
      excavatorIds,
      startDate,
      endDate,
      haulingActivityIds,
      targetProduction,
    });
    return response.data;
  },
};
