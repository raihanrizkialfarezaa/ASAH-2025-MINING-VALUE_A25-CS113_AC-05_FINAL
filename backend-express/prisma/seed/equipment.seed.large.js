import prisma from '../../src/config/database.js';

const truckBrands = ['Hino', 'UD Trucks', 'Mitsubishi Fuso', 'Scania', 'Volvo', 'Mercedes-Benz'];
const truckModels = {
  Hino: ['FM260JD', 'Ranger FM285JD', 'FM285JM', 'Profia FM320'],
  'UD Trucks': ['Quester CWE280', 'Quester CGE420', 'Quon GWE370'],
  'Mitsubishi Fuso': ['FJ2528R', 'FV517RL', 'FM517HS'],
  Scania: ['P410', 'G440', 'R500'],
  Volvo: ['FM440', 'FMX500', 'FH540'],
  'Mercedes-Benz': ['Actros 4144', 'Arocs 4143', 'Axor 3340'],
};

const excavatorBrands = ['Komatsu', 'Hitachi', 'Caterpillar', 'Kobelco', 'Volvo', 'Liebherr'];
const excavatorModels = {
  Komatsu: ['PC2000-8', 'PC1250-8', 'PC800-8', 'PC400-8'],
  Hitachi: ['EX1200-6', 'EX1900-6', 'EX2600-6', 'EX3600-6'],
  Caterpillar: ['6030', '390F', '374F', '349E'],
  Kobelco: ['SK850-10', 'SK500-10', 'SK380-10'],
  Volvo: ['EC750E', 'EC950F', 'EC480E'],
  Liebherr: ['R9800', 'R9400', 'R984C'],
};

const supportTypes = ['GRADER', 'WATER_TRUCK', 'FUEL_TRUCK', 'DOZER', 'COMPACTOR', 'LIGHT_VEHICLE'];

