import React, { useEffect, useState } from 'react';
import { truckService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Edit, Trash2, Eye, Activity, Filter } from 'lucide-react';

const TruckList = () => {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [selectedTruck, setSelectedTruck] = useState(null);
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
    capacity: '',
    fuelCapacity: '',
    yearManufacture: '',
  });

  useEffect(() => {
    fetchTrucks();
  }, [pagination.page, statusFilter]);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      let res;
      if (statusFilter) {
        res = await truckService.getByStatus(statusFilter);
        // Adjust response structure if getByStatus returns array directly
        if (Array.isArray(res)) {
          setTrucks(res);
          setPagination({ page: 1, limit: 10, totalPages: 1 }); // Reset pagination for filter
        } else {
          setTrucks(res.data || []);
          setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
        }
      } else {
        res = await truckService.getAll({ page: pagination.page, limit: pagination.limit });
        setTrucks(res.data || []);
        setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
      }
    } catch (error) {
      console.error('Failed to fetch trucks:', error);
      setTrucks([]);
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
      capacity: '',
      fuelCapacity: '',
      yearManufacture: '',
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

      const codeRegex = /^[A-Z]{1,2}-\d{3,4}$/;
      if (modalMode === 'create') {
        if (!payload.code || !codeRegex.test(payload.code)) {
          window.alert('Invalid code. Format examples: H-001 or HA-0001');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trucks</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-8">
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="OPERATING">Operating</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="BREAKDOWN">Breakdown</option>
            </select>
            <Filter className="absolute left-2 top-2.5 text-gray-400" size={16} />
          </div>
          <button onClick={handleCreate} className="btn-primary flex items-center space-x-2">
            <Plus size={20} />
            <span>Add Truck</span>
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
              <th className="table-header">Capacity (ton)</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trucks.map((truck) => (
              <tr key={truck.id}>
                <td className="table-cell font-medium">{truck.code}</td>
                <td className="table-cell">{truck.name}</td>
                <td className="table-cell">{truck.brand || '-'}</td>
                <td className="table-cell">{truck.model || '-'}</td>
                <td className="table-cell">{truck.capacity}</td>
                <td className="table-cell">
                  <StatusBadge status={truck.status} />
                </td>
                <td className="table-cell">
                  <div className="flex space-x-2">
                    <button onClick={() => handleView(truck)} className="text-blue-600 hover:text-blue-800" title="View Details">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(truck)} className="text-green-600 hover:text-green-800" title="Edit">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handlePerformance(truck)} className="text-purple-600 hover:text-purple-800" title="Performance">
                      <Activity size={18} />
                    </button>
                    <button onClick={() => handleDelete(truck.id)} className="text-red-600 hover:text-red-800" title="Delete">
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalMode === 'create' ? 'Add New Truck' : modalMode === 'edit' ? 'Edit Truck' : 'Truck Details'} size="lg">
        {modalMode === 'view' && selectedTruck ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Code</label>
                <p className="text-lg">{selectedTruck.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-lg">{selectedTruck.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Brand</label>
                <p className="text-lg">{selectedTruck.brand || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Model</label>
                <p className="text-lg">{selectedTruck.model || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Capacity</label>
                <p className="text-lg">{selectedTruck.capacity} ton</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedTruck.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total Hours</label>
                <p className="text-lg">{selectedTruck.totalHours} hours</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total Distance</label>
                <p className="text-lg">{selectedTruck.totalDistance} km</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (ton) *</label>
                <input type="number" step="0.1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Capacity (liter)</label>
                <input type="number" step="0.1" value={formData.fuelCapacity} onChange={(e) => setFormData({ ...formData, fuelCapacity: e.target.value })} className="input-field" />
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

      <Modal isOpen={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} title={`Performance: ${selectedTruck?.code}`} size="md">
        {performanceData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-xl font-bold text-blue-700">{performanceData.totalTrips || 0}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Production</p>
                <p className="text-xl font-bold text-green-700">{performanceData.totalProduction || 0} ton</p>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <p className="text-sm text-gray-600">Fuel Consumed</p>
                <p className="text-xl font-bold text-orange-700">{performanceData.totalFuel || 0} L</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-xl font-bold text-purple-700">{performanceData.totalProduction > 0 ? (performanceData.totalFuel / performanceData.totalProduction).toFixed(2) : 0} L/ton</p>
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

export default TruckList;
