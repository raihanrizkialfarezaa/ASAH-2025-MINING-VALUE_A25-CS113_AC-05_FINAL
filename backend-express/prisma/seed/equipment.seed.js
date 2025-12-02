import prisma from '../../src/config/database.js';

export const seedOperators = async (operatorUsers) => {
  const operators = [
    {
      userId: operatorUsers[0].id,
      employeeNumber: 'OPR-001',
      licenseNumber: 'SIM-B2-12345',
      licenseType: 'SIM_B2',
      licenseExpiry: new Date('2025-12-31'),
      competency: {
        dump_truck: true,
        heavy_equipment: true,
        years_experience: 8,
      },
      status: 'ACTIVE',
      shift: 'SHIFT_1',
      totalHours: 2400,
      rating: 4.8,
      salary: 5000000,
      joinDate: new Date('2018-03-15'),
    },
    {
      userId: operatorUsers[1].id,
      employeeNumber: 'OPR-002',
      licenseNumber: 'SIM-B2-12346',
      licenseType: 'SIM_B2',
      licenseExpiry: new Date('2025-08-15'),
      competency: {
        dump_truck: true,
        years_experience: 6,
      },
      status: 'ACTIVE',
      shift: 'SHIFT_1',
      totalHours: 1850,
      rating: 4.5,
      salary: 4500000,
      joinDate: new Date('2019-06-01'),
    },
    {
      userId: operatorUsers[2].id,
      employeeNumber: 'OPR-003',
      licenseNumber: 'SIM-B2-12347',
      licenseType: 'SIM_B2',
      licenseExpiry: new Date('2026-02-28'),
      competency: {
        dump_truck: true,
        years_experience: 5,
      },
      status: 'ACTIVE',
      shift: 'SHIFT_2',
      totalHours: 1600,
      rating: 4.6,
      salary: 4800000,
      joinDate: new Date('2020-01-20'),
    },
    {
      userId: operatorUsers[3].id,
      employeeNumber: 'OPR-004',
      licenseNumber: 'SIM-B2-12348',
      licenseType: 'SIM_B2',
      licenseExpiry: new Date('2025-10-10'),
      competency: {
        dump_truck: true,
        years_experience: 7,
      },
      status: 'ACTIVE',
      shift: 'SHIFT_2',
      rating: 4.7,
      salary: 4900000,2100,
      rating: 4.7,
      joinDate: new Date('2018-09-10'),
    },
    {
      userId: operatorUsers[4].id,
      employeeNumber: 'OPR-005',
      licenseNumber: 'SIM-B2-12349',
      licenseType: 'SIM_B2',
      licenseExpiry: new Date('2025-11-20'),
      competency: {
        dump_truck: true,
        years_experience: 4,
      },
      status: 'ACTIVE',
      shift: 'SHIFT_3',
      rating: 4.4,
      salary: 4200000,1400,
      rating: 4.4,
      joinDate: new Date('2020-11-05'),
    },
    {
      userId: operatorUsers[5].id,
      employeeNumber: 'OPR-006',
      licenseNumber: 'SIM-B2-12350',
      licenseType: 'SIM_B2',
      licenseExpiry: new Date('2026-03-15'),
      competency: {
        dump_truck: true,
        years_experience: 3,
      },
      status: 'ACTIVE',
      shift: 'SHIFT_3',
      totalHours: 1200,
      rating: 4.3,
      salary: 4000000,
      joinDate: new Date('2021-04-10'),
    },
  ];

  const created = [];
  for (const data of operators) {
    const operator = await prisma.operator.create({ data });
    created.push(operator);
  }

  return created;
};

