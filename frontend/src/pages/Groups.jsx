import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { FiUsers, FiPlus, FiTrash2, FiX, FiUser, FiEdit2, FiCheck } from 'react-icons/fi';
import DetailPanel from '../components/DetailPanel';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/groups');
      setGroups(res.data || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      toast.error('Failed to load groups');
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await axios.get('/contacts');
      setContacts(res.data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      toast.error('Failed to load contacts');
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchContacts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        members: selectedMembers
      };

      if (selectedGroup) {
        // Update existing group
        await axios.put(`/groups/${selectedGroup._id}`, payload);
        toast.success('Group updated successfully');
      } else {
        // Create new group
        await axios.post('/groups/create', payload);
        toast.success('Group created successfully');
      }
      setName('');
      setSelectedMembers([]);
      setSelectedGroup(null);
      setShowForm(false);
      fetchGroups();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (selectedGroup ? 'Failed to update group' : 'Failed to create group');
      toast.error(errorMsg);
      console.error('Error saving group:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
    try {
      await axios.delete(`/groups/${id}`);
      toast.success('Group deleted successfully');
      fetchGroups();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete group';
      toast.error(errorMsg);
      console.error('Error deleting group:', err);
    }
  };

  const handleEdit = (group) => {
    setSelectedGroup(group);
    setName(group.name || '');
    // Get existing members
    const existingMembers = group.members || [];
    setSelectedMembers(existingMembers.map(m => m._id || m));
    setShowForm(true);
  };

  const cancelEdit = () => {
    setSelectedGroup(null);
    setName('');
    setSelectedMembers([]);
    setShowForm(false);
  };

  const toggleMember = (contactId) => {
    setSelectedMembers(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
              {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
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
              {showForm ? 'Cancel' : 'Create Group'}
            </button>
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
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedGroup ? 'Update Group' : 'Create New Group'}
                    </h2>
                    <button
                      onClick={cancelEdit}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiX className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiUsers className="inline w-4 h-4 mr-1" />
                        Group Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter group name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiUser className="inline w-4 h-4 mr-1" />
                        Select Members ({selectedMembers.length} selected)
                      </label>
                      <div className="max-h-60 overflow-y-auto border-2 rounded-lg p-3" style={{ borderColor: '#D1D5DB' }}>
                        {contacts.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">No contacts available</p>
                        ) : (
                          <div className="space-y-2">
                            {contacts.map((contact) => (
                              <label
                                key={contact._id}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(contact._id)}
                                  onChange={() => toggleMember(contact._id)}
                                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{contact.phoneNumber}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="flex-1 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: '#DF0A0A',
                          boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                        }}
                      >
                        {loading ? (selectedGroup ? 'Updating...' : 'Creating...') : (selectedGroup ? 'Update Group' : 'Create Group')}
                      </button>
                      {selectedGroup && (
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

          {/* Groups List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  All Groups ({groups.length})
                </h2>
              </div>

              {groups.length === 0 ? (
                <div className="p-12 text-center">
                  <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
                  <p className="text-gray-500 mb-4">Create your first group to organize contacts</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-white py-2 px-6 rounded-lg font-semibold transition-all duration-200"
                    style={{ backgroundColor: '#DF0A0A' }}
                  >
                    Create Group
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {groups.map((group) => (
                    <motion.div
                      key={group._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelectedDetail(group)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                              <FiUsers className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{group.name}</h3>
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <FiUser className="w-4 h-4" />
                                {group.members?.length || 0} members
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 ml-11">
                            <span>
                              Owner: {group.owner?.name || 'Unknown'}
                            </span>
                            {group.createdAt && (
                              <>
                                <span>•</span>
                                <span>
                                  Created: {new Date(group.createdAt).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(group); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit group"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(group._id); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete group"
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
      <DetailPanel open={!!selectedDetail} onClose={() => setSelectedDetail(null)} title={selectedDetail?.name || 'Group Details'}>
        {selectedDetail && (
          <div className="space-y-3 text-sm">
            <div><strong>Name:</strong> {selectedDetail.name}</div>
            <div><strong>Owner:</strong> {selectedDetail.owner?.name || '—'}</div>
            <div><strong>Members:</strong> {selectedDetail.members?.length || 0}</div>
            <div>
              <strong>Member list:</strong>
              <ul className="list-disc ml-6 mt-2">
                {(selectedDetail.members || []).slice(0, 20).map(m => (
                  <li key={m._id || m}>{m.name || m}</li>
                ))}
              </ul>
            </div>
            <div><strong>Created:</strong> {selectedDetail.createdAt ? new Date(selectedDetail.createdAt).toLocaleString() : '—'}</div>
            <div><strong>Raw ID:</strong> <code>{selectedDetail._id}</code></div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
};

export default Groups;
