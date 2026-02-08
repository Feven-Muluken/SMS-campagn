import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion, AnimatePresence } from 'motion/react';
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
  const [search, setSearch] = useState('');

  const toArray = (maybeArrayOrEnvelope) => {
    if (Array.isArray(maybeArrayOrEnvelope)) return maybeArrayOrEnvelope;
    if (Array.isArray(maybeArrayOrEnvelope?.data)) return maybeArrayOrEnvelope.data;
    return [];
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/groups');
      setGroups(toArray(res.data));
    } catch (err) {
      console.error('Error fetching groups:', err);
      toast.error('Failed to load groups');
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await axios.get('/contacts');
      setContacts(toArray(res.data));
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
        await axios.put(`/groups/${selectedGroup.id}`, payload);
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
    setSelectedMembers(existingMembers.map(m => m.id || m));
    setShowForm(true);
  };

  const cancelEdit = () => {
    setSelectedGroup(null);
    setName('');
    setSelectedMembers([]);
    setShowForm(false);
  };

  const searchTerm = search.trim().toLowerCase();
  const filteredGroups = searchTerm
    ? groups.filter(group => {
        const ownerName = group.owner?.name || '';
        const memberCount = String(group.members?.length || 0);
        return [group.name, ownerName, memberCount]
          .filter(Boolean)
          .some(value => value.toLowerCase().includes(searchTerm));
      })
    : groups;

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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
              {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search groups by name or owner"
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
              {showForm ? 'Cancel' : 'Create Group'}
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
                                key={contact.id}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(contact.id)}
                                  onChange={() => toggleMember(contact.id)}
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
                  All Groups ({filteredGroups.length})
                </h2>
                <p className="text-sm text-gray-500">Showing {filteredGroups.length} of {groups.length} groups</p>
              </div>

              {filteredGroups.length === 0 ? (
                searchTerm && groups.length > 0 ? (
                  <div className="p-12 text-center">
                    <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups match your search</h3>
                    <p className="text-gray-500 mb-4">Try a different group name or owner.</p>
                  </div>
                ) : (
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
                )
              ) : (
                <div className="divide-y divide-gray-200">
                  {groups.map((group) => (
                    <motion.div
                      key={group.id}
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
                            onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
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
                  <li key={m.id || m}>{m.name || m}</li>
                ))}
              </ul>
            </div>
            <div><strong>Created:</strong> {selectedDetail.createdAt ? new Date(selectedDetail.createdAt).toLocaleString() : '—'}</div>
            <div><strong>Raw ID:</strong> <code>{selectedDetail.id}</code></div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
};

export default Groups;