export const seedOperators = async (operatorUsers) => {
  const operators = [];
  const licenseTypes = ['SIM_B2', 'OPERATOR_ALAT_BERAT'];
  const shifts = ['SHIFT_1', 'SHIFT_2', 'SHIFT_3'];

  for (let i = 0; i < operatorUsers.length; i++) {
    const joinYears = Math.floor(Math.random() * 10) + 1;
    const joinDate = new Date(Date.now() - joinYears * 365 * 24 * 60 * 60 * 1000);
    const licenseType = licenseTypes[Math.floor(Math.random() * licenseTypes.length)];
    const expiryMonths = Math.floor(Math.random() * 36) + 6;
    const totalHours = joinYears * 2000 + Math.floor(Math.random() * 500);

    operators.push({
      userId: operatorUsers[i].id,
      employeeNumber: `OPR-${String(i + 1).padStart(4, '0')}`,
      licenseNumber: `SIM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      licenseType,
      licenseExpiry: new Date(Date.now() + expiryMonths * 30 * 24 * 60 * 60 * 1000),
      competency: {
        dump_truck: true,
        heavy_equipment: licenseType === 'OPERATOR_ALAT_BERAT',
        years_experience: joinYears,
      },
      status: Math.random() > 0.1 ? 'ACTIVE' : Math.random() > 0.5 ? 'ON_LEAVE' : 'SICK',
      shift: shifts[i % 3],
      totalHours,
      rating: 3.5 + Math.random() * 1.5,
      joinDate,
    });
  }

  const created = [];
  for (const data of operators) {
    const operator = await prisma.operator.create({ data });
    created.push(operator);
  }

  return created;
};

export const seedTrucks = async (operators) => {
  const trucks = [];
  const statuses = [
    'IDLE',
    'HAULING',
    'LOADING',
    'DUMPING',
    'IN_QUEUE',
    'MAINTENANCE',
    'REFUELING',
    'STANDBY',
  ];
  const locations = [
    'Pool',
    'PIT-01',
    'PIT-02',
    'PIT-03',
    'ROM-01',
    'ROM-02',
    'Stockpile-01',
    'Crusher',
    'Workshop',
    'En-route',
  ];

  for (let i = 0; i < 600; i++) {
    const brand = truckBrands[Math.floor(Math.random() * truckBrands.length)];
    const model = truckModels[brand][Math.floor(Math.random() * truckModels[brand].length)];
    const yearManufacture = 2015 + Math.floor(Math.random() * 10);
    const age = 2025 - yearManufacture;
    const totalHours = age * 3500 + Math.floor(Math.random() * 2000);
    const totalDistance = totalHours * 15 + Math.floor(Math.random() * 10000);
    const lastMaintenanceDays = Math.floor(Math.random() * 45);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const hasOperator = status !== 'MAINTENANCE' && status !== 'STANDBY' && Math.random() > 0.2;

    trucks.push({
      code: `HD-${String(i + 1).padStart(4, '0')}`,
      name: `${brand} ${model}-${String(i + 1).padStart(3, '0')}`,
      brand,
      model,
      yearManufacture,
      capacity: 20.0 + Math.floor(Math.random() * 20),
      fuelCapacity: 250 + Math.floor(Math.random() * 200),
      status,
      lastMaintenance: new Date(Date.now() - lastMaintenanceDays * 24 * 60 * 60 * 1000),
      nextMaintenance: new Date(Date.now() + (30 - lastMaintenanceDays) * 24 * 60 * 60 * 1000),
      totalHours,
      totalDistance,
      currentOperatorId: hasOperator ? operators[i % operators.length].id : null,
      currentLocation: locations[Math.floor(Math.random() * locations.length)],
      isActive: Math.random() > 0.05,
      purchaseDate: new Date(
        yearManufacture,
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1
      ),
      remarks:
        Math.random() > 0.7 ? `Fleet ${String.fromCharCode(65 + Math.floor(i / 100))}` : null,
    });
  }

  const created = [];
  for (const data of trucks) {
    const truck = await prisma.truck.create({ data });
    created.push(truck);
  }

  return created;
};

export const seedExcavators = async () => {
  const excavators = [];
  const statuses = ['ACTIVE', 'IDLE', 'MAINTENANCE', 'BREAKDOWN', 'STANDBY'];
  const locations = [
    'PIT-01',
    'PIT-02',
    'PIT-03',
    'PIT-04',
    'ROM-01',
    'ROM-02',
    'Workshop',
    'Stockpile-01',
  ];

  for (let i = 0; i < 600; i++) {
    const brand = excavatorBrands[Math.floor(Math.random() * excavatorBrands.length)];
    const model = excavatorModels[brand][Math.floor(Math.random() * excavatorModels[brand].length)];
    const yearManufacture = 2015 + Math.floor(Math.random() * 10);
    const age = 2025 - yearManufacture;
    const totalHours = age * 4000 + Math.floor(Math.random() * 2000);
    const lastMaintenanceDays = Math.floor(Math.random() * 60);

    excavators.push({
      code: `EXC-${String(i + 1).padStart(4, '0')}`,
      name: `${brand} ${model}-${String(i + 1).padStart(3, '0')}`,
      brand,
      model,
      yearManufacture,
      bucketCapacity: 8.0 + Math.random() * 5,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lastMaintenance: new Date(Date.now() - lastMaintenanceDays * 24 * 60 * 60 * 1000),
      nextMaintenance: new Date(Date.now() + (60 - lastMaintenanceDays) * 24 * 60 * 60 * 1000),
      totalHours,
      currentLocation: locations[Math.floor(Math.random() * locations.length)],
      isActive: Math.random() > 0.03,
      purchaseDate: new Date(
        yearManufacture,
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1
      ),
      remarks:
        Math.random() > 0.8
          ? `Production unit ${String.fromCharCode(65 + Math.floor(i / 100))}`
          : null,
    });
  }

  const created = [];
  for (const data of excavators) {
    const excavator = await prisma.excavator.create({ data });
    created.push(excavator);
  }

  return created;
};

export const seedSupportEquipment = async () => {
  const supportEquipment = [];
  const statuses = ['ACTIVE', 'IDLE', 'MAINTENANCE', 'BREAKDOWN'];
  const brands = ['Komatsu', 'Caterpillar', 'Volvo', 'JCB', 'Shantui', 'XCMG'];

  for (let i = 0; i < 600; i++) {
    const equipmentType = supportTypes[Math.floor(Math.random() * supportTypes.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const yearManufacture = 2015 + Math.floor(Math.random() * 10);
    const age = 2025 - yearManufacture;
    const totalHours = age * 2500 + Math.floor(Math.random() * 1500);

    supportEquipment.push({
      code: `SUP-${String(i + 1).padStart(4, '0')}`,
      name: `${brand} ${equipmentType}-${String(i + 1).padStart(3, '0')}`,
      equipmentType,
      brand,
      model: `${brand.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lastMaintenance: new Date(Date.now() - Math.floor(Math.random() * 45) * 24 * 60 * 60 * 1000),
      totalHours,
      isActive: Math.random() > 0.05,
    });
  }

  const created = [];
  for (const data of supportEquipment) {
    const equipment = await prisma.supportEquipment.create({ data });
    created.push(equipment);
  }

  return created;
};
