import React from 'react';
import { CloudSun, CloudRain, Cloud, Sun, Truck, Wrench, Shovel, Package, Ship, Calendar, Clock, Activity, RefreshCw } from 'lucide-react';

const RealtimeStatus = ({ data, onRefresh }) => {
  if (!data) return null;

  const { weather, operational, upcomingSchedules } = data;

  const getWeatherIcon = (condition) => {
    const iconClass = 'w-10 h-10';
    switch (condition?.toLowerCase()) {
      case 'cerah':
        return <Sun className={`${iconClass} text-amber-400`} strokeWidth={1.5} />;
      case 'hujan ringan':
        return <CloudRain className={`${iconClass} text-blue-400`} strokeWidth={1.5} />;
      case 'hujan lebat':
        return <CloudRain className={`${iconClass} text-blue-500`} strokeWidth={1.5} />;
      case 'mendung':
        return <Cloud className={`${iconClass} text-slate-400`} strokeWidth={1.5} />;
      case 'berawan':
        return <CloudSun className={`${iconClass} text-blue-300`} strokeWidth={1.5} />;
      default:
        return <CloudSun className={`${iconClass} text-blue-300`} strokeWidth={1.5} />;
    }
  };

  const getWeatherBg = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'cerah':
        return 'from-amber-500/10 to-orange-500/10 border-amber-500/20';
      case 'hujan ringan':
      case 'hujan lebat':
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/20';
      default:
        return 'from-slate-500/10 to-blue-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-6 mb-6 shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <Activity className="w-5 h-5 text-blue-400" strokeWidth={2} />
          </div>
          Real-time Operational Status
        </h2>
        {onRefresh && (
          <button onClick={onRefresh} className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors group" title="Refresh data">
            <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Weather Card */}
        <div className={`bg-gradient-to-br ${getWeatherBg(weather?.condition)} border p-4 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg`}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">{getWeatherIcon(weather?.condition)}</div>
            <h3 className="font-semibold text-slate-200 text-sm">Weather</h3>
            <p className="text-slate-300 font-medium mt-1">{weather?.condition || 'N/A'}</p>
            {weather?.temperature && <p className="text-slate-400 text-sm mt-0.5">{weather.temperature}°C</p>}
          </div>
        </div>

        {/* Active Hauling Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/5">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-blue-500/20 rounded-xl mb-3">
              <Truck className="w-7 h-7 text-blue-400" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm">Active Hauling</h3>
            <p className="text-3xl font-bold text-blue-400 mt-1">{operational?.activeHauling || 0}</p>
          </div>
        </div>

        {/* Available Trucks Card */}
        <div className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 p-4 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/5">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-sky-500/20 rounded-xl mb-3">
              <Wrench className="w-7 h-7 text-sky-400" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm">Trucks Available</h3>
            <p className="text-2xl font-bold text-sky-400 mt-1">
              <span>{operational?.availableTrucks || 0}</span>
              <span className="text-slate-500 text-lg font-normal">/{operational?.totalTrucks || 0}</span>
            </p>
          </div>
        </div>

        {/* Excavators Ready Card */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 p-4 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/5">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-indigo-500/20 rounded-xl mb-3">
              <Shovel className="w-7 h-7 text-indigo-400" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm">Excavators Ready</h3>
            <p className="text-2xl font-bold text-indigo-400 mt-1">
              <span>{operational?.availableExcavators || 0}</span>
              <span className="text-slate-500 text-lg font-normal">/{operational?.totalExcavators || 0}</span>
            </p>
          </div>
        </div>

        {/* Today's Production Card */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 p-4 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/5">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-cyan-500/20 rounded-xl mb-3">
              <Package className="w-7 h-7 text-cyan-400" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm">Today's Production</h3>
            <p className="text-xl font-bold text-cyan-400 mt-1">
              {(operational?.todayProduction || 0).toLocaleString()} <span className="text-sm font-normal">T</span>
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Schedules Section */}
      {upcomingSchedules && upcomingSchedules.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-700/50">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            <span>Upcoming Sailing Schedules</span>
            <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">{upcomingSchedules.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingSchedules.slice(0, 3).map((schedule, index) => (
              <div key={index} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl hover:bg-slate-800/70 hover:border-blue-500/30 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-slate-100 group-hover:text-blue-100 transition-colors">{schedule.vessel?.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(schedule.etsLoading).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Package className="w-3.5 h-3.5" />
                      <span>{schedule.plannedQuantity?.toLocaleString()} Ton</span>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      schedule.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' : schedule.status === 'LOADING' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {schedule.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated Timestamp */}
      <div className="mt-5 pt-3 border-t border-slate-700/30 flex items-center justify-end gap-2 text-xs text-slate-500">
        <Clock className="w-3.5 h-3.5" />
        <span>
          Last updated:{' '}
          {new Date(data.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
};

export default RealtimeStatus;
