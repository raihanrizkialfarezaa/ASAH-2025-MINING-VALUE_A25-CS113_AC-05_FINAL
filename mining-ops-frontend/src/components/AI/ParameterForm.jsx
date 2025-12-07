import React, { useState, useEffect } from 'react';
import excavatorService from '../../services/excavatorService';
import vesselService from '../../services/vesselService';
import roadSegmentService from '../../services/roadSegmentService';
import { miningSiteService } from '../../services/locationService';
import { weatherService } from '../../services';

const ParameterForm = ({ onSubmit, realtimeData, loading }) => {
  const [formData, setFormData] = useState({
    miningSiteId: '',
    weatherCondition: 'Cerah',
    roadCondition: 'GOOD',
    shift: 'SHIFT_1',
    targetRoadId: '',
    targetExcavatorId: '',
    targetScheduleId: '',
    minTrucks: 5,
    maxTrucks: 15,
    minExcavators: 1,
    maxExcavators: 3,
    coalPrice: 900000,
    fuelPrice: 15000,
    queueCost: 100000,
    demurrageCost: 50000000,
    incidentCost: 500000,
    totalProductionTarget: 0,
  });

  const [miningSites, setMiningSites] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [filteredRoadSegments, setFilteredRoadSegments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedScheduleInfo, setSelectedScheduleInfo] = useState(null);

  useEffect(() => {
    loadFormOptions();
  }, []);

  useEffect(() => {
    if (realtimeData?.weather && !formData.miningSiteId) {
      setFormData((prev) => ({
        ...prev,
        weatherCondition: realtimeData.weather.condition || 'Cerah',
      }));
    }
  }, [realtimeData, formData.miningSiteId]);

  useEffect(() => {
    if (formData.miningSiteId) {
      const siteRoads = roadSegments.filter((r) => r.miningSiteId === formData.miningSiteId);
      setFilteredRoadSegments(siteRoads);

      const siteWeather = weatherData.filter((w) => w.miningSiteId === formData.miningSiteId);
      if (siteWeather.length > 0) {
        const latestWeather = siteWeather.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        const weatherMap = {
          CERAH: 'Cerah',
          BERAWAN: 'Cerah',
          MENDUNG: 'Cerah',
          HUJAN_RINGAN: 'Hujan Ringan',
          HUJAN_SEDANG: 'Hujan Lebat',
          HUJAN_LEBAT: 'Hujan Lebat',
          KABUT: 'Cerah',
          BADAI: 'Hujan Lebat',
        };

        setFormData((prev) => ({
          ...prev,
          weatherCondition: weatherMap[latestWeather.condition] || 'Cerah',
        }));
      }
    } else {
      setFilteredRoadSegments(roadSegments);
    }
  }, [formData.miningSiteId, roadSegments, weatherData]);

  useEffect(() => {
    if (formData.targetRoadId) {
      const selectedRoad = roadSegments.find((r) => r.id === formData.targetRoadId);
      if (selectedRoad) {
        const roadConditionMap = {
          EXCELLENT: 'GOOD',
          GOOD: 'GOOD',
          FAIR: 'FAIR',
          POOR: 'POOR',
          CRITICAL: 'POOR',
        };
        setFormData((prev) => ({
          ...prev,
          roadCondition: roadConditionMap[selectedRoad.roadCondition] || 'GOOD',
        }));
      }
    }
  }, [formData.targetRoadId, roadSegments]);

  useEffect(() => {
    if (formData.targetScheduleId) {
      const schedule = schedules.find((s) => s.id === formData.targetScheduleId);
      if (schedule) {
        setSelectedScheduleInfo({
          vesselName: schedule.vessel?.name || 'Unknown Vessel',
          plannedQuantity: schedule.plannedQuantity,
          etsLoading: schedule.etsLoading,
          status: schedule.status,
        });
      } else {
        setSelectedScheduleInfo(null);
      }
    } else {
      setSelectedScheduleInfo(null);
    }
  }, [formData.targetScheduleId, schedules]);

  const loadFormOptions = async () => {
    try {
      const [excavatorRes, scheduleRes, roadRes, siteRes, weatherRes] = await Promise.all([
        excavatorService.getAll({ isActive: true, limit: 100 }),
        vesselService.getAllSchedules({ limit: 200 }),
        roadSegmentService.getAll({ isActive: true, limit: 500 }),
        miningSiteService.getAll({ limit: 100 }),
        weatherService.getAll({ limit: 500 }),
      ]);

      if (excavatorRes.success && excavatorRes.data) {
        setExcavators(excavatorRes.data);
      }
      if (scheduleRes.success && scheduleRes.data) {
        const validSchedules = scheduleRes.data.filter((s) => s.status === 'SCHEDULED' || s.status === 'LOADING' || s.status === 'ARRIVED');
        setSchedules(validSchedules);
      }
      if (roadRes.success && roadRes.data) {
        setRoadSegments(roadRes.data);
        setFilteredRoadSegments(roadRes.data);
      }
      if (siteRes.success && siteRes.data) {
        setMiningSites(siteRes.data);
      }
      if (weatherRes.success && weatherRes.data) {
        setWeatherData(weatherRes.data);
      }
    } catch (error) {
      console.error('Failed to load form options:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMiningSiteChange = (e) => {
    const siteId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      miningSiteId: siteId,
      targetRoadId: '',
    }));
  };

  const handleRoadChange = (e) => {
    const roadId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      targetRoadId: roadId,
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const number = parseInt(value) || 0;
    setFormData((prev) => ({
      ...prev,
      [name]: number,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedSite = miningSites.find((s) => s.id === formData.miningSiteId);
    const miningSiteName = selectedSite ? `${selectedSite.code} - ${selectedSite.name}` : '';

    const submitData = {
      ...formData,
      miningSiteName: miningSiteName,
      selectedScheduleInfo: selectedScheduleInfo,
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-sky-300 mb-2"> Site Selection (Auto-fills Weather)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Mining Site (Optional)</label>
            <select
              name="miningSiteId"
              value={formData.miningSiteId}
              onChange={handleMiningSiteChange}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">All Sites - Manual Weather Selection</option>
              {miningSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.code} - {site.name} ({site.siteType})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">{formData.miningSiteId ? 'Weather auto-filled from latest site data' : 'Select site to auto-fill weather'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Weather Condition</label>
            <select
              name="weatherCondition"
              value={formData.weatherCondition}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-slate-800/50 border rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${formData.miningSiteId ? 'border-sky-500/30' : 'border-slate-700/50'}`}
            >
              <option value="Cerah">Cerah</option>
              <option value="Hujan Ringan">Hujan Ringan</option>
              <option value="Hujan Lebat">Hujan Lebat</option>
            </select>
            {formData.miningSiteId && <p className="text-xs text-sky-400 mt-1">✓ Auto-filled from mining site weather data</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Shift</label>
          <select
            name="shift"
            value={formData.shift}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="SHIFT_1">Shift 1 (Pagi)</option>
            <option value="SHIFT_2">Shift 2 (Siang)</option>
            <option value="SHIFT_3">Shift 3 (Malam)</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">ML will match with hauling data from this shift</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Road Condition</label>
          <select
            name="roadCondition"
            value={formData.roadCondition}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-slate-800/50 border rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
              formData.targetRoadId ? 'border-emerald-500/30' : 'border-slate-700/50'
            }`}
          >
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="POOR">Poor</option>
            <option value="LICIN">Licin</option>
          </select>
          {formData.targetRoadId && <p className="text-xs text-emerald-400 mt-1">✓ Auto-filled from selected road segment</p>}
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-emerald-300 mb-2">🛤️ Road & Equipment Selection (Auto-fills Road Condition)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Preferred Road Segment
              {formData.miningSiteId && <span className="text-emerald-400"> (Filtered by Site)</span>}
            </label>
            <select
              name="targetRoadId"
              value={formData.targetRoadId}
              onChange={handleRoadChange}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">Auto - AI will explore all roads</option>
              {filteredRoadSegments.map((road) => (
                <option key={road.id} value={road.id}>
                  {road.code} - {road.name} ({road.distance?.toFixed(2)}km, {road.roadCondition})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {filteredRoadSegments.length} road segments available
              {formData.targetRoadId && ' | Road condition auto-filled'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Excavator</label>
            <select
              name="targetExcavatorId"
              value={formData.targetExcavatorId}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">Auto - AI will explore all excavators</option>
              {excavators.map((exc) => (
                <option key={exc.id} value={exc.id}>
                  {exc.code} - {exc.model} ({exc.productionRate}t/min)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">{excavators.length} excavators available</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-300 mb-2">🚢 Target Sailing Schedule</h3>
        <select
          name="targetScheduleId"
          value={formData.targetScheduleId}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          <option value="">No specific schedule - AI will use random vessel</option>
          {schedules.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {schedule.vessel?.name || 'Unknown'} - {new Date(schedule.etsLoading).toLocaleDateString('id-ID')} ({schedule.plannedQuantity?.toFixed(0)}T) [{schedule.status}]
            </option>
          ))}
        </select>
        {selectedScheduleInfo && (
          <div className="mt-2 p-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-sm">
            <p className="font-semibold text-amber-300">Selected: {selectedScheduleInfo.vesselName}</p>
            <p className="text-amber-400">
              Target: {selectedScheduleInfo.plannedQuantity?.toFixed(0)} Ton | ETS: {new Date(selectedScheduleInfo.etsLoading).toLocaleDateString('id-ID')} | Status: {selectedScheduleInfo.status}
            </p>
          </div>
        )}
        <p className="text-xs text-amber-400 mt-1">{formData.targetScheduleId ? '✓ Recommendation strategy will use this specific vessel schedule' : 'Leave blank for AI to select randomly from available schedules'}</p>
      </div>

      <div className="border-t border-slate-700/50 pt-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Decision Variables</h3>
        <p className="text-sm text-slate-400 mb-4">AI will test multiple scenarios between min/max ranges to find optimal configurations</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Truck Allocation Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Min Trucks</label>
                <input
                  type="number"
                  name="minTrucks"
                  value={formData.minTrucks}
                  onChange={handleNumberChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Max Trucks</label>
                <input
                  type="number"
                  name="maxTrucks"
                  value={formData.maxTrucks}
                  onChange={handleNumberChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              AI will explore {formData.minTrucks} to {formData.maxTrucks} trucks
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Excavator Allocation Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Min Excavators</label>
                <input
                  type="number"
                  name="minExcavators"
                  value={formData.minExcavators}
                  onChange={handleNumberChange}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Max Excavators</label>
                <input
                  type="number"
                  name="maxExcavators"
                  value={formData.maxExcavators}
                  onChange={handleNumberChange}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              AI will explore {formData.minExcavators} to {formData.maxExcavators} excavators
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700/50 pt-4">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors">
          {showAdvanced ? '▼' : '▶'} Advanced Options (Financial Parameters)
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <p className="col-span-2 text-sm text-slate-400 mb-2">Financial Parameters (IDR)</p>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Produksi Batubara (Ton)</label>
              <input
                type="number"
                name="totalProductionTarget"
                value={formData.totalProductionTarget}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Opsional (0 = Auto)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Coal Price (per Ton)</label>
              <input
                type="number"
                name="coalPrice"
                value={formData.coalPrice}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Fuel Price (per Liter)</label>
              <input
                type="number"
                name="fuelPrice"
                value={formData.fuelPrice}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Queue Cost (per Hour)</label>
              <input
                type="number"
                name="queueCost"
                value={formData.queueCost}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Demurrage Cost (per Hour)</label>
              <input
                type="number"
                name="demurrageCost"
                value={formData.demurrageCost}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Incident Risk Cost (Avg)</label>
              <input
                type="number"
                name="incidentCost"
                value={formData.incidentCost}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
          {loading ? 'Simulating...' : 'Get Recommendations'}
        </button>
      </div>
    </form>
  );
};

export default ParameterForm;
