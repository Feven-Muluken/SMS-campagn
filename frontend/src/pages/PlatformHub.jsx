import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiSettings,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';

const cards = [
  {
    to: '/',
    title: 'Workspace',
    desc: 'SMS, campaigns, contacts — uses company context when set.',
    icon: FiBarChart2,
    accent: true,
  },
  {
    to: '/users',
    title: 'Platform users',
    desc: 'Global user accounts (admin API).',
    icon: FiUsers,
  },
  {
    to: '/companies',
    title: 'Companies',
    desc: 'Create orgs, plans, sender requests.',
    icon: FiBriefcase,
  },
  {
    to: '/company-access',
    title: 'Company access',
    desc: 'Permissions and company users.',
    icon: FiSettings,
  },
  {
    to: '/admin/register',
    title: 'Register platform user',
    desc: 'Add a new Afroel staff account.',
    icon: FiUserPlus,
  },
];

const PlatformHub = () => (
  <div>
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h2 className="text-2xl font-bold text-gray-900">Where to go</h2>
      <p className="text-sm text-gray-600 mt-1">
        Tenant teams use <strong>Workspace</strong>. Use the cards below for cross-company control.
      </p>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ to, title, desc, icon: Icon, accent }, i) => (
        <motion.div
          key={to}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.25 }}
        >
          <Link
            to={to}
            className={`block h-full rounded-xl border p-5 transition-all duration-200 group ${
              accent
                ? 'border-red-200 bg-white shadow-md hover:shadow-lg hover:border-red-300'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div
                className={`p-2.5 rounded-lg ${accent ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <FiArrowRight
                className={`w-5 h-5 shrink-0 transition-colors ${
                  accent ? 'text-red-400 group-hover:text-red-600' : 'text-gray-400 group-hover:text-gray-700'
                }`}
              />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-snug">{desc}</p>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

export default PlatformHub;