export const seedTrucks = async (operators) => {
  const trucks = [
    {
      code: 'HD-001',
      name: 'Hino FM260JD-001',
      brand: 'Hino',
      model: 'FM260JD',
      yearManufacture: 2020,
      capacity: 24.0,
      fuelCapacity: 300,
      fuelConsumption: 2.5,
      averageSpeed: 30.0,
      maintenanceCost: 50000,
      status: 'HAULING',
      lastMaintenance: new Date('2025-01-08'),
      nextMaintenance: new Date('2025-02-08'),
      totalHours: 15000,
      totalDistance: 245000,
      currentOperatorId: operators[0].id,
      currentLocation: 'Menuju DP-01',
      isActive: true,
      purchaseDate: new Date('2020-05-10'),
      remarks: 'Dump truck utama fleet A',
    },
    {
      code: 'HD-002',
      name: 'Hino FM260JD-002',
      brand: 'Hino',
      model: 'FM260JD',
      yearManufacture: 2020,
      capacity: 24.0,
      fuelCapacity: 300,
      fuelConsumption: 2.5,
      averageSpeed: 30.0,
      maintenanceCost: 50000,
      status: 'LOADING',
      lastMaintenance: new Date('2025-01-09'),
      nextMaintenance: new Date('2025-02-09'),
      totalHours: 14800,
      totalDistance: 238000,
      currentOperatorId: operators[1].id,
      currentLocation: 'PIT-01',
      isActive: true,
      purchaseDate: new Date('2020-05-10'),
      remarks: 'Dump truck utama fleet A',
    },
    {
      code: 'HD-003',
      name: 'Hino Ranger-001',
      brand: 'Hino',
      model: 'Ranger FM285JD',
      yearManufacture: 2021,
      capacity: 30.0,
      fuelCapacity: 350,
      fuelConsumption: 2.8,
      averageSpeed: 35.0,
      maintenanceCost: 60000,
      status: 'HAULING',
      lastMaintenance: new Date('2025-01-11'),
      nextMaintenance: new Date('2025-02-11'),
      totalHours: 12500,
      totalDistance: 195000,
      currentOperatorId: operators[2].id,
      currentLocation: 'Menuju DP-03',
      isActive: true,
      purchaseDate: new Date('2021-02-15'),
      remarks: 'Dump truck fleet B',
    },
    {
      code: 'HD-004',
      name: 'Hino Ranger-002',
      brand: 'Hino',
      model: 'Ranger FM285JD',
      yearManufacture: 2021,
      capacity: 30.0,
      fuelCapacity: 350,
      fuelConsumption: 2.8,
      averageSpeed: 35.0,
      maintenanceCost: 60000,
      status: 'IN_QUEUE',
      lastMaintenance: new Date('2025-01-13'),
      nextMaintenance: new Date('2025-02-13'),
      totalHours: 12200,
      totalDistance: 192000,
      currentOperatorId: operators[3].id,
      currentLocation: 'PIT-01',
      isActive: true,
      purchaseDate: new Date('2021-02-15'),
      remarks: 'Dump truck fleet B',
    },
    {
      code: 'UD-001',
      name: 'UD Trucks Quester-001',
      brand: 'UD Trucks',
      model: 'Quester CWE280',
      yearManufacture: 2022,
      capacity: 35.0,
      fuelCapacity: 400,
      fuelConsumption: 3.0,
      averageSpeed: 25.0,
      maintenanceCost: 70000,
      status: 'IDLE',
      lastMaintenance: new Date('2025-01-05'),
      nextMaintenance: new Date('2025-02-05'),
      totalHours: 9500,
      totalDistance: 148000,
      currentOperatorId: operators[4].id,
      currentLocation: 'Pool',
      isActive: true,
      purchaseDate: new Date('2022-08-20'),
      remarks: 'Dump truck heavy capacity',
    },
    {
      code: 'HD-005',
      name: 'Hino FM260JD-003',
      brand: 'Hino',
      model: 'FM260JD',
      yearManufacture: 2023,
      capacity: 24.0,
      fuelCapacity: 300,
      fuelConsumption: 2.5,
      averageSpeed: 30.0,
      maintenanceCost: 50000,
      status: 'MAINTENANCE',
      lastMaintenance: new Date('2025-01-14'),
      nextMaintenance: new Date('2025-03-14'),
      totalHours: 6500,
      totalDistance: 98000,
      currentLocation: 'Workshop',
      isActive: true,
      purchaseDate: new Date('2023-03-10'),
      remarks: 'Sedang maintenance major',
    },
  ];

  const created = [];
  for (const data of trucks) {
    const truck = await prisma.truck.create({ data });
    created.push(truck);
  }

  return created;
};

