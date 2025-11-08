import prisma from '../../src/config/database.js';

export const seedDelayReasons = async () => {
  const delayReasons = [
    {
      code: 'DLY-W01',
      category: 'WEATHER',
      name: 'Hujan Lebat',
      description: 'Penundaan karena hujan lebat yang mengganggu operasi',
      isActive: true,
    },
    {
      code: 'DLY-E01',
      category: 'EQUIPMENT',
      name: 'Kerusakan Truck',
      description: 'Kerusakan pada dump truck saat operasi',
      isActive: true,
    },
    {
      code: 'DLY-E02',
      category: 'EQUIPMENT',
      name: 'Kerusakan Excavator',
      description: 'Kerusakan pada excavator loading point',
      isActive: true,
    },
    {
      code: 'DLY-Q01',
      category: 'QUEUE',
      name: 'Antrian Panjang',
      description: 'Antrian di loading point melebihi kapasitas',
      isActive: true,
    },
    {
      code: 'DLY-R01',
      category: 'ROAD',
      name: 'Kondisi Jalan Buruk',
      description: 'Kondisi jalan yang buruk menghambat hauling',
      isActive: true,
    },
    {
      code: 'DLY-F01',
      category: 'FUEL',
      name: 'Pengisian BBM',
      description: 'Waktu tunggu untuk pengisian bahan bakar',
      isActive: true,
    },
    {
      code: 'DLY-S01',
      category: 'SAFETY',
      name: 'Safety Inspection',
      description: 'Inspeksi keselamatan mendadak',
      isActive: true,
    },
  ];

  const created = [];
  for (const data of delayReasons) {
    const delayReason = await prisma.delayReason.create({ data });
    created.push(delayReason);
  }

  return created;
};

export const seedWeatherLogs = async (miningSites) => {
  const logs = [];
  const now = new Date('2025-11-08T12:00:00Z');

  const conditions = ['CERAH', 'BERAWAN', 'MENDUNG', 'HUJAN_RINGAN', 'HUJAN_SEDANG'];

  for (let day = 0; day < 14; day++) {
    for (let hour = 0; hour < 24; hour += 6) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - day);
      timestamp.setHours(hour, 0, 0, 0);

      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      let riskLevel = 'LOW';
      let isOperational = true;

      if (condition === 'HUJAN_SEDANG') {
        riskLevel = 'HIGH';
        isOperational = false;
      } else if (condition === 'HUJAN_RINGAN' || condition === 'MENDUNG') {
        riskLevel = 'MEDIUM';
      }

      for (const site of miningSites) {
        logs.push({
          miningSiteId: site.id,
          condition,
          temperature: 26 + Math.random() * 6,
          humidity: 65 + Math.random() * 25,
          windSpeed: 3 + Math.random() * 12,
          windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
            Math.floor(Math.random() * 8)
          ],
          rainfall: condition.includes('HUJAN') ? 5 + Math.random() * 45 : 0,
          visibility: condition === 'HUJAN_SEDANG' ? 'POOR' : 'GOOD',
          riskLevel,
          isOperational,
          timestamp,
          remarks: condition === 'HUJAN_SEDANG' ? 'Operasi dihentikan sementara' : null,
        });
      }
    }
  }

  const created = [];
  for (const log of logs) {
    const weatherLog = await prisma.weatherLog.create({ data: log });
    created.push(weatherLog);
  }

  return created;
};

