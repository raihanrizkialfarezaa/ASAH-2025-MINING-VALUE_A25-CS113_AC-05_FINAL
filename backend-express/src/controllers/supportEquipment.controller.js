import { supportEquipmentService } from '../services/supportEquipment.service.js';

export const supportEquipmentController = {
  async getAll(req, res, next) {
    try {
      const result = await supportEquipmentService.getAll(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const equipment = await supportEquipmentService.getById(req.params.id);
      res.json({ data: equipment });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const equipment = await supportEquipmentService.create(req.body);
      res.status(201).json({ data: equipment, message: 'Support equipment created successfully' });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const equipment = await supportEquipmentService.update(req.params.id, req.body);
      res.json({ data: equipment, message: 'Support equipment updated successfully' });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const result = await supportEquipmentService.delete(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
