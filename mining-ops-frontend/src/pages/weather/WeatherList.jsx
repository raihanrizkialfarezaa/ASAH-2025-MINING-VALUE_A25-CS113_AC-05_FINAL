import React, { useEffect, useState, useCallback } from 'react';
import { weatherService } from '../../services';
import { miningSiteService } from '../../services/locationService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { authService } from '../../services/authService';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Eye as EyeIcon,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  ChevronDown,
  MapPin,
  Activity,
  Waves,
  Umbrella,
  Navigation,
} from 'lucide-react';

const WeatherList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);

  const [weathers, setWeathers] = useState([]);
  const [allWeathers, setAllWeathers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [miningSites, setMiningSites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    miningSiteId: '',
    visibility: '',
    isOperational: '',
    minTemperature: '',
    maxTemperature: '',
    minRainfall: '',
    maxRainfall: '',
  });
  const [formData, setFormData] = useState({
    miningSiteId: '',
    condition: 'CERAH',
    temperature: '',
    humidity: '',
    windSpeed: '',
    windDirection: '',
    rainfall: '',
    visibility: 'GOOD',
    waveHeight: '',
    seaCondition: '',
    isOperational: true,
    riskLevel: 'LOW',
    remarks: '',
  });

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allWeathers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (weather) =>
          weather.miningSite?.code?.toLowerCase().includes(query) || weather.miningSite?.name?.toLowerCase().includes(query) || weather.condition?.toLowerCase().includes(query) || weather.windDirection?.toLowerCase().includes(query)
      );
    }

    if (conditionFilter) {
      filtered = filtered.filter((weather) => weather.condition === conditionFilter);
    }

    if (riskLevelFilter) {
      filtered = filtered.filter((weather) => weather.riskLevel === riskLevelFilter);
    }

    if (filters.miningSiteId) {
      filtered = filtered.filter((weather) => weather.miningSiteId === filters.miningSiteId);
    }

    if (filters.visibility) {
      filtered = filtered.filter((weather) => weather.visibility === filters.visibility);
    }

    if (filters.isOperational !== '') {
      const isOperational = filters.isOperational === 'true';
      filtered = filtered.filter((weather) => weather.isOperational === isOperational);
    }

    if (filters.minTemperature) {
      filtered = filtered.filter((weather) => (weather.temperature || 0) >= parseFloat(filters.minTemperature));
    }

    if (filters.maxTemperature) {
      filtered = filtered.filter((weather) => (weather.temperature || 0) <= parseFloat(filters.maxTemperature));
    }

    if (filters.minRainfall) {
      filtered = filtered.filter((weather) => (weather.rainfall || 0) >= parseFloat(filters.minRainfall));
    }

    if (filters.maxRainfall) {
      filtered = filtered.filter((weather) => (weather.rainfall || 0) <= parseFloat(filters.maxRainfall));
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'timestamp') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortField === 'temperature' || sortField === 'rainfall' || sortField === 'humidity' || sortField === 'windSpeed') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalPages = Math.ceil(filtered.length / pagination.limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedData = filtered.slice(startIndex, startIndex + pagination.limit);

    setWeathers(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allWeathers, searchQuery, conditionFilter, riskLevelFilter, filters, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchWeathers();
    loadMiningSites();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  const fetchWeathers = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await weatherService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllWeathers(allData);
    } catch (error) {
      console.error('Failed to fetch weather logs:', error);
      setAllWeathers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMiningSites = async () => {
    try {
      const res = await miningSiteService.getAll({ limit: 1000 });
      setMiningSites(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch mining sites:', error);
    }
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
    setConditionFilter('');
    setRiskLevelFilter('');
    setFilters({
      miningSiteId: '',
      visibility: '',
      isOperational: '',
      minTemperature: '',
      maxTemperature: '',
      minRainfall: '',
      maxRainfall: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const conditionOptions = [
    { value: 'CERAH', label: 'Cerah', icon: Cloud, color: 'yellow' },
    { value: 'BERAWAN', label: 'Berawan', icon: Cloud, color: 'gray' },
    { value: 'MENDUNG', label: 'Mendung', icon: Cloud, color: 'slate' },
    { value: 'HUJAN_RINGAN', label: 'Hujan Ringan', icon: CloudRain, color: 'blue' },
    { value: 'HUJAN_SEDANG', label: 'Hujan Sedang', icon: CloudRain, color: 'indigo' },
    { value: 'HUJAN_LEBAT', label: 'Hujan Lebat', icon: CloudRain, color: 'purple' },
    { value: 'BADAI', label: 'Badai', icon: Wind, color: 'red' },
    { value: 'KABUT', label: 'Kabut', icon: Cloud, color: 'gray' },
  ];

  const visibilityOptions = [
    { value: 'EXCELLENT', label: 'Excellent' },
    { value: 'GOOD', label: 'Good' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'POOR', label: 'Poor' },
    { value: 'VERY_POOR', label: 'Very Poor' },
  ];

  const riskLevelOptions = [
    { value: 'LOW', label: 'Low', color: 'green' },
    { value: 'MEDIUM', label: 'Medium', color: 'yellow' },
    { value: 'HIGH', label: 'High', color: 'orange' },
    { value: 'CRITICAL', label: 'Critical', color: 'red' },
  ];

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      miningSiteId: '',
      condition: 'CERAH',
      temperature: '',
      humidity: '',
      windSpeed: '',
      windDirection: '',
      rainfall: '',
      visibility: 'GOOD',
      waveHeight: '',
      seaCondition: '',
      isOperational: true,
      riskLevel: 'LOW',
      remarks: '',
    });
    setShowModal(true);
  };

  const handleEdit = async (weather) => {
    setModalMode('edit');
    setSelectedWeather(weather);

    try {
      if (weather.miningSiteId && !miningSites.find((s) => s.id === weather.miningSiteId)) {
        const siteRes = await miningSiteService.getById(weather.miningSiteId);
        if (siteRes.data) {
          setMiningSites((prev) => [...prev, siteRes.data]);
        }
      }
    } catch (error) {
      console.error('Error ensuring mining site exists for edit:', error);
    }

    setFormData({
      miningSiteId: weather.miningSiteId || '',
      condition: weather.condition || 'CERAH',
      temperature: weather.temperature ?? '',
      humidity: weather.humidity ?? '',
      windSpeed: weather.windSpeed ?? '',
      windDirection: weather.windDirection || '',
      rainfall: weather.rainfall ?? '',
      visibility: weather.visibility || 'GOOD',
      waveHeight: weather.waveHeight ?? '',
      seaCondition: weather.seaCondition || '',
      isOperational: weather.isOperational ?? true,
      riskLevel: weather.riskLevel || 'LOW',
      remarks: weather.remarks || '',
    });
    setShowModal(true);
  };

  const handleView = (weather) => {
    setSelectedWeather(weather);
    setModalMode('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        condition: formData.condition,
        visibility: formData.visibility,
        isOperational: formData.isOperational,
        riskLevel: formData.riskLevel,
      };

      if (formData.miningSiteId) payload.miningSiteId = formData.miningSiteId;
      if (formData.temperature !== '') payload.temperature = parseFloat(formData.temperature);
      if (formData.humidity !== '') payload.humidity = parseFloat(formData.humidity);
      if (formData.windSpeed !== '') payload.windSpeed = parseFloat(formData.windSpeed);
      if (formData.windDirection) payload.windDirection = formData.windDirection.trim();
      if (formData.rainfall !== '') payload.rainfall = parseFloat(formData.rainfall);
      if (formData.waveHeight !== '') payload.waveHeight = parseFloat(formData.waveHeight);
      if (formData.seaCondition) payload.seaCondition = formData.seaCondition.trim();
      if (formData.remarks) payload.remarks = formData.remarks.trim();

      if (modalMode === 'create') {
        await weatherService.create(payload);
      } else {
        await weatherService.update(selectedWeather.id, payload);
      }

      setShowModal(false);
      fetchWeathers();
    } catch (error) {
      console.error('Failed to save weather:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else {
        window.alert('Failed to save weather log. Please check your input.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this weather log?')) {
      try {
        await weatherService.delete(id);
        fetchWeathers();
      } catch (error) {
        console.error('Failed to delete weather:', error);
        if (error.response?.data?.message) {
          window.alert(error.response.data.message);
        }
      }
    }
  };

  if (loading && !weathers.length) {
    return <LoadingSpinner fullScreen />;
  }

  const activeFiltersCount = [searchQuery, conditionFilter, riskLevelFilter, filters.miningSiteId, filters.visibility, filters.isOperational, filters.minTemperature, filters.maxTemperature, filters.minRainfall, filters.maxRainfall].filter(
    Boolean
  ).length;

  const getConditionIcon = (condition) => {
    const option = conditionOptions.find((opt) => opt.value === condition);
    return option ? option.icon : Cloud;
  };

  const getConditionColor = (condition) => {
    const option = conditionOptions.find((opt) => opt.value === condition);
    return option ? option.color : 'gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Cloud className="text-sky-600" size={36} />
            <span>Weather Monitoring System</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time weather tracking and operational safety assessment</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchWeathers} className="bg-white hover:bg-gray-50 px-4 py-2 rounded-lg border shadow-sm text-gray-700 font-medium transition-colors flex items-center space-x-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          {canEdit && (
            <button onClick={handleCreate} className="btn-primary flex items-center space-x-2 px-5 py-2.5">
              <Plus size={20} />
              <span>Add Weather Log</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Logs</p>
              <p className="text-3xl font-bold text-sky-600">{allWeathers.length}</p>
            </div>
            <div className="p-3 bg-sky-100 rounded-xl">
              <Cloud className="text-sky-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Operational</p>
              <p className="text-3xl font-bold text-green-600">{allWeathers.filter((w) => w.isOperational).length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="text-green-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Non-Operational</p>
              <p className="text-3xl font-bold text-red-600">{allWeathers.filter((w) => !w.isOperational).length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="text-red-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">High Risk</p>
              <p className="text-3xl font-bold text-orange-600">{allWeathers.filter((w) => w.riskLevel === 'HIGH' || w.riskLevel === 'CRITICAL').length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="text-orange-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rainy Conditions</p>
              <p className="text-3xl font-bold text-blue-600">{allWeathers.filter((w) => ['HUJAN_RINGAN', 'HUJAN_SEDANG', 'HUJAN_LEBAT'].includes(w.condition)).length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <CloudRain className="text-blue-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-3">
              <div className="relative" style={{ minWidth: '380px', maxWidth: '500px', flex: '1' }}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by mining site, condition, or wind direction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    fontSize: '14px',
                    color: '#1f2937',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                )}
              </div>

              <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className="input-field min-w-[180px]">
                <option value="">All Conditions</option>
                {conditionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select value={riskLevelFilter} onChange={(e) => setRiskLevelFilter(e.target.value)} className="input-field min-w-[150px]">
                <option value="">All Risk Levels</option>
                {riskLevelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors flex items-center space-x-2 ${
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
                <ChevronDown className={`transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} size={16} />
              </button>

              {activeFiltersCount > 0 && (
                <button onClick={handleClearFilters} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center space-x-2">
                  <X size={18} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>
                Showing {weathers.length} of {allWeathers.length} logs
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Filter size={18} />
                <span>Advanced Filters</span>
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mining Site</label>
                  <select value={filters.miningSiteId} onChange={(e) => setFilters({ ...filters, miningSiteId: e.target.value })} className="input-field">
                    <option value="">All Sites</option>
                    {miningSites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.code} - {site.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                  <select value={filters.visibility} onChange={(e) => setFilters({ ...filters, visibility: e.target.value })} className="input-field">
                    <option value="">All Visibility</option>
                    {visibilityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operational Status</label>
                  <select value={filters.isOperational} onChange={(e) => setFilters({ ...filters, isOperational: e.target.value })} className="input-field">
                    <option value="">All</option>
                    <option value="true">Operational</option>
                    <option value="false">Non-Operational</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Temperature (°C)</label>
                  <input type="number" value={filters.minTemperature} onChange={(e) => setFilters({ ...filters, minTemperature: e.target.value })} placeholder="0" className="input-field" step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Temperature (°C)</label>
                  <input type="number" value={filters.maxTemperature} onChange={(e) => setFilters({ ...filters, maxTemperature: e.target.value })} placeholder="50" className="input-field" step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Rainfall (mm)</label>
                  <input type="number" value={filters.minRainfall} onChange={(e) => setFilters({ ...filters, minRainfall: e.target.value })} placeholder="0" className="input-field" step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Rainfall (mm)</label>
                  <input type="number" value={filters.maxRainfall} onChange={(e) => setFilters({ ...filters, maxRainfall: e.target.value })} placeholder="100" className="input-field" step="0.1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('timestamp')}>
                  <div className="flex items-center justify-between">
                    <span>Timestamp</span>
                    {sortField === 'timestamp' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header">Mining Site</th>
                <th className="table-header">Condition</th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('temperature')}>
                  <div className="flex items-center justify-between">
                    <span>Temp (°C)</span>
                    {sortField === 'temperature' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('rainfall')}>
                  <div className="flex items-center justify-between">
                    <span>Rainfall (mm)</span>
                    {sortField === 'rainfall' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header">Visibility</th>
                <th className="table-header">Risk Level</th>
                <th className="table-header">Operational</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {weathers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <Cloud className="text-gray-400" size={48} />
                      <p className="text-gray-500 font-medium">No weather logs found</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                weathers.map((weather) => {
                  const ConditionIcon = getConditionIcon(weather.condition);
                  return (
                    <tr key={weather.id} className="hover:bg-blue-50 transition-colors">
                      <td className="table-cell">
                        <span className="text-sm font-medium text-gray-900">{new Date(weather.timestamp).toLocaleDateString()}</span>
                        <p className="text-xs text-gray-500">{new Date(weather.timestamp).toLocaleTimeString()}</p>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-gray-900">{weather.miningSite?.code || '-'}</span>
                        <p className="text-xs text-gray-500">{weather.miningSite?.name || ''}</p>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <ConditionIcon size={18} className={`text-${getConditionColor(weather.condition)}-600`} />
                          <span className={`text-${getConditionColor(weather.condition)}-700 font-medium`}>{conditionOptions.find((opt) => opt.value === weather.condition)?.label || weather.condition}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-semibold text-gray-900">{weather.temperature?.toFixed(1) || '-'}</span>
                      </td>
                      <td className="table-cell">
                        <span className="font-semibold text-blue-600">{weather.rainfall?.toFixed(1) || '0'}</span>
                      </td>
                      <td className="table-cell">
                        <span className="text-gray-700">{weather.visibility}</span>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={weather.riskLevel} />
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${weather.isOperational ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{weather.isOperational ? 'Yes' : 'No'}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-1">
                          <button onClick={() => handleView(weather)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="View Details">
                            <Eye size={18} />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleEdit(weather)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Edit">
                              <Edit size={18} />
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => handleDelete(weather.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-600 flex items-center space-x-2">
            <span>Items per page:</span>
            <select value={pagination.limit} onChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))} className="input-field py-1 px-2">
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
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="text-blue-600" size={24} />
              </div>
              <span>Add New Weather Log</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Edit className="text-green-600" size={24} />
              </div>
              <span>Edit Weather Log</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="text-purple-600" size={24} />
              </div>
              <span>Weather Log Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedWeather ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-6 rounded-xl border border-sky-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                    {React.createElement(getConditionIcon(selectedWeather.condition), {
                      size: 32,
                      className: `text-${getConditionColor(selectedWeather.condition)}-600`,
                    })}
                    <span>{conditionOptions.find((opt) => opt.value === selectedWeather.condition)?.label || selectedWeather.condition}</span>
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {selectedWeather.miningSite?.code || 'N/A'} - {selectedWeather.miningSite?.name || 'No Site'}
                  </p>
                </div>
                <StatusBadge status={selectedWeather.riskLevel} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="text-sky-600" size={16} />
                    <label className="text-xs font-semibold text-gray-600">Operational Status</label>
                  </div>
                  <p className={`text-lg font-medium ${selectedWeather.isOperational ? 'text-green-600' : 'text-red-600'}`}>{selectedWeather.isOperational ? 'Operational' : 'Non-Operational'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <div className="flex items-center space-x-2 mb-1">
                    <EyeIcon className="text-sky-600" size={16} />
                    <label className="text-xs font-semibold text-gray-600">Visibility</label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{selectedWeather.visibility}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle className="text-sky-600" size={16} />
                    <label className="text-xs font-semibold text-gray-600">Risk Assessment</label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{selectedWeather.riskLevel}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                <Thermometer className="text-orange-600" size={18} />
                <span>Temperature & Humidity</span>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-orange-100">
                  <label className="text-xs font-medium text-gray-600">Temperature</label>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {selectedWeather.temperature ? selectedWeather.temperature.toFixed(1) : '-'} <span className="text-sm">°C</span>
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-orange-100">
                  <label className="text-xs font-medium text-gray-600">Humidity</label>
                  <p className="text-2xl font-bold text-cyan-600 mt-1">
                    {selectedWeather.humidity ? selectedWeather.humidity.toFixed(1) : '-'} <span className="text-sm">%</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                <Wind className="text-blue-600" size={18} />
                <span>Wind Information</span>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <label className="text-xs font-medium text-gray-600">Wind Speed</label>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {selectedWeather.windSpeed ? selectedWeather.windSpeed.toFixed(1) : '-'} <span className="text-sm">km/h</span>
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-2 mb-1">
                    <Navigation className="text-blue-600" size={16} />
                    <label className="text-xs font-medium text-gray-600">Wind Direction</label>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{selectedWeather.windDirection || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 p-4 rounded-lg border border-cyan-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                <Umbrella className="text-cyan-600" size={18} />
                <span>Precipitation</span>
              </h4>
              <div className="bg-white p-3 rounded-lg border border-cyan-100">
                <label className="text-xs font-medium text-gray-600">Rainfall</label>
                <p className="text-3xl font-bold text-cyan-600 mt-1">
                  {selectedWeather.rainfall ? selectedWeather.rainfall.toFixed(1) : '0'} <span className="text-sm">mm</span>
                </p>
              </div>
            </div>

            {(selectedWeather.waveHeight || selectedWeather.seaCondition) && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                  <Waves className="text-indigo-600" size={18} />
                  <span>Sea Conditions</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedWeather.waveHeight && (
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <label className="text-xs font-medium text-gray-600">Wave Height</label>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">
                        {selectedWeather.waveHeight.toFixed(1)} <span className="text-sm">m</span>
                      </p>
                    </div>
                  )}
                  {selectedWeather.seaCondition && (
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <label className="text-xs font-medium text-gray-600">Sea Condition</label>
                      <p className="text-lg font-medium text-gray-900 mt-1">{selectedWeather.seaCondition}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedWeather.remarks && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Remarks</label>
                <p className="text-gray-900">{selectedWeather.remarks}</p>
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-600">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Timestamp:</strong> {new Date(selectedWeather.timestamp).toLocaleString()}
                </div>
                <div>
                  <strong>ID:</strong> {selectedWeather.id}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Fields marked with * are required. Ensure all weather data is accurate for proper operational assessment.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <MapPin size={16} className="text-gray-500" />
                  <span>Mining Site</span>
                </label>
                <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field">
                  <option value="">Select Mining Site (Optional)</option>
                  {miningSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.code} - {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Cloud size={16} className="text-gray-500" />
                  <span>Weather Condition *</span>
                </label>
                <select value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} className="input-field" required>
                  {conditionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Thermometer size={16} className="text-gray-500" />
                  <span>Temperature (°C)</span>
                </label>
                <input type="number" step="0.1" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} className="input-field" placeholder="e.g., 28.5" min="-10" max="60" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Droplets size={16} className="text-gray-500" />
                  <span>Humidity (%)</span>
                </label>
                <input type="number" step="0.1" value={formData.humidity} onChange={(e) => setFormData({ ...formData, humidity: e.target.value })} className="input-field" placeholder="e.g., 75.5" min="0" max="100" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Wind size={16} className="text-gray-500" />
                  <span>Wind Speed (km/h)</span>
                </label>
                <input type="number" step="0.1" value={formData.windSpeed} onChange={(e) => setFormData({ ...formData, windSpeed: e.target.value })} className="input-field" placeholder="e.g., 15.2" min="0" max="200" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Navigation size={16} className="text-gray-500" />
                  <span>Wind Direction</span>
                </label>
                <input type="text" value={formData.windDirection} onChange={(e) => setFormData({ ...formData, windDirection: e.target.value })} className="input-field" placeholder="e.g., N, NE, E, SE, S, SW, W, NW" maxLength="10" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Umbrella size={16} className="text-gray-500" />
                  <span>Rainfall (mm)</span>
                </label>
                <input type="number" step="0.1" value={formData.rainfall} onChange={(e) => setFormData({ ...formData, rainfall: e.target.value })} className="input-field" placeholder="e.g., 10.5" min="0" max="10000" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <EyeIcon size={16} className="text-gray-500" />
                  <span>Visibility *</span>
                </label>
                <select value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })} className="input-field" required>
                  {visibilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Waves size={16} className="text-gray-500" />
                  <span>Wave Height (m)</span>
                </label>
                <input type="number" step="0.1" value={formData.waveHeight} onChange={(e) => setFormData({ ...formData, waveHeight: e.target.value })} className="input-field" placeholder="e.g., 2.5" min="0" max="50" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sea Condition</label>
                <input type="text" value={formData.seaCondition} onChange={(e) => setFormData({ ...formData, seaCondition: e.target.value })} className="input-field" placeholder="e.g., Calm, Moderate, Rough" maxLength="100" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <AlertTriangle size={16} className="text-gray-500" />
                  <span>Risk Level *</span>
                </label>
                <select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })} className="input-field" required>
                  {riskLevelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Activity size={16} className="text-gray-500" />
                  <span>Operational Status *</span>
                </label>
                <select value={formData.isOperational} onChange={(e) => setFormData({ ...formData, isOperational: e.target.value === 'true' })} className="input-field" required>
                  <option value="true">Operational</option>
                  <option value="false">Non-Operational</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="input-field" rows="3" placeholder="Optional notes or additional observations..." maxLength="10000" />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="btn-primary px-6 py-2.5 flex items-center space-x-2">
                {modalMode === 'create' ? (
                  <>
                    <Plus size={18} />
                    <span>Create Weather Log</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Update Weather Log</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default WeatherList;
