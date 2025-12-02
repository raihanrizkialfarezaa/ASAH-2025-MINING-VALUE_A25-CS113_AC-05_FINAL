const calculateLoadingTime = (truckCapacity, excavatorProductionRate) => {
  if (!truckCapacity || !excavatorProductionRate) return 0;
  const capacityKg = truckCapacity * 1000;
  const rateKgPerSecond = (excavatorProductionRate * 1000) / 60;
  const timeSeconds = capacityKg / rateKgPerSecond;
  return timeSeconds / 60;
};

const calculateTravelTime = (distance, speed) => {
  if (!distance || !speed) return 0;
  return (distance / speed) * 60;
};

const calculateCycleTime = (
  truckCapacity,
  excavatorRateLoading,
  excavatorRateDumping,
  distance,
  speed,
  weatherFactor = 1.0,
  roadFactor = 1.0
) => {
  const adjustedSpeed = speed * weatherFactor * roadFactor;
  const loadTime = calculateLoadingTime(truckCapacity, excavatorRateLoading);
  const haulTime = calculateTravelTime(distance, adjustedSpeed);
  const dumpTime = calculateLoadingTime(truckCapacity, excavatorRateDumping);
  const returnTime = calculateTravelTime(distance, adjustedSpeed);
  return loadTime + haulTime + dumpTime + returnTime;
};

const calculateTripsRequired = (targetTonnage, truckCapacity) => {
  if (!targetTonnage || !truckCapacity) return 0;
  return Math.ceil(targetTonnage / truckCapacity);
};

const calculateTotalDistance = (trips, distance) => {
  return trips * distance * 2;
};

const calculateFuelConsumption = (
  totalDistance,
  fuelConsumptionRate,
  weatherFactor = 1.0,
  loadFactor = 1.0
) => {
  const adjustedRate = fuelConsumptionRate * weatherFactor * loadFactor;
  return totalDistance * adjustedRate;
};

const getWeatherSpeedFactor = (weatherCondition) => {
  const weatherFactors = {
    CERAH: 1.0,
    BERAWAN: 0.95,
    HUJAN_RINGAN: 0.85,
    HUJAN_SEDANG: 0.75,
    HUJAN_LEBAT: 0.6,
    KABUT: 0.8,
    BADAI: 0.5,
  };
  return weatherFactors[weatherCondition] || 1.0;
};

const getRoadConditionFactor = (roadCondition) => {
  const roadFactors = {
    EXCELLENT: 1.0,
    GOOD: 0.95,
    FAIR: 0.85,
    POOR: 0.7,
    CRITICAL: 0.5,
  };
  return roadFactors[roadCondition] || 1.0;
};

const getWeatherFuelFactor = (riskLevel) => {
  const fuelFactors = {
    LOW: 1.0,
    MEDIUM: 1.15,
    HIGH: 1.3,
    CRITICAL: 1.5,
  };
  return fuelFactors[riskLevel] || 1.0;
};

const calculateOperatorCost = (operatorCount, dailySalary, hours = 8) => {
  return operatorCount * dailySalary * (hours / 24);
};

const calculateMaintenanceCost = (equipmentCount, maintenanceCostPerHour, hours) => {
  return equipmentCount * maintenanceCostPerHour * hours;
};

const calculateProductionMetrics = (params) => {
  const {
    targetTonnage,
    truckCapacity,
    excavatorRateLoading,
    excavatorRateDumping,
    distance,
    truckSpeed,
    weatherCondition,
    roadCondition,
    riskLevel,
    truckFuelRate,
    numTrucks,
    numExcavators,
    numOperators,
    operatorDailySalary,
    truckMaintenanceCost,
    excavatorMaintenanceCost,
    fuelPricePerLiter,
    coalPricePerTon,
  } = params;

  const weatherFactor = getWeatherSpeedFactor(weatherCondition);
  const roadFactor = getRoadConditionFactor(roadCondition);
  const fuelWeatherFactor = getWeatherFuelFactor(riskLevel);
  const loadFactor = 1.0 + 0.3;

  const trips = calculateTripsRequired(targetTonnage, truckCapacity);
  const cycleTime = calculateCycleTime(
    truckCapacity,
    excavatorRateLoading,
    excavatorRateDumping,
    distance,
    truckSpeed,
    weatherFactor,
    roadFactor
  );
  const totalDist = calculateTotalDistance(trips, distance);
  const totalFuel = calculateFuelConsumption(
    totalDist,
    truckFuelRate,
    fuelWeatherFactor,
    loadFactor
  );

  const totalTimeMinutes = trips * cycleTime;
  const totalTimeHours = totalTimeMinutes / 60;

  const fuelCost = totalFuel * fuelPricePerLiter;
  const operatorCost = calculateOperatorCost(numOperators, operatorDailySalary, totalTimeHours);
  const maintenanceCost =
    calculateMaintenanceCost(numTrucks, truckMaintenanceCost, totalTimeHours) +
    calculateMaintenanceCost(numExcavators, excavatorMaintenanceCost, totalTimeHours);
  const totalCost = fuelCost + operatorCost + maintenanceCost;

  const revenue = targetTonnage * coalPricePerTon;
  const profit = revenue - totalCost;

  return {
    trips,
    totalDistance: totalDist,
    totalFuel,
    avgCycleTime: cycleTime,
    totalTimeHours,
    costs: {
      fuel: fuelCost,
      operator: operatorCost,
      maintenance: maintenanceCost,
      total: totalCost,
    },
    revenue,
    profit,
    profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
  };
};

module.exports = {
  calculateLoadingTime,
  calculateTravelTime,
  calculateCycleTime,
  calculateTripsRequired,
  calculateTotalDistance,
  calculateFuelConsumption,
  getWeatherSpeedFactor,
  getRoadConditionFactor,
  getWeatherFuelFactor,
  calculateOperatorCost,
  calculateMaintenanceCost,
  calculateProductionMetrics,
};
