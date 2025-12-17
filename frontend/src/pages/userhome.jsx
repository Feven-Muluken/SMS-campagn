import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiUser, 
  FiMessageCircle,
  FiArrowRight
} from 'react-icons/fi';

const Home = () => {
  const { user } = useUser();


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#DF0A0A' }}>AFROEL</h1>
              <p className="text-sm text-gray-500">SMS Campaign Platform</p>
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
        </div>
      </div>

      {/* Main Content */}
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
            Manage your SMS campaigns efficiently with Afroel
          </p>
        </motion.div>

        {/* {user?.role === 'admin' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
            >
              <Link
                to="/"
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                    <FiBarChart2 className="w-6 h-6" style={{ color: '#DF0A0A' }} />
                  </div>
                  <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Dashboard</h3>
                <p className="text-gray-600 text-sm">View analytics, stats, and manage the platform</p>
              </Link>
            </motion.div>

            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <Link
                to="/campaign"
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                    <FiSend className="w-6 h-6" style={{ color: '#DF0A0A' }} />
                  </div>
                  <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Campaigns</h3>
                <p className="text-gray-600 text-sm">Create and manage your SMS campaigns</p>
              </Link>
            </motion.div>

            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              <Link
                to="/send-sms"
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                    <FiMessageCircle className="w-6 h-6" style={{ color: '#DF0A0A' }} />
                  </div>
                  <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Send SMS</h3>
                <p className="text-gray-600 text-sm">Send messages to contacts or groups</p>
              </Link>
            </motion.div>

            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              <Link
                to="/contacts"
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                    <FiUsers className="w-6 h-6" style={{ color: '#DF0A0A' }} />
                  </div>
                  <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Contacts</h3>
                <p className="text-gray-600 text-sm">Manage your contact list</p>
              </Link>
            </motion.div>

            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.5 }}
            >
              <Link
                to="/groups"
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                    <FiUsers className="w-6 h-6" style={{ color: '#DF0A0A' }} />
                  </div>
                  <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Groups</h3>
                <p className="text-gray-600 text-sm">Organize contacts into groups</p>
              </Link>
            </motion.div>

            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.6 }}
            >
              <Link
                to="/users"
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                    <FiUsers className="w-6 h-6" style={{ color: '#DF0A0A' }} />
                  </div>
                  <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Users</h3>
                <p className="text-gray-600 text-sm">Manage platform users</p>
              </Link>
            </motion.div>
          </div>
        ) : ( */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center"
          >
            <div className="max-w-md mx-auto">
              <div className="p-4 rounded-full bg-red-50 inline-block mb-4">
                <FiMessageCircle className="w-12 h-12" style={{ color: '#DF0A0A' }} />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">View Your Messages</h3>
              <p className="text-gray-600 mb-6">
                Check your received SMS messages and campaign updates
              </p>
              <Link
                to="/home/my-messages"
                className="inline-flex items-center gap-2 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: '#DF0A0A',
                  boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                }}
              >
                View Messages
                <FiArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        {/* )} */}
      </div>
    </div>
  );
};

export default Home;
