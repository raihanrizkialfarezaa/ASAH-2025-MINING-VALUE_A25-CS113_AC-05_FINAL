import api from '../config/api';

class VesselService {
  async getAll(params = {}) {
    try {
      const response = await api.get('/vessels', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get vessels:', error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const response = await api.get(`/vessels/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get vessel:', error);
      throw error;
    }
  }

  async create(data) {
    try {
      const response = await api.post('/vessels', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create vessel:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const response = await api.put(`/vessels/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update vessel:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const response = await api.delete(`/vessels/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete vessel:', error);
      throw error;
    }
  }

  async getAllSchedules(params = {}) {
    try {
      const response = await api.get('/vessels/schedules', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get sailing schedules:', error);
      throw error;
    }
  }

  async getScheduleById(id) {
    try {
      const response = await api.get(`/vessels/schedules/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get sailing schedule:', error);
      throw error;
    }
  }

  async createSchedule(data) {
    try {
      const response = await api.post('/vessels/schedules', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create sailing schedule:', error);
      throw error;
    }
  }

  async updateSchedule(id, data) {
    try {
      const response = await api.put(`/vessels/schedules/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update sailing schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(id) {
    try {
      const response = await api.delete(`/vessels/schedules/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete sailing schedule:', error);
      throw error;
    }
  }

  async getAvailableForLoading(params = {}) {
    try {
      const response = await api.get('/vessels/available-for-loading', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get available vessels for loading:', error);
      throw error;
    }
  }

  async validateCapacity(data) {
    try {
      const response = await api.post('/vessels/validate-capacity', data);
      return response.data;
    } catch (error) {
      console.error('Failed to validate vessel capacity:', error);
      throw error;
    }
  }
}

const vesselService = new VesselService();
export default vesselService;
