import prisma from '../../src/config/database.js';

const siteNames = [
  'Tutupan',
  'Lati',
  'Satui',
  'Bengalon',
  'Melak',
  'Sangatta',
  'Muara Teweh',
  'Tanjung',
  'Balikpapan',
  'Samarinda',
];
const coalSeams = ['Seam-A1', 'Seam-A2', 'Seam-B1', 'Seam-B2', 'Seam-C1', 'Seam-C2', 'Seam-D'];

export const seedMiningSites = async () => {
  const miningSites = [];
  const siteTypes = ['PIT', 'STOCKPILE', 'CRUSHER', 'PORT', 'ROM_PAD'];

  for (let i = 0; i < 600; i++) {
    const siteType = siteTypes[Math.floor(Math.random() * siteTypes.length)];
    const siteName = siteNames[Math.floor(Math.random() * siteNames.length)];
    const lat = -2.5 - Math.random() * 3;
    const lng = 115.0 + Math.random() * 5;

    miningSites.push({
      code: `SITE-${String(i + 1).padStart(4, '0')}`,
      name: `${siteName} ${siteType} ${String.fromCharCode(65 + (i % 26))}`,
      siteType,
      isActive: Math.random() > 0.1,
      latitude: lat,
      longitude: lng,
      elevation: 50 + Math.random() * 150,
      capacity: siteType === 'STOCKPILE' ? 50000 + Math.random() * 200000 : null,
      description: `Mining site ${i + 1} - ${siteName} region`,
    });
  }

  const created = [];
  for (const data of miningSites) {
    const site = await prisma.miningSite.create({ data });
    created.push(site);
  }

  return created;
};

export const seedLoadingPoints = async (miningSites) => {
  const loadingPoints = [];

  for (let i = 0; i < miningSites.length; i++) {
    const site = miningSites[i];
    const idx = String(i + 1).padStart(4, '0');

    loadingPoints.push({
      code: `LP-${idx}`,
      name: `Loading Point ${i + 1}`,
      miningSiteId: site.id,
      isActive: Math.random() > 0.05,
      maxQueueSize: 3 + Math.floor(Math.random() * 7),
      latitude: site.latitude != null ? site.latitude + (Math.random() - 0.5) * 0.01 : null,
      longitude: site.longitude != null ? site.longitude + (Math.random() - 0.5) * 0.01 : null,
      coalSeam: coalSeams[Math.floor(Math.random() * coalSeams.length)],
      coalQuality: {
        calorie: 4500 + Math.random() * 1500,
        ash_content: 4 + Math.random() * 8,
        sulfur: 0.2 + Math.random() * 0.6,
        moisture: 8 + Math.random() * 12,
      },
    });
  }

  const created = [];
  for (const data of loadingPoints) {
    const point = await prisma.loadingPoint.create({ data });
    created.push(point);
  }

  return created;
};

export const seedDumpingPoints = async (miningSites) => {
  const dumpingPoints = [];

  const typeMap = {
    PIT: 'WASTE_DUMP',
    STOCKPILE: 'STOCKPILE',
    CRUSHER: 'CRUSHER',
    PORT: 'PORT',
    ROM_PAD: 'ROM_STOCKPILE',
  };

  for (let i = 0; i < miningSites.length; i++) {
    const site = miningSites[i];
    const idx = String(i + 1).padStart(4, '0');
    const dumpingType = typeMap[site.siteType] || 'STOCKPILE';

    dumpingPoints.push({
      code: `DP-${idx}`,
      name: `${dumpingType} ${i + 1}`,
      miningSiteId: site.id,
      dumpingType,
      isActive: Math.random() > 0.05,
      capacity: 20000 + Math.random() * 80000,
      currentStock: Math.random() * 50000,
      latitude: site.latitude != null ? site.latitude + (Math.random() - 0.5) * 0.01 : null,
      longitude: site.longitude != null ? site.longitude + (Math.random() - 0.5) * 0.01 : null,
    });
  }

  const created = [];
  for (const data of dumpingPoints) {
    const point = await prisma.dumpingPoint.create({ data });
    created.push(point);
  }

  return created;
};

export const seedRoadSegments = async (miningSites) => {
  const roadSegments = [];
  const roadConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];

  for (let i = 0; i < miningSites.length; i++) {
    const site = miningSites[i];
    const idx = String(i + 1).padStart(4, '0');

    roadSegments.push({
      code: `ROAD-${idx}`,
      name: `Road Segment ${i + 1}`,
      miningSiteId: site.id,
      startPoint: `LP-${idx}`,
      endPoint: `DP-${idx}`,
      distance: 0.5 + Math.random() * 4.5,
      roadCondition: roadConditions[Math.floor(Math.random() * roadConditions.length)],
      maxSpeed: 20 + Math.floor(Math.random() * 30),
      gradient: -5 + Math.random() * 15,
      isActive: Math.random() > 0.05,
      lastMaintenance:
        Math.random() > 0.3
          ? new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000)
          : null,
    });
  }

  const created = [];
  for (const data of roadSegments) {
    const segment = await prisma.roadSegment.create({ data });
    created.push(segment);
  }

  return created;
};
