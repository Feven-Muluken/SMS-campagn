import { useState, useEffect } from 'react';
import axios from '../api/axiosInstance';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiUsers, FiMessageCircle, FiCalendar } from 'react-icons/fi';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    message: '',
    type: 'broadcast/everyone',
    recipientType: 'Contact',
    recipients: [],
    group: '',
    schedule: '',
    recurring: { active: false, interval: 'daily' },
    sendNow: true,
  });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsRes] = await Promise.all([
          axios.get('/groups'),
        ]);
        setGroups(groupsRes.data || []);
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
    const { name, value, type, checked } = e.target;
    if (name === 'recurring') {
      setForm({
        ...form,
        recurring: { ...form.recurring, active: checked }
      });
    } else if (name === 'sendNow') {
      setForm({
        ...form,
        sendNow: checked,
        schedule: checked ? '' : form.schedule,
        recurring: checked ? { active: false, interval: 'daily' } : form.recurring,
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.sendNow && !form.schedule) {
        toast.error('Pick a schedule time (or choose Send now)');
        setLoading(false);
        return;
      }
      if (form.recurring?.active && !form.schedule) {
        toast.error('Recurring requires a scheduled time');
        setLoading(false);
        return;
      }

      const payload = {
        name: form.name,
        message: form.message,
        type: form.type,
        recipientType: form.recipientType,
        recipients: form.recipients.length > 0 ? form.recipients : undefined,
        group: form.group || undefined,
        schedule: form.sendNow ? null : (form.schedule ? new Date(form.schedule).toISOString() : null),
        recurring: (!form.sendNow && form.recurring.active) ? form.recurring : undefined
      };

      await axios.post('/campaign/create', payload);
      toast.success('Campaign created successfully');
      navigate('/campaign');
    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create campaign';
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
            {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                name="name"
                type="text"
                placeholder="Enter campaign name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#0F0D1D'
                }}
                required
                maxLength={100}
              />
            </div>

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
                className="w-full h-32 px-4 py-3 bg-transparent border-2 rounded-lg text-sm focus:outline-none transition-colors resize-none"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#0F0D1D'
                }}
                required
                maxLength={480}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiUsers className="inline w-4 h-4 mr-1" />
                Target Group (Optional)
              </label>
              <select
                name="group"
                value={form.group}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#0F0D1D'
                }}
              >
                <option value="">Select a group (or leave empty for broadcast)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="inline w-4 h-4 mr-1" />
                Delivery Timing
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={!!form.sendNow}
                    onChange={() => setForm((prev) => ({
                      ...prev,
                      sendNow: true,
                      schedule: '',
                      recurring: { active: false, interval: 'daily' },
                    }))}
                  />
                  Send now
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={!form.sendNow}
                    onChange={() => setForm((prev) => ({ ...prev, sendNow: false }))}
                  />
                  Schedule for later
                </label>
              </div>

              {!form.sendNow && (
                <div className="mt-3">
                  <input
                    name="schedule"
                    type="datetime-local"
                    value={form.schedule}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                    style={{
                      borderColor: '#D1D5DB',
                      color: '#0F0D1D'
                    }}
                    min={new Date().toISOString().slice(0, 16)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Campaign scheduler will send automatically at this time.</p>
                </div>
              )}
            </div>

            {!form.sendNow && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="recurring"
                    checked={!!form.recurring?.active}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  Recurring schedule
                </label>
                {form.recurring?.active && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700">Repeat:</label>
                    <select
                      value={form.recurring?.interval || 'daily'}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        recurring: { ...prev.recurring, interval: e.target.value },
                      }))}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
                <p className="text-xs text-gray-500">Recurring campaigns re-schedule after each dispatch.</p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white py-4 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                style={{
                  backgroundColor: '#DF0A0A',
                  boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                }}
              >
                <FiSend className="w-5 h-5" />
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateCampaign;
