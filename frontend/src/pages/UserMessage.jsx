import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast } from 'sonner';

const UserMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get('/messages');
        setMessages(res.data || []);
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">My Messages</h1>
            {/* <p className="text-sm text-gray-500 mt-1">afroel SMS Campaign Platform</p> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {messages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FiMessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500">
              You haven't received any messages yet. Messages from campaigns will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                      <FiMessageCircle className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">SMS Message</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
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
                  <p className="text-gray-900 leading-relaxed">{message.content}</p>
                  {message.campaign && (
                    <p className="text-sm text-gray-500 mt-2">
                      From campaign: {message.campaign?.name || 'Unknown'}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMessages;
