import React from 'react';

const RealtimeStatus = ({ data }) => {
  if (!data) return null;

  const { weather, operational, upcomingSchedules } = data;

  const getWeatherIcon = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'cerah':
        return '☀️';
      case 'hujan ringan':
        return '🌦️';
      case 'hujan lebat':
        return '🌧️';
      default:
        return '🌤️';
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-6 mb-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center">
        <span className="mr-2">📊</span>
        Real-time Operational Status
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Weather */}
        <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl">
          <div className="text-3xl mb-2">{getWeatherIcon(weather?.condition)}</div>
          <h3 className="font-semibold text-slate-300">Weather</h3>
          <p className="text-sm text-slate-400">{weather?.condition || 'N/A'}</p>
          {weather?.temperature && <p className="text-xs text-slate-500">{weather.temperature}°C</p>}
        </div>

        {/* Active Hauling */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
          <div className="text-3xl mb-2">🚛</div>
          <h3 className="font-semibold text-slate-300">Active Hauling</h3>
          <p className="text-2xl font-bold text-emerald-400">{operational?.activeHauling || 0}</p>
        </div>

        {/* Available Trucks */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          <div className="text-3xl mb-2">🔧</div>
          <h3 className="font-semibold text-slate-300">Trucks Available</h3>
          <p className="text-2xl font-bold text-amber-400">
            {operational?.availableTrucks || 0}/{operational?.totalTrucks || 0}
          </p>
        </div>

        {/* Available Excavators */}
        <div className="bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl">
          <div className="text-3xl mb-2">⛏️</div>
          <h3 className="font-semibold text-slate-300">Excavators Ready</h3>
          <p className="text-2xl font-bold text-violet-400">
            {operational?.availableExcavators || 0}/{operational?.totalExcavators || 0}
          </p>
        </div>

        {/* Today's Production */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
          <div className="text-3xl mb-2">📦</div>
          <h3 className="font-semibold text-slate-300">Today's Production</h3>
          <p className="text-lg font-bold text-indigo-400">{(operational?.todayProduction || 0).toLocaleString()} T</p>
        </div>
      </div>

      {/* Upcoming Schedules */}
      {upcomingSchedules && upcomingSchedules.length > 0 && (
        <div className="mt-6 border-t border-slate-700/50 pt-4">
          <h3 className="font-semibold text-slate-300 mb-3">🚢 Upcoming Sailing Schedules ({upcomingSchedules.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingSchedules.slice(0, 3).map((schedule, index) => (
              <div key={index} className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl">
                <div className="font-medium text-sm text-slate-200">{schedule.vessel?.name}</div>
                <div className="text-xs text-slate-400 mt-1">Deadline: {new Date(schedule.etsLoading).toLocaleDateString()}</div>
                <div className="text-xs text-slate-400">Target: {schedule.plannedQuantity?.toLocaleString()} T</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-4 text-xs text-slate-500 text-right">Last updated: {new Date(data.timestamp).toLocaleTimeString()}</div>
    </div>
  );
};

export default RealtimeStatus;
