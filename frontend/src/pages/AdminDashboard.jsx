import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion } from 'framer-motion';
import { FiBarChart2, FiUsers, FiMessageCircle, FiSend, FiUser } from 'react-icons/fi';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          axios.get('/admin/stats'),
          axios.get('/admin/recent-activity')
        ]);
        setStats(statsRes.data);
        setRecentActivity(activityRes.data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatCard = ({ label, value, icon: Icon, color = '#DF0A0A' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value || 0}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            label="Total Users"
            value={stats?.userCount}
            icon={FiUsers}
            color="#DF0A0A"
          />
          <StatCard
            label="Total Contacts"
            value={stats?.contactCount}
            icon={FiUser}
            color="#B91C1C"
          />
          <StatCard
            label="Campaigns"
            value={stats?.campaignCount}
            icon={FiSend}
            color="#991B1B"
          />
          <StatCard
            label="Messages"
            value={stats?.messageCount}
            icon={FiMessageCircle}
            color="#7F1D1D"
          />
          <StatCard
            label="Groups"
            value={stats?.groupCount}
            icon={FiUsers}
            color="#DF0A0A"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Campaigns */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Campaigns</h2>
              <FiSend className="w-5 h-5 text-gray-400" />
            </div>
            {recentActivity?.recentCampaigns?.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.recentCampaigns.slice(0, 5).map((campaign) => (
                  <div
                    key={campaign._id}
                    className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{campaign.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>By: {campaign.createdBy?.name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {campaign.status || 'draft'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent campaigns</p>
              </div>
            )}
          </motion.div>

          {/* Recent Messages */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Messages</h2>
              <FiMessageCircle className="w-5 h-5 text-gray-400" />
            </div>
            {recentActivity?.recentMessages?.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.recentMessages.slice(0, 5).map((message) => (
                  <div
                    key={message._id}
                    className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 mb-1 line-clamp-2">{message.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>To: {message.recipient?.name || message.phoneNumber || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          message.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : message.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {message.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent messages</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