export const seedMaintenanceLogs = async (trucks, excavators, supportEquipment) => {
  const logs = [];
  let counter = 1;

  logs.push({
    maintenanceNumber: `MNT-2025-${String(counter++).padStart(4, '0')}`,
    truckId: trucks[0].id,
    maintenanceType: 'PREVENTIVE',
    description: 'Servis berkala 500 jam - Ganti oli mesin, filter udara, filter oli',
    scheduledDate: new Date('2025-11-08'),
    actualDate: new Date('2025-11-08'),
    completionDate: new Date('2025-11-08T08:00:00Z'),
    duration: 480,
    cost: 3500000,
    status: 'COMPLETED',
    mechanicName: 'Bambang Susilo',
    partsReplaced: {
      items: [
        { part: 'Oli Mesin', quantity: 20, unit: 'liter' },
        { part: 'Filter Oli', quantity: 2, unit: 'pcs' },
        { part: 'Filter Udara', quantity: 1, unit: 'pcs' },
      ],
    },
    downtimeHours: 8.0,
    remarks: 'Maintenance rutin berjalan lancar',
  });

  logs.push({
    maintenanceNumber: `MNT-2025-${String(counter++).padStart(4, '0')}`,
    truckId: trucks[5].id,
    maintenanceType: 'CORRECTIVE',
    description: 'Perbaikan sistem injeksi bahan bakar - Ganti fuel pump',
    scheduledDate: new Date('2025-11-07'),
    actualDate: new Date('2025-11-07'),
    duration: 720,
    cost: 18500000,
    status: 'IN_PROGRESS',
    mechanicName: 'Andi Saputra',
    partsReplaced: {
      items: [
        { part: 'Fuel Pump', quantity: 1, unit: 'unit' },
        { part: 'Fuel Filter', quantity: 2, unit: 'pcs' },
      ],
    },
    downtimeHours: 12.0,
    remarks: 'Menunggu spare part dari Jakarta',
  });

  logs.push({
    maintenanceNumber: `MNT-2025-${String(counter++).padStart(4, '0')}`,
    truckId: trucks[1].id,
    maintenanceType: 'PREVENTIVE',
    description: 'Pemeriksaan sistem rem dan penggantian brake pad',
    scheduledDate: new Date('2025-11-06'),
    actualDate: new Date('2025-11-06'),
    completionDate: new Date('2025-11-06T06:00:00Z'),
    duration: 360,
    cost: 4200000,
    status: 'COMPLETED',
    mechanicName: 'Hendra Wijaya',
    partsReplaced: {
      items: [
        { part: 'Brake Pad Depan', quantity: 1, unit: 'set' },
        { part: 'Brake Pad Belakang', quantity: 1, unit: 'set' },
        { part: 'Minyak Rem', quantity: 2, unit: 'liter' },
      ],
    },
    downtimeHours: 6.0,
  });

  logs.push({
    maintenanceNumber: `MNT-2025-${String(counter++).padStart(4, '0')}`,
    excavatorId: excavators[0].id,
    maintenanceType: 'PREVENTIVE',
    description: 'Pemeriksaan sistem hidrolik dan ganti oli hidrolik',
    scheduledDate: new Date('2025-11-05'),
    actualDate: new Date('2025-11-05'),
    completionDate: new Date('2025-11-05T05:00:00Z'),
    duration: 300,
    cost: 8500000,
    status: 'COMPLETED',
    mechanicName: 'Sutrisno',
    partsReplaced: {
      items: [
        { part: 'Oli Hidrolik', quantity: 150, unit: 'liter' },
        { part: 'Filter Hidrolik', quantity: 3, unit: 'pcs' },
      ],
    },
    downtimeHours: 5.0,
  });

  logs.push({
    maintenanceNumber: `MNT-2025-${String(counter++).padStart(4, '0')}`,
    excavatorId: excavators[2].id,
    maintenanceType: 'CORRECTIVE',
    description: 'Perbaikan arm cylinder yang bocor',
    scheduledDate: new Date('2025-11-07'),
    actualDate: new Date('2025-11-07'),
    duration: 480,
    cost: 22000000,
    status: 'IN_PROGRESS',
    mechanicName: 'Agus Priyanto',
    partsReplaced: {
      items: [{ part: 'Seal Kit Cylinder', quantity: 1, unit: 'set' }],
    },
    downtimeHours: 8.0,
    remarks: 'Sedang proses seal replacement',
  });

  logs.push({
    maintenanceNumber: `MNT-2025-${String(counter++).padStart(4, '0')}`,
    supportEquipmentId: supportEquipment[0].id,
    maintenanceType: 'PREVENTIVE',
    description: 'Servis berkala grader - Pemeriksaan blade dan hydraulic system',
    scheduledDate: new Date('2025-11-05'),
    actualDate: new Date('2025-11-05'),
    completionDate: new Date('2025-11-05T04:00:00Z'),
    duration: 240,
    cost: 5500000,
    status: 'COMPLETED',
    mechanicName: 'Wahyu Hidayat',
    partsReplaced: {
      items: [
        { part: 'Oli Mesin', quantity: 30, unit: 'liter' },
        { part: 'Filter Oli', quantity: 2, unit: 'pcs' },
      ],
    },
    downtimeHours: 4.0,
  });

  const created = [];
  for (const log of logs) {
    const maintenanceLog = await prisma.maintenanceLog.create({ data: log });
    created.push(maintenanceLog);
  }

  return created;
};

export const seedFuelConsumptions = async (trucks, excavators, supportEquipment) => {
  const consumptions = [];
  const now = new Date('2025-11-08');

  for (let day = 0; day < 14; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    for (const truck of trucks.slice(0, 5)) {
      const quantity = 180 + Math.random() * 80;
      const costPerLiter = 6850 + Math.random() * 150;

      consumptions.push({
        truckId: truck.id,
        consumptionDate: date,
        fuelType: 'SOLAR',
        quantity,
        costPerLiter,
        totalCost: quantity * costPerLiter,
        operatingHours: 8 + Math.random() * 4,
        distance: 120 + Math.random() * 80,
        fuelEfficiency: quantity / (120 + Math.random() * 80),
        fuelStation: 'SPBU Tambang Area A',
      });
    }

    for (const excavator of excavators.slice(0, 2)) {
      const quantity = 280 + Math.random() * 120;
      const costPerLiter = 6850 + Math.random() * 150;

      consumptions.push({
        excavatorId: excavator.id,
        consumptionDate: date,
        fuelType: 'SOLAR',
        quantity,
        costPerLiter,
        totalCost: quantity * costPerLiter,
        operatingHours: 10 + Math.random() * 4,
        fuelStation: 'SPBU Tambang Area A',
      });
    }
  }

  const created = [];
  for (const consumption of consumptions) {
    const fuelConsumption = await prisma.fuelConsumption.create({
      data: consumption,
    });
    created.push(fuelConsumption);
  }

  return created;
};

