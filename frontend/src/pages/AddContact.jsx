import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const AddContact = () => {
  const [form, setForm] = useState({ name: '', phone: '', groupId: '', optIn: true });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const contactId = params.get('id');

  useEffect(() => {
    axios.get('/admin/groups')
      .then(res => setGroups(res.data))
      .catch(() => toast.error('Failed to load groups'));

    if (contactId) {
      axios.get(`/admin/contacts/${contactId}`)
        .then(res => {
          const { name, phone, group, optIn } = res.data;
          setForm({ name, phone, groupId: group?._id || '', optIn });
        })
        .catch(() => toast.error('Failed to load contact'));
    }
  }, [contactId]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = contactId ? `/admin/contacts/${contactId}` : '/admin/contacts';
      const method = contactId ? 'put' : 'post';
      await axios[method](endpoint, form);
      toast.success(contactId ? 'Contact updated' : 'Contact added');
      navigate('/contacts');
    } catch {
      toast.error('Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{contactId ? 'Edit Contact' : 'Add Contact'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required className="w-full p-2 border rounded" />
        <input name="phone" placeholder="Phone (+251...)" value={form.phone} onChange={handleChange} required className="w-full p-2 border rounded" />
        <select name="groupId" value={form.groupId} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Group</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
        <label className="flex items-center space-x-2">
          <input type="checkbox" name="optIn" checked={form.optIn} onChange={handleChange} />
          <span>Opt-in for messages</span>
        </label>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Saving...' : contactId ? 'Update Contact' : 'Add Contact'}
        </button>
      </form>
    </div>
  );
};

export default AddContact;