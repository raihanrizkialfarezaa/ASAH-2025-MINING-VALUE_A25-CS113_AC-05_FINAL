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
    { value: 'MAINTENANCE_STAFF', label: 'Maintenance Staff', color: 'sky', icon: Key },
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
      ADMIN: 'bg-blue-300/20 text-blue-300 border-blue-300/30',
      SUPERVISOR: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      OPERATOR: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      DISPATCHER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      MAINTENANCE_STAFF: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    };
    return colors[role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
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
          <h1 className="text-3xl font-bold text-slate-100 flex items-center space-x-3">
            <UsersIcon className="text-sky-400" size={36} />
            <span>Users Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage user accounts, roles, and access permissions</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchUsers} className="bg-slate-800/50 hover:bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-700/50 shadow-sm text-slate-300 font-medium transition-colors flex items-center space-x-2">
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
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-900/20 to-sky-950/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-sky-400">{stats.total}</p>
            </div>
            <div className="p-3 bg-sky-500/20 rounded-xl">
              <UsersIcon className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Active</p>
              <p className="text-3xl font-bold text-cyan-400">{stats.active}</p>
            </div>
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <UserCheck className="text-cyan-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-300/20 bg-gradient-to-br from-blue-900/20 to-blue-950/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Inactive</p>
              <p className="text-3xl font-bold text-blue-300">{stats.inactive}</p>
            </div>
            <div className="p-3 bg-blue-300/20 rounded-xl">
              <UserX className="text-blue-300" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-blue-950/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Admins</p>
              <p className="text-3xl font-bold text-blue-400">{stats.admins}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Shield className="text-blue-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-900/20 to-sky-950/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Operators</p>
              <p className="text-3xl font-bold text-sky-400">{stats.operators}</p>
            </div>
            <div className="p-3 bg-sky-500/20 rounded-xl">
              <User className="text-sky-400" size={28} />
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
                  placeholder="Search by username, name, or email..."
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

              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field min-w-[180px] bg-slate-900/50 border-slate-700 text-slate-200">
                <option value="">All Roles</option>
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field min-w-[140px] bg-slate-900/50 border-slate-700 text-slate-200">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                Showing {users.length} of {allUsers.length} users
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                <Filter size={18} />
                <span>Role Distribution</span>
              </h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-blue-300">{stats.admins}</p>
                  <p className="text-xs text-slate-400">Admins</p>
                </div>
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-sky-400">{stats.supervisors}</p>
                  <p className="text-xs text-slate-400">Supervisors</p>
                </div>
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-cyan-400">{stats.operators}</p>
                  <p className="text-xs text-slate-400">Operators</p>
                </div>
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-blue-400">{stats.dispatchers}</p>
                  <p className="text-xs text-slate-400">Dispatchers</p>
                </div>
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-sky-400">{stats.maintenance}</p>
                  <p className="text-xs text-slate-400">Maintenance</p>
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
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('username')}>
                  <div className="flex items-center justify-between">
                    <span>Username</span>
                    {sortField === 'username' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('fullName')}>
                  <div className="flex items-center justify-between">
                    <span>Full Name</span>
                    {sortField === 'fullName' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('email')}>
                  <div className="flex items-center justify-between">
                    <span>Email</span>
                    {sortField === 'email' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('role')}>
                  <div className="flex items-center justify-between">
                    <span>Role</span>
                    {sortField === 'role' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Status</th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('lastLogin')}>
                  <div className="flex items-center justify-between">
                    <span>Last Login</span>
                    {sortField === 'lastLogin' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center justify-between">
                    <span>Created</span>
                    {sortField === 'createdAt' && (sortOrder === 'asc' ? <SortAsc size={16} className="text-sky-400" /> : <SortDesc size={16} className="text-sky-400" />)}
                  </div>
                </th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <UsersIcon className="text-slate-500" size={48} />
                      <p className="text-slate-400 font-medium">No users found</p>
                      <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center">
                          <User className="text-sky-400" size={16} />
                        </div>
                        <span className="font-bold text-sky-400">{user.username}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-slate-200">{user.fullName}</span>
                    </td>
                    <td className="table-cell">
                      {user.email ? (
                        <div className="flex items-center space-x-1 text-slate-300">
                          <Mail size={14} className="text-slate-500" />
                          <span>{user.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
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
                          user.isActive ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-blue-300/20 text-blue-300 hover:bg-blue-300/30'
                        }`}
                      >
                        {user.isActive ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-1 text-slate-400 text-sm">
                        <Clock size={14} className="text-slate-500" />
                        <span>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-1 text-slate-400 text-sm">
                        <Calendar size={14} className="text-slate-500" />
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <button onClick={() => handleView(user)} className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button onClick={() => handleEdit(user)} className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(user.id)} className="p-2 text-blue-300 hover:bg-blue-300/20 rounded-lg transition-colors" title="Deactivate">
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
          modalMode === 'create' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-500/20 rounded-lg">
                <Plus className="text-sky-400" size={24} />
              </div>
              <span className="text-slate-100">Add New User</span>
            </div>
          ) : modalMode === 'edit' ? (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Edit className="text-cyan-400" size={24} />
              </div>
              <span className="text-slate-100">Edit User</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Eye className="text-blue-400" size={24} />
              </div>
              <span className="text-slate-100">User Details</span>
            </div>
          )
        }
        size="2xl"
      >
        {modalMode === 'view' && selectedUser ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-900/30 to-sky-950/30 p-6 rounded-xl border border-sky-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center">
                    <User className="text-sky-400" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-100">{selectedUser.fullName}</h3>
                    <p className="text-slate-400">@{selectedUser.username}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium border ${getRoleColor(selectedUser.role)}`}>
                    {getRoleIcon(selectedUser.role)}
                    <span>{selectedUser.role.replace('_', ' ')}</span>
                  </span>
                  <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium ${selectedUser.isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-300/20 text-blue-300'}`}>
                    {selectedUser.isActive ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>{selectedUser.isActive ? 'Active' : 'Inactive'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Username</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedUser.username}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Email</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedUser.email || '-'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="text-blue-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Role</label>
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium border ${getRoleColor(selectedUser.role)}`}>
                  {getRoleIcon(selectedUser.role)}
                  <span>{selectedUser.role.replace('_', ' ')}</span>
                </span>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Status</label>
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium ${selectedUser.isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-300/20 text-blue-300'}`}>
                  {selectedUser.isActive ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{selectedUser.isActive ? 'Active' : 'Inactive'}</span>
                </span>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="text-sky-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Last Login</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : 'Never logged in'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-blue-300" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Created At</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{formatDateTime(selectedUser.createdAt)}</p>
              </div>

              <div className="col-span-2 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-cyan-400" size={18} />
                  <label className="text-sm font-semibold text-slate-400">Last Updated</label>
                </div>
                <p className="text-lg font-medium text-slate-200">{formatDateTime(selectedUser.updatedAt)}</p>
              </div>
            </div>

            {selectedUser.operatorProfile && (
              <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 p-4 rounded-lg border border-cyan-500/20">
                <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center space-x-2">
                  <UserCheck className="text-cyan-400" size={20} />
                  <span>Operator Profile</span>
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Employee Number</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.employeeNumber || '-'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">License Number</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.licenseNumber || '-'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">License Type</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.licenseType || '-'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Shift</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.shift || '-'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.status || '-'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Rating</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.rating || '-'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Total Hours</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.totalHours || 0} hrs</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Join Date</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.joinDate ? formatDate(selectedUser.operatorProfile.joinDate) : '-'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">License Expiry</p>
                    <p className="font-semibold text-slate-200">{selectedUser.operatorProfile.licenseExpiry ? formatDate(selectedUser.operatorProfile.licenseExpiry) : '-'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-500">
                <strong className="text-slate-400">User ID:</strong> {selectedUser.id}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20">
              <p className="text-sm text-sky-300">
                <strong>Note:</strong> Fields marked with * are required. {modalMode === 'create' && 'Password must contain at least 8 characters with uppercase, lowercase, and number.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`input-field bg-slate-900/50 border-slate-700 text-slate-200 ${formErrors.username ? 'border-blue-300' : ''}`}
                  required
                  placeholder="johndoe"
                  disabled={modalMode === 'edit'}
                />
                {formErrors.username && <p className="text-blue-300 text-xs mt-1">{formErrors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`input-field bg-slate-900/50 border-slate-700 text-slate-200 ${formErrors.fullName ? 'border-blue-300' : ''}`}
                  required
                  placeholder="John Doe"
                />
                {formErrors.fullName && <p className="text-blue-300 text-xs mt-1">{formErrors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`input-field bg-slate-900/50 border-slate-700 text-slate-200 ${formErrors.email ? 'border-blue-300' : ''}`}
                  placeholder="john@example.com"
                />
                {formErrors.email && <p className="text-blue-300 text-xs mt-1">{formErrors.email}</p>}
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`input-field bg-slate-900/50 border-slate-700 text-slate-200 ${formErrors.password ? 'border-blue-300' : ''}`}
                    required
                    placeholder="********"
                  />
                  {formErrors.password && <p className="text-blue-300 text-xs mt-1">{formErrors.password}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Role *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200" required>
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                <select value={formData.isActive.toString()} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="input-field bg-slate-900/50 border-slate-700 text-slate-200">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
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
