import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';

const BillingAlerts = () => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sendType, setSendType] = useState('contact');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);

  const [template, setTemplate] = useState('invoice_due');
  const [invoiceNo, setInvoiceNo] = useState('INV-001');
  const [amount, setAmount] = useState('2500');
  const [dueDate, setDueDate] = useState('');

  const fetchData = async () => {
    try {
      const [contactsRes, groupsRes] = await Promise.all([
        axios.get('/contacts', { params: { pageSize: 300 } }),
        axios.get('/groups', { params: { pageSize: 300 } }),
      ]);
      setContacts(Array.isArray(contactsRes.data?.data) ? contactsRes.data.data : []);
      setGroups(Array.isArray(groupsRes.data?.data) ? groupsRes.data.data : Array.isArray(groupsRes.data) ? groupsRes.data : []);
    } catch {
      toast.error('Failed to load billing recipients');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const message = useMemo(() => {
    if (template === 'invoice_due') {
      return `Invoice ${invoiceNo}: Amount ETB ${amount} is due on ${dueDate || 'your due date'}. Reply if you need support.`;
    }
    if (template === 'payment_received') {
      return `Payment received for invoice ${invoiceNo}. Amount ETB ${amount}. Thank you.`;
    }
    return `Reminder: Invoice ${invoiceNo} has an outstanding amount ETB ${amount}. Please settle by ${dueDate || 'the due date'}.`;
  }, [template, invoiceNo, amount, dueDate]);

  const toggleContact = (id) => {
    setSelectedContactIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const sendBillingAlert = async () => {
    setLoading(true);
    try {
      if (sendType === 'contact') {
        if (!selectedContactIds.length) {
          toast.error('Select at least one contact');
          setLoading(false);
          return;
        }
        await axios.post('/sms/send-contacts', {
          contactIds: selectedContactIds,
          message,
        });
      } else {
        if (!groupId) {
          toast.error('Select a group');
          setLoading(false);
          return;
        }
        await axios.post('/sms/send-group', {
          groupId,
          message,
        });
      }

      toast.success('Billing alerts sent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send billing alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-8">
      <BackButton fallbackPath="/admin" />
      <h1 className="text-2xl font-bold text-gray-900">SMS Invoices & Billing Alerts</h1>
      <p className="text-sm text-gray-600 mt-1">Send invoice reminders, payment confirmations, and billing follow-ups by SMS.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="border rounded-lg p-2" value={template} onChange={(e) => setTemplate(e.target.value)}>
              <option value="invoice_due">Invoice Due</option>
              <option value="payment_received">Payment Received</option>
              <option value="overdue_notice">Overdue Notice</option>
            </select>
            <input className="border rounded-lg p-2" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice #" />
            <input className="border rounded-lg p-2" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
          </div>
          <input type="date" className="border rounded-lg p-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

          <div>
            <p className="text-sm font-medium text-gray-700">Message preview</p>
            <div className="mt-1 border border-gray-200 bg-gray-50 rounded-lg p-3 text-sm text-gray-800">{message}</div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setSendType('contact')} className={`px-3 py-2 rounded-lg border ${sendType === 'contact' ? 'bg-red-50 border-red-300' : 'border-gray-300'}`}>Send to contacts</button>
            <button onClick={() => setSendType('group')} className={`px-3 py-2 rounded-lg border ${sendType === 'group' ? 'bg-red-50 border-red-300' : 'border-gray-300'}`}>Send to group</button>
          </div>

          <button disabled={loading} onClick={sendBillingAlert} className="px-5 py-2 rounded-lg text-white" style={{ backgroundColor: '#DF0A0A' }}>
            {loading ? 'Sending...' : 'Send Billing Alert'}
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-[520px] overflow-auto">
          {sendType === 'contact' ? (
            <>
              <h2 className="font-semibold mb-3">Select contacts</h2>
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <label key={contact.id} className="flex items-center gap-2 border rounded-lg p-2">
                    <input type="checkbox" checked={selectedContactIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} />
                    <span className="text-sm">{contact.name || 'Contact'} ({contact.phoneNumber})</span>
                  </label>
                ))}
                {!contacts.length && <p className="text-sm text-gray-500">No contacts available</p>}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-semibold mb-3">Select group</h2>
              <select className="w-full border rounded-lg p-2" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Choose group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingAlerts;
