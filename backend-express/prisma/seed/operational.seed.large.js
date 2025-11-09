import prisma from '../../src/config/database.js';

const weatherConditions = [
  'CERAH',
  'BERAWAN',
  'MENDUNG',
  'HUJAN_RINGAN',
  'HUJAN_SEDANG',
  'HUJAN_LEBAT',
];
const visibilities = ['EXCELLENT', 'GOOD', 'MODERATE', 'POOR'];
const shifts = ['SHIFT_1', 'SHIFT_2', 'SHIFT_3'];

export const seedDelayReasons = async () => {
  const reasons = [
    {
      code: 'DLY-001',
      category: 'WEATHER',
      name: 'Hujan Lebat',
      description: 'Kondisi hujan deras menghambat operasional',
    },
    {
      code: 'DLY-002',
      category: 'WEATHER',
      name: 'Kabut Tebal',
      description: 'Jarak pandang terbatas',
    },
    {
      code: 'DLY-003',
      category: 'EQUIPMENT',
      name: 'Ban Bocor',
      description: 'Kerusakan ban dump truck',
    },
    {
      code: 'DLY-004',
      category: 'EQUIPMENT',
      name: 'Mesin Overheat',
      description: 'Temperatur mesin berlebih',
    },
    {
      code: 'DLY-005',
      category: 'EQUIPMENT',
      name: 'Hydraulic Failure',
      description: 'Sistem hidrolik bermasalah',
    },
    {
      code: 'DLY-006',
      category: 'QUEUE',
      name: 'Antrian Panjang',
      description: 'Waiting time di loading point',
    },
    { code: 'DLY-007', category: 'ROAD', name: 'Jalan Rusak', description: 'Kondisi jalan buruk' },
    {
      code: 'DLY-008',
      category: 'ROAD',
      name: 'Jalan Licin',
      description: 'Permukaan jalan licin',
    },
    {
      code: 'DLY-009',
      category: 'OPERATOR',
      name: 'Operator Terlambat',
      description: 'Keterlambatan shift operator',
    },
    { code: 'DLY-010', category: 'FUEL', name: 'Refueling', description: 'Proses pengisian BBM' },
    {
      code: 'DLY-011',
      category: 'ADMINISTRATIVE',
      name: 'Dokumentasi',
      description: 'Proses administrasi',
    },
    {
      code: 'DLY-012',
      category: 'SAFETY',
      name: 'Safety Briefing',
      description: 'Briefing keselamatan',
    },
  ];

  const created = [];
  for (const data of reasons) {
    const reason = await prisma.delayReason.create({ data });
    created.push(reason);
  }
  return created;
};

export const seedWeatherLogs = async (miningSites) => {
  const weatherLogs = [];
  for (let i = 0; i < 600; i++) {
    const site = miningSites[i % miningSites.length];
    const daysAgo = Math.floor(i / 20);
    const timestamp = new Date(
      Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000
    );
    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const rainfall = condition.includes('HUJAN') ? Math.random() * 50 : 0;

    weatherLogs.push({
      timestamp,
      miningSiteId: site.id,
      condition,
      temperature: 24 + Math.random() * 10,
      humidity: 60 + Math.random() * 30,
      windSpeed: Math.random() * 20,
      windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      rainfall,
      visibility: visibilities[Math.floor(Math.random() * visibilities.length)],
      isOperational: rainfall < 30 && Math.random() > 0.1,
      riskLevel: rainfall > 20 ? 'HIGH' : rainfall > 10 ? 'MEDIUM' : 'LOW',
    });
  }

  const created = [];
  for (const data of weatherLogs) {
    const log = await prisma.weatherLog.create({ data });
    created.push(log);
  }
  return created;
};