export const seedProductionRecords = async (miningSites) => {
  const records = [];
  const now = new Date('2025-11-08');
  const pitSite = miningSites.find((s) => s.code === 'PIT-01');

  for (let day = 0; day < 14; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    for (let shift = 1; shift <= 3; shift++) {
      const shiftEnum = `SHIFT_${shift}`;
      const target = 4500 + Math.random() * 1500;
      const actual = target * (0.82 + Math.random() * 0.25);
      const achievement = (actual / target) * 100;

      records.push({
        miningSiteId: pitSite.id,
        recordDate: date,
        shift: shiftEnum,
        targetProduction: target,
        actualProduction: actual,
        achievement,
        avgCalori: 5600 + Math.random() * 600,
        avgAshContent: 9 + Math.random() * 4,
        avgSulfur: 0.4 + Math.random() * 0.5,
        avgMoisture: 15 + Math.random() * 6,
        totalTrips: Math.floor(35 + Math.random() * 25),
        totalDistance: 140 + Math.random() * 80,
        totalFuel: 1200 + Math.random() * 400,
        avgCycleTime: 42 + Math.random() * 18,
        trucksOperating: 4 + Math.floor(Math.random() * 2),
        trucksBreakdown: Math.random() < 0.15 ? 1 : 0,
        excavatorsOperating: 2,
        excavatorsBreakdown: Math.random() < 0.1 ? 1 : 0,
        utilizationRate: 72 + Math.random() * 23,
        downtimeHours: Math.random() * 2,
        remarks:
          achievement < 85
            ? 'Produksi di bawah target karena cuaca'
            : achievement > 105
              ? 'Produksi melebihi target'
              : null,
      });
    }
  }

  const created = [];
  for (const record of records) {
    const productionRecord = await prisma.productionRecord.create({
      data: record,
    });
    created.push(productionRecord);
  }

  return created;
};

export const seedIncidentReports = async (users, trucks, excavators, operators) => {
  const reports = [];
  const supervisor = users.find((u) => u.role === 'SUPERVISOR');

  reports.push({
    incidentNumber: 'INC-2025-0001',
    incidentDate: new Date('2025-11-05T14:30:00Z'),
    reportDate: new Date('2025-11-05T15:00:00Z'),
    location: 'Jalan Hauling RS-01 KM 2.5',
    miningSiteCode: 'PIT-01',
    truckId: trucks[1].id,
    operatorId: operators[1].id,
    reportedById: supervisor.id,
    incidentType: 'NEAR_MISS',
    severity: 'MEDIUM',
    description: 'Truck hampir tergelincir di tikungan karena jalan licin setelah hujan',
    rootCause: 'Kondisi jalan licin dan kecepatan terlalu tinggi',
    injuries: 0,
    fatalities: 0,
    equipmentDamage: 'Tidak ada kerusakan signifikan',
    productionLoss: 0.5,
    estimatedCost: 500000,
    downtimeHours: 0.5,
    status: 'RESOLVED',
    actionTaken: 'Warning kepada operator, pemeriksaan kondisi ban, perbaikan drainase jalan',
    preventiveMeasure:
      'Pemasangan rambu peringatan, pengurangan kecepatan maksimal di area tersebut',
    remarks: 'Operator sudah mendapat briefing safety',
  });

  reports.push({
    incidentNumber: 'INC-2025-0002',
    incidentDate: new Date('2025-11-06T09:15:00Z'),
    reportDate: new Date('2025-11-06T09:45:00Z'),
    location: 'Loading Point LP-01',
    miningSiteCode: 'PIT-01',
    excavatorId: excavators[0].id,
    reportedById: supervisor.id,
    incidentType: 'EQUIPMENT_FAILURE',
    severity: 'LOW',
    description: 'Kebocoran oli hidrolik minor pada excavator',
    rootCause: 'Seal hidrolik aus',
    injuries: 0,
    fatalities: 0,
    equipmentDamage: 'Seal hidrolik perlu diganti',
    productionLoss: 1.5,
    estimatedCost: 2500000,
    downtimeHours: 2.0,
    status: 'RESOLVED',
    actionTaken: 'Penggantian seal hidrolik, penambahan oli hidrolik',
    preventiveMeasure: 'Pemeriksaan rutin sistem hidrolik setiap 100 jam operasi',
  });

  reports.push({
    incidentNumber: 'INC-2025-0003',
    incidentDate: new Date('2025-11-07T16:20:00Z'),
    reportDate: new Date('2025-11-07T16:30:00Z'),
    location: 'Area Dumping DP-01',
    miningSiteCode: 'SP-01',
    truckId: trucks[3].id,
    operatorId: operators[3].id,
    reportedById: supervisor.id,
    incidentType: 'SAFETY_VIOLATION',
    severity: 'MEDIUM',
    description: 'Operator tidak menggunakan safety belt saat operasi dumping',
    rootCause: 'Kelalaian operator',
    injuries: 0,
    fatalities: 0,
    productionLoss: 0,
    estimatedCost: 0,
    downtimeHours: 0,
    status: 'CLOSED',
    actionTaken: 'Peringatan tertulis kepada operator, briefing ulang safety procedures',
    preventiveMeasure:
      'Peningkatan supervisi dan pengawasan penggunaan APD, sanksi tegas bagi pelanggar',
    remarks: 'Operator sudah menandatangani surat peringatan',
  });

  const created = [];
  for (const report of reports) {
    const incidentReport = await prisma.incidentReport.create({ data: report });
    created.push(incidentReport);
  }

  return created;
};

