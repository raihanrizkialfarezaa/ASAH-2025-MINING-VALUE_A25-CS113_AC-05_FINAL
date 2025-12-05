import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Truck, Construction, Users, MapPin, Package, Wrench, CloudRain, BarChart3, Settings, LogOut, Menu, X, Bot } from 'lucide-react';
import { authService } from '../../services/authService';
import aiService from '../../services/aiService';
import ChatbotWidget from '../AI/ChatbotWidget';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiServiceStatus, setAiServiceStatus] = useState('checking');
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  // Check AI service status
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const result = await aiService.healthCheck();
        setAiServiceStatus(result.success ? 'online' : 'offline');
      } catch (error) {
        setAiServiceStatus('offline');
      }
    };

    checkAIStatus();
    // Re-check every 30 seconds
    const interval = setInterval(checkAIStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Build context based on current page
  const getChatbotContext = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const currentPage = pathParts[0] || 'dashboard';

    return {
      current_page: currentPage,
      page_path: location.pathname,
      user_role: user?.role,
      available_data: {
        trucks: currentPage === 'trucks',
        excavators: currentPage === 'excavators',
        operators: currentPage === 'operators',
        hauling: currentPage === 'hauling',
        production: currentPage === 'production',
        vessels: currentPage === 'vessels',
        maintenance: currentPage === 'maintenance',
        weather: currentPage === 'weather',
        ai_recommendations: currentPage === 'ai-recommendations',
      },
    };
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER', 'MAINTENANCE_STAFF'] },
    { path: '/ai-recommendations', icon: Bot, label: 'AI Recommendations', roles: ['ADMIN', 'SUPERVISOR', 'DISPATCHER'] },
    { path: '/trucks', icon: Truck, label: 'Trucks', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER', 'MAINTENANCE_STAFF'] },
    { path: '/vessels', icon: Package, label: 'Vessels', roles: ['ADMIN', 'SUPERVISOR', 'DISPATCHER'] },
    { path: '/excavators', icon: Construction, label: 'Excavators', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER', 'MAINTENANCE_STAFF'] },
    { path: '/operators', icon: Users, label: 'Operators', roles: ['ADMIN', 'SUPERVISOR'] },
    { path: '/hauling', icon: Package, label: 'Hauling', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER'] },
    { path: '/locations', icon: MapPin, label: 'Locations', roles: ['ADMIN', 'SUPERVISOR', 'DISPATCHER'] },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance', roles: ['ADMIN', 'SUPERVISOR', 'MAINTENANCE_STAFF'] },
    { path: '/weather', icon: CloudRain, label: 'Weather', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER', 'MAINTENANCE_STAFF'] },
    { path: '/production', icon: BarChart3, label: 'Production', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER'] },
    { path: '/users', icon: Settings, label: 'Users', roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role));

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`bg-mining-coal text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">Mining Ops</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-700 rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link key={item.path} to={item.path} className={`flex items-center space-x-3 px-3 py-2 rounded transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          {sidebarOpen && user && (
            <div className="mb-3">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-700 w-full">
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>

      {/* Global AI Chatbot Widget */}
      <ChatbotWidget context={getChatbotContext()} aiServiceStatus={aiServiceStatus} />
    </div>
  );
};

export default Layout;