export const seedMaintenanceLogs = async (trucks, excavators, supportEquipment) => {
  const maintenanceLogs = [];
  const types = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'OVERHAUL', 'INSPECTION'];
  const statuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  for (let i = 0; i < 600; i++) {
    const equipmentType = Math.random();
    let truckId = null,
      excavatorId = null,
      supportEquipmentId = null;

    if (equipmentType < 0.5) truckId = trucks[i % trucks.length].id;
    else if (equipmentType < 0.8) excavatorId = excavators[i % excavators.length].id;
    else supportEquipmentId = supportEquipment[i % supportEquipment.length].id;

    const daysAgo = Math.floor(Math.random() * 90);
    const actualDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const duration = status === 'COMPLETED' ? Math.floor(Math.random() * 48) : null;

    maintenanceLogs.push({
      maintenanceNumber: `MNT-${String(i + 1).padStart(6, '0')}`,
      truckId,
      excavatorId,
      supportEquipmentId,
      maintenanceType: types[Math.floor(Math.random() * types.length)],
      scheduledDate:
        Math.random() > 0.3 ? new Date(actualDate.getTime() - 3 * 24 * 60 * 60 * 1000) : null,
      actualDate,
      completionDate:
        status === 'COMPLETED' ? new Date(actualDate.getTime() + duration * 60 * 60 * 1000) : null,
      duration,
      cost: status === 'COMPLETED' ? 5000000 + Math.random() * 50000000 : null,
      description: `Maintenance ${types[Math.floor(Math.random() * types.length)]} ${i + 1}`,
      partsReplaced:
        status === 'COMPLETED'
          ? {
              parts: ['Filter Oli', 'Ban', 'Brake Pad'][Math.floor(Math.random() * 3)],
              quantity: Math.floor(Math.random() * 4) + 1,
            }
          : null,
      mechanicName: ['Agus', 'Budi', 'Dedi', 'Rudi'][Math.floor(Math.random() * 4)],
      status,
      downtimeHours: status === 'COMPLETED' ? duration : 0,
    });
  }

  const created = [];
  for (const data of maintenanceLogs) {
    const log = await prisma.maintenanceLog.create({ data });
    created.push(log);
  }
  return created;
};

export const seedFuelConsumptions = async (trucks, excavators, supportEquipment) => {
  const fuelConsumptions = [];
  const fuelTypes = ['SOLAR', 'PERTAMAX'];

  for (let i = 0; i < 600; i++) {
    const equipmentType = Math.random();
    let truckId = null,
      excavatorId = null,
      supportEquipmentId = null,
      fuelType = 'SOLAR';

    if (equipmentType < 0.5) {
      truckId = trucks[i % trucks.length].id;
      fuelType = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
    } else if (equipmentType < 0.8) {
      excavatorId = excavators[i % excavators.length].id;
    } else {
      supportEquipmentId = supportEquipment[i % supportEquipment.length].id;
    }

    const daysAgo = Math.floor(Math.random() * 30);
    const quantity = 100 + Math.random() * 400;
    const costPerLiter = fuelType === 'SOLAR' ? 6500 : 12000;

    fuelConsumptions.push({
      consumptionDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      truckId,
      excavatorId,
      supportEquipmentId,
      fuelType,
      quantity,
      costPerLiter,
      totalCost: quantity * costPerLiter,
      operatingHours: 8 + Math.random() * 8,
      distance: truckId ? 50 + Math.random() * 150 : null,
      fuelEfficiency: truckId ? 1.5 + Math.random() * 1.5 : null,
      fuelStation: ['Station-A', 'Station-B', 'Station-C'][Math.floor(Math.random() * 3)],
    });
  }

  const created = [];
  for (const data of fuelConsumptions) {
    const consumption = await prisma.fuelConsumption.create({ data });
    created.push(consumption);
  }
  return created;
};

export const seedProductionRecords = async (miningSites) => {
  const productionRecords = [];

  for (let i = 0; i < 600; i++) {
    const site = miningSites[i % miningSites.length];
    const daysAgo = Math.floor(i / 10);
    const shift = shifts[i % 3];
    const targetProduction = 5000 + Math.random() * 10000;
    const actualProduction = targetProduction * (0.7 + Math.random() * 0.4);

    productionRecords.push({
      recordDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      shift,
      miningSiteId: site.id,
      targetProduction,
      actualProduction,
      achievement: (actualProduction / targetProduction) * 100,
      avgCalori: 4800 + Math.random() * 1000,
      avgAshContent: 5 + Math.random() * 5,
      avgSulfur: 0.3 + Math.random() * 0.4,
      avgMoisture: 10 + Math.random() * 10,
      totalTrips: Math.floor(actualProduction / 25),
      totalDistance: actualProduction * (3 + Math.random() * 2),
      totalFuel: actualProduction * (2 + Math.random()),
      avgCycleTime: 25 + Math.random() * 15,
      trucksOperating: 15 + Math.floor(Math.random() * 25),
      trucksBreakdown: Math.floor(Math.random() * 3),
      excavatorsOperating: 3 + Math.floor(Math.random() * 5),
      excavatorsBreakdown: Math.random() > 0.8 ? 1 : 0,
      utilizationRate: 70 + Math.random() * 25,
      downtimeHours: Math.random() * 2,
    });
  }

  const created = [];
  for (const data of productionRecords) {
    const record = await prisma.productionRecord.create({ data });
    created.push(record);
  }
  return created;
};

