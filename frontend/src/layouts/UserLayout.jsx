import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { motion } from 'motion/react';
import {
  FiMessageCircle,
  FiHome,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser
} from 'react-icons/fi';
import { useState } from 'react';

const UserLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const MotionAside = motion.aside;

  const menuItems = [
    { id: 'home', label: 'Home', icon: FiHome, path: '/home' },
    { id: 'messages', label: 'My Messages', icon: FiMessageCircle, path: '/home/my-messages' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) { 
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    refreshUser();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-opacity-40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <MotionAside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : '-100%'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-white shadow-xl lg:translate-x-0 lg:static lg:z-auto`}
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)'
        }}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#DF0A0A' }}>AFROEL</h1>
              <p className="text-xs text-gray-500 mt-1">SMS Campaign Platform</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${active
                  ? 'text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
                style={
                  active
                    ? {
                      backgroundColor: '#DF0A0A',
                      boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                    }
                    : {}
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <FiLogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </MotionAside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiMenu className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
                </h2>
                <p className="text-xs text-gray-500">Afroel SMS Campaign Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 px-9 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <div className="p-2 rounded-full bg-white">
                <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate capitalize">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.role || 'viewer'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;