import { useEffect, useState } from 'react';
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
  FiHome,
} from 'react-icons/fi';

const AdminLayout = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const navigate = useNavigate();
  const location = useLocation();
  // const { user, setUser, refreshUser } = useUser();
  const { user, refreshUser, setCompanyContext } = useUser();
  const [companySwitching, setCompanySwitching] = useState(false);

  const MotionAside = motion.aside;

  const isPlatformAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const menuItems = [
    ...(isPlatformAdmin
      ? []
      : [{ id: 'overview', label: 'Overview', icon: FiHome, path: '/companyhome', permission: null }]),
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2, path: '/', permission: 'dashboard.view' },
    { id: 'campaigns', label: 'Campaign', icon: FiSend, path: '/campaign', permission: 'campaign.view' },
    { id: 'contacts', label: 'Contact', icon: FiPhone, path: '/contacts', permission: 'contact.view' },
    { id: 'groups', label: 'Group', icon: FiUsers, path: '/groups', permission: 'group.view' },
    { id: 'users', label: 'User', icon: FiUser, path: '/users', permission: 'user.manage', platformOnly: true },
    { id: 'companies', label: 'Companies', icon: FiBriefcase, path: '/companies', permission: 'company.manage' },
    { id: 'company-access', label: 'Company access', icon: FiShield, path: '/company-access', permission: 'company.manage' },
    { id: 'send-sms', label: 'Send SMS', icon: FiMessageCircle, path: '/send-sms', permission: 'sms.send' },
    { id: 'delivery-status', label: 'Delivery', icon: FiBarChart2, path: '/delivery-status', permission: 'delivery.view' },
    { id: 'appointments', label: 'Appointment', icon: FiBarChart2, path: '/appointments', permission: 'appointment.view' },
    { id: 'inbox', label: 'Inbox Chat', icon: FiMessageCircle, path: '/premium/two-way-chat', permission: 'inbox.view' },
    { id: 'geo', label: 'Geo SMS', icon: FiSend, path: '/premium/geo-marketing', permission: 'geo.send' },
    { id: 'billing', label: 'Billing SMS', icon: FiPhone, path: '/premium/billing-alerts', permission: 'billing.send' },
    { id: 'my-profile', label: 'My profile', icon: FiUser, path: '/profile', permission: null },
  ];
  const effectiveCompanyRole = String(user?.companyRole || '').toLowerCase() === 'admin'
    ? 'company_admin'
    : (user?.companyRole || null);
  const roleLabel = String(user?.role || '').toLowerCase() === 'admin'
    ? 'super_admin'
    : (effectiveCompanyRole || user?.role || 'viewer');
  const activeCompany = (Array.isArray(user?.availableCompanies) ? user.availableCompanies : [])
    .find((c) => Number(c.companyId) === Number(user?.activeCompanyId));
  const companyLabel = activeCompany?.name || activeCompany?.slug || null;

  const menuItemsWithAccess = menuItems.map((item) => ({
    ...item,
    allowed: (!item.platformOnly || String(user?.role || '').toLowerCase() === 'admin') && canAccess(user, item.permission),
  }));

  useEffect(() => {
    const handleResize = () => {
      const nextIsDesktop = window.innerWidth >= 1024;
      setIsDesktop(nextIsDesktop);
      setSidebarOpen(nextIsDesktop);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      {sidebarOpen && !isDesktop && (
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
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-white shadow-xl lg:translate-x-0 lg:static lg:z-auto h-screen flex flex-col overflow-hidden`}
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)'
        }}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#DF0A0A' }}>AFROEL</h1>
              <p className="text-xs text-gray-500 mt-1">{isPlatformAdmin ? 'Platform admin' : 'Company workspace'}</p>
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
        <nav className="p-4 space-y-2 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {menuItemsWithAccess.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const disabled = !item.allowed;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!disabled) handleNavigation(item.path);
                }}
                disabled={disabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${active
                  ? 'text-white shadow-lg'
                  : disabled
                    ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                style={
                  active && !disabled
                    ? {
                      backgroundColor: '#DF0A0A',
                      boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                    }
                    : {}
                }
                title={disabled ? 'Permission required for this page' : item.label}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

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
              <div className="flex items-center gap-3 p-3 px-4 sm:px-9 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                <div className="p-2 rounded-full bg-white">
                  <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate capitalize">{user?.name || 'Administrator'}</p>
                  <p className="text-xs text-gray-600 capitalize">{roleLabel}</p>
                  {companyLabel && <p className="text-[10px] text-gray-500 truncate">{companyLabel}</p>}
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