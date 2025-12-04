import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { FiSend, FiUsers, FiMessageCircle, FiPhone, FiUser } from 'react-icons/fi';

const SendSMS = () => {
  const [form, setForm] = useState({
    message: '',
    sendType: 'campaign', // 'campaign', 'group', 'contact'
    campaignID: '',
    groupId: '',
    contactIds: []
  });
  const [campaigns, setCampaigns] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignsRes, groupsRes, contactsRes] = await Promise.all([
          axios.get('/campaign'),
          axios.get('/groups'),
          axios.get('/contacts')
        ]);
        setCampaigns(campaignsRes.data || []);
        setGroups(groupsRes.data || []);
        setContacts(contactsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCharCount(form.message.length);
  }, [form.message]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      // Handle contact selection
      const contactId = value;
      setForm(prev => ({
        ...prev,
        contactIds: prev.contactIds.includes(contactId)
          ? prev.contactIds.filter(id => id !== contactId)
          : [...prev.contactIds, contactId]
      }));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let payload = {};

      let response;
      if (form.sendType === 'campaign') {
        if (!form.campaignID) {
          toast.error('Please select a campaign');
          setLoading(false);
          return;
        }
        payload = { campaignID: form.campaignID };
        response = await axios.post('/sms/send', payload);
      } else if (form.sendType === 'group') {
        if (!form.groupId) {
          toast.error('Please select a group');
          setLoading(false);
          return;
        }
        if (!form.message.trim()) {
          toast.error('Please enter a message');
          setLoading(false);
          return;
        }
        payload = {
          groupId: form.groupId,
          message: form.message
        };
        response = await axios.post('/sms/send-group', payload);
      } else if (form.sendType === 'contact') {
        if (form.contactIds.length === 0) {
          toast.error('Please select at least one contact');
          setLoading(false);
          return;
        }
        if (!form.message.trim()) {
          toast.error('Please enter a message');
          setLoading(false);
          return;
        }
        payload = {
          contactIds: form.contactIds,
          message: form.message
        };
        response = await axios.post('/sms/send-contacts', payload);
      }

      // Show success message with details if available
      if (response.data.successCount !== undefined) {
        toast.success(
          `SMS sent successfully! ${response.data.successCount} sent, ${response.data.failCount} failed`
        );
      } else {
      toast.success('SMS sent successfully');
      }

      setForm({ 
        message: '', 
        sendType: 'campaign',
        campaignID: '',
        groupId: '',
        contactIds: []
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      // Extract detailed error message
      const errorMsg = error.response?.data?.error || 
                      error.response?.data?.message || 
                      error.message || 
                      'Failed to send SMS. Please check your API credentials and try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getMessageParts = () => Math.ceil(charCount / 160) || 1;
  const getEstimatedCost = () => (getMessageParts() * 0.07).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        {/* <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Send SMS</h1>
            <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p>
          </div>
        </div> */}
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Send SMS</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Send Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send To *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sendType: 'campaign', groupId: '', contactIds: [] })}
                  className={`p-3 rounded-lg border-2 transition-all ${form.sendType === 'campaign'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <FiMessageCircle className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Campaign</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sendType: 'group', campaignID: '', contactIds: [] })}
                  className={`p-3 rounded-lg border-2 transition-all ${form.sendType === 'group'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <FiUsers className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Group</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sendType: 'contact', campaignID: '', groupId: '' })}
                  className={`p-3 rounded-lg border-2 transition-all ${form.sendType === 'contact'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <FiUser className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Contacts</span>
                </button>
              </div>
            </div>

            {/* Campaign Selection */}
            {form.sendType === 'campaign' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMessageCircle className="inline w-4 h-4 mr-1" />
                  Select Campaign *
                </label>
                <select
                  name="campaignID"
                  value={form.campaignID}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                  style={{
                    borderColor: '#D1D5DB',
                    color: '#0F0D1D'
                  }}
                  required
                >
                  <option value="">Select a campaign to send</option>
                  {campaigns.length === 0 ? null : (
                    campaigns.map((campaign) => (
                      <option
                        key={campaign._id}
                        value={campaign._id}
                        disabled={campaign.status === 'sent'}
                      >
                        {campaign.name} - {campaign.recipients?.length || 0} recipients
                        {campaign.status === 'sent' ? ' (sent)' : ''}
                      </option>
                    ))
                  )}
                </select>
                {form.campaignID && (
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Campaign Message:</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      {campaigns.find((c) => c._id === form.campaignID)?.message || 'No message'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Group Selection */}
            {form.sendType === 'group' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiUsers className="inline w-4 h-4 mr-1" />
                  Select Group *
                </label>
                <select
                  name="groupId"
                  value={form.groupId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                  style={{
                    borderColor: '#D1D5DB',
                    color: '#0F0D1D'
                  }}
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name} ({group.memebers?.length || group.members?.length || 0} members)
                    </option>
                  ))}
        </select>
              </div>
            )}

            {/* Contact Selection */}
            {form.sendType === 'contact' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiUser className="inline w-4 h-4 mr-1" />
                  Select Contacts * ({form.contactIds.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border-2 rounded-lg p-4" style={{ borderColor: '#D1D5DB' }}>
                  {contacts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No contacts available</p>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <label
                          key={contact._id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            value={contact._id}
                            checked={form.contactIds.includes(contact._id)}
                            onChange={handleChange}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                            <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message Input (for group and contact types) */}
            {(form.sendType === 'group' || form.sendType === 'contact') && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <FiMessageCircle className="inline w-4 h-4 mr-1" />
                    Message Content *
                  </label>
                  <div className="text-sm text-gray-500">
                    {charCount}/160 chars • {getMessageParts()} SMS • ${getEstimatedCost()}
                  </div>
                </div>
                <textarea
                  name="message"
                  placeholder="Type your message here..."
                  value={form.message}
                  onChange={handleChange}
                  className="w-full h-32 px-4 py-3 border-2 rounded-lg text-sm focus:outline-none transition-colors resize-none"
                  style={{
                    borderColor: '#D1D5DB',
                    color: '#0F0D1D'
                  }}
                  required
                  maxLength={480}
                />
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white py-4 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#DF0A0A',
                  boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                }}
              >
                <FiSend className="w-5 h-5" />
          {loading ? 'Sending...' : 'Send SMS'}
        </button>
            </div>
      </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SendSMS;
