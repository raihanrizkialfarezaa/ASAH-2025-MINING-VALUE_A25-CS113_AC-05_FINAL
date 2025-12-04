import prisma from '../config/database.js';

export const supportEquipmentService = {
  async getAll(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [data, total] = await Promise.all([
      prisma.supportEquipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.supportEquipment.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id) {
    const equipment = await prisma.supportEquipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new Error('Support equipment not found');
    }

    return equipment;
  },

  async create(data) {
    const existingCode = await prisma.supportEquipment.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      throw new Error('Equipment code already exists');
    }

    const equipment = await prisma.supportEquipment.create({
      data: {
        code: data.code,
        name: data.name,
        equipmentType: data.equipmentType,
        brand: data.brand,
        model: data.model,
        yearManufacture: data.yearManufacture,
        status: data.status || 'IDLE',
        isActive: data.isActive !== undefined ? data.isActive : true,
        fuelCapacity: data.fuelCapacity,
        fuelConsumption: data.fuelConsumption,
        currentLocation: data.currentLocation,
        remarks: data.remarks,
      },
    });

    return equipment;
  },

  async update(id, data) {
    const equipment = await prisma.supportEquipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new Error('Support equipment not found');
    }

    if (data.code && data.code !== equipment.code) {
      const existingCode = await prisma.supportEquipment.findUnique({
        where: { code: data.code },
      });

      if (existingCode) {
        throw new Error('Equipment code already exists');
      }
    }

    const updated = await prisma.supportEquipment.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.equipmentType && { equipmentType: data.equipmentType }),
        ...(data.brand && { brand: data.brand }),
        ...(data.model && { model: data.model }),
        ...(data.yearManufacture && { yearManufacture: data.yearManufacture }),
        ...(data.status && { status: data.status }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.fuelCapacity !== undefined && { fuelCapacity: data.fuelCapacity }),
        ...(data.fuelConsumption !== undefined && { fuelConsumption: data.fuelConsumption }),
        ...(data.currentLocation && { currentLocation: data.currentLocation }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
      },
    });

    return updated;
  },

  async delete(id) {
    const equipment = await prisma.supportEquipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new Error('Support equipment not found');
    }

    await prisma.supportEquipment.delete({
      where: { id },
    });

    return { message: 'Support equipment deleted successfully' };
  },
};
