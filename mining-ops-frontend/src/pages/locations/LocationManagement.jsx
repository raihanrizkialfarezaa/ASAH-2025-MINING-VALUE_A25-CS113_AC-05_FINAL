import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { miningSiteService, loadingPointService, dumpingPointService, roadSegmentService } from '../../services/locationService';
import { excavatorService } from '../../services';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import MiningMap from '../../components/MiningMap';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import MapPicker from '../../components/common/MapPicker';
import { MapPin, ArrowRight, Activity, Plus, Edit, Trash2, Eye, Map as MapIcon, List, Search, X, RefreshCw, Filter, SortAsc, SortDesc, CheckCircle, XCircle, Navigation, Layers, Route, TrendingUp } from 'lucide-react';
import { authService } from '../../services/authService';

const LocationManagement = () => {
  const currentUser = authService.getCurrentUser();
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role);
  const [activeTab, setActiveTab] = useState('sites');
  const [viewMode, setViewMode] = useState('list');
  const [sites, setSites] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState([]);
  const [allLoadingPoints, setAllLoadingPoints] = useState([]);
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [allDumpingPoints, setAllDumpingPoints] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [allRoadSegments, setAllRoadSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [excavators, setExcavators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1 });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    siteType: 'PIT',
    capacity: '',
    latitude: '',
    longitude: '',
    elevation: '',
    description: '',
    isActive: true,
    miningSiteId: '',
    excavatorId: '',
    coalSeam: '',
    coalQuality: { calorie: '', moisture: '', ash_content: '', sulfur: '' },
    maxQueueSize: 5,
    dumpingType: 'STOCKPILE',
    currentStock: '',
    startPoint: '',
    endPoint: '',
    distance: '',
    roadCondition: 'GOOD',
    maxSpeed: 30,
    gradient: '',
    lastMaintenance: '',
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);

  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [];

    if (activeTab === 'sites') {
      filtered = [...allSites];
    } else if (activeTab === 'loading') {
      filtered = [...allLoadingPoints];
    } else if (activeTab === 'dumping') {
      filtered = [...allDumpingPoints];
    } else if (activeTab === 'roads') {
      filtered = [...allRoadSegments];
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) => item.code?.toLowerCase().includes(query) || item.name?.toLowerCase().includes(query) || item.miningSite?.name?.toLowerCase().includes(query) || item.miningSite?.code?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((item) => {
        if (statusFilter === 'active') return item.isActive === true;
        if (statusFilter === 'inactive') return item.isActive === false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalPages = Math.ceil(filtered.length / pagination.limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedData = filtered.slice(startIndex, startIndex + pagination.limit);

    if (activeTab === 'sites') setSites(paginatedData);
    else if (activeTab === 'loading') setLoadingPoints(paginatedData);
    else if (activeTab === 'dumping') setDumpingPoints(paginatedData);
    else if (activeTab === 'roads') setRoadSegments(paginatedData);

    setPagination((prev) => ({ ...prev, totalPages }));
  }, [activeTab, allSites, allLoadingPoints, allDumpingPoints, allRoadSegments, searchQuery, statusFilter, sortField, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchData();
    fetchExcavators();
  }, []);

  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  const fetchExcavators = async () => {
    try {
      const res = await excavatorService.getAll();
      setExcavators(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch excavators:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sitesRes, loadingRes, dumpingRes, roadsRes] = await Promise.all([
        miningSiteService.getAll({ limit: 10000 }),
        loadingPointService.getAll({ limit: 10000 }),
        dumpingPointService.getAll({ limit: 10000 }),
        roadSegmentService.getAll({ limit: 10000 }),
      ]);

      setAllSites(Array.isArray(sitesRes?.data) ? sitesRes.data : []);
      setAllLoadingPoints(Array.isArray(loadingRes?.data) ? loadingRes.data : []);
      setAllDumpingPoints(Array.isArray(dumpingRes?.data) ? dumpingRes.data : []);
      setAllRoadSegments(Array.isArray(roadsRes?.data) ? roadsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = (type) => {
    const prefix = {
      sites: 'SITE',
      loading: 'LP',
      dumping: 'DP',
      roads: 'RS',
    }[type];
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    return `${prefix}-${timestamp}${random}`;
  };

  const handleCreate = () => {
    setModalMode('create');
    setAutoGenerateCode(true);
    const generatedCode = generateCode(activeTab);
    setFormData({
      code: generatedCode,
      name: '',
      siteType: 'PIT',
      capacity: '',
      latitude: '',
      longitude: '',
      elevation: '',
      description: '',
      isActive: true,
      miningSiteId: '',
      excavatorId: '',
      coalSeam: '',
      coalQuality: { calorie: '', moisture: '', ash_content: '', sulfur: '' },
      maxQueueSize: 5,
      dumpingType: 'STOCKPILE',
      currentStock: '',
      startPoint: '',
      endPoint: '',
      distance: '',
      roadCondition: 'GOOD',
      maxSpeed: 30,
      gradient: '',
      lastMaintenance: '',
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setAutoGenerateCode(false);

    const baseData = {
      code: item.code || '',
      name: item.name || '',
      isActive: item.isActive !== undefined ? item.isActive : true,
      latitude: item.latitude || '',
      longitude: item.longitude || '',
    };

    if (activeTab === 'sites') {
      setFormData({
        ...baseData,
        siteType: item.siteType || 'PIT',
        capacity: item.capacity || '',
        elevation: item.elevation || '',
        description: item.description || '',
        coalQuality: { calorie: '', moisture: '', ash_content: '', sulfur: '' },
      });
    } else if (activeTab === 'loading') {
      const existingCoalQuality = item.coalQuality || {};
      setFormData({
        ...baseData,
        miningSiteId: item.miningSiteId || '',
        excavatorId: item.excavatorId || '',
        coalSeam: item.coalSeam || '',
        coalQuality: {
          calorie: existingCoalQuality.calorie || '',
          moisture: existingCoalQuality.moisture || '',
          ash_content: existingCoalQuality.ash_content || '',
          sulfur: existingCoalQuality.sulfur || '',
        },
        maxQueueSize: item.maxQueueSize || 5,
      });
    } else if (activeTab === 'dumping') {
      setFormData({
        ...baseData,
        miningSiteId: item.miningSiteId || '',
        dumpingType: item.dumpingType || 'STOCKPILE',
        capacity: item.capacity || '',
        currentStock: item.currentStock || '',
        coalQuality: { calorie: '', moisture: '', ash_content: '', sulfur: '' },
      });
    } else if (activeTab === 'roads') {
      setFormData({
        ...baseData,
        miningSiteId: item.miningSiteId || '',
        startPoint: item.startPoint || '',
        endPoint: item.endPoint || '',
        distance: item.distance || '',
        roadCondition: item.roadCondition || 'GOOD',
        maxSpeed: item.maxSpeed || 30,
        gradient: item.gradient || '',
        lastMaintenance: item.lastMaintenance ? new Date(item.lastMaintenance).toISOString().split('T')[0] : '',
        coalQuality: { calorie: '', moisture: '', ash_content: '', sulfur: '' },
      });
    }
    setShowModal(true);
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setModalMode('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let payload = {};

      if (activeTab === 'sites') {
        payload = {
          code: formData.code.trim(),
          name: formData.name.trim(),
          siteType: formData.siteType,
          isActive: formData.isActive,
        };
        if (formData.capacity) payload.capacity = parseFloat(formData.capacity);
        if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
        if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
        if (formData.elevation) payload.elevation = parseFloat(formData.elevation);
        if (formData.description) payload.description = formData.description.trim();

        if (modalMode === 'create') {
          await miningSiteService.create(payload);
        } else {
          await miningSiteService.update(selectedItem.id, payload);
        }
      } else if (activeTab === 'loading') {
        payload = {
          code: formData.code.trim(),
          name: formData.name.trim(),
          miningSiteId: formData.miningSiteId,
          isActive: formData.isActive,
          maxQueueSize: parseInt(formData.maxQueueSize) || 5,
        };
        if (formData.excavatorId) payload.excavatorId = formData.excavatorId;
        if (formData.coalSeam) payload.coalSeam = formData.coalSeam.trim();
        if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
        if (formData.longitude) payload.longitude = parseFloat(formData.longitude);

        if (formData.coalQuality && (formData.coalQuality.calorie || formData.coalQuality.moisture || formData.coalQuality.ash_content || formData.coalQuality.sulfur)) {
          const cq = {};
          if (formData.coalQuality.calorie) cq.calorie = parseFloat(formData.coalQuality.calorie);
          if (formData.coalQuality.moisture) cq.moisture = parseFloat(formData.coalQuality.moisture);
          if (formData.coalQuality.ash_content) cq.ash_content = parseFloat(formData.coalQuality.ash_content);
          if (formData.coalQuality.sulfur) cq.sulfur = parseFloat(formData.coalQuality.sulfur);
          payload.coalQuality = cq;
        }

        if (modalMode === 'create') {
          await loadingPointService.create(payload);
        } else {
          await loadingPointService.update(selectedItem.id, payload);
        }
      } else if (activeTab === 'dumping') {
        payload = {
          code: formData.code.trim(),
          name: formData.name.trim(),
          miningSiteId: formData.miningSiteId,
          dumpingType: formData.dumpingType,
          isActive: formData.isActive,
        };
        if (formData.capacity) payload.capacity = parseFloat(formData.capacity);
        if (formData.currentStock) payload.currentStock = parseFloat(formData.currentStock);
        if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
        if (formData.longitude) payload.longitude = parseFloat(formData.longitude);

        if (modalMode === 'create') {
          await dumpingPointService.create(payload);
        } else {
          await dumpingPointService.update(selectedItem.id, payload);
        }
      } else if (activeTab === 'roads') {
        payload = {
          code: formData.code.trim(),
          name: formData.name.trim(),
          miningSiteId: formData.miningSiteId,
          distance: parseFloat(formData.distance),
          roadCondition: formData.roadCondition,
          isActive: formData.isActive,
        };
        if (formData.startPoint) payload.startPoint = formData.startPoint.trim();
        if (formData.endPoint) payload.endPoint = formData.endPoint.trim();
        if (formData.maxSpeed) payload.maxSpeed = parseInt(formData.maxSpeed);
        if (formData.gradient) payload.gradient = parseFloat(formData.gradient);
        if (formData.lastMaintenance) payload.lastMaintenance = new Date(formData.lastMaintenance).toISOString();

        if (modalMode === 'create') {
          await roadSegmentService.create(payload);
        } else {
          await roadSegmentService.update(selectedItem.id, payload);
        }
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save:', error);
      if (error.response?.data?.message) {
        window.alert(error.response.data.message);
      } else {
        window.alert('Failed to save. Please check your input.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        if (activeTab === 'sites') {
          await miningSiteService.delete(id);
        } else if (activeTab === 'loading') {
          await loadingPointService.delete(id);
        } else if (activeTab === 'dumping') {
          await dumpingPointService.delete(id);
        } else if (activeTab === 'roads') {
          await roadSegmentService.delete(id);
        }
        fetchData();
      } catch (error) {
        console.error('Failed to delete:', error);
        if (error.response?.data?.message) {
          window.alert(error.response.data.message);
        }
      }
    }
  };

  const tabs = [
    { id: 'sites', label: 'Mining Sites', icon: MapPin, count: allSites.length },
    { id: 'loading', label: 'Loading Points', icon: Activity, count: allLoadingPoints.length },
    { id: 'dumping', label: 'Dumping Points', icon: Layers, count: allDumpingPoints.length },
    { id: 'roads', label: 'Road Segments', icon: Route, count: allRoadSegments.length },
  ];

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
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFiltersCount = [searchQuery, statusFilter].filter(Boolean).length;

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const getModalTitle = () => {
    const labels = {
      sites: 'Mining Site',
      loading: 'Loading Point',
      dumping: 'Dumping Point',
      roads: 'Road Segment',
    };
    const label = labels[activeTab];
    if (modalMode === 'create') return `Add ${label}`;
    if (modalMode === 'edit') return `Edit ${label}`;
    return `${label} Details`;
  };

  const getSiteTypeLabel = (type) => {
    const labels = {
      PIT: 'Pit',
      STOCKPILE: 'Stockpile',
      CRUSHER: 'Crusher',
      PORT: 'Port',
      COAL_HAULING_ROAD: 'Coal Hauling Road',
      ROM_PAD: 'ROM Pad',
    };
    return labels[type] || type;
  };

  const getRoadConditionColor = (condition) => {
    const colors = {
      EXCELLENT: 'green',
      GOOD: 'blue',
      FAIR: 'yellow',
      POOR: 'orange',
      CRITICAL: 'red',
    };
    return colors[condition] || 'gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <MapIcon className="text-sky-400" size={36} />
            <span>Location Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage mining sites, loading points, dumping points, and road segments</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="bg-slate-800/80 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2">
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <div className="bg-slate-800/80 rounded-lg p-1 flex border border-slate-700">
            <button onClick={() => setViewMode('list')} className={`px-3 py-2 rounded flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:bg-slate-700'}`}>
              <List size={18} />
              <span className="text-sm font-medium">List</span>
            </button>
            <button onClick={() => setViewMode('map')} className={`px-3 py-2 rounded flex items-center gap-1.5 transition-colors ${viewMode === 'map' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:bg-slate-700'}`}>
              <MapIcon size={18} />
              <span className="text-sm font-medium">Map</span>
            </button>
          </div>
          {canEdit && (
            <button onClick={handleCreate} className="bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors">
              <Plus size={20} />
              <span>Add New</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Mining Sites</p>
              <p className="text-3xl font-bold text-sky-400">{allSites.length}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl">
              <MapPin className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Loading Points</p>
              <p className="text-3xl font-bold text-cyan-400">{allLoadingPoints.length}</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Activity className="text-cyan-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Dumping Points</p>
              <p className="text-3xl font-bold text-sky-400">{allDumpingPoints.length}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl">
              <Layers className="text-sky-400" size={28} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-400/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Road Segments</p>
              <p className="text-3xl font-bold text-blue-400">{allRoadSegments.length}</p>
            </div>
            <div className="p-3 bg-blue-400/10 rounded-xl">
              <Route className="text-blue-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border-b border-slate-700 rounded-t-xl">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all font-medium ${
                  activeTab === tab.id ? 'border-sky-500 text-sky-400 bg-sky-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Navigation className="text-sky-400" size={24} />
              <span>Geospatial View</span>
            </h2>
            <div className="text-sm text-slate-400">
              Showing {allSites.length} sites, {allLoadingPoints.length} loading points, {allDumpingPoints.length} dumping points
            </div>
          </div>
          <MiningMap sites={allSites} loadingPoints={allLoadingPoints} dumpingPoints={allDumpingPoints} roads={allRoadSegments} />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex items-center gap-3">
                  <div className="relative" style={{ minWidth: '360px', maxWidth: '480px', flex: '1' }}>
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                    <input
                      type="text"
                      placeholder="Search by code, name, or mining site..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        paddingLeft: '44px',
                        paddingRight: '44px',
                        fontSize: '14px',
                        color: '#e2e8f0',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(71, 85, 105, 0.5)',
                        borderRadius: '8px',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0ea5e9';
                        e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(71, 85, 105, 0.5)';
                        e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
                      }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800/80 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 min-w-[180px] focus:border-sky-500 outline-none">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  {activeFiltersCount > 0 && (
                    <button onClick={handleClearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-blue-300 hover:bg-blue-300/10 rounded-lg border border-blue-300/30 transition-colors">
                      <X size={16} />
                      <span>Clear ({activeFiltersCount})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {activeTab === 'sites' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site) => (
                <div key={site.id} className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 hover:border-sky-500/30 transition-all border-l-4 border-l-sky-500">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="text-sky-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold text-lg text-slate-100">{site.name}</h3>
                        <p className="text-xs text-slate-500">{site.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleView(site)} className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded transition-colors" title="View">
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <button onClick={() => handleEdit(site)} className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(site.id)} className="p-1.5 text-blue-300 hover:bg-blue-300/10 rounded transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Type:</span>
                      <span className="text-sm font-semibold text-slate-200">{getSiteTypeLabel(site.siteType)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Status:</span>
                      <StatusBadge status={site.isActive ? 'active' : 'inactive'} label={site.isActive ? 'Active' : 'Inactive'} />
                    </div>
                    {site.capacity && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Capacity:</span>
                        <span className="text-sm font-medium text-sky-400">{site.capacity.toFixed(2)} ton/day</span>
                      </div>
                    )}
                    {site.elevation && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Elevation:</span>
                        <span className="text-sm text-slate-300">{site.elevation.toFixed(2)} m</span>
                      </div>
                    )}
                    {site.latitude && site.longitude && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-slate-500">Coordinates:</span>
                        <span className="text-xs text-slate-400">
                          {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'loading' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingPoints.map((point) => (
                <div key={point.id} className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 hover:border-cyan-500/30 transition-all border-l-4 border-l-cyan-500">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-2">
                      <Activity className="text-cyan-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold text-lg text-slate-100">{point.name}</h3>
                        <p className="text-xs text-slate-500">{point.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleView(point)} className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded transition-colors" title="View">
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <button onClick={() => handleEdit(point)} className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(point.id)} className="p-1.5 text-blue-300 hover:bg-blue-300/10 rounded transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Mining Site:</span>
                      <span className="text-sm font-semibold text-slate-200 truncate max-w-[180px]">{point.miningSite?.name || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Status:</span>
                      <StatusBadge status={point.isActive ? 'active' : 'inactive'} label={point.isActive ? 'Active' : 'Inactive'} />
                    </div>
                    {point.excavator && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Excavator:</span>
                        <span className="text-sm text-slate-300">{point.excavator.code}</span>
                      </div>
                    )}
                    {point.coalSeam && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Coal Seam:</span>
                        <span className="text-sm font-medium text-cyan-400">{point.coalSeam}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Max Queue:</span>
                      <span className="text-sm text-slate-300">{point.maxQueueSize} trucks</span>
                    </div>
                    {point.coalQuality && (
                      <div className="pt-2 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500 mb-1">Coal Quality:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                          {point.coalQuality.calorie && <span>Cal: {point.coalQuality.calorie.toFixed(0)}</span>}
                          {point.coalQuality.moisture && <span>Mois: {point.coalQuality.moisture.toFixed(1)}%</span>}
                          {point.coalQuality.ash_content && <span>Ash: {point.coalQuality.ash_content.toFixed(1)}%</span>}
                          {point.coalQuality.sulfur && <span>Sul: {point.coalQuality.sulfur.toFixed(2)}%</span>}
                        </div>
                      </div>
                    )}
                    {point.latitude && point.longitude && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-slate-500">Coordinates:</span>
                        <span className="text-xs text-slate-400">
                          {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dumping' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dumpingPoints.map((point) => (
                <div key={point.id} className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 hover:border-sky-500/30 transition-all border-l-4 border-l-sky-500">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-2">
                      <Layers className="text-sky-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold text-lg text-slate-100">{point.name}</h3>
                        <p className="text-xs text-slate-500">{point.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleView(point)} className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded transition-colors" title="View">
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <button onClick={() => handleEdit(point)} className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(point.id)} className="p-1.5 text-blue-300 hover:bg-blue-300/10 rounded transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Mining Site:</span>
                      <span className="text-sm font-semibold text-slate-200 truncate max-w-[180px]">{point.miningSite?.name || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Type:</span>
                      <span className="text-sm font-medium text-sky-400">{point.dumpingType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Status:</span>
                      <StatusBadge status={point.isActive ? 'active' : 'inactive'} label={point.isActive ? 'Active' : 'Inactive'} />
                    </div>
                    {point.capacity && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Capacity:</span>
                        <span className="text-sm text-slate-300">{point.capacity.toFixed(2)} ton</span>
                      </div>
                    )}
                    {point.currentStock !== null && point.currentStock !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Current Stock:</span>
                        <span className="text-sm font-semibold text-sky-400">{point.currentStock.toFixed(2)} ton</span>
                      </div>
                    )}
                    {point.capacity && point.currentStock !== null && (
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Utilization</span>
                          <span>{((point.currentStock / point.capacity) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${Math.min((point.currentStock / point.capacity) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                    )}
                    {point.latitude && point.longitude && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-slate-500">Coordinates:</span>
                        <span className="text-xs text-slate-400">
                          {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'roads' && (
            <div className="space-y-3">
              {roadSegments.map((road) => (
                <div key={road.id} className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 hover:border-blue-400/30 transition-all border-l-4 border-l-blue-400">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-3">
                        <Route className="text-blue-400 mt-1" size={20} />
                        <div>
                          <h3 className="font-bold text-lg text-slate-100">{road.name}</h3>
                          <p className="text-xs text-slate-500">{road.code}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Mining Site</p>
                          <p className="text-sm font-semibold text-slate-200">{road.miningSite?.name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Distance</p>
                          <p className="text-sm font-semibold text-blue-400">{road.distance} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Max Speed</p>
                          <p className="text-sm text-slate-300">{road.maxSpeed} km/h</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Condition</p>
                          <StatusBadge status={getRoadConditionColor(road.roadCondition)} label={road.roadCondition} />
                        </div>
                        {road.startPoint && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Start Point</p>
                            <p className="text-sm text-slate-300">{road.startPoint}</p>
                          </div>
                        )}
                        {road.endPoint && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">End Point</p>
                            <p className="text-sm text-slate-300">{road.endPoint}</p>
                          </div>
                        )}
                        {road.gradient !== null && road.gradient !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Gradient</p>
                            <p className="text-sm text-slate-300">{road.gradient.toFixed(2)}deg</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Status</p>
                          <StatusBadge status={road.isActive ? 'active' : 'inactive'} label={road.isActive ? 'Active' : 'Inactive'} />
                        </div>
                      </div>
                      {road.lastMaintenance && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-500">
                            Last Maintenance: <span className="text-slate-300">{new Date(road.lastMaintenance).toLocaleDateString()}</span>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 ml-4">
                      <button onClick={() => handleView(road)} className="p-2 text-sky-400 hover:bg-sky-500/10 rounded transition-colors" title="View">
                        <Eye size={18} />
                      </button>
                      {canEdit && (
                        <button onClick={() => handleEdit(road)} className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors" title="Edit">
                          <Edit size={18} />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(road.id)} className="p-2 text-blue-300 hover:bg-blue-300/10 rounded transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {((activeTab === 'sites' && sites.length === 0) || (activeTab === 'loading' && loadingPoints.length === 0) || (activeTab === 'dumping' && dumpingPoints.length === 0) || (activeTab === 'roads' && roadSegments.length === 0)) && (
            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 text-center py-12">
              <p className="text-slate-400 text-lg">No data found</p>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your filters or create a new item</p>
            </div>
          )}

          <div className="flex justify-center mt-6">
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))} />
          </div>
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={getModalTitle()} size="lg">
        {modalMode === 'view' && selectedItem ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 p-6 rounded-xl border border-sky-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {activeTab === 'sites' && <MapPin className="text-sky-400" size={32} />}
                  {activeTab === 'loading' && <Activity className="text-cyan-400" size={32} />}
                  {activeTab === 'dumping' && <Layers className="text-sky-400" size={32} />}
                  {activeTab === 'roads' && <Route className="text-sky-400" size={32} />}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-100">{selectedItem.name}</h3>
                    <p className="text-sm text-slate-400 font-mono">{selectedItem.code}</p>
                  </div>
                </div>
                <div>{selectedItem.isActive !== undefined && <StatusBadge status={selectedItem.isActive ? 'active' : 'inactive'} label={selectedItem.isActive ? 'Active' : 'Inactive'} />}</div>
              </div>
            </div>

            {activeTab === 'sites' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Site Type</p>
                    </div>
                    <p className="text-lg font-bold text-slate-200">{getSiteTypeLabel(selectedItem.siteType)}</p>
                  </div>
                  {selectedItem.capacity && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-cyan-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Capacity</p>
                      </div>
                      <p className="text-lg font-bold text-slate-200">
                        {selectedItem.capacity.toFixed(2)} <span className="text-sm font-normal text-slate-400">ton/day</span>
                      </p>
                    </div>
                  )}
                  {selectedItem.elevation && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Navigation className="text-sky-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Elevation</p>
                      </div>
                      <p className="text-lg font-bold text-slate-200">
                        {selectedItem.elevation.toFixed(2)} <span className="text-sm font-normal text-slate-400">meters</span>
                      </p>
                    </div>
                  )}
                </div>
                {selectedItem.description && (
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Description</p>
                    <p className="text-slate-300 leading-relaxed">{selectedItem.description}</p>
                  </div>
                )}
                {selectedItem.latitude && selectedItem.longitude && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="text-cyan-400" size={20} />
                      <p className="text-sm font-semibold text-slate-300">Geographic Coordinates</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Latitude</p>
                        <p className="text-base font-mono font-semibold text-slate-200">{selectedItem.latitude.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Longitude</p>
                        <p className="text-base font-mono font-semibold text-slate-200">{selectedItem.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'loading' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Mining Site</p>
                    </div>
                    <p className="text-base font-bold text-slate-200">{selectedItem.miningSite?.name || '-'}</p>
                    {selectedItem.miningSite?.code && <p className="text-xs text-slate-500 font-mono mt-1">{selectedItem.miningSite.code}</p>}
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Max Queue Size</p>
                    </div>
                    <p className="text-lg font-bold text-slate-200">
                      {selectedItem.maxQueueSize} <span className="text-sm font-normal text-slate-400">trucks</span>
                    </p>
                  </div>
                  {selectedItem.excavator && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="text-cyan-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Excavator</p>
                      </div>
                      <p className="text-base font-bold text-slate-200">{selectedItem.excavator.name || selectedItem.excavator.code}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{selectedItem.excavator.code}</p>
                    </div>
                  )}
                  {selectedItem.coalSeam && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="text-sky-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Coal Seam</p>
                      </div>
                      <p className="text-lg font-bold text-slate-200">{selectedItem.coalSeam}</p>
                    </div>
                  )}
                </div>
                {selectedItem.coalQuality && (selectedItem.coalQuality.calorie || selectedItem.coalQuality.moisture || selectedItem.coalQuality.ash_content || selectedItem.coalQuality.sulfur) && (
                  <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="text-sky-400" size={20} />
                      <p className="text-sm font-semibold text-slate-300">Coal Quality Parameters</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {selectedItem.coalQuality.calorie && (
                        <div className="bg-slate-800/80 rounded-lg p-3 border border-sky-500/20">
                          <p className="text-xs text-slate-500 mb-1">Calorie Value</p>
                          <p className="text-lg font-bold text-slate-200">{selectedItem.coalQuality.calorie.toFixed(0)}</p>
                          <p className="text-xs text-slate-500">kcal/kg</p>
                        </div>
                      )}
                      {selectedItem.coalQuality.moisture && (
                        <div className="bg-slate-800/80 rounded-lg p-3 border border-sky-500/20">
                          <p className="text-xs text-slate-500 mb-1">Moisture</p>
                          <p className="text-lg font-bold text-slate-200">{selectedItem.coalQuality.moisture.toFixed(2)}%</p>
                        </div>
                      )}
                      {selectedItem.coalQuality.ash_content && (
                        <div className="bg-slate-800/80 rounded-lg p-3 border border-sky-500/20">
                          <p className="text-xs text-slate-500 mb-1">Ash Content</p>
                          <p className="text-lg font-bold text-slate-200">{selectedItem.coalQuality.ash_content.toFixed(2)}%</p>
                        </div>
                      )}
                      {selectedItem.coalQuality.sulfur && (
                        <div className="bg-slate-800/80 rounded-lg p-3 border border-sky-500/20">
                          <p className="text-xs text-slate-500 mb-1">Sulfur</p>
                          <p className="text-lg font-bold text-slate-200">{selectedItem.coalQuality.sulfur.toFixed(2)}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedItem.latitude && selectedItem.longitude && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="text-cyan-400" size={20} />
                      <p className="text-sm font-semibold text-slate-300">Geographic Coordinates</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Latitude</p>
                        <p className="text-base font-mono font-semibold text-slate-200">{selectedItem.latitude.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Longitude</p>
                        <p className="text-base font-mono font-semibold text-slate-200">{selectedItem.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'dumping' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Mining Site</p>
                    </div>
                    <p className="text-base font-bold text-slate-200">{selectedItem.miningSite?.name || '-'}</p>
                    {selectedItem.miningSite?.code && <p className="text-xs text-slate-500 font-mono mt-1">{selectedItem.miningSite.code}</p>}
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Dumping Type</p>
                    </div>
                    <p className="text-lg font-bold text-slate-200">{selectedItem.dumpingType}</p>
                  </div>
                  {selectedItem.capacity && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-cyan-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Total Capacity</p>
                      </div>
                      <p className="text-lg font-bold text-slate-200">
                        {selectedItem.capacity.toFixed(2)} <span className="text-sm font-normal text-slate-400">ton</span>
                      </p>
                    </div>
                  )}
                  {selectedItem.currentStock !== null && selectedItem.currentStock !== undefined && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="text-sky-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Current Stock</p>
                      </div>
                      <p className="text-lg font-bold text-slate-200">
                        {selectedItem.currentStock.toFixed(2)} <span className="text-sm font-normal text-slate-400">ton</span>
                      </p>
                    </div>
                  )}
                </div>
                {selectedItem.capacity && selectedItem.currentStock !== null && selectedItem.currentStock !== undefined && (
                  <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-sky-400" size={20} />
                        <p className="text-sm font-semibold text-slate-300">Storage Utilization</p>
                      </div>
                      <p className="text-2xl font-bold text-sky-400">{((selectedItem.currentStock / selectedItem.capacity) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min((selectedItem.currentStock / selectedItem.capacity) * 100, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>{selectedItem.currentStock.toFixed(2)} ton</span>
                      <span>{selectedItem.capacity.toFixed(2)} ton</span>
                    </div>
                  </div>
                )}
                {selectedItem.latitude && selectedItem.longitude && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="text-cyan-400" size={20} />
                      <p className="text-sm font-semibold text-slate-300">Geographic Coordinates</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Latitude</p>
                        <p className="text-base font-mono font-semibold text-slate-200">{selectedItem.latitude.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Longitude</p>
                        <p className="text-base font-mono font-semibold text-slate-200">{selectedItem.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'roads' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Mining Site</p>
                    </div>
                    <p className="text-base font-bold text-slate-200">{selectedItem.miningSite?.name || '-'}</p>
                    {selectedItem.miningSite?.code && <p className="text-xs text-slate-500 font-mono mt-1">{selectedItem.miningSite.code}</p>}
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Route className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Distance</p>
                    </div>
                    <p className="text-lg font-bold text-slate-200">
                      {selectedItem.distance} <span className="text-sm font-normal text-slate-400">km</span>
                    </p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="text-cyan-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Road Condition</p>
                    </div>
                    <StatusBadge status={getRoadConditionColor(selectedItem.roadCondition)} label={selectedItem.roadCondition} />
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-sky-400" size={18} />
                      <p className="text-xs font-semibold text-slate-500 uppercase">Max Speed</p>
                    </div>
                    <p className="text-lg font-bold text-slate-200">
                      {selectedItem.maxSpeed} <span className="text-sm font-normal text-slate-400">km/h</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedItem.startPoint && (
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Navigation className="text-sky-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Start Point</p>
                      </div>
                      <p className="text-base font-bold text-slate-200">{selectedItem.startPoint}</p>
                    </div>
                  )}
                  {selectedItem.endPoint && (
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="text-cyan-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">End Point</p>
                      </div>
                      <p className="text-base font-bold text-slate-200">{selectedItem.endPoint}</p>
                    </div>
                  )}
                  {selectedItem.gradient !== null && selectedItem.gradient !== undefined && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="text-sky-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Gradient</p>
                      </div>
                      <p className="text-lg font-bold text-slate-200">{selectedItem.gradient.toFixed(2)}deg</p>
                    </div>
                  )}
                  {selectedItem.lastMaintenance && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="text-sky-400" size={18} />
                        <p className="text-xs font-semibold text-slate-500 uppercase">Last Maintenance</p>
                      </div>
                      <p className="text-base font-bold text-slate-200">{new Date(selectedItem.lastMaintenance).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors">
                Close
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  handleEdit(selectedItem);
                }}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Edit size={18} />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Code *{modalMode === 'create' && <span className="ml-2 text-xs text-sky-400">{autoGenerateCode ? '(Auto-generated)' : ''}</span>}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => {
                      setFormData({ ...formData, code: e.target.value });
                      if (modalMode === 'create') setAutoGenerateCode(false);
                    }}
                    className="input-field flex-1"
                    required
                    readOnly={modalMode === 'create' && autoGenerateCode}
                  />
                  {modalMode === 'create' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAutoGenerateCode(true);
                        setFormData({ ...formData, code: generateCode(activeTab) });
                      }}
                      className="px-3 py-2 bg-sky-900/30 text-sky-400 border border-sky-500/30 rounded-lg hover:bg-sky-800/40 text-sm font-medium transition-colors"
                      title="Generate new code"
                    >
                      Generate
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
              </div>

              {activeTab === 'sites' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Site Type *</label>
                    <select value={formData.siteType} onChange={(e) => setFormData({ ...formData, siteType: e.target.value })} className="input-field" required>
                      <option value="PIT">Pit</option>
                      <option value="STOCKPILE">Stockpile</option>
                      <option value="CRUSHER">Crusher</option>
                      <option value="PORT">Port</option>
                      <option value="COAL_HAULING_ROAD">Coal Hauling Road</option>
                      <option value="ROM_PAD">ROM Pad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                    <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="input-field">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Capacity (ton/day)</label>
                    <input type="number" step="0.01" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input-field" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Elevation (m)</label>
                    <input type="number" step="0.01" value={formData.elevation} onChange={(e) => setFormData({ ...formData, elevation: e.target.value })} className="input-field" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Latitude</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.000001" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} className="input-field flex-1" placeholder="e.g., -4.7433" />
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="px-3 py-2 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-800/40 text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        <MapPin size={16} />
                        Map
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Longitude</label>
                    <input type="number" step="0.000001" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} className="input-field" placeholder="e.g., 116.0384" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows="3" placeholder="Optional description"></textarea>
                  </div>
                </>
              )}

              {activeTab === 'loading' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Mining Site *</label>
                    <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field" required>
                      <option value="">Select Mining Site</option>
                      {allSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                    <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="input-field">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Excavator</label>
                    <select value={formData.excavatorId} onChange={(e) => setFormData({ ...formData, excavatorId: e.target.value })} className="input-field">
                      <option value="">Select Excavator (Optional)</option>
                      {excavators.map((excavator) => (
                        <option key={excavator.id} value={excavator.id}>
                          {excavator.code} - {excavator.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Queue Size</label>
                    <input type="number" value={formData.maxQueueSize} onChange={(e) => setFormData({ ...formData, maxQueueSize: e.target.value })} className="input-field" min="1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Coal Seam</label>
                    <input type="text" value={formData.coalSeam} onChange={(e) => setFormData({ ...formData, coalSeam: e.target.value })} className="input-field" placeholder="e.g., Seam-C2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Latitude</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.000001" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} className="input-field flex-1" placeholder="e.g., -2.9629" />
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="px-3 py-2 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-800/40 text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        <MapPin size={16} />
                        Map
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Longitude</label>
                    <input type="number" step="0.000001" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} className="input-field" placeholder="e.g., 119.4386" />
                  </div>
                  <div className="col-span-2 border-t border-slate-700/50 pt-4">
                    <p className="text-sm font-medium text-slate-300 mb-3">Coal Quality (Optional)</p>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Calorie</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.coalQuality.calorie}
                          onChange={(e) => setFormData({ ...formData, coalQuality: { ...formData.coalQuality, calorie: e.target.value } })}
                          className="input-field text-sm"
                          placeholder="kcal/kg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Moisture (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.coalQuality.moisture}
                          onChange={(e) => setFormData({ ...formData, coalQuality: { ...formData.coalQuality, moisture: e.target.value } })}
                          className="input-field text-sm"
                          placeholder="0-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Ash Content (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.coalQuality.ash_content}
                          onChange={(e) => setFormData({ ...formData, coalQuality: { ...formData.coalQuality, ash_content: e.target.value } })}
                          className="input-field text-sm"
                          placeholder="0-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Sulfur (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.coalQuality.sulfur}
                          onChange={(e) => setFormData({ ...formData, coalQuality: { ...formData.coalQuality, sulfur: e.target.value } })}
                          className="input-field text-sm"
                          placeholder="0-100"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'dumping' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Mining Site *</label>
                    <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field" required>
                      <option value="">Select Mining Site</option>
                      {allSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Dumping Type *</label>
                    <select value={formData.dumpingType} onChange={(e) => setFormData({ ...formData, dumpingType: e.target.value })} className="input-field" required>
                      <option value="STOCKPILE">Stockpile</option>
                      <option value="CRUSHER">Crusher</option>
                      <option value="WASTE_DUMP">Waste Dump</option>
                      <option value="ROM_STOCKPILE">ROM Stockpile</option>
                      <option value="PORT">Port</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                    <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="input-field">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Capacity (ton)</label>
                    <input type="number" step="0.01" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input-field" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Current Stock (ton)</label>
                    <input type="number" step="0.01" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })} className="input-field" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Latitude</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.000001" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} className="input-field flex-1" placeholder="e.g., -4.7400" />
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="px-3 py-2 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-800/40 text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        <MapPin size={16} />
                        Map
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Longitude</label>
                    <input type="number" step="0.000001" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} className="input-field" placeholder="e.g., 116.0421" />
                  </div>
                </>
              )}

              {activeTab === 'roads' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Mining Site *</label>
                    <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field" required>
                      <option value="">Select Mining Site</option>
                      {allSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Distance (km) *</label>
                    <input type="number" step="0.01" value={formData.distance} onChange={(e) => setFormData({ ...formData, distance: e.target.value })} className="input-field" required placeholder="e.g., 3.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Start Point</label>
                    <input type="text" value={formData.startPoint} onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })} className="input-field" placeholder="e.g., Point-A" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">End Point</label>
                    <input type="text" value={formData.endPoint} onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })} className="input-field" placeholder="e.g., Point-B" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Road Condition *</label>
                    <select value={formData.roadCondition} onChange={(e) => setFormData({ ...formData, roadCondition: e.target.value })} className="input-field" required>
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                    <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="input-field">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Speed (km/h)</label>
                    <input type="number" value={formData.maxSpeed} onChange={(e) => setFormData({ ...formData, maxSpeed: e.target.value })} className="input-field" placeholder="Default: 30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Gradient (degrees)</label>
                    <input type="number" step="0.01" value={formData.gradient} onChange={(e) => setFormData({ ...formData, gradient: e.target.value })} className="input-field" placeholder="e.g., -1.18 or 9.77" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Last Maintenance Date</label>
                    <input type="date" value={formData.lastMaintenance} onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })} className="input-field" />
                  </div>
                </>
              )}
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

      {showMapPicker && (
        <MapPicker
          initialLat={formData.latitude}
          initialLng={formData.longitude}
          onLocationSelect={(lat, lng) => {
            setFormData({ ...formData, latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
};

export default LocationManagement;