export const seedHaulingActivities = async (
  trucks,
  excavators,
  operators,
  users,
  loadingPoints,
  dumpingPoints,
  roadSegments,
  delayReasons
) => {
  const activities = [];
  const supervisor = users.find((u) => u.role === 'SUPERVISOR');
  const baseDate = new Date('2025-11-08T06:00:00Z');

  let activityCounter = 1;

  for (let day = 0; day < 7; day++) {
    for (let shift = 1; shift <= 3; shift++) {
      const shiftEnum = `SHIFT_${shift}`;
      const shiftStartHour = (shift - 1) * 8;

      for (let trip = 0; trip < 6; trip++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(currentDate.getDate() - day);

        const truck = trucks[trip % Math.min(5, trucks.length)];
        const excavator = excavators[trip % Math.min(2, excavators.length)];
        const operator = operators[trip % operators.length];
        const loadingPoint = loadingPoints[trip % loadingPoints.length];
        const dumpingPoint = dumpingPoints[trip % dumpingPoints.length];
        const roadSegment = roadSegments[trip % roadSegments.length];

        const queueStartTime = new Date(currentDate);
        queueStartTime.setHours(shiftStartHour + trip * 1, trip * 10, 0, 0);

        const queueDuration = 5 + Math.floor(Math.random() * 15);
        const queueEndTime = new Date(queueStartTime.getTime() + queueDuration * 60000);

        const loadingStartTime = queueEndTime;
        const loadingDuration = 8 + Math.floor(Math.random() * 7);
        const loadingEndTime = new Date(loadingStartTime.getTime() + loadingDuration * 60000);

        const departureTime = loadingEndTime;
        const haulingDuration = 25 + Math.floor(Math.random() * 15);
        const arrivalTime = new Date(departureTime.getTime() + haulingDuration * 60000);

        const dumpingStartTime = arrivalTime;
        const dumpingDuration = 6 + Math.floor(Math.random() * 5);
        const dumpingEndTime = new Date(dumpingStartTime.getTime() + dumpingDuration * 60000);

        const returnDuration = 20 + Math.floor(Math.random() * 12);
        const returnTime = new Date(dumpingEndTime.getTime() + returnDuration * 60000);

        const totalCycleTime =
          queueDuration + loadingDuration + haulingDuration + dumpingDuration + returnDuration;

        const targetWeight = truck.capacity;
        const loadWeight = targetWeight * (0.85 + Math.random() * 0.15);
        const loadEfficiency = (loadWeight / targetWeight) * 100;

        const isDelayed = Math.random() < 0.15;
        const delayMinutes = isDelayed ? 10 + Math.floor(Math.random() * 30) : 0;
        const delayReason = isDelayed
          ? delayReasons[Math.floor(Math.random() * delayReasons.length)]
          : null;

        const weatherConditions = ['Cerah', 'Berawan', 'Hujan Ringan'];
        const weatherCondition =
          weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

        const roadConditions = ['EXCELLENT', 'GOOD', 'FAIR'];
        const roadCondition = roadConditions[Math.floor(Math.random() * roadConditions.length)];

        const status = 'COMPLETED';

        activities.push({
          activityNumber: `HA-20250115-${String(activityCounter++).padStart(4, '0')}`,
          truckId: truck.id,
          excavatorId: excavator.id,
          operatorId: operator.id,
          supervisorId: supervisor.id,
          loadingPointId: loadingPoint.id,
          dumpingPointId: dumpingPoint.id,
          roadSegmentId: roadSegment.id,
          shift: shiftEnum,
          queueStartTime,
          queueEndTime,
          loadingStartTime,
          loadingEndTime,
          departureTime,
          arrivalTime,
          dumpingStartTime,
          dumpingEndTime,
          returnTime,
          queueDuration,
          loadingDuration,
          haulingDuration,
          dumpingDuration,
          returnDuration,
          totalCycleTime,
          loadWeight,
          targetWeight,
          loadEfficiency,
          distance: roadSegment.distance,
          fuelConsumed: roadSegment.distance * 0.8 * (1 + Math.random() * 0.3),
          status,
          weatherCondition,
          roadCondition,
          isDelayed,
          delayMinutes,
          delayReasonId: delayReason?.id,
          delayReasonDetail: isDelayed ? 'Delay karena ' + delayReason?.name : null,
          predictedDelayRisk: isDelayed ? 'HIGH' : 'LOW',
          predictedDelayMinutes: isDelayed ? delayMinutes + 5 : 0,
        });
      }
    }
  }

  const created = [];
  for (const activity of activities) {
    const haulingActivity = await prisma.haulingActivity.create({ data: activity });
    created.push(haulingActivity);
  }

  return created;
};

