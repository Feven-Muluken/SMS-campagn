import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import BackButton from '../components/BackButton';

const SupportInbox = () => {
  const location = useLocation();
  const isTwoWay = location.pathname.includes('/two-way-chat');
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [contactsRes, messagesRes] = await Promise.all([
        axios.get('/contacts', { params: { pageSize: 300 } }),
        axios.get('/sms/status', { params: { pageSize: 300 } }),
      ]);
      setContacts(Array.isArray(contactsRes.data?.data) ? contactsRes.data.data : []);
      setMessages(Array.isArray(messagesRes.data?.data) ? messagesRes.data.data : []);
    } catch {
      toast.error('Failed to load inbox data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const threads = useMemo(() => {
    const byPhone = new Map();
    messages.forEach((msg) => {
      const key = msg.phoneNumber || 'unknown';
      if (!byPhone.has(key)) byPhone.set(key, []);
      byPhone.get(key).push(msg);
    });
    return Array.from(byPhone.entries())
      .map(([phone, items]) => {
        const sorted = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const last = sorted[sorted.length - 1];
        const contact = contacts.find((c) => c.phoneNumber === phone);
        return { phone, items: sorted, last, contact };
      })
      .sort((a, b) => new Date(b.last?.createdAt || 0) - new Date(a.last?.createdAt || 0));
  }, [messages, contacts]);

  const isInbound = (msg) => msg?.response?.direction === 'inbound';

  const selectedThread = threads.find((item) => item.phone === selectedPhone) || null;

  const sendReply = async () => {
    if (!selectedThread?.phone) {
      toast.error('No conversation selected');
      return;
    }
    if (!reply.trim()) {
      toast.error('Write a message first');
      return;
    }

    setLoading(true);
    try {
      if (selectedThread.contact?.id) {
        await axios.post('/sms/send-contacts', {
          contactIds: [selectedThread.contact.id],
          message: reply.trim(),
        });
      } else {
        await axios.post('/sms/send-phone', {
          phoneNumber: selectedThread.phone,
          message: reply.trim(),
        });
      }
      toast.success('Reply sent');
      setReply('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-8">
      <BackButton fallbackPath="/" />
      <h1 className="text-2xl font-bold text-gray-900">{isTwoWay ? 'Two-Way SMS Chat' : 'SMS Ticketing & Support'}</h1>
      <p className="text-sm text-gray-600 mt-1">
        Inbox from stored messages. Inbound SMS requires the Africa&apos;s Talking webhook pointing to your server{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">POST /sms/inbound</code>. Reply works by contact or by phone number.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 max-h-[640px] overflow-auto">
          <h2 className="font-semibold text-gray-900 mb-3">Conversations</h2>
          <div className="space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.phone}
                onClick={() => setSelectedPhone(thread.phone)}
                className={`w-full text-left rounded-lg border p-3 ${selectedPhone === thread.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <p className="font-medium text-gray-900">
                  {thread.contact?.name || thread.last?.recipientDisplayName || thread.phone}
                </p>
                <p className="text-xs text-gray-600 truncate">{thread.last?.content || 'No messages'}</p>
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
                  {selectedThread.contact?.name || selectedThread.last?.recipientDisplayName || 'Unknown contact'}
                </p>
                <p className="text-sm text-gray-600">{selectedThread.phone}</p>
              </div>

              <div className="flex-1 overflow-auto space-y-3 py-4 max-h-[440px]">
                {selectedThread.items.map((msg) => (
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
