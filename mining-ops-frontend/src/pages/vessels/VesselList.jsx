import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { vesselService } from '../../services/equipmentService';
import { dumpingPointService } from '../../services/locationService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Edit, Trash2, Eye, Ship, Filter, Search, X, SortAsc, SortDesc, RefreshCw, ChevronDown, Anchor, Activity, MapPin, Package, TrendingUp, AlertCircle, CheckCircle, BarChart3, User } from 'lucide-react';
import { authService } from '../../services/authService';

const VesselList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);
  const [vessels, setVessels] = useState([]);
  const [allVessels, setAllVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState('code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState({
    vesselType: '',
    owner: '',
    isOwned: '',
    minCapacity: '',
    maxCapacity: '',
  });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    vesselType: 'BARGE',
    capacity: '',
    owner: '',
    isOwned: false,
    gt: '',
    dwt: '',
    loa: '',
    currentLocation: '',
    remarks: '',
  });
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [codeEditable, setCodeEditable] = useState(false);

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allVessels];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((vessel) => vessel.code?.toLowerCase().includes(query) || vessel.name?.toLowerCase().includes(query) || vessel.owner?.toLowerCase().includes(query) || vessel.currentLocation?.toLowerCase().includes(query));
    }

    if (statusFilter) {
      filtered = filtered.filter((vessel) => vessel.status === statusFilter);
    }

    if (filters.vesselType) {
      filtered = filtered.filter((vessel) => vessel.vesselType === filters.vesselType);
    }

    if (filters.owner) {
      filtered = filtered.filter((vessel) => vessel.owner?.toLowerCase().includes(filters.owner.toLowerCase()));
    }

    if (filters.isOwned !== '') {
      const isOwnedBool = filters.isOwned === 'true';
      filtered = filtered.filter((vessel) => vessel.isOwned === isOwnedBool);
    }

    if (filters.minCapacity) {
      filtered = filtered.filter((vessel) => vessel.capacity >= parseFloat(filters.minCapacity));
    }

    if (filters.maxCapacity) {
      filtered = filtered.filter((vessel) => vessel.capacity <= parseFloat(filters.maxCapacity));
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'code' || sortField === 'name' || sortField === 'owner' || sortField === 'currentLocation') {
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

    setVessels(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allVessels, searchQuery, statusFilter, filters, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchVessels();
    fetchDumpingPoints();
  }, []);

  useEffect(() => {
    if (mode === 'create' && (!formData.currentLocation || formData.currentLocation === '') && dumpingPoints.length) {
      const first = dumpingPoints[0];
      setFormData((prev) => ({ ...prev, currentLocation: first.name || first.code || '' }));
    }
  }, [dumpingPoints]);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  const fetchVessels = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await vesselService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllVessels(allData);
    } catch (error) {
      console.error('Failed to fetch vessels:', error);
      setAllVessels([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDumpingPoints = async () => {
    try {
      const res = await dumpingPointService.getAll();
      const dumps = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
      setDumpingPoints(dumps);
    } catch (error) {
      setDumpingPoints([]);
    }
  };

  const generateAutoCodeForType = (type) => {
    const prefix = type === 'MOTHER_VESSEL' ? 'MV' : type === 'TUG_BOAT' ? 'TUG' : 'BRG';
    const nums = allVessels
      .map((e) => {
        if (!e.code?.startsWith(`${prefix}-`)) return null;
        const m = e.code?.match(/-(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter(Boolean);
    const max = nums.length ? Math.max(...nums) : 0;
    let next = max + 1;
    let code = `${prefix}-${String(next).padStart(4, '0')}`;
    while (allVessels.some((e) => e.code === code)) {
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
      vesselType: '',
      owner: '',
      isOwned: '',
      minCapacity: '',
      maxCapacity: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const uniqueOwners = useMemo(() => {
    const owners = allVessels
      .map((v) => v.owner)
      .filter((o) => o)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return owners;
  }, [allVessels]);

  const statusOptions = [
    { value: 'AVAILABLE', label: 'Available', color: 'green' },
    { value: 'LOADING', label: 'Loading', color: 'blue' },
    { value: 'SAILING', label: 'Sailing', color: 'purple' },
    { value: 'DISCHARGING', label: 'Discharging', color: 'orange' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'red' },
    { value: 'CHARTERED', label: 'Chartered', color: 'yellow' },
  ];

  const vesselTypeOptions = [
    { value: 'MOTHER_VESSEL', label: 'Mother Vessel' },
    { value: 'BARGE', label: 'Barge' },
    { value: 'TUG_BOAT', label: 'Tug Boat' },
  ];

  const handleCreate = () => {
    setMode('create');
    setCodeEditable(false);
    const defaultCode = generateAutoCodeForType('BARGE');
    const defaultLocation = dumpingPoints.length ? dumpingPoints[0].name || dumpingPoints[0].code || '' : '';
    setFormData({
      code: defaultCode,
      name: '',
      vesselType: 'BARGE',
      capacity: '',
      owner: '',
      isOwned: false,
      gt: '',
      dwt: '',
      loa: '',
      currentLocation: defaultLocation,
      remarks: '',
    });
    setShowModal(true);
  };

  const handleEdit = (v) => {
    setMode('edit');
    setSelected(v);
    setFormData({
      code: v.code,
      name: v.name,
      vesselType: v.vesselType,
      capacity: v.capacity,
      owner: v.owner || '',
      isOwned: v.isOwned || false,
      gt: v.gt || '',
      dwt: v.dwt || '',
      loa: v.loa || '',
      currentLocation: v.currentLocation || '',
      remarks: v.remarks || '',
    });
    setShowModal(true);
  };

  const handleView = (v) => {
    setSelected(v);
    setMode('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {};
      if (formData.code) payload.code = formData.code.toString().trim();
      if (formData.name) payload.name = formData.name.toString().trim();
      if (formData.vesselType) payload.vesselType = formData.vesselType;
      if (formData.owner) payload.owner = formData.owner.toString().trim();
      if (formData.currentLocation) payload.currentLocation = formData.currentLocation.toString().trim();
      if (formData.remarks) payload.remarks = formData.remarks.toString().trim();
      const capacity = formData.capacity !== '' ? Number(formData.capacity) : undefined;
      if (capacity !== undefined && !Number.isNaN(capacity)) payload.capacity = capacity;
      const gt = formData.gt !== '' ? Number(formData.gt) : undefined;
      if (gt !== undefined && !Number.isNaN(gt)) payload.gt = gt;
      const dwt = formData.dwt !== '' ? Number(formData.dwt) : undefined;
      if (dwt !== undefined && !Number.isNaN(dwt)) payload.dwt = dwt;
      const loa = formData.loa !== '' ? Number(formData.loa) : undefined;
      if (loa !== undefined && !Number.isNaN(loa)) payload.loa = loa;
      payload.isOwned = !!formData.isOwned;

      if (mode === 'create') {
        if (!payload.code || !payload.name || payload.capacity === undefined || payload.gt === undefined || payload.dwt === undefined) {
          window.alert('Code, name, capacity, GT, and DWT are required');
          return;
        }
        await vesselService.create(payload);
      } else {
        await vesselService.update(selected.id, payload);
      }

      setShowModal(false);
      fetchVessels();
    } catch (err) {
      if (err.response?.data?.message) window.alert(err.response.data.message);
      else window.alert('Failed to save vessel');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vessel?')) return;
    try {
      await vesselService.delete(id);
      fetchVessels();
    } catch (err) {
      console.error(err);
      window.alert('Failed to delete vessel');
    }
  };

  if (loading && !vessels.length) {
    return <LoadingSpinner fullScreen />;
  }

  const activeFiltersCount = [searchQuery, statusFilter, filters.vesselType, filters.owner, filters.isOwned, filters.minCapacity, filters.maxCapacity].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center space-x-3">
            <Ship className="text-sky-400" size={36} />
            <span>Vessels Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage and monitor maritime fleet operations</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchVessels} className="bg-slate-800/50 hover:bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-700/50 shadow-sm text-slate-300 font-medium transition-colors flex items-center space-x-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          {canEdit && (
            <button onClick={handleCreate} className="btn-primary flex items-center space-x-2 px-5 py-2.5">
              <Plus size={20} />
              <span>Add Vessel</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-blue-950/20 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Total Vessels</p>
              <p className="text-3xl font-bold text-blue-400">{allVessels.length}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Ship className="text-blue-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Available</p>
              <p className="text-3xl font-bold text-cyan-400">{allVessels.filter((v) => v.status === 'AVAILABLE').length}</p>
            </div>
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <CheckCircle className="text-cyan-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-900/20 to-sky-950/20 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Sailing</p>
              <p className="text-3xl font-bold text-sky-400">{allVessels.filter((v) => ['LOADING', 'SAILING', 'DISCHARGING'].includes(v.status)).length}</p>
            </div>
            <div className="p-3 bg-sky-500/20 rounded-xl">
              <Activity className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-300/20 bg-gradient-to-br from-blue-900/20 to-blue-950/20 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Maintenance</p>
              <p className="text-3xl font-bold text-blue-300">{allVessels.filter((v) => v.status === 'MAINTENANCE').length}</p>
            </div>
            <div className="p-3 bg-blue-300/20 rounded-xl">
              <AlertCircle className="text-blue-300" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-3">
              <div className="relative" style={{ minWidth: '320px', maxWidth: '450px', flex: '1' }}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by code, name, owner, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    fontSize: '14px',
                    color: '#f1f5f9',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#334155';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    <X size={18} />
                  </button>
                )}
              </div>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field min-w-[180px] bg-slate-900/50 border-slate-700 text-slate-200">
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
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-sky-500/20 border-sky-500/30 text-sky-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-sky-500 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
                <ChevronDown className={`transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} size={16} />
              </button>

              {activeFiltersCount > 0 && (
                <button onClick={handleClearFilters} className="px-4 py-2 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 font-medium transition-colors flex items-center space-x-2">
                  <X size={18} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <span>
                Showing {vessels.length} of {allVessels.length} vessels
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                <Filter size={18} />
                <span>Advanced Filters</span>
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vessel Type</label>
                  <select value={filters.vesselType} onChange={(e) => setFilters({ ...filters, vesselType: e.target.value })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200">
                    <option value="">All Types</option>
                    {vesselTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Owner</label>
                  <select value={filters.owner} onChange={(e) => setFilters({ ...filters, owner: e.target.value })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200">
                    <option value="">All Owners</option>
                    {uniqueOwners.map((owner) => (
                      <option key={owner} value={owner}>
                        {owner}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ownership</label>
                  <select value={filters.isOwned} onChange={(e) => setFilters({ ...filters, isOwned: e.target.value })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200">
                    <option value="">All</option>
                    <option value="true">Owned</option>
                    <option value="false">Chartered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Capacity Range (ton)</label>
                  <div className="flex items-center space-x-2">
                    <input type="number" value={filters.minCapacity} onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })} placeholder="Min" className="input-field bg-slate-900/50 border-slate-700 text-slate-200" />
                    <span className="text-slate-500">-</span>
                    <input type="number" value={filters.maxCapacity} onChange={(e) => setFilters({ ...filters, maxCapacity: e.target.value })} placeholder="Max" className="input-field bg-slate-900/50 border-slate-700 text-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <tr>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('code')}>
                  <div className="flex items-center justify-between">
                    <span>Code</span>
                    {sortField === 'code' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Type</th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('capacity')}>
                  <div className="flex items-center justify-between">
                    <span>Capacity</span>
                    {sortField === 'capacity' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">GT / DWT</th>
                <th className="table-header">Owner</th>
                <th className="table-header">Location</th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
              {vessels.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <Ship className="text-slate-500" size={48} />
                      <p className="text-slate-400 font-medium">No vessels found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                vessels.map((vessel) => (
                  <tr key={vessel.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="table-cell">
                      <span className="font-bold text-sky-400">{vessel.code}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-slate-200">{vessel.name}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-xs px-2 py-1 rounded-full bg-sky-500/20 text-sky-300 font-medium">{vessel.vesselType === 'MOTHER_VESSEL' ? 'Mother Vessel' : vessel.vesselType === 'TUG_BOAT' ? 'Tug Boat' : 'Barge'}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-slate-200">{vessel.capacity?.toFixed(2) || 0}</span>
                      <span className="text-slate-500 ml-1">ton</span>
                    </td>
                    <td className="table-cell text-sm text-slate-300">
                      <div className="flex flex-col space-y-0.5">
                        <span>GT: {vessel.gt?.toFixed(2) || '-'}</span>
                        <span>DWT: {vessel.dwt?.toFixed(2) || '-'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="text-slate-100 font-medium">{vessel.owner || '-'}</span>
                        {vessel.isOwned !== undefined && <span className={`text-xs ${vessel.isOwned ? 'text-cyan-400' : 'text-sky-400'}`}>{vessel.isOwned ? 'Owned' : 'Chartered'}</span>}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-1 text-slate-300">
                        <MapPin size={14} className="text-slate-500" />
                        <span className="text-sm">{vessel.currentLocation || '-'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={vessel.status} />
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <button onClick={() => handleView(vessel)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(vessel)} className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(vessel.id)} className="p-2 text-blue-300 hover:bg-blue-300/20 rounded-lg transition-colors" title="Delete">
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
        <div className="flex items-center space-x-4">
          <label className="text-sm text-slate-400 flex items-center space-x-2">
            <span>Items per page:</span>
            <select value={pagination.limit} onChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))} className="input-field py-1 px-2 bg-slate-900/50 border-slate-700 text-slate-200">
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
          mode === 'create' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Plus className="text-blue-400" size={24} />
              </div>
              <span className="text-slate-100">Add New Vessel</span>
            </div>
          ) : mode === 'edit' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Edit className="text-cyan-400" size={24} />
              </div>
              <span className="text-slate-100">Edit Vessel</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-500/20 rounded-lg">
                <Eye className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Vessel Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {mode === 'view' && selected ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/30 to-blue-950/30 p-6 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selected.code}</h3>
                  <p className="text-slate-300 mt-1">{selected.name}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="px-3 py-1 bg-slate-800/50 rounded-full text-sky-300 font-medium">{selected.vesselType === 'MOTHER_VESSEL' ? 'Mother Vessel' : selected.vesselType === 'TUG_BOAT' ? 'Tug Boat' : 'Barge'}</span>
                {selected.isOwned !== undefined && <span className={`px-3 py-1 bg-slate-800/50 rounded-full font-medium ${selected.isOwned ? 'text-cyan-300' : 'text-sky-300'}`}>{selected.isOwned ? 'Owned' : 'Chartered'}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Capacity</label>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {selected.capacity?.toFixed(2) || 0} <span className="text-lg">ton</span>
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Anchor className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Gross Tonnage (GT)</label>
                </div>
                <p className="text-2xl font-bold text-cyan-400">{selected.gt?.toFixed(2) || '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Deadweight Tonnage (DWT)</label>
                </div>
                <p className="text-2xl font-bold text-sky-400">{selected.dwt?.toFixed(2) || '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="text-blue-300" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Length Overall (LOA)</label>
                </div>
                <p className="text-lg font-medium text-slate-100">
                  {selected.loa?.toFixed(2) || '-'} {selected.loa ? <span className="text-sm">m</span> : ''}
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Owner</label>
                </div>
                <p className="text-lg font-medium text-slate-100">{selected.owner || '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-300">Current Location</label>
                </div>
                <p className="text-lg font-medium text-slate-100">{selected.currentLocation || '-'}</p>
              </div>
            </div>

            {selected.remarks && (
              <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Remarks</label>
                <p className="text-slate-100">{selected.remarks}</p>
              </div>
            )}

            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-300">Created:</span>
                  <span className="ml-2 font-medium text-slate-100">{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-300">Last Updated:</span>
                  <span className="ml-2 font-medium text-slate-100">{selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString() : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
              <p className="text-sm text-sky-300">
                <strong>Note:</strong> Fields marked with * are required. Make sure to enter valid data for vessel specifications.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Code *</label>
                  {mode === 'create' ? (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCodeEditable((s) => !s);
                          if (codeEditable) {
                            const auto = generateAutoCodeForType(formData.vesselType || 'BARGE');
                            setFormData((prev) => ({ ...prev, code: auto }));
                          }
                        }}
                        className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition"
                      >
                        {codeEditable ? 'Auto' : 'Edit'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-normal text-slate-500">(e.g., MV-0001, BRG-0001)</span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                  required
                  placeholder="MV-0001"
                  disabled={mode === 'edit' || (mode === 'create' && !codeEditable)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200" required placeholder="MV Borneo Utama" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Vessel Type *</label>
                <select
                  value={formData.vesselType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setFormData((prev) => ({ ...prev, vesselType: newType, code: mode === 'create' && !codeEditable ? generateAutoCodeForType(newType) : prev.code }));
                  }}
                  className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                >
                  <option value="MOTHER_VESSEL">Mother Vessel</option>
                  <option value="BARGE">Barge</option>
                  <option value="TUG_BOAT">Tug Boat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Owner *</label>
                <input type="text" value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200" placeholder="PT Marine Services" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Capacity (ton) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                  required
                  placeholder="10000.00"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Gross Tonnage (GT) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.gt}
                  onChange={(e) => setFormData({ ...formData, gt: e.target.value })}
                  className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                  required
                  placeholder="8000.00"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Deadweight Tonnage (DWT) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.dwt}
                  onChange={(e) => setFormData({ ...formData, dwt: e.target.value })}
                  className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                  required
                  placeholder="9000.00"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Length Overall (LOA) in meters</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.loa}
                  onChange={(e) => setFormData({ ...formData, loa: e.target.value })}
                  className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                  placeholder="150.00"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Current Location</label>
                {dumpingPoints && dumpingPoints.length ? (
                  <select value={formData.currentLocation} onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200">
                    <option value="">Select dumping point</option>
                    {dumpingPoints.map((d) => (
                      <option key={d.id} value={d.name || d.code || ''}>
                        {d.name || d.code}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.currentLocation}
                    onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                    className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                    placeholder="Muara Pantai"
                  />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isOwned"
                  checked={formData.isOwned}
                  onChange={(e) => setFormData({ ...formData, isOwned: e.target.checked })}
                  className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500 bg-slate-800 border-slate-600"
                />
                <label htmlFor="isOwned" className="text-sm font-semibold text-slate-300">
                  Owned by Company
                </label>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="input-field bg-slate-900/50 border-slate-700 text-slate-200"
                  rows="3"
                  placeholder="Additional notes or remarks about the vessel..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-700/50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="btn-primary px-6 py-2.5 flex items-center space-x-2">
                {mode === 'create' ? (
                  <>
                    <Plus size={18} />
                    <span>Create Vessel</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Update Vessel</span>
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

export default VesselList;
