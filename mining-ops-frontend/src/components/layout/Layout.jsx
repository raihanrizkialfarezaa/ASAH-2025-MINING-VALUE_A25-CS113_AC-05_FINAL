import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Truck, Construction, Users, MapPin, Package, Wrench, CloudRain, BarChart3, Settings, LogOut, Menu, X, Bot, ChevronLeft, Zap } from 'lucide-react';
import { authService } from '../../services/authService';
import aiService from '../../services/aiService';
import ChatbotWidget from '../AI/ChatbotWidget';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiServiceStatus, setAiServiceStatus] = useState('checking');
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Sidebar content component for reuse
  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Logo Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
        {(sidebarOpen || isMobile) && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Mining Ops</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Pro Dashboard</p>
            </div>
          </div>
        )}
        {isMobile ? (
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-800/60 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        ) : (
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800/60 rounded-lg transition-colors text-slate-400 hover:text-white hidden lg:block">
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>

      {/* AI Service Status */}
      {(sidebarOpen || isMobile) && (
        <div className="px-4 py-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${aiServiceStatus === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : aiServiceStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-xs font-medium text-slate-400">
              AI Service: <span className={`${aiServiceStatus === 'online' ? 'text-emerald-400' : aiServiceStatus === 'offline' ? 'text-rose-400' : 'text-amber-400'}`}>{aiServiceStatus}</span>
            </span>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive ? 'bg-sky-600/20 text-sky-400 border-l-2 border-sky-500 ml-0' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-2 border-transparent'
              }`}
              title={!sidebarOpen && !isMobile ? item.label : undefined}
            >
              <Icon size={20} className={isActive ? 'text-sky-400' : ''} />
              {(sidebarOpen || isMobile) && <span className={`font-medium text-sm ${isActive ? 'text-sky-400' : ''}`}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-800/50 p-4">
        {(sidebarOpen || isMobile) && user && (
          <div className="mb-4 p-3 rounded-lg bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">{user.fullName?.charAt(0) || 'U'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.fullName}</p>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200">
          <LogOut size={20} />
          {(sidebarOpen || isMobile) && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0f1a] flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 border-b border-slate-800/50" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1a 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Zap className="text-white" size={16} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Mining Ops</h1>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 hover:bg-slate-800/60 rounded-lg transition-colors text-slate-400 hover:text-white">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside
            className="absolute top-0 left-0 h-full w-72 flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1a 100%)',
              borderRight: '1px solid rgba(30, 58, 95, 0.5)',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
            }}
          >
            <SidebarContent isMobile={true} />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar - Fixed Position */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-full z-40 flex-col transition-all duration-300 ease-out ${sidebarOpen ? 'w-64' : 'w-20'}`}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1a 100%)',
          borderRight: '1px solid rgba(30, 58, 95, 0.5)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main 
        className={`flex-1 h-full overflow-y-auto transition-all duration-300 pt-14 lg:pt-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`} 
        style={{ background: '#0a0f1a' }}
      >
        <div className="min-h-full p-3 sm:p-4 lg:p-6">{children}</div>
      </main>

      {/* Global AI Chatbot Widget */}
      <ChatbotWidget context={getChatbotContext()} aiServiceStatus={aiServiceStatus} />
    </div>
  );
};

export default Layout;
