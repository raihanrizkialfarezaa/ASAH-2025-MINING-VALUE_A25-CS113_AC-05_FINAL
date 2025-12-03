import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { excavatorService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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
  Calendar,
  Gauge,
  Fuel,
  Settings,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Package,
  Wrench,
  Shovel,
  Zap,
  DollarSign,
} from 'lucide-react';

const ExcavatorList = () => {
  const [excavators, setExcavators] = useState([]);
  const [allExcavators, setAllExcavators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selectedExcavator, setSelectedExcavator] = useState(null);
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
    minBucketCapacity: '',
    maxBucketCapacity: '',
    minYear: '',
    maxYear: '',
    location: '',
  });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    brand: '',
    model: '',
    bucketCapacity: '',
    yearManufacture: '',
    productionRate: '',
    fuelConsumption: '',
    currentLocation: '',
    remarks: '',
  });

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allExcavators];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (exc) =>
          exc.code?.toLowerCase().includes(query) || exc.name?.toLowerCase().includes(query) || exc.brand?.toLowerCase().includes(query) || exc.model?.toLowerCase().includes(query) || exc.currentLocation?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((exc) => exc.status === statusFilter);
    }

    if (filters.brand) {
      filtered = filtered.filter((exc) => exc.brand?.toLowerCase().includes(filters.brand.toLowerCase()));
    }

    if (filters.minBucketCapacity) {
      filtered = filtered.filter((exc) => exc.bucketCapacity >= parseFloat(filters.minBucketCapacity));
    }

    if (filters.maxBucketCapacity) {
      filtered = filtered.filter((exc) => exc.bucketCapacity <= parseFloat(filters.maxBucketCapacity));
    }

    if (filters.minYear) {
      filtered = filtered.filter((exc) => exc.yearManufacture && exc.yearManufacture >= parseInt(filters.minYear));
    }

    if (filters.maxYear) {
      filtered = filtered.filter((exc) => exc.yearManufacture && exc.yearManufacture <= parseInt(filters.maxYear));
    }

    if (filters.location) {
      filtered = filtered.filter((exc) => exc.currentLocation?.toLowerCase().includes(filters.location.toLowerCase()));
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'code' || sortField === 'name' || sortField === 'brand' || sortField === 'model' || sortField === 'currentLocation') {
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

    setExcavators(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allExcavators, searchQuery, statusFilter, filters, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchExcavators();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  const fetchExcavators = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await excavatorService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllExcavators(allData);
    } catch (error) {
      console.error('Failed to fetch excavators:', error);
      setAllExcavators([]);
    } finally {
      setLoading(false);
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
    setStatusFilter('');
    setFilters({
      brand: '',
      minBucketCapacity: '',
      maxBucketCapacity: '',
      minYear: '',
      maxYear: '',
      location: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const uniqueBrands = useMemo(() => {
    const brands = allExcavators
      .map((e) => e.brand)
      .filter((b) => b)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return brands;
  }, [allExcavators]);

  const uniqueLocations = useMemo(() => {
    const locations = allExcavators
      .map((e) => e.currentLocation)
      .filter((l) => l)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return locations;
  }, [allExcavators]);

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active', color: 'green' },
    { value: 'IDLE', label: 'Idle', color: 'gray' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'orange' },
    { value: 'BREAKDOWN', label: 'Breakdown', color: 'red' },
    { value: 'STANDBY', label: 'Standby', color: 'blue' },
    { value: 'OUT_OF_SERVICE', label: 'Out of Service', color: 'purple' },
  ];

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      code: '',
      name: '',
      brand: '',
      model: '',
      bucketCapacity: '',
      yearManufacture: '',
      productionRate: '',
      fuelConsumption: '',
      currentLocation: '',
      remarks: '',
    });
    setShowModal(true);
  };

  const handleEdit = (excavator) => {
    setModalMode('edit');
    setSelectedExcavator(excavator);
    setFormData({
      code: excavator.code,
      name: excavator.name,
      brand: excavator.brand || '',
      model: excavator.model || '',
      bucketCapacity: excavator.bucketCapacity || '',
      yearManufacture: excavator.yearManufacture || '',
      productionRate: excavator.productionRate || '',
      fuelConsumption: excavator.fuelConsumption || '',
      currentLocation: excavator.currentLocation || '',
      remarks: excavator.remarks || '',
    });
    setShowModal(true);
  };

  const handleView = (excavator) => {
    setSelectedExcavator(excavator);
    setModalMode('view');
    setShowModal(true);
  };

  const handlePerformance = async (excavator) => {
    setSelectedExcavator(excavator);
    try {
      const data = await excavatorService.getPerformance(excavator.id);
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
      const bucketCapacity = formData.bucketCapacity !== '' && formData.bucketCapacity !== undefined ? Number(formData.bucketCapacity) : undefined;
      if (bucketCapacity !== undefined && !Number.isNaN(bucketCapacity)) payload.bucketCapacity = bucketCapacity;
      const yearManufacture = formData.yearManufacture !== '' && formData.yearManufacture !== undefined ? parseInt(formData.yearManufacture, 10) : undefined;
      if (yearManufacture && !Number.isNaN(yearManufacture)) payload.yearManufacture = yearManufacture;
      const productionRate = formData.productionRate !== '' && formData.productionRate !== undefined ? Number(formData.productionRate) : undefined;
      if (productionRate !== undefined && !Number.isNaN(productionRate)) payload.productionRate = productionRate;
      const fuelConsumption = formData.fuelConsumption !== '' && formData.fuelConsumption !== undefined ? Number(formData.fuelConsumption) : undefined;
      if (fuelConsumption !== undefined && !Number.isNaN(fuelConsumption)) payload.fuelConsumption = fuelConsumption;
      if (formData.currentLocation) payload.currentLocation = formData.currentLocation.toString().trim();
      if (formData.remarks) payload.remarks = formData.remarks.toString().trim();

      const codeRegex = /^[A-Z]{1,4}-\d{3,4}$/;
      if (modalMode === 'create') {
        if (!payload.code || !codeRegex.test(payload.code)) {
          window.alert('Invalid code. Format examples: E-001, EX-0001, EXC-0001');
          return;
        }
        if (!payload.name || payload.name.length < 3) {
          window.alert('Name must be at least 3 characters long');
          return;
        }
        await excavatorService.create(payload);
      } else {
        if (payload.name && payload.name.length < 3) {
          window.alert('Name must be at least 3 characters long');
          return;
        }
        await excavatorService.update(selectedExcavator.id, payload);
      }

      setShowModal(false);
      fetchExcavators();
    } catch (error) {
      console.error('Failed to save excavator:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else if (error.response?.data?.data) {
        const errors = error.response.data.data;
        const errorMessages = Array.isArray(errors) ? errors.map((err) => err.msg).join('\n') : JSON.stringify(errors);
        window.alert(errorMessages);
      } else {
        window.alert('Failed to save excavator. Please check your input.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this excavator?')) {
      try {
        await excavatorService.delete(id);
        fetchExcavators();
      } catch (error) {
        console.error('Failed to delete excavator:', error);
        if (error.response?.data?.message) {
          window.alert(error.response.data.message);
        } else {
          window.alert('Failed to delete excavator.');
        }
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '-';
    return Number(num).toFixed(decimals);
  };

  if (loading && !excavators.length) {
    return <LoadingSpinner fullScreen />;
  }

  const activeFiltersCount = [searchQuery, statusFilter, filters.brand, filters.minBucketCapacity, filters.maxBucketCapacity, filters.minYear, filters.maxYear, filters.location].filter(Boolean).length;

  const avgBucketCapacity = allExcavators.length > 0 ? allExcavators.reduce((sum, e) => sum + (e.bucketCapacity || 0), 0) / allExcavators.filter((e) => e.bucketCapacity).length : 0;
  const totalOperatingHours = allExcavators.reduce((sum, e) => sum + (e.totalHours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Shovel className="text-yellow-600" size={36} />
            <span>Excavators Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor excavator operations in real-time</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchExcavators} className="bg-white hover:bg-gray-50 px-4 py-2 rounded-lg border shadow-sm text-gray-700 font-medium transition-colors flex items-center space-x-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <button onClick={handleCreate} className="btn-primary flex items-center space-x-2 px-5 py-2.5">
            <Plus size={20} />
            <span>Add Excavator</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Excavators</p>
              <p className="text-3xl font-bold text-yellow-600">{allExcavators.length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Shovel className="text-yellow-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600">{allExcavators.filter((e) => e.status === 'ACTIVE').length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Activity className="text-green-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Idle</p>
              <p className="text-3xl font-bold text-blue-600">{allExcavators.filter((e) => e.status === 'IDLE').length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Clock className="text-blue-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Maintenance</p>
              <p className="text-3xl font-bold text-orange-600">{allExcavators.filter((e) => e.status === 'MAINTENANCE').length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Wrench className="text-orange-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Breakdown</p>
              <p className="text-3xl font-bold text-red-600">{allExcavators.filter((e) => e.status === 'BREAKDOWN').length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="text-red-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Standby</p>
              <p className="text-2xl font-bold text-purple-600">{allExcavators.filter((e) => e.status === 'STANDBY').length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Settings className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Bucket Capacity</p>
              <p className="text-2xl font-bold text-indigo-600">{formatNumber(avgBucketCapacity)} m³</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Gauge className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Operating Hours</p>
              <p className="text-2xl font-bold text-teal-600">{totalOperatingHours.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-teal-100 rounded-xl">
              <Clock className="text-teal-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Unique Brands</p>
              <p className="text-2xl font-bold text-pink-600">{uniqueBrands.length}</p>
            </div>
            <div className="p-3 bg-pink-100 rounded-xl">
              <Package className="text-pink-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-3">
              <div className="relative" style={{ minWidth: '320px', maxWidth: '450px', flex: '1' }}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by code, name, brand, model, or location..."
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

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field min-w-[180px]">
                <option value="">All Status</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors flex items-center space-x-2 ${
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
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
                Showing {excavators.length} of {allExcavators.length} excavators
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })} className="input-field">
                    <option value="">All Brands</option>
                    {uniqueBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <select value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} className="input-field">
                    <option value="">All Locations</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bucket Capacity Range (m³)</label>
                  <div className="flex items-center space-x-2">
                    <input type="number" step="0.1" value={filters.minBucketCapacity} onChange={(e) => setFilters({ ...filters, minBucketCapacity: e.target.value })} placeholder="Min" className="input-field" />
                    <span className="text-gray-500">-</span>
                    <input type="number" step="0.1" value={filters.maxBucketCapacity} onChange={(e) => setFilters({ ...filters, maxBucketCapacity: e.target.value })} placeholder="Max" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year Range</label>
                  <div className="flex items-center space-x-2">
                    <input type="number" value={filters.minYear} onChange={(e) => setFilters({ ...filters, minYear: e.target.value })} placeholder="From" className="input-field" />
                    <span className="text-gray-500">-</span>
                    <input type="number" value={filters.maxYear} onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })} placeholder="To" className="input-field" />
                  </div>
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
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('code')}>
                  <div className="flex items-center justify-between">
                    <span>Code</span>
                    {sortField === 'code' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-yellow-600" /> : <SortDesc size={16} className="text-yellow-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-yellow-600" /> : <SortDesc size={16} className="text-yellow-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('brand')}>
                  <div className="flex items-center justify-between">
                    <span>Brand</span>
                    {sortField === 'brand' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-yellow-600" /> : <SortDesc size={16} className="text-yellow-600" />)}
                  </div>
                </th>
                <th className="table-header">Model</th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('bucketCapacity')}>
                  <div className="flex items-center justify-between">
                    <span>Bucket (m³)</span>
                    {sortField === 'bucketCapacity' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-yellow-600" /> : <SortDesc size={16} className="text-yellow-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('totalHours')}>
                  <div className="flex items-center justify-between">
                    <span>Hours</span>
                    {sortField === 'totalHours' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-yellow-600" /> : <SortDesc size={16} className="text-yellow-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('currentLocation')}>
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    {sortField === 'currentLocation' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-yellow-600" /> : <SortDesc size={16} className="text-yellow-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-yellow-600" /> : <SortDesc size={16} className="text-yellow-600" />)}
                  </div>
                </th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {excavators.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <Shovel className="text-gray-400" size={48} />
                      <p className="text-gray-500 font-medium">No excavators found</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                excavators.map((excavator) => (
                  <tr key={excavator.id} className="hover:bg-yellow-50 transition-colors">
                    <td className="table-cell">
                      <span className="font-bold text-yellow-600">{excavator.code}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{excavator.name}</span>
                    </td>
                    <td className="table-cell text-gray-700">{excavator.brand || '-'}</td>
                    <td className="table-cell text-gray-700">{excavator.model || '-'}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-gray-900">{formatNumber(excavator.bucketCapacity)}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{(excavator.totalHours || 0).toLocaleString()}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-1">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-gray-700">{excavator.currentLocation || '-'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={excavator.status} />
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <button onClick={() => handleView(excavator)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleEdit(excavator)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Edit">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handlePerformance(excavator)} className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors" title="Performance">
                          <Activity size={18} />
                        </button>
                        <button onClick={() => handleDelete(excavator.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Plus className="text-yellow-600" size={24} />
              </div>
              <span>Add New Excavator</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Edit className="text-green-600" size={24} />
              </div>
              <span>Edit Excavator</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="text-purple-600" size={24} />
              </div>
              <span>Excavator Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedExcavator ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-xl border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedExcavator.code}</h3>
                  <p className="text-gray-600 mt-1">{selectedExcavator.name}</p>
                </div>
                <StatusBadge status={selectedExcavator.status} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Shovel className="text-yellow-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Brand & Model</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedExcavator.brand || '-'}</p>
                <p className="text-sm text-gray-600">{selectedExcavator.model || '-'}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Gauge className="text-green-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Bucket Capacity</label>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(selectedExcavator.bucketCapacity)} <span className="text-lg">m³</span>
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-purple-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Year of Manufacture</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedExcavator.yearManufacture || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="text-blue-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Production Rate</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {selectedExcavator.productionRate || '-'} <span className="text-sm">ton/min</span>
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Fuel className="text-orange-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Fuel Consumption</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {selectedExcavator.fuelConsumption || '-'} <span className="text-sm">L/hr</span>
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="text-indigo-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Total Hours</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {(selectedExcavator.totalHours || 0).toLocaleString()} <span className="text-sm">hours</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="text-red-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Current Location</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedExcavator.currentLocation || '-'}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="text-emerald-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Maintenance Cost</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedExcavator.maintenanceCost ? `$${selectedExcavator.maintenanceCost}/hr` : '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Wrench className="text-blue-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Maintenance Schedule</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Last Maintenance</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedExcavator.lastMaintenance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Next Maintenance</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedExcavator.nextMaintenance)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-green-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Asset Timeline</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Purchase Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedExcavator.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Retirement Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedExcavator.retirementDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedExcavator.remarks && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Remarks</label>
                <p className="text-gray-900">{selectedExcavator.remarks}</p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Active: {selectedExcavator.isActive ? 'Yes' : 'No'}</span>
                <span>Created: {formatDate(selectedExcavator.createdAt)}</span>
                <span>Updated: {formatDate(selectedExcavator.updatedAt)}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Fields marked with * are required. Make sure to enter valid data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Code * <span className="text-xs font-normal text-gray-500">(e.g., EXC-0001)</span>
                </label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="input-field" required placeholder="EXC-0001" disabled={modalMode === 'edit'} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required placeholder="Caterpillar 374F-001" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="input-field" placeholder="Caterpillar" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="input-field" placeholder="374F" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bucket Capacity (m³)</label>
                <input type="number" step="0.01" value={formData.bucketCapacity} onChange={(e) => setFormData({ ...formData, bucketCapacity: e.target.value })} className="input-field" placeholder="10.50" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year of Manufacture</label>
                <input
                  type="number"
                  value={formData.yearManufacture}
                  onChange={(e) => setFormData({ ...formData, yearManufacture: e.target.value })}
                  className="input-field"
                  placeholder="2024"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Production Rate (ton/min)</label>
                <input type="number" step="0.1" value={formData.productionRate} onChange={(e) => setFormData({ ...formData, productionRate: e.target.value })} className="input-field" placeholder="5.0" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Consumption (L/hr)</label>
                <input type="number" step="0.1" value={formData.fuelConsumption} onChange={(e) => setFormData({ ...formData, fuelConsumption: e.target.value })} className="input-field" placeholder="50.0" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Location</label>
                <input type="text" value={formData.currentLocation} onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })} className="input-field" placeholder="PIT-01" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                <input type="text" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="input-field" placeholder="Optional notes" />
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
                    <span>Create Excavator</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Update Excavator</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} title={`Performance Metrics: ${selectedExcavator?.code}`} size="lg">
        {performanceData ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="text-yellow-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Production Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="text-yellow-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Total Production</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700">{performanceData.totalProduction || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">metric tons</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="text-green-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Avg Production Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{performanceData.avgProductionRate || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">ton/hour</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Utilization Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gauge className="text-blue-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Utilization</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{performanceData.utilization || 0}%</p>
                  <p className="text-xs text-gray-500 mt-1">machine utilization</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="text-purple-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Efficiency</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{performanceData.efficiency || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-1">operational efficiency</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 mb-4">
                <Fuel className="text-orange-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Fuel & Cost Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Fuel className="text-orange-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Total Fuel Used</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{performanceData.totalFuel || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">liters</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="text-emerald-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Fuel Efficiency</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{performanceData.totalProduction > 0 ? (performanceData.totalFuel / performanceData.totalProduction).toFixed(2) : 0}</p>
                  <p className="text-xs text-gray-500 mt-1">L/ton</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> Performance metrics are calculated from actual hauling operations. Data is updated in real-time based on recorded activities and fuel consumption.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No performance data available for this excavator.</p>
            <p className="text-sm text-gray-500 mt-2">Data will appear once hauling operations are recorded.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExcavatorList;
