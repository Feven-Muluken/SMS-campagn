import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchGroups = () => {
    axios.get('/admin/groups')
      .then(res => setGroups(res.data))
      .catch(() => toast.error('Failed to load groups'));
  };

  useEffect(fetchGroups, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await axios.post('/admin/groups', { name });
      toast.success('Group added');
      setName('');
      fetchGroups();
    } catch {
      toast.error('Failed to add group');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this group?')) return;
    try {
      await axios.delete(`/admin/groups/${id}`);
      toast.success('Group deleted');
      fetchGroups();
    } catch {
      toast.error('Failed to delete group');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Groups</h1>
      <div className="flex space-x-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="New group name" className="p-2 border rounded w-full" />
        <button onClick={handleAdd} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
          Add
        </button>
      </div>

      <ul className="space-y-4 mt-4">
        {groups.map(g => (
          <li key={g._id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <p>{g.name}</p>
            <button onClick={() => handleDelete(g._id)} className="text-red-600">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Groups;