export const seedIncidentReports = async (users, trucks, excavators, operators) => {
  const incidentReports = [];
  const types = [
    'ACCIDENT',
    'NEAR_MISS',
    'EQUIPMENT_FAILURE',
    'SPILL',
    'COLLISION',
    'SAFETY_VIOLATION',
  ];
  const severities = ['LOW', 'MEDIUM', 'HIGH'];
  const statuses = ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

  for (let i = 0; i < 600; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const incidentDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const hasTruck = Math.random() > 0.3;

    incidentReports.push({
      incidentNumber: `INC-${String(i + 1).padStart(6, '0')}`,
      incidentDate,
      reportDate: new Date(incidentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000),
      location: `Location-${Math.floor(Math.random() * 50) + 1}`,
      miningSiteCode: `SITE-${String(Math.floor(Math.random() * 600) + 1).padStart(4, '0')}`,
      truckId: hasTruck ? trucks[i % trucks.length].id : null,
      excavatorId: Math.random() > 0.7 ? excavators[i % excavators.length].id : null,
      reportedById: users[Math.floor(Math.random() * Math.min(100, users.length))].id,
      operatorId: hasTruck ? operators[i % operators.length].id : null,
      incidentType: types[Math.floor(Math.random() * types.length)],
      severity,
      description: `Incident ${i + 1} - ${types[Math.floor(Math.random() * types.length)]}`,
      rootCause: status !== 'REPORTED' ? 'Root cause analysis completed' : null,
      injuries: severity === 'HIGH' ? Math.floor(Math.random() * 2) : 0,
      fatalities: 0,
      equipmentDamage: severity !== 'LOW' ? 'Equipment damage reported' : null,
      productionLoss: severity !== 'LOW' ? Math.random() * 5000 : null,
      estimatedCost:
        severity === 'HIGH'
          ? 50000000 + Math.random() * 200000000
          : severity === 'MEDIUM'
            ? 10000000 + Math.random() * 40000000
            : Math.random() * 10000000,
      downtimeHours: severity !== 'LOW' ? Math.random() * 24 : 0,
      status,
      actionTaken: status !== 'REPORTED' ? 'Corrective action implemented' : null,
      preventiveMeasure: status === 'CLOSED' ? 'Preventive measures documented' : null,
    });
  }

  const created = [];
  for (const data of incidentReports) {
    const report = await prisma.incidentReport.create({ data });
    created.push(report);
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
  const haulingActivities = [];
  const statuses = ['COMPLETED', 'LOADING', 'HAULING', 'DUMPING', 'DELAYED', 'CANCELLED'];
  const roadConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];
  const supervisors = users.filter((u) => u.role === 'SUPERVISOR');

  for (let i = 0; i < 600; i++) {
    const truck = trucks[i % trucks.length];
    const excavator = excavators[i % excavators.length];
    const operator = operators[i % operators.length];
    const supervisor = supervisors[i % supervisors.length];
    const loadingPoint = loadingPoints[i % loadingPoints.length];
    const dumpingPoint = dumpingPoints[i % dumpingPoints.length];
    const roadSegment = roadSegments[i % roadSegments.length];
    const shift = shifts[i % 3];

    const daysAgo = Math.floor(i / 20);
    const baseTime =
      Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000;

    const queueDuration = Math.floor(Math.random() * 20);
    const loadingDuration = 8 + Math.floor(Math.random() * 10);
    const haulingDuration = 15 + Math.floor(Math.random() * 20);
    const dumpingDuration = 5 + Math.floor(Math.random() * 8);
    const returnDuration = 12 + Math.floor(Math.random() * 18);

    const queueStartTime = new Date(baseTime);
    const queueEndTime = new Date(baseTime + queueDuration * 60 * 1000);
    const loadingStartTime = queueEndTime;
    const loadingEndTime = new Date(loadingStartTime.getTime() + loadingDuration * 60 * 1000);
    const departureTime = loadingEndTime;
    const arrivalTime = new Date(departureTime.getTime() + haulingDuration * 60 * 1000);
    const dumpingStartTime = arrivalTime;
    const dumpingEndTime = new Date(dumpingStartTime.getTime() + dumpingDuration * 60 * 1000);
    const returnTime = new Date(dumpingEndTime.getTime() + returnDuration * 60 * 1000);

    const loadWeight = truck.capacity * (0.8 + Math.random() * 0.2);
    const targetWeight = truck.capacity;
    const distance = 2 + Math.random() * 5;
    const isDelayed = Math.random() > 0.85;
    const delayMinutes = isDelayed ? Math.floor(Math.random() * 30) : 0;
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    haulingActivities.push({
      activityNumber: `HA-${String(i + 1).padStart(7, '0')}`,
      truckId: truck.id,
      excavatorId: excavator.id,
      operatorId: operator.id,
      supervisorId: supervisor.id,
      loadingPointId: loadingPoint.id,
      dumpingPointId: dumpingPoint.id,
      roadSegmentId: roadSegment.id,
      shift,
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
      totalCycleTime:
        queueDuration + loadingDuration + haulingDuration + dumpingDuration + returnDuration,
      loadWeight,
      targetWeight,
      loadEfficiency: (loadWeight / targetWeight) * 100,
      distance,
      fuelConsumed: distance * 2 + Math.random() * 5,
      status,
      weatherCondition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      roadCondition: roadConditions[Math.floor(Math.random() * roadConditions.length)],
      isDelayed,
      delayMinutes,
      delayReasonId: isDelayed
        ? delayReasons[Math.floor(Math.random() * delayReasons.length)].id
        : null,
      delayReasonDetail: isDelayed ? 'Delay details noted' : null,
      predictedDelayRisk: Math.random() > 0.5 ? 'MEDIUM' : 'LOW',
      predictedDelayMinutes: Math.floor(Math.random() * 15),
    });
  }

  const created = [];
  for (const data of haulingActivities) {
    const activity = await prisma.haulingActivity.create({ data });
    created.push(activity);
  }
  return created;
};

