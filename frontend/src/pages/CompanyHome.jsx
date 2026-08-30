import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useUser } from '../context/UserContext';
import { canAccess } from '../utils/permissions';
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiMessageCircle,
  FiPhone,
  FiShield,
  FiUser,
  FiUsers,
  FiGrid,
} from 'react-icons/fi';

const CompanyHome = () => {
  const { user } = useUser();
  const isSuperAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const canManageCompany = isSuperAdmin || String(user?.companyRole || '').toLowerCase() === 'admin';

  const withAccess = (card) => ({
    ...card,
    allowed: card.permission ? canAccess(user, card.permission) : true,
  });

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const hasActiveCompany = Boolean(user?.activeCompanyId);
  const cards = [
    {
      to: '/',
      title: 'Workspace',
      desc: 'Open the full app with sidebar: dashboard, campaigns, and tools you are allowed to use.',
      icon: FiGrid,
      permission: 'dashboard.view',
    },
    {
      to: '/campaign',
      title: 'Campaigns',
      desc: 'Create and manage SMS campaigns.',
      icon: FiBarChart2,
      permission: 'campaign.view',
    },
    {
      to: '/send-sms',
      title: 'Send SMS',
      desc: 'Send messages to contacts or groups.',
      icon: FiMessageCircle,
      permission: 'sms.send',
    },
    {
      to: '/contacts',
      title: 'Contacts',
      desc: 'Manage your contact list.',
      icon: FiUsers,
      permission: 'contact.view',
    },
    {
      to: '/groups',
      title: 'Groups',
      desc: 'Organize contacts into groups.',
      icon: FiUsers,
      permission: 'group.view',
    },
    {
      to: '/delivery-status',
      title: 'Delivery Status',
      desc: 'Track sent, failed, and pending SMS results.',
      icon: FiPhone,
      permission: 'delivery.view',
    },
    ...(canManageCompany
      ? [
          {
            to: '/company-access',
            title: 'Company Access',
            desc: 'Manage company permissions and users.',
            icon: FiShield,
            permission: 'company.manage',
          },
        ]
      : []),
    {
      to: '/profile',
      title: 'My Profile',
      desc: 'View your own profile and account details.',
      icon: FiUser,
    },
    ...(isSuperAdmin
      ? [
          {
            to: '/users',
            title: 'Platform Users',
            desc: 'Manage platform-level users.',
            icon: FiUsers,
            permission: 'user.manage',
          },
          {
            to: '/companies',
            title: 'Companies',
            desc: 'Create and manage tenant companies.',
            icon: FiBriefcase,
            permission: 'company.manage',
          },
        ]
      : []),
  ].map(withAccess);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {!isSuperAdmin && !hasActiveCompany && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
          <div className="max-w-7xl mx-auto px-6 py-3 text-sm">
            You are signed in, but no company is assigned to this account yet. Ask a super admin to add you under{' '}
            <span className="font-medium">Company access</span> for your organization. You can still open{' '}
            <span className="font-medium">My profile</span> below.
          </div>
        </div>
      )}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#DF0A0A' }}>AFROEL</h1>
              <p className="text-sm text-gray-500">{isSuperAdmin ? 'Super admin workspace' : 'Company workspace'}</p>
            </div>
            <div className="flex items-center gap-3 p-3 px-6 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <div className="p-2 rounded-full bg-white">
                <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate capitalize">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.companyRole || user?.role || 'viewer'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-3 capitalize">
            Welcome back, {user?.name || 'User'}! 👋
          </h2>
          <p className="text-lg text-gray-600">
            {isSuperAdmin
              ? 'Manage the platform, companies, and platform users from one place.'
              : 'Manage your company operations, permissions, and your own profile.'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            const disabled = !card.allowed;
            return (
              <motion.div
                key={card.title}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.08 * index }}
              >
                <Link
                  to={card.to}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                  aria-disabled={disabled}
                  className={`block bg-white rounded-xl shadow-sm border p-6 transition-all duration-300 group ${
                    disabled
                      ? 'border-gray-200 opacity-60 cursor-not-allowed pointer-events-none'
                      : 'border-gray-200 hover:shadow-lg hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                      <Icon className="w-6 h-6" style={{ color: '#DF0A0A' }} />
                    </div>
                    <FiArrowRight className={`w-5 h-5 transition-colors ${disabled ? 'text-gray-300' : 'text-gray-400 group-hover:text-red-600'}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm">{card.desc}</p>
                  {disabled && <p className="text-xs text-gray-500 mt-2">Permission required</p>}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CompanyHome;
