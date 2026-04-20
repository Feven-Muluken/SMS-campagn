import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { motion } from 'motion/react';
import { canAccess } from '../utils/permissions';
import axios from '../api/axiosInstance';
import {
  FiBarChart2,
  FiUsers,
  FiSend,
  FiPhone,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiMessageCircle,
  FiBriefcase,
  FiShield,
  FiGrid,
} from 'react-icons/fi';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  // const { user, setUser, refreshUser } = useUser();
  const { user, refreshUser, setCompanyContext } = useUser();
  const [companySwitching, setCompanySwitching] = useState(false);

  const MotionAside = motion.aside;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2, path: '/', permission: 'dashboard.view' },
    { id: 'campaigns', label: 'Campaign', icon: FiSend, path: '/campaign', permission: 'campaign.view' },
    { id: 'contacts', label: 'Contact', icon: FiPhone, path: '/contacts', permission: 'contact.view' },
    { id: 'groups', label: 'Group', icon: FiUsers, path: '/groups', permission: 'group.view' },
    { id: 'users', label: 'User', icon: FiUser, path: '/users', permission: 'user.manage' },
    { id: 'companies', label: 'Companies', icon: FiBriefcase, path: '/companies', permission: 'company.manage' },
    { id: 'company-access', label: 'Company access', icon: FiShield, path: '/company-access', permission: 'company.manage' },
    { id: 'send-sms', label: 'Send SMS', icon: FiMessageCircle, path: '/send-sms', permission: 'sms.send' },
    { id: 'delivery-status', label: 'Delivery', icon: FiBarChart2, path: '/delivery-status', permission: 'delivery.view' },
    { id: 'appointments', label: 'Appointment', icon: FiBarChart2, path: '/appointments', permission: 'appointment.view' },
    { id: 'inbox', label: 'Inbox Chat', icon: FiMessageCircle, path: '/premium/two-way-chat', permission: 'inbox.view' },
    { id: 'geo', label: 'Geo SMS', icon: FiSend, path: '/premium/geo-marketing', permission: 'geo.send' },
    { id: 'billing', label: 'Billing SMS', icon: FiPhone, path: '/premium/billing-alerts', permission: 'billing.send' },
  ];
  const menuItemsWithAccess = menuItems.map((item) => ({
    ...item,
    allowed: canAccess(user, item.permission),
  }));
  const visibleMenuItems = menuItemsWithAccess.filter((item) => item.allowed);

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) { 
    setSidebarOpen(false);
  }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('activeCompanyId');
    sessionStorage.removeItem('activeCompanyId');
    localStorage.removeItem('companyPermissions');
    sessionStorage.removeItem('companyPermissions');
    localStorage.removeItem('companyRole');
    sessionStorage.removeItem('companyRole');
    localStorage.removeItem('memberCompanies');
    sessionStorage.removeItem('memberCompanies');
    refreshUser();
    navigate('/login');
  };

  const handleSwitchCompany = async (e) => {
    const nextId = Number(e.target.value);
    if (!nextId || nextId === Number(user?.activeCompanyId)) return;
    setCompanySwitching(true);
    try {
      const res = await axios.post('/auth/switch-company', { companyId: nextId });
      const token = res.data?.token;
      if (!token) return;
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      storage.setItem('token', token);
      setCompanyContext({
        activeCompanyId: res.data.activeCompanyId,
        companyRole: res.data.companyRole,
        companyPermissions: res.data.companyPermissions || [],
        companies: res.data.companies,
      });
      refreshUser();
    } catch {
      /* axios interceptor may redirect */
    } finally {
      setCompanySwitching(false);
    }
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
          {visibleMenuItems.map((item) => {
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

        {String(user?.role || '').toLowerCase() === 'admin' && (
          <div className="px-4 pt-2">
            <button
              type="button"
              onClick={() => {
                navigate('/platform');
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-800 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <FiGrid className="w-5 h-5 text-slate-600" />
              <span>Platform hub</span>
            </button>
          </div>
        )}

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {Array.isArray(user?.availableCompanies) && user.availableCompanies.length > 1 && (
            <div className="px-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <select
                value={String(user.activeCompanyId || '')}
                onChange={handleSwitchCompany}
                disabled={companySwitching}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800"
              >
                {user.availableCompanies.map((c) => (
                  <option key={c.companyId} value={c.companyId}>
                    {c.name || c.slug || `Company ${c.companyId}`}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                  {menuItemsWithAccess.find((m) => isActive(m.path))?.label === 'Dashboard'
                    ? 'Admin Dashboard'
                    : (menuItemsWithAccess.find((m) => isActive(m.path))?.label || 'Management') + ' Management'}
                </h2>
                <p className="text-xs text-gray-500">Afroel SMS Campaign Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {String(user?.role || '').toLowerCase() === 'admin' && (
                <button
                  type="button"
                  onClick={() => navigate('/platform')}
                  className="hidden sm:inline-flex text-xs font-semibold text-red-700 border border-red-200 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100"
                >
                  Platform
                </button>
              )}
              <div className="flex items-center gap-3 p-3 px-4 sm:px-9 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                <div className="p-2 rounded-full bg-white">
                  <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate capitalize">{user?.name || 'Administrator'}</p>
                  <p className="text-xs text-gray-600 capitalize">{user?.role || 'admin'}</p>
                </div>
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