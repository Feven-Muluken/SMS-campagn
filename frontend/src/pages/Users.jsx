import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { FiUser, FiMail, FiShield, FiEdit2, FiTrash2, FiPlus, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import DetailPanel from '../components/DetailPanel';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/admin/users');
      setUsers(res.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await axios.delete(`/admin/users/${id}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete user';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '', // Don't pre-fill password
      role: user.role || 'viewer'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role
      };

      // Only include password if it's provided (for updates) or if creating new user
      if (form.password) {
        payload.password = form.password;
      }

      if (selectedUser) {
        // Update existing user
        await axios.put(`/admin/users/${selectedUser._id}`, payload);
        toast.success('User updated successfully');
      } else {
        // Create new user - password is required
        if (!form.password) {
          toast.error('Password is required for new users');
          setFormLoading(false);
          return;
        }
        await axios.post('/auth/admin/register', payload);
        toast.success('User created successfully');
      }

      // Reset form and close
      setForm({ name: '', email: '', password: '', role: 'viewer' });
      setSelectedUser(null);
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save user';
      toast.error(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const cancelEdit = () => {
    setSelectedUser(null);
    setForm({ name: '', email: '', password: '', role: 'viewer' });
    setShowForm(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return { bg: '#FEE2E2', text: '#DF0A0A' };
      case 'staff':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (<>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              {/* <p className="text-sm text-gray-500 mt-1">Afroel SMS Campaign Platform</p> */}
            </div>
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
              <FiPlus className="w-5 h-5" />
              {showForm ? 'Cancel' : 'Add User'}
            </button>
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
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedUser ? 'Update User' : 'Create New User'}
                    </h2>
                    <button
                      onClick={cancelEdit}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiX className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiUser className="inline w-4 h-4 mr-1" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter user name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiMail className="inline w-4 h-4 mr-1" />
                        Email *
                      </label>
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiShield className="inline w-4 h-4 mr-1" />
                        Password {selectedUser ? '(Optional - leave blank to keep current)' : '*'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={selectedUser ? 'Enter new password' : 'Enter password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-4 py-3 pr-10 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                          style={{
                            borderColor: '#D1D5DB',
                            color: '#0F0D1D'
                          }}
                          required={!selectedUser}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <FiEyeOff className="w-5 h-5" />
                          ) : (
                            <FiEye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiShield className="inline w-4 h-4 mr-1" />
                        Role *
                      </label>
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="w-full px-4 py-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                        required
                      >
                        <option value="viewer">Viewer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="flex-1 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                        style={{
                          backgroundColor: '#DF0A0A',
                          boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                        }}
                      >
                        {formLoading ? 'Saving...' : selectedUser ? 'Update User' : 'Create User'}
                      </button>
                      {selectedUser && (
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

          {/* Users List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  All Users ({users.length})
                </h2>
              </div>

              {users.length === 0 ? (
                <div className="p-12 text-center">
                  <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500 mb-4">Create your first user to get started</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-white py-2 px-6 rounded-lg font-semibold transition-all duration-200"
                    style={{ backgroundColor: '#DF0A0A' }}
                  >
                    Add User
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const roleColor = getRoleColor(user.role);
                    return (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        onClick={() => setSelectedDetail(user)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                                <FiUser className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                  <span
                                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                                    style={{
                                      backgroundColor: roleColor.bg,
                                      color: roleColor.text
                                    }}
                                  >
                                    {user.role || 'viewer'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <FiMail className="w-4 h-4" />
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 ml-11">
                              {user.createdAt && (
                                <span>
                                  Created: {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                              )}
                              {user.updatedAt && user.updatedAt !== user.createdAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Updated: {new Date(user.updatedAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Edit user"
                            >
                              <FiEdit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(user._id); }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete user"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
      <DetailPanel open={!!selectedDetail} onClose={() => setSelectedDetail(null)} title={selectedDetail?.name || 'User Details'}>
        {selectedDetail && (
          <div className="space-y-3 text-sm">
            <div><strong>Name:</strong> {selectedDetail.name}</div>
            <div><strong>Email:</strong> {selectedDetail.email}</div>
            <div><strong>Role:</strong> {selectedDetail.role}</div>
            <div><strong>Created:</strong> {selectedDetail.createdAt ? new Date(selectedDetail.createdAt).toLocaleString() : '—'}</div>
            <div><strong>Updated:</strong> {selectedDetail.updatedAt ? new Date(selectedDetail.updatedAt).toLocaleString() : '—'}</div>
            <div><strong>Raw ID:</strong> <code>{selectedDetail._id}</code></div>
          </div>
        )}
        </DetailPanel>
      </>);
};

export default Users;
