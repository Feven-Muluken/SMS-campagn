import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { FiUser, FiPhone, FiUsers, FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import DetailPanel from '../components/DetailPanel';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ name: '', phoneNumber: '', groups: '' });
  const [selectedContact, setSelectedContact] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [search, setSearch] = useState('');

  const toArray = (maybeArrayOrEnvelope) => {
    if (Array.isArray(maybeArrayOrEnvelope)) return maybeArrayOrEnvelope;
    if (Array.isArray(maybeArrayOrEnvelope?.data)) return maybeArrayOrEnvelope.data;
    return [];
  };

  const fetchContacts = async () => {
    try {
      const res = await axios.get('/contacts');
      setContacts(toArray(res.data));
    } catch (error) {
      console.error('zz fetching contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/groups');
      setGroups(toArray(res.data));
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        ...(form.groups && form.groups.trim() !== '' ? { groups: form.groups } : {})
      };

      if (selectedContact) {
        await axios.put(`/contacts/${selectedContact.id}`, payload);
        toast.success('Contact updated successfully');
      } else {
        await axios.post('/contacts', payload);
        toast.success('Contact created successfully');
      }

      setForm({ name: '', phoneNumber: '', groups: '' });
      setSelectedContact(null);
      setShowForm(false);
      fetchContacts();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error saving contact';
      toast.error(errorMsg);
      console.error('Error saving contact:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await axios.delete(`/contacts/${id}`);
      toast.success('Contact deleted successfully');
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setForm({
      name: contact.name || '',
      phoneNumber: contact.phoneNumber || '',
      groups: contact.groups?.[0]?.id || ''
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setSelectedContact(null);
    setForm({ name: '', phoneNumber: '', groups: '' });
    setShowForm(false);
  };

  const searchTerm = search.trim().toLowerCase();
  const filteredContacts = searchTerm
    ? contacts.filter(contact => {
        const groupName = contact.groups?.[0]?.name || '';
        return [contact.name, contact.phoneNumber, groupName]
          .filter(Boolean)
          .some(value => value.toLowerCase().includes(searchTerm));
      })
    : contacts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone, or group"
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            <button
              onClick={() => {
                cancelEdit();
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 text-white py-2.5 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: '#DF0A0A',
                boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
              }}
            >
              <FiPlus className="w-5 h-5" />
              {showForm ? 'Cancel' : 'Add Contact'}
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {selectedContact ? 'Update Contact' : 'Create New Contact'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiUser className="inline w-4 h-4 mr-1" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter contact name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                        type="tel"
                        placeholder="+251XXXXXXXXX"
                        value={form.phoneNumber}
                        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
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
                        value={form.groups}
                        onChange={(e) => setForm({ ...form, groups: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                      >
                        <option value="">Select a group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
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
                        {loading ? 'Saving...' : selectedContact ? 'Update Contact' : 'Create Contact'}
                      </button>
                      {selectedContact && (
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contacts List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  All Contacts ({filteredContacts.length})
                </h2>
                <p className="text-sm text-gray-500">Showing {filteredContacts.length} of {contacts.length} contacts</p>
              </div>

              {filteredContacts.length === 0 ? (
                searchTerm && contacts.length > 0 ? (
                  <div className="p-12 text-center">
                    <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts match your search</h3>
                    <p className="text-gray-500 mb-4">Try a different name, phone, or group.</p>
                  </div>
                ) : (
                <div className="p-12 text-center">
                  <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts yet</h3>
                  <p className="text-gray-500 mb-4">Create your first contact to get started</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-white py-2 px-6 rounded-lg font-semibold transition-all duration-200"
                    style={{ backgroundColor: '#DF0A0A' }}
                  >
                    Add Contact
                  </button>
                </div>
                )
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredContacts.map((contact) => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelectedDetail(contact)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                              <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <FiPhone className="w-4 h-4" />
                                {contact.phoneNumber}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 ml-11">
                            {contact.groups && contact.groups.length > 0 && (
                              <>
                                <span className="flex items-center gap-1">
                                  <FiUsers className="w-4 h-4" />
                                  {contact.groups?.[0]?.name || 'No group'}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>
                              Created: {new Date(contact.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(contact); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit contact"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete contact"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <DetailPanel open={!!selectedDetail} onClose={() => setSelectedDetail(null)} title={selectedDetail?.name || 'Contact Details'}>
        {selectedDetail && (
          <div className="space-y-3 text-sm">
            <div><strong>Name:</strong> {selectedDetail.name}</div>
            <div><strong>Phone:</strong> {selectedDetail.phoneNumber}</div>
            <div><strong>Group:</strong> {selectedDetail.groups?.[0]?.name || '—'}</div>
            <div><strong>Created:</strong> {new Date(selectedDetail.createdAt).toLocaleString()}</div>
            <div><strong>Raw ID:</strong> <code>{selectedDetail.id}</code></div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
};

export default Contacts;
