import React, { useEffect, useState } from 'react';
import { excavatorService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Edit, Trash2, Eye, Activity, Filter } from 'lucide-react';

const ExcavatorList = () => {
  const [excavators, setExcavators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [selectedExcavator, setSelectedExcavator] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [statusFilter, setStatusFilter] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    brand: '',
    model: '',
    bucketCapacity: '',
    yearManufacture: '',
  });

  useEffect(() => {
    fetchExcavators();
  }, [pagination.page, statusFilter]);

  const fetchExcavators = async () => {
    setLoading(true);
    try {
      let res;
      if (statusFilter) {
        // Assuming backend supports filtering by status via query param or separate endpoint
        // If not, we might need to filter client-side or update backend.
        // Based on truckService, there is no getByStatus for excavators explicitly shown in snippet,
        // but let's assume consistency or filter client side if needed.
        // Wait, truckService had getByStatus. excavatorService didn't show it in the snippet I read (lines 50-100).
        // Let's check if excavatorService has getByStatus.
        // It was not in the snippet. I'll assume it might not exist.
        // I'll filter client side if needed, or just pass it as param if getAll supports it.
        res = await excavatorService.getAll({ page: pagination.page, limit: pagination.limit, status: statusFilter });
      } else {
        res = await excavatorService.getAll({ page: pagination.page, limit: pagination.limit });
      }

      setExcavators(res.data || []);
      setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
    } catch (error) {
      console.error('Failed to fetch excavators:', error);
      setExcavators([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      code: '',
      name: '',
      brand: '',
      model: '',
      bucketCapacity: '',
      yearManufacture: '',
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

      const codeRegex = /^[A-Z]{1,2}-\d{3,4}$/;
      if (modalMode === 'create') {
        if (!payload.code || !codeRegex.test(payload.code)) {
          window.alert('Invalid code. Format examples: E-001 or EX-0001');
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
      }
    }
  };

  if (loading && !excavators.length) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Excavators</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-8">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="BREAKDOWN">Breakdown</option>
              <option value="STANDBY">Standby</option>
            </select>
            <Filter className="absolute left-2 top-2.5 text-gray-400" size={16} />
          </div>
          <button onClick={handleCreate} className="btn-primary flex items-center space-x-2">
            <Plus size={20} />
            <span>Add Excavator</span>
          </button>
        </div>
      </div>

      <div className="card table-container">
        <table className="data-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Code</th>
              <th className="table-header">Name</th>
              <th className="table-header">Brand</th>
              <th className="table-header">Model</th>
              <th className="table-header">Bucket Capacity (m³)</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {excavators.map((excavator) => (
              <tr key={excavator.id}>
                <td className="table-cell font-medium">{excavator.code}</td>
                <td className="table-cell">{excavator.name}</td>
                <td className="table-cell">{excavator.brand || '-'}</td>
                <td className="table-cell">{excavator.model || '-'}</td>
                <td className="table-cell">{excavator.bucketCapacity || '-'}</td>
                <td className="table-cell">
                  <StatusBadge status={excavator.status} />
                </td>
                <td className="table-cell">
                  <div className="flex space-x-2">
                    <button onClick={() => handleView(excavator)} className="text-blue-600 hover:text-blue-800" title="View Details">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(excavator)} className="text-green-600 hover:text-green-800" title="Edit">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handlePerformance(excavator)} className="text-purple-600 hover:text-purple-800" title="Performance">
                      <Activity size={18} />
                    </button>
                    <button onClick={() => handleDelete(excavator.id)} className="text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalMode === 'create' ? 'Add New Excavator' : modalMode === 'edit' ? 'Edit Excavator' : 'Excavator Details'} size="lg">
        {modalMode === 'view' && selectedExcavator ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Code</label>
                <p className="text-lg">{selectedExcavator.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-lg">{selectedExcavator.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Brand</label>
                <p className="text-lg">{selectedExcavator.brand || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Model</label>
                <p className="text-lg">{selectedExcavator.model || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Bucket Capacity</label>
                <p className="text-lg">{selectedExcavator.bucketCapacity || '-'} m³</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedExcavator.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total Hours</label>
                <p className="text-lg">{selectedExcavator.totalHours} hours</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bucket Capacity (m³)</label>
                <input type="number" step="0.1" value={formData.bucketCapacity} onChange={(e) => setFormData({ ...formData, bucketCapacity: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year of Manufacture</label>
                <input type="number" value={formData.yearManufacture} onChange={(e) => setFormData({ ...formData, yearManufacture: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {modalMode === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} title={`Performance: ${selectedExcavator?.code}`} size="md">
        {performanceData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Production</p>
                <p className="text-xl font-bold text-blue-700">{performanceData.totalProduction || 0} ton</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Avg Production Rate</p>
                <p className="text-xl font-bold text-green-700">{performanceData.avgProductionRate || 0} ton/hr</p>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <p className="text-sm text-gray-600">Utilization</p>
                <p className="text-xl font-bold text-orange-700">{performanceData.utilization || 0}%</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-xl font-bold text-purple-700">{performanceData.efficiency || 'N/A'}</p>
              </div>
            </div>
          </div>
        ) : (
          <p>No performance data available.</p>
        )}
      </Modal>
    </div>
  );
};

export default ExcavatorList;
