import React, { useState, useEffect } from 'react';
import excavatorService from '../../services/excavatorService';
import vesselService from '../../services/vesselService';
import roadSegmentService from '../../services/roadSegmentService';

const ParameterForm = ({ onSubmit, realtimeData, loading }) => {
  const [formData, setFormData] = useState({
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
    // Financial Parameters
    coalPrice: 900000,
    fuelPrice: 15000,
    queueCost: 100000,
    demurrageCost: 50000000,
    incidentCost: 500000,
    totalProductionTarget: 0, // New field
  });

  const [excavators, setExcavators] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadFormOptions();
  }, []);

  useEffect(() => {
    if (realtimeData) {
      // Auto-populate from realtime data
      // Removed to prevent overwriting the full schedule list with limited upcoming schedules
      // if (realtimeData.upcomingSchedules) {
      //   setSchedules(realtimeData.upcomingSchedules);
      // }
      if (realtimeData.weather) {
        setFormData((prev) => ({
          ...prev,
          weatherCondition: realtimeData.weather.condition || 'Cerah',
        }));
      }
    }
  }, [realtimeData]);

  const loadFormOptions = async () => {
    try {
      const [excavatorRes, scheduleRes, roadRes] = await Promise.all([
        excavatorService.getAll({ isActive: true, limit: 100 }),
        vesselService.getAllSchedules({ status: 'SCHEDULED', limit: 100 }),
        roadSegmentService.getAll({ isActive: true, limit: 100 }),
      ]);

      if (excavatorRes.success && excavatorRes.data) {
        setExcavators(excavatorRes.data);
      }
      if (scheduleRes.success && scheduleRes.data) {
        setSchedules(scheduleRes.data);
      }
      if (roadRes.success && roadRes.data) {
        setRoadSegments(roadRes.data);
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

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Weather Condition</label>
          <select name="weatherCondition" value={formData.weatherCondition} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="Cerah">Cerah</option>
            <option value="Hujan Ringan">Hujan Ringan</option>
            <option value="Hujan Lebat">Hujan Lebat</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Road Condition</label>
          <select name="roadCondition" value={formData.roadCondition} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="POOR">Poor</option>
            <option value="LICIN">Licin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
          <select name="shift" value={formData.shift} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="SHIFT_1">Shift 1</option>
            <option value="SHIFT_2">Shift 2</option>
            <option value="SHIFT_3">Shift 3</option>
          </select>
        </div>
      </div>

      {/* Resource Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Road Segment (Optional - Leave blank for AI auto-selection)</label>
          <select name="targetRoadId" value={formData.targetRoadId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Auto - AI will explore all roads</option>
            {roadSegments.map((road) => (
              <option key={road.id} value={road.id}>
                {road.code} - {road.name} ({road.distance}km)
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">AI will test {roadSegments.length} road segments from database</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Excavator (Optional - Leave blank for AI auto-selection)</label>
          <select name="targetExcavatorId" value={formData.targetExcavatorId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Auto - AI will explore all excavators</option>
            {excavators.map((exc) => (
              <option key={exc.id} value={exc.id}>
                {exc.code} - {exc.model}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">AI will test {excavators.length} excavators from database</p>
        </div>
      </div>

      {/* Optional: Sailing Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Target Sailing Schedule (Optional)</label>
        <select name="targetScheduleId" value={formData.targetScheduleId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">No specific schedule</option>
          {schedules.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {schedule.vessel?.name} - {new Date(schedule.etsLoading).toLocaleDateString()} ({schedule.plannedQuantity}T)
            </option>
          ))}
        </select>
      </div>

      {/* Decision Variables */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Decision Variables</h3>
        <p className="text-sm text-gray-600 mb-4">AI will test multiple scenarios between min/max ranges to find optimal configurations</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Truck Range */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Truck Allocation Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Trucks</label>
                <input
                  type="number"
                  name="minTrucks"
                  value={formData.minTrucks}
                  onChange={handleNumberChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Trucks</label>
                <input
                  type="number"
                  name="maxTrucks"
                  value={formData.maxTrucks}
                  onChange={handleNumberChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              AI will explore {formData.minTrucks} to {formData.maxTrucks} trucks
            </p>
          </div>

          {/* Excavator Range */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Excavator Allocation Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Excavators</label>
                <input
                  type="number"
                  name="minExcavators"
                  value={formData.minExcavators}
                  onChange={handleNumberChange}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Excavators</label>
                <input
                  type="number"
                  name="maxExcavators"
                  value={formData.maxExcavators}
                  onChange={handleNumberChange}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              AI will explore {formData.minExcavators} to {formData.maxExcavators} excavators
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          {showAdvanced ? '▼' : '▶'} Advanced Options (Financial Parameters)
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
            <p className="col-span-2 text-sm text-gray-600 mb-2">Financial Parameters (IDR)</p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Produksi Batubara (Ton)</label>
              <input type="number" name="totalProductionTarget" value={formData.totalProductionTarget} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Opsional (0 = Auto)" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Coal Price (per Ton)</label>
              <input type="number" name="coalPrice" value={formData.coalPrice} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fuel Price (per Liter)</label>
              <input type="number" name="fuelPrice" value={formData.fuelPrice} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Queue Cost (per Hour)</label>
              <input type="number" name="queueCost" value={formData.queueCost} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Demurrage Cost (per Hour)</label>
              <input type="number" name="demurrageCost" value={formData.demurrageCost} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Incident Risk Cost (Avg)</label>
              <input type="number" name="incidentCost" value={formData.incidentCost} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed">
          {loading ? 'Simulating...' : 'Get Recommendations'}
        </button>
      </div>
    </form>
  );
};

export default ParameterForm;