export const seedQueueLogs = async (loadingPoints) => {
  const queueLogs = [];

  for (let i = 0; i < 600; i++) {
    const loadingPoint = loadingPoints[i % loadingPoints.length];
    const daysAgo = Math.floor(i / 30);
    const queueStartTime = new Date(
      Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000
    );
    const waitingTime = Math.floor(Math.random() * 30);

    queueLogs.push({
      loadingPointId: loadingPoint.id,
      queueLength: Math.floor(Math.random() * 8) + 1,
      queueStartTime,
      queueEndTime: new Date(queueStartTime.getTime() + waitingTime * 60 * 1000),
      waitingTime,
      timestamp: queueStartTime,
    });
  }

  const created = [];
  for (const data of queueLogs) {
    const log = await prisma.queueLog.create({ data });
    created.push(log);
  }
  return created;
};

export const seedEquipmentStatusLogs = async (trucks, excavators, supportEquipment) => {
  const equipmentStatusLogs = [];
  const truckStatuses = ['IDLE', 'HAULING', 'LOADING', 'DUMPING', 'MAINTENANCE', 'REFUELING'];
  const excavatorStatuses = ['ACTIVE', 'IDLE', 'MAINTENANCE', 'BREAKDOWN'];
  const supportStatuses = ['ACTIVE', 'IDLE', 'MAINTENANCE'];

  for (let i = 0; i < 600; i++) {
    const equipmentType = Math.random();
    let truckId = null,
      excavatorId = null,
      supportEquipmentId = null;
    let previousStatus, currentStatus;

    if (equipmentType < 0.5) {
      truckId = trucks[i % trucks.length].id;
      previousStatus = truckStatuses[Math.floor(Math.random() * truckStatuses.length)];
      currentStatus = truckStatuses[Math.floor(Math.random() * truckStatuses.length)];
    } else if (equipmentType < 0.8) {
      excavatorId = excavators[i % excavators.length].id;
      previousStatus = excavatorStatuses[Math.floor(Math.random() * excavatorStatuses.length)];
      currentStatus = excavatorStatuses[Math.floor(Math.random() * excavatorStatuses.length)];
    } else {
      supportEquipmentId = supportEquipment[i % supportEquipment.length].id;
      previousStatus = supportStatuses[Math.floor(Math.random() * supportStatuses.length)];
      currentStatus = supportStatuses[Math.floor(Math.random() * supportStatuses.length)];
    }

    const hoursAgo = Math.floor(Math.random() * 168);

    equipmentStatusLogs.push({
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      truckId,
      excavatorId,
      supportEquipmentId,
      previousStatus,
      currentStatus,
      statusReason: previousStatus !== currentStatus ? 'Status change recorded' : null,
      location: `Location-${Math.floor(Math.random() * 20) + 1}`,
      durationMinutes: Math.floor(Math.random() * 180),
    });
  }

  const created = [];
  for (const data of equipmentStatusLogs) {
    const log = await prisma.equipmentStatusLog.create({ data });
    created.push(log);
  }
  return created;
};

