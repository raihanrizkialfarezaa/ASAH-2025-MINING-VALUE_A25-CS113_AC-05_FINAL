import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { excavatorService } from '../../services/equipmentService';
import { miningSiteService, loadingPointService, dumpingPointService } from '../../services/locationService';
import { authService } from '../../services/authService';
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
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);
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
  const [codeEditable, setCodeEditable] = useState(false);
  const [miningSites, setMiningSites] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState([]);
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationType, setLocationType] = useState('ALL');
  const [selectedLocationId, setSelectedLocationId] = useState('');

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
    fetchLocations();
  }, []);

  useEffect(() => {
    if (modalMode === 'create' && (!formData.currentLocation || formData.currentLocation === '') && locationOptions.length > 0) {
      const preferred = locationOptions.find((o) => o.type === 'SITE') || locationOptions.find((o) => o.type === 'LOADING') || locationOptions.find((o) => o.type === 'DUMPING') || locationOptions[0];
      if (preferred) {
        setLocationType(preferred.type || 'ALL');
        setSelectedLocationId(preferred.id);
        setFormData((prev) => ({ ...prev, currentLocation: preferred.name || '' }));
      }
    }
  }, [locationOptions]);

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

  const fetchLocations = async () => {
    try {
      const [sitesRes, loadsRes, dumpsRes] = await Promise.all([miningSiteService.getAll(), loadingPointService.getAll(), dumpingPointService.getAll()]);
      const sites = Array.isArray(sitesRes?.data) ? sitesRes.data : Array.isArray(sitesRes?.data?.data) ? sitesRes.data.data : [];
      const loads = Array.isArray(loadsRes?.data) ? loadsRes.data : Array.isArray(loadsRes?.data?.data) ? loadsRes.data.data : [];
      const dumps = Array.isArray(dumpsRes?.data) ? dumpsRes.data : Array.isArray(dumpsRes?.data?.data) ? dumpsRes.data.data : [];
      setMiningSites(sites);
      setLoadingPoints(loads);
      setDumpingPoints(dumps);
      const unified = [];
      sites.forEach((s) => unified.push({ id: `site:${s.id}`, type: 'SITE', name: s.name || s.code || '', raw: s }));
      loads.forEach((l) => unified.push({ id: `load:${l.id}`, type: 'LOADING', name: l.name || l.code || '', raw: l }));
      dumps.forEach((d) => unified.push({ id: `dump:${d.id}`, type: 'DUMPING', name: d.name || d.code || '', raw: d }));
      setLocationOptions(unified);
    } catch (error) {
      setMiningSites([]);
      setLoadingPoints([]);
      setDumpingPoints([]);
      setLocationOptions([]);
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
    const generateDefaultCode = () => {
      const prefix = 'EX';
      const nums = allExcavators
        .map((e) => {
          const m = e.code?.match(/-(\d+)$/);
          return m ? parseInt(m[1], 10) : null;
        })
        .filter(Boolean);
      const max = nums.length ? Math.max(...nums) : 0;
      let next = max + 1;
      let code = `${prefix}-${String(next).padStart(4, '0')}`;
      while (allExcavators.some((e) => e.code === code)) {
        next += 1;
        code = `${prefix}-${String(next).padStart(4, '0')}`;
      }
      return code;
    };

    setCodeEditable(false);
    const generateDefaultLocation = () => {
      if (miningSites.length) return { id: `site:${miningSites[0].id}`, name: miningSites[0].name || miningSites[0].code || '' };
      if (loadingPoints.length) return { id: `load:${loadingPoints[0].id}`, name: loadingPoints[0].name || loadingPoints[0].code || '' };
      if (dumpingPoints.length) return { id: `dump:${dumpingPoints[0].id}`, name: dumpingPoints[0].name || dumpingPoints[0].code || '' };
      return { id: '', name: '' };
    };
    const defaultLoc = generateDefaultLocation();
    setLocationType(defaultLoc.id.startsWith('site:') ? 'SITE' : defaultLoc.id.startsWith('load:') ? 'LOADING' : defaultLoc.id.startsWith('dump:') ? 'DUMPING' : 'ALL');
    setSelectedLocationId(defaultLoc.id);
    setFormData({
      code: generateDefaultCode(),
      name: '',
      brand: '',
      model: '',
      bucketCapacity: '',
      yearManufacture: '',
      productionRate: '',
      fuelConsumption: '',
      currentLocation: defaultLoc.name,
      remarks: '',
    });
    setLocationType((prev) => prev || 'ALL');
    setSelectedLocationId((prev) => prev || '');
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
    const match = locationOptions.find((o) => (o.name || '').toString().toLowerCase() === (excavator.currentLocation || '').toString().toLowerCase());
    if (match) {
      setLocationType(match.type);
      setSelectedLocationId(match.id);
    } else {
      setLocationType('ALL');
      setSelectedLocationId('');
    }
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
        if (allExcavators.some((e) => e.code?.toUpperCase() === payload.code)) {
          window.alert('Excavator code already exists');
          return;
        }
        if (!payload.name || payload.name.length < 3) {
          window.alert('Name must be at least 3 characters long');
          return;
        }
        await excavatorService.create(payload);
      } else {
        if (payload.code && !codeRegex.test(payload.code)) {
          window.alert('Invalid code. Format examples: E-001, EX-0001, EXC-0001');
          return;
        }
        if (payload.code && selectedExcavator && payload.code !== selectedExcavator.code && allExcavators.some((e) => e.code?.toUpperCase() === payload.code)) {
          window.alert('Excavator code already exists');
          return;
        }
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
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Shovel className="text-amber-400" size={28} />
            </div>
            <span>Excavators Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-14">Manage and monitor excavator operations in real-time</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchExcavators} className="bg-slate-800/80 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          {canEdit && (
            <button onClick={handleCreate} className="bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors">
              <Plus size={20} />
              <span>Add Excavator</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Excavators</p>
              <p className="text-3xl font-bold text-amber-400">{allExcavators.length}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Shovel className="text-amber-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Active</p>
              <p className="text-3xl font-bold text-emerald-400">{allExcavators.filter((e) => e.status === 'ACTIVE').length}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Activity className="text-emerald-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Idle</p>
              <p className="text-3xl font-bold text-sky-400">{allExcavators.filter((e) => e.status === 'IDLE').length}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <Clock className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Maintenance</p>
              <p className="text-3xl font-bold text-amber-400">{allExcavators.filter((e) => e.status === 'MAINTENANCE').length}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Wrench className="text-amber-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Breakdown</p>
              <p className="text-3xl font-bold text-rose-400">{allExcavators.filter((e) => e.status === 'BREAKDOWN').length}</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <AlertCircle className="text-rose-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Standby</p>
              <p className="text-2xl font-bold text-violet-400">{allExcavators.filter((e) => e.status === 'STANDBY').length}</p>
            </div>
            <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <Settings className="text-violet-400" size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Avg Bucket Capacity</p>
              <p className="text-2xl font-bold text-indigo-400">{formatNumber(avgBucketCapacity)} m3</p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Gauge className="text-indigo-400" size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-teal-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Operating Hours</p>
              <p className="text-2xl font-bold text-teal-400">{totalOperatingHours.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
              <Clock className="text-teal-400" size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-pink-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Unique Brands</p>
              <p className="text-2xl font-bold text-pink-400">{uniqueBrands.length}</p>
            </div>
            <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
              <Package className="text-pink-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center gap-3">
              <div className="relative" style={{ minWidth: '320px', maxWidth: '450px', flex: '1' }}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by code, name, brand, model, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-11 text-sm text-slate-200 bg-slate-800/80 border border-slate-700 rounded-lg outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X size={18} />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 min-w-[180px] focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 outline-none transition-colors"
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
                className={`px-4 py-2 rounded-lg border font-medium transition-colors flex items-center gap-2 ${
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-amber-500 text-slate-900 text-xs px-2 py-0.5 rounded-full font-semibold">{activeFiltersCount}</span>}
                <ChevronDown className={`transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} size={16} />
              </button>

              {activeFiltersCount > 0 && (
                <button onClick={handleClearFilters} className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 font-medium transition-colors flex items-center gap-2">
                  <X size={18} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>
                Showing {excavators.length} of {allExcavators.length} excavators
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Filter size={18} className="text-slate-400" />
                <span>Advanced Filters</span>
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Brand</label>
                  <select
                    value={filters.brand}
                    onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
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
                  <label className="block text-sm font-medium text-slate-400 mb-2">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                  >
                    <option value="">All Locations</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Bucket Capacity Range (m3)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={filters.minBucketCapacity}
                      onChange={(e) => setFilters({ ...filters, minBucketCapacity: e.target.value })}
                      placeholder="Min"
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="number"
                      step="0.1"
                      value={filters.maxBucketCapacity}
                      onChange={(e) => setFilters({ ...filters, maxBucketCapacity: e.target.value })}
                      placeholder="Max"
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Year Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.minYear}
                      onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                      placeholder="From"
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="number"
                      value={filters.maxYear}
                      onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                      placeholder="To"
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/80 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('code')}>
                  <div className="flex items-center justify-between">
                    <span>Code</span>
                    {sortField === 'code' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-amber-400" /> : <SortDesc size={16} className="text-amber-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-amber-400" /> : <SortDesc size={16} className="text-amber-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('brand')}>
                  <div className="flex items-center justify-between">
                    <span>Brand</span>
                    {sortField === 'brand' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-amber-400" /> : <SortDesc size={16} className="text-amber-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Model</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('bucketCapacity')}>
                  <div className="flex items-center justify-between">
                    <span>Bucket (m3)</span>
                    {sortField === 'bucketCapacity' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-amber-400" /> : <SortDesc size={16} className="text-amber-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('totalHours')}>
                  <div className="flex items-center justify-between">
                    <span>Hours</span>
                    {sortField === 'totalHours' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-amber-400" /> : <SortDesc size={16} className="text-amber-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('currentLocation')}>
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    {sortField === 'currentLocation' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-amber-400" /> : <SortDesc size={16} className="text-amber-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-amber-400" /> : <SortDesc size={16} className="text-amber-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-900/40">
              {excavators.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Shovel className="text-slate-600" size={48} />
                      <p className="text-slate-400 font-medium">No excavators found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                excavators.map((excavator) => (
                  <tr key={excavator.id} className="hover:bg-amber-500/5 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-bold text-amber-400">{excavator.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-slate-200">{excavator.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{excavator.brand || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{excavator.model || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-200">{formatNumber(excavator.bucketCapacity)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-slate-200">{(excavator.totalHours || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-slate-500" />
                        <span className="text-slate-400">{excavator.currentLocation || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={excavator.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button onClick={() => handleView(excavator)} className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(excavator)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        <button onClick={() => handlePerformance(excavator)} className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors" title="Performance">
                          <Activity size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleDelete(excavator.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-400 flex items-center gap-2">
            <span>Items per page:</span>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 focus:border-sky-500 outline-none transition-colors"
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
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Plus className="text-amber-400" size={24} />
              </div>
              <span className="text-slate-100">Add New Excavator</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Edit className="text-emerald-400" size={24} />
              </div>
              <span className="text-slate-100">Edit Excavator</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                <Eye className="text-violet-400" size={24} />
              </div>
              <span className="text-slate-100">Excavator Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedExcavator ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 to-slate-900 p-6 rounded-xl border border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selectedExcavator.code}</h3>
                  <p className="text-slate-400 mt-1">{selectedExcavator.name}</p>
                </div>
                <StatusBadge status={selectedExcavator.status} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Shovel className="text-amber-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Brand & Model</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedExcavator.brand || '-'}</p>
                <p className="text-sm text-slate-400">{selectedExcavator.model || '-'}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="text-emerald-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Bucket Capacity</label>
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatNumber(selectedExcavator.bucketCapacity)} <span className="text-lg">m3</span>
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-violet-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Year of Manufacture</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedExcavator.yearManufacture || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Production Rate</label>
                </div>
                <p className="text-lg font-medium text-slate-200">
                  {selectedExcavator.productionRate || '-'} <span className="text-sm">ton/min</span>
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Fuel className="text-amber-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Fuel Consumption</label>
                </div>
                <p className="text-lg font-medium text-slate-200">
                  {selectedExcavator.fuelConsumption || '-'} <span className="text-sm">L/hr</span>
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-indigo-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Total Hours</label>
                </div>
                <p className="text-lg font-medium text-slate-200">
                  {(selectedExcavator.totalHours || 0).toLocaleString()} <span className="text-sm">hours</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-rose-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Current Location</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedExcavator.currentLocation || '-'}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-emerald-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Maintenance Cost</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedExcavator.maintenanceCost ? `$${selectedExcavator.maintenanceCost}/hr` : '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Maintenance Schedule</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-500">Last Maintenance</p>
                    <p className="text-sm font-medium text-slate-200">{formatDate(selectedExcavator.lastMaintenance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Next Maintenance</p>
                    <p className="text-sm font-medium text-slate-200">{formatDate(selectedExcavator.nextMaintenance)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-emerald-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Asset Timeline</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-500">Purchase Date</p>
                    <p className="text-sm font-medium text-slate-200">{formatDate(selectedExcavator.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Retirement Date</p>
                    <p className="text-sm font-medium text-slate-200">{formatDate(selectedExcavator.retirementDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedExcavator.remarks && (
              <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/40">
                <label className="text-sm font-semibold text-slate-400 mb-2 block">Remarks</label>
                <p className="text-slate-200">{selectedExcavator.remarks}</p>
              </div>
            )}

            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/40">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Active: {selectedExcavator.isActive ? 'Yes' : 'No'}</span>
                <span>Created: {formatDate(selectedExcavator.createdAt)}</span>
                <span>Updated: {formatDate(selectedExcavator.updatedAt)}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-300">
                <strong className="text-amber-200">Note:</strong> Fields marked with * are required. Make sure to enter valid data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
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
                            const prefix = 'EX';
                            const nums = allExcavators
                              .map((e) => {
                                const m = e.code?.match(/-(\d+)$/);
                                return m ? parseInt(m[1], 10) : null;
                              })
                              .filter(Boolean);
                            const max = nums.length ? Math.max(...nums) : 0;
                            let next = max + 1;
                            let code = `${prefix}-${String(next).padStart(4, '0')}`;
                            while (allExcavators.some((e) => e.code === code)) {
                              next += 1;
                              code = `${prefix}-${String(next).padStart(4, '0')}`;
                            }
                            setFormData((prev) => ({ ...prev, code }));
                          }
                        }}
                        className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                      >
                        {codeEditable ? 'Auto' : 'Edit'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-normal text-slate-500">(e.g., EX-0001)</span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 outline-none transition-colors placeholder:text-slate-500"
                  required
                  placeholder="EX-0001 or EXC-0001"
                  disabled={modalMode === 'create' && !codeEditable}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 outline-none transition-colors placeholder:text-slate-500"
                  required
                  placeholder="Caterpillar 374F-001"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="Caterpillar"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="374F"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Bucket Capacity (m3)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bucketCapacity}
                  onChange={(e) => setFormData({ ...formData, bucketCapacity: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="10.50"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Year of Manufacture</label>
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
                <label className="block text-sm font-semibold text-slate-300 mb-2">Production Rate (ton/min)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.productionRate}
                  onChange={(e) => setFormData({ ...formData, productionRate: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="5.0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Fuel Consumption (L/hr)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.fuelConsumption}
                  onChange={(e) => setFormData({ ...formData, fuelConsumption: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="50.0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Current Location</label>
                {locationOptions.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={locationType}
                        onChange={(e) => setLocationType(e.target.value)}
                        className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 w-36 focus:border-sky-500 outline-none transition-colors"
                      >
                        <option value="ALL">All</option>
                        <option value="SITE">Mining Site</option>
                        <option value="LOADING">Loading Point</option>
                        <option value="DUMPING">Dumping Point</option>
                      </select>
                      <select
                        value={selectedLocationId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedLocationId(id);
                          const item = locationOptions.find((o) => o.id === id);
                          setFormData((prev) => ({ ...prev, currentLocation: item ? item.name : '' }));
                        }}
                        className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 flex-1 focus:border-sky-500 outline-none transition-colors"
                      >
                        <option value="">Select location (optional)</option>
                        {locationOptions
                          .filter((o) => locationType === 'ALL' || o.type === locationType)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} {o.type ? `(${o.type})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    {selectedLocationId === '' && (
                      <input
                        type="text"
                        value={formData.currentLocation}
                        onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                        className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                        placeholder="Or enter custom location (e.g., PIT-01)"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData.currentLocation}
                    onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    placeholder="PIT-01"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors">
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

      <Modal isOpen={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} title={<span className="text-slate-100">Performance Metrics: {selectedExcavator?.code}</span>} size="lg">
        {performanceData ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-500/10 to-slate-900 p-4 rounded-lg border border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="text-amber-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-100">Production Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-amber-400" size={18} />
                    <p className="text-sm font-medium text-slate-400">Total Production</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{performanceData.totalProduction || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">metric tons</p>
                </div>
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="text-emerald-400" size={18} />
                    <p className="text-sm font-medium text-slate-400">Avg Production Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{performanceData.avgProductionRate || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">ton/hour</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-sky-500/10 to-slate-900 p-4 rounded-lg border border-sky-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-sky-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-100">Utilization Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="text-sky-400" size={18} />
                    <p className="text-sm font-medium text-slate-400">Utilization</p>
                  </div>
                  <p className="text-2xl font-bold text-sky-400">{performanceData.utilization || 0}%</p>
                  <p className="text-xs text-slate-500 mt-1">machine utilization</p>
                </div>
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-violet-400" size={18} />
                    <p className="text-sm font-medium text-slate-400">Efficiency</p>
                  </div>
                  <p className="text-2xl font-bold text-violet-400">{performanceData.efficiency || 'N/A'}</p>
                  <p className="text-xs text-slate-500 mt-1">operational efficiency</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-slate-900 p-4 rounded-lg border border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Fuel className="text-amber-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-100">Fuel & Cost Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="text-amber-400" size={18} />
                    <p className="text-sm font-medium text-slate-400">Total Fuel Used</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{performanceData.totalFuel || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">liters</p>
                </div>
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="text-emerald-400" size={18} />
                    <p className="text-sm font-medium text-slate-400">Fuel Efficiency</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{performanceData.totalProduction > 0 ? (performanceData.totalFuel / performanceData.totalProduction).toFixed(2) : 0}</p>
                  <p className="text-xs text-slate-500 mt-1">L/ton</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/40">
              <p className="text-xs text-slate-400">
                <strong className="text-slate-300">Note:</strong> Performance metrics are calculated from actual hauling operations. Data is updated in real-time based on recorded activities and fuel consumption.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-300">No performance data available for this excavator.</p>
            <p className="text-sm text-slate-500 mt-2">Data will appear once hauling operations are recorded.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExcavatorList;
