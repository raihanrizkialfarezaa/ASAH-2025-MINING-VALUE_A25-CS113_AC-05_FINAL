import React, { useEffect, useState } from 'react';
import { dashboardService } from '../services';
import { miningSiteService, loadingPointService, dumpingPointService, roadSegmentService } from '../services/locationService';
import { truckService, excavatorService, operatorService } from '../services/equipmentService';
import { productionService, weatherService } from '../services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Truck,
  Construction,
  Package,
  TrendingUp,
  AlertTriangle,
  Map as MapIcon,
  DollarSign,
  Users,
  Database,
  Activity,
  Clock,
  Wrench,
  CloudRain,
  Calendar,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Gauge,
  Target,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Fuel,
  Navigation,
} from 'lucide-react';
import MiningMap from '../components/MiningMap';

// ============================================
// MINING OPS PRO - DARK THEME STYLES
// ============================================
const theme = {
  // Cards
  card: 'rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-xl',
  cardHover: 'hover:border-sky-500/30 hover:shadow-sky-500/5 transition-all duration-300',
  cardAccent: 'rounded-xl border border-sky-500/30 bg-gradient-to-br from-slate-900 to-slate-950 shadow-xl shadow-sky-500/5',

  // Text
  title: 'text-slate-100 font-bold',
  subtitle: 'text-slate-400 text-sm',
  label: 'text-slate-500 text-xs font-medium uppercase tracking-wider',
  value: 'text-slate-100 font-bold',

  // Icons
  iconBox: 'p-3 rounded-xl bg-slate-800/60 border border-slate-700/50',
  iconBoxAccent: 'p-3 rounded-xl bg-sky-500/10 border border-sky-500/20',

  // Stats
  statPositive: 'text-emerald-400',
  statNegative: 'text-rose-400',
  statNeutral: 'text-slate-400',

  // Badges
  badge: 'px-2.5 py-1 rounded-full text-xs font-semibold',
  badgeSuccess: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  badgeWarning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  badgeDanger: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
  badgeInfo: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  badgeNeutral: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',

  // Grids
  gridItem: 'rounded-xl p-4 bg-slate-800/40 border border-slate-700/40',
};

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
  const [equipmentUtilization, setEquipmentUtilization] = useState(null);
  const [delayAnalysis, setDelayAnalysis] = useState(null);
  const [maintenanceOverview, setMaintenanceOverview] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [showDataPreview, setShowDataPreview] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, sitesRes, loadingRes, dumpingRes, roadsRes, trucksRes, excRes, opRes, prodRes, equipmentUtilRes, delayRes, maintenanceRes, weatherRes] = await Promise.all([
        dashboardService.getOverview(),
        miningSiteService.getAll(),
        loadingPointService.getAll(),
        dumpingPointService.getAll(),
        roadSegmentService.getAll(),
        truckService.getAll({ limit: 20 }),
        excavatorService.getAll({ limit: 20 }),
        operatorService.getAll({ limit: 20 }),
        productionService.getAll({ limit: 20 }),
        dashboardService.getEquipmentUtilization().catch(() => ({ data: { trucks: [], excavators: [] } })),
        dashboardService.getDelayAnalysis().catch(() => ({ data: { byCategory: {}, totalDelays: 0 } })),
        dashboardService.getMaintenanceOverview().catch(() => ({ data: { upcoming: 0, overdue: 0, completed: 0 } })),
        weatherService.getLatest().catch(() => ({ data: null })),
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
      setEquipmentUtilization(equipmentUtilRes.data);
      setDelayAnalysis(delayRes.data);
      setMaintenanceOverview(maintenanceRes.data);
      setWeatherData(weatherRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Stats configuration with dark theme colors
  const stats = [
    {
      icon: Truck,
      label: 'Active Trucks',
      value: overview?.fleetStatus?.trucksOperating || 0,
      total: operationalData.trucks.length,
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      trend: '+5%',
      trendUp: true,
    },
    {
      icon: Construction,
      label: 'Active Excavators',
      value: overview?.fleetStatus?.excavatorsOperating || 0,
      total: operationalData.excavators.length,
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      trend: '+2%',
      trendUp: true,
    },
    {
      icon: Package,
      label: 'Active Hauling',
      value: overview?.activeHauling || 0,
      subtext: 'trips in progress',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/10 border-violet-500/20',
      trend: '+12%',
      trendUp: true,
    },
    {
      icon: TrendingUp,
      label: "Today's Production",
      value: `${(overview?.todayProduction || 0).toFixed(1)}`,
      unit: 'ton',
      subtext: `Target: ${(overview?.production?.todayTarget || 0).toFixed(0)} ton`,
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      trend: `${(overview?.production?.todayAchievement || 0).toFixed(1)}%`,
      trendUp: (overview?.production?.todayAchievement || 0) >= 100,
    },
  ];

  // Secondary stats
  const detailedStats = [
    { icon: Activity, label: 'Fleet Efficiency', value: '87.5%', color: 'text-sky-400', description: 'Average utilization' },
    { icon: Timer, label: 'Avg Cycle Time', value: '45.2', unit: 'min', color: 'text-cyan-400', description: 'Per hauling cycle' },
    { icon: Fuel, label: 'Fuel Consumed', value: (overview?.production?.todayFuel || 0).toFixed(0), unit: 'L', color: 'text-orange-400', description: 'Today total' },
    { icon: Users, label: 'Active Operators', value: operationalData.operators.filter((o) => o.status === 'ACTIVE').length, total: operationalData.operators.length, color: 'text-violet-400', description: 'On duty' },
    { icon: Wrench, label: 'Maintenance Due', value: maintenanceOverview?.upcoming || 0, color: 'text-amber-400', description: 'Next 7 days' },
    { icon: Shield, label: 'Safety Incidents', value: overview?.safety?.recentIncidents || 0, color: 'text-rose-400', description: 'Last 7 days' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* === HEADER SECTION === */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time mining operations monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`${theme.card} px-4 py-2.5`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
              <span className="text-sm font-semibold text-emerald-400">Live</span>
            </div>
          </div>
          <div className={`${theme.card} px-4 py-2`}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Last Update</p>
            <p className="text-sm font-bold text-slate-200">{new Date().toLocaleTimeString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* === MAIN STATS GRID === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`${theme.card} ${theme.cardHover} p-5`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-100">{stat.value}</span>
                    {stat.unit && <span className="text-lg text-slate-500">{stat.unit}</span>}
                    {stat.total !== undefined && <span className="text-sm text-slate-600">/ {stat.total}</span>}
                  </div>
                  {stat.subtext && <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>}
                  {stat.trend && (
                    <div className="flex items-center gap-1.5 mt-3">
                      {stat.trendUp ? <ArrowUp size={14} className="text-emerald-400" /> : <ArrowDown size={14} className="text-rose-400" />}
                      <span className={`text-xs font-semibold ${stat.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>{stat.trend}</span>
                      <span className="text-xs text-slate-600">vs yesterday</span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl border ${stat.iconBg}`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* === SECONDARY STATS ROW === */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {detailedStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`${theme.card} ${theme.cardHover} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={stat.color} size={16} />
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-100">{stat.value}</span>
                {stat.unit && <span className="text-sm text-slate-500">{stat.unit}</span>}
                {stat.total !== undefined && <span className="text-xs text-slate-600">/{stat.total}</span>}
              </div>
              <p className="text-[10px] text-slate-600 mt-1">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* === WEATHER CARD === */}
      {weatherData && (
        <div className={`${theme.cardAccent} p-5`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={theme.iconBoxAccent}>
                <CloudRain className="text-sky-400" size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Weather Conditions</h3>
                <p className="text-xs text-slate-500">Updated: {new Date(weatherData.recordDate).toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Condition</p>
                <p className="text-lg font-bold text-slate-200">{weatherData.condition || 'N/A'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Temperature</p>
                <p className="text-lg font-bold text-slate-200">{weatherData.temperature || 'N/A'}°C</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Rainfall</p>
                <p className="text-lg font-bold text-slate-200">{weatherData.rainfall || 0} mm</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</p>
                {weatherData.isOperational ? <CheckCircle className="text-emerald-400 mx-auto" size={24} /> : <XCircle className="text-rose-400 mx-auto" size={24} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MAP SECTION === */}
      <div className={`${theme.card} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={theme.iconBox}>
              <MapIcon className="text-sky-400" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Live Operations Map</h2>
              <p className="text-xs text-slate-500">
                {mapData.sites.length} Sites | {mapData.loadingPoints.length} Loading | {mapData.dumpingPoints.length} Dumping
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-800/50">
          <MiningMap sites={mapData.sites} loadingPoints={mapData.loadingPoints} dumpingPoints={mapData.dumpingPoints} roads={mapData.roads} />
        </div>
      </div>

      {/* === FLEET & PRODUCTION GRID === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fleet Status */}
        <div className={`${theme.card} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={theme.iconBox}>
                <Activity className="text-sky-400" size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Fleet Status</h2>
            </div>
            <ChevronRight className="text-slate-600" size={20} />
          </div>
          <div className="space-y-5">
            {/* Trucks */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="text-sky-400" size={18} />
                  <span className="font-semibold text-slate-300">Trucks</span>
                </div>
                <span className="text-xs text-slate-500">{operationalData.trucks.length} Total</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className={theme.gridItem}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Operating</p>
                  <p className="text-2xl font-bold text-emerald-400">{overview?.fleetStatus?.trucksOperating || 0}</p>
                </div>
                <div className={theme.gridItem}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Idle</p>
                  <p className="text-2xl font-bold text-amber-400">{operationalData.trucks.filter((t) => t.status === 'IDLE').length}</p>
                </div>
                <div className={theme.gridItem}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Breakdown</p>
                  <p className="text-2xl font-bold text-rose-400">{operationalData.trucks.filter((t) => t.status === 'BREAKDOWN' || t.status === 'MAINTENANCE').length}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-slate-800/50"></div>
            {/* Excavators */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Construction className="text-emerald-400" size={18} />
                  <span className="font-semibold text-slate-300">Excavators</span>
                </div>
                <span className="text-xs text-slate-500">{operationalData.excavators.length} Total</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className={theme.gridItem}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Active</p>
                  <p className="text-2xl font-bold text-emerald-400">{overview?.fleetStatus?.excavatorsOperating || 0}</p>
                </div>
                <div className={theme.gridItem}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Standby</p>
                  <p className="text-2xl font-bold text-amber-400">{operationalData.excavators.filter((e) => e.status === 'STANDBY').length}</p>
                </div>
                <div className={theme.gridItem}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Breakdown</p>
                  <p className="text-2xl font-bold text-rose-400">{operationalData.excavators.filter((e) => e.status === 'BREAKDOWN' || e.status === 'MAINTENANCE').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Production Performance */}
        <div className={`${theme.card} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={theme.iconBox}>
                <Target className="text-amber-400" size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Production Performance</h2>
            </div>
            <ChevronRight className="text-slate-600" size={20} />
          </div>
          <div className="space-y-4">
            {/* Achievement */}
            <div className="rounded-xl p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Today's Achievement</p>
                  <p className="text-4xl font-bold text-amber-400">{(overview?.production?.todayAchievement || 0).toFixed(1)}%</p>
                </div>
                <div className={`p-2 rounded-lg ${(overview?.production?.todayAchievement || 0) >= 100 ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                  {(overview?.production?.todayAchievement || 0) >= 100 ? <CheckCircle className="text-emerald-400" size={24} /> : <AlertCircle className="text-amber-400" size={24} />}
                </div>
              </div>
              <div className="w-full bg-slate-800/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${(overview?.production?.todayAchievement || 0) >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(overview?.production?.todayAchievement || 0, 100)}%` }}
                ></div>
              </div>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className={theme.gridItem}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Target Today</p>
                <p className="text-xl font-bold text-slate-200">{(overview?.production?.todayTarget || 0).toFixed(0)}</p>
                <p className="text-[10px] text-slate-600">tons</p>
              </div>
              <div className={theme.gridItem}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Actual Today</p>
                <p className="text-xl font-bold text-emerald-400">{(overview?.production?.todayActual || 0).toFixed(0)}</p>
                <p className="text-[10px] text-slate-600">tons</p>
              </div>
              <div className={theme.gridItem}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Active Trips</p>
                <p className="text-xl font-bold text-violet-400">{overview?.activeHauling || 0}</p>
                <p className="text-[10px] text-slate-600">in progress</p>
              </div>
              <div className={theme.gridItem}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Completed</p>
                <p className="text-xl font-bold text-sky-400">{operationalData.productions.filter((p) => p.actualProduction >= p.targetProduction).length}</p>
                <p className="text-[10px] text-slate-600">targets met</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === ALERTS SECTION === */}
      {overview?.alerts && overview.alerts.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-slate-900 p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
              <AlertTriangle className="text-rose-400" size={22} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Critical Alerts</h2>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">{overview.alerts.length}</span>
          </div>
          <div className="space-y-2">
            {overview.alerts.map((alert, index) => (
              <div key={index} className="p-4 rounded-xl bg-slate-900/60 border-l-4 border-rose-500 hover:bg-slate-800/60 transition-colors">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-rose-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{alert.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date().toLocaleString('id-ID')}</p>
                  </div>
                  <button className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === THREE COLUMN SECTION === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Maintenance Status */}
        <div className={`${theme.card} p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={theme.iconBox}>
              <Wrench className="text-amber-400" size={20} />
            </div>
            <h2 className="text-base font-bold text-slate-100">Maintenance Status</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Calendar className="text-amber-400" size={16} />
                <span className="text-sm font-medium text-slate-300">Upcoming</span>
              </div>
              <span className="text-xl font-bold text-amber-400">{maintenanceOverview?.upcoming || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-rose-400" size={16} />
                <span className="text-sm font-medium text-slate-300">Overdue</span>
              </div>
              <span className="text-xl font-bold text-rose-400">{maintenanceOverview?.overdue || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-400" size={16} />
                <span className="text-sm font-medium text-slate-300">Completed (30d)</span>
              </div>
              <span className="text-xl font-bold text-emerald-400">{maintenanceOverview?.completed || 0}</span>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className={`${theme.card} p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={theme.iconBox}>
              <DollarSign className="text-emerald-400" size={20} />
            </div>
            <h2 className="text-base font-bold text-slate-100">Financial Overview</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fuel Cost (Today)</p>
              <p className="text-lg font-bold text-emerald-400">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(overview?.financials?.estimatedFuelCost || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Operator Cost (Daily)</p>
              <p className="text-lg font-bold text-sky-400">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(overview?.financials?.estimatedOperatorCost || 0)}</p>
            </div>
            <div className="pt-3 border-t border-slate-800/50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-400">Total Daily Cost</span>
                <span className="text-lg font-bold text-rose-400">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format((overview?.financials?.estimatedFuelCost || 0) + (overview?.financials?.estimatedOperatorCost || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Operators Summary */}
        <div className={`${theme.card} p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={theme.iconBox}>
              <Users className="text-violet-400" size={20} />
            </div>
            <h2 className="text-base font-bold text-slate-100">Operators Summary</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm font-medium text-slate-300">Active</span>
              <span className="text-xl font-bold text-emerald-400">{operationalData.operators.filter((o) => o.status === 'ACTIVE').length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-700/40 border border-slate-600/40">
              <span className="text-sm font-medium text-slate-300">Off Duty</span>
              <span className="text-xl font-bold text-slate-400">{operationalData.operators.filter((o) => o.status === 'OFF_DUTY').length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <span className="text-sm font-medium text-slate-300">Total Operators</span>
              <span className="text-xl font-bold text-sky-400">{operationalData.operators.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* === EQUIPMENT UTILIZATION === */}
      {equipmentUtilization && (equipmentUtilization.trucks?.length > 0 || equipmentUtilization.excavators?.length > 0) && (
        <div className={`${theme.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={theme.iconBox}>
                <Gauge className="text-violet-400" size={20} />
              </div>
              <h2 className="text-base font-bold text-slate-100">Equipment Utilization</h2>
            </div>
            <button className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">View Details</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {equipmentUtilization.trucks?.length > 0 && (
              <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700/40">
                <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Truck className="text-sky-400" size={16} />
                  <span>Top Trucks by Trips</span>
                </h3>
                <div className="space-y-2">
                  {equipmentUtilization.trucks.slice(0, 5).map((truck, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-700/30 transition-colors">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-medium text-slate-200">{truck.code || truck.name}</span>
                        <span className="text-sm font-bold text-sky-400">{truck.trips} trips</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Timer size={12} />
                        <span>Avg Cycle: {(truck.avgCycleTime || 0).toFixed(1)} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {equipmentUtilization.excavators?.length > 0 && (
              <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700/40">
                <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Construction className="text-emerald-400" size={16} />
                  <span>Top Excavators by Loads</span>
                </h3>
                <div className="space-y-2">
                  {equipmentUtilization.excavators.slice(0, 5).map((excavator, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-700/30 transition-colors">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-medium text-slate-200">{excavator.code || excavator.name}</span>
                        <span className="text-sm font-bold text-emerald-400">{excavator.loads} loads</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Timer size={12} />
                        <span>Avg Loading: {(excavator.avgLoadingTime || 0).toFixed(1)} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === DELAY ANALYSIS === */}
      {delayAnalysis && delayAnalysis.byCategory && Object.keys(delayAnalysis.byCategory).length > 0 && (
        <div className={`${theme.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Clock className="text-rose-400" size={20} />
              </div>
              <h2 className="text-base font-bold text-slate-100">Delay Analysis</h2>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/20">
              <span className="text-sm font-bold text-rose-400">Total: {(delayAnalysis.totalDelays || 0).toFixed(0)} min</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(delayAnalysis.byCategory).map(([category, data], idx) => (
              <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-amber-500/5 border border-rose-500/20">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-200 capitalize">{category.toLowerCase().replace('_', ' ')}</h3>
                  <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">{data.count}x</span>
                </div>
                <p className="text-2xl font-bold text-rose-400 mb-2">{(data.totalDuration || 0).toFixed(0)} min</p>
                {data.reasons && data.reasons.length > 0 && (
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-700/50">
                    {data.reasons.slice(0, 2).map((reason, ridx) => (
                      <div key={ridx} className="text-xs text-slate-400 flex justify-between">
                        <span className="truncate">{reason.reason}</span>
                        <span className="font-semibold ml-2 text-slate-300">{reason.duration}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === DATA PREVIEW SECTION === */}
      {showDataPreview && (
        <div className="space-y-5">
          <div className={`${theme.cardAccent} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={theme.iconBoxAccent}>
                  <Database className="text-sky-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Operational Data Real-Time</h2>
                  <p className="text-sm text-slate-400">Comprehensive view of all operational entities</p>
                </div>
              </div>
              <button onClick={() => setShowDataPreview(false)} className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-medium hover:bg-slate-700/60 transition-colors">
                Hide Details
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Trucks Table */}
              <div className="rounded-xl p-5 bg-slate-900/60 border border-slate-700/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Truck className="text-sky-400" size={20} />
                    <h3 className="text-base font-bold text-slate-100">Trucks</h3>
                  </div>
                  <span className={theme.badgeInfo}>{operationalData.trucks.length} units</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-700/50">
                      <tr>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kode</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Model</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kapasitas</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {operationalData.trucks.slice(0, 8).map((truck) => (
                        <tr key={truck.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-3 font-semibold text-slate-200">{truck.code}</td>
                          <td className="px-3 py-3 text-slate-400">{truck.model || '-'}</td>
                          <td className="px-3 py-3 font-medium text-slate-300">{truck.capacity}t</td>
                          <td className="px-3 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                truck.status === 'HAULING'
                                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                                  : truck.status === 'LOADING'
                                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                                  : truck.status === 'DUMPING'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  : truck.status === 'IDLE'
                                  ? 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                                  : truck.status === 'BREAKDOWN' || truck.status === 'MAINTENANCE'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {truck.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {operationalData.trucks.length > 8 && <div className="text-center py-3 text-xs text-slate-500">+{operationalData.trucks.length - 8} more trucks</div>}
                </div>
              </div>

              {/* Excavators Table */}
              <div className="rounded-xl p-5 bg-slate-900/60 border border-slate-700/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Construction className="text-emerald-400" size={20} />
                    <h3 className="text-base font-bold text-slate-100">Excavators</h3>
                  </div>
                  <span className={theme.badgeSuccess}>{operationalData.excavators.length} units</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-700/50">
                      <tr>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kode</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Model</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rate</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {operationalData.excavators.slice(0, 8).map((exc) => (
                        <tr key={exc.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-3 font-semibold text-slate-200">{exc.code}</td>
                          <td className="px-3 py-3 text-slate-400">{exc.model || '-'}</td>
                          <td className="px-3 py-3 font-medium text-slate-300">{exc.productionRate}t/m</td>
                          <td className="px-3 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                exc.status === 'ACTIVE' || exc.status === 'LOADING'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                  : exc.status === 'STANDBY'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  : exc.status === 'BREAKDOWN' || exc.status === 'MAINTENANCE'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                  : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                              }`}
                            >
                              {exc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {operationalData.excavators.length > 8 && <div className="text-center py-3 text-xs text-slate-500">+{operationalData.excavators.length - 8} more excavators</div>}
                </div>
              </div>

              {/* Operators Table */}
              <div className="rounded-xl p-5 bg-slate-900/60 border border-slate-700/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="text-violet-400" size={20} />
                    <h3 className="text-base font-bold text-slate-100">Operators</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20">{operationalData.operators.length} operators</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-700/50">
                      <tr>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Pegawai</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {operationalData.operators.slice(0, 8).map((op) => (
                        <tr key={op.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-3 font-semibold text-slate-200">{op.employeeNumber}</td>
                          <td className="px-3 py-3 text-slate-400">{op.user?.name || op.user?.fullName || '-'}</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded text-xs font-medium">{op.shift}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                op.status === 'ACTIVE'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                  : op.status === 'OFF_DUTY'
                                  ? 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {op.status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {operationalData.operators.length > 8 && <div className="text-center py-3 text-xs text-slate-500">+{operationalData.operators.length - 8} more operators</div>}
                </div>
              </div>

              {/* Production Targets Table */}
              <div className="rounded-xl p-5 bg-slate-900/60 border border-slate-700/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-amber-400" size={20} />
                    <h3 className="text-base font-bold text-slate-100">Production Targets</h3>
                  </div>
                  <span className={theme.badgeWarning}>{operationalData.productions.length} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-700/50">
                      <tr>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Site</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actual</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {operationalData.productions.slice(0, 8).map((prod) => {
                        const achievement = prod.targetProduction > 0 ? (prod.actualProduction / prod.targetProduction) * 100 : 0;
                        return (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-3 text-slate-400">{new Date(prod.recordDate).toLocaleDateString('id-ID')}</td>
                            <td className="px-3 py-3 font-medium text-slate-300">{prod.miningSite?.code || '-'}</td>
                            <td className="px-3 py-3 text-slate-400">{prod.targetProduction?.toFixed(0)}t</td>
                            <td className="px-3 py-3 font-semibold text-slate-200">{prod.actualProduction?.toFixed(0)}t</td>
                            <td className="px-3 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  achievement >= 100
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                    : achievement >= 80
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {achievement.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {operationalData.productions.length > 8 && <div className="text-center py-3 text-xs text-slate-500">+{operationalData.productions.length - 8} more records</div>}
                </div>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <MapIcon className="text-sky-400" size={16} />
                  <span className="text-xs font-semibold text-slate-400">Mining Sites</span>
                </div>
                <p className="text-2xl font-bold text-sky-400">{mapData.sites.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Active locations</p>
              </div>
              <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="text-emerald-400" size={16} />
                  <span className="text-xs font-semibold text-slate-400">Loading Points</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{mapData.loadingPoints.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Operational points</p>
              </div>
              <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="text-amber-400" size={16} />
                  <span className="text-xs font-semibold text-slate-400">Dumping Points</span>
                </div>
                <p className="text-2xl font-bold text-amber-400">{mapData.dumpingPoints.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Discharge locations</p>
              </div>
              <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="text-violet-400" size={16} />
                  <span className="text-xs font-semibold text-slate-400">Road Segments</span>
                </div>
                <p className="text-2xl font-bold text-violet-400">{mapData.roads.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Active routes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === SHOW DATA BUTTON === */}
      {!showDataPreview && (
        <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-center shadow-xl shadow-sky-500/5">
          <button
            onClick={() => setShowDataPreview(true)}
            className="mx-auto flex items-center gap-3 px-6 py-3 text-base rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-sky-500/40"
          >
            <Database size={20} />
            <span>Show Detailed Operational Data</span>
            <ChevronRight size={16} />
          </button>
          <p className="text-sm text-slate-400 mt-3">View comprehensive tables for trucks, excavators, operators, and production records</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
