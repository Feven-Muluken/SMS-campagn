import { useState, useEffect } from 'react';
import axios from '../api/axiosInstance';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { FiSend, FiEdit2, FiTrash2, FiCalendar, FiUsers, FiMessageCircle, FiRefreshCw } from 'react-icons/fi';
import DetailPanel from '../components/DetailPanel';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    message: '', 
    type: 'broadcast/everyone',
    recipientType: 'Contact',
    groupId: '', 
    schedule: '', 
    recipients: [],
    recurring: { active: false, interval: 'daily' },
    sendNow: false 
  });
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedForSendId, setSelectedForSendId] = useState('');
  const [selectedForSendDetails, setSelectedForSendDetails] = useState(null);
  const [sending, setSending] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/campaign');
      setCampaigns(res.data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/groups');
      setGroups(res.data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await axios.get('/contacts');
      setContacts(res.data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
      setContacts([]);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchGroups();
    fetchContacts();
  }, []);

  useEffect(() => setCharCount(form.message.length), [form.message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If this is an individual campaign and user provided a new phone but didn't add it to recipients,
      // create the contact first and add its id to recipients so backend receives valid contact ids.
      if (form.type === 'individual' && form.recipientType === 'Contact' && (!form.recipients || form.recipients.length === 0) && newContactPhone) {
        try {
          const resp = await axios.post('/contacts', { name: newContactName || newContactPhone, phoneNumber: newContactPhone });
          const created = resp.data;
          // ensure contacts list and form.recipients updated
          setContacts(prev => [created, ...prev]);
          setForm(prev => ({ ...prev, recipients: [...(prev.recipients || []), created._id] }));
        } catch (contactErr) {
          console.error('Failed to create contact before campaign:', contactErr);
          toast.error(contactErr.response?.data?.message || 'Failed to create contact');
          setLoading(false);
          return;
        }
      }
      const payload = {
        name: form.name,
        message: form.message,
        type: form.type,
        recipientType: form.recipientType,
        recipients: form.recipients || [],
        group: form.groupId || null,
        schedule: form.schedule ? new Date(form.schedule).toISOString() : null,
        recurring: form.recurring.active ? form.recurring : undefined,
      };

      if (selectedCampaign) {
        const res = await axios.put(`/campaign/${selectedCampaign._id}`, payload);
        toast.success('Campaign updated successfully');
        if (res?.data) setCampaigns(prev => prev.map(c => c._id === res.data._id ? res.data : c));
        else fetchCampaigns();
        setSelectedCampaign(null);
      } else {
        const res = await axios.post('/campaign/create', payload);
        toast.success('Campaign created successfully');
        if (res?.data) setCampaigns(prev => [res.data, ...prev]);
        else fetchCampaigns();

        if (form.sendNow && res?.data?._id) {
          try {
            await axios.post('/sms/send', { campaignID: res.data._id });
            toast.success('Campaign dispatched');
          } catch (dispatchErr) {
            console.error('Dispatch error:', dispatchErr);
            toast.error('Failed to dispatch campaign');
          }
        }
      }

      setForm({ 
        name: '', 
        message: '', 
        type: 'broadcast/everyone',
        recipientType: 'Contact',
        groupId: '', 
        schedule: '', 
        recipients: [],
        recurring: { active: false, interval: 'daily' },
        sendNow: false 
      });
      setNewContactName('');
      setNewContactPhone('');
      setShowForm(false);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Error saving campaign';
      toast.error(errorMessage);
      console.error('Error saving campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await axios.delete(`/campaign/${id}`);
      toast.success('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Error deleting campaign');
    }
  };

  const handleEdit = (campaign) => {
    setSelectedCampaign(campaign);
    setForm({
      name: campaign.name || '',
      message: campaign.message || '',
      type: campaign.type || 'broadcast/everyone',
      recipientType: campaign.recipientType || 'Contact',
      groupId: campaign.group?._id || '',
      schedule: campaign.schedule ? new Date(campaign.schedule).toISOString().slice(0, 16) : '',
      recipients: campaign.recipients?.map(r => r._id || r) || [],
      recurring: campaign.recurring || { active: false, interval: 'daily' },
      sendNow: false
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setSelectedCampaign(null);
    setForm({ 
      name: '', 
      message: '', 
      type: 'broadcast/everyone',
      recipientType: 'Contact',
      groupId: '', 
      schedule: '', 
      recipients: [],
      recurring: { active: false, interval: 'daily' },
      sendNow: false 
    });
    setShowForm(false);
  };

  const handleAddContact = async () => {
    if (!newContactPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    try {
      const resp = await axios.post('/contacts', { name: newContactName || newContactPhone, phoneNumber: newContactPhone });
      const created = resp.data;
      setContacts(prev => [created, ...prev]);
      setForm(prev => ({ ...prev, recipients: [...(prev.recipients || []), created._id] }));
      setNewContactName('');
      setNewContactPhone('');
      toast.success('Contact added');
    } catch (err) {
      console.error('Error adding contact:', err);
      toast.error(err.response?.data?.message || 'Failed to add contact');
    }
  };

  const getMessageParts = () => Math.ceil(charCount / 160) || 1;
  const getEstimatedCost = () => (getMessageParts() * 0.07).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
              {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchCampaigns}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
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
                <FiSend className="w-5 h-5" />
                {showForm ? 'Cancel' : 'New Campaign'}
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
                    {selectedCampaign ? 'Update Campaign' : 'Create New Campaign'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter campaign name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{ borderColor: '#D1D5DB', color: '#0F0D1D' }}
                        required
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Message Content *
                        </label>
                        <div className="text-xs text-gray-500">
                          {charCount}/160 • {getMessageParts()} SMS • ${getEstimatedCost()}
                        </div>
                      </div>
                      <textarea
                        placeholder="Type your message here..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full h-32 px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2 resize-none"
                        style={{ borderColor: '#D1D5DB', color: '#0F0D1D' }}
                        required
                        maxLength={480}
                      />
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((charCount / 160) * 100, 100)}%`,
                              backgroundColor: '#DF0A0A'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Type *
                      </label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{ borderColor: '#D1D5DB', color: '#0F0D1D' }}
                        required
                      >
                        <option value="individual">Individual</option>
                        <option value="group">Group</option>
                        <option value="broadcast/everyone">Broadcast/Everyone</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Type *
                      </label>
                      <select
                        value={form.recipientType}
                        onChange={(e) => setForm({ ...form, recipientType: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{ borderColor: '#D1D5DB', color: '#0F0D1D' }}
                        required
                      >
                        <option value="Contact">Contact</option>
                        <option value="User">User</option>
                      </select>
                    </div>

                    {form.type === 'group' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Group
                        </label>
                        <select
                          value={form.groupId}
                          onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                          className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                          style={{ borderColor: '#D1D5DB', color: '#0F0D1D' }}
                        >
                          <option value="">Select a group</option>
                          {groups.map((group) => (
                            <option key={group._id} value={group._id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {form.type === 'individual' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Name (optional)"
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                              className="w-1/2 px-3 py-2 border rounded-md"
                            />
                            <input
                              type="tel"
                              placeholder="Phone number (E.164)"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(e.target.value)}
                              className="w-1/2 px-3 py-2 border rounded-md"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={handleAddContact} className="px-4 py-2 bg-green-600 text-white rounded-md">Add contact</button>
                            <select
                              multiple
                              value={form.recipients || []}
                              onChange={(e) => {
                                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                                setForm(prev => ({ ...prev, recipients: opts }));
                              }}
                              className="flex-1 px-3 py-2 border rounded-md"
                            >
                              {contacts.map(c => (
                                <option key={c._id} value={c._id}>{c.name || c.phoneNumber} — {c.phoneNumber}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiCalendar className="inline w-4 h-4 mr-1" />
                        Schedule Delivery (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={form.schedule}
                        onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{ borderColor: '#D1D5DB', color: '#0F0D1D' }}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to send immediately</p>
                    </div>

                    {!selectedCampaign && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="sendNow"
                          checked={form.sendNow}
                          onChange={(e) => setForm({ ...form, sendNow: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="sendNow" className="text-sm text-gray-700">
                          Send immediately after creation
                        </label>
                      </div>
                    )}

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
                        {loading ? 'Saving...' : selectedCampaign ? 'Update Campaign' : 'Create Campaign'}
                      </button>
                      {selectedCampaign && (
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

          {/* Campaigns List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900">All Campaigns ({campaigns.length})</h2>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedForSendId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setSelectedForSendId(id);
                      if (!id) {
                        setSelectedForSendDetails(null);
                        return;
                      }
                      try {
                        const res = await axios.get(`/campaign/${id}`);
                        setSelectedForSendDetails(res.data);
                      } catch (err) {
                        console.error('Failed to fetch campaign details', err);
                        toast.error('Failed to fetch campaign details');
                        setSelectedForSendDetails(null);
                      }
                    }}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="">Select campaign to send</option>
                    {campaigns.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={async () => {
                      if (!selectedForSendId) return toast.error('Select a campaign to send');
                      if (!window.confirm('Send this campaign now?')) return;
                      setSending(true);
                      try {
                        await axios.post('/sms/send', { campaignID: selectedForSendId });
                        toast.success('Campaign dispatched');
                        // Optionally refresh campaigns/messages
                        fetchCampaigns();
                      } catch (err) {
                        console.error('Error dispatching campaign:', err);
                        toast.error(err.response?.data?.message || 'Failed to dispatch campaign');
                      } finally {
                        setSending(false);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-60"
                    disabled={sending}
                  >
                    {sending ? 'Sending...' : 'Send Selected'}
                  </button>
                </div>
              </div>

              {loading && campaigns.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading campaigns...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="p-12 text-center">
                  <FiSend className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-500 mb-4">Create your first campaign to get started</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-white py-2 px-6 rounded-lg font-semibold transition-all duration-200"
                    style={{ backgroundColor: '#DF0A0A' }}
                  >
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <motion.div
                      key={campaign._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelectedDetail(campaign)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
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

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{campaign.message}</p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiMessageCircle className="w-4 h-4" />
                              Type: {campaign.type}
                            </span>
                            <span>•</span>
                            <span>Recipient: {campaign.recipientType}</span>
                            {campaign.group && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <FiUsers className="w-4 h-4" />
                                  {campaign.group?.name || 'No group'}
                                </span>
                              </>
                            )}
                            {campaign.schedule && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <FiCalendar className="w-4 h-4" />
                                  {new Date(campaign.schedule).toLocaleString()}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(campaign); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit campaign"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(campaign._id); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete campaign"
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
      <DetailPanel open={!!selectedDetail} onClose={() => setSelectedDetail(null)} title={selectedDetail?.name || 'Campaign Details'}>
        {selectedDetail && (
          <div className="space-y-3 text-sm">
            <div><strong>Name:</strong> {selectedDetail.name}</div>
            <div><strong>Message:</strong> {selectedDetail.message}</div>
            <div><strong>Type:</strong> {selectedDetail.type}</div>
            <div><strong>Recipient Type:</strong> {selectedDetail.recipientType}</div>
            <div><strong>Group:</strong> {selectedDetail.group?.name || '—'}</div>
            <div><strong>Recipients:</strong> {(selectedDetail.recipients || []).length}</div>
            <div><strong>Scheduled:</strong> {selectedDetail.schedule ? new Date(selectedDetail.schedule).toLocaleString() : '—'}</div>
            <div><strong>Created:</strong> {new Date(selectedDetail.createdAt).toLocaleString()}</div>
            <div><strong>Raw ID:</strong> <code>{selectedDetail._id}</code></div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
};

export default Campaigns;
