import { useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CreateCampaign = () => {
  const [form, setForm] = useState({
    name: '',
    message: '',
    type: 'broadcast',
    recipients: '',
    schedule: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        recipients: form.recipients.split(',').map(r => r.trim()), // convert to array
      };
      await axios.post('/campaigns', payload);
      toast.success('Campaign created successfully');
      navigate('/campaigns');
    } catch (err) {
      toast.error('Failed to create campaign');
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Campaign</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" placeholder="Campaign Name" value={form.name} onChange={handleChange} required className="w-full p-2 border rounded" />
        <select name="type" value={form.type} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="broadcast">Broadcast</option>
          <option value="group">Group</option>
          <option value="individual">Individual</option>
        </select>
        <textarea name="message" placeholder="Message" value={form.message} onChange={handleChange} required className="w-full p-2 border rounded" />
        <input name="recipients" placeholder="Recipients (comma-separated)" value={form.recipients} onChange={handleChange} className="w-full p-2 border rounded" />
        <input name="schedule" type="datetime-local" value={form.schedule} onChange={handleChange} className="w-full p-2 border rounded" />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>
    </div>

  );
};

export default CreateCampaign;