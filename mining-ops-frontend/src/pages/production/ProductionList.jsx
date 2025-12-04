import React, { useEffect, useState } from 'react';
import { productionService } from '../../services';
import { miningSiteService } from '../../services/locationService';
import { truckService, excavatorService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Plus, Edit, Trash2, Eye, Calculator, RefreshCw, Search, ChevronDown } from 'lucide-react';
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

const ProductionList = () => {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [statistics, setStatistics] = useState(null);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [miningSites, setMiningSites] = useState([]);

  // Equipment State
  const [trucks, setTrucks] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [selectedTruckIds, setSelectedTruckIds] = useState([]);
  const [selectedExcavatorIds, setSelectedExcavatorIds] = useState([]);

  const [truckSearch, setTruckSearch] = useState('');
  const [excavatorSearch, setExcavatorSearch] = useState('');
  const [truckDropdownOpen, setTruckDropdownOpen] = useState(false);
  const [excavatorDropdownOpen, setExcavatorDropdownOpen] = useState(false);
  const [strategyFinancials, setStrategyFinancials] = useState(null);

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
        const [prodRes, siteRes, truckRes, excRes] = await Promise.all([productionService.getAll({ page: pagination.page, limit: pagination.limit }), miningSiteService.getAll(), truckService.getAll(), excavatorService.getAll()]);

        setProductions(prodRes.data || []);
        setPagination((prev) => ({ ...prev, totalPages: prodRes.meta?.totalPages || 1 }));
        setMiningSites(Array.isArray(siteRes.data) ? siteRes.data : []);
        setTrucks(Array.isArray(truckRes.data) ? truckRes.data : []);
        setExcavators(Array.isArray(excRes.data) ? excRes.data : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [pagination.page, pagination.limit]);

  const isAiPopulated = React.useRef(false);

  useEffect(() => {
    const checkForStrategyImplementation = () => {
      const strategyData = sessionStorage.getItem('selectedStrategy');
      if (strategyData) {
        try {
          const { recommendation } = JSON.parse(strategyData);
          const raw = recommendation.raw_data || {};

          const truckCount = parseInt(raw.alokasi_truk) || parseInt(recommendation.skenario?.alokasi_truk) || 0;
          const excavatorCount = parseInt(raw.jumlah_excavator) || parseInt(recommendation.skenario?.jumlah_excavator) || 0;
          const weatherCondition = raw.weatherCondition || recommendation.skenario?.weatherCondition || 'CERAH';
          const roadCondition = raw.roadCondition || recommendation.skenario?.roadCondition || 'GOOD';

          const shiftRaw = raw.shift || recommendation.skenario?.shift || 'SHIFT_1';
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
            const availableTrucks = trucks.filter((t) => t.status === 'AVAILABLE' || t.status === 'ACTIVE').slice(0, truckCount);
            const availableExcavators = excavators.filter((e) => e.status === 'AVAILABLE' || e.status === 'ACTIVE').slice(0, excavatorCount);

            const selectedTrucks = availableTrucks.length > 0 ? availableTrucks : trucks.slice(0, truckCount);
            const selectedExcavators = availableExcavators.length > 0 ? availableExcavators : excavators.slice(0, excavatorCount);

            setSelectedTruckIds(selectedTrucks.map((t) => t.id));
            setSelectedExcavatorIds(selectedExcavators.map((e) => e.id));

            const roadDistance = parseFloat(raw.distance_km) || (totalTrips > 0 ? totalDistance / totalTrips / 2 : 0);

            isAiPopulated.current = true;

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

            setFormData({
              recordDate: new Date().toISOString().split('T')[0],
              shift: shiftValue,
              miningSiteId: raw.miningSiteId && miningSites.find((s) => s.id === raw.miningSiteId) ? raw.miningSiteId : miningSites[0]?.id || '',
              targetProduction: totalTonase.toFixed(2),
              actualProduction: totalTonase.toFixed(2),
              haulDistance: roadDistance.toFixed(2),
              weatherCondition: weatherCondition,
              roadCondition: roadCondition,
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
              remarks: `AI Strategy #${recommendation.rank || ''} - ${raw.strategy_objective || recommendation.strategy_objective || 'Optimal Configuration'}${vesselInfo}${routeInfo}`,
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
      const res = await productionService.getAll({ page: pagination.page, limit: pagination.limit });
      setProductions(res.data || []);
      setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
    } catch (error) {
      console.error('Failed to fetch production records:', error);
    } finally {
      setLoading(false);
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
    setShowModal(true);
  };

  const handleEdit = (production) => {
    setModalMode('edit');
    setSelectedProduction(production);
    // Note: In a real app, we'd need to fetch the specific equipment allocated to this production
    // For now, we'll just populate the form fields
    setFormData({
      recordDate: new Date(production.recordDate).toISOString().split('T')[0],
      shift: production.shift,
      miningSiteId: production.miningSiteId || '',
      targetProduction: production.targetProduction || '',
      actualProduction: production.actualProduction || '',
      haulDistance: production.totalDistance && production.totalTrips ? (production.totalDistance / production.totalTrips / 2).toFixed(2) : '',
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
  };

  const handleView = (production) => {
    setSelectedProduction(production);
    setModalMode('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        recordDate: `${formData.recordDate}T00:00:00.000Z`,
        shift: formData.shift,
        miningSiteId: formData.miningSiteId,
        targetProduction: parseFloat(formData.targetProduction),
        actualProduction: parseFloat(formData.actualProduction),
      };

      // Optional fields
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

  const filteredTrucks = trucks.filter((truck) => truck.code.toLowerCase().includes(truckSearch.toLowerCase()) || truck.model?.toLowerCase().includes(truckSearch.toLowerCase()));

  const filteredExcavators = excavators.filter((exc) => exc.code.toLowerCase().includes(excavatorSearch.toLowerCase()) || exc.model?.toLowerCase().includes(excavatorSearch.toLowerCase()));

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Production Records</h1>
        <button onClick={handleCreate} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Add Production Record</span>
        </button>
      </div>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Total Production</p>
            <p className="text-2xl font-bold">{statistics.totalProduction?.toFixed(0) || 0} ton</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Average Achievement</p>
            <p className="text-2xl font-bold">{statistics.avgAchievement?.toFixed(1) || 0}%</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Total Trips</p>
            <p className="text-2xl font-bold">{statistics.totalTrips || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Avg Cycle Time</p>
            <p className="text-2xl font-bold">{statistics.avgCycleTime?.toFixed(1) || 0} min</p>
          </div>
        </div>
      )}

      <div className="card table-container">
        <table className="data-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Date</th>
              <th className="table-header">Shift</th>
              <th className="table-header">Mining Site</th>
              <th className="table-header">Target (ton)</th>
              <th className="table-header">Actual (ton)</th>
              <th className="table-header">Achievement (%)</th>
              <th className="table-header">Total Trips</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productions.map((production) => (
              <tr key={production.id}>
                <td className="table-cell">{new Date(production.recordDate).toLocaleDateString()}</td>
                <td className="table-cell">{production.shift}</td>
                <td className="table-cell">{production.miningSite?.name || '-'}</td>
                <td className="table-cell">{production.targetProduction.toFixed(0)}</td>
                <td className="table-cell">{production.actualProduction.toFixed(0)}</td>
                <td className="table-cell">
                  <span className={`font-semibold ${production.achievement >= 100 ? 'text-green-600' : 'text-orange-600'}`}>{production.achievement.toFixed(1)}%</span>
                </td>
                <td className="table-cell">{production.totalTrips}</td>
                <td className="table-cell">
                  <div className="flex space-x-2">
                    <button onClick={() => handleView(production)} className="text-blue-600 hover:text-blue-800">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(production)} className="text-green-600 hover:text-green-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(production.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalMode === 'create' ? 'Add Production Record' : modalMode === 'edit' ? 'Edit Production Record' : 'Production Details'} size="2xl">
        {modalMode === 'view' && selectedProduction ? (
          <div className="space-y-6">
            {/* View Mode Content (Same as before) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Record Date</label>
                <p className="text-lg">{new Date(selectedProduction.recordDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Shift</label>
                <p className="text-lg">{selectedProduction.shift}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600">Mining Site</label>
                <p className="text-lg">{selectedProduction.miningSite?.name || '-'}</p>
              </div>
            </div>
            {/* ... other view sections ... */}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Record Date *</label>
                <input type="date" value={formData.recordDate} onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift *</label>
                <select value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })} className="input-field" required>
                  <option value="SHIFT_1">Pagi</option>
                  <option value="SHIFT_2">Siang</option>
                  <option value="SHIFT_3">Malam</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mining Site *</label>
                <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field" required>
                  <option value="">Select Mining Site</option>
                  {miningSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.code} - {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Equipment Selection & Auto-Calculation */}
            <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-blue-800 flex items-center">
                  <Calculator size={18} className="mr-2" />
                  Operational Calculator
                </h3>
                <button type="button" onClick={calculateMetrics} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center">
                  <RefreshCw size={14} className="mr-1" /> Calculate
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Production (ton) *</label>
                  <input type="number" step="0.01" value={formData.targetProduction} onChange={(e) => setFormData({ ...formData, targetProduction: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Haul Distance (km) *</label>
                  <input type="number" step="0.1" value={formData.haulDistance} onChange={(e) => setFormData({ ...formData, haulDistance: e.target.value })} className="input-field" placeholder="One-way distance" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weather Condition</label>
                  <select value={formData.weatherCondition} onChange={(e) => setFormData({ ...formData, weatherCondition: e.target.value })} className="input-field">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Road Condition</label>
                  <select value={formData.roadCondition} onChange={(e) => setFormData({ ...formData, roadCondition: e.target.value })} className="input-field">
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                  <select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })} className="input-field">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Truck ({selectedTruckIds.length})</label>
                  <div className="relative">
                    <button type="button" onClick={() => setTruckDropdownOpen(!truckDropdownOpen)} className="w-full input-field flex items-center justify-between">
                      <span className="text-sm">{selectedTruckIds.length > 0 ? `${selectedTruckIds.length} truck dipilih` : 'Pilih truck'}</span>
                      <ChevronDown size={16} />
                    </button>
                    {truckDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-hidden">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                            <input type="text" placeholder="Cari truck..." value={truckSearch} onChange={(e) => setTruckSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded text-sm" onClick={(e) => e.stopPropagation()} />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredTrucks.map((truck) => (
                            <div key={truck.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => toggleTruckSelection(truck.id)}>
                              <input type="checkbox" checked={selectedTruckIds.includes(truck.id)} onChange={() => toggleTruckSelection(truck.id)} className="rounded text-blue-600" onClick={(e) => e.stopPropagation()} />
                              <span className="ml-2 text-sm">
                                {truck.code} - {truck.model} ({truck.capacity}t)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Excavator ({selectedExcavatorIds.length})</label>
                  <div className="relative">
                    <button type="button" onClick={() => setExcavatorDropdownOpen(!excavatorDropdownOpen)} className="w-full input-field flex items-center justify-between">
                      <span className="text-sm">{selectedExcavatorIds.length > 0 ? `${selectedExcavatorIds.length} excavator dipilih` : 'Pilih excavator'}</span>
                      <ChevronDown size={16} />
                    </button>
                    {excavatorDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-hidden">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Cari excavator..."
                              value={excavatorSearch}
                              onChange={(e) => setExcavatorSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border rounded text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredExcavators.map((exc) => (
                            <div key={exc.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => toggleExcavatorSelection(exc.id)}>
                              <input type="checkbox" checked={selectedExcavatorIds.includes(exc.id)} onChange={() => toggleExcavatorSelection(exc.id)} className="rounded text-blue-600" onClick={(e) => e.stopPropagation()} />
                              <span className="ml-2 text-sm">
                                {exc.code} - {exc.model} ({exc.productionRate}t/m)
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
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Operational Metrics (Auto-Calculated)</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Trips</label>
                  <input type="number" value={formData.totalTrips} readOnly className="input-field bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Distance (km)</label>
                  <input type="number" value={formData.totalDistance} readOnly className="input-field bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Fuel (L)</label>
                  <input type="number" value={formData.totalFuel} readOnly className="input-field bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avg Cycle Time (min)</label>
                  <input type="number" value={formData.avgCycleTime} readOnly className="input-field bg-gray-100" />
                </div>
              </div>

              {/* Calculation Preview Section */}
              {formData.totalTrips && formData.totalTrips > 0 && (
                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-gray-700">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                    <Calculator size={16} className="mr-2" />
                    Calculation Preview & Financial Projection
                  </h4>
                  <div className="space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Trips Required:</span>
                      <span>
                        {formData.targetProduction} ton / Avg Capacity ≈ <strong>{formData.totalTrips} trips</strong>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Distance:</span>
                      <span>
                        {formData.totalTrips} trips × {formData.haulDistance} km × 2 (Return) = <strong>{formData.totalDistance} km</strong>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Fuel Consumption:</span>
                      <span>
                        {formData.totalDistance} km × Avg Fuel Rate × Factors ≈ <strong>{formData.totalFuel} Liters</strong>
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-1 mt-1 mb-2">
                      <span>Cycle Time:</span>
                      <span>
                        Haul + Queue + Load + Dump + Return ≈ <strong>{formData.avgCycleTime} min/trip</strong>
                      </span>
                    </div>

                    {/* Financial Breakdown from Strategy */}
                    {strategyFinancials && (
                      <div className="mt-3 pt-2 border-t-2 border-blue-200">
                        <h5 className="font-semibold text-blue-900 mb-1">Financial Projection (Estimasi)</h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between text-green-700">
                            <span>Revenue:</span>
                            <strong>{strategyFinancials.REVENUE}</strong>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Fuel Cost:</span>
                            <span>{strategyFinancials.FUEL_COST}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Queue Cost:</span>
                            <span>{strategyFinancials.QUEUE_COST}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Demurrage:</span>
                            <span>{strategyFinancials.DEMURRAGE}</span>
                          </div>
                          <div className="col-span-2 flex justify-between border-t border-blue-300 pt-1 mt-1 text-blue-900 font-bold text-sm">
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

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Actuals & Quality</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Production (ton) *</label>
                  <input type="number" step="0.01" value={formData.actualProduction} onChange={(e) => setFormData({ ...formData, actualProduction: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Utilization Rate (%)</label>
                  <input type="number" step="0.01" value={formData.utilizationRate} onChange={(e) => setFormData({ ...formData, utilizationRate: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avg Calori</label>
                  <input type="number" step="0.01" value={formData.avgCalori} onChange={(e) => setFormData({ ...formData, avgCalori: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avg Ash (%)</label>
                  <input type="number" step="0.01" value={formData.avgAshContent} onChange={(e) => setFormData({ ...formData, avgAshContent: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avg Sulfur (%)</label>
                  <input type="number" step="0.01" value={formData.avgSulfur} onChange={(e) => setFormData({ ...formData, avgSulfur: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avg Moisture (%)</label>
                  <input type="number" step="0.01" value={formData.avgMoisture} onChange={(e) => setFormData({ ...formData, avgMoisture: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
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
