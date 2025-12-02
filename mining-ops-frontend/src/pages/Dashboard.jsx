import React, { useEffect, useState } from 'react';
import { dashboardService } from '../services';
import { miningSiteService, loadingPointService, dumpingPointService, roadSegmentService } from '../services/locationService';
import { truckService, excavatorService, operatorService } from '../services/equipmentService';
import { productionService } from '../services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Truck, Construction, Package, TrendingUp, AlertTriangle, Map as MapIcon, DollarSign, Users, Database } from 'lucide-react';
import MiningMap from '../components/MiningMap';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState({
    sites: [],
    loadingPoints: [],
    dumpingPoints: [],
    roads: [],
  });
  const [operationalData, setOperationalData] = useState({
    trucks: [],
    excavators: [],
    operators: [],
    productions: [],
  });
  const [showDataPreview, setShowDataPreview] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, sitesRes, loadingRes, dumpingRes, roadsRes, trucksRes, excRes, opRes, prodRes] = await Promise.all([
        dashboardService.getOverview(),
        miningSiteService.getAll(),
        loadingPointService.getAll(),
        dumpingPointService.getAll(),
        roadSegmentService.getAll(),
        truckService.getAll({ limit: 10 }),
        excavatorService.getAll({ limit: 10 }),
        operatorService.getAll({ limit: 10 }),
        productionService.getAll({ limit: 10 }),
      ]);

      setOverview(overviewRes.data);
      setMapData({
        sites: Array.isArray(sitesRes.data) ? sitesRes.data : [],
        loadingPoints: Array.isArray(loadingRes.data) ? loadingRes.data : [],
        dumpingPoints: Array.isArray(dumpingRes.data) ? dumpingRes.data : [],
        roads: Array.isArray(roadsRes.data) ? roadsRes.data : [],
      });
      setOperationalData({
        trucks: Array.isArray(trucksRes.data) ? trucksRes.data : [],
        excavators: Array.isArray(excRes.data) ? excRes.data : [],
        operators: Array.isArray(opRes.data) ? opRes.data : [],
        productions: Array.isArray(prodRes.data) ? prodRes.data : [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
        <MiningMap sites={mapData.sites} loadingPoints={mapData.loadingPoints} dumpingPoints={mapData.dumpingPoints} roads={mapData.roads} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <span className="font-semibold">{overview?.production?.todayTarget?.toFixed(0) || 0} ton</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Actual Today</span>
              <span className="font-semibold">{overview?.production?.todayActual?.toFixed(0) || 0} ton</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Achievement</span>
              <span className={`font-semibold ${overview?.production?.todayAchievement >= 100 ? 'text-green-600' : 'text-orange-600'}`}>{(overview?.production?.todayAchievement || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Trips</span>
              <span className="font-semibold">{overview?.activeHauling || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="text-green-600" size={24} />
            <h2 className="text-xl font-bold">Financial Overview (Est.)</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fuel Cost (Today)</span>
              <span className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(overview?.financials?.estimatedFuelCost || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Operator Cost (Daily)</span>
              <span className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(overview?.financials?.estimatedOperatorCost || 0)}</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="font-bold text-gray-800">Total Est. Cost</span>
              <span className="font-bold text-red-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format((overview?.financials?.estimatedFuelCost || 0) + (overview?.financials?.estimatedOperatorCost || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showDataPreview && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Database className="text-blue-600" size={20} />
                <h2 className="text-xl font-bold">Data Operasional Real-Time</h2>
              </div>
              <button onClick={() => setShowDataPreview(false)} className="text-sm text-gray-600 hover:text-gray-800">
                Sembunyikan
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border rounded p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Truck className="text-blue-600" size={18} />
                  <h3 className="font-semibold">Truck Preview ({operationalData.trucks.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kapasitas</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {operationalData.trucks.slice(0, 5).map((truck) => (
                        <tr key={truck.id}>
                          <td className="px-3 py-2">{truck.code}</td>
                          <td className="px-3 py-2">{truck.model}</td>
                          <td className="px-3 py-2">{truck.capacity}t</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${truck.status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{truck.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Construction className="text-green-600" size={18} />
                  <h3 className="font-semibold">Excavator Preview ({operationalData.excavators.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {operationalData.excavators.slice(0, 5).map((exc) => (
                        <tr key={exc.id}>
                          <td className="px-3 py-2">{exc.code}</td>
                          <td className="px-3 py-2">{exc.model}</td>
                          <td className="px-3 py-2">{exc.productionRate}t/m</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${exc.status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{exc.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="text-purple-600" size={18} />
                  <h3 className="font-semibold">Operator Preview ({operationalData.operators.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">No. Pegawai</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gaji</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {operationalData.operators.slice(0, 5).map((op) => (
                        <tr key={op.id}>
                          <td className="px-3 py-2">{op.employeeNumber}</td>
                          <td className="px-3 py-2">{op.user?.name || '-'}</td>
                          <td className="px-3 py-2">{op.shift}</td>
                          <td className="px-3 py-2">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(op.salary || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="text-orange-600" size={18} />
                  <h3 className="font-semibold">Production Preview ({operationalData.productions.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {operationalData.productions.slice(0, 5).map((prod) => (
                        <tr key={prod.id}>
                          <td className="px-3 py-2">{new Date(prod.recordDate).toLocaleDateString('id-ID')}</td>
                          <td className="px-3 py-2">{prod.miningSite?.code || '-'}</td>
                          <td className="px-3 py-2">{prod.targetProduction?.toFixed(0)}t</td>
                          <td className="px-3 py-2">{prod.actualProduction?.toFixed(0)}t</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showDataPreview && (
        <div className="card text-center">
          <button onClick={() => setShowDataPreview(true)} className="btn-primary mx-auto flex items-center space-x-2">
            <Database size={18} />
            <span>Tampilkan Preview Data Operasional</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
