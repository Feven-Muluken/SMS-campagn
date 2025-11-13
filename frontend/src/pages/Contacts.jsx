import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = () => {
    axios.get('/admin/contacts')
      .then(res => setContacts(res.data))
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchContacts, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await axios.delete(`/admin/contacts/${id}`);
      toast.success('Contact deleted');
      fetchContacts();
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contacts</h1>
      <Link to="/add-contact" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block">
        Add Contact
      </Link>

      {loading ? (
        <p className="text-gray-500">Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <p className="text-gray-500">No contacts found.</p>
      ) : (
        <ul className="space-y-4">
          {contacts.map(c => (
            <li key={c._id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-gray-600">{c.phone}</p>
                <p className="text-sm text-gray-500">Group: {c.group?.name || 'None'} | Consent: {c.optIn ? '✅' : '❌'}</p>
              </div>
              <div className="space-x-2">
                <Link to={`/add-contact?id=${c._id}`} className="text-blue-600">Edit</Link>
                <button onClick={() => handleDelete(c._id)} className="text-red-600">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Contacts;