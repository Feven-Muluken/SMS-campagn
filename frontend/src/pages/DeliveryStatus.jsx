import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiClock, FiCheckCircle, FiXCircle, FiPhone } from 'react-icons/fi';
import { toast } from 'sonner';
import DetailPanel from '../components/DetailPanel';

const DeliveryStatus = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, sent, failed, pending
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get('/sms/status');
        setMessages(res.data || []);
      } catch (error) {
        console.error('Failed to load delivery status:', error);
        toast.error('Failed to load delivery status');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  const filteredMessages = messages.filter((msg) => {
    if (filter === 'all') return true;
    return msg.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <FiXCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FiClock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const stats = {
    total: messages.length,
    sent: messages.filter((m) => m.status === 'sent').length,
    failed: messages.filter((m) => m.status === 'failed').length,
    pending: messages.filter((m) => m.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Status</h1>
            {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <p className="text-sm font-medium text-gray-600 mb-1">Total Messages</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <p className="text-sm font-medium text-gray-600 mb-1">Sent</p>
            <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <p className="text-sm font-medium text-gray-600 mb-1">Failed</p>
            <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </motion.div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          {['all', 'sent', 'failed', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${filter === status
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              style={
                filter === status
                  ? {
                    backgroundColor: '#DF0A0A',
                    boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                  }
                  : {}
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FiMessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages found</h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'No messages have been sent yet.'
                : `No ${filter} messages found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message, index) => (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => setSelectedDetail(message)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                      <FiMessageCircle className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FiPhone className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {message.recipient || message.phoneNumber || 'Unknown recipient'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <FiClock className="w-4 h-4" />
                        {message.sentAt
                          ? new Date(message.sentAt).toLocaleString()
                          : message.createdAt
                            ? new Date(message.createdAt).toLocaleString()
                            : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(message.status)}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        message.status
                      )}`}
                    >
                      {message.status || 'pending'}
                    </span>
                  </div>
                </div>
                <div className="ml-11">
                  <p className="text-gray-900 leading-relaxed">{message.content || message.message}</p>
                  {message.campaign && (
                    <p className="text-sm text-gray-500 mt-2">
                      Campaign: {message.campaign?.name || 'Unknown'}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
          <DetailPanel open={!!selectedDetail} onClose={() => setSelectedDetail(null)} title={'Message Details'}>
            {selectedDetail && (
              <div className="space-y-3 text-sm">
                <div><strong>Recipient:</strong> {selectedDetail.recipient || selectedDetail.phoneNumber}</div>
                <div><strong>Status:</strong> {selectedDetail.status}</div>
                <div><strong>Content:</strong> {selectedDetail.content || selectedDetail.message}</div>
                <div><strong>Campaign:</strong> {selectedDetail.campaign?.name || '—'}</div>
                <div><strong>Sent At:</strong> {selectedDetail.sentAt ? new Date(selectedDetail.sentAt).toLocaleString() : (selectedDetail.createdAt ? new Date(selectedDetail.createdAt).toLocaleString() : '—')}</div>
                <div><strong>Provider response:</strong> <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(selectedDetail.response || selectedDetail.providerResponse || selectedDetail.responseData || {}, null, 2)}</pre></div>
                <div><strong>Raw ID:</strong> <code>{selectedDetail._id}</code></div>
              </div>
            )}
          </DetailPanel>
      </div>
    </div>
  );
};

export default DeliveryStatus;