export const seedPredictionLogs = async () => {
  const predictionLogs = [];
  const modelTypes = [
    'DELAY_PREDICTION',
    'MAINTENANCE_PREDICTION',
    'PRODUCTION_FORECAST',
    'FUEL_OPTIMIZATION',
  ];

  for (let i = 0; i < 600; i++) {
    const modelType = modelTypes[Math.floor(Math.random() * modelTypes.length)];
    const hoursAgo = Math.floor(Math.random() * 720);

    predictionLogs.push({
      predictionId: `PRED-${String(i + 1).padStart(7, '0')}`,
      modelType,
      modelVersion: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}`,
      inputData: {
        feature1: Math.random() * 100,
        feature2: Math.random() * 50,
        feature3: Math.random() * 200,
      },
      prediction: {
        value: Math.random() * 100,
        category: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      },
      confidence: 0.6 + Math.random() * 0.35,
      contextData: {
        timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
        source: 'ML_MODEL',
      },
      actualOutcome: Math.random() > 0.3 ? { result: Math.random() * 100 } : null,
      isAccurate: Math.random() > 0.2,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    });
  }

  const created = [];
  for (const data of predictionLogs) {
    const log = await prisma.predictionLog.create({ data });
    created.push(log);
  }
  return created;
};

export const seedRecommendationLogs = async (users) => {
  const recommendationLogs = [];
  const categories = [
    'ALLOCATION',
    'MAINTENANCE',
    'ROUTE_OPTIMIZATION',
    'FUEL_EFFICIENCY',
    'SAFETY',
    'PRODUCTION',
  ];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const statuses = ['PENDING', 'EXECUTED', 'IGNORED'];
  const executors = users.filter((u) => ['ADMIN', 'SUPERVISOR'].includes(u.role));

  for (let i = 0; i < 600; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    recommendationLogs.push({
      recommendationId: `REC-${String(i + 1).padStart(7, '0')}`,
      recommendation: `Recommendation ${i + 1} - Optimize operational efficiency`,
      category: categories[Math.floor(Math.random() * categories.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      justification: 'Based on historical data analysis and current trends',
      contextData: {
        source: 'AI_ANALYSIS',
        dataPoints: Math.floor(Math.random() * 1000),
      },
      estimatedImpact: status !== 'PENDING' ? 'Positive impact on efficiency' : null,
      estimatedSavings: 5000000 + Math.random() * 50000000,
      status,
      executedBy: status === 'EXECUTED' ? executors[i % executors.length].id : null,
      executedAt:
        status === 'EXECUTED'
          ? new Date(timestamp.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000)
          : null,
      actualImpact: status === 'EXECUTED' ? 'Implemented successfully' : null,
      effectiveness: status === 'EXECUTED' ? 0.6 + Math.random() * 0.35 : null,
      timestamp,
    });
  }

  const created = [];
  for (const data of recommendationLogs) {
    const log = await prisma.recommendationLog.create({ data });
    created.push(log);
  }
  return created;
};

export const seedChatbotInteractions = async (users) => {
  const chatbotInteractions = [];
  const queryIntents = [
    'PRODUCTION_QUERY',
    'EQUIPMENT_STATUS',
    'FUEL_REPORT',
    'DELAY_ANALYSIS',
    'MAINTENANCE_SCHEDULE',
  ];
  const responseSources = ['DATABASE', 'ML_MODEL', 'RULE_ENGINE', 'HYBRID'];

  for (let i = 0; i < 600; i++) {
    const user = users[i % users.length];
    const hoursAgo = Math.floor(Math.random() * 720);
    const responseTime = 0.5 + Math.random() * 2.5;

    chatbotInteractions.push({
      sessionId: `SESSION-${String(i + 1).padStart(7, '0')}`,
      userId: user.id,
      userQuery: `Query ${i + 1} - Information request`,
      queryIntent: queryIntents[Math.floor(Math.random() * queryIntents.length)],
      retrievedContext: {
        documents: Math.floor(Math.random() * 10) + 1,
        relevance: 0.7 + Math.random() * 0.25,
      },
      sqlQuery: Math.random() > 0.5 ? 'SELECT * FROM hauling_activities WHERE ...' : null,
      botResponse: `Response to query ${i + 1} with relevant information`,
      responseSource: responseSources[Math.floor(Math.random() * responseSources.length)],
      confidence: 0.7 + Math.random() * 0.25,
      responseTime,
      tokensUsed: Math.floor(responseTime * 500),
      userFeedback: Math.random() > 0.3 ? (Math.random() > 0.5 ? 'POSITIVE' : 'NEGATIVE') : null,
      feedbackComment: Math.random() > 0.7 ? 'User feedback comment' : null,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    });
  }

  const created = [];
  for (const data of chatbotInteractions) {
    const interaction = await prisma.chatbotInteraction.create({ data });
    created.push(interaction);
  }
  return created;
};

export const seedSystemConfigs = async () => {
  const configs = [
    {
      configKey: 'MAX_QUEUE_SIZE',
      configValue: '10',
      dataType: 'INTEGER',
      category: 'OPERATIONS',
      description: 'Maximum queue size at loading points',
    },
    {
      configKey: 'FUEL_ALERT_THRESHOLD',
      configValue: '20',
      dataType: 'INTEGER',
      category: 'MAINTENANCE',
      description: 'Fuel alert threshold percentage',
    },
    {
      configKey: 'MAINTENANCE_INTERVAL_DAYS',
      configValue: '30',
      dataType: 'INTEGER',
      category: 'MAINTENANCE',
      description: 'Standard maintenance interval',
    },
    {
      configKey: 'MAX_TRUCK_CAPACITY',
      configValue: '40',
      dataType: 'FLOAT',
      category: 'OPERATIONS',
      description: 'Maximum truck capacity in tons',
    },
    {
      configKey: 'TARGET_PRODUCTION_DAILY',
      configValue: '50000',
      dataType: 'FLOAT',
      category: 'PRODUCTION',
      description: 'Daily production target',
    },
    {
      configKey: 'DELAY_THRESHOLD_MINUTES',
      configValue: '15',
      dataType: 'INTEGER',
      category: 'OPERATIONS',
      description: 'Delay alert threshold',
    },
    {
      configKey: 'WEATHER_CHECK_INTERVAL',
      configValue: '60',
      dataType: 'INTEGER',
      category: 'SAFETY',
      description: 'Weather check interval in minutes',
    },
    {
      configKey: 'EQUIPMENT_UTILIZATION_TARGET',
      configValue: '85',
      dataType: 'FLOAT',
      category: 'OPERATIONS',
      description: 'Target equipment utilization',
    },
    {
      configKey: 'FUEL_EFFICIENCY_TARGET',
      configValue: '2.5',
      dataType: 'FLOAT',
      category: 'OPERATIONS',
      description: 'Target fuel efficiency',
    },
    {
      configKey: 'SAFETY_INCIDENT_REPORT_DEADLINE',
      configValue: '24',
      dataType: 'INTEGER',
      category: 'SAFETY',
      description: 'Incident report deadline hours',
    },
    {
      configKey: 'CHATBOT_RESPONSE_TIMEOUT',
      configValue: '30',
      dataType: 'INTEGER',
      category: 'SYSTEM',
      description: 'Chatbot response timeout seconds',
    },
    {
      configKey: 'ML_MODEL_VERSION',
      configValue: 'v2.1',
      dataType: 'STRING',
      category: 'SYSTEM',
      description: 'Active ML model version',
    },
    {
      configKey: 'PREDICTION_CONFIDENCE_THRESHOLD',
      configValue: '0.75',
      dataType: 'FLOAT',
      category: 'ML',
      description: 'Minimum prediction confidence',
    },
    {
      configKey: 'AUTO_RECOMMENDATION_ENABLED',
      configValue: 'true',
      dataType: 'BOOLEAN',
      category: 'ML',
      description: 'Enable automatic recommendations',
    },
  ];

  const created = [];
  for (const data of configs) {
    const config = await prisma.systemConfig.create({ data });
    created.push(config);
  }
  return created;
};
