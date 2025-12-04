import React, { useEffect, useState } from 'react';
import { maintenanceService } from '../../services';
import { truckService, excavatorService } from '../../services/equipmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

const MaintenanceList = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [trucks, setTrucks] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [formData, setFormData] = useState({
    maintenanceNumber: '',
    equipmentType: 'truck',
    truckId: '',
    excavatorId: '',
    maintenanceType: 'PREVENTIVE',
    scheduledDate: '',
    actualDate: '',
    completionDate: '',
    duration: '',
    cost: '',
    description: '',
    mechanicName: '',
    status: 'SCHEDULED',
    remarks: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await maintenanceService.getAll({ page: pagination.page, limit: pagination.limit });
        setMaintenances(res.data || []);
        setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
      } catch (error) {
        console.error('Failed to fetch maintenance logs:', error);
        setMaintenances([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const [trucksRes, excavatorsRes] = await Promise.all([truckService.getAll({ limit: 100 }), excavatorService.getAll({ limit: 100 })]);
        setTrucks(trucksRes.data || []);
        setExcavators(excavatorsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch equipment:', error);
      }
    };
    loadEquipment();
  }, []);

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const res = await maintenanceService.getAll({ page: pagination.page, limit: pagination.limit });
      setMaintenances(res.data || []);
      setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
    } catch (error) {
      console.error('Failed to fetch maintenance logs:', error);
      setMaintenances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      maintenanceNumber: '',
      equipmentType: 'truck',
      truckId: '',
      excavatorId: '',
      maintenanceType: 'PREVENTIVE',
      scheduledDate: '',
      actualDate: new Date().toISOString().split('T')[0],
      completionDate: '',
      duration: '',
      cost: '',
      description: '',
      mechanicName: '',
      status: 'SCHEDULED',
      remarks: '',
    });
    setShowModal(true);
  };

  const handleEdit = (maintenance) => {
    setModalMode('edit');
    setSelectedMaintenance(maintenance);
    setFormData({
      maintenanceNumber: maintenance.maintenanceNumber,
      equipmentType: maintenance.truckId ? 'truck' : 'excavator',
      truckId: maintenance.truckId || '',
      excavatorId: maintenance.excavatorId || '',
      maintenanceType: maintenance.maintenanceType,
      scheduledDate: maintenance.scheduledDate ? new Date(maintenance.scheduledDate).toISOString().split('T')[0] : '',
      actualDate: new Date(maintenance.actualDate).toISOString().split('T')[0],
      completionDate: maintenance.completionDate ? new Date(maintenance.completionDate).toISOString().split('T')[0] : '',
      duration: maintenance.duration || '',
      cost: maintenance.cost || '',
      description: maintenance.description,
      mechanicName: maintenance.mechanicName || '',
      status: maintenance.status,
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
      }

      if (formData.scheduledDate) payload.scheduledDate = new Date(formData.scheduledDate).toISOString();
      if (formData.completionDate) payload.completionDate = new Date(formData.completionDate).toISOString();
      if (formData.duration) payload.duration = parseInt(formData.duration);
      if (formData.cost) payload.cost = parseFloat(formData.cost);
      if (formData.mechanicName) payload.mechanicName = formData.mechanicName.trim();
      if (formData.remarks) payload.remarks = formData.remarks.trim();

      if (modalMode === 'create') {
        if (!payload.maintenanceNumber) {
          window.alert('Maintenance number is required');
          return;
        }
        if (!payload.truckId && !payload.excavatorId) {
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

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Maintenance Logs</h1>
        <button onClick={handleCreate} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Add Maintenance</span>
        </button>
      </div>

      <div className="card table-container">
        <table className="data-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Maintenance Number</th>
              <th className="table-header">Equipment</th>
              <th className="table-header">Type</th>
              <th className="table-header">Date</th>
              <th className="table-header">Duration (hours)</th>
              <th className="table-header">Cost</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {maintenances.map((maintenance) => (
              <tr key={maintenance.id}>
                <td className="table-cell font-medium">{maintenance.maintenanceNumber}</td>
                <td className="table-cell">{maintenance.truck?.code || maintenance.excavator?.code || maintenance.supportEquipment?.code || '-'}</td>
                <td className="table-cell">{maintenance.maintenanceType}</td>
                <td className="table-cell">{new Date(maintenance.actualDate).toLocaleDateString()}</td>
                <td className="table-cell">{maintenance.duration || '-'}</td>
                <td className="table-cell">${maintenance.cost?.toLocaleString() || '-'}</td>
                <td className="table-cell">
                  <StatusBadge status={maintenance.status} />
                </td>
                <td className="table-cell">
                  <div className="flex space-x-2">
                    <button onClick={() => handleView(maintenance)} className="text-blue-600 hover:text-blue-800">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(maintenance)} className="text-green-600 hover:text-green-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(maintenance.id)} className="text-red-600 hover:text-red-800">
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalMode === 'create' ? 'Add Maintenance' : modalMode === 'edit' ? 'Edit Maintenance' : 'Maintenance Details'} size="lg">
        {modalMode === 'view' && selectedMaintenance ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Maintenance Number</label>
                <p className="text-lg">{selectedMaintenance.maintenanceNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Equipment</label>
                <p className="text-lg">{selectedMaintenance.truck?.name || selectedMaintenance.excavator?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="text-lg">{selectedMaintenance.maintenanceType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedMaintenance.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Actual Date</label>
                <p className="text-lg">{new Date(selectedMaintenance.actualDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Duration</label>
                <p className="text-lg">{selectedMaintenance.duration || '-'} hours</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Cost</label>
                <p className="text-lg">${selectedMaintenance.cost?.toLocaleString() || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Mechanic</label>
                <p className="text-lg">{selectedMaintenance.mechanicName || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-lg">{selectedMaintenance.description}</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Number *</label>
                <input type="text" value={formData.maintenanceNumber} onChange={(e) => setFormData({ ...formData, maintenanceNumber: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type *</label>
                <select value={formData.equipmentType} onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value, truckId: '', excavatorId: '' })} className="input-field" required>
                  <option value="truck">Truck</option>
                  <option value="excavator">Excavator</option>
                </select>
              </div>
              {formData.equipmentType === 'truck' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Truck *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Excavator *</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Type *</label>
                <select value={formData.maintenanceType} onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })} className="input-field" required>
                  <option value="PREVENTIVE">Preventive</option>
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="PREDICTIVE">Predictive</option>
                  <option value="OVERHAUL">Overhaul</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Actual Date *</label>
                <input type="date" value={formData.actualDate} onChange={(e) => setFormData({ ...formData, actualDate: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date</label>
                <input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Completion Date</label>
                <input type="date" value={formData.completionDate} onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
                <input type="number" step="1" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost ($)</label>
                <input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mechanic Name</label>
                <input type="text" value={formData.mechanicName} onChange={(e) => setFormData({ ...formData, mechanicName: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field" required>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows="3" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="input-field" rows="2" />
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
    </div>
  );
};

export default MaintenanceList;
