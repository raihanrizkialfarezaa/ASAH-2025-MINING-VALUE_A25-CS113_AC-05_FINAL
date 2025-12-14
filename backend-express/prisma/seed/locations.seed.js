import prisma from '../../src/config/database.js';

export const seedMiningSites = async () => {
  const sites = [
    {
      code: 'PIT-01',
      name: 'Pit Kalimantan Utara',
      siteType: 'PIT',
      isActive: true,
      latitude: 1.2345,
      longitude: 116.789,
      elevation: 150.5,
      capacity: 500000,
      description: 'Pit utama dengan cadangan batubara kalori tinggi',
    },
    {
      code: 'SP-01',
      name: 'Stockpile Central',
      siteType: 'STOCKPILE',
      isActive: true,
      latitude: 1.235,
      longitude: 116.7895,
      elevation: 120.0,
      capacity: 100000,
      description: 'Stockpile utama untuk penyimpanan batubara',
    },
    {
      code: 'CR-01',
      name: 'Crusher Plant',
      siteType: 'CRUSHER',
      isActive: true,
      latitude: 1.2355,
      longitude: 116.79,
      elevation: 115.0,
      capacity: 3000,
      description: 'Crusher plant dengan kapasitas 3000 ton/jam',
    },
    {
      code: 'PORT-01',
      name: 'Pelabuhan Kalimantan',
      siteType: 'PORT',
      isActive: true,
      latitude: 1.24,
      longitude: 116.81,
      elevation: 5.0,
      capacity: 200000,
      description: 'Pelabuhan loading untuk ekspor batubara',
    },
    {
      code: 'ROM-01',
      name: 'ROM Pad Area A',
      siteType: 'ROM_PAD',
      isActive: true,
      latitude: 1.236,
      longitude: 116.791,
      elevation: 125.0,
      capacity: 50000,
      description: 'ROM Pad untuk temporary stockpile',
    },
  ];

  const created = [];
  for (const data of sites) {
    const site = await prisma.miningSite.create({ data });
    created.push(site);
  }

  return created;
};

export const seedLoadingPoints = async (miningSites) => {
  const pitSite = miningSites.find((s) => s.code === 'PIT-01');
  const stockpileSite = miningSites.find((s) => s.code === 'SP-01');
  const crusherSite = miningSites.find((s) => s.code === 'CR-01');
  const portSite = miningSites.find((s) => s.code === 'PORT-01');
  const romPadSite = miningSites.find((s) => s.code === 'ROM-01');

  const loadingPoints = [
    {
      code: 'LP-01',
      name: 'Loading Point Pit 1 - Seam A',
      miningSiteId: pitSite.id,
      isActive: true,
      maxQueueSize: 5,
      latitude: 1.2345,
      longitude: 116.789,
      coalSeam: 'Seam A',
      coalQuality: {
        calori: 5800,
        ash: 12.5,
        sulfur: 0.8,
        moisture: 18.5,
      },
    },
    {
      code: 'LP-02',
      name: 'Loading Point Pit 1 - Seam B',
      miningSiteId: pitSite.id,
      isActive: true,
      maxQueueSize: 5,
      latitude: 1.2347,
      longitude: 116.7892,
      coalSeam: 'Seam B',
      coalQuality: {
        calori: 6200,
        ash: 10.2,
        sulfur: 0.6,
        moisture: 16.0,
      },
    },
    {
      code: 'LP-03',
      name: 'Loading Point ROM Pad',
      miningSiteId: romPadSite.id,
      isActive: true,
      maxQueueSize: 3,
      latitude: 1.236,
      longitude: 116.791,
      coalSeam: 'Mixed',
      coalQuality: {
        calori: 5500,
        ash: 14.0,
        sulfur: 1.0,
        moisture: 20.0,
      },
    },
    {
      code: 'LP-04',
      name: 'Reclaim Loading Point Stockpile',
      miningSiteId: stockpileSite.id,
      isActive: true,
      maxQueueSize: 4,
      latitude: 1.2351,
      longitude: 116.7896,
      coalSeam: 'Mixed',
      coalQuality: {
        calori: 5600,
        ash: 13.0,
        sulfur: 0.9,
        moisture: 19.0,
      },
    },
    {
      code: 'LP-05',
      name: 'Loading Point Crusher Feed',
      miningSiteId: crusherSite.id,
      isActive: true,
      maxQueueSize: 3,
      latitude: 1.2356,
      longitude: 116.7901,
      coalSeam: 'Mixed',
      coalQuality: {
        calori: 5700,
        ash: 12.0,
        sulfur: 0.8,
        moisture: 18.0,
      },
    },
    {
      code: 'LP-06',
      name: 'Loading Point Port Reclaim',
      miningSiteId: portSite.id,
      isActive: true,
      maxQueueSize: 6,
      latitude: 1.2401,
      longitude: 116.8101,
      coalSeam: 'Mixed',
      coalQuality: {
        calori: 5400,
        ash: 14.5,
        sulfur: 1.1,
        moisture: 21.0,
      },
    },
  ];

  const created = [];
  for (const data of loadingPoints) {
    const point = await prisma.loadingPoint.create({ data });
    created.push(point);
  }

  return created;
};

