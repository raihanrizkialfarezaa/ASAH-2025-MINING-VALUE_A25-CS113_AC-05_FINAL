import React, { useEffect, useState, useCallback } from 'react';
import { haulingService } from '../../services/haulingService';
import { truckService, excavatorService, operatorService } from '../../services';
import { loadingPointService, dumpingPointService, roadSegmentService, miningSiteService } from '../../services/locationService';
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
  Mountain,
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
  const [filteredTruckOperators, setFilteredTruckOperators] = useState([]);
  const [filteredExcavatorOperators, setFilteredExcavatorOperators] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState([]);
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [miningSites, setMiningSites] = useState([]);
  const [filteredLoadingPoints, setFilteredLoadingPoints] = useState([]);
  const [filteredDumpingPoints, setFilteredDumpingPoints] = useState([]);
  const [filteredRoadSegments, setFilteredRoadSegments] = useState([]);
  const [siteAutoFillInfo, setSiteAutoFillInfo] = useState(null);
  const [haulingList, setHaulingList] = useState([]);
  const [standbyTrucks, setStandbyTrucks] = useState([]);
  const [standbyExcavators, setStandbyExcavators] = useState([]);
  const [truckSearchQuery, setTruckSearchQuery] = useState('');
  const [excavatorSearchQuery, setExcavatorSearchQuery] = useState('');
  const [truckOperatorSearchQuery, setTruckOperatorSearchQuery] = useState('');
  const [excavatorOperatorSearchQuery, setExcavatorOperatorSearchQuery] = useState('');
  const [miningSiteSearchQuery, setMiningSiteSearchQuery] = useState('');
  const [dropdownPage, setDropdownPage] = useState({ site: 1, truck: 1, excavator: 1, truckOp: 1, excOp: 1 });
  const DROPDOWN_PAGE_SIZE = 20;
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
    miningSiteId: '',
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
      const [trucksRes, excavatorsRes, operatorsRes, loadingRes, dumpingRes, roadsRes, sitesRes] = await Promise.all([
        truckService.getAll({ limit: 1000 }),
        excavatorService.getAll({ limit: 1000 }),
        operatorService.getAll({ limit: 1000 }),
        loadingPointService.getAll({ limit: 1000 }),
        dumpingPointService.getAll({ limit: 1000 }),
        roadSegmentService.getAll({ limit: 1000 }),
        miningSiteService.getAll({ limit: 1000 }),
      ]);
      const trucksData = Array.isArray(trucksRes.data) ? trucksRes.data : [];
      const excavatorsData = Array.isArray(excavatorsRes.data) ? excavatorsRes.data : [];
      const operatorsData = Array.isArray(operatorsRes.data) ? operatorsRes.data : [];

      setTrucks(trucksData);
      setExcavators(excavatorsData);
      setOperators(operatorsData);
      setLoadingPoints(Array.isArray(loadingRes.data) ? loadingRes.data : []);
      setDumpingPoints(Array.isArray(dumpingRes.data) ? dumpingRes.data : []);
      setRoadSegments(Array.isArray(roadsRes.data) ? roadsRes.data : []);
      setMiningSites(Array.isArray(sitesRes.data) ? sitesRes.data : []);

      const standbyTrucksList = trucksData.filter((t) => t.status === 'STANDBY' && t.isActive !== false);
      const standbyExcavatorsList = excavatorsData.filter((e) => e.status === 'STANDBY' && e.isActive !== false);
      setStandbyTrucks(standbyTrucksList);
      setStandbyExcavators(standbyExcavatorsList);

      const truckOperators = operatorsData.filter((op) => op.status === 'ACTIVE' && (op.licenseType === 'SIM_B1' || op.licenseType === 'SIM_B2' || op.licenseType === 'SIM_A'));
      const excavatorOperators = operatorsData.filter((op) => op.status === 'ACTIVE' && op.licenseType === 'OPERATOR_ALAT_BERAT');

      setFilteredTruckOperators(truckOperators.length > 0 ? truckOperators : operatorsData.filter((op) => op.status === 'ACTIVE'));
      setFilteredExcavatorOperators(excavatorOperators.length > 0 ? excavatorOperators : operatorsData.filter((op) => op.status === 'ACTIVE'));
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  // Handle Mining Site selection - Auto-fill road segments, loading points, dumping points
  const handleMiningSiteChange = (siteId) => {
    const siteRoadSegments = roadSegments.filter((rs) => rs.miningSiteId === siteId && rs.isActive !== false);
    const siteLoadingPoints = loadingPoints.filter((lp) => lp.miningSiteId === siteId && lp.isActive !== false);
    const siteDumpingPoints = dumpingPoints.filter((dp) => dp.miningSiteId === siteId && dp.isActive !== false);

    setFilteredRoadSegments(siteRoadSegments);
    setFilteredLoadingPoints(siteLoadingPoints);
    setFilteredDumpingPoints(siteDumpingPoints);

    let autoFilledData = { miningSiteId: siteId };
    let autoFillDetails = {
      roadCount: siteRoadSegments.length,
      lpCount: siteLoadingPoints.length,
      dpCount: siteDumpingPoints.length,
    };

    // Auto-fill default values from first options
    if (siteRoadSegments.length > 0) {
      autoFilledData.roadSegmentId = siteRoadSegments[0].id;
      autoFilledData.distance = siteRoadSegments[0].distance || 0;
      autoFillDetails.defaultRoad = siteRoadSegments[0].name;
    }
    if (siteLoadingPoints.length > 0) {
      autoFilledData.loadingPointId = siteLoadingPoints[0].id;
      autoFillDetails.defaultLP = siteLoadingPoints[0].name;
    }
    if (siteDumpingPoints.length > 0) {
      autoFilledData.dumpingPointId = siteDumpingPoints[0].id;
      autoFillDetails.defaultDP = siteDumpingPoints[0].name;
    }

    setSiteAutoFillInfo(autoFillDetails);
    setFormData((prev) => ({ ...prev, ...autoFilledData }));

    // Also update existing hauling list items with new defaults
    if (haulingList.length > 0) {
      const defaultRoad = siteRoadSegments[0];
      const defaultLP = siteLoadingPoints[0];
      const defaultDP = siteDumpingPoints[0];

      setHaulingList((prev) =>
        prev.map((h) => ({
          ...h,
          roadSegmentId: defaultRoad?.id || '',
          roadSegmentName: defaultRoad?.name || 'N/A',
          distance: defaultRoad?.distance || h.distance,
          loadingPointId: defaultLP?.id || h.loadingPointId,
          loadingPointName: defaultLP?.name || h.loadingPointName,
          dumpingPointId: defaultDP?.id || h.dumpingPointId,
          dumpingPointName: defaultDP?.name || h.dumpingPointName,
        }))
      );
    }
  };

  const applyMiningSiteFiltersOnly = (siteId) => {
    const siteRoadSegments = roadSegments.filter((rs) => rs.miningSiteId === siteId && rs.isActive !== false);
    const siteLoadingPoints = loadingPoints.filter((lp) => lp.miningSiteId === siteId && lp.isActive !== false);
    const siteDumpingPoints = dumpingPoints.filter((dp) => dp.miningSiteId === siteId && dp.isActive !== false);

    setFilteredRoadSegments(siteRoadSegments);
    setFilteredLoadingPoints(siteLoadingPoints);
    setFilteredDumpingPoints(siteDumpingPoints);

    setSiteAutoFillInfo({
      roadCount: siteRoadSegments.length,
      lpCount: siteLoadingPoints.length,
      dpCount: siteDumpingPoints.length,
    });
  };

  const mergeWithSelected = (baseList, allList, selectedId) => {
    const base = Array.isArray(baseList) ? baseList : [];
    const all = Array.isArray(allList) ? allList : [];
    if (!selectedId) return base;
    if (base.some((x) => x.id === selectedId)) return base;
    const selected = all.find((x) => x.id === selectedId);
    if (!selected) return base;
    return [...base, selected];
  };

  const filterOperatorsByShift = (selectedShift) => {
    const truckOps = operators.filter((op) => {
      if (op.status !== 'ACTIVE') return false;
      if (op.licenseType !== 'SIM_B1' && op.licenseType !== 'SIM_B2' && op.licenseType !== 'SIM_A') return false;
      if (selectedShift && op.shift && op.shift !== selectedShift) return false;
      return true;
    });
    const excavatorOps = operators.filter((op) => {
      if (op.status !== 'ACTIVE') return false;
      if (op.licenseType !== 'OPERATOR_ALAT_BERAT') return false;
      if (selectedShift && op.shift && op.shift !== selectedShift) return false;
      return true;
    });
    setFilteredTruckOperators(truckOps.length > 0 ? truckOps : operators.filter((op) => op.status === 'ACTIVE' && (!selectedShift || !op.shift || op.shift === selectedShift)));
    setFilteredExcavatorOperators(excavatorOps.length > 0 ? excavatorOps : operators.filter((op) => op.status === 'ACTIVE' && op.licenseType === 'OPERATOR_ALAT_BERAT'));
  };

  const handleShiftChange = (newShift) => {
    setFormData((prev) => ({ ...prev, shift: newShift }));
    filterOperatorsByShift(newShift);
    setTruckOperatorSearchQuery('');
    setExcavatorOperatorSearchQuery('');
    setDropdownPage((prev) => ({ ...prev, truckOp: 1, excOp: 1 }));
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

  // === NEW: Individual Hauling Item Management (like ProductionList) ===
  const handleAddHauling = () => {
    if (!formData.miningSiteId) {
      alert('Pilih Mining Site terlebih dahulu untuk menambah hauling');
      return;
    }

    const activeLoadingPoints = filteredLoadingPoints.length > 0 ? filteredLoadingPoints : loadingPoints.filter((lp) => lp.isActive !== false);
    const activeDumpingPoints = filteredDumpingPoints.length > 0 ? filteredDumpingPoints : dumpingPoints.filter((dp) => dp.isActive !== false);
    const activeRoadSegments = filteredRoadSegments.length > 0 ? filteredRoadSegments : roadSegments.filter((rs) => rs.isActive !== false);

    if (activeLoadingPoints.length === 0) {
      alert('Tidak ada loading point aktif untuk site ini.');
      return;
    }
    if (activeDumpingPoints.length === 0) {
      alert('Tidak ada dumping point aktif untuk site ini.');
      return;
    }

    const assignedActiveTruckIdsLocal = new Set(
      allActivities
        .filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status))
        .map((a) => a.truckId)
        .filter(Boolean)
    );

    const availableTrucks = standbyTrucks.filter((t) => !assignedActiveTruckIdsLocal.has(t.id));
    const availableExcavators = standbyExcavators;

    const usedTruckIds = haulingList.map((h) => h.truckId).filter(Boolean);
    const usedExcavatorIds = haulingList.map((h) => h.excavatorId).filter(Boolean);

    const nextTruck = availableTrucks.find((t) => !usedTruckIds.includes(t.id)) || availableTrucks[haulingList.length % Math.max(availableTrucks.length, 1)];
    const nextExcavator = availableExcavators.find((e) => !usedExcavatorIds.includes(e.id)) || availableExcavators[haulingList.length % Math.max(availableExcavators.length, 1)];

    const currentShift = formData.shift || 'SHIFT_1';
    const shiftTruckOperators = filteredTruckOperators.filter((op) => !op.shift || op.shift === currentShift);
    const shiftExcavatorOperators = filteredExcavatorOperators.filter((op) => !op.shift || op.shift === currentShift);

    const activeTruckOperators = shiftTruckOperators.length > 0 ? shiftTruckOperators : filteredTruckOperators;
    const activeExcavatorOperators = shiftExcavatorOperators.length > 0 ? shiftExcavatorOperators : filteredExcavatorOperators;

    const activeHaulingLocal = allActivities.filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
    const assignedActiveOperatorIdsLocal = new Set(activeHaulingLocal.map((a) => a.operatorId).filter(Boolean));
    const assignedActiveExcavatorOperatorIdsLocal = new Set(activeHaulingLocal.map((a) => a.excavatorOperatorId).filter(Boolean));

    const usedTruckOperatorIds = haulingList.map((h) => h.truckOperatorId).filter(Boolean);
    const usedExcavatorOperatorIds = haulingList
      .filter((h) => Boolean(h.excavatorId))
      .map((h) => h.excavatorOperatorId)
      .filter(Boolean);

    const availableTruckOperators = activeTruckOperators.filter((op) => !assignedActiveOperatorIdsLocal.has(op.id) && !usedTruckOperatorIds.includes(op.id));
    const fallbackTruckOperators = activeTruckOperators.filter((op) => !usedTruckOperatorIds.includes(op.id));
    const defaultTruckOperator = availableTruckOperators[0] || fallbackTruckOperators[0] || activeTruckOperators[0];

    const availableExcavatorOperators = activeExcavatorOperators.filter((op) => !assignedActiveExcavatorOperatorIdsLocal.has(op.id) && !usedExcavatorOperatorIds.includes(op.id));
    const fallbackExcavatorOperator = activeExcavatorOperators.find((op) => !usedExcavatorOperatorIds.includes(op.id));
    const defaultExcavatorOperator = availableExcavatorOperators[0] || fallbackExcavatorOperator;

    const defaultLoadingPoint = activeLoadingPoints[haulingList.length % activeLoadingPoints.length];
    const defaultDumpingPoint = activeDumpingPoints[haulingList.length % activeDumpingPoints.length];
    const defaultRoadSegment = activeRoadSegments[haulingList.length % Math.max(activeRoadSegments.length, 1)];

    const numHaulings = haulingList.length + 1;
    const targetWeight = formData.targetWeight ? parseFloat(formData.targetWeight) / numHaulings : 30;

    const newHauling = {
      tempId: Date.now(),
      isExisting: false,
      truckId: nextTruck?.id || '',
      excavatorId: nextExcavator?.id || '',
      truckOperatorId: defaultTruckOperator?.id || '',
      excavatorOperatorId: nextExcavator?.id ? defaultExcavatorOperator?.id || '' : '',
      loadingPointId: defaultLoadingPoint?.id || '',
      dumpingPointId: defaultDumpingPoint?.id || '',
      roadSegmentId: defaultRoadSegment?.id || '',
      // Display values
      truckCode: nextTruck?.code || 'N/A',
      truckCapacity: nextTruck?.capacity || 0,
      excavatorCode: nextExcavator?.code || '-',
      excavatorModel: nextExcavator?.model || '',
      truckOperatorName: defaultTruckOperator?.user?.fullName || defaultTruckOperator?.employeeNumber || 'N/A',
      excavatorOperatorName: nextExcavator?.id ? defaultExcavatorOperator?.user?.fullName || defaultExcavatorOperator?.employeeNumber || '-' : '-',
      loadingPointName: defaultLoadingPoint?.name || 'N/A',
      dumpingPointName: defaultDumpingPoint?.name || 'N/A',
      roadSegmentName: defaultRoadSegment?.name || 'N/A',
      // Values
      loadWeight: '',
      targetWeight: targetWeight,
      status: 'LOADING',
      distance: defaultRoadSegment?.distance || parseFloat(formData.distance) || 3,
    };

    console.log('[HaulingList] Adding hauling item:', newHauling);

    setHaulingList((prev) => {
      const updated = [...prev, newHauling];
      // Redistribute target weight evenly
      const newTargetPerHauling = formData.targetWeight ? parseFloat(formData.targetWeight) / updated.length : 30;
      return updated.map((h) => ({ ...h, targetWeight: newTargetPerHauling }));
    });
  };

  const handleRemoveHauling = (tempId) => {
    setHaulingList((prev) => {
      const existing = prev.find((h) => h.tempId === tempId);
      if (existing?.isExisting) return prev;
      const filtered = prev.filter((h) => h.tempId !== tempId);
      if (filtered.length > 0 && formData.targetWeight) {
        const newTargetPerHauling = parseFloat(formData.targetWeight) / filtered.length;
        return filtered.map((h) => ({ ...h, targetWeight: newTargetPerHauling }));
      }
      return filtered;
    });
  };

  const handleUpdateHauling = (tempId, field, value) => {
    setHaulingList((prev) =>
      prev.map((h) => {
        if (h.tempId !== tempId) return h;

        const updated = { ...h, [field]: value };

        // Update display names when IDs change
        if (field === 'truckId') {
          const selectedTruck = trucks.find((t) => t.id === value);
          updated.truckCode = selectedTruck?.code || 'N/A';
          updated.truckCapacity = selectedTruck?.capacity || 0;
        } else if (field === 'excavatorId') {
          const selectedExcavator = excavators.find((e) => e.id === value);
          updated.excavatorCode = selectedExcavator?.code || '-';
          updated.excavatorModel = selectedExcavator?.model || '';
          if (!value) {
            updated.excavatorOperatorId = '';
            updated.excavatorOperatorName = '-';
          }
        } else if (field === 'truckOperatorId') {
          const selectedOp = operators.find((o) => o.id === value);
          updated.truckOperatorName = selectedOp?.user?.fullName || selectedOp?.employeeNumber || 'N/A';
        } else if (field === 'excavatorOperatorId') {
          const selectedOp = operators.find((o) => o.id === value);
          updated.excavatorOperatorName = selectedOp?.user?.fullName || selectedOp?.employeeNumber || '-';
        } else if (field === 'loadingPointId') {
          const selectedLP = loadingPoints.find((lp) => lp.id === value);
          updated.loadingPointName = selectedLP?.name || 'N/A';
        } else if (field === 'dumpingPointId') {
          const selectedDP = dumpingPoints.find((dp) => dp.id === value);
          updated.dumpingPointName = selectedDP?.name || 'N/A';
        } else if (field === 'roadSegmentId') {
          const selectedRS = roadSegments.find((rs) => rs.id === value);
          updated.roadSegmentName = selectedRS?.name || 'N/A';
          updated.distance = selectedRS?.distance || updated.distance;
        }

        return updated;
      })
    );
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
      activityNumber: '',
      miningSiteId: '',
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
      loadingStartTime: defaultTime.toISOString().slice(0, 16),
      loadWeight: '',
      targetWeight: '',
      distance: '',
      status: 'LOADING',
      remarks: '',
    });
    // Reset hauling list and site filters
    setHaulingList([]);
    setFilteredLoadingPoints([]);
    setFilteredDumpingPoints([]);
    setFilteredRoadSegments([]);
    setSiteAutoFillInfo(null);
    setMiningSiteSearchQuery('');
    setTruckSearchQuery('');
    setExcavatorSearchQuery('');
    setTruckOperatorSearchQuery('');
    setExcavatorOperatorSearchQuery('');
    setDropdownPage({ site: 1, truck: 1, excavator: 1, truckOp: 1, excOp: 1 });
    setShowModal(true);
  };

  const handleEdit = async (activity) => {
    setModalMode('edit');
    setSelectedActivity(activity);

    const ensure = async (id, list, service, setter) => {
      if (!id) return null;
      const existing = Array.isArray(list) ? list.find((x) => x.id === id) : null;
      if (existing) return existing;
      try {
        const res = await service.getById(id);
        const data = res?.data || null;
        if (data) {
          setter((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            if (arr.some((x) => x.id === id)) return arr;
            return [...arr, data];
          });
        }
        return data;
      } catch {
        return null;
      }
    };

    const [selectedTruck, selectedExcavator, selectedOperator, selectedExcavatorOperator, selectedLoadingPoint, selectedDumpingPoint, selectedRoadSegment] = await Promise.all([
      ensure(activity.truckId, trucks, truckService, setTrucks),
      ensure(activity.excavatorId, excavators, excavatorService, setExcavators),
      ensure(activity.operatorId, operators, operatorService, setOperators),
      ensure(activity.excavatorOperatorId, operators, operatorService, setOperators),
      ensure(activity.loadingPointId, loadingPoints, loadingPointService, setLoadingPoints),
      ensure(activity.dumpingPointId, dumpingPoints, dumpingPointService, setDumpingPoints),
      ensure(activity.roadSegmentId, roadSegments, roadSegmentService, setRoadSegments),
    ]);

    const resolvedLoadingPoint = selectedLoadingPoint || activity.loadingPoint;
    const resolvedDumpingPoint = selectedDumpingPoint || activity.dumpingPoint;
    const resolvedRoadSegment = selectedRoadSegment || activity.roadSegment;

    const inferredSiteId =
      resolvedLoadingPoint?.miningSiteId ||
      resolvedDumpingPoint?.miningSiteId ||
      resolvedRoadSegment?.miningSiteId ||
      activity.loadingPoint?.miningSiteId ||
      activity.dumpingPoint?.miningSiteId ||
      activity.roadSegment?.miningSiteId ||
      loadingPoints.find((lp) => lp.id === activity.loadingPointId)?.miningSiteId ||
      dumpingPoints.find((dp) => dp.id === activity.dumpingPointId)?.miningSiteId ||
      roadSegments.find((rs) => rs.id === activity.roadSegmentId)?.miningSiteId ||
      '';

    if (inferredSiteId) {
      await ensure(inferredSiteId, miningSites, miningSiteService, setMiningSites);
    }

    if (inferredSiteId) {
      applyMiningSiteFiltersOnly(inferredSiteId);
    } else {
      setFilteredRoadSegments([]);
      setFilteredLoadingPoints([]);
      setFilteredDumpingPoints([]);
      setSiteAutoFillInfo(null);
    }

    setMiningSiteSearchQuery('');
    setTruckSearchQuery('');
    setExcavatorSearchQuery('');
    setTruckOperatorSearchQuery('');
    setExcavatorOperatorSearchQuery('');
    setDropdownPage({ site: 1, truck: 1, excavator: 1, truckOp: 1, excOp: 1 });

    setFormData({
      activityNumber: activity.activityNumber || '',
      miningSiteId: inferredSiteId || '',
      truckId: activity.truckId || '',
      truckIds: [],
      excavatorId: activity.excavatorId || '',
      excavatorIds: [],
      operatorId: activity.operatorId || '',
      operatorIds: [],
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

    const resolvedTruck = selectedTruck || activity.truck;
    const resolvedExcavator = selectedExcavator || activity.excavator;
    const resolvedTruckOperator = selectedOperator || activity.operator;
    const resolvedExcavatorOperator = selectedExcavatorOperator || activity.excavatorOperator;

    const resolvedShift = activity.shift || 'SHIFT_1';
    let inferredExcavatorOperatorId = activity.excavatorOperatorId || resolvedExcavatorOperator?.id || '';
    if (!inferredExcavatorOperatorId && (activity.excavatorId || resolvedExcavator?.id)) {
      const candidates = (operators || []).filter((op) => {
        if (!op) return false;
        if (op.status !== 'ACTIVE') return false;
        if (op.licenseType !== 'OPERATOR_ALAT_BERAT') return false;
        if (op.shift && op.shift !== resolvedShift) return false;
        return true;
      });
      if (candidates.length === 1) {
        inferredExcavatorOperatorId = candidates[0].id;
      }
    }
    const inferredExcavatorOperator = inferredExcavatorOperatorId && inferredExcavatorOperatorId !== resolvedExcavatorOperator?.id ? operators.find((op) => op.id === inferredExcavatorOperatorId) || null : resolvedExcavatorOperator;

    if (resolvedTruck && resolvedTruck.id) {
      setStandbyTrucks((prev) => {
        if (prev.some((t) => t.id === resolvedTruck.id)) return prev;
        return [...prev, resolvedTruck];
      });
    }
    if (resolvedExcavator && resolvedExcavator.id) {
      setStandbyExcavators((prev) => {
        if (prev.some((e) => e.id === resolvedExcavator.id)) return prev;
        return [...prev, resolvedExcavator];
      });
    }

    setHaulingList([
      {
        tempId: Date.now(),
        isExisting: true,
        truckId: activity.truckId || '',
        excavatorId: activity.excavatorId || '',
        truckOperatorId: activity.operatorId || '',
        excavatorOperatorId: inferredExcavatorOperatorId || '',
        loadingPointId: activity.loadingPointId || '',
        dumpingPointId: activity.dumpingPointId || '',
        roadSegmentId: activity.roadSegmentId || '',
        truckCode: resolvedTruck?.code || 'N/A',
        truckCapacity: resolvedTruck?.capacity || 0,
        excavatorCode: resolvedExcavator?.code || '-',
        excavatorModel: resolvedExcavator?.model || '',
        truckOperatorName: resolvedTruckOperator?.user?.fullName || resolvedTruckOperator?.employeeNumber || 'N/A',
        excavatorOperatorName: inferredExcavatorOperator?.user?.fullName || inferredExcavatorOperator?.employeeNumber || '-',
        loadingPointName: resolvedLoadingPoint?.name || 'N/A',
        dumpingPointName: resolvedDumpingPoint?.name || 'N/A',
        roadSegmentName: resolvedRoadSegment?.name || 'N/A',
        loadWeight: activity.loadWeight ?? '',
        targetWeight: activity.targetWeight ?? 30,
        status: activity.status || 'LOADING',
        distance: resolvedRoadSegment?.distance ?? activity.distance ?? 0,
      },
    ]);
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
      if (modalMode === 'edit' && haulingList.length > 0) {
        if (!selectedActivity?.id) {
          window.alert('No activity selected to update');
          return;
        }

        const normalized = haulingList.map((h) =>
          h.excavatorId
            ? h
            : {
                ...h,
                excavatorOperatorId: '',
                excavatorOperatorName: '-',
              }
        );
        setHaulingList(normalized);

        const existingItem = normalized.find((h) => h.isExisting) || normalized[0];
        const newItems = normalized.filter((h) => h.tempId !== existingItem.tempId);

        const hauling = existingItem;
        if (!hauling.truckId) {
          window.alert('Wajib pilih truck');
          return;
        }
        if (!hauling.truckOperatorId) {
          window.alert('Wajib pilih truck operator');
          return;
        }
        if (!hauling.loadingPointId) {
          window.alert('Wajib pilih loading point');
          return;
        }
        if (!hauling.dumpingPointId) {
          window.alert('Wajib pilih dumping point');
          return;
        }
        if (hauling.excavatorId && !hauling.excavatorOperatorId) {
          window.alert('Wajib pilih excavator operator');
          return;
        }

        const assignedActiveTruckIdsForEdit = new Set(
          allActivities
            .filter((a) => a.id !== selectedActivity.id)
            .filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status))
            .map((a) => a.truckId)
            .filter(Boolean)
        );
        if (assignedActiveTruckIdsForEdit.has(hauling.truckId)) {
          const existing = allActivities.find((a) => a.id !== selectedActivity.id && a.truckId === hauling.truckId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
          window.alert(`Truck is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
          return;
        }

        const assignedActiveOperatorIdsForEdit = new Set(
          allActivities
            .filter((a) => a.id !== selectedActivity.id)
            .filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status))
            .map((a) => a.operatorId)
            .filter(Boolean)
        );
        if (assignedActiveOperatorIdsForEdit.has(hauling.truckOperatorId)) {
          const existing = allActivities.find((a) => a.id !== selectedActivity.id && a.operatorId === hauling.truckOperatorId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
          window.alert(`Operator is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
          return;
        }

        const payload = {
          activityNumber: selectedActivity.activityNumber || formData.activityNumber?.trim() || generateAutoActivityNumber(),
          truckId: hauling.truckId,
          excavatorId: hauling.excavatorId || null,
          excavatorOperatorId: hauling.excavatorId ? hauling.excavatorOperatorId || null : null,
          operatorId: hauling.truckOperatorId,
          loadingPointId: hauling.loadingPointId,
          dumpingPointId: hauling.dumpingPointId,
          shift: formData.shift,
          loadingStartTime: new Date(formData.loadingStartTime).toISOString(),
          loadWeight: hauling.loadWeight === '' ? 0 : parseFloat(hauling.loadWeight),
          targetWeight: hauling.targetWeight === '' || hauling.targetWeight === undefined || hauling.targetWeight === null ? 30 : Number.isFinite(parseFloat(hauling.targetWeight)) ? parseFloat(hauling.targetWeight) : 30,
          distance: hauling.distance === '' || hauling.distance === undefined || hauling.distance === null ? 0 : Number.isFinite(parseFloat(hauling.distance)) ? parseFloat(hauling.distance) : 0,
        };

        if (hauling.roadSegmentId) payload.roadSegmentId = hauling.roadSegmentId;
        if (formData.remarks) payload.remarks = formData.remarks.trim();
        if (selectedActivity.status) payload.status = selectedActivity.status;

        await haulingService.update(selectedActivity.id, payload);

        if (newItems.length > 0) {
          const assignedActiveTruckIds = new Set(
            allActivities
              .filter((a) => a.id !== selectedActivity.id)
              .filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status))
              .map((a) => a.truckId)
              .filter(Boolean)
          );
          const activeHaulingForEdit = allActivities.filter((a) => a.id !== selectedActivity.id).filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
          const assignedActiveOperatorIds = new Set(activeHaulingForEdit.map((a) => a.operatorId).filter(Boolean));
          const assignedActiveExcavatorOperatorIds = new Set(activeHaulingForEdit.map((a) => a.excavatorOperatorId).filter(Boolean));
          const batchTruckIds = new Set([existingItem.truckId].filter(Boolean));
          const batchOperatorIds = new Set([existingItem.truckOperatorId].filter(Boolean));
          const batchExcavatorOperatorIds = new Set([existingItem.excavatorOperatorId].filter(Boolean));

          const primaryExcavatorId = normalized.find((h) => Boolean(h.excavatorId))?.excavatorId;

          const baseCode = generateAutoActivityNumber();
          const prefix = baseCode.split('-').slice(0, 2).join('-');
          const existingCodes = new Set(allActivities.map((a) => a.activityNumber));
          if (selectedActivity.activityNumber) existingCodes.add(selectedActivity.activityNumber);

          const errors = [];

          for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];

            if (!item.truckId) {
              errors.push(`Hauling ${i + 1}: Truck is required`);
              continue;
            }
            if (assignedActiveTruckIds.has(item.truckId)) {
              const existing = allActivities.find((a) => a.truckId === item.truckId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
              errors.push(`Hauling ${i + 1}: Truck is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
              continue;
            }
            if (batchTruckIds.has(item.truckId)) {
              errors.push(`Hauling ${i + 1}: Truck is duplicated in this batch`);
              continue;
            }
            batchTruckIds.add(item.truckId);
            if (!item.truckOperatorId) {
              errors.push(`Hauling ${i + 1}: Truck Operator is required`);
              continue;
            }
            if (assignedActiveOperatorIds.has(item.truckOperatorId)) {
              const existing = allActivities.find((a) => a.operatorId === item.truckOperatorId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
              errors.push(`Hauling ${i + 1}: Operator is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
              continue;
            }
            if (batchOperatorIds.has(item.truckOperatorId)) {
              errors.push(`Hauling ${i + 1}: Operator is duplicated in this batch`);
              continue;
            }
            batchOperatorIds.add(item.truckOperatorId);
            if (!item.loadingPointId) {
              errors.push(`Hauling ${i + 1}: Loading Point is required`);
              continue;
            }
            if (!item.dumpingPointId) {
              errors.push(`Hauling ${i + 1}: Dumping Point is required`);
              continue;
            }
            const effectiveExcavatorIdInEdit = item.excavatorId || primaryExcavatorId || null;
            if (effectiveExcavatorIdInEdit && item.excavatorOperatorId) {
              if (assignedActiveExcavatorOperatorIds.has(item.excavatorOperatorId)) {
                const existing = allActivities.find((a) => a.excavatorOperatorId === item.excavatorOperatorId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
                errors.push(`Hauling ${i + 1}: Excavator operator is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
                continue;
              }
              if (batchExcavatorOperatorIds.has(item.excavatorOperatorId)) {
                errors.push(`Hauling ${i + 1}: Excavator operator is duplicated in this batch`);
                continue;
              }
              batchExcavatorOperatorIds.add(item.excavatorOperatorId);
            }

            let actNum = i + 1;
            let activityNumber = `${prefix}-${String(actNum).padStart(3, '0')}`;
            while (existingCodes.has(activityNumber)) {
              actNum++;
              activityNumber = `${prefix}-${String(actNum).padStart(3, '0')}`;
            }
            existingCodes.add(activityNumber);

            const createPayload = {
              activityNumber,
              truckId: item.truckId,
              excavatorId: item.excavatorId || primaryExcavatorId || null,
              excavatorOperatorId: item.excavatorId || primaryExcavatorId ? item.excavatorOperatorId || null : null,
              operatorId: item.truckOperatorId,
              loadingPointId: item.loadingPointId,
              dumpingPointId: item.dumpingPointId,
              shift: formData.shift,
              loadingStartTime: new Date(formData.loadingStartTime).toISOString(),
              loadWeight: item.loadWeight === '' ? 0 : parseFloat(item.loadWeight),
              targetWeight: item.targetWeight === '' || item.targetWeight === undefined || item.targetWeight === null ? 30 : Number.isFinite(parseFloat(item.targetWeight)) ? parseFloat(item.targetWeight) : 30,
              distance:
                item.distance === '' || item.distance === undefined || item.distance === null
                  ? Number.isFinite(parseFloat(formData.distance))
                    ? parseFloat(formData.distance)
                    : 0
                  : Number.isFinite(parseFloat(item.distance))
                  ? parseFloat(item.distance)
                  : 0,
              status: item.status || 'LOADING',
            };

            if (item.roadSegmentId) createPayload.roadSegmentId = item.roadSegmentId;
            if (formData.remarks) createPayload.remarks = formData.remarks.trim();

            try {
              await haulingService.create(createPayload);
            } catch (err) {
              console.error(`Failed to create hauling ${i + 1} in edit:`, err);
              errors.push(`Hauling ${i + 1}: ${err.response?.data?.message || err.message}`);
            }
          }

          if (errors.length > 0) {
            window.alert(`Validation/Creation errors:\n${errors.join('\n')}`);
          }
        }

        setShowModal(false);
        await fetchActivities();
        await loadResources();
        return;
      }

      // === NEW: Create using haulingList (like ProductionList) ===
      if (modalMode === 'create' && haulingList.length > 0) {
        const normalizedHaulingList = haulingList.map((h) =>
          h.excavatorId
            ? h
            : {
                ...h,
                excavatorOperatorId: '',
                excavatorOperatorName: '-',
              }
        );

        setHaulingList(normalizedHaulingList);

        if (!normalizedHaulingList.some((h) => Boolean(h.truckId))) {
          window.alert('Wajib pilih minimal 1 truck');
          return;
        }

        const primaryExcavatorId = normalizedHaulingList.find((h) => Boolean(h.excavatorId))?.excavatorId;

        const activeHaulingForValidation = allActivities.filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
        const assignedActiveTruckIds = new Set(activeHaulingForValidation.map((a) => a.truckId).filter(Boolean));
        const assignedActiveOperatorIds = new Set(activeHaulingForValidation.map((a) => a.operatorId).filter(Boolean));
        const assignedActiveExcavatorOperatorIds = new Set(activeHaulingForValidation.map((a) => a.excavatorOperatorId).filter(Boolean));
        const batchTruckIds = new Set();
        const batchOperatorIds = new Set();
        const batchExcavatorOperatorIds = new Set();

        const baseCode = generateAutoActivityNumber();
        const prefix = baseCode.split('-').slice(0, 2).join('-');
        const existingCodes = new Set(allActivities.map((a) => a.activityNumber));

        let createdCount = 0;
        let failedCount = 0;
        const errors = [];

        for (let i = 0; i < normalizedHaulingList.length; i++) {
          const hauling = normalizedHaulingList[i];

          if (!hauling.truckId) {
            errors.push(`Hauling ${i + 1}: Truck is required`);
            continue;
          }
          if (assignedActiveTruckIds.has(hauling.truckId)) {
            const existing = allActivities.find((a) => a.truckId === hauling.truckId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
            errors.push(`Hauling ${i + 1}: Truck is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
            continue;
          }
          if (batchTruckIds.has(hauling.truckId)) {
            errors.push(`Hauling ${i + 1}: Truck is duplicated in this batch`);
            continue;
          }
          batchTruckIds.add(hauling.truckId);
          if (!hauling.truckOperatorId) {
            errors.push(`Hauling ${i + 1}: Truck Operator is required`);
            continue;
          }
          if (assignedActiveOperatorIds.has(hauling.truckOperatorId)) {
            const existing = allActivities.find((a) => a.operatorId === hauling.truckOperatorId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
            errors.push(`Hauling ${i + 1}: Operator is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
            continue;
          }
          if (batchOperatorIds.has(hauling.truckOperatorId)) {
            errors.push(`Hauling ${i + 1}: Operator is duplicated in this batch`);
            continue;
          }
          batchOperatorIds.add(hauling.truckOperatorId);
          if (!hauling.loadingPointId) {
            errors.push(`Hauling ${i + 1}: Loading Point is required`);
            continue;
          }
          if (!hauling.dumpingPointId) {
            errors.push(`Hauling ${i + 1}: Dumping Point is required`);
            continue;
          }
          const effectiveExcavatorId = hauling.excavatorId || primaryExcavatorId || null;
          if (effectiveExcavatorId && !hauling.excavatorOperatorId) {
            errors.push(`Hauling ${i + 1}: Excavator Operator is required`);
            continue;
          }
          if (effectiveExcavatorId && hauling.excavatorOperatorId) {
            if (assignedActiveExcavatorOperatorIds.has(hauling.excavatorOperatorId)) {
              const existing = allActivities.find((a) => a.excavatorOperatorId === hauling.excavatorOperatorId && ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status));
              errors.push(`Hauling ${i + 1}: Excavator operator is already assigned${existing?.activityNumber ? ` (${existing.activityNumber})` : ''}`);
              continue;
            }
            if (batchExcavatorOperatorIds.has(hauling.excavatorOperatorId)) {
              errors.push(`Hauling ${i + 1}: Excavator operator is duplicated in this batch`);
              continue;
            }
            batchExcavatorOperatorIds.add(hauling.excavatorOperatorId);
          }

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
            truckId: hauling.truckId,
            excavatorId: effectiveExcavatorId,
            excavatorOperatorId: effectiveExcavatorId ? hauling.excavatorOperatorId || null : null,
            operatorId: hauling.truckOperatorId, // Main operator is truck operator
            loadingPointId: hauling.loadingPointId,
            dumpingPointId: hauling.dumpingPointId,
            shift: formData.shift,
            loadingStartTime: new Date(formData.loadingStartTime).toISOString(),
            loadWeight: hauling.loadWeight === '' ? 0 : parseFloat(hauling.loadWeight),
            targetWeight: hauling.targetWeight === '' || hauling.targetWeight === undefined || hauling.targetWeight === null ? 30 : Number.isFinite(parseFloat(hauling.targetWeight)) ? parseFloat(hauling.targetWeight) : 30,
            distance:
              hauling.distance === '' || hauling.distance === undefined || hauling.distance === null
                ? Number.isFinite(parseFloat(formData.distance))
                  ? parseFloat(formData.distance)
                  : 0
                : Number.isFinite(parseFloat(hauling.distance))
                ? parseFloat(hauling.distance)
                : 0,
            status: hauling.status || 'LOADING',
          };

          if (hauling.roadSegmentId) payload.roadSegmentId = hauling.roadSegmentId;
          if (formData.remarks) payload.remarks = formData.remarks.trim();

          try {
            await haulingService.create(payload);
            createdCount++;
          } catch (err) {
            console.error(`Failed to create hauling ${i + 1}:`, err);
            errors.push(`Hauling ${i + 1}: ${err.response?.data?.message || err.message}`);
            failedCount++;
          }
        }

        if (errors.length > 0) {
          window.alert(`Validation/Creation errors:\n${errors.join('\n')}`);
        }

        if (createdCount > 0) {
          window.alert(`Creation complete: ${createdCount} hauling ${createdCount > 1 ? 'activities' : 'activity'} created${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
        }

        setShowModal(false);
        await fetchActivities();
        await loadResources();
        return;
      }

      // === LEGACY: Multi-select checkbox mode (keep for backward compatibility) ===
      const hasMultiTrucks = formData.truckIds.length > 0;
      const hasMultiExcavators = formData.excavatorIds.length > 0;
      const hasMultiOperators = formData.operatorIds.length > 0;
      const isMultiMode = hasMultiTrucks || hasMultiExcavators || hasMultiOperators;

      if (modalMode === 'create' && isMultiMode) {
        const truckIds = hasMultiTrucks ? formData.truckIds : formData.truckId ? [formData.truckId] : [];
        const excavatorIds = hasMultiExcavators ? formData.excavatorIds : formData.excavatorId ? [formData.excavatorId] : [];
        const operatorIds = hasMultiOperators ? formData.operatorIds : formData.operatorId ? [formData.operatorId] : [];

        if (truckIds.length === 0) {
          window.alert('Please select at least one truck');
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
          const excavatorId = excavatorIds.length > 0 ? excavatorIds[i % excavatorIds.length] || excavatorIds[0] : null;
          const operatorId = operatorIds[i % operatorIds.length] || operatorIds[0];

          if (excavatorId) {
            window.alert('Mode multi-select lama belum mendukung excavator operator. Gunakan mode Hauling Items.');
            return;
          }

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
            excavatorId: excavatorId || null,
            excavatorOperatorId: null,
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
        await fetchActivities();
        await loadResources();
        return;
      }

      // Single creation/edit mode (when no arrays are used OR edit mode)
      const payload = {
        activityNumber: formData.activityNumber.trim() || generateAutoActivityNumber(),
        truckId: formData.truckId,
        excavatorId: formData.excavatorId || null,
        excavatorOperatorId: null,
        operatorId: formData.operatorId,
        loadingPointId: formData.loadingPointId,
        dumpingPointId: formData.dumpingPointId,
        shift: formData.shift,
        loadingStartTime: new Date(formData.loadingStartTime).toISOString(),
        loadWeight: formData.loadWeight === '' ? 0 : parseFloat(formData.loadWeight),
        targetWeight: formData.targetWeight === '' || formData.targetWeight === undefined || formData.targetWeight === null ? 30 : Number.isFinite(parseFloat(formData.targetWeight)) ? parseFloat(formData.targetWeight) : 30,
        distance: formData.distance === '' || formData.distance === undefined || formData.distance === null ? 0 : Number.isFinite(parseFloat(formData.distance)) ? parseFloat(formData.distance) : 0,
      };

      if (payload.excavatorId) {
        window.alert('Mode single lama belum mendukung excavator operator. Gunakan mode Hauling Items.');
        return;
      }

      if (formData.roadSegmentId) payload.roadSegmentId = formData.roadSegmentId;
      if (formData.remarks) payload.remarks = formData.remarks.trim();
      if (formData.status) payload.status = formData.status;

      if (modalMode === 'create') {
        await haulingService.create(payload);
      } else {
        await haulingService.update(selectedActivity.id, payload);
      }

      setShowModal(false);
      await fetchActivities();
      await loadResources();
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
        await fetchActivities();
        await loadResources();
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

  const excludeActiveActivityId = modalMode === 'edit' ? selectedActivity?.id : null;
  const activeHaulingActivities = allActivities.filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'IN_QUEUE'].includes(a.status)).filter((a) => (excludeActiveActivityId ? a.id !== excludeActiveActivityId : true));
  const assignedActiveOperatorIds = new Set(activeHaulingActivities.map((a) => a.operatorId).filter(Boolean));
  const assignedActiveExcavatorOperatorIds = new Set(activeHaulingActivities.map((a) => a.excavatorOperatorId).filter(Boolean));
  const assignedActiveTruckIds = new Set(activeHaulingActivities.map((a) => a.truckId).filter(Boolean));
  const selectedTruckIds = haulingList.map((h) => h.truckId).filter(Boolean);
  const selectedTruckOperatorIds = haulingList.map((h) => h.truckOperatorId).filter(Boolean);
  const selectedExcavatorOperatorIds = haulingList
    .filter((h) => Boolean(h.excavatorId))
    .map((h) => h.excavatorOperatorId)
    .filter(Boolean);

  const filteredMiningSites = (() => {
    const base = Array.isArray(miningSites) ? miningSites : [];
    const selectedId = formData.miningSiteId;
    const filtered = base.filter((site) => {
      if (!miningSiteSearchQuery) return true;
      const q = miningSiteSearchQuery.toLowerCase();
      return site.code?.toLowerCase().includes(q) || site.name?.toLowerCase().includes(q) || `${site.code || ''} ${site.name || ''}`.toLowerCase().includes(q);
    });
    return mergeWithSelected(filtered, base, selectedId);
  })();

  const paginatedMiningSites = filteredMiningSites.slice(0, dropdownPage.site * DROPDOWN_PAGE_SIZE);
  const canLoadMoreMiningSites = filteredMiningSites.length > dropdownPage.site * DROPDOWN_PAGE_SIZE;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Activity className="text-sky-400 w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <span className="hidden sm:inline">Hauling Activities Management</span>
            <span className="sm:hidden">Hauling Activities</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 ml-9 sm:ml-14">Monitor and manage hauling operations in real-time</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchActivities}
            className="flex-1 sm:flex-none bg-slate-800/80 hover:bg-slate-700 px-3 sm:px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canEdit && (
            <button onClick={handleCreate} className="flex-1 sm:flex-none bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-medium transition-colors">
              <Plus size={20} />
              <span className="hidden sm:inline">Add</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-sky-400">{allActivities.filter((a) => ['LOADING', 'HAULING', 'DUMPING', 'RETURNING'].includes(a.status)).length}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <TrendingUp className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Completed</p>
              <p className="text-3xl font-bold text-cyan-400">{allActivities.filter((a) => a.status === 'COMPLETED').length}</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <CheckCircle className="text-cyan-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-300/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Delayed</p>
              <p className="text-3xl font-bold text-blue-300">{allActivities.filter((a) => a.isDelayed || a.status === 'DELAYED').length}</p>
            </div>
            <div className="p-3 bg-blue-300/10 rounded-xl border border-blue-300/20">
              <AlertCircle className="text-blue-300" size={28} />
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

      <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-3 sm:p-5">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-auto sm:min-w-[280px] lg:min-w-[380px] lg:max-w-[500px] sm:flex-1">
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
                className="w-full sm:w-auto bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 sm:min-w-[180px] focus:border-sky-500 outline-none transition-colors"
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
                className="w-full sm:w-auto bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 sm:min-w-[150px] focus:border-sky-500 outline-none transition-colors"
              >
                <option value="">All Shifts</option>
                {shiftOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg border font-medium transition-colors flex items-center justify-center gap-2 ${
                    showAdvancedFilters || activeFiltersCount > 0 ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Filter size={18} />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && <span className="bg-sky-500 text-slate-900 text-xs px-2 py-0.5 rounded-full font-semibold">{activeFiltersCount}</span>}
                  <ChevronDown className={`transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} size={16} />
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-end gap-2 text-xs sm:text-sm text-slate-400">
              <span>
                Showing {activities.length} of {allActivities.length} activities
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="bg-slate-800/40 p-3 sm:p-4 rounded-lg border border-slate-700/50">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Filter size={18} className="text-slate-400" />
                <span>Advanced Filters</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                      {activity.isDelayed && <span className="ml-2 text-xs bg-blue-300/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-300/30">Delayed</span>}
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
                      {activity.loadEfficiency && <p className="text-xs text-cyan-400">{activity.loadEfficiency.toFixed(1)}%</p>}
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
                          <button onClick={() => handleEdit(activity)} className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(activity.id)} className="p-2 text-blue-300 hover:bg-blue-300/10 rounded-lg transition-colors" title="Cancel">
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
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Plus className="text-blue-400" size={24} />
              </div>
              <span className="text-slate-100">Add Hauling Activity</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Edit className="text-cyan-400" size={24} />
              </div>
              <span className="text-slate-100">Edit Hauling Activity</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
                <Eye className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Hauling Activity Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedActivity ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 p-6 rounded-xl border border-sky-500/20">
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
                  <Construction className="text-blue-400" size={18} />
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
                  <User className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Operator</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.operator?.user?.fullName || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.operator?.employeeNumber || ''}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Supervisor</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedActivity.supervisor?.fullName || '-'}</p>
                <p className="text-sm text-slate-400">{selectedActivity.supervisor?.username || ''}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-blue-300" size={18} />
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

            <div className="bg-cyan-500/10 p-4 rounded-lg border border-cyan-500/20">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Package className="text-cyan-400" size={18} />
                <span>Load Information</span>
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-medium text-slate-400">Load Weight</label>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
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
                  <p className="text-2xl font-bold text-sky-400 mt-1">
                    {selectedActivity.distance} <span className="text-sm text-slate-400">km</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Clock className="text-sky-400" size={18} />
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
                <div className="bg-sky-500/20 p-3 rounded-lg border border-sky-500/30">
                  <label className="text-xs font-medium text-sky-300">Total Cycle Time</label>
                  <p className="text-2xl font-bold text-sky-400 mt-1">
                    {selectedActivity.totalCycleTime || 0} <span className="text-sm text-slate-400">min</span>
                  </p>
                </div>
              </div>
            </div>

            {(selectedActivity.isDelayed || selectedActivity.delayMinutes > 0) && (
              <div className="bg-blue-300/10 p-4 rounded-lg border border-blue-300/20">
                <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                  <AlertCircle className="text-blue-300" size={18} />
                  <span>Delay Information</span>
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                    <label className="text-xs font-medium text-slate-400">Delay Minutes</label>
                    <p className="text-xl font-bold text-blue-300 mt-1">
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
              <div className="bg-blue-400/10 p-4 rounded-lg border border-blue-400/20">
                <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                  <Gauge className="text-blue-400" size={18} />
                  <span>Fuel Consumption</span>
                </h4>
                <p className="text-2xl font-bold text-blue-400">
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
              <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
                <h4 className="text-sm font-semibold text-sky-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="text-sky-400" size={18} />
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
        ) : (
          // CREATE/EDIT MODE - Individual hauling items with Mining Site auto-fill
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
              <p className="text-sm text-sky-300">
                <strong>{modalMode === 'edit' ? 'Update Hauling Activity:' : 'Create Hauling Activities:'}</strong> Select a mining site to auto-fill locations, then add individual hauling items. Each hauling has 1 Truck, 1 Excavator
                (optional), and 1-2 Operators.
              </p>
            </div>

            {/* Basic Configuration */}
            <div className="grid grid-cols-2 gap-6">
              {/* Mining Site Selection - NEW */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  <Mountain size={16} className="inline mr-2 text-emerald-400" />
                  Mining Site *
                </label>
                <input
                  type="text"
                  placeholder="Search mining site..."
                  value={miningSiteSearchQuery}
                  onChange={(e) => {
                    setMiningSiteSearchQuery(e.target.value);
                    setDropdownPage((p) => ({ ...p, site: 1 }));
                  }}
                  className="w-full bg-slate-900/60 border border-slate-700 text-slate-300 rounded px-2 py-2 text-sm mb-2"
                />
                <select
                  value={formData.miningSiteId}
                  onChange={(e) => handleMiningSiteChange(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors"
                  required
                >
                  <option value="">Select Mining Site</option>
                  {paginatedMiningSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.code || site.name} - {site.name}
                    </option>
                  ))}
                </select>
                {canLoadMoreMiningSites && (
                  <button type="button" onClick={() => setDropdownPage((p) => ({ ...p, site: p.site + 1 }))} className="text-xs text-sky-400 mt-1">
                    Load more...
                  </button>
                )}
                {siteAutoFillInfo && (
                  <p className="text-xs text-emerald-400 mt-1">
                    ✓ Auto-filled: {siteAutoFillInfo.lpCount} loading points, {siteAutoFillInfo.dpCount} dumping points, {siteAutoFillInfo.roadCount} road segments
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Shift * <span className="text-xs text-sky-400">(Filters operators by shift)</span>
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => handleShiftChange(e.target.value)}
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

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Total Target Weight (ton)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="300.0 (will be distributed across haulings)"
                  min="0"
                />
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

            {/* Hauling List Section */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  <Activity className="text-sky-400" size={20} />
                  Hauling Items ({haulingList.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddHauling}
                  disabled={!formData.miningSiteId || modalMode === 'edit'}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Add Hauling
                </button>
              </div>

              {haulingList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-800/40 rounded-lg border border-slate-700/50">
                  <Activity className="mx-auto mb-2 text-slate-500" size={32} />
                  <p>{formData.miningSiteId ? 'Click "Add Hauling" to add hauling items' : 'Select a Mining Site first to add hauling items'}</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {haulingList.map((hauling, index) => (
                    <div key={hauling.tempId} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-semibold text-sky-400">Hauling #{index + 1}</span>
                        <button type="button" onClick={() => handleRemoveHauling(hauling.tempId)} disabled={hauling.isExisting} className="text-red-400 hover:text-red-300 p-1 disabled:opacity-40 disabled:cursor-not-allowed">
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">
                            <Truck size={12} className="inline mr-1" /> Truck * <span className="text-emerald-400">(STANDBY only)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Search truck..."
                            value={truckSearchQuery}
                            onChange={(e) => {
                              setTruckSearchQuery(e.target.value);
                              setDropdownPage((p) => ({ ...p, truck: 1 }));
                            }}
                            className="w-full bg-slate-900/60 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs mb-1"
                          />
                          <select
                            value={hauling.truckId}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'truckId', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                            required
                          >
                            <option value="">Select Truck</option>
                            {(() => {
                              const optionPool = mergeWithSelected(standbyTrucks, trucks, hauling.truckId);
                              const filtered = optionPool.filter((t) => {
                                const isSelected = t.id === hauling.truckId;
                                const activeOk = !assignedActiveTruckIds.has(t.id) || isSelected;
                                const dupOk = !selectedTruckIds.includes(t.id) || isSelected;
                                if (truckSearchQuery) {
                                  const q = truckSearchQuery.toLowerCase();
                                  const matchSearch = t.code?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q);
                                  return (activeOk && dupOk && matchSearch) || isSelected;
                                }
                                return activeOk && dupOk;
                              });
                              const sorted = [...filtered].sort((a, b) => {
                                if (a.id === hauling.truckId) return -1;
                                if (b.id === hauling.truckId) return 1;
                                return 0;
                              });
                              const paginated = sorted.slice(0, dropdownPage.truck * DROPDOWN_PAGE_SIZE);
                              return paginated.map((truck) => (
                                <option key={truck.id} value={truck.id}>
                                  {truck.code} ({truck.capacity}t)
                                </option>
                              ));
                            })()}
                          </select>
                          {standbyTrucks.length > dropdownPage.truck * DROPDOWN_PAGE_SIZE && (
                            <button type="button" onClick={() => setDropdownPage((p) => ({ ...p, truck: p.truck + 1 }))} className="text-xs text-sky-400 mt-1">
                              Load more...
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">
                            <Construction size={12} className="inline mr-1" /> Excavator <span className="text-emerald-400">(STANDBY only)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Search excavator..."
                            value={excavatorSearchQuery}
                            onChange={(e) => {
                              setExcavatorSearchQuery(e.target.value);
                              setDropdownPage((p) => ({ ...p, excavator: 1 }));
                            }}
                            className="w-full bg-slate-900/60 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs mb-1"
                          />
                          <select
                            value={hauling.excavatorId}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'excavatorId', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                          >
                            <option value="">No Excavator</option>
                            {(() => {
                              const optionPool = mergeWithSelected(standbyExcavators, excavators, hauling.excavatorId);
                              const filtered = optionPool.filter((e) => {
                                const isSelected = e.id === hauling.excavatorId;
                                if (excavatorSearchQuery) {
                                  const q = excavatorSearchQuery.toLowerCase();
                                  const matchSearch = e.code?.toLowerCase().includes(q) || e.name?.toLowerCase().includes(q) || e.model?.toLowerCase().includes(q);
                                  return matchSearch || isSelected;
                                }
                                return true;
                              });
                              const sorted = [...filtered].sort((a, b) => {
                                if (a.id === hauling.excavatorId) return -1;
                                if (b.id === hauling.excavatorId) return 1;
                                return 0;
                              });
                              const paginated = sorted.slice(0, dropdownPage.excavator * DROPDOWN_PAGE_SIZE);
                              return paginated.map((exc) => (
                                <option key={exc.id} value={exc.id}>
                                  {exc.code} - {exc.model}
                                </option>
                              ));
                            })()}
                          </select>
                          {standbyExcavators.length > dropdownPage.excavator * DROPDOWN_PAGE_SIZE && (
                            <button type="button" onClick={() => setDropdownPage((p) => ({ ...p, excavator: p.excavator + 1 }))} className="text-xs text-sky-400 mt-1">
                              Load more...
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">
                            <User size={12} className="inline mr-1" /> Truck Operator * <span className="text-amber-400">(Shift: {formData.shift})</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Search operator..."
                            value={truckOperatorSearchQuery}
                            onChange={(e) => {
                              setTruckOperatorSearchQuery(e.target.value);
                              setDropdownPage((p) => ({ ...p, truckOp: 1 }));
                            }}
                            className="w-full bg-slate-900/60 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs mb-1"
                          />
                          <select
                            value={hauling.truckOperatorId}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'truckOperatorId', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                            required
                          >
                            <option value="">Select Operator</option>
                            {(() => {
                              const currentShift = formData.shift || 'SHIFT_1';
                              const filtered = mergeWithSelected(filteredTruckOperators, operators, hauling.truckOperatorId).filter((op) => {
                                const isSelected = op.id === hauling.truckOperatorId;
                                const shiftOk = !op.shift || op.shift === currentShift || isSelected;
                                const activeOk = !assignedActiveOperatorIds.has(op.id) || isSelected;
                                const dupOk = !selectedTruckOperatorIds.includes(op.id) || isSelected;
                                if (truckOperatorSearchQuery) {
                                  const q = truckOperatorSearchQuery.toLowerCase();
                                  const matchSearch = op.employeeNumber?.toLowerCase().includes(q) || op.user?.fullName?.toLowerCase().includes(q);
                                  return shiftOk && activeOk && dupOk && (matchSearch || isSelected);
                                }
                                return shiftOk && activeOk && dupOk;
                              });
                              const paginated = filtered.slice(0, dropdownPage.truckOp * DROPDOWN_PAGE_SIZE);
                              return paginated.map((op) => (
                                <option key={op.id} value={op.id}>
                                  {op.employeeNumber} - {op.user?.fullName} ({op.shift || 'Any'})
                                </option>
                              ));
                            })()}
                          </select>
                          {filteredTruckOperators.length > dropdownPage.truckOp * DROPDOWN_PAGE_SIZE && (
                            <button type="button" onClick={() => setDropdownPage((p) => ({ ...p, truckOp: p.truckOp + 1 }))} className="text-xs text-sky-400 mt-1">
                              Load more...
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">
                            <User size={12} className="inline mr-1" /> Excavator Operator <span className="text-amber-400">(Shift: {formData.shift})</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Search operator..."
                            value={excavatorOperatorSearchQuery}
                            onChange={(e) => {
                              setExcavatorOperatorSearchQuery(e.target.value);
                              setDropdownPage((p) => ({ ...p, excOp: 1 }));
                            }}
                            className="w-full bg-slate-900/60 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs mb-1"
                            disabled={!hauling.excavatorId}
                          />
                          <select
                            value={hauling.excavatorOperatorId || ''}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'excavatorOperatorId', e.target.value)}
                            disabled={!hauling.excavatorId}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-900/40 disabled:text-slate-500 disabled:cursor-not-allowed"
                          >
                            <option value="">No Operator</option>
                            {(() => {
                              const currentShift = formData.shift || 'SHIFT_1';
                              const filtered = mergeWithSelected(filteredExcavatorOperators, operators, hauling.excavatorOperatorId).filter((op) => {
                                const isSelected = op.id === hauling.excavatorOperatorId;
                                const shiftOk = !op.shift || op.shift === currentShift || isSelected;
                                const activeOk = !assignedActiveExcavatorOperatorIds.has(op.id) || isSelected;
                                const dupOk = !selectedExcavatorOperatorIds.includes(op.id) || isSelected;
                                if (excavatorOperatorSearchQuery) {
                                  const q = excavatorOperatorSearchQuery.toLowerCase();
                                  const matchSearch = op.employeeNumber?.toLowerCase().includes(q) || op.user?.fullName?.toLowerCase().includes(q);
                                  return shiftOk && activeOk && dupOk && (matchSearch || isSelected);
                                }
                                return shiftOk && activeOk && dupOk;
                              });
                              const paginated = filtered.slice(0, dropdownPage.excOp * DROPDOWN_PAGE_SIZE);
                              return paginated.map((op) => (
                                <option key={op.id} value={op.id}>
                                  {op.employeeNumber} - {op.user?.fullName} ({op.shift || 'Any'})
                                </option>
                              ));
                            })()}
                          </select>
                          {filteredExcavatorOperators.length > dropdownPage.excOp * DROPDOWN_PAGE_SIZE && !hauling.excavatorId && (
                            <button type="button" onClick={() => setDropdownPage((p) => ({ ...p, excOp: p.excOp + 1 }))} className="text-xs text-sky-400 mt-1">
                              Load more...
                            </button>
                          )}
                        </div>

                        {/* Loading Point */}
                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">
                            <MapPin size={12} className="inline mr-1" /> Loading Point *
                          </label>
                          <select
                            value={hauling.loadingPointId}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'loadingPointId', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                            required
                          >
                            <option value="">Select</option>
                            {mergeWithSelected(filteredLoadingPoints.length > 0 ? filteredLoadingPoints : loadingPoints, loadingPoints, hauling.loadingPointId).map((lp) => (
                              <option key={lp.id} value={lp.id}>
                                {lp.code || lp.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Dumping Point */}
                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">
                            <MapPin size={12} className="inline mr-1" /> Dumping Point *
                          </label>
                          <select
                            value={hauling.dumpingPointId}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'dumpingPointId', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                            required
                          >
                            <option value="">Select</option>
                            {mergeWithSelected(filteredDumpingPoints.length > 0 ? filteredDumpingPoints : dumpingPoints, dumpingPoints, hauling.dumpingPointId).map((dp) => (
                              <option key={dp.id} value={dp.id}>
                                {dp.code || dp.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Road Segment */}
                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">
                            <Navigation size={12} className="inline mr-1" /> Road Segment
                          </label>
                          <select
                            value={hauling.roadSegmentId}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'roadSegmentId', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                          >
                            <option value="">Select</option>
                            {mergeWithSelected(filteredRoadSegments.length > 0 ? filteredRoadSegments : roadSegments, roadSegments, hauling.roadSegmentId).map((rs) => (
                              <option key={rs.id} value={rs.id}>
                                {rs.code || rs.name} ({rs.distance}km)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Load Weight */}
                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">Load Weight (ton)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={hauling.loadWeight}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'loadWeight', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                            placeholder="0"
                            min="0"
                          />
                        </div>

                        {/* Target Weight (auto-distributed) */}
                        <div>
                          <label className="text-xs font-medium text-slate-400 mb-1 block">Target (ton)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={hauling.targetWeight}
                            onChange={(e) => handleUpdateHauling(hauling.tempId, 'targetWeight', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-sm"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Summary Row */}
                      <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-4 text-xs text-slate-400">
                        <span>
                          <strong className="text-slate-300">{hauling.truckCode}</strong> ({hauling.truckCapacity}t)
                        </span>
                        {hauling.excavatorCode && hauling.excavatorCode !== '-' && (
                          <span>
                            + <strong className="text-slate-300">{hauling.excavatorCode}</strong>
                          </span>
                        )}
                        <span>
                          → {hauling.loadingPointName} ⟶ {hauling.dumpingPointName}
                        </span>
                        <span className="ml-auto">{hauling.distance}km</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Section */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={haulingList.length === 0}
                className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={18} />
                <span>{haulingList.length === 0 ? 'Add Hauling Items First' : modalMode === 'edit' ? 'Update Activity' : `Create ${haulingList.length} ${haulingList.length > 1 ? 'Activities' : 'Activity'}`}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default HaulingList;
