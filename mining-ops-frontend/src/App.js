import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TruckList from './pages/trucks/TruckList';
import ExcavatorList from './pages/excavators/ExcavatorList';
import OperatorList from './pages/operators/OperatorList';
import VesselList from './pages/vessels/VesselList';
import HaulingList from './pages/hauling/HaulingList';
import LocationManagement from './pages/locations/LocationManagement';
import MaintenanceList from './pages/maintenance/MaintenanceList';
import WeatherList from './pages/weather/WeatherList';
import ProductionList from './pages/production/ProductionList';
import UserList from './pages/users/UserList';
import AIRecommendations from './pages/AI/AIRecommendations';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const user = authService.getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/trucks" element={<TruckList />} />
                  <Route path="/excavators" element={<ExcavatorList />} />
                  <Route path="/weather" element={<WeatherList />} />
                  <Route
                    path="/vessels"
                    element={
                      <RoleRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'DISPATCHER']}>
                        <VesselList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/operators"
                    element={
                      <RoleRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
                        <OperatorList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/hauling"
                    element={
                      <RoleRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER']}>
                        <HaulingList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/locations"
                    element={
                      <RoleRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'DISPATCHER']}>
                        <LocationManagement />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/maintenance"
                    element={
                      <RoleRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'MAINTENANCE_STAFF']}>
                        <MaintenanceList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/production"
                    element={
                      <RoleRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER']}>
                        <ProductionList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <RoleRoute allowedRoles={['ADMIN']}>
                        <UserList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/ai-recommendations"
                    element={
                      <RoleRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'DISPATCHER']}>
                        <AIRecommendations />
                      </RoleRoute>
                    }
                  />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