export const seedExcavators = async () => {
  const excavators = [
    {
      code: 'EXC-001',
      name: 'Komatsu PC2000-1',
      brand: 'Komatsu',
      model: 'PC2000-8',
      yearManufacture: 2019,
      bucketCapacity: 10.0,
      productionRate: 10.0,
      fuelConsumption: 90.0,
      maintenanceCost: 200000,
      status: 'ACTIVE',
      lastMaintenance: new Date('2025-01-10'),
      nextMaintenance: new Date('2025-02-10'),
      totalHours: 12500,
      currentLocation: 'PIT-01',
      isActive: true,
      purchaseDate: new Date('2019-06-15'),
      remarks: 'Excavator utama untuk loading pit',
    },
    {
      code: 'EXC-002',
      name: 'Caterpillar 390F',
      brand: 'Caterpillar',
      model: '390F',
      yearManufacture: 2020,
      bucketCapacity: 8.5,
      productionRate: 8.5,
      fuelConsumption: 80.0,
      maintenanceCost: 180000,
      status: 'ACTIVE',
      lastMaintenance: new Date('2025-01-12'),
      nextMaintenance: new Date('2025-02-12'),
      totalHours: 10200,
      currentLocation: 'PIT-01',
      isActive: true,
      purchaseDate: new Date('2020-03-20'),
      remarks: 'Excavator cadangan untuk loading pit',
    },
    {
      code: 'EXC-003',
      name: 'Hitachi ZX870-5G',
      brand: 'Hitachi',
      model: 'ZX870-5G',
      bucketCapacity: 9.2,
      productionRate: 9.0,
      fuelConsumption: 85.0,
      fuelConsumption: 85.0,
      maintenanceCost: 190000,
      status: 'MAINTENANCE',
      lastMaintenance: new Date('2025-01-14'),
      nextMaintenance: new Date('2025-02-14'),
      totalHours: 8500,
      currentLocation: 'Workshop',
      isActive: true,
      purchaseDate: new Date('2021-01-10'),
      remarks: 'Sedang maintenance rutin',
    },
  ];

  const created = [];
  for (const data of excavators) {
    const excavator = await prisma.excavator.create({ data });
    created.push(excavator);
  }

  return created;
};

export const seedSupportEquipment = async () => {
  const equipment = [
    {
      code: 'GRD-001',
      name: 'Caterpillar 16M',
      equipmentType: 'GRADER',
      brand: 'Caterpillar',
      model: '16M',
      status: 'ACTIVE',
      lastMaintenance: new Date('2025-01-10'),
      totalHours: 8500,
      isActive: true,
    },
    {
      code: 'WT-001',
      name: 'Hino Water Truck',
      equipmentType: 'WATER_TRUCK',
      brand: 'Hino',
      model: 'FM260JD',
      status: 'ACTIVE',
      lastMaintenance: new Date('2025-01-12'),
      totalHours: 5200,
      isActive: true,
    },
    {
      code: 'FT-001',
      name: 'Isuzu Fuel Truck',
      equipmentType: 'FUEL_TRUCK',
      brand: 'Isuzu',
      model: 'FVZ34',
      status: 'ACTIVE',
      lastMaintenance: new Date('2025-01-09'),
      totalHours: 4800,
      isActive: true,
    },
    {
      code: 'DOZ-001',
      name: 'Komatsu D375A-8',
      equipmentType: 'DOZER',
      brand: 'Komatsu',
      model: 'D375A-8',
      status: 'ACTIVE',
      lastMaintenance: new Date('2025-01-11'),
      totalHours: 9200,
      isActive: true,
    },
  ];

  const created = [];
  for (const data of equipment) {
    const supportEquipment = await prisma.supportEquipment.create({ data });
    created.push(supportEquipment);
  }

  return created;
};
