import apiClient from './apiClient';

export const truckService = {
  getAll: async (params) => {
    const response = await apiClient.get('/trucks', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/trucks/${id}`);
    return response.data;
  },

  getByStatus: async (status) => {
    const response = await apiClient.get(`/trucks/status/${status}`);
    return response.data;
  },

  getPerformance: async (id) => {
    const response = await apiClient.get(`/trucks/${id}/performance`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/trucks', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/trucks/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/trucks/${id}/status`, { status });
    return response.data;
  },

  assignOperator: async (id, operatorId) => {
    const response = await apiClient.post(`/trucks/${id}/assign-operator`, { operatorId });
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/trucks/${id}`);
    return response.data;
  },
};

export const excavatorService = {
  getAll: async (params) => {
    const response = await apiClient.get('/excavators', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/excavators/${id}`);
    return response.data;
  },

  getPerformance: async (id) => {
    const response = await apiClient.get(`/excavators/${id}/performance`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/excavators', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/excavators/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/excavators/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/excavators/${id}`);
    return response.data;
  },
};

export const vesselService = {
  getAll: async (params) => {
    const response = await apiClient.get('/vessels', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/vessels/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/vessels', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/vessels/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/vessels/${id}`);
    return response.data;
  },
};

export const operatorService = {
  getAll: async (params) => {
    const response = await apiClient.get('/operators', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/operators/${id}`);
    return response.data;
  },

  getPerformance: async (id) => {
    const response = await apiClient.get(`/operators/${id}/performance`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/operators', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/operators/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/operators/${id}`);
    return response.data;
  },
};

export const supportEquipmentService = {
  getAll: async (params) => {
    const response = await apiClient.get('/support-equipment', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/support-equipment/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/support-equipment', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/support-equipment/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/support-equipment/${id}`);
    return response.data;
  },
};
