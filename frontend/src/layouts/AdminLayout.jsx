import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { motion } from 'motion/react';
import {
  FiBarChart2,
  FiUsers,
  FiSend,
  FiPhone,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiMessageCircle
} from 'react-icons/fi';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  // const { user, setUser, refreshUser } = useUser();
  const { user, refreshUser } = useUser();

  const MotionAside = motion.aside;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2, path: '/' },
    { id: 'campaigns', label: 'Campaign', icon: FiSend, path: '/campaign' },
    { id: 'contacts', label: 'Contact', icon: FiPhone, path: '/contacts' },
    { id: 'groups', label: 'Group', icon: FiUsers, path: '/groups' },
    { id: 'users', label: 'User', icon: FiUser, path: '/users' },
    { id: 'send-sms', label: 'SMS', icon: FiMessageCircle, path: '/send-sms' },
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

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

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
              <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* User Info */}
          {/* <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
            <div className="p-2 rounded-full bg-white">
              <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-gray-600 capitalize">{user?.role || 'admin'}</p>
            </div>
          </div> */}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
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
        <div className="p-4 border-t border-gray-200">
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
                  {menuItems.find(m => isActive(m.path))?.label == "Dashboard"? 'Admin Dashboard' : menuItems.find(m => isActive(m.path))?.label + " Management" }
                </h2>
                <p className="text-xs text-gray-500">Afroel SMS Campaign Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 px-9 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <div className="p-2 rounded-full bg-white">
                <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate capitalize">{user?.name || 'Administrator'}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.role || 'admin'}</p>
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

export default AdminLayout;