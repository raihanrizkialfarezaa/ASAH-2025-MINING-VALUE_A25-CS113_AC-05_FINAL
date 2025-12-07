import React, { useEffect, useState, useCallback } from 'react';
import { operatorService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Edit, Trash2, Eye, Filter, Search, X, SortAsc, SortDesc, RefreshCw, ChevronDown, User, Users, Activity, Clock, UserCheck, UserX, Star, Calendar, CreditCard, Award, CheckCircle, Truck, Shield, Mail } from 'lucide-react';
import { userService } from '../../services';
import { authService } from '../../services/authService';

const OperatorList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);
  const [operators, setOperators] = useState([]);
  const [allOperators, setAllOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState('employeeNumber');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState({
    minRating: '',
    maxRating: '',
    minHours: '',
    maxHours: '',
  });
  const [formData, setFormData] = useState({
    userId: '',
    fullName: '',
    email: '',
    employeeNumber: '',
    licenseType: '',
    licenseNumber: '',
    licenseExpiry: '',
    joinDate: '',
    salary: '',
    shift: '',
    status: '',
    rating: '',
    competencyDumpTruck: false,
    competencyHeavyEquipment: false,
    competencyYearsExperience: '',
    resignDate: '',
  });

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allOperators];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (operator) =>
          operator.employeeNumber?.toLowerCase().includes(query) || operator.user?.fullName?.toLowerCase().includes(query) || operator.licenseNumber?.toLowerCase().includes(query) || operator.user?.email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((operator) => operator.status === statusFilter);
    }

    if (shiftFilter) {
      filtered = filtered.filter((operator) => operator.shift === shiftFilter);
    }

    if (licenseTypeFilter) {
      filtered = filtered.filter((operator) => operator.licenseType === licenseTypeFilter);
    }

    if (filters.minRating) {
      filtered = filtered.filter((operator) => (operator.rating || 0) >= parseFloat(filters.minRating));
    }

    if (filters.maxRating) {
      filtered = filtered.filter((operator) => (operator.rating || 0) <= parseFloat(filters.maxRating));
    }

    if (filters.minHours) {
      filtered = filtered.filter((operator) => (operator.totalHours || 0) >= parseInt(filters.minHours));
    }

    if (filters.maxHours) {
      filtered = filtered.filter((operator) => (operator.totalHours || 0) <= parseInt(filters.maxHours));
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'employeeNumber' || sortField === 'licenseNumber') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      } else if (sortField === 'fullName') {
        aVal = a.user?.fullName?.toLowerCase() || '';
        bVal = b.user?.fullName?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalPages = Math.ceil(filtered.length / pagination.limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedData = filtered.slice(startIndex, startIndex + pagination.limit);

    setOperators(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allOperators, searchQuery, statusFilter, shiftFilter, licenseTypeFilter, filters, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchOperators();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  const fetchOperators = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await operatorService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllOperators(allData);
    } catch (error) {
      console.error('Failed to fetch operators:', error);
      setAllOperators([]);
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
    setShiftFilter('');
    setLicenseTypeFilter('');
    setFilters({
      minRating: '',
      maxRating: '',
      minHours: '',
      maxHours: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active', color: 'green' },
    { value: 'ON_LEAVE', label: 'On Leave', color: 'yellow' },
    { value: 'SICK', label: 'Sick', color: 'orange' },
    { value: 'RESIGNED', label: 'Resigned', color: 'red' },
    { value: 'SUSPENDED', label: 'Suspended', color: 'gray' },
  ];

  const shiftOptions = [
    { value: 'SHIFT_1', label: 'Shift 1' },
    { value: 'SHIFT_2', label: 'Shift 2' },
    { value: 'SHIFT_3', label: 'Shift 3' },
  ];

  const licenseTypeOptions = [
    { value: 'SIM_B2', label: 'SIM B2' },
    { value: 'OPERATOR_ALAT_BERAT', label: 'Heavy Equipment' },
  ];

  const handleView = (operator) => {
    setSelectedOperator(operator);
    setModalMode('view');
    setShowModal(true);
  };

  const generateUserId = () => `opr_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString().slice(-4)}`;

  const generateEmployeeNumber = () => `OPR-${Date.now().toString().slice(-6)}`;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedOperator(null);
    setFormData({
      userId: generateUserId(),
      fullName: '',
      email: '',
      employeeNumber: generateEmployeeNumber(),
      licenseType: '',
      licenseNumber: '',
      licenseExpiry: '',
      joinDate: new Date().toISOString().split('T')[0],
      salary: '8000000',
      shift: 'SHIFT_1',
      status: 'ACTIVE',
      rating: '5.0',
      competencyDumpTruck: false,
      competencyHeavyEquipment: false,
      competencyYearsExperience: '',
      resignDate: '',
    });
    setShowModal(true);
  };

  const generateStrongPassword = () => {
    const upper = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const lower = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const digits = String(Math.floor(100 + Math.random() * 900));
    const extras = 'A' + lower + digits + '!';
    return upper + lower + digits + extras.slice(0, 4);
  };

  const handleEdit = (operator) => {
    setSelectedOperator(operator);
    setFormData({
      userId: operator.userId || '',
      fullName: operator.user?.fullName || '',
      email: operator.user?.email || '',
      employeeNumber: operator.employeeNumber || '',
      salary: operator.salary || '',
      shift: operator.shift || '',
      status: operator.status || '',
      licenseNumber: operator.licenseNumber || '',
      licenseType: operator.licenseType || '',
      licenseExpiry: operator.licenseExpiry ? new Date(operator.licenseExpiry).toISOString().split('T')[0] : '',
      joinDate: operator.joinDate ? new Date(operator.joinDate).toISOString().split('T')[0] : '',
      rating: operator.rating || '',
      competencyDumpTruck: operator.competency?.dump_truck || false,
      competencyHeavyEquipment: operator.competency?.heavy_equipment || false,
      competencyYearsExperience: operator.competency?.years_experience || '',
      resignDate: operator.resignDate ? new Date(operator.resignDate).toISOString().split('T')[0] : '',
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {};

      if (modalMode === 'create') {
        if (!formData.employeeNumber || !formData.employeeNumber.trim()) {
          window.alert('Employee Number is required');
          return;
        }
        if (!formData.licenseType) {
          window.alert('License Type is required');
          return;
        }
        if (!formData.joinDate) {
          window.alert('Join Date is required');
          return;
        }
        if (!formData.fullName || !formData.fullName.trim()) {
          window.alert('Operator full name is required to create user');
          return;
        }

        payload.employeeNumber = formData.employeeNumber.toString().trim().toUpperCase();
        payload.licenseType = formData.licenseType;
        payload.joinDate = new Date(formData.joinDate).toISOString();
        if (formData.licenseNumber) payload.licenseNumber = formData.licenseNumber.toString().trim();
        if (formData.licenseExpiry) payload.licenseExpiry = new Date(formData.licenseExpiry).toISOString();
        if (formData.status) payload.status = formData.status;
        if (formData.shift) payload.shift = formData.shift;
        const salary = formData.salary !== '' && formData.salary !== undefined ? Number(formData.salary) : undefined;
        if (salary !== undefined && !Number.isNaN(salary)) payload.salary = salary;
        const rating = formData.rating !== '' && formData.rating !== undefined ? Number(formData.rating) : undefined;

        let resolvedUserId = null;
        const looksLikeId = (val) => typeof val === 'string' && /^c[a-z0-9]{6,}$/.test(val);

        try {
          const list = await userService.getAll({ search: formData.userId || formData.fullName, role: 'OPERATOR', limit: 1 });
          const found = list.data?.[0] || list.users?.[0];
          if (found) resolvedUserId = found.id;
        } catch (e) {}

        if (!resolvedUserId && looksLikeId(formData.userId)) {
          try {
            const userResp = await userService.getById(formData.userId);
            resolvedUserId = userResp.data?.id || userResp.id || formData.userId;
          } catch (e) {}
        }

        if (!resolvedUserId) {
          const username = formData.userId && formData.userId.trim() ? formData.userId.trim() : `operator${Date.now()}`;
          try {
            const emailToUse = formData.email && formData.email.trim() ? formData.email.trim() : `${username}${Date.now()}@example.com`;
            const newUser = await userService.create({ username, password: generateStrongPassword(), fullName: formData.fullName.trim(), role: 'OPERATOR', email: emailToUse });
            resolvedUserId = newUser.data?.id || newUser.id;
          } catch (createErr) {
            // last-ditch: try search again
            try {
              const list2 = await userService.getAll({ search: username || formData.fullName, role: 'OPERATOR', limit: 1 });
              const found2 = list2.data?.[0] || list2.users?.[0];
              if (found2) resolvedUserId = found2.id;
            } catch (err) {}
          }
        }

        if (!resolvedUserId) {
          window.alert('Unable to resolve or create user account for this operator');
          return;
        }

        payload.userId = resolvedUserId;
        if (rating !== undefined && !Number.isNaN(rating)) payload.rating = rating;
        payload.competency = {
          dump_truck: !!formData.competencyDumpTruck,
          heavy_equipment: !!formData.competencyHeavyEquipment,
          years_experience: formData.competencyYearsExperience ? parseInt(formData.competencyYearsExperience, 10) : undefined,
        };

        await operatorService.create(payload);
      } else {
        const salary = formData.salary !== '' && formData.salary !== undefined ? Number(formData.salary) : undefined;
        if (salary !== undefined && !Number.isNaN(salary)) payload.salary = salary;

        if (formData.shift) payload.shift = formData.shift;
        if (formData.status) payload.status = formData.status;
        if (formData.licenseNumber) payload.licenseNumber = formData.licenseNumber.toString().trim();
        if (formData.licenseType) payload.licenseType = formData.licenseType;
        if (formData.licenseExpiry) payload.licenseExpiry = new Date(formData.licenseExpiry).toISOString();

        const rating = formData.rating !== '' && formData.rating !== undefined ? Number(formData.rating) : undefined;
        if (rating !== undefined && !Number.isNaN(rating)) payload.rating = rating;

        if (formData.employeeNumber && formData.employeeNumber.trim() && formData.employeeNumber.trim() !== selectedOperator.employeeNumber) {
          payload.employeeNumber = formData.employeeNumber.trim().toUpperCase();
        }

        if (formData.joinDate) {
          payload.joinDate = new Date(formData.joinDate).toISOString();
        }

        if (formData.resignDate) {
          payload.resignDate = new Date(formData.resignDate).toISOString();
        }

        payload.competency = {
          dump_truck: !!formData.competencyDumpTruck,
          heavy_equipment: !!formData.competencyHeavyEquipment,
          years_experience: formData.competencyYearsExperience ? parseInt(formData.competencyYearsExperience, 10) : undefined,
        };

        // update user fullName if it changed
        if (selectedOperator?.user?.id && formData.fullName && formData.fullName.trim() !== selectedOperator.user?.fullName) {
          try {
            await userService.update(selectedOperator.user.id, { fullName: formData.fullName.trim() });
          } catch (err) {
            console.error('Failed to update user fullName:', err);
            window.alert('Failed to update user name');
            return;
          }
        }

        if (Object.keys(payload).length === 0) {
          window.alert('No changes to update');
          return;
        }
        // update user email if it changed
        if (selectedOperator?.user?.id && formData.email && formData.email.trim() !== selectedOperator.user?.email) {
          try {
            await userService.update(selectedOperator.user.id, { email: formData.email.trim() });
          } catch (err) {
            console.error('Failed to update user email:', err);
            window.alert('Failed to update user email');
            return;
          }
        }
        await operatorService.update(selectedOperator.id, payload);
      }

      setShowModal(false);
      fetchOperators();
    } catch (error) {
      console.error('Failed to save operator:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else if (error.response?.data?.data) {
        const errors = error.response.data.data;
        const errorMessages = Array.isArray(errors) ? errors.map((e) => e.msg).join('\n') : JSON.stringify(errors);
        window.alert(errorMessages);
      } else {
        window.alert('Failed to save operator. Please check your input.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this operator?')) {
      try {
        await operatorService.delete(id);
        fetchOperators();
      } catch (error) {
        console.error('Failed to delete operator:', error);
        window.alert('Failed to delete operator');
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getShiftLabel = (shift) => {
    const shiftMap = {
      SHIFT_1: 'Shift 1 (07:00-15:00)',
      SHIFT_2: 'Shift 2 (15:00-23:00)',
      SHIFT_3: 'Shift 3 (23:00-07:00)',
    };
    return shiftMap[shift] || shift;
  };

  const getLicenseTypeLabel = (type) => {
    const typeMap = {
      SIM_B2: 'SIM B2',
      OPERATOR_ALAT_BERAT: 'Heavy Equipment Operator',
    };
    return typeMap[type] || type;
  };

  if (loading && !operators.length) {
    return <LoadingSpinner fullScreen />;
  }

  const activeFiltersCount = [searchQuery, statusFilter, shiftFilter, licenseTypeFilter, filters.minRating, filters.maxRating, filters.minHours, filters.maxHours].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Users className="text-blue-400" size={28} />
            </div>
            <span>Operators Management</span>
          </h1>
          <p className="text-sm text-slate-300 mt-1 ml-14">Manage and monitor operator workforce in real-time</p>
        </div>
        <div className="flex gap-3">
          {canEdit && (
            <button onClick={handleCreate} className="bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors">
              <Plus size={20} />
              <span>Add Operator</span>
            </button>
          )}
          <button onClick={fetchOperators} className="bg-slate-800/80 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Total Operators</p>
              <p className="text-3xl font-bold text-blue-400">{allOperators.length}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Users className="text-blue-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Active</p>
              <p className="text-3xl font-bold text-cyan-400">{allOperators.filter((o) => o.status === 'ACTIVE').length}</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <UserCheck className="text-cyan-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">On Leave</p>
              <p className="text-3xl font-bold text-sky-400">{allOperators.filter((o) => o.status === 'ON_LEAVE').length}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <Clock className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-300/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Sick</p>
              <p className="text-3xl font-bold text-blue-300">{allOperators.filter((o) => o.status === 'SICK').length}</p>
            </div>
            <div className="p-3 bg-blue-300/10 rounded-xl border border-blue-300/20">
              <UserX className="text-blue-300" size={28} />
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
                  placeholder="Search by name, employee number, license, email..."
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
                className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 min-w-[160px] focus:border-sky-500 outline-none transition-colors"
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
                className="bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 min-w-[140px] focus:border-sky-500 outline-none transition-colors"
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
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-blue-500 text-slate-900 text-xs px-2 py-0.5 rounded-full font-semibold">{activeFiltersCount}</span>}
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
                Showing {operators.length} of {allOperators.length} operators
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
                  <label className="block text-sm font-medium text-slate-400 mb-2">License Type</label>
                  <select
                    value={licenseTypeFilter}
                    onChange={(e) => setLicenseTypeFilter(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                  >
                    <option value="">All Types</option>
                    {licenseTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Min Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={filters.minRating}
                    onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                    placeholder="0.0"
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Max Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={filters.maxRating}
                    onChange={(e) => setFilters({ ...filters, maxRating: e.target.value })}
                    placeholder="5.0"
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Total Hours Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.minHours}
                      onChange={(e) => setFilters({ ...filters, minHours: e.target.value })}
                      placeholder="Min"
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="number"
                      value={filters.maxHours}
                      onChange={(e) => setFilters({ ...filters, maxHours: e.target.value })}
                      placeholder="Max"
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('employeeNumber')}>
                  <div className="flex items-center justify-between">
                    <span>Employee No</span>
                    {sortField === 'employeeNumber' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('fullName')}>
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    {sortField === 'fullName' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">License</th>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('rating')}>
                  <div className="flex items-center justify-between">
                    <span>Rating</span>
                    {sortField === 'rating' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('salary')}>
                  <div className="flex items-center justify-between">
                    <span>Salary</span>
                    {sortField === 'salary' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('totalHours')}>
                  <div className="flex items-center justify-between">
                    <span>Total Hours</span>
                    {sortField === 'totalHours' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-900/40">
              {operators.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="text-slate-600" size={48} />
                      <p className="text-slate-400 font-medium">No operators found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                operators.map((operator) => (
                  <tr key={operator.id} className="hover:bg-blue-500/5 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-bold text-blue-400">{operator.employeeNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="text-slate-400" size={16} />
                        <span className="font-medium text-slate-100">{operator.user?.fullName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-100">{getLicenseTypeLabel(operator.licenseType)}</span>
                        <span className="text-xs text-slate-400">{operator.licenseNumber || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-slate-300">{operator.shift?.replace('SHIFT_', 'Shift ') || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={operator.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="text-sky-400" size={16} fill="currentColor" />
                        <span className="font-semibold text-slate-100">{operator.rating?.toFixed(2) || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-100">{formatCurrency(operator.salary)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-100">{operator.totalHours || 0}</span>
                      <span className="text-slate-400 ml-1">hrs</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button onClick={() => handleView(operator)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(operator)} className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(operator.id)} className="p-2 text-blue-300 hover:bg-blue-300/10 rounded-lg transition-colors" title="Delete">
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
          modalMode === 'edit' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Edit className="text-cyan-400" size={24} />
              </div>
              <span className="text-slate-100">Edit Operator</span>
            </div>
          ) : modalMode === 'create' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Plus className="text-blue-400" size={24} />
              </div>
              <span className="text-slate-100">Create New Operator</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
                <Eye className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Operator Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedOperator ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 p-6 rounded-xl border border-sky-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selectedOperator.employeeNumber}</h3>
                  <p className="text-slate-400 mt-1">{selectedOperator.user?.fullName || '-'}</p>
                </div>
                <StatusBadge status={selectedOperator.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Email</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedOperator.user?.email || '-'}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">License Type</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{getLicenseTypeLabel(selectedOperator.licenseType)}</p>
                <p className="text-sm text-slate-500">{selectedOperator.licenseNumber || '-'}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">License Expiry</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{formatDate(selectedOperator.licenseExpiry)}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Shift</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{getShiftLabel(selectedOperator.shift)}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Rating</label>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {selectedOperator.rating?.toFixed(2) || '-'} <span className="text-lg text-slate-400">/5.0</span>
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Total Hours</label>
                </div>
                <p className="text-2xl font-bold text-sky-400">
                  {selectedOperator.totalHours || 0} <span className="text-lg text-slate-400">hrs</span>
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Salary</label>
                </div>
                <p className="text-xl font-bold text-cyan-400">{formatCurrency(selectedOperator.salary)}</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Join Date</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{formatDate(selectedOperator.joinDate)}</p>
              </div>

              {selectedOperator.trucks && selectedOperator.trucks.length > 0 && (
                <div className="col-span-2 bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="text-sky-400" size={18} />
                    <label className="text-sm font-semibold text-slate-400">Assigned Trucks</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedOperator.trucks.map((truck) => (
                      <div key={truck.id} className="bg-slate-800/80 px-3 py-2 rounded-lg border border-sky-500/30">
                        <p className="font-semibold text-sky-400">{truck.code}</p>
                        <p className="text-xs text-slate-400">{truck.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOperator.competency && (
                <div className="col-span-2 bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="text-sky-400" size={18} />
                    <label className="text-sm font-semibold text-slate-400">Competency</label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-sm text-slate-400">Dump Truck</p>
                      <p className="font-semibold text-slate-200">{selectedOperator.competency.dump_truck ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-sm text-slate-400">Heavy Equipment</p>
                      <p className="font-semibold text-slate-200">{selectedOperator.competency.heavy_equipment ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-sm text-slate-400">Experience</p>
                      <p className="font-semibold text-slate-200">{selectedOperator.competency.years_experience || 0} years</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
              <p className="text-sm text-sky-300">
                <strong className="text-sky-200">Note:</strong>{' '}
                {modalMode === 'create' ? 'All required fields must be filled. Employee number format: OPR-XXXX' : 'Update operator information carefully. Leave fields empty to keep current values.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {modalMode === 'create' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      User ID <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.userId}
                        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                        className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                        placeholder="User ID with OPERATOR role"
                        required
                      />
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, userId: generateUserId() }))} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                        <RefreshCw size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">The user must have OPERATOR role and not already have an operator profile</p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Operator Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Operator Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                      placeholder="Full name e.g. Joko Nugroho"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Employee Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.employeeNumber}
                        onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                        className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                        placeholder="OPR-0001"
                        required
                      />
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, employeeNumber: generateEmployeeNumber() }))} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      License Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.licenseType}
                      onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                      required
                    >
                      <option value="">Select License Type</option>
                      {licenseTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value="SIM_A">SIM A</option>
                      <option value="SIM_B1">SIM B1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Join Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">License Expiry</label>
                    <input
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Competency</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!formData.competencyDumpTruck}
                          onChange={(e) => setFormData({ ...formData, competencyDumpTruck: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                        />{' '}
                        <span className="text-sm">Dump Truck</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!formData.competencyHeavyEquipment}
                          onChange={(e) => setFormData({ ...formData, competencyHeavyEquipment: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                        />{' '}
                        <span className="text-sm">Heavy Equipment</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={formData.competencyYearsExperience}
                          onChange={(e) => setFormData({ ...formData, competencyYearsExperience: e.target.value })}
                          className="w-28 bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                          placeholder="Years"
                        />{' '}
                        <span className="text-sm text-slate-400">years</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalMode === 'edit' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">User ID</label>
                    <input type="text" value={formData.userId} readOnly className="w-full bg-slate-900/60 border border-slate-700 text-slate-400 rounded-lg px-3 py-2 cursor-not-allowed" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Employee Number</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.employeeNumber}
                        onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                        className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                        placeholder="OPR-0001"
                      />
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, employeeNumber: generateEmployeeNumber() }))} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Join Date</label>
                    <input
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Operator Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Operator Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">License Type</label>
                    <select
                      value={formData.licenseType}
                      onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                    >
                      <option value="">Select License Type</option>
                      {licenseTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value="SIM_A">SIM A</option>
                      <option value="SIM_B1">SIM B1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">License Number</label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                      placeholder="SIM-XXXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">License Expiry</label>
                    <input
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                      placeholder="5.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Resign Date</label>
                    <input
                      type="date"
                      value={formData.resignDate}
                      onChange={(e) => setFormData({ ...formData, resignDate: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Competency</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!formData.competencyDumpTruck}
                          onChange={(e) => setFormData({ ...formData, competencyDumpTruck: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                        />{' '}
                        <span className="text-sm">Dump Truck</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!formData.competencyHeavyEquipment}
                          onChange={(e) => setFormData({ ...formData, competencyHeavyEquipment: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                        />{' '}
                        <span className="text-sm">Heavy Equipment</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={formData.competencyYearsExperience}
                          onChange={(e) => setFormData({ ...formData, competencyYearsExperience: e.target.value })}
                          className="w-28 bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                          placeholder="Years"
                        />{' '}
                        <span className="text-sm text-slate-400">years</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Salary (IDR) {modalMode === 'create' && <span className="text-rose-400">*</span>}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                  placeholder="8000000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Shift</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                >
                  <option value="">Select Shift</option>
                  {shiftOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors"
                >
                  <option value="">Select Status</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">License Number</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-500"
                    placeholder="SIM-XXXXXXXX"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2">
                <CheckCircle size={18} />
                <span>{modalMode === 'create' ? 'Create Operator' : 'Update Operator'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default OperatorList;
