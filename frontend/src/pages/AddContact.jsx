import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { FiUser, FiPhone, FiUsers, FiArrowLeft } from 'react-icons/fi';

const AddContact = () => {
  const [form, setForm] = useState({ name: '', phoneNumber: '', groups: '' });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const contactId = params.get('id');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get('/groups');
        setGroups(res.data || []);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast.error('Failed to load groups');
      }
    };
    fetchGroups();

    if (contactId) {
      const fetchContact = async () => {
        try {
          const res = await axios.get(`/contacts/${contactId}`);
          const contact = res.data;
          setForm({
            name: contact.name || '',
            phoneNumber: contact.phoneNumber || '',
            groups: contact.groups?._id || contact.groups || ''
          });
        } catch (error) {
          console.error('Error fetching contact:', error);
          toast.error('Failed to load contact');
        }
      };
      fetchContact();
    }
  }, [contactId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        phoneNumber: form.phoneNumber,
        groups: form.groups || undefined
      };

      if (contactId) {
        await axios.put(`/contacts/${contactId}`, payload);
        toast.success('Contact updated successfully');
      } else {
        await axios.post('/contacts', payload);
        toast.success('Contact created successfully');
      }
      navigate('/contacts');
    } catch (error) {
      console.error('Error saving contact:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save contact';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/contacts')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {contactId ? 'Edit Contact' : 'Add Contact'}
              </h1>
              {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiUser className="inline w-4 h-4 mr-1" />
                Full Name *
              </label>
              <input
                name="name"
                type="text"
                placeholder="Enter contact name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#0F0D1D'
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiPhone className="inline w-4 h-4 mr-1" />
                Phone Number *
              </label>
              <input
                name="phoneNumber"
                type="tel"
                placeholder="+251XXXXXXXXX"
                value={form.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#0F0D1D'
                }}
                required
                pattern="^\+[1-9]\d{1,14}$"
              />
              <p className="text-xs text-gray-500 mt-1">Format: +[country code][number]</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiUsers className="inline w-4 h-4 mr-1" />
                Group (Optional)
              </label>
              <select
                name="groups"
                value={form.groups}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#0F0D1D'
                }}
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                style={{
                  backgroundColor: '#DF0A0A',
                  boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                }}
              >
                {loading ? 'Saving...' : contactId ? 'Update Contact' : 'Create Contact'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/contacts')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AddContact;
