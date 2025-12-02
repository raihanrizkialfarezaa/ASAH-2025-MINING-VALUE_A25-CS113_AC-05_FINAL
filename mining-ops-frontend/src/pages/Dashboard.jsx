import React, { useEffect, useState } from 'react';
import { dashboardService } from '../services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Truck, Construction, Package, TrendingUp, AlertTriangle, Map as MapIcon } from 'lucide-react';
import MiningMap from '../components/MiningMap';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const overviewRes = await dashboardService.getOverview();
      setOverview(overviewRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const stats = [
    {
      icon: Truck,
      label: 'Active Trucks',
      value: overview?.fleetStatus?.trucksOperating || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Construction,
      label: 'Active Excavators',
      value: overview?.fleetStatus?.excavatorsOperating || 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Package,
      label: 'Total Hauling',
      value: overview?.activeHauling || 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: TrendingUp,
      label: "Today's Production",
      value: `${overview?.todayProduction?.toFixed(0) || 0} ton`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Geospatial Visualization (Map) */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <MapIcon className="text-blue-600" size={20} />
          <h2 className="text-xl font-bold">Live Mining Operations Map</h2>
        </div>
        <MiningMap />
      </div>

      {overview?.alerts && overview.alerts.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="text-red-600" size={20} />
            <h2 className="text-xl font-bold">Alerts</h2>
          </div>
          <div className="space-y-2">
            {overview.alerts.map((alert, index) => (
              <div key={index} className="bg-red-50 p-3 rounded border-l-4 border-red-600">
                <p className="text-sm text-red-800">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Fleet Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Trucks Operating</span>
              <span className="font-semibold">{overview?.fleetStatus?.trucksOperating || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Trucks Breakdown</span>
              <span className="font-semibold text-red-600">{overview?.fleetStatus?.trucksBreakdown || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Excavators Operating</span>
              <span className="font-semibold">{overview?.fleetStatus?.excavatorsOperating || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Excavators Breakdown</span>
              <span className="font-semibold text-red-600">{overview?.fleetStatus?.excavatorsBreakdown || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Production Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Target Today</span>
              <span className="font-semibold">{overview?.productionTarget?.toFixed(0) || 0} ton</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Actual Today</span>
              <span className="font-semibold">{overview?.todayProduction?.toFixed(0) || 0} ton</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Achievement</span>
              <span className={`font-semibold ${(overview?.todayProduction / overview?.productionTarget) * 100 >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                {((overview?.todayProduction / overview?.productionTarget) * 100 || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Trips</span>
              <span className="font-semibold">{overview?.totalTrips || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