export const seedQueueLogs = async (loadingPoints) => {
  const logs = [];
  const now = new Date('2025-11-08T12:00:00Z');

  for (let day = 0; day < 7; day++) {
    for (let hour = 6; hour < 22; hour++) {
      for (const loadingPoint of loadingPoints) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - day);
        timestamp.setHours(hour, 0, 0, 0);

        const queueLength = Math.floor(Math.random() * 6);
        const queueStartTime = timestamp;
        const waitingTime = queueLength > 0 ? queueLength * (8 + Math.random() * 7) : 0;
        const queueEndTime =
          queueLength > 0 ? new Date(queueStartTime.getTime() + waitingTime * 60000) : null;

        logs.push({
          loadingPointId: loadingPoint.id,
          queueLength,
          queueStartTime,
          queueEndTime,
          waitingTime: Math.floor(waitingTime),
          timestamp,
        });
      }
    }
  }

  const created = [];
  for (const log of logs) {
    const queueLog = await prisma.queueLog.create({ data: log });
    created.push(queueLog);
  }

  return created;
};

export const seedEquipmentStatusLogs = async (trucks, excavators, supportEquipment) => {
  const logs = [];
  const now = new Date('2025-11-08T12:00:00Z');

  const truckStatuses = ['IDLE', 'HAULING', 'LOADING', 'DUMPING', 'IN_QUEUE', 'MAINTENANCE'];
  const excavatorStatuses = ['ACTIVE', 'IDLE', 'MAINTENANCE'];
  const supportStatuses = ['ACTIVE', 'IDLE', 'MAINTENANCE'];

  for (let day = 0; day < 7; day++) {
    for (const truck of trucks.slice(0, 3)) {
      for (let change = 0; change < 3; change++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - day);
        timestamp.setHours(6 + change * 6, 0, 0, 0);

        const currentStatusIndex = Math.floor(Math.random() * truckStatuses.length);
        const previousStatusIndex = (currentStatusIndex + 1) % truckStatuses.length;

        logs.push({
          truckId: truck.id,
          timestamp,
          previousStatus: truckStatuses[previousStatusIndex],
          currentStatus: truckStatuses[currentStatusIndex],
          statusReason:
            truckStatuses[currentStatusIndex] === 'MAINTENANCE'
              ? 'Maintenance terjadwal'
              : truckStatuses[currentStatusIndex] === 'HAULING'
                ? 'Mulai operasi hauling'
                : 'Perubahan status operasional',
          location: truck.currentLocation,
          durationMinutes: 360,
        });
      }
    }

    for (const excavator of excavators.slice(0, 2)) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - day);
      timestamp.setHours(7, 0, 0, 0);

      const currentStatusIndex = Math.floor(Math.random() * excavatorStatuses.length);
      const previousStatusIndex = (currentStatusIndex + 1) % excavatorStatuses.length;

      logs.push({
        excavatorId: excavator.id,
        timestamp,
        previousStatus: excavatorStatuses[previousStatusIndex],
        currentStatus: excavatorStatuses[currentStatusIndex],
        statusReason:
          excavatorStatuses[currentStatusIndex] === 'MAINTENANCE'
            ? 'Maintenance rutin'
            : 'Operasional normal',
        location: excavator.currentLocation,
        durationMinutes: 480,
      });
    }
  }

  const created = [];
  for (const log of logs) {
    const statusLog = await prisma.equipmentStatusLog.create({ data: log });
    created.push(statusLog);
  }

  return created;
};

