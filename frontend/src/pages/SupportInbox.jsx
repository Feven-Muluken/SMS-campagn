import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import BackButton from '../components/BackButton';

const SupportInbox = () => {
  const location = useLocation();
  const isTwoWay = location.pathname.includes('/two-way-chat');
  const [contacts, setContacts] = useState([]);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [newContactId, setNewContactId] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [contactsRes, conversationsRes] = await Promise.all([
        axios.get('/sms/inbox/contacts'),
        axios.get('/sms/inbox/conversations'),
      ]);
      setContacts(Array.isArray(contactsRes.data?.data) ? contactsRes.data.data : []);
      setThreads(Array.isArray(conversationsRes.data?.data) ? conversationsRes.data.data : []);
    } catch {
      toast.error('Failed to load inbox data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isInbound = (msg) => msg?.response?.direction === 'inbound';

  const selectedThread = threads.find((item) => String(item.id) === String(selectedId)) || null;

  const selectThread = async (thread) => {
    setSelectedId(thread.id);
    try {
      const response = await axios.get(`/sms/inbox/conversations/${thread.id}/messages`);
      setMessages(Array.isArray(response.data?.data) ? response.data.data : []);
      await axios.post(`/sms/inbox/conversations/${thread.id}/read`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load conversation');
    }
  };

  const startConversation = async () => {
    if (!newContactId) return;
    setLoading(true);
    try {
      const response = await axios.post('/sms/inbox/conversations', { contactId: newContactId });
      await fetchData();
      await selectThread(response.data.data);
      setNewContactId('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedThread?.id) {
      toast.error('No conversation selected');
      return;
    }
    if (!reply.trim()) {
      toast.error('Write a message first');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/sms/inbox/conversations/${selectedThread.id}/reply`, {
        message: reply.trim(),
      });
      toast.success('Reply sent');
      setReply('');
      await selectThread(selectedThread);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-8">
      <div className='inline-flex items-center gap-3 mb-2 text-sm text-gray-500'>
        <BackButton fallbackPath="/" />
        <h1 className="text-2xl font-bold text-gray-900">{isTwoWay ? 'Two-Way SMS Chat' : 'SMS Ticketing & Support'}</h1>
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Inbox from stored messages. Inbound SMS requires the Africa&apos;s Talking webhook pointing to your server{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">POST /sms/inbound</code>. Reply works by contact or by phone number.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 max-h-[640px] overflow-auto">
          <h2 className="font-semibold text-gray-900 mb-3">Conversations</h2>
          <div className="flex gap-2 mb-3">
            <select className="min-w-0 flex-1 border rounded-lg p-2 text-sm" value={newContactId}
              onChange={(event) => setNewContactId(event.target.value)}>
              <option value="">Select contact...</option>
              {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
            </select>
            <button disabled={!newContactId || loading} onClick={startConversation}
              className="px-3 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: '#DF0A0A' }}>Chat</button>
          </div>
          <div className="space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => selectThread(thread)}
                className={`w-full text-left rounded-lg border p-3 ${String(selectedId) === String(thread.id) ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <p className="font-medium text-gray-900">
                  {thread.contact?.name || thread.customerPhone}
                </p>
                <p className="text-xs text-gray-600 truncate">{thread.lastMessage?.content || 'No messages'}</p>
              </button>
            ))}
            {!threads.length && <p className="text-sm text-gray-500">No conversations yet.</p>}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
          {!selectedThread ? (
            <p className="text-sm text-gray-500">Select a conversation to view details.</p>
          ) : (
            <>
              <div className="pb-3 border-b border-gray-200">
                <p className="font-semibold text-gray-900">
                  {selectedThread.contact?.name || 'Unknown contact'}
                </p>
                <p className="text-sm text-gray-600">{selectedThread.customerPhone}</p>
              </div>

              <div className="flex-1 overflow-auto space-y-3 py-4 max-h-[440px]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-3 border ${isInbound(msg)
                      ? 'border-blue-200 bg-blue-50'
                      : (msg.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50')}`}
                  >
                    <p className="text-sm text-gray-800">{msg.content}</p>
                    <p className="text-xs mt-2 text-gray-500">
                      {new Date(msg.createdAt).toLocaleString()} - {isInbound(msg) ? 'customer reply' : 'business message'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200">
                <textarea
                  className="w-full border rounded-lg p-3"
                  rows={3}
                  placeholder="Write reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <button
                  disabled={loading}
                  onClick={sendReply}
                  className="mt-2 px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#DF0A0A' }}
                >
                  {loading ? 'Sending...' : 'Send reply'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportInbox;
