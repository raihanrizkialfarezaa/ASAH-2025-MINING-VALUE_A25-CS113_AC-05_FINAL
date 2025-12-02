import React, { useState, useEffect } from 'react';
import { miningSiteService, loadingPointService, dumpingPointService, roadSegmentService } from '../../services/locationService';
import { excavatorService } from '../../services';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import MiningMap from '../../components/MiningMap';
import { MapPin, ArrowRight, Activity, Plus, Edit, Trash2, Eye, Map as MapIcon, List } from 'lucide-react';

const LocationManagement = () => {
  const [activeTab, setActiveTab] = useState('sites');
  const [viewMode, setViewMode] = useState('list');
  const [sites, setSites] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState([]);
  const [dumpingPoints, setDumpingPoints] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [excavators, setExcavators] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    siteType: 'TAMBANG_TERBUKA',
    capacity: '',
    latitude: '',
    longitude: '',
    miningSiteId: '',
    excavatorId: '',
    coalSeam: '',
    maxQueueSize: '',
    dumpingType: 'STOCKPILE',
    currentStock: '',
    startPoint: '',
    endPoint: '',
    distance: '',
    roadCondition: 'GOOD',
    maxSpeed: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, viewMode]);

  useEffect(() => {
    const loadExcavators = async () => {
      try {
        const res = await excavatorService.getAll();
        setExcavators(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error('Failed to fetch excavators:', error);
      }
    };
    loadExcavators();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'map') {
        const [sitesRes, loadingRes, dumpingRes, roadsRes] = await Promise.all([miningSiteService.getAll(), loadingPointService.getAll(), dumpingPointService.getAll(), roadSegmentService.getAll()]);
        setSites(Array.isArray(sitesRes.data) ? sitesRes.data : []);
        setLoadingPoints(Array.isArray(loadingRes.data) ? loadingRes.data : []);
        setDumpingPoints(Array.isArray(dumpingRes.data) ? dumpingRes.data : []);
        setRoadSegments(Array.isArray(roadsRes.data) ? roadsRes.data : []);
      } else {
        if (activeTab === 'sites') {
          const res = await miningSiteService.getAll();
          setSites(Array.isArray(res.data) ? res.data : []);
        } else if (activeTab === 'loading') {
          const res = await loadingPointService.getAll();
          setLoadingPoints(Array.isArray(res.data) ? res.data : []);
        } else if (activeTab === 'dumping') {
          const res = await dumpingPointService.getAll();
          setDumpingPoints(Array.isArray(res.data) ? res.data : []);
        } else if (activeTab === 'roads') {
          const res = await roadSegmentService.getAll();
          setRoadSegments(Array.isArray(res.data) ? res.data : []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      code: '',
      name: '',
      siteType: 'TAMBANG_TERBUKA',
      capacity: '',
      latitude: '',
      longitude: '',
      miningSiteId: '',
      excavatorId: '',
      coalSeam: '',
      maxQueueSize: '',
      dumpingType: 'STOCKPILE',
      currentStock: '',
      startPoint: '',
      endPoint: '',
      distance: '',
      roadCondition: 'GOOD',
      maxSpeed: '',
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      siteType: item.siteType || 'TAMBANG_TERBUKA',
      capacity: item.capacity || '',
      latitude: item.latitude || '',
      longitude: item.longitude || '',
      miningSiteId: item.miningSiteId || '',
      excavatorId: item.excavatorId || '',
      coalSeam: item.coalSeam || '',
      maxQueueSize: item.maxQueueSize || '',
      dumpingType: item.dumpingType || 'STOCKPILE',
      currentStock: item.currentStock || '',
      startPoint: item.startPoint || '',
      endPoint: item.endPoint || '',
      distance: item.distance || '',
      roadCondition: item.roadCondition || 'GOOD',
      maxSpeed: item.maxSpeed || '',
    });
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
        };
        if (formData.capacity) payload.capacity = parseFloat(formData.capacity);
        if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
        if (formData.longitude) payload.longitude = parseFloat(formData.longitude);

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
        };
        if (formData.excavatorId) payload.excavatorId = formData.excavatorId;
        if (formData.coalSeam) payload.coalSeam = formData.coalSeam.trim();
        if (formData.maxQueueSize) payload.maxQueueSize = parseInt(formData.maxQueueSize);
        if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
        if (formData.longitude) payload.longitude = parseFloat(formData.longitude);

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
        };
        if (formData.startPoint) payload.startPoint = formData.startPoint.trim();
        if (formData.endPoint) payload.endPoint = formData.endPoint.trim();
        if (formData.maxSpeed) payload.maxSpeed = parseInt(formData.maxSpeed);

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
    { id: 'sites', label: 'Mining Sites', icon: MapPin },
    { id: 'loading', label: 'Loading Points', icon: Activity },
    { id: 'dumping', label: 'Dumping Points', icon: Activity },
    { id: 'roads', label: 'Road Segments', icon: ArrowRight },
  ];

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Location Management</h1>
        <div className="flex space-x-2">
          <div className="bg-white rounded-lg shadow p-1 flex">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} title="List View">
              <List size={20} />
            </button>
            <button onClick={() => setViewMode('map')} className={`p-2 rounded ${viewMode === 'map' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} title="Map View">
              <MapIcon size={20} />
            </button>
          </div>
          <button onClick={handleCreate} className="btn-primary flex items-center space-x-2">
            <Plus size={20} />
            <span>Add New</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {viewMode === 'map' ? (
        <div className="card p-4 mt-4">
          <h2 className="text-xl font-bold mb-4">Geospatial View</h2>
          <MiningMap sites={sites} loadingPoints={loadingPoints} dumpingPoints={dumpingPoints} roads={roadSegments} />
        </div>
      ) : (
        <>
          {activeTab === 'sites' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site) => (
                <div key={site.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{site.name}</h3>
                    <div className="flex space-x-1">
                      <button onClick={() => handleView(site)} className="text-blue-600 hover:text-blue-800">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(site)} className="text-green-600 hover:text-green-800">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(site.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Code: {site.code}</p>
                  <p className="text-sm text-gray-600 mb-1">Type: {site.siteType}</p>
                  <p className="text-sm text-gray-600">Capacity: {site.capacity || '-'} ton/day</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'loading' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingPoints.map((point) => (
                <div key={point.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{point.name}</h3>
                    <div className="flex space-x-1">
                      <button onClick={() => handleView(point)} className="text-blue-600 hover:text-blue-800">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(point)} className="text-green-600 hover:text-green-800">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(point.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Code: {point.code}</p>
                  <p className="text-sm text-gray-600 mb-1">Mining Site: {point.miningSite?.name || '-'}</p>
                  <p className="text-sm text-gray-600">Max Queue: {point.maxQueueSize}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dumping' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dumpingPoints.map((point) => (
                <div key={point.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{point.name}</h3>
                    <div className="flex space-x-1">
                      <button onClick={() => handleView(point)} className="text-blue-600 hover:text-blue-800">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(point)} className="text-green-600 hover:text-green-800">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(point.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Code: {point.code}</p>
                  <p className="text-sm text-gray-600 mb-1">Type: {point.dumpingType}</p>
                  <p className="text-sm text-gray-600">Current Stock: {point.currentStock} ton</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'roads' && (
            <div className="grid grid-cols-1 gap-4">
              {roadSegments.map((road) => (
                <div key={road.id} className="card">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg mb-2">{road.name}</h3>
                      <p className="text-sm text-gray-600 mb-1">Code: {road.code}</p>
                      <p className="text-sm text-gray-600 mb-1">Distance: {road.distance} km</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex space-x-1 mb-2">
                        <button onClick={() => handleView(road)} className="text-blue-600 hover:text-blue-800">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleEdit(road)} className="text-green-600 hover:text-green-800">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(road.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Max Speed: {road.maxSpeed} km/h</p>
                      <p className="text-sm text-gray-600">Condition: {road.roadCondition}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={getModalTitle()} size="lg">
        {modalMode === 'view' && selectedItem ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Code</label>
                <p className="text-lg">{selectedItem.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-lg">{selectedItem.name}</p>
              </div>
              {activeTab === 'sites' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Site Type</label>
                    <p className="text-lg">{selectedItem.siteType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Capacity</label>
                    <p className="text-lg">{selectedItem.capacity || '-'} ton/day</p>
                  </div>
                </>
              )}
              {activeTab === 'loading' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Mining Site</label>
                    <p className="text-lg">{selectedItem.miningSite?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Coal Seam</label>
                    <p className="text-lg">{selectedItem.coalSeam || '-'}</p>
                  </div>
                </>
              )}
              {activeTab === 'dumping' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dumping Type</label>
                    <p className="text-lg">{selectedItem.dumpingType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Stock</label>
                    <p className="text-lg">{selectedItem.currentStock} ton</p>
                  </div>
                </>
              )}
              {activeTab === 'roads' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Distance</label>
                    <p className="text-lg">{selectedItem.distance} km</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Road Condition</label>
                    <p className="text-lg">{selectedItem.roadCondition}</p>
                  </div>
                </>
              )}
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

              {activeTab === 'sites' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Site Type *</label>
                    <select value={formData.siteType} onChange={(e) => setFormData({ ...formData, siteType: e.target.value })} className="input-field" required>
                      <option value="TAMBANG_TERBUKA">Tambang Terbuka</option>
                      <option value="TAMBANG_BAWAH_TANAH">Tambang Bawah Tanah</option>
                      <option value="STOCKPILE">Stockpile</option>
                      <option value="PORT">Port</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (ton/day)</label>
                    <input type="number" step="0.01" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                    <input type="number" step="0.000001" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                    <input type="number" step="0.000001" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} className="input-field" />
                  </div>
                </>
              )}

              {activeTab === 'loading' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mining Site *</label>
                    <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field" required>
                      <option value="">Select Mining Site</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Excavator</label>
                    <select value={formData.excavatorId} onChange={(e) => setFormData({ ...formData, excavatorId: e.target.value })} className="input-field">
                      <option value="">Select Excavator</option>
                      {excavators.map((excavator) => (
                        <option key={excavator.id} value={excavator.id}>
                          {excavator.code} - {excavator.brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Coal Seam</label>
                    <input type="text" value={formData.coalSeam} onChange={(e) => setFormData({ ...formData, coalSeam: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Queue Size</label>
                    <input type="number" value={formData.maxQueueSize} onChange={(e) => setFormData({ ...formData, maxQueueSize: e.target.value })} className="input-field" />
                  </div>
                </>
              )}

              {activeTab === 'dumping' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mining Site *</label>
                    <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field" required>
                      <option value="">Select Mining Site</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dumping Type *</label>
                    <select value={formData.dumpingType} onChange={(e) => setFormData({ ...formData, dumpingType: e.target.value })} className="input-field" required>
                      <option value="STOCKPILE">Stockpile</option>
                      <option value="CRUSHER">Crusher</option>
                      <option value="PORT">Port</option>
                      <option value="ROM">ROM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (ton)</label>
                    <input type="number" step="0.01" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock (ton)</label>
                    <input type="number" step="0.01" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })} className="input-field" />
                  </div>
                </>
              )}

              {activeTab === 'roads' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mining Site *</label>
                    <select value={formData.miningSiteId} onChange={(e) => setFormData({ ...formData, miningSiteId: e.target.value })} className="input-field" required>
                      <option value="">Select Mining Site</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km) *</label>
                    <input type="number" step="0.01" value={formData.distance} onChange={(e) => setFormData({ ...formData, distance: e.target.value })} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Point</label>
                    <input type="text" value={formData.startPoint} onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Point</label>
                    <input type="text" value={formData.endPoint} onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Road Condition *</label>
                    <select value={formData.roadCondition} onChange={(e) => setFormData({ ...formData, roadCondition: e.target.value })} className="input-field" required>
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                      <option value="VERY_POOR">Very Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Speed (km/h)</label>
                    <input type="number" value={formData.maxSpeed} onChange={(e) => setFormData({ ...formData, maxSpeed: e.target.value })} className="input-field" />
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
    </div>
  );
};

export default LocationManagement;