export const seedPredictionLogs = async () => {
  const logs = [];
  const now = new Date('2025-11-08T12:00:00Z');

  for (let i = 0; i < 20; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - i * 2);

    const predictionTypes = [
      {
        modelType: 'DELAY_PREDICTION',
        input: {
          truckCode: 'HD-001',
          weatherCondition: 'HUJAN_RINGAN',
          roadCondition: 'FAIR',
          queueLength: 3,
          timeOfDay: 'morning',
        },
        prediction: {
          delayProbability: 0.65,
          estimatedDelayMinutes: 15,
          riskLevel: 'MEDIUM',
        },
        confidence: 0.78,
        actualOutcome: {
          actualDelay: 12,
          wasDelayed: true,
        },
        isAccurate: true,
      },
      {
        modelType: 'PRODUCTION_FORECAST',
        input: {
          shift: 'SHIFT_1',
          activetrucks: 5,
          weatherCondition: 'CERAH',
          targetProduction: 5000,
        },
        prediction: {
          forecastedProduction: 4850,
          achievementRate: 97,
          confidence: 'HIGH',
        },
        confidence: 0.85,
        actualOutcome: {
          actualProduction: 4920,
          achievementRate: 98.4,
        },
        isAccurate: true,
      },
      {
        modelType: 'MAINTENANCE_PREDICTION',
        input: {
          equipmentCode: 'HD-002',
          totalHours: 14800,
          lastMaintenanceHours: 14300,
          avgDailyHours: 12,
        },
        prediction: {
          nextMaintenanceDays: 42,
          failureRisk: 'LOW',
          recommendedAction: 'Monitor',
        },
        confidence: 0.72,
      },
      {
        modelType: 'FUEL_CONSUMPTION_PREDICTION',
        input: {
          truckCode: 'HD-003',
          plannedDistance: 45.5,
          roadCondition: 'GOOD',
          loadWeight: 28,
        },
        prediction: {
          estimatedFuelUsage: 185.5,
          costEstimate: 1270475,
          efficiency: 'NORMAL',
        },
        confidence: 0.81,
        actualOutcome: {
          actualFuelUsage: 192,
          actualCost: 1315200,
        },
        isAccurate: true,
      },
    ];

    const selectedType = predictionTypes[i % predictionTypes.length];

    logs.push({
      predictionId: `PRED-2025-${String(i + 1).padStart(5, '0')}`,
      modelType: selectedType.modelType,
      modelVersion: '1.2.0',
      inputData: selectedType.input,
      prediction: selectedType.prediction,
      confidence: selectedType.confidence,
      contextData: {
        timestamp: timestamp.toISOString(),
        source: 'ML_SERVICE',
      },
      actualOutcome: selectedType.actualOutcome || null,
      isAccurate: selectedType.isAccurate || null,
      timestamp,
    });
  }

  const created = [];
  for (const log of logs) {
    const predictionLog = await prisma.predictionLog.create({ data: log });
    created.push(predictionLog);
  }

  return created;
};

