import React, { useState, useEffect } from 'react';
import excavatorService from '../../services/excavatorService';
import vesselService from '../../services/vesselService';
import roadSegmentService from '../../services/roadSegmentService';
import { miningSiteService } from '../../services/locationService';
import { weatherService } from '../../services';
import SearchableDropdown from '../UI/SearchableDropdown';
import { MapPin, Clock, Route, Truck, Shovel, Ship, Settings, DollarSign, ChevronDown, ChevronUp, Sparkles, Target, Fuel, AlertCircle, Zap } from 'lucide-react';

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
      {/* Site Selection Section */}
      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5 shadow-lg shadow-blue-500/5">
        <h3 className="text-sm font-bold text-blue-300 mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <MapPin className="w-4 h-4 text-blue-400" strokeWidth={2} />
          </div>
          Site Selection (Auto-fills Weather)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5">Mining Site (Optional)</label>
            <SearchableDropdown
              options={[{ id: '', code: 'ALL', name: 'All Sites', siteType: 'Manual Weather Selection' }, ...miningSites]}
              value={formData.miningSiteId}
              onChange={(val) => handleMiningSiteChange({ target: { value: val } })}
              placeholder="All Sites - Manual Weather Selection"
              searchPlaceholder="Search mining sites..."
              displayKey="name"
              valueKey="id"
              pageSize={8}
              renderOption={(site, isSelected) => (
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-500/30' : 'bg-slate-700/50'}`}>
                    <MapPin className={`w-4 h-4 ${isSelected ? 'text-blue-300' : 'text-slate-400'}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {site.code} - {site.name}
                    </div>
                    <div className="text-xs text-slate-500">{site.siteType}</div>
                  </div>
                </div>
              )}
              renderSelected={(site) => (site.id ? `${site.code} - ${site.name} (${site.siteType})` : 'All Sites - Manual Weather Selection')}
            />
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              {formData.miningSiteId ? (
                <>
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span className="text-blue-400">Weather auto-filled from latest site data</span>
                </>
              ) : (
                'Select site to auto-fill weather'
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5">Weather Condition</label>
            <SearchableDropdown
              options={[
                { value: 'Cerah', label: 'Cerah (Clear)', icon: '☀️' },
                { value: 'Hujan Ringan', label: 'Hujan Ringan (Light Rain)', icon: '🌦️' },
                { value: 'Hujan Lebat', label: 'Hujan Lebat (Heavy Rain)', icon: '🌧️' },
              ]}
              value={formData.weatherCondition}
              onChange={(val) => handleChange({ target: { name: 'weatherCondition', value: val } })}
              placeholder="Select weather condition"
              displayKey="label"
              valueKey="value"
              pageSize={5}
              allowClear={false}
              renderOption={(opt, isSelected) => (
                <div className="flex items-center gap-3">
                  <span className="text-lg">{opt.icon}</span>
                  <span className={isSelected ? 'text-blue-200' : ''}>{opt.label}</span>
                </div>
              )}
              renderSelected={(opt) => `${opt.icon} ${opt.label}`}
            />
            {formData.miningSiteId && (
              <p className="text-xs text-blue-400 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Auto-filled from mining site weather data
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Shift and Road Condition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
            Shift
          </label>
          <SearchableDropdown
            options={[
              { value: 'SHIFT_1', label: 'Shift 1 (Pagi)', time: '06:00 - 14:00' },
              { value: 'SHIFT_2', label: 'Shift 2 (Siang)', time: '14:00 - 22:00' },
              { value: 'SHIFT_3', label: 'Shift 3 (Malam)', time: '22:00 - 06:00' },
            ]}
            value={formData.shift}
            onChange={(val) => handleChange({ target: { name: 'shift', value: val } })}
            placeholder="Select shift"
            displayKey="label"
            valueKey="value"
            pageSize={5}
            allowClear={false}
            renderOption={(opt, isSelected) => (
              <div className="flex items-center justify-between w-full">
                <span className={isSelected ? 'text-blue-200' : ''}>{opt.label}</span>
                <span className="text-xs text-slate-500">{opt.time}</span>
              </div>
            )}
          />
          <p className="text-xs text-slate-500 mt-2">ML will match with hauling data from this shift</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 mb-2.5 flex items-center gap-2">
            <Route className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
            Road Condition
          </label>
          <SearchableDropdown
            options={[
              { value: 'GOOD', label: 'Good', description: 'Optimal for operations' },
              { value: 'FAIR', label: 'Fair', description: 'Moderate conditions' },
              { value: 'POOR', label: 'Poor', description: 'Challenging conditions' },
              { value: 'LICIN', label: 'Licin (Slippery)', description: 'Wet/slippery surface' },
            ]}
            value={formData.roadCondition}
            onChange={(val) => handleChange({ target: { name: 'roadCondition', value: val } })}
            placeholder="Select road condition"
            displayKey="label"
            valueKey="value"
            pageSize={5}
            allowClear={false}
            renderOption={(opt, isSelected) => (
              <div className="flex flex-col">
                <span className={isSelected ? 'text-blue-200 font-medium' : 'font-medium'}>{opt.label}</span>
                <span className="text-xs text-slate-500">{opt.description}</span>
              </div>
            )}
          />
          {formData.targetRoadId && (
            <p className="text-xs text-blue-400 mt-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Auto-filled from selected road segment
            </p>
          )}
        </div>
      </div>

      {/* Road & Equipment Selection */}
      <div className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-2xl p-5 shadow-lg shadow-sky-500/5">
        <h3 className="text-sm font-bold text-sky-300 mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-sky-500/20 rounded-lg">
            <Route className="w-4 h-4 text-sky-400" strokeWidth={2} />
          </div>
          Road & Equipment Selection (Auto-fills Road Condition)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5">
              Preferred Road Segment
              {formData.miningSiteId && <span className="text-sky-400 ml-1">(Filtered by Site)</span>}
            </label>
            <SearchableDropdown
              options={[{ id: '', code: 'AUTO', name: 'Auto - AI will explore all roads', distance: null, roadCondition: 'AUTO' }, ...filteredRoadSegments]}
              value={formData.targetRoadId}
              onChange={(val) => handleRoadChange({ target: { value: val } })}
              placeholder="Auto - AI will explore all roads"
              searchPlaceholder="Search road segments..."
              displayKey="name"
              valueKey="id"
              pageSize={8}
              renderOption={(road, isSelected) => (
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-sky-500/30' : 'bg-slate-700/50'}`}>
                    <Route className={`w-4 h-4 ${isSelected ? 'text-sky-300' : 'text-slate-400'}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {road.code} - {road.name}
                    </div>
                    {road.distance && (
                      <div className="text-xs text-slate-500">
                        {road.distance?.toFixed(2)}km • {road.roadCondition}
                      </div>
                    )}
                  </div>
                </div>
              )}
              renderSelected={(road) => (road.id ? `${road.code} - ${road.name} (${road.distance?.toFixed(2)}km)` : 'Auto - AI will explore all roads')}
            />
            <p className="text-xs text-slate-500 mt-2">
              {filteredRoadSegments.length} road segments available
              {formData.targetRoadId && ' • Road condition auto-filled'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5">Preferred Excavator</label>
            <SearchableDropdown
              options={[{ id: '', code: 'AUTO', model: 'Auto - AI will explore all excavators', productionRate: null }, ...excavators]}
              value={formData.targetExcavatorId}
              onChange={(val) => handleChange({ target: { name: 'targetExcavatorId', value: val } })}
              placeholder="Auto - AI will explore all excavators"
              searchPlaceholder="Search excavators..."
              displayKey="model"
              valueKey="id"
              pageSize={8}
              renderOption={(exc, isSelected) => (
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-sky-500/30' : 'bg-slate-700/50'}`}>
                    <Shovel className={`w-4 h-4 ${isSelected ? 'text-sky-300' : 'text-slate-400'}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {exc.code} - {exc.model}
                    </div>
                    {exc.productionRate && <div className="text-xs text-slate-500">{exc.productionRate}t/min</div>}
                  </div>
                </div>
              )}
              renderSelected={(exc) => (exc.id ? `${exc.code} - ${exc.model} (${exc.productionRate}t/min)` : 'Auto - AI will explore all excavators')}
            />
            <p className="text-xs text-slate-500 mt-2">{excavators.length} excavators available</p>
          </div>
        </div>
      </div>

      {/* Target Sailing Schedule */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-5 shadow-lg shadow-cyan-500/5">
        <h3 className="text-sm font-bold text-cyan-300 mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 rounded-lg">
            <Ship className="w-4 h-4 text-cyan-400" strokeWidth={2} />
          </div>
          Target Sailing Schedule
        </h3>
        <SearchableDropdown
          options={[{ id: '', vessel: { name: 'No specific schedule' }, etsLoading: null, plannedQuantity: null, status: 'AI will use random vessel' }, ...schedules]}
          value={formData.targetScheduleId}
          onChange={(val) => handleChange({ target: { name: 'targetScheduleId', value: val } })}
          placeholder="No specific schedule - AI will use random vessel"
          searchPlaceholder="Search vessels or schedules..."
          displayKey="vessel.name"
          valueKey="id"
          pageSize={8}
          renderOption={(schedule, isSelected) => (
            <div className="flex items-center gap-3 w-full">
              <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-cyan-500/30' : 'bg-slate-700/50'}`}>
                <Ship className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{schedule.vessel?.name || 'Unknown'}</div>
                {schedule.etsLoading && (
                  <div className="text-xs text-slate-500">
                    {new Date(schedule.etsLoading).toLocaleDateString('id-ID')} • {schedule.plannedQuantity?.toFixed(0)}T
                  </div>
                )}
              </div>
              {schedule.status && schedule.id && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${schedule.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' : schedule.status === 'LOADING' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {schedule.status}
                </span>
              )}
            </div>
          )}
          renderSelected={(schedule) =>
            schedule.id ? `${schedule.vessel?.name} - ${new Date(schedule.etsLoading).toLocaleDateString('id-ID')} (${schedule.plannedQuantity?.toFixed(0)}T)` : 'No specific schedule - AI will use random vessel'
          }
        />
        {selectedScheduleInfo && (
          <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <p className="font-semibold text-cyan-300 flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Selected: {selectedScheduleInfo.vesselName}
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-cyan-400">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Target: {selectedScheduleInfo.plannedQuantity?.toFixed(0)} Ton
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                ETS: {new Date(selectedScheduleInfo.etsLoading).toLocaleDateString('id-ID')}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${selectedScheduleInfo.status === 'SCHEDULED' ? 'bg-blue-500/20' : selectedScheduleInfo.status === 'LOADING' ? 'bg-cyan-500/20' : 'bg-slate-500/20'}`}>
                {selectedScheduleInfo.status}
              </span>
            </div>
          </div>
        )}
        <p className="text-xs text-cyan-400/80 mt-3 flex items-center gap-1.5">
          {formData.targetScheduleId ? (
            <>
              <Sparkles className="w-3 h-3" />
              Recommendation strategy will use this specific vessel schedule
            </>
          ) : (
            'Leave blank for AI to select randomly from available schedules'
          )}
        </p>
      </div>

      {/* Decision Variables Section */}
      <div className="border-t border-slate-700/50 pt-6">
        <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <Settings className="w-5 h-5 text-blue-400" strokeWidth={2} />
          </div>
          Decision Variables
        </h3>
        <p className="text-sm text-slate-400 mb-5">AI will test multiple scenarios between min/max ranges to find optimal configurations</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Truck Allocation */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
            <label className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
              Truck Allocation Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Min Trucks</label>
                <input
                  type="number"
                  name="minTrucks"
                  value={formData.minTrucks}
                  onChange={handleNumberChange}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Max Trucks</label>
                <input
                  type="number"
                  name="maxTrucks"
                  value={formData.maxTrucks}
                  onChange={handleNumberChange}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-blue-400" />
              AI will explore {formData.minTrucks} to {formData.maxTrucks} trucks
            </p>
          </div>

          {/* Excavator Allocation */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
            <label className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Shovel className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
              Excavator Allocation Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Min Excavators</label>
                <input
                  type="number"
                  name="minExcavators"
                  value={formData.minExcavators}
                  onChange={handleNumberChange}
                  min="1"
                  max="20"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Max Excavators</label>
                <input
                  type="number"
                  name="maxExcavators"
                  value={formData.maxExcavators}
                  onChange={handleNumberChange}
                  min="1"
                  max="20"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-blue-400" />
              AI will explore {formData.minExcavators} to {formData.maxExcavators} excavators
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t border-slate-700/50 pt-6">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center gap-2">
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <DollarSign className="w-4 h-4" />
          Advanced Options (Financial Parameters)
        </button>

        {showAdvanced && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <p className="col-span-2 text-sm text-slate-400 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              Financial Parameters (IDR)
            </p>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Target Produksi Batubara (Ton)
              </label>
              <input
                type="number"
                name="totalProductionTarget"
                value={formData.totalProductionTarget}
                onChange={handleNumberChange}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Opsional (0 = Auto)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Coal Price (per Ton)</label>
              <input
                type="number"
                name="coalPrice"
                value={formData.coalPrice}
                onChange={handleNumberChange}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5" />
                Fuel Price (per Liter)
              </label>
              <input
                type="number"
                name="fuelPrice"
                value={formData.fuelPrice}
                onChange={handleNumberChange}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Queue Cost (per Hour)</label>
              <input
                type="number"
                name="queueCost"
                value={formData.queueCost}
                onChange={handleNumberChange}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Demurrage Cost (per Hour)</label>
              <input
                type="number"
                name="demurrageCost"
                value={formData.demurrageCost}
                onChange={handleNumberChange}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Incident Risk Cost (Avg)
              </label>
              <input
                type="number"
                name="incidentCost"
                value={formData.incidentCost}
                onChange={handleNumberChange}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Get AI Recommendations</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ParameterForm;
