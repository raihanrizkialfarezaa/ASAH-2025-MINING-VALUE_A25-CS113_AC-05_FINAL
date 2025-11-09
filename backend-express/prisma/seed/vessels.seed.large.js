import prisma from '../../src/config/database.js';

const vesselNames = [
  'Borneo',
  'Kalimantan',
  'Mahakam',
  'Barito',
  'Kapuas',
  'Nusantara',
  'Lontar',
  'Samudra',
  'Maritim',
  'Samudera',
];
const vesselSuffixes = [
  'Kencana',
  'Jaya',
  'Sentosa',
  'Makmur',
  'Sejahtera',
  'Abadi',
  'Prima',
  'Utama',
  'Mulia',
  'Indah',
];
const jettyNames = [
  'Muara Pantai',
  'Kariangau',
  'Tanjung Bara',
  'Balikpapan',
  'Samarinda',
  'Banjarmasin',
  'Tarakan',
  'Sangatta',
];

export const seedVessels = async () => {
  const vessels = [];
  const statuses = ['AVAILABLE', 'LOADING', 'SAILING', 'DISCHARGING', 'MAINTENANCE', 'CHARTERED'];
  const locations = [
    'Balikpapan',
    'Samarinda',
    'Tanjung Bara',
    'Sangatta',
    'Kariangau',
    'Muara Pantai',
    'Jakarta',
    'Surabaya',
  ];
  const owners = [
    'PT Tambang Nusantara',
    'PT Chartersindo',
    'PT Marine Services',
    'PT Shipping Indonesia',
    'PT Ocean Line',
  ];

  for (let i = 0; i < 600; i++) {
    const vesselType = i < 100 ? 'MOTHER_VESSEL' : i < 450 ? 'BARGE' : 'TUG_BOAT';
    const name1 = vesselNames[Math.floor(Math.random() * vesselNames.length)];
    const name2 = vesselSuffixes[Math.floor(Math.random() * vesselSuffixes.length)];
    const isOwned = Math.random() > 0.4;

    let gt, dwt, loa, capacity;
    if (vesselType === 'MOTHER_VESSEL') {
      gt = 5000 + Math.random() * 10000;
      dwt = 8000 + Math.random() * 15000;
      loa = 100 + Math.random() * 80;
      capacity = 7000 + Math.random() * 15000;
    } else if (vesselType === 'BARGE') {
      gt = 800 + Math.random() * 1500;
      dwt = 2000 + Math.random() * 4000;
      loa = 50 + Math.random() * 40;
      capacity = 1800 + Math.random() * 4000;
    } else {
      gt = 150 + Math.random() * 300;
      dwt = 300 + Math.random() * 500;
      loa = 20 + Math.random() * 15;
      capacity = 0;
    }

    vessels.push({
      code:
        vesselType === 'MOTHER_VESSEL'
          ? `MV-${String(i + 1).padStart(4, '0')}`
          : vesselType === 'BARGE'
            ? `BRG-${String(i + 1).padStart(4, '0')}`
            : `TUG-${String(i + 1).padStart(4, '0')}`,
      name:
        vesselType === 'TUG_BOAT'
          ? `Tugboat ${name1}-${i + 1}`
          : `${vesselType === 'MOTHER_VESSEL' ? 'MV' : 'Barge'} ${name1} ${name2}`,
      vesselType,
      gt,
      dwt,
      loa,
      capacity,
      owner: owners[Math.floor(Math.random() * owners.length)],
      isOwned,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      currentLocation: locations[Math.floor(Math.random() * locations.length)],
      isActive: Math.random() > 0.05,
    });
  }

  const created = [];
  for (const data of vessels) {
    const vessel = await prisma.vessel.create({ data });
    created.push(vessel);
  }

  const jettyBerths = [];
  for (let i = 0; i < 600; i++) {
    const jettyName = jettyNames[Math.floor(Math.random() * jettyNames.length)];

    jettyBerths.push({
      code: `JT-${String(i + 1).padStart(4, '0')}`,
      name: `${jettyName} Berth ${String.fromCharCode(65 + (i % 26))}`,
      portName: jettyName,
      maxVesselSize: 5000 + Math.random() * 15000,
      maxDraft: 6.0 + Math.random() * 4,
      hasConveyor: Math.random() > 0.4,
      loadingCapacity: 100 + Math.random() * 500,
      isActive: Math.random() > 0.05,
    });
  }

  const createdJetties = [];
  for (const data of jettyBerths) {
    const jetty = await prisma.jettyBerth.create({ data });
    createdJetties.push(jetty);
  }

  const schedules = [];
  const sailingStatuses = [
    'SCHEDULED',
    'STANDBY',
    'LOADING',
    'SAILING',
    'ARRIVED',
    'DISCHARGING',
    'COMPLETED',
    'CANCELLED',
  ];
  const buyers = [
    'PT Semen Indonesia',
    'PLN',
    'PT Petrokimia',
    'PT Steel Indonesia',
    'PT Pupuk Indonesia',
  ];
  const destinations = [
    'Suralaya',
    'Lontar',
    'Paiton',
    'Cilacap',
    'Tanjung Priok',
    'Gresik',
    'Merak',
  ];

  for (let i = 0; i < 600; i++) {
    const vessel = created[i % created.length];
    const daysAgo = Math.floor(Math.random() * 60);
    const etaLoading = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const etsLoading = new Date(etaLoading.getTime() + (8 + Math.random() * 16) * 60 * 60 * 1000);
    const etaDestination = new Date(
      etsLoading.getTime() + (24 + Math.random() * 72) * 60 * 60 * 1000
    );
    const plannedQuantity = vessel.capacity * (0.85 + Math.random() * 0.1);

    schedules.push({
      scheduleNumber: `SCH-${String(i + 1).padStart(7, '0')}`,
      vesselId: vessel.id,
      voyageNumber: `VY-${String(i + 1).padStart(5, '0')}`,
      loadingPort: jettyNames[Math.floor(Math.random() * jettyNames.length)],
      destination: destinations[Math.floor(Math.random() * destinations.length)],
      etaLoading,
      etsLoading,
      etaDestination,
      ataLoading:
        Math.random() > 0.3
          ? new Date(etaLoading.getTime() + (Math.random() - 0.5) * 4 * 60 * 60 * 1000)
          : null,
      loadingStart:
        Math.random() > 0.3
          ? new Date(etaLoading.getTime() + Math.random() * 2 * 60 * 60 * 1000)
          : null,
      loadingComplete: Math.random() > 0.4 ? etsLoading : null,
      atsLoading:
        Math.random() > 0.3
          ? new Date(etsLoading.getTime() + (Math.random() - 0.5) * 2 * 60 * 60 * 1000)
          : null,
      ataDestination:
        Math.random() > 0.5
          ? new Date(etaDestination.getTime() + (Math.random() - 0.5) * 6 * 60 * 60 * 1000)
          : null,
      plannedQuantity,
      actualQuantity: Math.random() > 0.4 ? plannedQuantity * (0.95 + Math.random() * 0.08) : null,
      buyer: buyers[Math.floor(Math.random() * buyers.length)],
      contractNumber: `CN-${Math.floor(Math.random() * 9000) + 1000}`,
      status: sailingStatuses[Math.floor(Math.random() * sailingStatuses.length)],
    });
  }

  const createdSchedules = [];
  for (const data of schedules) {
    const schedule = await prisma.sailingSchedule.create({ data });
    createdSchedules.push(schedule);
  }

  const shipments = [];
  const coalTypes = ['ICI-1', 'ICI-2', 'ICI-3', 'ICI-4', 'GCV-5000', 'GCV-5500', 'GCV-6000'];
  const surveyors = [
    'Surveyor PTX',
    'Surveyor AB',
    'Surveyor Geo',
    'Surveyor Inspec',
    'Surveyor Marine',
  ];

  for (let i = 0; i < 600; i++) {
    const vessel = created[i % created.length];
    const schedule = createdSchedules[i % createdSchedules.length];
    const daysAgo = Math.floor(Math.random() * 60);
    const shipmentDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const quantity = vessel.capacity * (0.85 + Math.random() * 0.1);
    const calorie = 4500 + Math.random() * 1500;
    const freightCost = 10 + Math.random() * 15;

    shipments.push({
      shipmentNumber: `SHP-${String(i + 1).padStart(7, '0')}`,
      vesselId: vessel.id,
      sailingScheduleId: schedule.id,
      shipmentDate,
      loadingDate: new Date(shipmentDate.getTime() + Math.random() * 12 * 60 * 60 * 1000),
      coalType: coalTypes[Math.floor(Math.random() * coalTypes.length)],
      quantity,
      calorie,
      totalMoisture: 8 + Math.random() * 12,
      ashContent: 4 + Math.random() * 8,
      sulfurContent: 0.2 + Math.random() * 0.6,
      stockpileOrigin: `ROM-PIT-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}`,
      buyer: buyers[Math.floor(Math.random() * buyers.length)],
      destination: destinations[Math.floor(Math.random() * destinations.length)],
      surveyorName: surveyors[Math.floor(Math.random() * surveyors.length)],
      blNumber: `BL-${Math.floor(Math.random() * 90000) + 10000}`,
      coaNumber: `COA-${Math.floor(Math.random() * 90000) + 10000}`,
      freightCost,
      totalFreight: quantity * freightCost,
    });
  }

  const createdShipments = [];
  for (const data of shipments) {
    const shipment = await prisma.shipmentRecord.create({ data });
    createdShipments.push(shipment);
  }

  const bargeLoads = [];
  const shifts = ['SHIFT_1', 'SHIFT_2', 'SHIFT_3'];
  const weatherConds = ['CERAH', 'BERAWAN', 'MENDUNG', 'HUJAN_RINGAN'];
  const tidalConds = ['Normal', 'High Tide', 'Low Tide', 'Spring Tide', 'Neap Tide'];

  for (let i = 0; i < 600; i++) {
    const barges = created.filter((v) => v.vesselType === 'BARGE');
    const vessel = barges[i % barges.length];
    const daysAgo = Math.floor(Math.random() * 60);
    const loadingDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const startTime = new Date(loadingDate.getTime() + Math.random() * 12 * 60 * 60 * 1000);
    const duration = 2 + Math.random() * 6;
    const quantity = vessel.capacity * (0.8 + Math.random() * 0.15);

    bargeLoads.push({
      loadingNumber: `BLD-${String(i + 1).padStart(7, '0')}`,
      vesselCode: vessel.code,
      vesselName: vessel.name,
      loadingDate,
      shift: shifts[Math.floor(Math.random() * shifts.length)],
      startTime,
      endTime: new Date(startTime.getTime() + duration * 60 * 60 * 1000),
      stockpileSource: `Stockpile ${String.fromCharCode(65 + Math.floor(Math.random() * 10))}`,
      quantity,
      loaderUsed: ['Komatsu PC2000', 'Hitachi EX1900', 'CAT 6030'][Math.floor(Math.random() * 3)],
      bargeTrips: Math.floor(quantity / 500) + 1,
      weatherCondition: weatherConds[Math.floor(Math.random() * weatherConds.length)],
      tidalCondition: tidalConds[Math.floor(Math.random() * tidalConds.length)],
      delayMinutes: Math.random() > 0.7 ? Math.floor(Math.random() * 60) : 0,
      delayReason: Math.random() > 0.7 ? 'Weather/Tide adjustment' : null,
    });
  }

  for (const data of bargeLoads) {
    await prisma.bargeLoadingLog.create({ data });
  }

  const berthings = [];
  for (let i = 0; i < 600; i++) {
    const jetty = createdJetties[i % createdJetties.length];
    const vessel = created[i % created.length];
    const daysAgo = Math.floor(Math.random() * 60);
    const arrivalTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const waitingTime = Math.floor(Math.random() * 180);
    const berthingTime = new Date(arrivalTime.getTime() + waitingTime * 60 * 1000);
    const loadingDuration = 6 + Math.random() * 18;
    const loadingStart = new Date(berthingTime.getTime() + Math.random() * 60 * 60 * 1000);
    const loadingEnd = new Date(loadingStart.getTime() + loadingDuration * 60 * 60 * 1000);

    berthings.push({
      jettyBerthId: jetty.id,
      vesselCode: vessel.code,
      vesselName: vessel.name,
      arrivalTime,
      berthingTime,
      loadingStart,
      loadingEnd,
      departureTime: new Date(loadingEnd.getTime() + (0.5 + Math.random()) * 60 * 60 * 1000),
      draftArrival: 6 + Math.random() * 3,
      draftDeparture: 7 + Math.random() * 2,
      waitingTime,
    });
  }

  for (const data of berthings) {
    await prisma.berthingLog.create({ data });
  }

  return created;
};