export const seedRecommendationLogs = async (users) => {
  const logs = [];
  const now = new Date('2025-11-08T12:00:00Z');
  const admin = users.find((u) => u.role === 'ADMIN');

  const recommendations = [
    {
      recommendationId: 'REC-2025-0001',
      recommendation:
        'Tingkatkan jumlah truck aktif di shift 1 dari 4 menjadi 5 unit untuk mencapai target produksi',
      category: 'ALLOCATION',
      priority: 'HIGH',
      justification:
        'Analisis 7 hari terakhir menunjukkan shift 1 konsisten mencapai 92% target. Penambahan 1 truck dapat meningkatkan pencapaian menjadi 103%',
      contextData: {
        currentTrucks: 4,
        recommendedTrucks: 5,
        avgAchievement: 92,
        targetIncrease: 11,
      },
      estimatedImpact: 'Peningkatan produksi 550 ton per shift',
      estimatedSavings: 82500000,
      status: 'EXECUTED',
      executedBy: admin.id,
      executedAt: new Date('2025-11-07T08:00:00Z'),
      actualImpact: 'Produksi meningkat 520 ton per shift',
      effectiveness: 94.5,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      recommendationId: 'REC-2025-0002',
      recommendation: 'Jadwalkan maintenance preventif untuk truck HD-002 dalam 3 hari ke depan',
      category: 'MAINTENANCE',
      priority: 'MEDIUM',
      justification:
        'Total operating hours mencapai 14,800 jam. Maintenance terakhir 500 jam lalu. Prediksi risiko kerusakan meningkat 35% jika tidak dilakukan maintenance segera',
      contextData: {
        truckCode: 'HD-002',
        totalHours: 14800,
        hoursSinceLastMaintenance: 500,
        failureRiskIncrease: 35,
      },
      estimatedImpact: 'Mencegah potential downtime 12-24 jam',
      estimatedSavings: 45000000,
      status: 'PENDING',
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      recommendationId: 'REC-2025-0003',
      recommendation:
        'Ubah rute hauling dari LP-01 ke DP-03 menjadi melewati RS-04 untuk mengurangi cycle time',
      category: 'ROUTE_OPTIMIZATION',
      priority: 'MEDIUM',
      justification:
        'Rute alternatif RS-04 memiliki jarak 0.8 km lebih pendek dan kondisi jalan lebih baik, dapat menghemat 3-4 menit per trip',
      contextData: {
        currentRoute: 'RS-02',
        alternativeRoute: 'RS-04',
        timeSaving: 3.5,
        distanceDifference: -0.8,
      },
      estimatedImpact: 'Pengurangan cycle time 6% dan fuel consumption 4%',
      estimatedSavings: 15500000,
      status: 'EXECUTED',
      executedBy: admin.id,
      executedAt: new Date('2025-01-13T10:00:00Z'),
      actualImpact: 'Cycle time berkurang 5.8%, fuel consumption turun 3.5%',
      effectiveness: 91.0,
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      recommendationId: 'REC-2025-0004',
      recommendation: 'Implementasi fuel monitoring real-time untuk mengoptimalkan konsumsi BBM',
      category: 'FUEL_EFFICIENCY',
      priority: 'HIGH',
      justification:
        'Analisis menunjukkan variasi konsumsi BBM 15-20% antar operator pada rute yang sama, menandakan potensi inefisiensi',
      contextData: {
        avgVariation: 17.5,
        inefficientOperators: 3,
        potentialSaving: 12,
      },
      estimatedImpact: 'Penghematan konsumsi BBM 8-12%',
      estimatedSavings: 125000000,
      status: 'PENDING',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
    {
      recommendationId: 'REC-2025-0005',
      recommendation:
        'Tingkatkan frekuensi safety briefing menjadi 2x per shift di area dengan incident tinggi',
      category: 'SAFETY',
      priority: 'URGENT',
      justification:
        '3 incident dilaporkan dalam 5 hari terakhir, 2 diantaranya di lokasi yang sama (RS-01)',
      contextData: {
        recentIncidents: 3,
        highRiskArea: 'RS-01',
        incidentRate: 0.6,
      },
      estimatedImpact: 'Pengurangan incident rate 40-50%',
      estimatedSavings: 0,
      status: 'EXECUTED',
      executedBy: admin.id,
      executedAt: new Date('2025-01-14T06:00:00Z'),
      actualImpact: 'Belum ada incident sejak implementasi',
      effectiveness: 100.0,
      remarks: 'Monitoring terus dilakukan',
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      recommendationId: 'REC-2025-0006',
      recommendation: 'Alokasi excavator EXC-002 ke LP-03 untuk mengoptimalkan loading time',
      category: 'ALLOCATION',
      priority: 'MEDIUM',
      justification:
        'LP-03 mengalami queue time rata-rata 18 menit, tertinggi dibanding loading point lain',
      contextData: {
        currentQueueTime: 18,
        targetQueueTime: 8,
        loadingPointCode: 'LP-03',
      },
      estimatedImpact: 'Pengurangan queue time 55%',
      estimatedSavings: 22000000,
      status: 'PENDING',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
  ];

  for (const rec of recommendations) {
    logs.push(rec);
  }

  const created = [];
  for (const log of logs) {
    const recommendationLog = await prisma.recommendationLog.create({ data: log });
    created.push(recommendationLog);
  }

  return created;
};

export const seedChatbotInteractions = async (users) => {
  const interactions = [];
  const now = new Date('2025-11-08T12:00:00Z');
  const admin = users.find((u) => u.role === 'ADMIN');
  const supervisor = users.find((u) => u.role === 'SUPERVISOR');

  const sampleInteractions = [
    {
      sessionId: 'SESS-001',
      userId: admin.id,
      userQuery: 'Berapa total produksi hari ini?',
      queryIntent: 'PRODUCTION_QUERY',
      retrievedContext: {
        source: 'production_records',
        filters: { date: '2025-11-08' },
      },
      sqlQuery:
        "SELECT SUM(actualProduction) FROM production_records WHERE recordDate = '2025-11-08'",
      botResponse:
        'Total produksi hari ini adalah 13,450 ton dari target 13,500 ton (99.6% achievement)',
      responseSource: 'DATABASE',
      confidence: 0.95,
      responseTime: 245,
      tokensUsed: 156,
      userFeedback: 'POSITIVE',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      sessionId: 'SESS-002',
      userId: supervisor.id,
      userQuery: 'Truck mana yang sedang maintenance?',
      queryIntent: 'EQUIPMENT_STATUS_QUERY',
      retrievedContext: {
        source: 'trucks',
        filters: { status: 'MAINTENANCE' },
      },
      sqlQuery: "SELECT code, name FROM trucks WHERE status = 'MAINTENANCE'",
      botResponse:
        'Saat ini ada 1 truck sedang maintenance: HD-005 (Hino FM260JD-003) - Sedang maintenance major',
      responseSource: 'DATABASE',
      confidence: 0.98,
      responseTime: 189,
      tokensUsed: 134,
      userFeedback: 'POSITIVE',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      sessionId: 'SESS-003',
      userId: admin.id,
      userQuery: 'Apa rekomendasi untuk meningkatkan efisiensi?',
      queryIntent: 'RECOMMENDATION_QUERY',
      retrievedContext: {
        source: 'recommendation_logs',
        filters: { status: 'PENDING', priority: ['HIGH', 'URGENT'] },
      },
      sqlQuery:
        "SELECT * FROM recommendation_logs WHERE status = 'PENDING' AND priority IN ('HIGH', 'URGENT') ORDER BY priority DESC",
      botResponse:
        'Ada 2 rekomendasi prioritas tinggi:\n1. [URGENT] Tingkatkan frekuensi safety briefing\n2. [HIGH] Implementasi fuel monitoring real-time (estimasi saving Rp 125 juta)',
      responseSource: 'DATABASE',
      confidence: 0.92,
      responseTime: 312,
      tokensUsed: 287,
      userFeedback: 'POSITIVE',
      feedbackComment: 'Sangat membantu',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
    {
      sessionId: 'SESS-004',
      userId: supervisor.id,
      userQuery: 'Bagaimana kondisi cuaca saat ini?',
      queryIntent: 'WEATHER_QUERY',
      retrievedContext: {
        source: 'weather_logs',
        filters: { latest: true },
      },
      sqlQuery: 'SELECT * FROM weather_logs ORDER BY timestamp DESC LIMIT 1',
      botResponse:
        'Kondisi cuaca terkini: CERAH, suhu 29°C, humidity 72%, kecepatan angin 8 km/jam. Kondisi operasional AMAN.',
      responseSource: 'DATABASE',
      confidence: 0.96,
      responseTime: 198,
      tokensUsed: 145,
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    {
      sessionId: 'SESS-005',
      userId: admin.id,
      userQuery: 'Berapa biaya maintenance bulan ini?',
      queryIntent: 'COST_QUERY',
      retrievedContext: {
        source: 'maintenance_logs',
        filters: { month: '2025-01' },
      },
      sqlQuery:
        "SELECT SUM(cost) FROM maintenance_logs WHERE actualDate >= '2025-01-01' AND actualDate < '2025-02-01'",
      botResponse:
        'Total biaya maintenance bulan Januari 2025 adalah Rp 62,200,000 dari 6 aktivitas maintenance (4 completed, 2 in progress)',
      responseSource: 'DATABASE',
      confidence: 0.94,
      responseTime: 267,
      tokensUsed: 178,
      userFeedback: 'POSITIVE',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    },
  ];

  for (const interaction of sampleInteractions) {
    interactions.push(interaction);
  }

  const created = [];
  for (const interaction of interactions) {
    const chatbotInteraction = await prisma.chatbotInteraction.create({
      data: interaction,
    });
    created.push(chatbotInteraction);
  }

  return created;
};

export const seedSystemConfigs = async () => {
  const configs = [
    {
      configKey: 'TARGET_PRODUCTION_DAILY',
      configValue: '15000',
      dataType: 'NUMBER',
      category: 'PRODUCTION',
      description: 'Target produksi harian dalam ton',
      isActive: true,
    },
    {
      configKey: 'MAX_QUEUE_SIZE',
      configValue: '5',
      dataType: 'NUMBER',
      category: 'OPERATIONS',
      description: 'Maksimal panjang antrian di loading point',
      isActive: true,
    },
    {
      configKey: 'STANDARD_CYCLE_TIME',
      configValue: '45',
      dataType: 'NUMBER',
      category: 'OPERATIONS',
      description: 'Standard cycle time dalam menit',
      isActive: true,
    },
    {
      configKey: 'FUEL_PRICE_SOLAR',
      configValue: '6850',
      dataType: 'NUMBER',
      category: 'COST',
      description: 'Harga solar per liter dalam Rupiah',
      isActive: true,
    },
    {
      configKey: 'MAINTENANCE_INTERVAL_HOURS',
      configValue: '500',
      dataType: 'NUMBER',
      category: 'MAINTENANCE',
      description: 'Interval maintenance preventif dalam jam operasi',
      isActive: true,
    },
    {
      configKey: 'WEATHER_UPDATE_INTERVAL',
      configValue: '360',
      dataType: 'NUMBER',
      category: 'MONITORING',
      description: 'Interval update data cuaca dalam menit',
      isActive: true,
    },
    {
      configKey: 'SAFETY_BRIEFING_FREQUENCY',
      configValue: '2',
      dataType: 'NUMBER',
      category: 'SAFETY',
      description: 'Frekuensi safety briefing per shift',
      isActive: true,
    },
    {
      configKey: 'ALERT_DELAY_THRESHOLD',
      configValue: '20',
      dataType: 'NUMBER',
      category: 'ALERTS',
      description: 'Threshold delay dalam menit untuk trigger alert',
      isActive: true,
    },
    {
      configKey: 'COMPANY_NAME',
      configValue: 'PT Bara Sakti Mining',
      dataType: 'STRING',
      category: 'GENERAL',
      description: 'Nama perusahaan tambang',
      isActive: true,
    },
    {
      configKey: 'SITE_LOCATION',
      configValue: 'Kalimantan Utara',
      dataType: 'STRING',
      category: 'GENERAL',
      description: 'Lokasi site tambang',
      isActive: true,
    },
    {
      configKey: 'COAL_TYPE',
      configValue: 'Batubara Kalori Tinggi',
      dataType: 'STRING',
      category: 'PRODUCTION',
      description: 'Jenis batubara yang ditambang',
      isActive: true,
    },
    {
      configKey: 'ENABLE_PREDICTION',
      configValue: 'true',
      dataType: 'BOOLEAN',
      category: 'FEATURES',
      description: 'Enable/disable fitur prediksi ML',
      isActive: true,
    },
    {
      configKey: 'ENABLE_RECOMMENDATIONS',
      configValue: 'true',
      dataType: 'BOOLEAN',
      category: 'FEATURES',
      description: 'Enable/disable fitur rekomendasi otomatis',
      isActive: true,
    },
    {
      configKey: 'ENABLE_CHATBOT',
      configValue: 'true',
      dataType: 'BOOLEAN',
      category: 'FEATURES',
      description: 'Enable/disable fitur chatbot',
      isActive: true,
    },
  ];

  const created = [];
  for (const config of configs) {
    const systemConfig = await prisma.systemConfig.create({ data: config });
    created.push(systemConfig);
  }

  return created;
};
