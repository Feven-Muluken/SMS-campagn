import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';

const SendSMS = () => {
  const [form, setForm] = useState({ message: '', recipients: '' });
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/admin/groups')
      .then(res => setGroups(res.data))
      .catch(() => toast.error('Failed to load groups'));
  }, []);

  const handleGroupSelect = async (groupId) => {
    setSelectedGroup(groupId);
    try {
      const res = await axios.get(`/groups/${groupId}`);
      const phones = res.data.contacts.map(c => c.phone).join(',');
      setForm({ ...form, recipients: phones });
    } catch {
      toast.error('Failed to load group contacts');
    }
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/sms/send', form);
      toast.success('SMS sent successfully');
      setForm({ message: '', recipients: '' });
      setSelectedGroup('');
    } catch {
      toast.error('Failed to send SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Send SMS</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea name="message" placeholder="Message" value={form.message} onChange={handleChange} required className="w-full p-2 border rounded" />
        <input name="recipients" placeholder="Recipients (comma-separated)" value={form.recipients} onChange={handleChange} required className="w-full p-2 border rounded" />

        <select value={selectedGroup} onChange={e => handleGroupSelect(e.target.value)} className="w-full p-2 border rounded">
          <option value="">Select Group</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>

        <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Sending...' : 'Send SMS'}
        </button>
      </form>
    </div>
  );
};

export default SendSMS;