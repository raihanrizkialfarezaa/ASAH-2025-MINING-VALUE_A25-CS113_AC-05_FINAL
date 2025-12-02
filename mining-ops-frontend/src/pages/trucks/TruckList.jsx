import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { truckService } from '../../services/equipmentService';
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
  });

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
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

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
    setFormData({
      code: '',
      name: '',
      brand: '',
      model: '',
      capacity: '',
      fuelCapacity: '',
      yearManufacture: '',
      fuelConsumption: '',
      averageSpeed: '',
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <TruckIcon className="text-blue-600" size={36} />
            <span>Trucks Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor fleet operations in real-time</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchTrucks} className="bg-white hover:bg-gray-50 px-4 py-2 rounded-lg border shadow-sm text-gray-700 font-medium transition-colors flex items-center space-x-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <button onClick={handleCreate} className="btn-primary flex items-center space-x-2 px-5 py-2.5">
            <Plus size={20} />
            <span>Add Truck</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Trucks</p>
              <p className="text-3xl font-bold text-blue-600">{allTrucks.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <TruckIcon className="text-blue-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Operating</p>
              <p className="text-3xl font-bold text-green-600">{allTrucks.filter((t) => ['HAULING', 'LOADING', 'DUMPING'].includes(t.status)).length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Activity className="text-green-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Idle</p>
              <p className="text-3xl font-bold text-yellow-600">{allTrucks.filter((t) => t.status === 'IDLE').length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="text-yellow-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Maintenance</p>
              <p className="text-3xl font-bold text-red-600">{allTrucks.filter((t) => t.status === 'MAINTENANCE').length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <Settings className="text-red-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" placeholder="Search by code, name, brand, or model..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field pl-10 pr-10 w-full" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                Showing {trucks.length} of {allTrucks.length} trucks
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Capacity (ton)</label>
                  <input type="number" value={filters.minCapacity} onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })} placeholder="0" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Capacity (ton)</label>
                  <input type="number" value={filters.maxCapacity} onChange={(e) => setFilters({ ...filters, maxCapacity: e.target.value })} placeholder="100" className="input-field" />
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
                    {sortField === 'code' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('brand')}>
                  <div className="flex items-center justify-between">
                    <span>Brand</span>
                    {sortField === 'brand' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header">Model</th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('capacity')}>
                  <div className="flex items-center justify-between">
                    <span>Capacity</span>
                    {sortField === 'capacity' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('yearManufacture')}>
                  <div className="flex items-center justify-between">
                    <span>Year</span>
                    {sortField === 'yearManufacture' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {trucks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <TruckIcon className="text-gray-400" size={48} />
                      <p className="text-gray-500 font-medium">No trucks found</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                trucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-blue-50 transition-colors">
                    <td className="table-cell">
                      <span className="font-bold text-blue-600">{truck.code}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{truck.name}</span>
                    </td>
                    <td className="table-cell text-gray-700">{truck.brand || '-'}</td>
                    <td className="table-cell text-gray-700">{truck.model || '-'}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-gray-900">{truck.capacity}</span>
                      <span className="text-gray-500 ml-1">ton</span>
                    </td>
                    <td className="table-cell text-gray-700">{truck.yearManufacture || '-'}</td>
                    <td className="table-cell">
                      <StatusBadge status={truck.status} />
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <button onClick={() => handleView(truck)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleEdit(truck)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Edit">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handlePerformance(truck)} className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors" title="Performance">
                          <Activity size={18} />
                        </button>
                        <button onClick={() => handleDelete(truck.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="text-blue-600" size={24} />
              </div>
              <span>Add New Truck</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Edit className="text-green-600" size={24} />
              </div>
              <span>Edit Truck</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="text-purple-600" size={24} />
              </div>
              <span>Truck Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedTruck ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTruck.code}</h3>
                  <p className="text-gray-600 mt-1">{selectedTruck.name}</p>
                </div>
                <StatusBadge status={selectedTruck.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <TruckIcon className="text-blue-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Brand & Model</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedTruck.brand || '-'}</p>
                <p className="text-sm text-gray-600">{selectedTruck.model || '-'}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Gauge className="text-green-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Capacity</label>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {selectedTruck.capacity} <span className="text-lg">ton</span>
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-purple-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Year of Manufacture</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedTruck.yearManufacture || '-'}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Fuel className="text-orange-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Fuel Capacity</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {selectedTruck.fuelCapacity || '-'} <span className="text-sm">L</span>
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="text-indigo-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Total Hours</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {selectedTruck.totalHours || 0} <span className="text-sm">hours</span>
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="text-red-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Total Distance</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {selectedTruck.totalDistance || 0} <span className="text-sm">km</span>
                </p>
              </div>

              {selectedTruck.currentOperator && (
                <div className="col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="text-blue-600" size={18} />
                    <label className="text-sm font-semibold text-gray-600">Current Operator</label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{selectedTruck.currentOperator?.user?.fullName || selectedTruck.currentOperator?.employeeNumber || 'N/A'}</p>
                </div>
              )}
            </div>

            {selectedTruck.remarks && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Remarks</label>
                <p className="text-gray-900">{selectedTruck.remarks}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Fields marked with * are required. Make sure to enter valid data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Code * <span className="text-xs font-normal text-gray-500">(e.g., HD-0001)</span>
                </label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="input-field" required placeholder="HD-0001" disabled={modalMode === 'edit'} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required placeholder="Volvo FMX500" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="input-field" placeholder="Volvo" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="input-field" placeholder="FMX500" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (ton) *</label>
                <input type="number" step="0.1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input-field" required placeholder="20.0" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Capacity (liter)</label>
                <input type="number" step="0.1" value={formData.fuelCapacity} onChange={(e) => setFormData({ ...formData, fuelCapacity: e.target.value })} className="input-field" placeholder="500" min="0" />
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Consumption (L/km)</label>
                <input type="number" step="0.01" value={formData.fuelConsumption} onChange={(e) => setFormData({ ...formData, fuelConsumption: e.target.value })} className="input-field" placeholder="1.0" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Average Speed (km/h)</label>
                <input type="number" step="0.1" value={formData.averageSpeed} onChange={(e) => setFormData({ ...formData, averageSpeed: e.target.value })} className="input-field" placeholder="30.0" min="0" />
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

      <Modal isOpen={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} title={`Performance Metrics: ${selectedTruck?.code}`} size="lg">
        {performanceData ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Production Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="text-blue-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Total Trips</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{performanceData.totalTrips || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">hauling operations</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="text-green-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Total Production</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{performanceData.totalProduction || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">metric tons</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 mb-4">
                <Fuel className="text-orange-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Fuel Consumption</h3>
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
                    <Gauge className="text-purple-600" size={18} />
                    <p className="text-sm font-medium text-gray-600">Fuel Efficiency</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{performanceData.totalProduction > 0 ? (performanceData.totalFuel / performanceData.totalProduction).toFixed(2) : 0}</p>
                  <p className="text-xs text-gray-500 mt-1">L/ton</p>
                </div>
              </div>
            </div>

            {performanceData.totalTrips > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Activity className="text-purple-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">Performance Indicators</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg. Production per Trip</p>
                    <p className="text-xl font-bold text-purple-700">{(performanceData.totalProduction / performanceData.totalTrips).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">tons/trip</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg. Fuel per Trip</p>
                    <p className="text-xl font-bold text-blue-700">{(performanceData.totalFuel / performanceData.totalTrips).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">L/trip</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> Performance metrics are calculated from actual hauling operations. Data is updated in real-time based on recorded trips and fuel consumption.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No performance data available for this truck.</p>
            <p className="text-sm text-gray-500 mt-2">Data will appear once hauling operations are recorded.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TruckList;
