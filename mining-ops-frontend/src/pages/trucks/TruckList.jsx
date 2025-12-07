import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { truckService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { loadingPointService, dumpingPointService } from '../../services/locationService';
import { authService } from '../../services/authService';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Activity,
  Filter,
  Search,
  X,
  SortAsc,
  SortDesc,
  RefreshCw,
  ChevronDown,
  Truck as TruckIcon,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  User,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Package,
} from 'lucide-react';

const TruckList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);
  const [trucks, setTrucks] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [statusFilter, setStatusFilter] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState('code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState({
    brand: '',
    minCapacity: '',
    maxCapacity: '',
    minYear: '',
    maxYear: '',
  });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    brand: '',
    model: '',
    capacity: '',
    fuelCapacity: '',
    yearManufacture: '',
    fuelConsumption: '',
    averageSpeed: '',
    currentLocation: '',
  });
  const [loadingPoints, setLoadingPoints] = useState([]);
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [codeEditable, setCodeEditable] = useState(false);

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allTrucks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((truck) => truck.code?.toLowerCase().includes(query) || truck.name?.toLowerCase().includes(query) || truck.brand?.toLowerCase().includes(query) || truck.model?.toLowerCase().includes(query));
    }

    if (statusFilter) {
      filtered = filtered.filter((truck) => truck.status === statusFilter);
    }

    if (filters.brand) {
      filtered = filtered.filter((truck) => truck.brand?.toLowerCase().includes(filters.brand.toLowerCase()));
    }

    if (filters.minCapacity) {
      filtered = filtered.filter((truck) => truck.capacity >= parseFloat(filters.minCapacity));
    }

    if (filters.maxCapacity) {
      filtered = filtered.filter((truck) => truck.capacity <= parseFloat(filters.maxCapacity));
    }

    if (filters.minYear) {
      filtered = filtered.filter((truck) => truck.yearManufacture && truck.yearManufacture >= parseInt(filters.minYear));
    }

    if (filters.maxYear) {
      filtered = filtered.filter((truck) => truck.yearManufacture && truck.yearManufacture <= parseInt(filters.maxYear));
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'code' || sortField === 'name' || sortField === 'brand' || sortField === 'model') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalPages = Math.ceil(filtered.length / pagination.limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedData = filtered.slice(startIndex, startIndex + pagination.limit);

    setTrucks(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allTrucks, searchQuery, statusFilter, filters, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchTrucks();
    fetchLocationPoints();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  useEffect(() => {
    if (modalMode === 'create' && (!formData.currentLocation || formData.currentLocation === '') && locationOptions.length) {
      setFormData((prev) => ({ ...prev, currentLocation: locationOptions[0].name || '' }));
    }
  }, [locationOptions]);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await truckService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllTrucks(allData);
    } catch (error) {
      console.error('Failed to fetch trucks:', error);
      setAllTrucks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationPoints = async () => {
    try {
      const [loadsRes, dumpsRes] = await Promise.all([loadingPointService.getAll(), dumpingPointService.getAll()]);
      const loads = Array.isArray(loadsRes?.data) ? loadsRes.data : Array.isArray(loadsRes?.data?.data) ? loadsRes.data.data : [];
      const dumps = Array.isArray(dumpsRes?.data) ? dumpsRes.data : Array.isArray(dumpsRes?.data?.data) ? dumpsRes.data.data : [];
      setLoadingPoints(loads);
      setDumpingPoints(dumps);
      const unified = [];
      loads.forEach((l) => unified.push({ id: `load:${l.id}`, type: 'LOADING', name: l.name || l.code || '' }));
      dumps.forEach((d) => unified.push({ id: `dump:${d.id}`, type: 'DUMPING', name: d.name || d.code || '' }));
      setLocationOptions(unified);
    } catch (error) {
      setLoadingPoints([]);
      setDumpingPoints([]);
      setLocationOptions([]);
    }
  };

  const generateAutoTruckCode = () => {
    const prefix = 'H';
    const nums = allTrucks
      .map((t) => {
        if (!t.code?.startsWith(`${prefix}-`)) return null;
        const m = t.code?.match(/-(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter(Boolean);
    const max = nums.length ? Math.max(...nums) : 0;
    let next = max + 1;
    let code = `${prefix}-${String(next).padStart(4, '0')}`;
    while (allTrucks.some((e) => e.code === code)) {
      next += 1;
      code = `${prefix}-${String(next).padStart(4, '0')}`;
    }
    return code;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setFilters({
      brand: '',
      minCapacity: '',
      maxCapacity: '',
      minYear: '',
      maxYear: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const uniqueBrands = useMemo(() => {
    const brands = allTrucks
      .map((t) => t.brand)
      .filter((b) => b)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return brands;
  }, [allTrucks]);

  const statusOptions = [
    { value: 'IDLE', label: 'Idle', color: 'gray' },
    { value: 'HAULING', label: 'Hauling', color: 'blue' },
    { value: 'LOADING', label: 'Loading', color: 'purple' },
    { value: 'DUMPING', label: 'Dumping', color: 'orange' },
    { value: 'IN_QUEUE', label: 'In Queue', color: 'yellow' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'red' },
    { value: 'REFUELING', label: 'Refueling', color: 'green' },
    { value: 'STANDBY', label: 'Standby', color: 'indigo' },
  ];

  const handleCreate = () => {
    setModalMode('create');
    setCodeEditable(false);
    const defaultCode = generateAutoTruckCode();
    setFormData({
      code: defaultCode,
      name: '',
      brand: '',
      model: '',
      capacity: '',
      fuelCapacity: '',
      yearManufacture: '',
      fuelConsumption: '',
      averageSpeed: '',
      currentLocation: locationOptions.length ? locationOptions[0].name || '' : '',
    });
    setShowModal(true);
  };

  const handleEdit = (truck) => {
    setModalMode('edit');
    setSelectedTruck(truck);
    setFormData({
      code: truck.code,
      name: truck.name,
      brand: truck.brand || '',
      model: truck.model || '',
      capacity: truck.capacity,
      fuelCapacity: truck.fuelCapacity || '',
      yearManufacture: truck.yearManufacture || '',
      fuelConsumption: truck.fuelConsumption || '',
      averageSpeed: truck.averageSpeed || '',
      currentLocation: truck.currentLocation || '',
    });
    setShowModal(true);
  };

  const handleView = (truck) => {
    setSelectedTruck(truck);
    setModalMode('view');
    setShowModal(true);
  };

  const handlePerformance = async (truck) => {
    setSelectedTruck(truck);
    try {
      const data = await truckService.getPerformance(truck.id);
      setPerformanceData(data);
      setShowPerformanceModal(true);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
      window.alert('Failed to fetch performance data.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {};
      const code = formData.code ? formData.code.toString().trim().toUpperCase() : '';
      if (code) payload.code = code;
      const name = formData.name ? formData.name.toString().trim() : '';
      if (name) payload.name = name;
      if (formData.brand) payload.brand = formData.brand.toString().trim();
      if (formData.model) payload.model = formData.model.toString().trim();
      const capacity = formData.capacity !== '' && formData.capacity !== undefined ? Number(formData.capacity) : NaN;
      if (!Number.isNaN(capacity)) payload.capacity = capacity;
      const fuelCapacity = formData.fuelCapacity !== '' && formData.fuelCapacity !== undefined ? Number(formData.fuelCapacity) : undefined;
      if (fuelCapacity !== undefined && !Number.isNaN(fuelCapacity)) payload.fuelCapacity = fuelCapacity;
      const yearManufacture = formData.yearManufacture !== '' && formData.yearManufacture !== undefined ? parseInt(formData.yearManufacture, 10) : undefined;
      if (yearManufacture && !Number.isNaN(yearManufacture)) payload.yearManufacture = yearManufacture;
      const fuelConsumption = formData.fuelConsumption !== '' && formData.fuelConsumption !== undefined ? Number(formData.fuelConsumption) : undefined;
      if (fuelConsumption !== undefined && !Number.isNaN(fuelConsumption)) payload.fuelConsumption = fuelConsumption;
      const averageSpeed = formData.averageSpeed !== '' && formData.averageSpeed !== undefined ? Number(formData.averageSpeed) : undefined;
      if (averageSpeed !== undefined && !Number.isNaN(averageSpeed)) payload.averageSpeed = averageSpeed;
      if (formData.currentLocation) payload.currentLocation = formData.currentLocation.toString().trim();

      const codeRegex = /^[A-Z]{1,2}-\d{3,4}$/;
      if (modalMode === 'create') {
        if (!payload.code || !codeRegex.test(payload.code)) {
          window.alert('Invalid code. Format examples: H-001 or HA-0001 or HD-0001');
          return;
        }
        if (!payload.name || payload.name.length < 3) {
          window.alert('Name must be at least 3 characters long');
          return;
        }
        if (payload.capacity === undefined || Number.isNaN(payload.capacity)) {
          window.alert('Capacity is required and must be a number');
          return;
        }
        await truckService.create(payload);
      } else {
        if (payload.name && payload.name.length < 3) {
          window.alert('Name must be at least 3 characters long');
          return;
        }
        if (payload.capacity !== undefined && Number.isNaN(payload.capacity)) {
          window.alert('Capacity must be a number');
          return;
        }
        await truckService.update(selectedTruck.id, payload);
      }

      setShowModal(false);
      fetchTrucks();
    } catch (error) {
      console.error('Failed to save truck:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else if (error.response?.data?.data) {
        const errors = error.response.data.data;
        const errorMessages = Array.isArray(errors) ? errors.map((e) => e.msg).join('\n') : JSON.stringify(errors);
        window.alert(errorMessages);
      } else {
        window.alert('Failed to save truck. Please check your input.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this truck?')) {
      try {
        await truckService.delete(id);
        fetchTrucks();
      } catch (error) {
        console.error('Failed to delete truck:', error);
      }
    }
  };

  if (loading && !trucks.length) {
    return <LoadingSpinner fullScreen />;
  }

  const activeFiltersCount = [searchQuery, statusFilter, filters.brand, filters.minCapacity, filters.maxCapacity, filters.minYear, filters.maxYear].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-500/20 border border-sky-500/30">
              <TruckIcon className="text-sky-400" size={24} />
            </div>
            <span>Trucks Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 ml-10 sm:ml-14">Manage and monitor fleet operations in real-time</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button onClick={fetchTrucks} className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-medium hover:bg-slate-700/60 transition-colors flex items-center justify-center gap-2">
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold shadow-lg shadow-sky-500/25 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Truck</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-3 sm:p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-300 mb-1 font-medium">Total Trucks</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">{allTrucks.length}</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <TruckIcon className="text-blue-400" size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-3 sm:p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-300 mb-1 font-medium">Operating</p>
              <p className="text-2xl sm:text-3xl font-bold text-cyan-400">{allTrucks.filter((t) => ['HAULING', 'LOADING', 'DUMPING'].includes(t.status)).length}</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
              <Activity className="text-cyan-400" size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-3 sm:p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-300 mb-1 font-medium">Idle</p>
              <p className="text-2xl sm:text-3xl font-bold text-sky-400">{allTrucks.filter((t) => t.status === 'IDLE').length}</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-sky-500/20 border border-sky-500/30">
              <Clock className="text-sky-400" size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-3 sm:p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-300 mb-1 font-medium">Maintenance</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-300">{allTrucks.filter((t) => t.status === 'MAINTENANCE').length}</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-blue-400/20 border border-blue-400/30">
              <Settings className="text-blue-300" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-3 sm:p-5 shadow-xl">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative w-full sm:min-w-[280px] lg:min-w-[320px] lg:max-w-[450px] lg:flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by code, name, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-11 text-sm text-slate-100 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition-all placeholder-slate-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    <X size={18} />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all sm:min-w-[150px] lg:min-w-[180px]"
              >
                <option value="">All Status</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2.5 rounded-xl border font-medium transition-colors flex items-center gap-2 ${
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-sky-500/20 border-sky-500/30 text-sky-400' : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-sky-500 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
                <ChevronDown className={`transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} size={16} />
              </button>

              {activeFiltersCount > 0 && (
                <button onClick={handleClearFilters} className="px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:bg-slate-700/60 font-medium transition-colors flex items-center gap-2">
                  <X size={18} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>
                Showing {trucks.length} of {allTrucks.length} trucks
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Filter size={16} className="text-sky-400" />
                <span>Advanced Filters</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Brand</label>
                  <select
                    value={filters.brand}
                    onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all text-sm"
                  >
                    <option value="">All Brands</option>
                    {uniqueBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Min Capacity (ton)</label>
                  <input
                    type="number"
                    value={filters.minCapacity}
                    onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Max Capacity (ton)</label>
                  <input
                    type="number"
                    value={filters.maxCapacity}
                    onChange={(e) => setFilters({ ...filters, maxCapacity: e.target.value })}
                    placeholder="100"
                    className="w-full h-10 px-3 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Year Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.minYear}
                      onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                      placeholder="From"
                      className="w-full h-10 px-2 sm:px-3 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500 text-sm"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="number"
                      value={filters.maxYear}
                      onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                      placeholder="To"
                      className="w-full h-10 px-2 sm:px-3 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Table - Responsive with horizontal scroll */}
      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700/50">
              <tr>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-700/30 transition-colors" onClick={() => handleSort('code')}>
                  <div className="flex items-center justify-between">
                    <span>Code</span>
                    {sortField === 'code' && (sortOrder === 'asc' ? <SortAsc size={14} className="text-sky-400" /> : <SortDesc size={14} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-700/30 transition-colors hidden sm:table-cell" onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc size={14} className="text-sky-400" /> : <SortDesc size={14} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-700/30 transition-colors hidden md:table-cell" onClick={() => handleSort('brand')}>
                  <div className="flex items-center justify-between">
                    <span>Brand</span>
                    {sortField === 'brand' && (sortOrder === 'asc' ? <SortAsc size={14} className="text-sky-400" /> : <SortDesc size={14} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Model</th>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-700/30 transition-colors" onClick={() => handleSort('capacity')}>
                  <div className="flex items-center justify-between">
                    <span>Cap</span>
                    {sortField === 'capacity' && (sortOrder === 'asc' ? <SortAsc size={14} className="text-sky-400" /> : <SortDesc size={14} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-700/30 transition-colors hidden lg:table-cell" onClick={() => handleSort('yearManufacture')}>
                  <div className="flex items-center justify-between">
                    <span>Year</span>
                    {sortField === 'yearManufacture' && (sortOrder === 'asc' ? <SortAsc size={14} className="text-sky-400" /> : <SortDesc size={14} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-700/30 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc size={14} className="text-sky-400" /> : <SortDesc size={14} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {trucks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <TruckIcon className="text-slate-600" size={48} />
                      <p className="text-slate-400 font-medium">No trucks found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                trucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-bold text-sky-400">{truck.code}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-200">{truck.name}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-400">{truck.brand || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-400">{truck.model || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-200">{truck.capacity}</span>
                      <span className="text-slate-500 ml-1">ton</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-400">{truck.yearManufacture || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={truck.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => handleView(truck)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(truck)} className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        <button onClick={() => handlePerformance(truck)} className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors" title="Performance">
                          <Activity size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleDelete(truck.id)} className="p-2 text-blue-300 hover:bg-blue-400/20 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-400 flex items-center gap-2">
            <span>Items per page:</span>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="h-9 px-3 rounded-lg bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:outline-none transition-all"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>
        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))} />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalMode === 'create' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <Plus className="text-blue-400" size={24} />
              </div>
              <span className="text-slate-100">Add New Truck</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <Edit className="text-cyan-400" size={24} />
              </div>
              <span className="text-slate-100">Edit Truck</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/30">
                <Eye className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Truck Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedTruck ? (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-sky-500/10 to-slate-900 border border-sky-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selectedTruck.code}</h3>
                  <p className="text-slate-400 mt-1">{selectedTruck.name}</p>
                </div>
                <StatusBadge status={selectedTruck.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <TruckIcon className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Brand & Model</label>
                </div>
                <p className="text-lg font-medium text-slate-100">{selectedTruck.brand || '-'}</p>
                <p className="text-sm text-slate-300">{selectedTruck.model || '-'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Capacity</label>
                </div>
                <p className="text-2xl font-bold text-cyan-400">
                  {selectedTruck.capacity} <span className="text-lg text-slate-300">ton</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Year of Manufacture</label>
                </div>
                <p className="text-lg font-medium text-slate-100">{selectedTruck.yearManufacture || '-'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Fuel className="text-blue-300" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Fuel Capacity</label>
                </div>
                <p className="text-lg font-medium text-slate-100">
                  {selectedTruck.fuelCapacity || '-'} <span className="text-sm text-slate-300">L</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Total Hours</label>
                </div>
                <p className="text-lg font-medium text-slate-100">
                  {selectedTruck.totalHours || 0} <span className="text-sm text-slate-300">hours</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Total Distance</label>
                </div>
                <p className="text-lg font-medium text-slate-100">
                  {selectedTruck.totalDistance || 0} <span className="text-sm text-slate-300">km</span>
                </p>
              </div>

              {selectedTruck.currentOperator && (
                <div className="col-span-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="text-blue-400" size={18} />
                    <label className="text-sm font-semibold text-slate-300">Current Operator</label>
                  </div>
                  <p className="text-lg font-medium text-slate-100">{selectedTruck.currentOperator?.user?.fullName || selectedTruck.currentOperator?.employeeNumber || 'N/A'}</p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Fuel className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Fuel Consumption</label>
                </div>
                <p className="text-lg font-medium text-slate-100">
                  {selectedTruck.fuelConsumption ?? '-'} <span className="text-sm text-slate-300">L/km</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Average Speed</label>
                </div>
                <p className="text-lg font-medium text-slate-100">
                  {selectedTruck.averageSpeed ?? '-'} <span className="text-sm text-slate-300">km/h</span>
                </p>
              </div>

              <div className="col-span-2 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Current Location</label>
                </div>
                <p className="text-lg font-medium text-slate-100">{selectedTruck.currentLocation || '-'}</p>
              </div>
            </div>

            {selectedTruck.remarks && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <label className="text-sm font-semibold text-slate-400 mb-2 block">Remarks</label>
                <p className="text-slate-200">{selectedTruck.remarks}</p>
              </div>
            )}

            {selectedTruck.haulingActivities && selectedTruck.haulingActivities.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Recent Hauling Activities</h4>
                <div className="space-y-3">
                  {selectedTruck.haulingActivities.map((h) => (
                    <div key={h.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/30">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-300 font-medium">
                          {h.loadingPoint?.name || h.loadingPoint?.code || '-'} → {h.dumpingPoint?.name || h.dumpingPoint?.code || '-'}
                        </div>
                        <div className="text-xs text-slate-500">{h.status || '-'}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <div>Load: {h.loadWeight ?? '-'} ton</div>
                        <div>Cycle: {h.totalCycleTime ?? '-'} min</div>
                        <div>Fuel: {h.fuelConsumed ?? '-'} L</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTruck.maintenanceLogs && selectedTruck.maintenanceLogs.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Recent Maintenance</h4>
                <div className="space-y-3 text-sm text-slate-300">
                  {selectedTruck.maintenanceLogs.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/30 flex items-start justify-between">
                      <div>
                        <div className="font-medium">{m.title || m.type || 'Maintenance'}</div>
                        <div className="text-xs text-slate-500">{m.actualDate ? new Date(m.actualDate).toLocaleString() : '-'}</div>
                      </div>
                      <div className="text-xs text-slate-500">{m.notes || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <p className="text-sm text-sky-400">
                <strong>Note:</strong> Fields marked with * are required. Make sure to enter valid data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Code *</label>
                  {modalMode === 'create' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCodeEditable((s) => !s);
                          if (codeEditable) {
                            const auto = generateAutoTruckCode();
                            setFormData((prev) => ({ ...prev, code: auto }));
                          }
                        }}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                      >
                        {codeEditable ? 'Auto' : 'Edit'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-normal text-slate-500">(e.g., HD-0001)</span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500 disabled:opacity-50"
                  required
                  placeholder="HD-0001"
                  disabled={modalMode === 'edit' || (modalMode === 'create' && !codeEditable)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  required
                  placeholder="Volvo FMX500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  placeholder="Volvo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  placeholder="FMX500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Capacity (ton) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  required
                  placeholder="20.0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Fuel Capacity (liter)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.fuelCapacity}
                  onChange={(e) => setFormData({ ...formData, fuelCapacity: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  placeholder="500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Year of Manufacture</label>
                <input
                  type="number"
                  value={formData.yearManufacture}
                  onChange={(e) => setFormData({ ...formData, yearManufacture: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  placeholder="2024"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Fuel Consumption (L/km)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fuelConsumption}
                  onChange={(e) => setFormData({ ...formData, fuelConsumption: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  placeholder="1.0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Average Speed (km/h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.averageSpeed}
                  onChange={(e) => setFormData({ ...formData, averageSpeed: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                  placeholder="30.0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Current Location</label>
                {locationOptions && locationOptions.length ? (
                  <select
                    value={formData.currentLocation}
                    onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all"
                  >
                    <option value="">Select location</option>
                    {locationOptions.map((loc) => (
                      <option key={loc.id} value={loc.name || ''}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.currentLocation}
                    onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-slate-800/80 text-slate-100 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all placeholder-slate-500"
                    placeholder="Current location"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/50">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2">
                {modalMode === 'create' ? (
                  <>
                    <Plus size={18} />
                    <span>Create Truck</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Update Truck</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} title={<span className="text-slate-100">Performance Metrics: {selectedTruck?.code}</span>} size="lg">
        {performanceData ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-slate-900 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-100">Production Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-blue-400" size={18} />
                    <p className="text-sm font-medium text-slate-300">Total Trips</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{performanceData.totalTrips || 0}</p>
                  <p className="text-xs text-slate-400 mt-1">hauling operations</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="text-cyan-400" size={18} />
                    <p className="text-sm font-medium text-slate-300">Total Production</p>
                  </div>
                  <p className="text-2xl font-bold text-cyan-400">{performanceData.totalProduction || 0}</p>
                  <p className="text-xs text-slate-400 mt-1">metric tons</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/10 to-slate-900 border border-sky-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Fuel className="text-sky-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-100">Fuel Consumption</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="text-sky-400" size={18} />
                    <p className="text-sm font-medium text-slate-300">Total Fuel Used</p>
                  </div>
                  <p className="text-2xl font-bold text-sky-400">{performanceData.totalFuel || 0}</p>
                  <p className="text-xs text-slate-400 mt-1">liters</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="text-blue-300" size={18} />
                    <p className="text-sm font-medium text-slate-300">Fuel Efficiency</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-300">{performanceData.totalProduction > 0 ? (performanceData.totalFuel / performanceData.totalProduction).toFixed(2) : 0}</p>
                  <p className="text-xs text-slate-400 mt-1">L/ton</p>
                </div>
              </div>
            </div>

            {performanceData.totalTrips > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-slate-900 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="text-cyan-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-100">Performance Indicators</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <p className="text-sm font-medium text-slate-300 mb-2">Avg. Production per Trip</p>
                    <p className="text-xl font-bold text-cyan-400">{(performanceData.totalProduction / performanceData.totalTrips).toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">tons/trip</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <p className="text-sm font-medium text-slate-300 mb-2">Avg. Fuel per Trip</p>
                    <p className="text-xl font-bold text-blue-400">{(performanceData.totalFuel / performanceData.totalTrips).toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">L/trip</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <p className="text-xs text-slate-300">
                <strong className="text-slate-100">Note:</strong> Performance metrics are calculated from actual hauling operations. Data is updated in real-time based on recorded trips and fuel consumption.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-slate-500 mb-4" size={48} />
            <p className="text-slate-200">No performance data available for this truck.</p>
            <p className="text-sm text-slate-400 mt-2">Data will appear once hauling operations are recorded.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TruckList;
