import React, { useEffect, useState } from 'react';
import { productionService, operatorService } from '../../services';
import { miningSiteService, loadingPointService, dumpingPointService, roadSegmentService } from '../../services/locationService';
import { truckService, excavatorService } from '../../services/equipmentService';
import { haulingService } from '../../services/haulingService';
import aiService from '../../services/aiService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Plus, Edit, Trash2, Eye, Calculator, RefreshCw, Search, ChevronDown, Truck, CheckCircle, AlertCircle, Package, MapPin, User, Navigation } from 'lucide-react';
import {
  calculateLoadingTime,
  calculateTravelTime,
  calculateCycleTime,
  calculateTripsRequired,
  calculateTotalDistance,
  calculateFuelConsumption,
  getWeatherSpeedFactor,
  getRoadConditionFactor,
  getWeatherFuelFactor,
  formatCurrency,
  formatTime,
} from '../../utils/productionCalculations';
import { authService } from '../../services/authService';

// Hauling Status Options
const HAULING_STATUS_OPTIONS = [
  { value: 'LOADING', label: 'Loading', color: 'bg-blue-100 text-blue-800' },
  { value: 'HAULING', label: 'Hauling', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DUMPING', label: 'Dumping', color: 'bg-sky-100 text-sky-800' },
  { value: 'RETURNING', label: 'Returning', color: 'bg-purple-100 text-purple-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const ProductionList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);

  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [statistics, setStatistics] = useState(null);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [miningSites, setMiningSites] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('recordDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Equipment State
  const [trucks, setTrucks] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState([]);
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [selectedTruckIds, setSelectedTruckIds] = useState([]);
  const [selectedExcavatorIds, setSelectedExcavatorIds] = useState([]);

  const [truckSearch, setTruckSearch] = useState('');
  const [excavatorSearch, setExcavatorSearch] = useState('');
  const [truckDropdownOpen, setTruckDropdownOpen] = useState(false);
  const [excavatorDropdownOpen, setExcavatorDropdownOpen] = useState(false);
  const [strategyFinancials, setStrategyFinancials] = useState(null);

  // Hauling Activity Info State - for displaying details of newly created hauling activities
  const [haulingActivityInfo, setHaulingActivityInfo] = useState(null);

  // Related Hauling Activities for Edit mode
  const [relatedHaulingActivities, setRelatedHaulingActivities] = useState([]);
  const [loadingHaulingActivities, setLoadingHaulingActivities] = useState(false);
  const [haulingAchievement, setHaulingAchievement] = useState(null);
  const [editingHaulingId, setEditingHaulingId] = useState(null);
  const [haulingEditForm, setHaulingEditForm] = useState({ loadWeight: '', status: '' });

  const [isManualMode, setIsManualMode] = useState(false);
  const [manualHaulingList, setManualHaulingList] = useState([]);
  const [filteredRoadSegments, setFilteredRoadSegments] = useState([]);
  const [filteredLoadingPoints, setFilteredLoadingPoints] = useState([]);
  const [filteredDumpingPoints, setFilteredDumpingPoints] = useState([]);
  const [siteAutoFillInfo, setSiteAutoFillInfo] = useState(null);

  const [formData, setFormData] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    shift: 'PAGI',
    miningSiteId: '',
    targetProduction: '',
    actualProduction: '',
    haulDistance: '',
    weatherCondition: 'CERAH',
    roadCondition: 'GOOD',
    riskLevel: 'LOW',
    avgCalori: '',
    avgAshContent: '',
    avgSulfur: '',
    avgMoisture: '',
    totalTrips: '',
    totalDistance: '',
    totalFuel: '',
    avgCycleTime: '',
    trucksOperating: '',
    trucksBreakdown: '',
    excavatorsOperating: '',
    excavatorsBreakdown: '',
    utilizationRate: '',
    downtimeHours: '',
    remarks: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [prodRes, siteRes, truckRes, excRes, opRes, lpRes, dpRes, rsRes] = await Promise.all([
          productionService.getAll({ page: pagination.page, limit: pagination.limit }),
          miningSiteService.getAll(),
          truckService.getAll({ limit: 1000 }),
          excavatorService.getAll({ limit: 1000 }),
          operatorService.getAll({ limit: 1000 }),
          loadingPointService.getAll({ limit: 1000 }),
          dumpingPointService.getAll({ limit: 1000 }),
          roadSegmentService.getAll({ limit: 1000 }),
        ]);

        setProductions(prodRes.data || []);
        setPagination((prev) => ({ ...prev, totalPages: prodRes.meta?.totalPages || 1 }));
        setMiningSites(Array.isArray(siteRes.data) ? siteRes.data : []);
        setTrucks(Array.isArray(truckRes.data) ? truckRes.data : []);
        setExcavators(Array.isArray(excRes.data) ? excRes.data : []);
        setOperators(Array.isArray(opRes.data) ? opRes.data : []);
        setLoadingPoints(Array.isArray(lpRes.data) ? lpRes.data : []);
        setDumpingPoints(Array.isArray(dpRes.data) ? dpRes.data : []);
        setRoadSegments(Array.isArray(rsRes.data) ? rsRes.data : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchFilteredProductions = async () => {
      setLoading(true);
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          sortBy,
          sortOrder,
        };
        if (searchQuery) params.search = searchQuery;
        if (filterSiteId) params.miningSiteId = filterSiteId;
        if (filterShift) params.shift = filterShift;
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;

        const prodRes = await productionService.getAll(params);
        setProductions(prodRes.data || []);
        setPagination((prev) => ({ ...prev, totalPages: prodRes.meta?.totalPages || 1 }));
      } catch (error) {
        console.error('Failed to fetch filtered productions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchFilteredProductions();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [pagination.page, pagination.limit, searchQuery, filterSiteId, filterShift, filterStartDate, filterEndDate, sortBy, sortOrder]);

  const isAiPopulated = React.useRef(false);

  useEffect(() => {
    const checkForStrategyImplementation = async () => {
      const strategyData = sessionStorage.getItem('selectedStrategy');
      if (strategyData) {
        try {
          const parsedStrategy = JSON.parse(strategyData);
          const {
            recommendation,
            useHaulingData,
            haulingAggregated,
            equipmentAllocation,
            haulingActivityIds,
            haulingResult,
            haulingApplied,
            miningSiteId: strategyMiningSiteId,
            weatherCondition: strategyWeatherCondition,
            roadCondition: strategyRoadCondition,
            shift: strategyShift,
          } = parsedStrategy;
          const raw = recommendation.raw_data || {};

          const effectiveMiningSiteId = strategyMiningSiteId || recommendation.miningSiteId || raw.miningSiteId || null;
          const effectiveWeatherCondition = strategyWeatherCondition || recommendation.weatherCondition || haulingAggregated?.weatherCondition || raw.weatherCondition || 'CERAH';
          const effectiveRoadCondition = strategyRoadCondition || recommendation.roadCondition || haulingAggregated?.roadCondition || raw.roadCondition || 'GOOD';
          const effectiveShift = strategyShift || recommendation.shift || haulingAggregated?.shift || raw.shift || 'SHIFT_1';

          if (haulingApplied && haulingResult) {
            setHaulingActivityInfo({
              createdActivities: haulingResult.createdActivities || [],
              createdCount: haulingResult.createdCount || 0,
              action: haulingResult.action || 'create',
              activityIds: haulingActivityIds || [],
              equipmentAllocation: equipmentAllocation,
              aggregatedData: haulingAggregated,
              strategyRank: recommendation.rank,
              strategyObjective: raw.strategy_objective || recommendation.strategy_objective || 'AI Recommended',
            });

            if (haulingActivityIds && haulingActivityIds.length > 0) {
              try {
                const response = await haulingService.getByIds(haulingActivityIds);
                if (response.data && response.data.length > 0) {
                  const existingHaulings = response.data.map((ha) => ({
                    tempId: ha.id,
                    id: ha.id,
                    isExisting: true,
                    truckId: ha.truckId,
                    excavatorId: ha.excavatorId,
                    operatorId: ha.operatorId,
                    loadingPointId: ha.loadingPointId,
                    dumpingPointId: ha.dumpingPointId,
                    roadSegmentId: ha.roadSegmentId || '',
                    truckCode: ha.truck?.code || 'N/A',
                    truckCapacity: ha.truck?.capacity || 0,
                    excavatorCode: ha.excavator?.code || 'N/A',
                    excavatorModel: ha.excavator?.name || '',
                    operatorName: ha.operator?.user?.fullName || ha.operator?.employeeNumber || 'N/A',
                    loadingPointName: ha.loadingPoint?.name || 'N/A',
                    dumpingPointName: ha.dumpingPoint?.name || 'N/A',
                    roadSegmentName: ha.roadSegment?.name || 'N/A',
                    roadSegmentDistance: ha.roadSegment?.distance || ha.distance || 3,
                    loadWeight: ha.loadWeight !== null ? ha.loadWeight.toString() : '',
                    targetWeight: ha.targetWeight || 30,
                    status: ha.status || 'LOADING',
                    distance: ha.distance || 3,
                    activityNumber: ha.activityNumber,
                  }));
                  setManualHaulingList(existingHaulings);
                  setIsManualMode(true);

                  const achievementRes = await haulingService.calculateAchievement([], [], null, null, haulingActivityIds);
                  if (achievementRes.data) {
                    setHaulingAchievement(achievementRes.data);
                  }
                }
              } catch (fetchError) {
                console.error('[ProductionList] Failed to fetch hauling activities:', fetchError);
                setIsManualMode(false);
                setManualHaulingList([]);
              }
            }
          } else {
            setIsManualMode(false);
            setManualHaulingList([]);
          }

          if (useHaulingData && haulingAggregated) {
            console.log('[ProductionList] Using actual hauling data for production creation');
            console.log('[ProductionList] haulingAggregated:', haulingAggregated);

            const totalTonase = parseFloat(haulingAggregated.total_tonase) || 0;
            const totalTrips = parseInt(haulingAggregated.total_trips) || 1;
            const totalDistance = parseFloat(haulingAggregated.total_distance_km) || 0;
            const trucksOperating = parseInt(haulingAggregated.trucks_operating) || 1;
            const excavatorsOperating = parseInt(haulingAggregated.excavators_operating) || 1;
            const avgLoadWeight = parseFloat(haulingAggregated.avg_load_weight) || 28.5;

            let totalFuel = parseFloat(haulingAggregated.total_fuel_liter) || 0;
            if (totalFuel <= 0 && totalDistance > 0) {
              const calcParams = haulingAggregated.calculation_params || {};
              const truckFuelRate = parseFloat(calcParams.truck_fuel_rate_lkm) || 1.0;
              totalFuel = totalDistance * truckFuelRate * 1.3;
              console.log('[ProductionList] Calculated totalFuel from distance:', totalFuel);
            }

            let avgCycleTimeMinutes = parseFloat(haulingAggregated.avg_cycle_time_minutes) || 0;
            if (avgCycleTimeMinutes <= 0 && totalDistance > 0) {
              const oneWayDistance = totalTrips > 0 ? totalDistance / totalTrips / 2 : totalDistance / 2;
              const loadingTime = (avgLoadWeight / 50) * 8;
              const travelTimeLoaded = (oneWayDistance / 20) * 60;
              const dumpingTime = 3;
              const returnTime = (oneWayDistance / 30) * 60;
              avgCycleTimeMinutes = loadingTime + travelTimeLoaded + dumpingTime + returnTime;
              console.log('[ProductionList] Calculated avgCycleTime from distance:', avgCycleTimeMinutes);
            }

            let utilizationRate = parseFloat(haulingAggregated.utilization_rate_percent) || 0;
            if (utilizationRate <= 0 && avgCycleTimeMinutes > 0) {
              const shiftHours = 8;
              const totalOperatingMinutes = avgCycleTimeMinutes * trucksOperating;
              const availableMinutes = shiftHours * 60;
              utilizationRate = Math.min((totalOperatingMinutes / availableMinutes) * 100, 100);
              console.log('[ProductionList] Calculated utilizationRate:', utilizationRate);
            }

            if (equipmentAllocation) {
              const truckIds = equipmentAllocation.truck_ids || [];
              const excavatorIds = equipmentAllocation.excavator_ids || [];

              const matchingTrucks = trucks.filter((t) => truckIds.includes(t.id));
              const matchingExcavators = excavators.filter((e) => excavatorIds.includes(e.id));

              isAiPopulated.current = true;

              setSelectedTruckIds(matchingTrucks.length > 0 ? matchingTrucks.map((t) => t.id) : truckIds.slice(0, trucksOperating));
              setSelectedExcavatorIds(matchingExcavators.length > 0 ? matchingExcavators.map((e) => e.id) : excavatorIds.slice(0, excavatorsOperating));
            } else {
              isAiPopulated.current = true;
            }

            const avgDistancePerTrip = totalTrips > 0 ? totalDistance / totalTrips : totalDistance;
            const haulDistance = avgDistancePerTrip / 2;

            if (recommendation.financial_breakdown) {
              setStrategyFinancials(recommendation.financial_breakdown);
            }

            let remarks = `AI Strategy #${recommendation.rank || ''} - ${raw.strategy_objective || recommendation.strategy_objective || 'From Hauling Data'}`;
            remarks += ` | Source: ${haulingActivityIds?.length || totalTrips} hauling activities`;
            if (recommendation.vessel_info?.name) {
              remarks += ` | Vessel: ${recommendation.vessel_info.name}`;
            }

            const validMiningSiteId = effectiveMiningSiteId && miningSites.find((s) => s.id === effectiveMiningSiteId) ? effectiveMiningSiteId : miningSites[0]?.id || '';

            setFormData({
              recordDate: new Date().toISOString().split('T')[0],
              shift: effectiveShift,
              miningSiteId: validMiningSiteId,
              targetProduction: totalTonase.toFixed(2),
              actualProduction: totalTonase.toFixed(2),
              haulDistance: haulDistance.toFixed(2),
              weatherCondition: effectiveWeatherCondition,
              roadCondition: effectiveRoadCondition,
              riskLevel: raw.delay_risk_level || 'LOW',
              avgCalori: '',
              avgAshContent: '',
              avgSulfur: '',
              avgMoisture: '',
              totalTrips: totalTrips.toString(),
              totalDistance: totalDistance.toFixed(2),
              totalFuel: totalFuel.toFixed(2),
              avgCycleTime: avgCycleTimeMinutes.toFixed(2),
              trucksOperating: trucksOperating.toString(),
              trucksBreakdown: '0',
              excavatorsOperating: excavatorsOperating.toString(),
              excavatorsBreakdown: '0',
              utilizationRate: utilizationRate.toFixed(2),
              downtimeHours: '0',
              remarks: remarks,
            });

            setModalMode('create');
            setShowModal(true);

            sessionStorage.removeItem('selectedStrategy');
            return;
          }

          // Fallback to simulation-based creation (existing logic)
          const truckCount = parseInt(raw.alokasi_truk) || parseInt(recommendation.skenario?.alokasi_truk) || 0;
          const excavatorCount = parseInt(raw.jumlah_excavator) || parseInt(recommendation.skenario?.jumlah_excavator) || 0;

          const shiftRaw = raw.shift || recommendation.skenario?.shift || effectiveShift || 'SHIFT_1';
          const shiftMapping = {
            PAGI: 'SHIFT_1',
            SIANG: 'SHIFT_2',
            MALAM: 'SHIFT_3',
            SHIFT_1: 'SHIFT_1',
            SHIFT_2: 'SHIFT_2',
            SHIFT_3: 'SHIFT_3',
          };
          const shiftValue = shiftMapping[shiftRaw] || 'SHIFT_1';

          const totalTonase = parseFloat(raw.total_tonase) || parseFloat(recommendation.total_tonase) || 0;
          const totalTrips = parseFloat(raw.jumlah_siklus_selesai) || parseFloat(recommendation.jumlah_siklus_selesai) || 0;
          const totalDistance = parseFloat(raw.total_distance_km) || parseFloat(recommendation.total_distance_km) || 0;
          const totalFuel = parseFloat(raw.total_bbm_liter) || parseFloat(recommendation.total_bbm_liter) || 0;
          const avgCycleTimeHours = parseFloat(raw.total_cycle_time_hours) || parseFloat(recommendation.total_cycle_time_hours) || 0;
          const avgCycleTimeMinutes = totalTrips > 0 ? (avgCycleTimeHours / totalTrips) * 60 : 0;

          const utilizationRate = totalTrips > 0 ? ((totalTrips * avgCycleTimeMinutes) / (8 * 60)) * 100 : 0;

          if (truckCount > 0 && excavatorCount > 0) {
            const availableTrucksForAI = trucks.filter((t) => t.isActive !== false && (t.status === 'IDLE' || t.status === 'STANDBY')).slice(0, truckCount);
            const availableExcavatorsForAI = excavators.filter((e) => e.isActive !== false && (e.status === 'ACTIVE' || e.status === 'IDLE' || e.status === 'STANDBY')).slice(0, excavatorCount);

            const selectedTrucks = availableTrucksForAI.length > 0 ? availableTrucksForAI : trucks.filter((t) => t.isActive !== false).slice(0, truckCount);
            const selectedExcavators = availableExcavatorsForAI.length > 0 ? availableExcavatorsForAI : excavators.filter((e) => e.isActive !== false).slice(0, excavatorCount);

            isAiPopulated.current = true;

            setSelectedTruckIds(selectedTrucks.map((t) => t.id));
            setSelectedExcavatorIds(selectedExcavators.map((e) => e.id));

            const roadDistance = parseFloat(raw.distance_km) || (totalTrips > 0 ? totalDistance / totalTrips / 2 : 0);

            // Store financial breakdown for preview
            if (recommendation.financial_breakdown) {
              setStrategyFinancials(recommendation.financial_breakdown);
            }

            // Build vessel info for remarks
            let vesselInfo = '';
            if (recommendation.vessel_info) {
              const vi = recommendation.vessel_info;
              if (vi.name) {
                vesselInfo = ` | Vessel: ${vi.name}`;
                if (vi.plannedQuantity) vesselInfo += ` (${vi.plannedQuantity}T)`;
                if (vi.enforced) vesselInfo += ' [ENFORCED]';
              }
            }

            // Build route info for remarks
            let routeInfo = '';
            if (recommendation.skenario?.route) {
              routeInfo = ` | Route: ${recommendation.skenario.route}`;
            }

            const fallbackMiningSiteId = effectiveMiningSiteId && miningSites.find((s) => s.id === effectiveMiningSiteId) ? effectiveMiningSiteId : miningSites[0]?.id || '';

            setFormData({
              recordDate: new Date().toISOString().split('T')[0],
              shift: shiftValue,
              miningSiteId: fallbackMiningSiteId,
              targetProduction: totalTonase.toFixed(2),
              actualProduction: totalTonase.toFixed(2),
              haulDistance: roadDistance.toFixed(2),
              weatherCondition: effectiveWeatherCondition,
              roadCondition: effectiveRoadCondition,
              riskLevel: raw.delay_risk_level || recommendation.shipment_analysis?.delay_risk_level || 'LOW',
              avgCalori: '',
              avgAshContent: '',
              avgSulfur: '',
              avgMoisture: '',
              totalTrips: totalTrips.toString(),
              totalDistance: totalDistance.toFixed(2),
              totalFuel: totalFuel.toFixed(2),
              avgCycleTime: avgCycleTimeMinutes.toFixed(2),
              trucksOperating: truckCount.toString(),
              trucksBreakdown: '0',
              excavatorsOperating: excavatorCount.toString(),
              excavatorsBreakdown: '0',
              utilizationRate: utilizationRate.toFixed(2),
              downtimeHours: '0',
              remarks: `AI Strategy #${recommendation.rank || ''} - ${raw.strategy_objective || recommendation.strategy_objective || 'Optimal Configuration'} (Simulated)${vesselInfo}${routeInfo}`,
            });

            setModalMode('create');
            setShowModal(true);

            sessionStorage.removeItem('selectedStrategy');
          }
        } catch (error) {
          console.error('Error parsing strategy data:', error);
          sessionStorage.removeItem('selectedStrategy');
        }
      }
    };

    if (trucks.length > 0 && excavators.length > 0 && miningSites.length > 0) {
      checkForStrategyImplementation();
    }
  }, [trucks, excavators, miningSites]);

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const res = await productionService.getStatistics();
        setStatistics(res.data || null);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
        setStatistics(null);
      }
    };
    loadStatistics();
  }, []);

  const fetchProductions = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      };
      if (searchQuery) params.search = searchQuery;
      if (filterSiteId) params.miningSiteId = filterSiteId;
      if (filterShift) params.shift = filterShift;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const res = await productionService.getAll(params);
      setProductions(res.data || []);
      setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
    } catch (error) {
      console.error('Failed to fetch production records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMiningSiteChange = (siteId) => {
    const siteRoadSegments = roadSegments.filter((rs) => rs.miningSiteId === siteId && rs.isActive !== false);
    const siteLoadingPoints = loadingPoints.filter((lp) => lp.miningSiteId === siteId && lp.isActive !== false);
    const siteDumpingPoints = dumpingPoints.filter((dp) => dp.miningSiteId === siteId && dp.isActive !== false);

    setFilteredRoadSegments(siteRoadSegments);
    setFilteredLoadingPoints(siteLoadingPoints);
    setFilteredDumpingPoints(siteDumpingPoints);

    let autoFilledData = { miningSiteId: siteId };
    let autoFillDetails = { roadCount: siteRoadSegments.length, lpCount: siteLoadingPoints.length, dpCount: siteDumpingPoints.length };

    if (siteRoadSegments.length > 0) {
      const avgDistance = siteRoadSegments.reduce((sum, rs) => sum + (rs.distance || 0), 0) / siteRoadSegments.length;
      autoFilledData.haulDistance = avgDistance.toFixed(2);
      autoFillDetails.avgDistance = avgDistance;

      const roadConditionCounts = {};
      siteRoadSegments.forEach((rs) => {
        const cond = rs.roadCondition || 'GOOD';
        roadConditionCounts[cond] = (roadConditionCounts[cond] || 0) + 1;
      });
      const dominantRoadCondition = Object.entries(roadConditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'GOOD';
      autoFilledData.roadCondition = dominantRoadCondition;
      autoFillDetails.roadCondition = dominantRoadCondition;

      const riskMapping = { EXCELLENT: 'LOW', GOOD: 'LOW', FAIR: 'MEDIUM', POOR: 'HIGH', CRITICAL: 'CRITICAL' };
      autoFilledData.riskLevel = riskMapping[dominantRoadCondition] || 'LOW';
      autoFillDetails.riskLevel = autoFilledData.riskLevel;

      const weatherByRisk = { LOW: 'CERAH', MEDIUM: 'BERAWAN', HIGH: 'HUJAN_RINGAN', CRITICAL: 'HUJAN_SEDANG' };
      autoFilledData.weatherCondition = weatherByRisk[autoFilledData.riskLevel] || 'CERAH';
      autoFillDetails.weatherCondition = autoFilledData.weatherCondition;
    }

    setSiteAutoFillInfo(autoFillDetails);
    setFormData((prev) => ({ ...prev, ...autoFilledData }));

    if (manualHaulingList.length > 0) {
      const defaultRoad = siteRoadSegments[0];
      const defaultLP = siteLoadingPoints[0];
      const defaultDP = siteDumpingPoints[0];

      setManualHaulingList((prev) =>
        prev.map((h) => ({
          ...h,
          roadSegmentId: defaultRoad?.id || '',
          roadSegmentName: defaultRoad?.name || 'N/A',
          roadSegmentDistance: defaultRoad?.distance || h.distance,
          distance: defaultRoad?.distance || h.distance,
          loadingPointId: defaultLP?.id || h.loadingPointId,
          loadingPointName: defaultLP?.name || h.loadingPointName,
          dumpingPointId: defaultDP?.id || h.dumpingPointId,
          dumpingPointName: defaultDP?.name || h.dumpingPointName,
        }))
      );
    }
  };

  const calculateMetrics = () => {
    if (isAiPopulated.current) {
      isAiPopulated.current = false;
      return;
    }

    if (!formData.targetProduction || !formData.haulDistance || selectedTruckIds.length === 0 || selectedExcavatorIds.length === 0) {
      return;
    }

    const targetProd = parseFloat(formData.targetProduction);
    const distance = parseFloat(formData.haulDistance);

    const activeTrucks = trucks.filter((t) => selectedTruckIds.includes(t.id));
    const activeExcavators = excavators.filter((e) => selectedExcavatorIds.includes(e.id));

    if (activeTrucks.length === 0 || activeExcavators.length === 0) return;

    const avgTruckCapacity = activeTrucks.reduce((sum, t) => sum + (t.capacity || 0), 0) / activeTrucks.length;
    const avgTruckSpeed = activeTrucks.reduce((sum, t) => sum + (t.averageSpeed || 30), 0) / activeTrucks.length;
    const avgTruckFuelRate = activeTrucks.reduce((sum, t) => sum + (t.fuelConsumption || 1), 0) / activeTrucks.length;

    const totalExcavatorRateLoading = activeExcavators.reduce((sum, e) => sum + (e.productionRate || 5), 0);
    const totalExcavatorRateDumping = totalExcavatorRateLoading * 0.8;

    const weatherFactor = getWeatherSpeedFactor(formData.weatherCondition);
    const roadFactor = getRoadConditionFactor(formData.roadCondition);
    const fuelWeatherFactor = getWeatherFuelFactor(formData.riskLevel);
    const loadFactor = 1.3;

    const trips = calculateTripsRequired(targetProd, avgTruckCapacity);
    const cycleTime = calculateCycleTime(avgTruckCapacity, totalExcavatorRateLoading, totalExcavatorRateDumping, distance, avgTruckSpeed, weatherFactor, roadFactor);
    const totalDist = calculateTotalDistance(trips, distance);
    const totalFuelCons = calculateFuelConsumption(totalDist, avgTruckFuelRate, fuelWeatherFactor, loadFactor);

    setFormData((prev) => ({
      ...prev,
      totalTrips: trips,
      totalDistance: totalDist.toFixed(2),
      totalFuel: totalFuelCons.toFixed(2),
      avgCycleTime: cycleTime.toFixed(2),
      trucksOperating: activeTrucks.length,
      excavatorsOperating: activeExcavators.length,
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateMetrics();
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.targetProduction, formData.haulDistance, formData.weatherCondition, formData.roadCondition, formData.riskLevel, selectedTruckIds, selectedExcavatorIds]);

  const handleCreate = () => {
    setModalMode('create');
    setSelectedTruckIds([]);
    setSelectedExcavatorIds([]);
    setTruckSearch('');
    setExcavatorSearch('');
    setStrategyFinancials(null);
    setHaulingActivityInfo(null);
    setFilteredRoadSegments([]);
    setFilteredLoadingPoints([]);
    setFilteredDumpingPoints([]);
    setSiteAutoFillInfo(null);
    setFormData({
      recordDate: new Date().toISOString().split('T')[0],
      shift: 'SHIFT_1',
      miningSiteId: '',
      targetProduction: '',
      actualProduction: '',
      haulDistance: '',
      weatherCondition: 'CERAH',
      roadCondition: 'GOOD',
      riskLevel: 'LOW',
      avgCalori: '',
      avgAshContent: '',
      avgSulfur: '',
      avgMoisture: '',
      totalTrips: '',
      totalDistance: '',
      totalFuel: '',
      avgCycleTime: '',
      trucksOperating: '',
      trucksBreakdown: '',
      excavatorsOperating: '',
      excavatorsBreakdown: '',
      utilizationRate: '',
      downtimeHours: '',
      remarks: '',
    });
    setIsManualMode(true);
    setManualHaulingList([]);
    setShowModal(true);
  };

  const handleAddManualHauling = () => {
    if (selectedTruckIds.length === 0 || selectedExcavatorIds.length === 0) {
      alert('Pilih minimal 1 truck dan 1 excavator untuk menambah hauling');
      return;
    }

    if (!formData.miningSiteId) {
      alert('Pilih Mining Site terlebih dahulu untuk menambah hauling');
      return;
    }

    const activeLoadingPoints = filteredLoadingPoints.length > 0 ? filteredLoadingPoints : loadingPoints.filter((lp) => lp.isActive !== false);
    const activeDumpingPoints = filteredDumpingPoints.length > 0 ? filteredDumpingPoints : dumpingPoints.filter((dp) => dp.isActive !== false);
    const activeRoadSegments = filteredRoadSegments.length > 0 ? filteredRoadSegments : roadSegments.filter((rs) => rs.isActive !== false);

    if (activeLoadingPoints.length === 0) {
      alert('Tidak ada loading point aktif untuk site ini. Silakan pilih site lain atau tambahkan loading point.');
      return;
    }
    if (activeDumpingPoints.length === 0) {
      alert('Tidak ada dumping point aktif untuk site ini. Silakan pilih site lain atau tambahkan dumping point.');
      return;
    }
    if (operators.length === 0) {
      alert('Tidak ada operator tersedia. Silakan tambahkan operator terlebih dahulu.');
      return;
    }

    const usedTruckIds = manualHaulingList.map((h) => h.truckId);
    const usedExcavatorIds = manualHaulingList.map((h) => h.excavatorId);

    const availableTruckId = selectedTruckIds.find((id) => !usedTruckIds.includes(id)) || selectedTruckIds[manualHaulingList.length % selectedTruckIds.length];
    const availableExcavatorId = selectedExcavatorIds.find((id) => !usedExcavatorIds.includes(id)) || selectedExcavatorIds[manualHaulingList.length % selectedExcavatorIds.length];

    const selectedTruck = trucks.find((t) => t.id === availableTruckId);
    const selectedExcavator = excavators.find((e) => e.id === availableExcavatorId);

    const shiftMapping = { SHIFT_1: 'SHIFT_1', PAGI: 'SHIFT_1', SHIFT_2: 'SHIFT_2', SIANG: 'SHIFT_2', SHIFT_3: 'SHIFT_3', MALAM: 'SHIFT_3' };
    const currentShift = shiftMapping[formData.shift] || 'SHIFT_1';
    const shiftOperators = operators.filter((op) => op.shift === currentShift && op.status === 'ACTIVE');
    const activeOperators = shiftOperators.length > 0 ? shiftOperators : operators.filter((op) => op.status === 'ACTIVE');
    const defaultOperator = activeOperators[manualHaulingList.length % Math.max(activeOperators.length, 1)] || operators[0];

    const defaultLoadingPoint = activeLoadingPoints[manualHaulingList.length % activeLoadingPoints.length];
    const defaultDumpingPoint = activeDumpingPoints[manualHaulingList.length % activeDumpingPoints.length];
    const defaultRoadSegment = activeRoadSegments[manualHaulingList.length % Math.max(activeRoadSegments.length, 1)];

    const numHaulings = manualHaulingList.length + 1;
    const targetWeight = formData.targetProduction ? parseFloat(formData.targetProduction) / numHaulings : 30;

    const newHauling = {
      tempId: Date.now(),
      truckId: availableTruckId,
      excavatorId: availableExcavatorId,
      operatorId: defaultOperator?.id || '',
      loadingPointId: defaultLoadingPoint?.id || '',
      dumpingPointId: defaultDumpingPoint?.id || '',
      roadSegmentId: defaultRoadSegment?.id || '',
      truckCode: selectedTruck?.code || 'N/A',
      truckCapacity: selectedTruck?.capacity || 0,
      excavatorCode: selectedExcavator?.code || 'N/A',
      excavatorModel: selectedExcavator?.model || '',
      operatorName: defaultOperator?.user?.fullName || defaultOperator?.employeeNumber || 'N/A',
      loadingPointName: defaultLoadingPoint?.name || 'N/A',
      dumpingPointName: defaultDumpingPoint?.name || 'N/A',
      roadSegmentName: defaultRoadSegment?.name || 'N/A',
      roadSegmentDistance: defaultRoadSegment?.distance || parseFloat(formData.haulDistance) || 3,
      loadWeight: '',
      targetWeight: targetWeight,
      status: 'LOADING',
      distance: defaultRoadSegment?.distance || parseFloat(formData.haulDistance) || 3,
    };

    console.log('[Production] Adding manual hauling:', newHauling);

    setManualHaulingList((prev) => {
      const updated = [...prev, newHauling];
      const newTargetPerHauling = formData.targetProduction ? parseFloat(formData.targetProduction) / updated.length : 30;
      return updated.map((h) => ({ ...h, targetWeight: newTargetPerHauling }));
    });
  };

  const handleRemoveManualHauling = async (tempId) => {
    const haulingToRemove = manualHaulingList.find((h) => h.tempId === tempId);

    if (haulingToRemove?.isExisting && haulingToRemove.id) {
      if (!window.confirm('Hapus hauling activity ini dari database? Tindakan ini tidak dapat dibatalkan.')) {
        return;
      }

      try {
        await haulingService.delete(haulingToRemove.id);
        setRelatedHaulingActivities((prev) => prev.filter((a) => a.id !== haulingToRemove.id));
      } catch (error) {
        console.error('Failed to delete hauling activity:', error);
        alert('Gagal menghapus hauling activity: ' + (error.response?.data?.message || error.message));
        return;
      }
    }

    setManualHaulingList((prev) => {
      const filtered = prev.filter((h) => h.tempId !== tempId);
      if (filtered.length > 0 && formData.targetProduction) {
        const newTargetPerHauling = parseFloat(formData.targetProduction) / filtered.length;
        return filtered.map((h) => ({ ...h, targetWeight: h.isExisting ? h.targetWeight : newTargetPerHauling }));
      }
      return filtered;
    });
  };

  const handleUpdateManualHauling = async (tempId, field, value) => {
    const hauling = manualHaulingList.find((h) => h.tempId === tempId);

    // Auto-complete status when loadWeight >= targetWeight
    let autoCompleteStatus = false;
    if (field === 'loadWeight' && value !== '') {
      const loadWeightNum = parseFloat(value);
      const targetWeightNum = parseFloat(hauling?.targetWeight) || 30;
      if (loadWeightNum >= targetWeightNum) {
        autoCompleteStatus = true;
      }
    }

    if (hauling?.isExisting && hauling.id && (field === 'loadWeight' || field === 'status')) {
      try {
        const updateData = {};
        if (field === 'loadWeight') {
          updateData.loadWeight = value !== '' ? parseFloat(value) : null;
          // Auto-set status to COMPLETED if load >= target
          if (autoCompleteStatus) {
            updateData.status = 'COMPLETED';
          }
        } else if (field === 'status') {
          updateData.status = value;
        }
        await haulingService.quickUpdate(hauling.id, updateData);

        if (selectedProduction?.equipmentAllocation) {
          const allocation = selectedProduction.equipmentAllocation;
          const haulingActivityIds = allocation.hauling_activity_ids || [];
          if (haulingActivityIds.length > 0) {
            const achievementRes = await haulingService.calculateAchievement(allocation.truck_ids || [], allocation.excavator_ids || [], null, null, haulingActivityIds);
            if (achievementRes.data) {
              setHaulingAchievement(achievementRes.data);
              // Auto-update actualProduction from completed haulings
              const completedLoadWeight = achievementRes.data.totalLoadWeight || 0;
              setFormData((prev) => ({
                ...prev,
                actualProduction: completedLoadWeight > 0 ? completedLoadWeight.toString() : prev.actualProduction,
              }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to update hauling activity:', error);
      }
    }

    setManualHaulingList((prev) =>
      prev.map((h) => {
        if (h.tempId !== tempId) return h;

        const updated = { ...h, [field]: value };

        if (field === 'truckId') {
          const truck = trucks.find((t) => t.id === value);
          updated.truckCode = truck?.code || 'N/A';
          updated.truckCapacity = truck?.capacity || 0;
        } else if (field === 'excavatorId') {
          const exc = excavators.find((e) => e.id === value);
          updated.excavatorCode = exc?.code || 'N/A';
          updated.excavatorModel = exc?.model || '';
        } else if (field === 'operatorId') {
          const op = operators.find((o) => o.id === value);
          updated.operatorName = op?.user?.fullName || op?.employeeNumber || 'N/A';
        } else if (field === 'loadingPointId') {
          const lp = loadingPoints.find((l) => l.id === value);
          updated.loadingPointName = lp?.name || 'N/A';
        } else if (field === 'dumpingPointId') {
          const dp = dumpingPoints.find((d) => d.id === value);
          updated.dumpingPointName = dp?.name || 'N/A';
        } else if (field === 'roadSegmentId') {
          const rs = roadSegments.find((r) => r.id === value);
          updated.roadSegmentName = rs?.name || 'N/A';
          updated.roadSegmentDistance = rs?.distance || updated.distance;
          updated.distance = rs?.distance || updated.distance;
        }

        // Auto-complete status when loadWeight >= targetWeight (for local state)
        if (field === 'loadWeight' && value !== '') {
          const loadWeightNum = parseFloat(value);
          const targetWeightNum = parseFloat(updated.targetWeight) || 30;
          if (loadWeightNum >= targetWeightNum) {
            updated.status = 'COMPLETED';
          }
        }

        return updated;
      })
    );
  };

  const handleEdit = async (production) => {
    setModalMode('edit');
    setSelectedProduction(production);
    setHaulingActivityInfo(null);
    setRelatedHaulingActivities([]);
    setHaulingAchievement(null);
    setEditingHaulingId(null);
    setIsManualMode(true);
    setManualHaulingList([]);
    setSiteAutoFillInfo(null);

    if (production.miningSiteId) {
      const siteRoadSegments = roadSegments.filter((rs) => rs.miningSiteId === production.miningSiteId && rs.isActive !== false);
      const siteLoadingPoints = loadingPoints.filter((lp) => lp.miningSiteId === production.miningSiteId && lp.isActive !== false);
      const siteDumpingPoints = dumpingPoints.filter((dp) => dp.miningSiteId === production.miningSiteId && dp.isActive !== false);
      setFilteredRoadSegments(siteRoadSegments);
      setFilteredLoadingPoints(siteLoadingPoints);
      setFilteredDumpingPoints(siteDumpingPoints);
    } else {
      setFilteredRoadSegments([]);
      setFilteredLoadingPoints([]);
      setFilteredDumpingPoints([]);
    }

    if (production.equipmentAllocation) {
      const allocation = production.equipmentAllocation;
      const truckIds = allocation.truck_ids || [];
      const excavatorIds = allocation.excavator_ids || [];
      setSelectedTruckIds(truckIds);
      setSelectedExcavatorIds(excavatorIds);
    } else {
      setSelectedTruckIds([]);
      setSelectedExcavatorIds([]);
    }

    setFormData({
      recordDate: new Date(production.recordDate).toISOString().split('T')[0],
      shift: production.shift,
      miningSiteId: production.miningSiteId || '',
      targetProduction: production.targetProduction || '',
      actualProduction: production.actualProduction || '',
      haulDistance: production.totalDistance && production.totalTrips ? (production.totalDistance / production.totalTrips / 2).toFixed(2) : '',
      weatherCondition: production.weatherCondition || 'CERAH',
      roadCondition: production.roadCondition || 'GOOD',
      riskLevel: production.riskLevel || 'LOW',
      avgCalori: production.avgCalori || '',
      avgAshContent: production.avgAshContent || '',
      avgSulfur: production.avgSulfur || '',
      avgMoisture: production.avgMoisture || '',
      totalTrips: production.totalTrips || '',
      totalDistance: production.totalDistance || '',
      totalFuel: production.totalFuel || '',
      avgCycleTime: production.avgCycleTime || '',
      trucksOperating: production.trucksOperating || '',
      trucksBreakdown: production.trucksBreakdown || '',
      excavatorsOperating: production.excavatorsOperating || '',
      excavatorsBreakdown: production.excavatorsBreakdown || '',
      utilizationRate: production.utilizationRate || '',
      downtimeHours: production.downtimeHours || '',
      remarks: production.remarks || '',
    });
    setShowModal(true);

    if (production.equipmentAllocation) {
      const allocation = production.equipmentAllocation;
      const haulingActivityIds = allocation.hauling_activity_ids || [];

      if (haulingActivityIds.length > 0) {
        setLoadingHaulingActivities(true);
        try {
          const response = await haulingService.getByIds(haulingActivityIds);

          if (response.data && response.data.length > 0) {
            setRelatedHaulingActivities(response.data);

            const existingHaulings = response.data.map((ha) => ({
              tempId: ha.id,
              id: ha.id,
              isExisting: true,
              truckId: ha.truckId,
              excavatorId: ha.excavatorId,
              operatorId: ha.operatorId,
              loadingPointId: ha.loadingPointId,
              dumpingPointId: ha.dumpingPointId,
              roadSegmentId: ha.roadSegmentId || '',
              truckCode: ha.truck?.code || 'N/A',
              truckCapacity: ha.truck?.capacity || 0,
              excavatorCode: ha.excavator?.code || 'N/A',
              excavatorModel: ha.excavator?.name || '',
              operatorName: ha.operator?.user?.fullName || ha.operator?.employeeNumber || 'N/A',
              loadingPointName: ha.loadingPoint?.name || 'N/A',
              dumpingPointName: ha.dumpingPoint?.name || 'N/A',
              roadSegmentName: ha.roadSegment?.name || 'N/A',
              roadSegmentDistance: ha.roadSegment?.distance || ha.distance || 3,
              loadWeight: ha.loadWeight !== null ? ha.loadWeight.toString() : '',
              targetWeight: ha.targetWeight || 30,
              status: ha.status || 'LOADING',
              distance: ha.distance || 3,
              activityNumber: ha.activityNumber,
            }));
            setManualHaulingList(existingHaulings);

            const haulingActivityIds = allocation.hauling_activity_ids || [];
            const truckIds = allocation.truck_ids || [];
            const excavatorIds = allocation.excavator_ids || [];
            const recordDate = new Date(production.recordDate);
            const startDate = new Date(recordDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(recordDate);
            endDate.setHours(23, 59, 59, 999);

            const achievementRes = await haulingService.calculateAchievement(truckIds, excavatorIds, startDate.toISOString(), endDate.toISOString(), haulingActivityIds);
            if (achievementRes.data) {
              setHaulingAchievement(achievementRes.data);
              // Auto-update actualProduction from total load weight
              const totalLoadWeight = achievementRes.data.totalLoadWeight || 0;
              if (totalLoadWeight > 0) {
                setFormData((prev) => ({
                  ...prev,
                  actualProduction: totalLoadWeight.toString(),
                }));
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch related hauling activities:', error);
        } finally {
          setLoadingHaulingActivities(false);
        }
      }
    }
  };

  // Handle quick edit for hauling activity
  const handleStartHaulingEdit = (activity) => {
    setEditingHaulingId(activity.id);
    setHaulingEditForm({
      loadWeight: activity.loadWeight !== null ? activity.loadWeight.toString() : '',
      status: activity.status,
    });
  };

  const handleCancelHaulingEdit = () => {
    setEditingHaulingId(null);
    setHaulingEditForm({ loadWeight: '', status: '' });
  };

  const handleSaveHaulingEdit = async (activityId) => {
    try {
      const updateData = {};
      if (haulingEditForm.loadWeight !== '') {
        updateData.loadWeight = parseFloat(haulingEditForm.loadWeight);
        // Auto-complete status when load >= target
        const activity = relatedHaulingActivities.find((a) => a.id === activityId);
        if (activity && updateData.loadWeight >= (activity.targetWeight || 30)) {
          updateData.status = 'COMPLETED';
        }
      }
      if (haulingEditForm.status) {
        updateData.status = haulingEditForm.status;
      }

      const response = await haulingService.quickUpdate(activityId, updateData);

      if (response.data) {
        // Update local state
        setRelatedHaulingActivities((prev) => prev.map((a) => (a.id === activityId ? response.data : a)));

        // Recalculate achievement
        if (selectedProduction?.equipmentAllocation) {
          const allocation = selectedProduction.equipmentAllocation;
          const haulingActivityIds = allocation.hauling_activity_ids || [];
          const recordDate = new Date(selectedProduction.recordDate);
          const startDate = new Date(recordDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(recordDate);
          endDate.setHours(23, 59, 59, 999);

          const achievementRes = await haulingService.calculateAchievement(allocation.truck_ids || [], allocation.excavator_ids || [], startDate.toISOString(), endDate.toISOString(), haulingActivityIds);
          if (achievementRes.data) {
            setHaulingAchievement(achievementRes.data);
            // Auto-update actualProduction from total load weight
            const totalLoadWeight = achievementRes.data.totalLoadWeight || 0;
            if (totalLoadWeight > 0) {
              setFormData((prev) => ({
                ...prev,
                actualProduction: totalLoadWeight.toString(),
              }));
            }
          }
        }

        setEditingHaulingId(null);
        setHaulingEditForm({ loadWeight: '', status: '' });
      }
    } catch (error) {
      console.error('Failed to update hauling activity:', error);
      alert('Gagal mengupdate hauling activity');
    }
  };

  const handleView = async (production) => {
    setSelectedProduction(production);
    setModalMode('view');
    setRelatedHaulingActivities([]);
    setHaulingAchievement(null);
    setShowModal(true);

    if (production.equipmentAllocation) {
      const allocation = production.equipmentAllocation;
      const haulingActivityIds = allocation.hauling_activity_ids || [];

      if (haulingActivityIds.length > 0) {
        setLoadingHaulingActivities(true);
        try {
          const [activitiesRes, achievementRes] = await Promise.all([
            haulingService.getByIds(haulingActivityIds),
            haulingService.calculateAchievement(allocation.truck_ids || [], allocation.excavator_ids || [], null, null, haulingActivityIds),
          ]);

          if (activitiesRes.data) {
            setRelatedHaulingActivities(activitiesRes.data);
          }
          if (achievementRes.data) {
            setHaulingAchievement(achievementRes.data);
          }
        } catch (error) {
          console.error('Failed to fetch hauling data for view:', error);
        } finally {
          setLoadingHaulingActivities(false);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const existingRecord = productions.find((p) => new Date(p.recordDate).toISOString().split('T')[0] === formData.recordDate && p.shift === formData.shift && p.miningSiteId === formData.miningSiteId);
        if (existingRecord) {
          const siteName = miningSites.find((s) => s.id === formData.miningSiteId)?.name || formData.miningSiteId;
          const confirmed = window.confirm(`Production record untuk tanggal ${formData.recordDate}, shift ${formData.shift}, dan site ${siteName} sudah ada.\n\nData yang ada akan di-UPDATE dengan data baru ini.\n\nLanjutkan?`);
          if (!confirmed) {
            return;
          }
        }
      }

      let createdHaulingActivityIds = [];
      let existingHaulingActivityIds = [];
      let manualHaulingTotalFuel = 0;
      let manualHaulingTotalDistance = 0;
      let manualHaulingTotalTrips = 0;

      if (isManualMode && manualHaulingList.length > 0) {
        const existingHaulings = manualHaulingList.filter((h) => h.isExisting && h.id);
        const newHaulings = manualHaulingList.filter((h) => !h.isExisting);

        existingHaulingActivityIds = existingHaulings.map((h) => h.id);

        console.log('[Production] Existing haulings:', existingHaulings.length, ', New haulings:', newHaulings.length);

        const invalidHaulings = newHaulings.filter((h) => !h.truckId || !h.excavatorId || !h.operatorId || !h.loadingPointId || !h.dumpingPointId);

        if (invalidHaulings.length > 0) {
          alert(`Ada ${invalidHaulings.length} hauling baru yang belum lengkap data-nya (Truck, Excavator, Operator, Loading Point, Dumping Point wajib diisi)`);
          return;
        }

        const newTruckIds = newHaulings.map((h) => h.truckId);
        const duplicateTrucks = newTruckIds.filter((id, idx) => newTruckIds.indexOf(id) !== idx);
        if (duplicateTrucks.length > 0) {
          const duplicateTruckCodes = [...new Set(duplicateTrucks)].map((id) => trucks.find((t) => t.id === id)?.code || id).join(', ');
          alert(`Truck ${duplicateTruckCodes} dipilih lebih dari sekali. Setiap truck hanya boleh digunakan untuk satu hauling activity dalam batch yang sama.`);
          return;
        }

        manualHaulingTotalTrips = manualHaulingList.length;

        for (const hauling of manualHaulingList) {
          manualHaulingTotalDistance += (parseFloat(hauling.distance) || 3) * 2;
        }

        if (newHaulings.length > 0) {
          try {
            const results = [];
            for (let index = 0; index < newHaulings.length; index++) {
              const hauling = newHaulings[index];
              const shiftValue = formData.shift === 'PAGI' ? 'SHIFT_1' : formData.shift === 'SIANG' ? 'SHIFT_2' : formData.shift === 'MALAM' ? 'SHIFT_3' : formData.shift;

              const haulingPayload = {
                truckId: hauling.truckId,
                excavatorId: hauling.excavatorId,
                operatorId: hauling.operatorId,
                loadingPointId: hauling.loadingPointId,
                dumpingPointId: hauling.dumpingPointId,
                shift: shiftValue,
                targetWeight: parseFloat(hauling.targetWeight) || 30,
                distance: parseFloat(hauling.distance) || 3,
              };

              if (hauling.roadSegmentId) {
                haulingPayload.roadSegmentId = hauling.roadSegmentId;
              }
              if (hauling.loadWeight && parseFloat(hauling.loadWeight) > 0) {
                haulingPayload.loadWeight = parseFloat(hauling.loadWeight);
              }
              if (hauling.status) {
                haulingPayload.status = hauling.status;
              }

              console.log(`[Production] Creating new hauling #${index + 1}:`, haulingPayload);
              const result = await haulingService.create(haulingPayload);
              results.push(result);
            }

            console.log('[Production] New hauling activities created:', results);

            results.forEach((res) => {
              const activityData = res?.data || res;
              if (activityData?.id) {
                createdHaulingActivityIds.push(activityData.id);
                manualHaulingTotalFuel += parseFloat(activityData.fuelConsumed) || 0;
              }
            });
          } catch (haulingError) {
            console.error('[Production] Failed to create hauling activities:', haulingError);
            const errorMsg = haulingError.response?.data?.message || haulingError.message || 'Unknown error';
            alert(`Gagal membuat hauling activities: ${errorMsg}\n\nProduction record tidak akan disimpan.`);
            return;
          }
        }

        for (const hauling of existingHaulings) {
          if (hauling.loadWeight && parseFloat(hauling.loadWeight) > 0) {
            try {
              await haulingService.quickUpdate(hauling.id, {
                loadWeight: parseFloat(hauling.loadWeight),
                status: hauling.status,
              });
            } catch (error) {
              console.error('Failed to update existing hauling:', error);
            }
          }
        }
      }

      const payload = {
        recordDate: `${formData.recordDate}T00:00:00.000Z`,
        shift: formData.shift,
        miningSiteId: formData.miningSiteId,
        targetProduction: parseFloat(formData.targetProduction),
        actualProduction: parseFloat(formData.actualProduction),
      };

      const fields = [
        'avgCalori',
        'avgAshContent',
        'avgSulfur',
        'avgMoisture',
        'totalTrips',
        'totalDistance',
        'totalFuel',
        'avgCycleTime',
        'trucksOperating',
        'trucksBreakdown',
        'excavatorsOperating',
        'excavatorsBreakdown',
        'utilizationRate',
        'downtimeHours',
        'remarks',
      ];

      fields.forEach((field) => {
        if (formData[field]) {
          payload[field] = field === 'remarks' ? formData[field] : parseFloat(formData[field]);
        }
      });

      if (isManualMode && manualHaulingList.length > 0) {
        payload.totalTrips = manualHaulingTotalTrips;
        payload.totalDistance = manualHaulingTotalDistance;
        if (manualHaulingTotalFuel > 0) {
          payload.totalFuel = manualHaulingTotalFuel;
        }

        const allHaulingIds = [...existingHaulingActivityIds, ...createdHaulingActivityIds];

        payload.equipmentAllocation = {
          truck_ids: [...new Set(manualHaulingList.map((h) => h.truckId))],
          excavator_ids: [...new Set(manualHaulingList.map((h) => h.excavatorId))],
          operator_ids: [...new Set(manualHaulingList.map((h) => h.operatorId).filter(Boolean))],
          truck_count: new Set(manualHaulingList.map((h) => h.truckId)).size,
          excavator_count: new Set(manualHaulingList.map((h) => h.excavatorId)).size,
          hauling_activity_ids: allHaulingIds,
          created_from: haulingActivityInfo?.activityIds?.length > 0 ? 'ai_hauling_applied' : modalMode === 'edit' ? 'manual_edit' : 'manual',
        };

        payload.trucksOperating = new Set(manualHaulingList.map((h) => h.truckId)).size;
        payload.excavatorsOperating = new Set(manualHaulingList.map((h) => h.excavatorId)).size;

        if (modalMode === 'create' && !haulingActivityInfo?.activityIds?.length) {
          payload.remarks = `Manual hauling: ${manualHaulingList.length} trips | IDs: ${allHaulingIds.slice(0, 3).join(', ')}${allHaulingIds.length > 3 ? '...' : ''}`;
        }
      } else if (selectedTruckIds.length > 0 || selectedExcavatorIds.length > 0) {
        // AI mode - include hauling_activity_ids if available from AI recommendation
        const aiHaulingIds = haulingActivityInfo?.activityIds || [];

        payload.equipmentAllocation = {
          truck_ids: selectedTruckIds,
          excavator_ids: selectedExcavatorIds,
          truck_count: selectedTruckIds.length,
          excavator_count: selectedExcavatorIds.length,
          hauling_activity_ids: aiHaulingIds,
          created_from: aiHaulingIds.length > 0 ? 'ai_hauling_applied' : formData.remarks?.includes('hauling activities') ? 'hauling_data' : 'ai_simulation',
        };

        console.log('[Production] AI mode equipmentAllocation:', {
          truck_ids: selectedTruckIds.length,
          excavator_ids: selectedExcavatorIds.length,
          hauling_activity_ids: aiHaulingIds.length,
          created_from: payload.equipmentAllocation.created_from,
        });
      }

      if (modalMode === 'create') {
        await productionService.create(payload);
      } else {
        await productionService.update(selectedProduction.id, payload);
      }

      setShowModal(false);
      fetchProductions();
    } catch (error) {
      console.error('Failed to save production record:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save production record. Please check your input.';
      alert(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this production record?')) {
      try {
        await productionService.delete(id);
        fetchProductions();
      } catch (error) {
        console.error('Failed to delete production record:', error);
      }
    }
  };

  const toggleTruckSelection = (id) => {
    setSelectedTruckIds((prev) => (prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]));
  };

  const toggleExcavatorSelection = (id) => {
    setSelectedExcavatorIds((prev) => (prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]));
  };

  const availableTrucks = trucks.filter((truck) => truck.isActive !== false && (truck.status === 'IDLE' || truck.status === 'STANDBY' || selectedTruckIds.includes(truck.id)));

  const availableExcavators = excavators.filter((exc) => exc.isActive !== false && (exc.status === 'ACTIVE' || exc.status === 'IDLE' || exc.status === 'STANDBY' || selectedExcavatorIds.includes(exc.id)));

  const filteredTrucks = availableTrucks.filter((truck) => truck.code.toLowerCase().includes(truckSearch.toLowerCase()) || truck.model?.toLowerCase().includes(truckSearch.toLowerCase()));

  const filteredExcavators = availableExcavators.filter((exc) => exc.code.toLowerCase().includes(excavatorSearch.toLowerCase()) || exc.model?.toLowerCase().includes(excavatorSearch.toLowerCase()));

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Production Records</h1>
          <p className="text-slate-400 mt-1">Track and manage daily production activities</p>
        </div>
        {canEdit && (
          <button onClick={handleCreate} className="btn-primary flex items-center space-x-2 shadow-lg hover:shadow-xl transition-shadow">
            <Plus size={20} />
            <span>Add Production Record</span>
          </button>
        )}
      </div>

      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-sky-900/20 to-sky-950/20 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Production</p>
                <p className="text-3xl font-bold mt-1 text-slate-100">{(statistics.totalProduction / 1000000)?.toFixed(2) || 0}M</p>
                <p className="text-slate-500 text-xs mt-1">ton</p>
              </div>
              <div className="bg-sky-500/20 p-3 rounded-lg">
                <Package size={28} className="text-sky-400" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-900/20 to-cyan-950/20 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Average Achievement</p>
                <p className="text-3xl font-bold mt-1 text-slate-100">{statistics.avgAchievement?.toFixed(1) || 0}%</p>
                <p className="text-slate-500 text-xs mt-1">performance</p>
              </div>
              <div className="bg-cyan-500/20 p-3 rounded-lg">
                <CheckCircle size={28} className="text-cyan-400" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-sky-900/20 to-sky-950/20 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Trips</p>
                <p className="text-3xl font-bold mt-1 text-slate-100">{(statistics.totalTrips / 1000)?.toFixed(1) || 0}K</p>
                <p className="text-slate-500 text-xs mt-1">hauling trips</p>
              </div>
              <div className="bg-sky-500/20 p-3 rounded-lg">
                <Truck size={28} className="text-sky-400" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-900/20 to-blue-950/20 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Avg Cycle Time</p>
                <p className="text-3xl font-bold mt-1 text-slate-100">{statistics.avgCycleTime?.toFixed(1) || 0}</p>
                <p className="text-slate-500 text-xs mt-1">minutes</p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <RefreshCw size={28} className="text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-100">Production History</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search site, remarks..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  style={{ backgroundColor: '#0f172a' }}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-48 text-slate-200 placeholder-slate-500"
                />
              </div>
              <select
                value={filterSiteId}
                onChange={(e) => {
                  setFilterSiteId(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                style={{ backgroundColor: '#0f172a' }}
                className="text-sm border border-slate-700/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-200"
              >
                <option value="">All Sites</option>
                {miningSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.code} - {site.name}
                  </option>
                ))}
              </select>
              <select
                value={filterShift}
                onChange={(e) => {
                  setFilterShift(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                style={{ backgroundColor: '#0f172a' }}
                className="text-sm border border-slate-700/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-200"
              >
                <option value="">All Shifts</option>
                <option value="SHIFT_1">Shift 1 (Pagi)</option>
                <option value="SHIFT_2">Shift 2 (Siang)</option>
                <option value="SHIFT_3">Shift 3 (Malam)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                style={{ backgroundColor: '#0f172a' }}
                className="text-sm border border-slate-700/50 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">To:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                style={{ backgroundColor: '#0f172a' }}
                className="text-sm border border-slate-700/50 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ backgroundColor: '#0f172a' }}
                className="text-sm border border-slate-700/50 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-200"
              >
                <option value="recordDate">Date</option>
                <option value="targetProduction">Target</option>
                <option value="actualProduction">Actual</option>
                <option value="achievement">Achievement</option>
                <option value="totalTrips">Trips</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-300"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            {(searchQuery || filterSiteId || filterShift || filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterSiteId('');
                  setFilterShift('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="text-xs text-blue-300 hover:text-blue-200 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Shift</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Mining Site</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actual</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Achievement</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Trips</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {productions.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Package size={48} className="text-slate-600 mb-3" />
                      <p className="text-slate-400 font-medium">No production records found</p>
                      <p className="text-slate-500 text-sm mt-1">{searchQuery || filterSiteId || filterShift || filterStartDate || filterEndDate ? 'Try adjusting your filters' : 'Click "Add Production Record" to create one'}</p>
                    </div>
                  </td>
                </tr>
              )}
              {productions.map((production) => (
                <tr key={production.id} className="hover:bg-sky-900/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md" title={production.id}>
                      {production.id.slice(0, 10)}...
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200">{new Date(production.recordDate).toLocaleDateString('id-ID')}</span>
                      <span className="text-xs text-slate-500">{new Date(production.recordDate).toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        production.shift === 'SHIFT_1' ? 'bg-sky-900/30 text-sky-400' : production.shift === 'SHIFT_2' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-blue-900/30 text-blue-400'
                      }`}
                    >
                      {production.shift?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200">{production.miningSite?.name || '-'}</span>
                      <span className="text-xs text-slate-500">{production.miningSite?.siteType || ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-slate-300">{production.targetProduction?.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                    <span className="text-xs text-slate-500 ml-1">t</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-300">{(production.haulingBasedActual ?? production.actualProduction)?.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                      <span className="text-xs text-slate-500">t</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <div
                        className={`px-3 py-1.5 rounded-lg ${
                          (production.calculatedAchievement ?? production.achievement) >= 100 ? 'bg-cyan-900/30' : (production.calculatedAchievement ?? production.achievement) >= 80 ? 'bg-sky-900/30' : 'bg-blue-900/30'
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${
                            (production.calculatedAchievement ?? production.achievement) >= 100 ? 'text-cyan-400' : (production.calculatedAchievement ?? production.achievement) >= 80 ? 'text-sky-400' : 'text-blue-300'
                          }`}
                        >
                          {(production.calculatedAchievement ?? production.achievement)?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-sky-900/30 text-sky-400">{production.totalTrips}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-1">
                      <button onClick={() => handleView(production)} className="p-2 rounded-lg text-sky-400 hover:bg-sky-900/30 transition-colors" title="View Details">
                        <Eye size={18} />
                      </button>
                      {canEdit && (
                        <button onClick={() => handleEdit(production)} className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-900/30 transition-colors" title="Edit">
                          <Edit size={18} />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(production.id)} className="p-2 rounded-lg text-blue-300 hover:bg-blue-900/30 transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalMode === 'create' ? 'Add Production Record' : modalMode === 'edit' ? 'Edit Production Record' : 'Production Details'} size="2xl">
        {modalMode === 'view' && selectedProduction ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-b from-sky-900/20 to-sky-950/20 rounded-lg p-4 border border-sky-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-400">Record Date</span>
                  <span className="px-2 py-0.5 bg-sky-900/30 text-sky-400 rounded text-xs font-medium">{selectedProduction.shift}</span>
                </div>
                <p className="text-xl font-bold text-slate-100">{new Date(selectedProduction.recordDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="bg-gradient-to-b from-cyan-900/20 to-cyan-950/20 rounded-lg p-4 border border-cyan-500/30">
                <span className="text-sm font-medium text-slate-400">Mining Site</span>
                <p className="text-xl font-bold text-slate-100">{selectedProduction.miningSite?.name || '-'}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedProduction.miningSite?.siteType || ''}</p>
              </div>
              <div className="bg-gradient-to-b from-blue-900/20 to-blue-950/20 rounded-lg p-4 border border-blue-500/30">
                <span className="text-sm font-medium text-slate-400">Achievement</span>
                <p
                  className={`text-3xl font-bold ${
                    (haulingAchievement?.achievement ?? selectedProduction.achievement) >= 100 ? 'text-cyan-400' : (haulingAchievement?.achievement ?? selectedProduction.achievement) >= 80 ? 'text-sky-400' : 'text-blue-300'
                  }`}
                >
                  {(haulingAchievement?.achievement ?? selectedProduction.achievement)?.toFixed(1) || 0}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Target Production</span>
                <p className="text-2xl font-bold text-slate-100">{selectedProduction.targetProduction?.toFixed(1) || 0}</p>
                <span className="text-sm text-slate-500">ton</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Actual Production</span>
                <p className="text-2xl font-bold text-sky-400">{(haulingAchievement?.totalLoadWeight ?? selectedProduction.actualProduction)?.toFixed(1) || 0}</p>
                <span className="text-sm text-slate-500">ton</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Total Trips</span>
                <p className="text-2xl font-bold text-sky-400">{selectedProduction.totalTrips || 0}</p>
                <span className="text-sm text-slate-500">trips</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Avg Cycle Time</span>
                <p className="text-2xl font-bold text-blue-400">{selectedProduction.avgCycleTime?.toFixed(1) || 0}</p>
                <span className="text-sm text-slate-500">minutes</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Total Distance</span>
                <p className="text-lg font-semibold text-slate-200">{selectedProduction.totalDistance?.toFixed(2) || 0} km</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Total Fuel</span>
                <p className="text-lg font-semibold text-slate-200">{selectedProduction.totalFuel?.toFixed(2) || 0} L</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Trucks Operating</span>
                <p className="text-lg font-semibold text-slate-200">
                  {selectedProduction.trucksOperating || 0} <span className="text-xs text-slate-500">({selectedProduction.trucksBreakdown || 0} breakdown)</span>
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Excavators Operating</span>
                <p className="text-lg font-semibold text-slate-200">
                  {selectedProduction.excavatorsOperating || 0} <span className="text-xs text-slate-500">({selectedProduction.excavatorsBreakdown || 0} breakdown)</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Utilization Rate</span>
                <p className="text-lg font-semibold text-slate-200">{selectedProduction.utilizationRate?.toFixed(1) || 0}%</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Downtime Hours</span>
                <p className="text-lg font-semibold text-slate-200">{selectedProduction.downtimeHours?.toFixed(1) || 0} hrs</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Avg Calori</span>
                <p className="text-lg font-semibold text-slate-200">{selectedProduction.avgCalori?.toFixed(0) || '-'}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <span className="text-xs text-slate-500">Avg Moisture</span>
                <p className="text-lg font-semibold text-slate-200">{selectedProduction.avgMoisture?.toFixed(1) || '-'}%</p>
              </div>
            </div>

            {haulingAchievement && (
              <div className="bg-gradient-to-r from-sky-900/30 to-sky-950/30 border border-sky-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-sky-400 text-sm flex items-center mb-3">
                  <Package size={16} className="mr-2" />
                  Hauling Achievement Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-slate-800/50 rounded p-3 text-center border border-slate-700/50">
                    <span className={`text-2xl font-bold ${haulingAchievement.achievement >= 100 ? 'text-cyan-400' : 'text-sky-400'}`}>{haulingAchievement.achievement?.toFixed(1) || 0}%</span>
                    <p className="text-xs text-slate-500 mt-1">Achievement</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3 text-center border border-slate-700/50">
                    <span className="text-2xl font-bold text-sky-400">
                      {haulingAchievement.completedCount || 0}/{haulingAchievement.totalCount || 0}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">Completed</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3 text-center border border-slate-700/50">
                    <span className="text-2xl font-bold text-cyan-400">{haulingAchievement.totalLoadWeight?.toFixed(1) || 0}</span>
                    <p className="text-xs text-slate-500 mt-1">Ton Loaded</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3 text-center border border-slate-700/50">
                    <span className="text-2xl font-bold text-slate-300">{haulingAchievement.totalTargetWeight?.toFixed(1) || 0}</span>
                    <p className="text-xs text-slate-500 mt-1">Target Weight</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3 text-center border border-slate-700/50">
                    <span className="text-2xl font-bold text-blue-400">{haulingAchievement.loadWeightProgress?.toFixed(1) || 0}%</span>
                    <p className="text-xs text-slate-500 mt-1">Weight Progress</p>
                  </div>
                </div>
              </div>
            )}

            {loadingHaulingActivities && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
                <span className="ml-2 text-slate-400">Loading hauling activities...</span>
              </div>
            )}

            {relatedHaulingActivities.length > 0 && (
              <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700/50">
                  <h4 className="font-semibold text-slate-200 flex items-center">
                    <Truck size={16} className="mr-2" />
                    Related Hauling Activities ({relatedHaulingActivities.length})
                  </h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/80 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Activity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Truck</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Load/Target</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {relatedHaulingActivities.map((ha) => (
                        <tr key={ha.id} className="hover:bg-sky-900/20">
                          <td className="px-3 py-2 font-mono text-xs text-slate-400">{ha.activityNumber}</td>
                          <td className="px-3 py-2 text-slate-300">{ha.truck?.code || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={ha.loadWeight >= ha.targetWeight ? 'text-cyan-400 font-semibold' : 'text-slate-300'}>{ha.loadWeight || 0}</span>
                            <span className="text-slate-500">/{ha.targetWeight || 0}t</span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                ha.status === 'COMPLETED' ? 'bg-cyan-900/30 text-cyan-400' : ha.status === 'LOADING' ? 'bg-sky-900/30 text-sky-400' : ha.status === 'HAULING' ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {ha.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedProduction.remarks && (
              <div className="bg-sky-900/20 border border-sky-500/30 rounded-lg p-4">
                <span className="text-xs text-sky-400 font-medium uppercase tracking-wide">Remarks</span>
                <p className="text-slate-300 mt-1">{selectedProduction.remarks}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-700/50">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hauling Activity Info Banner - Shows details of created hauling activities */}
            {haulingActivityInfo && haulingActivityInfo.createdCount > 0 && (
              <div className="bg-gradient-to-r from-cyan-900/30 to-cyan-950/30 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-cyan-400 text-lg flex items-center">
                    <span className="bg-cyan-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">OK</span>
                    Hauling Activities Created Successfully
                  </h4>
                  <span className="bg-cyan-900/50 text-cyan-400 px-3 py-1 rounded-full text-sm font-medium">{haulingActivityInfo.createdCount} activities</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
                    <span className="text-xs text-slate-500">Strategy</span>
                    <p className="font-medium text-cyan-400">#{haulingActivityInfo.strategyRank}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
                    <span className="text-xs text-slate-500">Trucks</span>
                    <p className="font-medium text-sky-400">{haulingActivityInfo.equipmentAllocation?.truck_ids?.length || 0}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
                    <span className="text-xs text-slate-500">Excavators</span>
                    <p className="font-medium text-sky-400">{haulingActivityInfo.equipmentAllocation?.excavator_ids?.length || 0}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
                    <span className="text-xs text-slate-500">Operators</span>
                    <p className="font-medium text-blue-400">{haulingActivityInfo.equipmentAllocation?.operator_ids?.length || 0}</p>
                  </div>
                </div>

                {/* Activity Numbers List */}
                {haulingActivityInfo.createdActivities && haulingActivityInfo.createdActivities.length > 0 && (
                  <div className="mt-3 border-t border-cyan-500/30 pt-3">
                    <span className="text-xs text-slate-400 font-medium">Activity IDs:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {haulingActivityInfo.createdActivities.slice(0, 10).map((activity, idx) => (
                        <span key={idx} className="bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded text-xs font-mono">
                          {activity.activityNumber || activity.id}
                        </span>
                      ))}
                      {haulingActivityInfo.createdActivities.length > 10 && <span className="text-xs text-slate-500">+{haulingActivityInfo.createdActivities.length - 10} more</span>}
                    </div>
                  </div>
                )}

                {/* Aggregated Data Summary */}
                {haulingActivityInfo.aggregatedData && (
                  <div className="mt-3 border-t border-cyan-500/30 pt-3">
                    <span className="text-xs text-slate-400 font-medium mb-2 block">Aggregated Metrics:</span>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-sky-400">{parseFloat(haulingActivityInfo.aggregatedData.total_tonase || 0).toFixed(1)}</p>
                        <span className="text-xs text-slate-500">Tons</span>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-cyan-400">{parseFloat(haulingActivityInfo.aggregatedData.total_distance_km || 0).toFixed(1)}</p>
                        <span className="text-xs text-slate-500">km Distance</span>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-sky-400">
                          {(() => {
                            const fuel = parseFloat(haulingActivityInfo.aggregatedData.total_fuel_liter || 0);
                            if (fuel > 0) return fuel.toFixed(1);
                            const dist = parseFloat(haulingActivityInfo.aggregatedData.total_distance_km || 0);
                            const calcParams = haulingActivityInfo.aggregatedData.calculation_params || {};
                            const fuelRate = parseFloat(calcParams.truck_fuel_rate_lkm) || 1.0;
                            return (dist * fuelRate * 1.3).toFixed(1);
                          })()}
                        </p>
                        <span className="text-xs text-slate-500">L Fuel</span>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-400">{parseFloat(haulingActivityInfo.aggregatedData.avg_cycle_time_minutes || 0).toFixed(1)}</p>
                        <span className="text-xs text-slate-500">min/cycle</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hauling Activities Section - For Edit Mode (Achievement Info) */}
            {modalMode === 'edit' && haulingAchievement && (
              <div className="bg-gradient-to-r from-sky-900/30 to-sky-950/30 border border-sky-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sky-400 text-sm flex items-center">
                    <Package size={16} className="mr-2" />
                    Hauling Achievement
                  </h4>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <span className={`text-xl font-bold ${haulingAchievement.achievement >= 100 ? 'text-cyan-400' : 'text-sky-400'}`}>{haulingAchievement.achievement.toFixed(1)}%</span>
                      <p className="text-xs text-slate-500">Achievement</p>
                    </div>
                    <div className="text-center">
                      <span className="text-lg font-semibold text-sky-400">
                        {haulingAchievement.completedCount}/{haulingAchievement.totalCount}
                      </span>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="text-center">
                      <span className="text-lg font-semibold text-cyan-400">{haulingAchievement.totalLoadWeight?.toFixed(1) || 0}</span>
                      <p className="text-xs text-slate-500">ton Loaded</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isManualMode && (
              <div className="bg-gradient-to-r from-blue-900/30 to-blue-950/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-blue-400 text-lg flex items-center">
                    <Package size={20} className="mr-2" />
                    {modalMode === 'edit' ? 'Edit Hauling Activities' : 'Manual Hauling Activities'} ({manualHaulingList.length})
                  </h4>
                  <button type="button" onClick={handleAddManualHauling} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center">
                    <Plus size={14} className="mr-1" /> Add Hauling
                  </button>
                </div>

                {manualHaulingList.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {manualHaulingList.map((hauling, idx) => (
                      <div key={hauling.tempId} className={`bg-slate-800/50 rounded-lg border p-4 shadow-sm ${hauling.isExisting ? 'border-sky-500/30' : 'border-blue-500/30'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${hauling.isExisting ? 'bg-sky-900/50 text-sky-400' : 'bg-blue-900/50 text-blue-400'}`}>
                              {hauling.isExisting ? `Existing #${idx + 1}` : `New #${idx + 1}`}
                            </span>
                            {hauling.activityNumber && <span className="bg-slate-700 text-slate-400 px-2 py-0.5 rounded text-xs font-mono">{hauling.activityNumber}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveManualHauling(hauling.tempId)}
                            className={`p-1 rounded ${hauling.isExisting ? 'text-blue-300 hover:bg-blue-900/30' : 'text-slate-400 hover:bg-slate-700/50'}`}
                            title={hauling.isExisting ? 'Delete from database' : 'Remove'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs font-medium text-slate-400 mb-1 flex items-center">
                              <Truck size={12} className="mr-1" /> Truck
                            </label>
                            <select
                              value={hauling.truckId}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'truckId', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border border-slate-700/50 rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200 ${hauling.isExisting ? 'opacity-60' : ''}`}
                              disabled={hauling.isExisting}
                            >
                              <option value="">Select Truck</option>
                              {trucks
                                .filter((t) => selectedTruckIds.includes(t.id) || t.id === hauling.truckId)
                                .map((truck) => (
                                  <option key={truck.id} value={truck.id}>
                                    {truck.code} - {truck.name || truck.model} ({truck.capacity}t)
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Excavator</label>
                            <select
                              value={hauling.excavatorId}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'excavatorId', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border border-slate-700/50 rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200 ${hauling.isExisting ? 'opacity-60' : ''}`}
                              disabled={hauling.isExisting}
                            >
                              <option value="">Select Excavator</option>
                              {excavators
                                .filter((e) => selectedExcavatorIds.includes(e.id) || e.id === hauling.excavatorId)
                                .map((exc) => (
                                  <option key={exc.id} value={exc.id}>
                                    {exc.code} - {exc.model} ({exc.productionRate}t/m)
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs font-medium text-slate-400 mb-1 flex items-center">
                              <User size={12} className="mr-1" /> Operator
                            </label>
                            <select
                              value={hauling.operatorId}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'operatorId', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border border-slate-700/50 rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200 ${hauling.isExisting ? 'opacity-60' : ''}`}
                              disabled={hauling.isExisting}
                            >
                              <option value="">Select Operator</option>
                              {operators
                                .filter((op) => op.status === 'ACTIVE')
                                .map((op) => (
                                  <option key={op.id} value={op.id}>
                                    {op.employeeNumber} - {op.user?.fullName || 'N/A'} ({op.shift})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-400 mb-1 flex items-center">
                              <Navigation size={12} className="mr-1" /> Road Segment {filteredRoadSegments.length > 0 && <span className="text-xs text-sky-400 ml-1">({filteredRoadSegments.length} for site)</span>}
                            </label>
                            <select
                              value={hauling.roadSegmentId}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'roadSegmentId', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200 ${filteredRoadSegments.length > 0 ? 'border-sky-500/30' : 'border-slate-700/50'}`}
                            >
                              <option value="">Select Road</option>
                              {(filteredRoadSegments.length > 0 ? filteredRoadSegments : roadSegments.filter((rs) => rs.isActive !== false)).map((rs) => (
                                <option key={rs.id} value={rs.id}>
                                  {rs.code} - {rs.name} ({rs.distance?.toFixed(2)}km) [{rs.roadCondition}]
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs font-medium text-slate-400 mb-1 flex items-center">
                              <MapPin size={12} className="mr-1 text-cyan-400" /> Loading Point {filteredLoadingPoints.length > 0 && <span className="text-xs text-cyan-400 ml-1">({filteredLoadingPoints.length} for site)</span>}
                            </label>
                            <select
                              value={hauling.loadingPointId}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'loadingPointId', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200 ${filteredLoadingPoints.length > 0 ? 'border-cyan-500/30' : 'border-slate-700/50'}`}
                            >
                              <option value="">Select Loading Point</option>
                              {(filteredLoadingPoints.length > 0 ? filteredLoadingPoints : loadingPoints.filter((lp) => lp.isActive !== false)).map((lp) => (
                                <option key={lp.id} value={lp.id}>
                                  {lp.code} - {lp.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-400 mb-1 flex items-center">
                              <MapPin size={12} className="mr-1 text-sky-400" /> Dumping Point {filteredDumpingPoints.length > 0 && <span className="text-xs text-sky-400 ml-1">({filteredDumpingPoints.length} for site)</span>}
                            </label>
                            <select
                              value={hauling.dumpingPointId}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'dumpingPointId', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200 ${filteredDumpingPoints.length > 0 ? 'border-sky-500/30' : 'border-slate-700/50'}`}
                            >
                              <option value="">Select Dumping Point</option>
                              {(filteredDumpingPoints.length > 0 ? filteredDumpingPoints : dumpingPoints.filter((dp) => dp.isActive !== false)).map((dp) => (
                                <option key={dp.id} value={dp.id}>
                                  {dp.code} - {dp.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Target (ton)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={hauling.targetWeight?.toFixed?.(1) || hauling.targetWeight || ''}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'targetWeight', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border border-slate-700/50 rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Load (ton)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Actual load"
                              value={hauling.loadWeight}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'loadWeight', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-slate-700/50 rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200 placeholder-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Distance (km)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={hauling.distance?.toFixed?.(2) || hauling.distance || ''}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'distance', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border border-slate-700/50 rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                            <select
                              value={hauling.status}
                              onChange={(e) => handleUpdateManualHauling(hauling.tempId, 'status', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-slate-700/50 rounded focus:ring-1 focus:ring-sky-500 bg-slate-900/50 text-slate-200"
                            >
                              {HAULING_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package size={40} className="mx-auto mb-3 text-slate-600" />
                    <p className="font-medium">Belum ada hauling ditambahkan</p>
                    <p className="text-xs mt-1 text-slate-500">Pilih truck & excavator di atas, lalu klik "Add Hauling"</p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-blue-500/30">
                  <p className="text-xs text-blue-400">
                    <strong>Note:</strong>{' '}
                    {modalMode === 'edit'
                      ? 'Perubahan pada hauling yang sudah ada akan langsung disimpan. Hauling baru akan dibuat saat Production Record diupdate.'
                      : 'Hauling activities akan dibuat setelah Production Record disimpan. Achievement awal adalah 0% dan akan meningkat seiring pemenuhan load weight dan status.'}
                  </p>
                </div>
              </div>
            )}

            {loadingHaulingActivities && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
                <span className="ml-2 text-slate-400">Loading hauling activities...</span>
              </div>
            )}

            {modalMode === 'create' && !haulingActivityInfo && (
              <div className="flex items-center justify-end mb-2">
                <label className="flex items-center text-sm text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={isManualMode} onChange={(e) => setIsManualMode(e.target.checked)} className="mr-2 rounded" />
                  Mode Manual (Tanpa AI Recommendation)
                </label>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Record Date *</label>
                <input type="date" value={formData.recordDate} onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Shift *</label>
                <select value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })} className="input-field" required>
                  <option value="SHIFT_1">Pagi</option>
                  <option value="SHIFT_2">Siang</option>
                  <option value="SHIFT_3">Malam</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mining Site * <span className="text-xs text-sky-400">(Auto-fill enabled)</span>
                </label>
                <select value={formData.miningSiteId} onChange={(e) => handleMiningSiteChange(e.target.value)} className="input-field border-sky-500/30 focus:ring-sky-500" required>
                  <option value="">Select Mining Site</option>
                  {miningSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.code} - {site.name} ({site.siteType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {siteAutoFillInfo && formData.miningSiteId && (
              <div className="bg-gradient-to-r from-sky-900/30 to-cyan-900/30 border border-sky-500/30 rounded-lg p-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <CheckCircle size={14} className="text-cyan-400 mr-1" />
                      <span className="text-xs text-slate-400">Auto-filled from site data</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="bg-sky-900/50 text-sky-400 px-2 py-0.5 rounded">{siteAutoFillInfo.roadCount} Roads</span>
                      <span className="bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded">{siteAutoFillInfo.lpCount} Loading Pts</span>
                      <span className="bg-sky-900/50 text-sky-400 px-2 py-0.5 rounded">{siteAutoFillInfo.dpCount} Dumping Pts</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500">Distance:</span>
                    <span className="font-semibold text-sky-400">{siteAutoFillInfo.avgDistance?.toFixed(2) || '-'} km</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-500">Road:</span>
                    <span
                      className={`font-semibold ${
                        siteAutoFillInfo.roadCondition === 'EXCELLENT' ? 'text-cyan-400' : siteAutoFillInfo.roadCondition === 'GOOD' ? 'text-sky-400' : siteAutoFillInfo.roadCondition === 'FAIR' ? 'text-sky-400' : 'text-blue-300'
                      }`}
                    >
                      {siteAutoFillInfo.roadCondition}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-700/50 pt-4 bg-gradient-to-br from-sky-900/20 to-sky-950/20 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sky-400 flex items-center">
                  <Calculator size={18} className="mr-2" />
                  Operational Calculator
                </h3>
                <button type="button" onClick={calculateMetrics} className="text-sm bg-sky-600 text-white px-3 py-1.5 rounded-lg hover:bg-sky-700 flex items-center shadow-sm transition-colors">
                  <RefreshCw size={14} className="mr-1" /> Calculate
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Target Production (ton) *</label>
                  <input type="number" step="0.01" value={formData.targetProduction} onChange={(e) => setFormData({ ...formData, targetProduction: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Haul Distance (km) {siteAutoFillInfo && <span className="text-xs text-cyan-400 ml-1">auto-filled</span>}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.haulDistance}
                    onChange={(e) => setFormData({ ...formData, haulDistance: e.target.value })}
                    className={`input-field ${siteAutoFillInfo ? 'border-cyan-500/30' : ''}`}
                    placeholder="One-way distance"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Weather Condition {siteAutoFillInfo && <span className="text-xs text-cyan-400 ml-1">auto-filled</span>}</label>
                  <select value={formData.weatherCondition} onChange={(e) => setFormData({ ...formData, weatherCondition: e.target.value })} className={`input-field ${siteAutoFillInfo ? 'border-cyan-500/30' : ''}`}>
                    <option value="CERAH">Cerah</option>
                    <option value="BERAWAN">Berawan</option>
                    <option value="HUJAN_RINGAN">Hujan Ringan</option>
                    <option value="HUJAN_SEDANG">Hujan Sedang</option>
                    <option value="HUJAN_LEBAT">Hujan Lebat</option>
                    <option value="KABUT">Kabut</option>
                    <option value="BADAI">Badai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Road Condition {siteAutoFillInfo && <span className="text-xs text-cyan-400 ml-1">auto-filled</span>}</label>
                  <select value={formData.roadCondition} onChange={(e) => setFormData({ ...formData, roadCondition: e.target.value })} className={`input-field ${siteAutoFillInfo ? 'border-cyan-500/30' : ''}`}>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Risk Level {siteAutoFillInfo && <span className="text-xs text-cyan-400 ml-1">auto-filled</span>}</label>
                  <select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })} className={`input-field ${siteAutoFillInfo ? 'border-cyan-500/30' : ''}`}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Pilih Truck ({selectedTruckIds.length})<span className="text-xs text-sky-400 ml-1">({availableTrucks.length} tersedia)</span>
                  </label>
                  <div className="relative">
                    <button type="button" onClick={() => setTruckDropdownOpen(!truckDropdownOpen)} className="w-full input-field flex items-center justify-between">
                      <span className="text-sm">{selectedTruckIds.length > 0 ? `${selectedTruckIds.length} truck dipilih` : 'Pilih truck (IDLE/STANDBY)'}</span>
                      <ChevronDown size={16} />
                    </button>
                    {truckDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-lg max-h-64 overflow-hidden">
                        <div className="p-2 border-b border-slate-700/50">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Cari truck..."
                              value={truckSearch}
                              onChange={(e) => setTruckSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-slate-700/50 rounded text-sm bg-slate-900 text-slate-200 placeholder-slate-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredTrucks.map((truck) => (
                            <div key={truck.id} className={`flex items-center px-3 py-2 hover:bg-slate-700/50 cursor-pointer ${selectedTruckIds.includes(truck.id) ? 'bg-sky-900/30' : ''}`} onClick={() => toggleTruckSelection(truck.id)}>
                              <input type="checkbox" checked={selectedTruckIds.includes(truck.id)} onChange={() => toggleTruckSelection(truck.id)} className="rounded text-sky-500" onClick={(e) => e.stopPropagation()} />
                              <span className="ml-2 text-sm flex-1 text-slate-200">
                                {truck.code} - {truck.model} ({truck.capacity}t)
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${truck.status === 'IDLE' ? 'bg-cyan-900/50 text-cyan-400' : truck.status === 'STANDBY' ? 'bg-sky-900/50 text-sky-400' : 'bg-sky-900/50 text-sky-400'}`}>
                                {truck.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Pilih Excavator ({selectedExcavatorIds.length})<span className="text-xs text-cyan-400 ml-1">({availableExcavators.length} tersedia)</span>
                  </label>
                  <div className="relative">
                    <button type="button" onClick={() => setExcavatorDropdownOpen(!excavatorDropdownOpen)} className="w-full input-field flex items-center justify-between">
                      <span className="text-sm">{selectedExcavatorIds.length > 0 ? `${selectedExcavatorIds.length} excavator dipilih` : 'Pilih excavator (ACTIVE/IDLE)'}</span>
                      <ChevronDown size={16} />
                    </button>
                    {excavatorDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-lg max-h-64 overflow-hidden">
                        <div className="p-2 border-b border-slate-700/50">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Cari excavator..."
                              value={excavatorSearch}
                              onChange={(e) => setExcavatorSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-slate-700/50 rounded text-sm bg-slate-900 text-slate-200 placeholder-slate-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredExcavators.map((exc) => (
                            <div key={exc.id} className={`flex items-center px-3 py-2 hover:bg-slate-700/50 cursor-pointer ${selectedExcavatorIds.includes(exc.id) ? 'bg-cyan-900/30' : ''}`} onClick={() => toggleExcavatorSelection(exc.id)}>
                              <input type="checkbox" checked={selectedExcavatorIds.includes(exc.id)} onChange={() => toggleExcavatorSelection(exc.id)} className="rounded text-sky-500" onClick={(e) => e.stopPropagation()} />
                              <span className="ml-2 text-sm flex-1 text-slate-200">
                                {exc.code} - {exc.model} ({exc.productionRate}t/m)
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${exc.status === 'IDLE' ? 'bg-cyan-900/50 text-cyan-400' : exc.status === 'ACTIVE' ? 'bg-sky-900/50 text-sky-400' : 'bg-sky-900/50 text-sky-400'}`}>
                                {exc.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Calculated Results */}
            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="font-semibold mb-3 text-slate-200">Operational Metrics (Auto-Calculated)</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Total Trips</label>
                  <input type="number" value={formData.totalTrips} readOnly className="input-field bg-slate-800/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Total Distance (km)</label>
                  <input type="number" value={formData.totalDistance} readOnly className="input-field bg-slate-800/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Total Fuel (L)</label>
                  <input type="number" value={formData.totalFuel} readOnly className="input-field bg-slate-800/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Avg Cycle Time (min)</label>
                  <input type="number" value={formData.avgCycleTime} readOnly className="input-field bg-slate-800/50" />
                </div>
              </div>

              {/* Calculation Preview Section */}
              {formData.totalTrips && formData.totalTrips > 0 && (
                <div className="mt-4 bg-sky-900/20 p-4 rounded-lg border border-sky-500/30 text-sm text-slate-300">
                  <h4 className="font-semibold text-sky-400 mb-2 flex items-center">
                    <Calculator size={16} className="mr-2" />
                    Calculation Preview & Financial Projection
                  </h4>
                  <div className="space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Trips Required:</span>
                      <span>
                        {formData.targetProduction} ton / Avg Capacity = <strong className="text-slate-100">{formData.totalTrips} trips</strong>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Distance:</span>
                      <span>
                        {formData.totalTrips} trips x {formData.haulDistance} km x 2 (Return) = <strong className="text-slate-100">{formData.totalDistance} km</strong>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Fuel Consumption:</span>
                      <span>
                        {formData.totalDistance} km x Avg Fuel Rate x Factors = <strong className="text-slate-100">{formData.totalFuel} Liters</strong>
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-sky-500/30 pt-1 mt-1 mb-2">
                      <span>Cycle Time:</span>
                      <span>
                        Haul + Queue + Load + Dump + Return = <strong className="text-slate-100">{formData.avgCycleTime} min/trip</strong>
                      </span>
                    </div>

                    {/* Financial Breakdown from Strategy */}
                    {strategyFinancials && (
                      <div className="mt-3 pt-2 border-t-2 border-sky-500/30">
                        <h5 className="font-semibold text-sky-300 mb-1">Financial Projection (Estimasi)</h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between text-cyan-400">
                            <span>Revenue:</span>
                            <strong>{strategyFinancials.REVENUE}</strong>
                          </div>
                          <div className="flex justify-between text-blue-300">
                            <span>Fuel Cost:</span>
                            <span>{strategyFinancials.FUEL_COST}</span>
                          </div>
                          <div className="flex justify-between text-blue-300">
                            <span>Queue Cost:</span>
                            <span>{strategyFinancials.QUEUE_COST}</span>
                          </div>
                          <div className="flex justify-between text-blue-300">
                            <span>Demurrage:</span>
                            <span>{strategyFinancials.DEMURRAGE}</span>
                          </div>
                          <div className="col-span-2 flex justify-between border-t border-sky-500/30 pt-1 mt-1 text-sky-300 font-bold text-sm">
                            <span>Net Profit:</span>
                            <span>{strategyFinancials.NET_PROFIT}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="font-semibold mb-3 text-slate-200">Actuals & Quality</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Actual Production (ton) *{isManualMode && manualHaulingList.length > 0 && <span className="text-xs text-sky-400 ml-2">(Auto-calculated from haulings)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actualProduction}
                    onChange={(e) => setFormData({ ...formData, actualProduction: e.target.value })}
                    className={`input-field ${isManualMode && manualHaulingList.length > 0 ? 'bg-slate-800/50 cursor-not-allowed' : ''}`}
                    required
                    readOnly={isManualMode && manualHaulingList.length > 0}
                    title={isManualMode && manualHaulingList.length > 0 ? 'Nilai ini otomatis dihitung dari total load weight hauling activities' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Utilization Rate (%)</label>
                  <input type="number" step="0.01" value={formData.utilizationRate} onChange={(e) => setFormData({ ...formData, utilizationRate: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Avg Calori</label>
                  <input type="number" step="0.01" value={formData.avgCalori} onChange={(e) => setFormData({ ...formData, avgCalori: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Avg Ash (%)</label>
                  <input type="number" step="0.01" value={formData.avgAshContent} onChange={(e) => setFormData({ ...formData, avgAshContent: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Avg Sulfur (%)</label>
                  <input type="number" step="0.01" value={formData.avgSulfur} onChange={(e) => setFormData({ ...formData, avgSulfur: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Avg Moisture (%)</label>
                  <input type="number" step="0.01" value={formData.avgMoisture} onChange={(e) => setFormData({ ...formData, avgMoisture: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Remarks</label>
              <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="input-field" rows="2" />
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {modalMode === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ProductionList;
