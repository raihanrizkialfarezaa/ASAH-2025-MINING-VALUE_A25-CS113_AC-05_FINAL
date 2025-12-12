import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  const deferredPromptRef = useRef(null);
  const toastIdRef = useRef('pwa-install');

  useEffect(() => {
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

    if (isStandalone) {
      return;
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;

      if (!toast.isActive(toastIdRef.current)) {
        toast(
          ({ closeToast }) => (
            <div className="flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-zap text-white"
                  aria-hidden="true"
                >
                  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-100 leading-tight">Install Mining Ops</div>
                <div className="text-xs text-slate-400 leading-tight">Add to your device for faster access</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const deferred = deferredPromptRef.current;
                    deferredPromptRef.current = null;
                    if (!deferred) {
                      closeToast?.();
                      return;
                    }
                    deferred.prompt();
                    try {
                      await deferred.userChoice;
                    } catch (e) {}
                    closeToast?.();
                  }}
                  className="px-3 py-2 rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 hover:border-sky-500/35 transition-colors font-semibold text-sm"
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={() => closeToast?.()}
                  className="w-9 h-9 rounded-lg border border-slate-700/40 bg-slate-900/30 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 transition-colors grid place-items-center"
                  aria-label="Dismiss"
                >
                  <span className="text-base leading-none">×</span>
                </button>
              </div>
            </div>
          ),
          {
            toastId: toastIdRef.current,
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            closeButton: false,
            className: '!bg-slate-900/80 !backdrop-blur-md !border !border-slate-700/50 !text-slate-100 !rounded-xl',
            bodyClassName: '!p-0',
          }
        );
      }
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      toast.dismiss(toastIdRef.current);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

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