export const seedDumpingPoints = async (miningSites) => {
  const pitSite = miningSites.find((s) => s.code === 'PIT-01');
  const stockpileSite = miningSites.find((s) => s.code === 'SP-01');
  const crusherSite = miningSites.find((s) => s.code === 'CR-01');
  const romPadSite = miningSites.find((s) => s.code === 'ROM-01');
  const portSite = miningSites.find((s) => s.code === 'PORT-01');

  const dumpingPoints = [
    {
      code: 'DP-01',
      name: 'Stockpile Central - Area A',
      miningSiteId: stockpileSite.id,
      dumpingType: 'STOCKPILE',
      isActive: true,
      capacity: 50000,
      currentStock: 32500,
      latitude: 1.235,
      longitude: 116.7895,
    },
    {
      code: 'DP-02',
      name: 'Stockpile Central - Area B',
      miningSiteId: stockpileSite.id,
      dumpingType: 'STOCKPILE',
      isActive: true,
      capacity: 50000,
      currentStock: 28900,
      latitude: 1.2352,
      longitude: 116.7897,
    },
    {
      code: 'DP-03',
      name: 'Crusher Plant Hopper',
      miningSiteId: crusherSite.id,
      dumpingType: 'CRUSHER',
      isActive: true,
      capacity: 5000,
      currentStock: 1200,
      latitude: 1.2355,
      longitude: 116.79,
    },
    {
      code: 'DP-04',
      name: 'ROM Stockpile',
      miningSiteId: romPadSite.id,
      dumpingType: 'ROM_STOCKPILE',
      isActive: true,
      capacity: 25000,
      currentStock: 15600,
      latitude: 1.236,
      longitude: 116.791,
    },
    {
      code: 'DP-05',
      name: 'Port Loading Area',
      miningSiteId: portSite.id,
      dumpingType: 'PORT',
      isActive: true,
      capacity: 100000,
      currentStock: 45000,
      latitude: 1.24,
      longitude: 116.81,
    },
    {
      code: 'DP-06',
      name: 'Pit Waste Dump',
      miningSiteId: pitSite.id,
      dumpingType: 'WASTE_DUMP',
      isActive: true,
      capacity: 80000,
      currentStock: 12000,
      latitude: 1.2349,
      longitude: 116.7894,
    },
  ];

  const created = [];
  for (const data of dumpingPoints) {
    const point = await prisma.dumpingPoint.create({ data });
    created.push(point);
  }

  return created;
};

export const seedRoadSegments = async (miningSites) => {
  const pitSite = miningSites.find((s) => s.code === 'PIT-01');
  const stockpileSite = miningSites.find((s) => s.code === 'SP-01');
  const crusherSite = miningSites.find((s) => s.code === 'CR-01');
  const portSite = miningSites.find((s) => s.code === 'PORT-01');
  const romPadSite = miningSites.find((s) => s.code === 'ROM-01');

  const roadSegments = [
    {
      code: 'RS-01',
      name: 'Pit 1 ke Stockpile',
      miningSiteId: pitSite.id,
      startPoint: 'LP-01',
      endPoint: 'DP-01',
      distance: 3.5,
      roadCondition: 'GOOD',
      maxSpeed: 40,
      gradient: -2.5,
      isActive: true,
      lastMaintenance: new Date('2025-01-05'),
    },
    {
      code: 'RS-02',
      name: 'Pit 1 ke Crusher',
      miningSiteId: pitSite.id,
      startPoint: 'LP-02',
      endPoint: 'DP-03',
      distance: 4.2,
      roadCondition: 'GOOD',
      maxSpeed: 35,
      gradient: -3.0,
      isActive: true,
      lastMaintenance: new Date('2025-01-07'),
    },
    {
      code: 'RS-03',
      name: 'Stockpile ke Port',
      miningSiteId: stockpileSite.id,
      startPoint: 'DP-01',
      endPoint: 'DP-05',
      distance: 12.5,
      roadCondition: 'FAIR',
      maxSpeed: 50,
      gradient: -1.5,
      isActive: true,
      lastMaintenance: new Date('2024-12-20'),
    },
    {
      code: 'RS-04',
      name: 'ROM ke Stockpile',
      miningSiteId: romPadSite.id,
      startPoint: 'LP-03',
      endPoint: 'DP-02',
      distance: 2.8,
      roadCondition: 'EXCELLENT',
      maxSpeed: 45,
      gradient: -1.0,
      isActive: true,
      lastMaintenance: new Date('2025-01-10'),
    },
    {
      code: 'RS-05',
      name: 'Crusher Internal Route',
      miningSiteId: crusherSite.id,
      startPoint: 'LP-05',
      endPoint: 'DP-03',
      distance: 0.8,
      roadCondition: 'GOOD',
      maxSpeed: 20,
      gradient: -0.5,
      isActive: true,
      lastMaintenance: new Date('2025-01-08'),
    },
    {
      code: 'RS-06',
      name: 'Port Internal Route',
      miningSiteId: portSite.id,
      startPoint: 'LP-06',
      endPoint: 'DP-05',
      distance: 1.2,
      roadCondition: 'FAIR',
      maxSpeed: 25,
      gradient: -0.2,
      isActive: true,
      lastMaintenance: new Date('2025-01-03'),
    },
  ];

  const created = [];
  for (const data of roadSegments) {
    const segment = await prisma.roadSegment.create({ data });
    created.push(segment);
  }

  return created;
};
