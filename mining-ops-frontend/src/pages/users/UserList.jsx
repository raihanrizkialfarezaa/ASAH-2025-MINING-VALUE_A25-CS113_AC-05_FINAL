import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { userService } from '../../services';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Plus, Edit, Trash2, Eye, Filter, Search, X, SortAsc, SortDesc, RefreshCw, ChevronDown, Users as UsersIcon, Calendar, Shield, User, Clock, AlertCircle, CheckCircle, Mail, UserCheck, UserX, Activity, Key } from 'lucide-react';
import { authService } from '../../services/authService';

const UserList = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = currentUser?.role === 'ADMIN';
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'SUPERVISOR',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const roleOptions = [
    { value: 'ADMIN', label: 'Admin', color: 'red', icon: Shield },
    { value: 'SUPERVISOR', label: 'Supervisor', color: 'blue', icon: UserCheck },
    { value: 'OPERATOR', label: 'Operator', color: 'green', icon: User },
    { value: 'DISPATCHER', label: 'Dispatcher', color: 'purple', icon: Activity },
    { value: 'MAINTENANCE_STAFF', label: 'Maintenance Staff', color: 'orange', icon: Key },
  ];

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allUsers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user) => user.username?.toLowerCase().includes(query) || user.fullName?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query));
    }

    if (roleFilter) {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'username' || sortField === 'fullName' || sortField === 'email' || sortField === 'role') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }

      if (sortField === 'createdAt' || sortField === 'updatedAt' || sortField === 'lastLogin') {
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

    setUsers(paginatedData);
    setPagination((prev) => ({ ...prev, totalPages }));
  }, [allUsers, searchQuery, roleFilter, statusFilter, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const pageLimit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await userService.getAll({ page: currentPage, limit: pageLimit });
        const pageData = res.data || [];
        allData = [...allData, ...pageData];

        if (pageData.length < pageLimit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setAllUsers(allData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setAllUsers([]);
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
    setRoleFilter('');
    setStatusFilter('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const validateForm = () => {
    const errors = {};

    if (modalMode === 'create') {
      if (!formData.username || formData.username.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = 'Username can only contain letters, numbers, and underscores';
      }

      if (!formData.password || formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Password must contain uppercase, lowercase, and number';
      }
    }

    if (!formData.fullName || formData.fullName.trim().length < 3) {
      errors.fullName = 'Full name must be at least 3 characters';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'SUPERVISOR',
      isActive: true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleView = async (user) => {
    try {
      const detailUser = await userService.getById(user.id);
      setSelectedUser(detailUser.data || detailUser);
      setModalMode('view');
      setShowModal(true);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      setSelectedUser(user);
      setModalMode('view');
      setShowModal(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const payload = {};

      if (modalMode === 'create') {
        payload.username = formData.username.trim();
        payload.password = formData.password;
      }

      payload.fullName = formData.fullName.trim();
      payload.role = formData.role;
      payload.isActive = formData.isActive;

      if (formData.email && formData.email.trim()) {
        payload.email = formData.email.trim();
      }

      if (modalMode === 'create') {
        await userService.create(payload);
      } else {
        await userService.update(selectedUser.id, payload);
      }

      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else if (error.response?.data?.data) {
        const errors = error.response.data.data;
        const errorMessages = Array.isArray(errors) ? errors.map((e) => e.msg).join('\n') : JSON.stringify(errors);
        window.alert(errorMessages);
      } else {
        window.alert('Failed to save user. Please check your input.');
      }
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await userService.toggleActive(user.id);
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      window.alert('Failed to toggle user status.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        await userService.delete(id);
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        window.alert('Failed to delete user.');
      }
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleColor = (role) => {
    const colors = {
      ADMIN: 'bg-red-100 text-red-800 border-red-200',
      SUPERVISOR: 'bg-blue-100 text-blue-800 border-blue-200',
      OPERATOR: 'bg-green-100 text-green-800 border-green-200',
      DISPATCHER: 'bg-purple-100 text-purple-800 border-purple-200',
      MAINTENANCE_STAFF: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = (role) => {
    const icons = {
      ADMIN: Shield,
      SUPERVISOR: UserCheck,
      OPERATOR: User,
      DISPATCHER: Activity,
      MAINTENANCE_STAFF: Key,
    };
    const Icon = icons[role] || User;
    return <Icon size={14} />;
  };

  const activeFiltersCount = [searchQuery, roleFilter, statusFilter].filter(Boolean).length;

  const stats = useMemo(() => {
    return {
      total: allUsers.length,
      active: allUsers.filter((u) => u.isActive).length,
      inactive: allUsers.filter((u) => !u.isActive).length,
      admins: allUsers.filter((u) => u.role === 'ADMIN').length,
      supervisors: allUsers.filter((u) => u.role === 'SUPERVISOR').length,
      operators: allUsers.filter((u) => u.role === 'OPERATOR').length,
      dispatchers: allUsers.filter((u) => u.role === 'DISPATCHER').length,
      maintenance: allUsers.filter((u) => u.role === 'MAINTENANCE_STAFF').length,
    };
  }, [allUsers]);

  if (loading && !users.length) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <UsersIcon className="text-blue-600" size={36} />
            <span>Users Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage user accounts, roles, and access permissions</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchUsers} className="bg-white hover:bg-gray-50 px-4 py-2 rounded-lg border shadow-sm text-gray-700 font-medium transition-colors flex items-center space-x-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          {canEdit && (
            <button onClick={handleCreate} className="btn-primary flex items-center space-x-2 px-5 py-2.5">
              <Plus size={20} />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <UsersIcon className="text-blue-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <UserCheck className="text-green-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Inactive</p>
              <p className="text-3xl font-bold text-red-600">{stats.inactive}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <UserX className="text-red-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Admins</p>
              <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Shield className="text-purple-600" size={28} />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Operators</p>
              <p className="text-3xl font-bold text-orange-600">{stats.operators}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <User className="text-orange-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-3">
              <div className="relative" style={{ minWidth: '320px', maxWidth: '450px', flex: '1' }}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by username, name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    fontSize: '14px',
                    color: '#1f2937',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                )}
              </div>

              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field min-w-[180px]">
                <option value="">All Roles</option>
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field min-w-[140px]">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors flex items-center space-x-2 ${
                  showAdvancedFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
                <ChevronDown className={`transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} size={16} />
              </button>

              {activeFiltersCount > 0 && (
                <button onClick={handleClearFilters} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center space-x-2">
                  <X size={18} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>
                Showing {users.length} of {allUsers.length} users
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Filter size={18} />
                <span>Role Distribution</span>
              </h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
                  <p className="text-xs text-gray-600">Admins</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-2xl font-bold text-blue-600">{stats.supervisors}</p>
                  <p className="text-xs text-gray-600">Supervisors</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-2xl font-bold text-green-600">{stats.operators}</p>
                  <p className="text-xs text-gray-600">Operators</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-2xl font-bold text-purple-600">{stats.dispatchers}</p>
                  <p className="text-xs text-gray-600">Dispatchers</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-2xl font-bold text-orange-600">{stats.maintenance}</p>
                  <p className="text-xs text-gray-600">Maintenance</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('username')}>
                  <div className="flex items-center justify-between">
                    <span>Username</span>
                    {sortField === 'username' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('fullName')}>
                  <div className="flex items-center justify-between">
                    <span>Full Name</span>
                    {sortField === 'fullName' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('email')}>
                  <div className="flex items-center justify-between">
                    <span>Email</span>
                    {sortField === 'email' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('role')}>
                  <div className="flex items-center justify-between">
                    <span>Role</span>
                    {sortField === 'role' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header">Status</th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('lastLogin')}>
                  <div className="flex items-center justify-between">
                    <span>Last Login</span>
                    {sortField === 'lastLogin' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-gray-200 transition-colors group" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center justify-between">
                    <span>Created</span>
                    {sortField === 'createdAt' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-blue-600" />)}
                  </div>
                </th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <UsersIcon className="text-gray-400" size={48} />
                      <p className="text-gray-500 font-medium">No users found</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="text-blue-600" size={16} />
                        </div>
                        <span className="font-bold text-blue-600">{user.username}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{user.fullName}</span>
                    </td>
                    <td className="table-cell">
                      {user.email ? (
                        <div className="flex items-center space-x-1 text-gray-700">
                          <Mail size={14} className="text-gray-400" />
                          <span>{user.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span>{user.role.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          user.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {user.isActive ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-1 text-gray-600 text-sm">
                        <Clock size={14} className="text-gray-400" />
                        <span>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-1 text-gray-600 text-sm">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <button onClick={() => handleView(user)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(user)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Deactivate">
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
          <label className="text-sm text-gray-600 flex items-center space-x-2">
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="text-blue-600" size={24} />
              </div>
              <span>Add New User</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Edit className="text-green-600" size={24} />
              </div>
              <span>Edit User</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="text-purple-600" size={24} />
              </div>
              <span>User Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedUser ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedUser.fullName}</h3>
                    <p className="text-gray-600">@{selectedUser.username}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium border ${getRoleColor(selectedUser.role)}`}>
                    {getRoleIcon(selectedUser.role)}
                    <span>{selectedUser.role.replace('_', ' ')}</span>
                  </span>
                  <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium ${selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedUser.isActive ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>{selectedUser.isActive ? 'Active' : 'Inactive'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-blue-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Username</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedUser.username}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="text-green-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Email</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedUser.email || '-'}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="text-purple-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Role</label>
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium border ${getRoleColor(selectedUser.role)}`}>
                  {getRoleIcon(selectedUser.role)}
                  <span>{selectedUser.role.replace('_', ' ')}</span>
                </span>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="text-orange-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium ${selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {selectedUser.isActive ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{selectedUser.isActive ? 'Active' : 'Inactive'}</span>
                </span>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="text-indigo-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Last Login</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : 'Never logged in'}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-red-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Created At</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{formatDateTime(selectedUser.createdAt)}</p>
              </div>

              <div className="col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-cyan-600" size={18} />
                  <label className="text-sm font-semibold text-gray-600">Last Updated</label>
                </div>
                <p className="text-lg font-medium text-gray-900">{formatDateTime(selectedUser.updatedAt)}</p>
              </div>
            </div>

            {selectedUser.operatorProfile && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <UserCheck className="text-green-600" size={20} />
                  <span>Operator Profile</span>
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">Employee Number</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.employeeNumber || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">License Number</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.licenseNumber || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">License Type</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.licenseType || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">Shift</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.shift || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.status || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">Rating</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.rating || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">Total Hours</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.totalHours || 0} hrs</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">Join Date</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.joinDate ? formatDate(selectedUser.operatorProfile.joinDate) : '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">License Expiry</p>
                    <p className="font-semibold text-gray-900">{selectedUser.operatorProfile.licenseExpiry ? formatDate(selectedUser.operatorProfile.licenseExpiry) : '-'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>User ID:</strong> {selectedUser.id}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Fields marked with * are required. {modalMode === 'create' && 'Password must contain at least 8 characters with uppercase, lowercase, and number.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`input-field ${formErrors.username ? 'border-red-500' : ''}`}
                  required
                  placeholder="johndoe"
                  disabled={modalMode === 'edit'}
                />
                {formErrors.username && <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`input-field ${formErrors.fullName ? 'border-red-500' : ''}`}
                  required
                  placeholder="John Doe"
                />
                {formErrors.fullName && <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`input-field ${formErrors.email ? 'border-red-500' : ''}`} placeholder="john@example.com" />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`input-field ${formErrors.password ? 'border-red-500' : ''}`}
                    required
                    placeholder="********"
                  />
                  {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="input-field" required>
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select value={formData.isActive.toString()} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="input-field">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="btn-primary px-6 py-2.5 flex items-center space-x-2">
                {modalMode === 'create' ? (
                  <>
                    <Plus size={18} />
                    <span>Create User</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Update User</span>
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

export default UserList;
