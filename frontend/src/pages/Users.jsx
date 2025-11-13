import { useEffect, useState } from "react";
import axios from "../api/axiosInstance";
import { toast } from "sonner";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () =>{
    axios.get('/admin/users')
    .then(res => setUsers(res.data))
    .catch(() => toast.error('Failes to load users'))
    .finally(() => setLoading(false));
  };
  useEffect(fetchUsers, []);

  const handleDelete = async (id) => {
    if(!confirm('Delete this user?')) return;
    try{
      await axios.delete(`admin/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await axios.put(`admin/users/${id}/deactivate`);
      toast.success('User deactivated');
      fetchUsers();
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">User Management</h1>

        {loading ? (
          <p className="text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <ul className="space-y-4">
            {users.map(u => (
              <li key={u._id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                  <p className="font-semibold">{u.name} ({u.email})</p>
                  <p className="text-sm text-gray-600">Role: {u.role}</p>
                  <p className="text-sm text-gray-500">Status: {u.active ? 'Active' : 'Deactivated'}</p>
                </div>
                <div className="space-x-2">
                  {u.active && (
                    <button onClick={() => handleDeactivate(u._id)} className="text-yellow-600">Deactivate</button>
                  )}
                  <button onClick={() => handleDelete(u._id)} className="text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export default Users;