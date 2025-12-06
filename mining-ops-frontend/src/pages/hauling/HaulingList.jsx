import React, { useEffect, useState, useCallback } from 'react';
import { haulingService } from '../../services/haulingService';
import { truckService, excavatorService, operatorService } from '../../services';
import { loadingPointService, dumpingPointService, roadSegmentService } from '../../services/locationService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { authService } from '../../services/authService';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Activity,
  Filter,
  Search,
  X,
  SortAsc,
  SortDesc,
  RefreshCw,
  ChevronDown,
  Truck,
  Clock,
  MapPin,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Gauge,
  Navigation,
  Calendar,
  User,
  Construction,
} from 'lucide-react';

const HaulingList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);

  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [trucks, setTrucks] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [operators, setOperators] = useState([]);
  const [filteredOperators, setFilteredOperators] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState([]);
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState('loadingStartTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    truckId: '',
    excavatorId: '',
    minWeight: '',
    maxWeight: '',
    minDistance: '',
    maxDistance: '',
    isDelayed: '',
  });
  const [formData, setFormData] = useState({
    activityNumber: '',
    truckId: '',
    truckIds: [],
    excavatorId: '',
    excavatorIds: [],
    operatorId: '',
    operatorIds: [],
    loadingPointId: '',
    dumpingPointId: '',
    roadSegmentId: '',
    shift: 'SHIFT_1',
    loadingStartTime: '',
    loadWeight: '',
    targetWeight: '',
    distance: '',
    status: 'LOADING',
    remarks: '',
  });

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allActivities];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.activityNumber?.toLowerCase().includes(query) ||
          activity.truck?.code?.toLowerCase().includes(query) ||
          activity.truck?.name?.toLowerCase().includes(query) ||
          activity.excavator?.code?.toLowerCase().includes(query) ||
          activity.operator?.user?.fullName?.toLowerCase().includes(query) ||
          activity.operator?.employeeNumber?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((activity) => activity.status === statusFilter);
    }

    if (shiftFilter) {
      filtered = filtered.filter((activity) => activity.shift === shiftFilter);
    }

    if (filters.truckId) {
      filtered = filtered.filter((activity) => activity.truckId === filters.truckId);
    }

    if (filters.excavatorId) {
      filtered = filtered.filter((activity) => activity.excavatorId === filters.excavatorId);
    }

    if (filters.minWeight) {
      filtered = filtered.filter((activity) => activity.loadWeight >= parseFloat(filters.minWeight));
    }

    if (filters.maxWeight) {
      filtered = filtered.filter((activity) => activity.loadWeight <= parseFloat(filters.maxWeight));
    }

    if (filters.minDistance) {
      filtered = filtered.filter((activity) => activity.distance >= parseFloat(filters.minDistance));
    }

    if (filters.maxDistance) {
      filtered = filtered.filter((activity) => activity.distance <= parseFloat(filters.maxDistance));
    }

    if (filters.isDelayed !== '') {
      const isDelayed = filters.isDelayed === 'true';
      filtered = filtered.filter((activity) => activity.isDelayed === isDelayed);
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'activityNumber') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      } else if (sortField === 'loadingStartTime') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalPages = Math.ceil(filtered.length / pagination.limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedData = filtered.slice(startIndex, startIndex + pagination.limit);

    setActivities(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allActivities, searchQuery, statusFilter, shiftFilter, filters, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchActivities();
    loadResources();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  // Filter operators by shift selection
  useEffect(() => {
    if (formData.shift && operators.length > 0) {
      const shiftOperators = operators.filter((op) => op.shift === formData.shift);
      setFilteredOperators(shiftOperators.length > 0 ? shiftOperators : operators);
    } else {
      setFilteredOperators(operators);
    }
  }, [formData.shift, operators]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await haulingService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllActivities(allData);
    } catch (error) {
      console.error('Failed to fetch hauling activities:', error);
      setAllActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const [trucksRes, excavatorsRes, operatorsRes, loadingRes, dumpingRes, roadsRes] = await Promise.all([
        truckService.getAll({ limit: 1000 }),
        excavatorService.getAll({ limit: 1000 }),
        operatorService.getAll({ limit: 1000 }),
        loadingPointService.getAll({ limit: 1000 }),
        dumpingPointService.getAll({ limit: 1000 }),
        roadSegmentService.getAll({ limit: 1000 }),
      ]);
      setTrucks(Array.isArray(trucksRes.data) ? trucksRes.data : []);
      setExcavators(Array.isArray(excavatorsRes.data) ? excavatorsRes.data : []);
      setOperators(Array.isArray(operatorsRes.data) ? operatorsRes.data : []);
      setLoadingPoints(Array.isArray(loadingRes.data) ? loadingRes.data : []);
      setDumpingPoints(Array.isArray(dumpingRes.data) ? dumpingRes.data : []);
      setRoadSegments(Array.isArray(roadsRes.data) ? roadsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
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
    setShiftFilter('');
    setFilters({
      truckId: '',
      excavatorId: '',
      minWeight: '',
      maxWeight: '',
      minDistance: '',
      maxDistance: '',
      isDelayed: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const generateAutoActivityNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = 'HA';
    const nums = allActivities
      .map((a) => {
        if (!a.activityNumber?.startsWith(`${prefix}-${dateStr}-`)) return null;
        const m = a.activityNumber?.match(/-(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter(Boolean);
    const max = nums.length ? Math.max(...nums) : 0;
    let next = max + 1;
    const generateCode = (num) => `${prefix}-${dateStr}-${String(num).padStart(3, '0')}`;
    const existingCodes = new Set(allActivities.map((a) => a.activityNumber));
    let code = generateCode(next);
    while (existingCodes.has(code)) {
      next += 1;
      code = generateCode(next);
    }
    return code;
  };

  const statusOptions = [
    { value: 'PLANNED', label: 'Planned', color: 'gray' },
    { value: 'IN_QUEUE', label: 'In Queue', color: 'yellow' },
    { value: 'LOADING', label: 'Loading', color: 'purple' },
    { value: 'HAULING', label: 'Hauling', color: 'blue' },
    { value: 'DUMPING', label: 'Dumping', color: 'orange' },
    { value: 'RETURNING', label: 'Returning', color: 'indigo' },
    { value: 'COMPLETED', label: 'Completed', color: 'green' },
    { value: 'DELAYED', label: 'Delayed', color: 'red' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'gray' },
    { value: 'INCIDENT', label: 'Incident', color: 'red' },
  ];

  const shiftOptions = [
    { value: 'SHIFT_1', label: 'Shift 1' },
    { value: 'SHIFT_2', label: 'Shift 2' },
    { value: 'SHIFT_3', label: 'Shift 3' },
  ];

  const handleCreate = () => {
    setModalMode('create');
    const now = new Date();
    const defaultTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    setFormData({
      activityNumber: '', // Will be auto-generated based on number of trucks selected
      truckId: '',
      truckIds: [], // Now supports multi-select by default
      excavatorId: '',
      excavatorIds: [], // Now supports multi-select by default
      operatorId: '',
      operatorIds: [], // Now supports multi-select by default
      loadingPointId: '',
      dumpingPointId: '',
      roadSegmentId: '',
      shift: 'SHIFT_1',
      loadingStartTime: defaultTime.toISOString().slice(0, 16),
      loadWeight: '',
      targetWeight: '',
      distance: '',
      status: 'LOADING',
      remarks: '',
    });
    setShowModal(true);
  };

  const handleEdit = async (activity) => {
    setModalMode('edit');
    setSelectedActivity(activity);

    // Robust: Ensure referenced resources exist in the dropdown lists
    try {
      const missingResources = [];

      if (activity.truckId && !trucks.find((t) => t.id === activity.truckId)) {
        missingResources.push(
          truckService.getById(activity.truckId).then((res) => {
            if (res.data) setTrucks((prev) => [...prev, res.data]);
          })
        );
      }

      if (activity.excavatorId && !excavators.find((e) => e.id === activity.excavatorId)) {
        missingResources.push(
          excavatorService.getById(activity.excavatorId).then((res) => {
            if (res.data) setExcavators((prev) => [...prev, res.data]);
          })
        );
      }

      if (activity.operatorId && !operators.find((o) => o.id === activity.operatorId)) {
        missingResources.push(
          operatorService.getById(activity.operatorId).then((res) => {
            if (res.data) setOperators((prev) => [...prev, res.data]);
          })
        );
      }

      if (activity.loadingPointId && !loadingPoints.find((l) => l.id === activity.loadingPointId)) {
        missingResources.push(
          loadingPointService.getById(activity.loadingPointId).then((res) => {
            if (res.data) setLoadingPoints((prev) => [...prev, res.data]);
          })
        );
      }

      if (activity.dumpingPointId && !dumpingPoints.find((d) => d.id === activity.dumpingPointId)) {
        missingResources.push(
          dumpingPointService.getById(activity.dumpingPointId).then((res) => {
            if (res.data) setDumpingPoints((prev) => [...prev, res.data]);
          })
        );
      }

      if (activity.roadSegmentId && !roadSegments.find((r) => r.id === activity.roadSegmentId)) {
        missingResources.push(
          roadSegmentService.getById(activity.roadSegmentId).then((res) => {
            if (res.data) setRoadSegments((prev) => [...prev, res.data]);
          })
        );
      }

      if (missingResources.length > 0) {
        await Promise.all(missingResources);
      }
    } catch (error) {
      console.error('Error ensuring resources exist for edit:', error);
    }

    setFormData({
      activityNumber: activity.activityNumber || '',
      truckId: activity.truckId || '',
      excavatorId: activity.excavatorId || '',
      operatorId: activity.operatorId || '',
      loadingPointId: activity.loadingPointId || '',
      dumpingPointId: activity.dumpingPointId || '',
      roadSegmentId: activity.roadSegmentId || '',
      shift: activity.shift || 'SHIFT_1',
      loadingStartTime: activity.loadingStartTime ? new Date(activity.loadingStartTime).toISOString().slice(0, 16) : '',
      loadWeight: activity.loadWeight ?? '',
      targetWeight: activity.targetWeight ?? '',
      distance: activity.distance ?? '',
      status: activity.status || 'LOADING',
      remarks: activity.remarks || '',
    });
    setShowModal(true);
  };

  const handleView = (activity) => {
    setSelectedActivity(activity);
    setModalMode('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if multi-equipment mode (arrays have items)
      const hasMultiTrucks = formData.truckIds.length > 0;
      const hasMultiExcavators = formData.excavatorIds.length > 0;
      const hasMultiOperators = formData.operatorIds.length > 0;
      const isMultiMode = hasMultiTrucks || hasMultiExcavators || hasMultiOperators;

      // Multi-equipment creation mode (new default)
      if (modalMode === 'create' && isMultiMode) {
        // If trucks array is empty but single truckId is set, use single truckId
        const truckIds = hasMultiTrucks ? formData.truckIds : formData.truckId ? [formData.truckId] : [];
        const excavatorIds = hasMultiExcavators ? formData.excavatorIds : formData.excavatorId ? [formData.excavatorId] : [];
        const operatorIds = hasMultiOperators ? formData.operatorIds : formData.operatorId ? [formData.operatorId] : [];

        if (truckIds.length === 0) {
          window.alert('Please select at least one truck');
          return;
        }
        if (excavatorIds.length === 0) {
          window.alert('Please select at least one excavator');
          return;
        }
        if (operatorIds.length === 0) {
          window.alert('Please select at least one operator');
          return;
        }

        const baseCode = generateAutoActivityNumber();
        const prefix = baseCode.split('-').slice(0, 2).join('-');
        const existingCodes = new Set(allActivities.map((a) => a.activityNumber));

        let createdCount = 0;
        let failedCount = 0;

        for (let i = 0; i < truckIds.length; i++) {
          const truckId = truckIds[i];
          const excavatorId = excavatorIds[i % excavatorIds.length] || excavatorIds[0];
          const operatorId = operatorIds[i % operatorIds.length] || operatorIds[0];

          // Generate unique activity number
          let actNum = i + 1;
          let activityNumber = `${prefix}-${String(actNum).padStart(3, '0')}`;
          while (existingCodes.has(activityNumber)) {
            actNum++;
            activityNumber = `${prefix}-${String(actNum).padStart(3, '0')}`;
          }
          existingCodes.add(activityNumber);

          const payload = {
            activityNumber,
            truckId,
            excavatorId,
            operatorId,
            loadingPointId: formData.loadingPointId,
            dumpingPointId: formData.dumpingPointId,
            shift: formData.shift,
            loadingStartTime: new Date(formData.loadingStartTime).toISOString(),
            loadWeight: formData.loadWeight === '' ? 0 : parseFloat(formData.loadWeight),
            targetWeight: formData.targetWeight === '' ? 0 : parseFloat(formData.targetWeight),
            distance: formData.distance === '' ? 0 : parseFloat(formData.distance),
          };

          if (formData.roadSegmentId) payload.roadSegmentId = formData.roadSegmentId;
          if (formData.remarks) payload.remarks = formData.remarks.trim();
          if (formData.status) payload.status = formData.status;

          try {
            await haulingService.create(payload);
            createdCount++;
          } catch (err) {
            console.error(`Failed to create hauling for truck ${truckId}:`, err);
            failedCount++;
          }
        }

        if (createdCount > 0) {
          window.alert(`Creation complete: ${createdCount} hauling ${createdCount > 1 ? 'activities' : 'activity'} created${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
        }

        setShowModal(false);
        fetchActivities();
        return;
      }

      // Single creation/edit mode (when no arrays are used OR edit mode)
      const payload = {
        activityNumber: formData.activityNumber.trim() || generateAutoActivityNumber(),
        truckId: formData.truckId,
        excavatorId: formData.excavatorId,
        operatorId: formData.operatorId,
        loadingPointId: formData.loadingPointId,
        dumpingPointId: formData.dumpingPointId,
        shift: formData.shift,
        loadingStartTime: new Date(formData.loadingStartTime).toISOString(),
        loadWeight: formData.loadWeight === '' ? 0 : parseFloat(formData.loadWeight),
        targetWeight: formData.targetWeight === '' ? 0 : parseFloat(formData.targetWeight),
        distance: formData.distance === '' ? 0 : parseFloat(formData.distance),
      };

      if (formData.roadSegmentId) payload.roadSegmentId = formData.roadSegmentId;
      if (formData.remarks) payload.remarks = formData.remarks.trim();
      if (formData.status) payload.status = formData.status;

      if (modalMode === 'create') {
        await haulingService.create(payload);
      } else {
        await haulingService.update(selectedActivity.id, payload);
      }

      setShowModal(false);
      fetchActivities();
    } catch (error) {
      console.error('Failed to save hauling activity:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else {
        window.alert('Failed to save hauling activity. Please check your input.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to cancel this hauling activity?')) {
      try {
        await haulingService.cancel(id, 'Cancelled by user');
        fetchActivities();
      } catch (error) {
        console.error('Failed to cancel hauling activity:', error);
        if (error.response?.data?.message) {
          window.alert(error.response.data.message);
        }
      }
    }
  };

  if (loading && !activities.length) {
    return <LoadingSpinner fullScreen />;
  }

  const activeFiltersCount = [searchQuery, statusFilter, shiftFilter, filters.truckId, filters.excavatorId, filters.minWeight, filters.maxWeight, filters.minDistance, filters.maxDistance, filters.isDelayed].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Activity className="text-sky-400" size={28} />
            </div>
            <span>Hauling Activities Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-14">Monitor and manage hauling operations in real-time</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchActivities} className="bg-slate-800/80 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          {canEdit && (
            <button onClick={handleCreate} className="bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors">
              <Plus size={20} />
              <span>Add Hauling Activity</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Activities</p>
              <p className="text-3xl font-bold text-sky-400">{allActivities.length}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <Activity className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-violet-400">{allActivities.filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'RETURNING'].includes(a.status)).length}</p>
            </div>
            <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <TrendingUp className="text-violet-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Completed</p>
              <p className="text-3xl font-bold text-emerald-400">{allActivities.filter((a) => a.status === 'COMPLETED').length}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <CheckCircle className="text-emerald-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Delayed</p>
              <p className="text-3xl font-bold text-rose-400">{allActivities.filter((a) => a.isDelayed || a.status === 'DELAYED').length}</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <AlertCircle className="text-rose-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-600/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Cancelled</p>
              <p className="text-3xl font-bold text-slate-400">{allActivities.filter((a) => a.status === 'CANCELLED').length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl border border-slate-600/30">
              <X className="text-slate-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center gap-3">
              <div className="relative" style={{ minWidth: '380px', maxWidth: '500px', flex: '1' }}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by activity number, truck, excavator, or operator..."
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
                className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 min-w-[180px] focus:border-sky-500 outline-none transition-colors"
              >
                <option value="">All Status</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 min-w-[150px] focus:border-sky-500 outline-none transition-colors"
              >
                <option value="">All Shifts</option>
                {shiftOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors flex items-center gap-2 ${
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-sky-500 text-slate-900 text-xs px-2 py-0.5 rounded-full font-semibold">{activeFiltersCount}</span>}
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
                Showing {activities.length} of {allActivities.length} activities
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
                  <label className="block text-sm font-medium text-slate-400 mb-2">Truck</label>
                  <select
                    value={filters.truckId}
                    onChange={(e) => setFilters({ ...filters, truckId: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                  >
                    <option value="">All Trucks</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.code} - {truck.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Excavator</label>
                  <select
                    value={filters.excavatorId}
                    onChange={(e) => setFilters({ ...filters, excavatorId: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                  >
                    <option value="">All Excavators</option>
                    {excavators.map((excavator) => (
                      <option key={excavator.id} value={excavator.id}>
                        {excavator.code} - {excavator.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Min Weight (ton)</label>
                  <input
                    type="number"
                    value={filters.minWeight}
                    onChange={(e) => setFilters({ ...filters, minWeight: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Max Weight (ton)</label>
                  <input
                    type="number"
                    value={filters.maxWeight}
                    onChange={(e) => setFilters({ ...filters, maxWeight: e.target.value })}
                    placeholder="100"
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Min Distance (km)</label>
                  <input
                    type="number"
                    value={filters.minDistance}
                    onChange={(e) => setFilters({ ...filters, minDistance: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Max Distance (km)</label>
                  <input
                    type="number"
                    value={filters.maxDistance}
                    onChange={(e) => setFilters({ ...filters, maxDistance: e.target.value })}
                    placeholder="10"
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Delay Status</label>
                  <select
                    value={filters.isDelayed}
                    onChange={(e) => setFilters({ ...filters, isDelayed: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                  >
                    <option value="">All</option>
                    <option value="true">Delayed</option>
                    <option value="false">On Time</option>
                  </select>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('activityNumber')}>
                  <div className="flex items-center justify-between">
                    <span>Activity No.</span>
                    {sortField === 'activityNumber' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Truck</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Excavator</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Operator</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('loadWeight')}>
                  <div className="flex items-center justify-between">
                    <span>Load (ton)</span>
                    {sortField === 'loadWeight' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('distance')}>
                  <div className="flex items-center justify-between">
                    <span>Distance (km)</span>
                    {sortField === 'distance' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('shift')}>
                  <div className="flex items-center justify-between">
                    <span>Shift</span>
                    {sortField === 'shift' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-900/40">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Activity className="text-slate-600" size={48} />
                      <p className="text-slate-400 font-medium">No hauling activities found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-sky-500/5 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-bold text-sky-400">{activity.activityNumber}</span>
                      {activity.isDelayed && <span className="ml-2 text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">Delayed</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-slate-200">{activity.truck?.code || '-'}</span>
                      <p className="text-xs text-slate-500">{activity.truck?.name || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-slate-200">{activity.excavator?.code || '-'}</span>
                      <p className="text-xs text-slate-500">{activity.excavator?.name || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-slate-200">{activity.operator?.user?.fullName || '-'}</span>
                      <p className="text-xs text-slate-500">{activity.operator?.employeeNumber || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-200">{activity.loadWeight}</span>
                      <p className="text-xs text-slate-500">Target: {activity.targetWeight}</p>
                      {activity.loadEfficiency && <p className="text-xs text-emerald-400">{activity.loadEfficiency.toFixed(1)}%</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-200">{activity.distance}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{activity.shift?.replace('SHIFT_', 'Shift ')}</td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={activity.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button onClick={() => handleView(activity)} className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(activity)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(activity.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Cancel">
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
              <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
                <Plus className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Add Hauling Activity</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Edit className="text-emerald-400" size={24} />
              </div>
              <span className="text-slate-100">Edit Hauling Activity</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                <Eye className="text-violet-400" size={24} />
              </div>
              <span className="text-slate-100">Hauling Activity Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedActivity ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-500/10 to-violet-500/10 p-6 rounded-xl border border-sky-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selectedActivity.activityNumber}</h3>
                  <p className="text-slate-400 mt-1">
                    {selectedActivity.loadingPoint?.name || selectedActivity.loadingPoint?.code || 'Loading Point'} → {selectedActivity.dumpingPoint?.name || selectedActivity.dumpingPoint?.code || 'Dumping Point'}
                  </p>
                </div>
                <StatusBadge status={selectedActivity.status} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="text-sky-400" size={16} />
                    <label className="text-xs font-semibold text-slate-400">Shift</label>
                  </div>
                  <p className="text-lg font-medium text-slate-200">{selectedActivity.shift?.replace('SHIFT_', 'Shift ')}</p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="text-sky-400" size={16} />
                    <label className="text-xs font-semibold text-slate-400">Loading Time</label>
                  </div>
                  <p className="text-sm font-medium text-slate-200">{selectedActivity.loadingStartTime ? new Date(selectedActivity.loadingStartTime).toLocaleString() : '-'}</p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="text-sky-400" size={16} />
                    <label className="text-xs font-semibold text-slate-400">Road Condition</label>
                  </div>
                  <p className="text-lg font-medium text-slate-200">{selectedActivity.roadCondition || 'GOOD'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Truck</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.truck?.code || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.truck?.name || ''}</p>
                <p className="text-xs text-slate-500">
                  {selectedActivity.truck?.brand || ''} {selectedActivity.truck?.model || ''}
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Construction className="text-orange-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Excavator</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.excavator?.code || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.excavator?.name || ''}</p>
                <p className="text-xs text-slate-500">
                  {selectedActivity.excavator?.brand || ''} {selectedActivity.excavator?.model || ''}
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="text-emerald-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Operator</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.operator?.user?.fullName || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.operator?.employeeNumber || ''}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="text-violet-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Supervisor</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.supervisor?.fullName || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.supervisor?.username || ''}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-rose-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Loading Point</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.loadingPoint?.code || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.loadingPoint?.name || ''}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Dumping Point</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.dumpingPoint?.code || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.dumpingPoint?.name || ''}</p>
              </div>

              {selectedActivity.roadSegment && (
                <div className="col-span-2 bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="text-slate-400" size={18} />
                    <label className="text-sm font-semibold text-slate-400">Road Segment</label>
                  </div>
                  <p className="text-lg font-medium text-slate-200">
                    {selectedActivity.roadSegment?.code || '-'} - {selectedActivity.roadSegment?.name || ''}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Package className="text-emerald-400" size={18} />
                <span>Load Information</span>
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Load Weight</label>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {selectedActivity.loadWeight} <span className="text-sm text-slate-400">ton</span>
                  </p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Target Weight</label>
                  <p className="text-2xl font-bold text-slate-200 mt-1">
                    {selectedActivity.targetWeight} <span className="text-sm text-slate-400">ton</span>
                  </p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Load Efficiency</label>
                  <p className="text-2xl font-bold text-sky-400 mt-1">{selectedActivity.loadEfficiency ? selectedActivity.loadEfficiency.toFixed(1) : '-'}%</p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Distance</label>
                  <p className="text-2xl font-bold text-violet-400 mt-1">
                    {selectedActivity.distance} <span className="text-sm text-slate-400">km</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-violet-500/10 p-4 rounded-lg border border-violet-500/20">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Clock className="text-violet-400" size={18} />
                <span>Time Breakdown</span>
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Queue Duration</label>
                  <p className="text-xl font-bold text-slate-200 mt-1">
                    {selectedActivity.queueDuration || 0} <span className="text-sm text-slate-400">min</span>
                  </p>
                  {selectedActivity.queueStartTime && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(selectedActivity.queueStartTime).toLocaleTimeString()} - {selectedActivity.queueEndTime ? new Date(selectedActivity.queueEndTime).toLocaleTimeString() : 'ongoing'}
                    </p>
                  )}
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Loading Duration</label>
                  <p className="text-xl font-bold text-slate-200 mt-1">
                    {selectedActivity.loadingDuration || 0} <span className="text-sm text-slate-400">min</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedActivity.loadingStartTime ? new Date(selectedActivity.loadingStartTime).toLocaleTimeString() : '-'} -{' '}
                    {selectedActivity.loadingEndTime ? new Date(selectedActivity.loadingEndTime).toLocaleTimeString() : 'ongoing'}
                  </p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Hauling Duration</label>
                  <p className="text-xl font-bold text-slate-200 mt-1">
                    {selectedActivity.haulingDuration || 0} <span className="text-sm text-slate-400">min</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedActivity.departureTime ? new Date(selectedActivity.departureTime).toLocaleTimeString() : '-'} - {selectedActivity.arrivalTime ? new Date(selectedActivity.arrivalTime).toLocaleTimeString() : 'ongoing'}
                  </p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Dumping Duration</label>
                  <p className="text-xl font-bold text-slate-200 mt-1">
                    {selectedActivity.dumpingDuration || 0} <span className="text-sm text-slate-400">min</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedActivity.dumpingStartTime ? new Date(selectedActivity.dumpingStartTime).toLocaleTimeString() : '-'} -{' '}
                    {selectedActivity.dumpingEndTime ? new Date(selectedActivity.dumpingEndTime).toLocaleTimeString() : 'ongoing'}
                  </p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Return Duration</label>
                  <p className="text-xl font-bold text-slate-200 mt-1">
                    {selectedActivity.returnDuration || 0} <span className="text-sm text-slate-400">min</span>
                  </p>
                  {selectedActivity.returnTime && <p className="text-xs text-slate-500 mt-1">Returned at: {new Date(selectedActivity.returnTime).toLocaleTimeString()}</p>}
                </div>
                <div className="bg-violet-500/20 p-3 rounded-lg border border-violet-500/30">
                  <label className="text-xs font-medium text-violet-300">Total Cycle Time</label>
                  <p className="text-2xl font-bold text-violet-400 mt-1">
                    {selectedActivity.totalCycleTime || 0} <span className="text-sm text-slate-400">min</span>
                  </p>
                </div>
              </div>
            </div>

            {(selectedActivity.isDelayed || selectedActivity.delayMinutes > 0) && (
              <div className="bg-rose-500/10 p-4 rounded-lg border border-rose-500/20">
                <h4 className="text-sm font-semibold text-rose-300 mb-3 flex items-center gap-2">
                  <AlertCircle className="text-rose-400" size={18} />
                  <span>Delay Information</span>
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                    <label className="text-xs font-medium text-slate-400">Delay Minutes</label>
                    <p className="text-xl font-bold text-rose-400 mt-1">
                      {selectedActivity.delayMinutes || 0} <span className="text-sm text-slate-400">min</span>
                    </p>
                  </div>
                  {selectedActivity.delayReasonDetail && (
                    <div className="col-span-2 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                      <label className="text-xs font-medium text-slate-400">Delay Reason</label>
                      <p className="text-sm text-slate-200 mt-1">{selectedActivity.delayReasonDetail}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedActivity.fuelConsumed && (
              <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                <h4 className="text-sm font-semibold text-orange-300 mb-2 flex items-center gap-2">
                  <Gauge className="text-orange-400" size={18} />
                  <span>Fuel Consumption</span>
                </h4>
                <p className="text-2xl font-bold text-orange-400">
                  {selectedActivity.fuelConsumed} <span className="text-sm text-slate-400">liters</span>
                </p>
              </div>
            )}

            {selectedActivity.weatherCondition && (
              <div className="bg-cyan-500/10 p-4 rounded-lg border border-cyan-500/20">
                <h4 className="text-sm font-semibold text-cyan-300 mb-2">Weather Condition</h4>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.weatherCondition}</p>
              </div>
            )}

            {selectedActivity.remarks && (
              <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50">
                <label className="text-sm font-semibold text-slate-400 mb-2 block">Remarks</label>
                <p className="text-slate-200">{selectedActivity.remarks}</p>
              </div>
            )}

            {(selectedActivity.predictedDelayRisk || selectedActivity.predictedDelayMinutes) && (
              <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
                <h4 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="text-amber-400" size={18} />
                  <span>AI Predictions</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedActivity.predictedDelayRisk && (
                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                      <label className="text-xs font-medium text-slate-400">Predicted Delay Risk</label>
                      <p className="text-lg font-medium text-slate-200 mt-1">{selectedActivity.predictedDelayRisk}</p>
                    </div>
                  )}
                  {selectedActivity.predictedDelayMinutes && (
                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                      <label className="text-xs font-medium text-slate-400">Predicted Delay</label>
                      <p className="text-lg font-medium text-slate-200 mt-1">
                        {selectedActivity.predictedDelayMinutes} <span className="text-sm text-slate-400">min</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-500">
              <div className="flex justify-between">
                <div>
                  <strong className="text-slate-400">Created:</strong> {selectedActivity.createdAt ? new Date(selectedActivity.createdAt).toLocaleString() : '-'}
                </div>
                <div>
                  <strong className="text-slate-400">Updated:</strong> {selectedActivity.updatedAt ? new Date(selectedActivity.updatedAt).toLocaleString() : '-'}
                </div>
              </div>
            </div>
          </div>
        ) : modalMode === 'edit' ? (
          // EDIT MODE - Single equipment selection
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
              <p className="text-sm text-emerald-300">
                <strong>Edit Mode:</strong> Update the hauling activity details below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Activity Number *</label>
                <input
                  type="text"
                  value={formData.activityNumber}
                  onChange={(e) => setFormData({ ...formData, activityNumber: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  required
                  placeholder="HA-20251203-001"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Shift * <span className="text-xs text-violet-400">(Filters operators by shift)</span>
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value, operatorId: '' })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="SHIFT_1">Shift 1 (Pagi)</option>
                  <option value="SHIFT_2">Shift 2 (Siang)</option>
                  <option value="SHIFT_3">Shift 3 (Malam)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Truck *</label>
                <select
                  value={formData.truckId}
                  onChange={(e) => setFormData({ ...formData, truckId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Truck</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.code} - {truck.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Excavator *</label>
                <select
                  value={formData.excavatorId}
                  onChange={(e) => setFormData({ ...formData, excavatorId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Excavator</option>
                  {excavators.map((excavator) => (
                    <option key={excavator.id} value={excavator.id}>
                      {excavator.code} - {excavator.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Operator *{' '}
                  <span className="text-xs text-slate-500">
                    ({filteredOperators.length} available for {formData.shift})
                  </span>
                </label>
                <select
                  value={formData.operatorId}
                  onChange={(e) => setFormData({ ...formData, operatorId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Operator</option>
                  {filteredOperators.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.employeeNumber} - {operator.user?.fullName} ({operator.shift})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Loading Point *</label>
                <select
                  value={formData.loadingPointId}
                  onChange={(e) => setFormData({ ...formData, loadingPointId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Loading Point</option>
                  {loadingPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.code} - {point.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Dumping Point *</label>
                <select
                  value={formData.dumpingPointId}
                  onChange={(e) => setFormData({ ...formData, dumpingPointId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Dumping Point</option>
                  {dumpingPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.code} - {point.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Road Segment</label>
                <select
                  value={formData.roadSegmentId}
                  onChange={(e) => setFormData({ ...formData, roadSegmentId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                >
                  <option value="">Select Road Segment (Optional)</option>
                  {roadSegments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.code} - {segment.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Loading Start Time *</label>
                <input
                  type="datetime-local"
                  value={formData.loadingStartTime}
                  onChange={(e) => setFormData({ ...formData, loadingStartTime: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Load Weight (ton) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.loadWeight}
                  onChange={(e) => setFormData({ ...formData, loadWeight: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  required
                  placeholder="28.5"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Target Weight (ton) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  required
                  placeholder="30.0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Distance (km) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.distance}
                  onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  required
                  placeholder="2.5"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_QUEUE">In Queue</option>
                  <option value="LOADING">Loading</option>
                  <option value="HAULING">Hauling</option>
                  <option value="DUMPING">Dumping</option>
                  <option value="RETURNING">Returning</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  rows="3"
                  placeholder="Optional notes or remarks..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2">
                <CheckCircle size={18} />
                <span>Update Activity</span>
              </button>
            </div>
          </form>
        ) : (
          // CREATE MODE - Multi-equipment selection by default
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
              <p className="text-sm text-sky-300">
                <strong>Multi-Equipment Mode:</strong> Select multiple trucks, excavators, and operators to create multiple hauling activities at once. Each truck will generate a separate activity with round-robin assignment of excavators
                and operators.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Shift * <span className="text-xs text-violet-400">(Filters operators by shift)</span>
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value, operatorIds: [], operatorId: '' })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="SHIFT_1">Shift 1 (Pagi)</option>
                  <option value="SHIFT_2">Shift 2 (Siang)</option>
                  <option value="SHIFT_3">Shift 3 (Malam)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Loading Start Time *</label>
                <input
                  type="datetime-local"
                  value={formData.loadingStartTime}
                  onChange={(e) => setFormData({ ...formData, loadingStartTime: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                />
              </div>

              {/* Multi-select Trucks */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  <Truck size={16} className="inline mr-2 text-sky-400" />
                  Select Trucks * <span className="text-xs text-slate-500">({formData.truckIds.length} selected)</span>
                </label>
                <div className="border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-800/60">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                    <button type="button" onClick={() => setFormData({ ...formData, truckIds: trucks.map((t) => t.id) })} className="text-xs text-sky-400 hover:text-sky-300">
                      Select All
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, truckIds: [] })} className="text-xs text-slate-400 hover:text-slate-300">
                      Clear All
                    </button>
                  </div>
                  {trucks.map((truck) => (
                    <label key={truck.id} className="flex items-center gap-2 p-2 hover:bg-sky-500/10 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.truckIds.includes(truck.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, truckIds: [...formData.truckIds, truck.id] });
                          } else {
                            setFormData({ ...formData, truckIds: formData.truckIds.filter((id) => id !== truck.id) });
                          }
                        }}
                        className="rounded text-sky-500 bg-slate-700 border-slate-600"
                      />
                      <span className="text-sm text-slate-300">
                        <strong className="text-slate-200">{truck.code}</strong> - {truck.name} ({truck.brand} {truck.model})
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Each selected truck will create a separate hauling activity</p>
              </div>

              {/* Multi-select Excavators */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  <Construction size={16} className="inline mr-2 text-orange-400" />
                  Select Excavators * <span className="text-xs text-slate-500">({formData.excavatorIds.length} selected)</span>
                </label>
                <div className="border border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-800/60">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                    <button type="button" onClick={() => setFormData({ ...formData, excavatorIds: excavators.map((e) => e.id) })} className="text-xs text-orange-400 hover:text-orange-300">
                      Select All
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, excavatorIds: [] })} className="text-xs text-slate-400 hover:text-slate-300">
                      Clear All
                    </button>
                  </div>
                  {excavators.map((exc) => (
                    <label key={exc.id} className="flex items-center gap-2 p-2 hover:bg-orange-500/10 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.excavatorIds.includes(exc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, excavatorIds: [...formData.excavatorIds, exc.id] });
                          } else {
                            setFormData({ ...formData, excavatorIds: formData.excavatorIds.filter((id) => id !== exc.id) });
                          }
                        }}
                        className="rounded text-orange-500 bg-slate-700 border-slate-600"
                      />
                      <span className="text-sm text-slate-300">
                        <strong className="text-slate-200">{exc.code}</strong> - {exc.name}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Round-robin assignment to trucks</p>
              </div>

              {/* Multi-select Operators - Filtered by Shift */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  <User size={16} className="inline mr-2 text-emerald-400" />
                  Select Operators *{' '}
                  <span className="text-xs text-slate-500">
                    ({formData.operatorIds.length} selected, {filteredOperators.length} available for {formData.shift})
                  </span>
                </label>
                <div className="border border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-800/60">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                    <button type="button" onClick={() => setFormData({ ...formData, operatorIds: filteredOperators.map((o) => o.id) })} className="text-xs text-emerald-400 hover:text-emerald-300">
                      Select All
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, operatorIds: [] })} className="text-xs text-slate-400 hover:text-slate-300">
                      Clear All
                    </button>
                  </div>
                  {filteredOperators.map((op) => (
                    <label key={op.id} className="flex items-center gap-2 p-2 hover:bg-emerald-500/10 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.operatorIds.includes(op.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, operatorIds: [...formData.operatorIds, op.id] });
                          } else {
                            setFormData({ ...formData, operatorIds: formData.operatorIds.filter((id) => id !== op.id) });
                          }
                        }}
                        className="rounded text-emerald-500 bg-slate-700 border-slate-600"
                      />
                      <span className="text-sm text-slate-300">
                        <strong className="text-slate-200">{op.employeeNumber}</strong> - {op.user?.fullName} <span className="text-xs text-slate-500">({op.shift})</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Round-robin assignment to trucks</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Loading Point *</label>
                <select
                  value={formData.loadingPointId}
                  onChange={(e) => setFormData({ ...formData, loadingPointId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Loading Point</option>
                  {loadingPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.code} - {point.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Dumping Point *</label>
                <select
                  value={formData.dumpingPointId}
                  onChange={(e) => setFormData({ ...formData, dumpingPointId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Dumping Point</option>
                  {dumpingPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.code} - {point.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Road Segment</label>
                <select
                  value={formData.roadSegmentId}
                  onChange={(e) => setFormData({ ...formData, roadSegmentId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                >
                  <option value="">Select Road Segment (Optional)</option>
                  {roadSegments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.code} - {segment.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Load Weight (ton)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.loadWeight}
                  onChange={(e) => setFormData({ ...formData, loadWeight: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="28.5"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Target Weight (ton)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="30.0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Distance (km)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.distance}
                  onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="2.5"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_QUEUE">In Queue</option>
                  <option value="LOADING">Loading</option>
                  <option value="HAULING">Hauling</option>
                  <option value="DUMPING">Dumping</option>
                  <option value="RETURNING">Returning</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Remarks (Applied to all activities)</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  rows="2"
                  placeholder="Optional notes or remarks..."
                />
              </div>
            </div>

            {/* Preview - Shows when equipment is selected */}
            {formData.truckIds.length > 0 && formData.excavatorIds.length > 0 && formData.operatorIds.length > 0 && (
              <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                <h4 className="font-semibold text-emerald-300 mb-2">
                  Preview: {formData.truckIds.length} hauling {formData.truckIds.length > 1 ? 'activities' : 'activity'} will be created
                </h4>
                <div className="text-sm text-emerald-400/80 max-h-32 overflow-y-auto">
                  {formData.truckIds.map((truckId, idx) => {
                    const truck = trucks.find((t) => t.id === truckId);
                    const excId = formData.excavatorIds[idx % formData.excavatorIds.length];
                    const opId = formData.operatorIds[idx % formData.operatorIds.length];
                    const exc = excavators.find((e) => e.id === excId);
                    const op = filteredOperators.find((o) => o.id === opId);
                    return (
                      <div key={idx} className="py-1 border-b border-emerald-500/20 last:border-0">
                        <span className="font-medium text-slate-200">{truck?.code}</span> → Excavator: {exc?.code || 'N/A'}, Operator: {op?.employeeNumber || 'N/A'}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={formData.truckIds.length === 0 || formData.excavatorIds.length === 0 || formData.operatorIds.length === 0}
                className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={18} />
                <span>{formData.truckIds.length > 0 ? `Create ${formData.truckIds.length} ${formData.truckIds.length > 1 ? 'Activities' : 'Activity'}` : 'Create Activity'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default HaulingList;
