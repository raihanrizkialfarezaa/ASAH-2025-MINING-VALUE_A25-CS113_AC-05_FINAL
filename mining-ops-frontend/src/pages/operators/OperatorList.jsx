import React, { useEffect, useState } from 'react';
import { operatorService } from '../../services/equipmentService';
import { OPERATOR_STATUS, LICENSE_TYPE, SHIFT } from '../../config/constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

const OperatorList = () => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [formData, setFormData] = useState({
    salary: '',
    shift: '',
    status: '',
    licenseNumber: '',
    licenseType: '',
  });

  useEffect(() => {
    fetchOperators();
  }, [pagination.page]);

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res = await operatorService.getAll({ page: pagination.page, limit: pagination.limit });
      setOperators(res.data || []);
      setPagination((prev) => ({ ...prev, totalPages: res.meta?.totalPages || 1 }));
    } catch (error) {
      console.error('Failed to fetch operators:', error);
      setOperators([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (operator) => {
    setSelectedOperator(operator);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEdit = (operator) => {
    setSelectedOperator(operator);
    setFormData({
      salary: operator.salary || '',
      shift: operator.shift || '',
      status: operator.status || '',
      licenseNumber: operator.licenseNumber || '',
      licenseType: operator.licenseType || '',
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        salary: parseFloat(formData.salary),
        shift: formData.shift,
        status: formData.status,
        licenseNumber: formData.licenseNumber,
        licenseType: formData.licenseType,
      };

      await operatorService.update(selectedOperator.id, payload);
      setShowModal(false);
      fetchOperators();
    } catch (error) {
      console.error('Failed to update operator:', error);
      alert('Failed to update operator');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this operator?')) {
      try {
        await operatorService.delete(id);
        fetchOperators();
      } catch (error) {
        console.error('Failed to delete operator:', error);
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value || 0);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Operators</h1>
      </div>

      <div className="card table-container">
        <table className="data-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Employee No</th>
              <th className="table-header">Name</th>
              <th className="table-header">License Type</th>
              <th className="table-header">Shift</th>
              <th className="table-header">Status</th>
              <th className="table-header">Salary</th>
              <th className="table-header">Rating</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {operators.map((operator) => (
              <tr key={operator.id}>
                <td className="table-cell font-medium">{operator.employeeNumber}</td>
                <td className="table-cell">{operator.user?.fullName || '-'}</td>
                <td className="table-cell">{operator.licenseType}</td>
                <td className="table-cell">{operator.shift || '-'}</td>
                <td className="table-cell">
                  <StatusBadge status={operator.status} />
                </td>
                <td className="table-cell">{formatCurrency(operator.salary)}</td>
                <td className="table-cell">{operator.rating?.toFixed(1) || '-'}</td>
                <td className="table-cell">
                  <div className="flex space-x-2">
                    <button onClick={() => handleView(operator)} className="text-blue-600 hover:text-blue-800">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(operator)} className="text-green-600 hover:text-green-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(operator.id)} className="text-red-600 hover:text-red-800">
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalMode === 'edit' ? 'Edit Operator' : 'Operator Details'} size="lg">
        {modalMode === 'view' && selectedOperator ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Employee Number</label>
                <p className="text-lg">{selectedOperator.employeeNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-lg">{selectedOperator.user?.fullName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">License Type</label>
                <p className="text-lg">{selectedOperator.licenseType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">License Number</label>
                <p className="text-lg">{selectedOperator.licenseNumber || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Shift</label>
                <p className="text-lg">{selectedOperator.shift || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedOperator.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Salary</label>
                <p className="text-lg font-semibold text-green-700">{formatCurrency(selectedOperator.salary)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Rating</label>
                <p className="text-lg">{selectedOperator.rating?.toFixed(1) || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total Hours</label>
                <p className="text-lg">{selectedOperator.totalHours} hours</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Join Date</label>
                <p className="text-lg">{new Date(selectedOperator.joinDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Salary (IDR)</label>
                <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                <select value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })} className="input-field">
                  <option value="">Select Shift</option>
                  {Object.values(SHIFT).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field">
                  <option value="">Select Status</option>
                  {Object.values(OPERATOR_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Type</label>
                <select value={formData.licenseType} onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })} className="input-field">
                  <option value="">Select License</option>
                  {Object.values(LICENSE_TYPE).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input type="text" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Update Operator
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default OperatorList;
