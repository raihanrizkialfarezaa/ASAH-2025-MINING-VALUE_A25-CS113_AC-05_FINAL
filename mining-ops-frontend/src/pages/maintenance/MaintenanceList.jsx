import React, { useEffect, useState, useCallback } from 'react';
import { maintenanceService } from '../../services';
import { truckService, excavatorService, supportEquipmentService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Edit, Trash2, Eye, Search, X, SortAsc, SortDesc, RefreshCw, Settings, Calendar, Clock, DollarSign, Wrench, User, FileText, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { authService } from '../../services/authService';

const MaintenanceList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR', 'MAINTENANCE_STAFF'].includes(currentUser?.role);
  const [maintenances, setMaintenances] = useState([]);
  const [allMaintenances, setAllMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [trucks, setTrucks] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [supportEquipments, setSupportEquipments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [sortField, setSortField] = useState('actualDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [maintenanceNumberEditable, setMaintenanceNumberEditable] = useState(false);
  const [formData, setFormData] = useState({
    maintenanceNumber: '',
    equipmentType: 'truck',
    truckId: '',
    excavatorId: '',
    supportEquipmentId: '',
    maintenanceType: 'PREVENTIVE',
    scheduledDate: '',
    actualDate: '',
    completionDate: '',
    duration: '',
    cost: '',
    description: '',
    partsReplaced: '',
    mechanicName: '',
    status: 'SCHEDULED',
    downtimeHours: '',
    remarks: '',
  });

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allMaintenances];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.maintenanceNumber?.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query) ||
          m.mechanicName?.toLowerCase().includes(query) ||
          m.truck?.code?.toLowerCase().includes(query) ||
          m.excavator?.code?.toLowerCase().includes(query) ||
          m.supportEquipment?.code?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter((m) => m.maintenanceType === typeFilter);
    }

    if (equipmentFilter) {
      if (equipmentFilter === 'truck') {
        filtered = filtered.filter((m) => m.truckId);
      } else if (equipmentFilter === 'excavator') {
        filtered = filtered.filter((m) => m.excavatorId);
      } else if (equipmentFilter === 'support') {
        filtered = filtered.filter((m) => m.supportEquipmentId);
      }
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'actualDate' || sortField === 'scheduledDate' || sortField === 'completionDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === 'string') {
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

    setMaintenances(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allMaintenances, searchQuery, statusFilter, typeFilter, equipmentFilter, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchMaintenances();
    loadEquipment();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await maintenanceService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllMaintenances(allData);
    } catch (error) {
      console.error('Failed to fetch maintenance logs:', error);
      setAllMaintenances([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    try {
      const [trucksRes, excavatorsRes, supportRes] = await Promise.all([truckService.getAll({ limit: 100 }), excavatorService.getAll({ limit: 100 }), supportEquipmentService.getAll({ limit: 100 })]);
      setTrucks(trucksRes.data || []);
      setExcavators(excavatorsRes.data || []);
      setSupportEquipments(supportRes.data || []);
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    }
  };

  const generateAutoMaintenanceNumber = () => {
    const prefix = 'MNT';
    const nums = allMaintenances
      .map((m) => {
        if (!m.maintenanceNumber?.startsWith(`${prefix}-`)) return null;
        const match = m.maintenanceNumber?.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(Boolean);
    const max = nums.length ? Math.max(...nums) : 0;
    let next = max + 1;
    let code = `${prefix}-${String(next).padStart(6, '0')}`;
    while (allMaintenances.some((e) => e.maintenanceNumber === code)) {
      next += 1;
      code = `${prefix}-${String(next).padStart(6, '0')}`;
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
    setTypeFilter('');
    setEquipmentFilter('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const statusOptions = [
    { value: 'SCHEDULED', label: 'Scheduled', color: 'blue' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'yellow' },
    { value: 'COMPLETED', label: 'Completed', color: 'green' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
  ];

  const typeOptions = [
    { value: 'PREVENTIVE', label: 'Preventive' },
    { value: 'CORRECTIVE', label: 'Corrective' },
    { value: 'PREDICTIVE', label: 'Predictive' },
    { value: 'OVERHAUL', label: 'Overhaul' },
    { value: 'INSPECTION', label: 'Inspection' },
  ];

  const handleCreate = () => {
    setModalMode('create');
    setMaintenanceNumberEditable(false);
    const defaultNumber = generateAutoMaintenanceNumber();
    setFormData({
      maintenanceNumber: defaultNumber,
      equipmentType: 'truck',
      truckId: '',
      excavatorId: '',
      supportEquipmentId: '',
      maintenanceType: 'PREVENTIVE',
      scheduledDate: '',
      actualDate: new Date().toISOString().split('T')[0],
      completionDate: '',
      duration: '',
      cost: '',
      description: '',
      partsReplaced: '',
      mechanicName: '',
      status: 'SCHEDULED',
      downtimeHours: '',
      remarks: '',
    });
    setShowModal(true);
  };

  const handleEdit = (maintenance) => {
    setModalMode('edit');
    setSelectedMaintenance(maintenance);
    setFormData({
      maintenanceNumber: maintenance.maintenanceNumber,
      equipmentType: maintenance.truckId ? 'truck' : maintenance.excavatorId ? 'excavator' : 'support',
      truckId: maintenance.truckId || '',
      excavatorId: maintenance.excavatorId || '',
      supportEquipmentId: maintenance.supportEquipmentId || '',
      maintenanceType: maintenance.maintenanceType,
      scheduledDate: maintenance.scheduledDate ? new Date(maintenance.scheduledDate).toISOString().split('T')[0] : '',
      actualDate: new Date(maintenance.actualDate).toISOString().split('T')[0],
      completionDate: maintenance.completionDate ? new Date(maintenance.completionDate).toISOString().split('T')[0] : '',
      duration: maintenance.duration || '',
      cost: maintenance.cost || '',
      description: maintenance.description,
      partsReplaced: maintenance.partsReplaced ? JSON.stringify(maintenance.partsReplaced) : '',
      mechanicName: maintenance.mechanicName || '',
      status: maintenance.status,
      downtimeHours: maintenance.downtimeHours || '',
      remarks: maintenance.remarks || '',
    });
    setShowModal(true);
  };

  const handleView = (maintenance) => {
    setSelectedMaintenance(maintenance);
    setModalMode('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        maintenanceNumber: formData.maintenanceNumber.trim(),
        maintenanceType: formData.maintenanceType,
        actualDate: new Date(formData.actualDate).toISOString(),
        description: formData.description.trim(),
        status: formData.status,
      };

      if (formData.equipmentType === 'truck' && formData.truckId) {
        payload.truckId = formData.truckId;
      } else if (formData.equipmentType === 'excavator' && formData.excavatorId) {
        payload.excavatorId = formData.excavatorId;
      } else if (formData.equipmentType === 'support' && formData.supportEquipmentId) {
        payload.supportEquipmentId = formData.supportEquipmentId;
      }

      if (formData.scheduledDate) payload.scheduledDate = new Date(formData.scheduledDate).toISOString();
      if (formData.completionDate) payload.completionDate = new Date(formData.completionDate).toISOString();
      if (formData.duration) payload.duration = parseInt(formData.duration);
      if (formData.cost) payload.cost = parseFloat(formData.cost);
      if (formData.mechanicName) payload.mechanicName = formData.mechanicName.trim();
      if (formData.downtimeHours) payload.downtimeHours = parseFloat(formData.downtimeHours);
      if (formData.remarks) payload.remarks = formData.remarks.trim();

      if (formData.partsReplaced) {
        try {
          payload.partsReplaced = JSON.parse(formData.partsReplaced);
        } catch (e) {
          payload.partsReplaced = { parts: formData.partsReplaced };
        }
      }

      if (modalMode === 'create') {
        if (!payload.maintenanceNumber) {
          window.alert('Maintenance number is required');
          return;
        }
        if (!payload.truckId && !payload.excavatorId && !payload.supportEquipmentId) {
          window.alert('Please select an equipment');
          return;
        }
        if (!payload.description || payload.description.length < 3) {
          window.alert('Description must be at least 3 characters');
          return;
        }
        await maintenanceService.create(payload);
      } else {
        await maintenanceService.update(selectedMaintenance.id, payload);
      }

      setShowModal(false);
      fetchMaintenances();
    } catch (error) {
      console.error('Failed to save maintenance:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else {
        window.alert('Failed to save maintenance. Please check your input.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this maintenance log?')) {
      try {
        await maintenanceService.delete(id);
        fetchMaintenances();
      } catch (error) {
        console.error('Failed to delete maintenance:', error);
        if (error.response?.data?.message) {
          window.alert(error.response.data.message);
        }
      }
    }
  };

  if (loading && !maintenances.length) {
    return <LoadingSpinner fullScreen />;
  }

  const activeFiltersCount = [searchQuery, statusFilter, typeFilter, equipmentFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center space-x-3">
            <Settings className="text-sky-500" size={36} />
            <span>Maintenance Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Monitor and manage equipment maintenance operations</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchMaintenances} className="bg-slate-800/50 hover:bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-700/50 shadow-sm text-slate-300 font-medium transition-colors flex items-center space-x-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          {canEdit && (
            <button onClick={handleCreate} className="btn-primary flex items-center space-x-2 px-5 py-2.5">
              <Plus size={20} />
              <span>Add Maintenance</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Maintenances</p>
              <p className="text-3xl font-bold text-sky-400">{allMaintenances.length}</p>
            </div>
            <div className="p-3 bg-sky-900/30 rounded-xl">
              <Settings className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-amber-400">{allMaintenances.filter((m) => m.status === 'IN_PROGRESS').length}</p>
            </div>
            <div className="p-3 bg-amber-900/30 rounded-xl">
              <Clock className="text-amber-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Completed</p>
              <p className="text-3xl font-bold text-emerald-400">{allMaintenances.filter((m) => m.status === 'COMPLETED').length}</p>
            </div>
            <div className="p-3 bg-emerald-900/30 rounded-xl">
              <CheckCircle className="text-emerald-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Scheduled</p>
              <p className="text-3xl font-bold text-violet-400">{allMaintenances.filter((m) => m.status === 'SCHEDULED').length}</p>
            </div>
            <div className="p-3 bg-violet-900/30 rounded-xl">
              <Calendar className="text-violet-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-3">
              <div className="relative" style={{ minWidth: '320px', maxWidth: '450px', flex: '1' }}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by number, description, mechanic, or equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    fontSize: '14px',
                    color: '#cbd5e1',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: '8px',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X size={18} />
                  </button>
                )}
              </div>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field min-w-[160px]">
                <option value="">All Status</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field min-w-[160px]">
                <option value="">All Types</option>
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="input-field min-w-[160px]">
                <option value="">All Equipment</option>
                <option value="truck">Trucks</option>
                <option value="excavator">Excavators</option>
                <option value="support">Support Equipment</option>
              </select>

              {activeFiltersCount > 0 && (
                <button onClick={handleClearFilters} className="px-4 py-2 rounded-lg border border-rose-500/30 bg-rose-900/20 text-rose-400 hover:bg-rose-800/30 font-medium transition-colors flex items-center space-x-2">
                  <X size={18} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <span>
                Showing {maintenances.length} of {allMaintenances.length} records
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/50">
            <thead className="bg-gradient-to-r from-slate-800/70 to-slate-900/70">
              <tr>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('maintenanceNumber')}>
                  <div className="flex items-center justify-between">
                    <span>Maintenance #</span>
                    {sortField === 'maintenanceNumber' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Equipment</th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('maintenanceType')}>
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    {sortField === 'maintenanceType' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('actualDate')}>
                  <div className="flex items-center justify-between">
                    <span>Actual Date</span>
                    {sortField === 'actualDate' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Duration</th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('cost')}>
                  <div className="flex items-center justify-between">
                    <span>Cost</span>
                    {sortField === 'cost' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Mechanic</th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
              {maintenances.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <Settings className="text-slate-600" size={48} />
                      <p className="text-slate-400 font-medium">No maintenance records found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                maintenances.map((maintenance) => (
                  <tr key={maintenance.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="table-cell">
                      <span className="font-bold text-sky-400">{maintenance.maintenanceNumber}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{maintenance.truck?.code || maintenance.excavator?.code || maintenance.supportEquipment?.code || '-'}</span>
                        <span className="text-xs text-slate-500">{maintenance.truck?.name || maintenance.excavator?.name || maintenance.supportEquipment?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-sky-900/30 text-sky-400">{maintenance.maintenanceType}</span>
                    </td>
                    <td className="table-cell text-slate-300">{new Date(maintenance.actualDate).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <span className="font-medium text-slate-200">{maintenance.duration || '-'}</span>
                      {maintenance.duration && <span className="text-slate-500 ml-1 text-xs">hrs</span>}
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-emerald-400">{maintenance.cost ? `Rp ${maintenance.cost.toLocaleString('id-ID')}` : '-'}</span>
                    </td>
                    <td className="table-cell text-slate-300">{maintenance.mechanicName || '-'}</td>
                    <td className="table-cell">
                      <StatusBadge status={maintenance.status} />
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <button onClick={() => handleView(maintenance)} className="p-2 text-sky-400 hover:bg-sky-900/30 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(maintenance)} className="p-2 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(maintenance.id)} className="p-2 text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors" title="Delete">
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
              <div className="p-2 bg-sky-900/30 rounded-lg">
                <Plus className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Add New Maintenance</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-900/30 rounded-lg">
                <Edit className="text-emerald-400" size={24} />
              </div>
              <span className="text-slate-100">Edit Maintenance</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-900/30 rounded-lg">
                <Eye className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Maintenance Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedMaintenance ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-900/30 to-slate-900/50 p-6 rounded-xl border border-sky-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selectedMaintenance.maintenanceNumber}</h3>
                  <p className="text-slate-400 mt-1">
                    {selectedMaintenance.truck?.code || selectedMaintenance.excavator?.code || selectedMaintenance.supportEquipment?.code} -{' '}
                    {selectedMaintenance.truck?.name || selectedMaintenance.excavator?.name || selectedMaintenance.supportEquipment?.name}
                  </p>
                </div>
                <StatusBadge status={selectedMaintenance.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Wrench className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Maintenance Type</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedMaintenance.maintenanceType}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-violet-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Mechanic</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedMaintenance.mechanicName || '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-emerald-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Scheduled Date</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedMaintenance.scheduledDate ? new Date(selectedMaintenance.scheduledDate).toLocaleDateString() : '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Actual Date</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{new Date(selectedMaintenance.actualDate).toLocaleDateString()}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="text-emerald-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Completion Date</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedMaintenance.completionDate ? new Date(selectedMaintenance.completionDate).toLocaleDateString() : '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="text-violet-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Duration</label>
                </div>
                <p className="text-lg font-medium text-slate-200">
                  {selectedMaintenance.duration || '-'} {selectedMaintenance.duration && <span className="text-sm">hours</span>}
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="text-emerald-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Cost</label>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{selectedMaintenance.cost ? `Rp ${selectedMaintenance.cost.toLocaleString('id-ID')}` : '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="text-rose-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Downtime Hours</label>
                </div>
                <p className="text-lg font-medium text-slate-200">
                  {selectedMaintenance.downtimeHours || 0} <span className="text-sm">hours</span>
                </p>
              </div>

              <div className="col-span-2 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Description</label>
                </div>
                <p className="text-slate-200">{selectedMaintenance.description}</p>
              </div>

              {selectedMaintenance.partsReplaced && (
                <div className="col-span-2 bg-sky-900/20 p-4 rounded-lg border border-sky-500/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="text-sky-400" size={18} />
                    <label className="text-sm font-semibold text-slate-400">Parts Replaced</label>
                  </div>
                  <pre className="text-sm text-slate-200 whitespace-pre-wrap">{JSON.stringify(selectedMaintenance.partsReplaced, null, 2)}</pre>
                </div>
              )}

              {selectedMaintenance.remarks && (
                <div className="col-span-2 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="text-slate-400" size={18} />
                    <label className="text-sm font-semibold text-slate-400">Remarks</label>
                  </div>
                  <p className="text-slate-200">{selectedMaintenance.remarks}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
              <div className="text-sm text-slate-500">
                <span className="font-medium">Created At:</span> {new Date(selectedMaintenance.createdAt).toLocaleString()}
              </div>
              <div className="text-sm text-slate-500">
                <span className="font-medium">Updated At:</span> {new Date(selectedMaintenance.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-sky-900/20 p-4 rounded-lg border border-sky-500/20">
              <p className="text-sm text-sky-300">
                <strong>Note:</strong> Fields marked with * are required. Make sure to enter valid data for accurate maintenance tracking.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Maintenance Number *</label>
                  {modalMode === 'create' && (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMaintenanceNumberEditable((s) => !s);
                          if (maintenanceNumberEditable) {
                            const auto = generateAutoMaintenanceNumber();
                            setFormData((prev) => ({ ...prev, maintenanceNumber: auto }));
                          }
                        }}
                        className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition"
                      >
                        {maintenanceNumberEditable ? 'Auto' : 'Edit'}
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.maintenanceNumber}
                  onChange={(e) => setFormData({ ...formData, maintenanceNumber: e.target.value })}
                  className="input-field"
                  required
                  placeholder="MNT-000001"
                  disabled={modalMode === 'edit' || (modalMode === 'create' && !maintenanceNumberEditable)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Equipment Type *</label>
                <select value={formData.equipmentType} onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value, truckId: '', excavatorId: '', supportEquipmentId: '' })} className="input-field" required>
                  <option value="truck">Truck</option>
                  <option value="excavator">Excavator</option>
                  <option value="support">Support Equipment</option>
                </select>
              </div>

              {formData.equipmentType === 'truck' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Truck *</label>
                  <select value={formData.truckId} onChange={(e) => setFormData({ ...formData, truckId: e.target.value })} className="input-field" required>
                    <option value="">Select Truck</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.code} - {truck.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.equipmentType === 'excavator' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Excavator *</label>
                  <select value={formData.excavatorId} onChange={(e) => setFormData({ ...formData, excavatorId: e.target.value })} className="input-field" required>
                    <option value="">Select Excavator</option>
                    {excavators.map((excavator) => (
                      <option key={excavator.id} value={excavator.id}>
                        {excavator.code} - {excavator.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.equipmentType === 'support' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Support Equipment *</label>
                  <select value={formData.supportEquipmentId} onChange={(e) => setFormData({ ...formData, supportEquipmentId: e.target.value })} className="input-field" required>
                    <option value="">Select Support Equipment</option>
                    {supportEquipments.map((equip) => (
                      <option key={equip.id} value={equip.id}>
                        {equip.code} - {equip.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Maintenance Type *</label>
                <select value={formData.maintenanceType} onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })} className="input-field" required>
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Status *</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field" required>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Scheduled Date</label>
                <input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Actual Date *</label>
                <input type="date" value={formData.actualDate} onChange={(e) => setFormData({ ...formData, actualDate: e.target.value })} className="input-field" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Completion Date</label>
                <input type="date" value={formData.completionDate} onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Duration (hours)</label>
                <input type="number" step="1" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="input-field" placeholder="0" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Cost (Rp)</label>
                <input type="number" step="1" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="input-field" placeholder="0" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Downtime Hours</label>
                <input type="number" step="0.1" value={formData.downtimeHours} onChange={(e) => setFormData({ ...formData, downtimeHours: e.target.value })} className="input-field" placeholder="0.0" min="0" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Mechanic Name</label>
                <input type="text" value={formData.mechanicName} onChange={(e) => setFormData({ ...formData, mechanicName: e.target.value })} className="input-field" placeholder="John Doe" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Description *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows="3" required placeholder="Enter maintenance details..." />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Parts Replaced (JSON or text)</label>
                <textarea value={formData.partsReplaced} onChange={(e) => setFormData({ ...formData, partsReplaced: e.target.value })} className="input-field" rows="3" placeholder='{"parts": ["Oil Filter", "Air Filter"]}' />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Remarks</label>
                <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="input-field" rows="2" placeholder="Additional notes..." />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-700/50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="btn-primary px-6 py-2.5 flex items-center space-x-2">
                {modalMode === 'create' ? (
                  <>
                    <Plus size={18} />
                    <span>Create Maintenance</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Update Maintenance</span>
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

export default MaintenanceList;
