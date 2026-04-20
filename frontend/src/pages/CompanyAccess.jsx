import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FiBriefcase, FiCheck, FiSave, FiUserPlus } from 'react-icons/fi';
import axios from '../api/axiosInstance';
import { useUser } from '../context/UserContext';
import {
  COMPANY_PERMISSION_KEYS,
  companyRoleTemplates,
  labelPermission,
} from '../constants/companyPermissions';

const uiRole = (membershipRole) => (membershipRole === 'admin' ? 'company_admin' : membershipRole);

const CompanyAccess = () => {
  const { hasPermission } = useUser();
  const canManage = hasPermission('company.manage');
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [permissionDraft, setPermissionDraft] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [savingUserId, setSavingUserId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'staff',
    permissions: [...companyRoleTemplates.staff],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingList(true);
      try {
        let res;
        try {
          res = await axios.get('/admin/companies');
        } catch (e) {
          if (e.response?.status === 403) res = await axios.get('/companies/manageable');
          else throw e;
        }
        const list = res.data?.data || [];
        if (!alive) return;
        setCompanies(list);
        const q = new URLSearchParams(window.location.search).get('company');
        const fromUrl = q && list.some((c) => String(c.id) === String(q));
        setCompanyId((prev) => {
          if (prev && list.some((c) => String(c.id) === String(prev))) return prev;
          if (fromUrl) return String(q);
          return list.length ? String(list[0].id) : '';
        });
      } catch (e) {
        if (alive) toast.error(e.response?.data?.message || 'Load failed');
      } finally {
        if (alive) setLoadingList(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (companyId) setSearchParams({ company: companyId }, { replace: true });
  }, [companyId, setSearchParams]);

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`/company-permissions/${companyId}`);
        if (!alive) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        const enabled = rows.filter((r) => r.isEnabled).map((r) => r.permissionKey);
        setPermissionDraft(enabled);
      } catch {
        if (alive) setPermissionDraft([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    setLoadingUsers(true);
    (async () => {
      try {
        const res = await axios.get(`/companies/${companyId}/users`);
        if (!alive) return;
        setUsers(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (e) {
        if (alive) toast.error(e.response?.data?.message || 'Users load failed');
      } finally {
        if (alive) setLoadingUsers(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId]);

  const togglePerm = (key) => {
    setPermissionDraft((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const savePermissions = async () => {
    if (!canManage || !companyId) return;
    setSavingPerms(true);
    try {
      await axios.put(`/company-permissions/${companyId}`, {
        permissions: COMPANY_PERMISSION_KEYS.map((permissionKey) => ({
          permissionKey,
          isEnabled: permissionDraft.includes(permissionKey),
          config: {},
        })),
      });
      toast.success('Saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSavingPerms(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(String(row.id));
    setEditForm({
      name: row.user?.name || '',
      email: row.user?.email || '',
      phoneNumber: row.user?.phoneNumber || '',
      password: '',
      role: uiRole(row.role),
      permissions: Array.isArray(row.permissions) && row.permissions.length
        ? [...row.permissions]
        : [...(companyRoleTemplates[uiRole(row.role)] || companyRoleTemplates.viewer)],
    });
  };

  const saveEdit = async (membershipId) => {
    if (!editForm || !companyId) return;
    setSavingUserId(String(membershipId));
    try {
      const body = {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber || null,
        role: editForm.role,
        permissions: editForm.permissions,
      };
      if (editForm.password) body.password = editForm.password;
      await axios.put(`/companies/${companyId}/users/${membershipId}`, body);
      toast.success('Saved');
      setEditingId('');
      setEditForm(null);
      const res = await axios.get(`/companies/${companyId}/users`);
      setUsers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSavingUserId('');
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setCreating(true);
    try {
      await axios.post(`/companies/${companyId}/users`, {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        phoneNumber: newUser.phoneNumber || null,
        role: newUser.role,
        permissions: newUser.permissions,
      });
      toast.success('Created');
      setNewUser({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'staff',
        permissions: [...companyRoleTemplates.staff],
      });
      const res = await axios.get(`/companies/${companyId}/users`);
      setUsers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const onNewRole = (role) => {
    const t = companyRoleTemplates[role] || companyRoleTemplates.viewer;
    setNewUser((p) => ({ ...p, role, permissions: [...t] }));
  };

  if (!canManage) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-red-600 text-sm">company.manage required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <FiBriefcase className="text-red-600 w-6 h-6" />
          <h1 className="text-xl font-semibold text-gray-900">Company access</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-xs text-gray-500 mb-1">Company</label>
          {loadingList ? (
            <p className="text-sm text-gray-400">…</p>
          ) : (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {companyId && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-gray-900 text-sm">Permissions</span>
                <button
                  type="button"
                  onClick={savePermissions}
                  disabled={savingPerms}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  <FiSave className="w-4 h-4" />
                  {savingPerms ? '…' : 'Save'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {COMPANY_PERMISSION_KEYS.map((key) => {
                  const on = permissionDraft.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePerm(key)}
                      className={`text-left text-xs border rounded-lg px-3 py-2 flex justify-between gap-2 ${
                        on ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {labelPermission(key)}
                      {on && <FiCheck className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="font-medium text-gray-900 text-sm mb-3">Users</p>
              {loadingUsers ? (
                <p className="text-sm text-gray-400">…</p>
              ) : (
                <div className="space-y-2">
                  {users.map((row) => (
                    <div key={row.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                      {editingId === String(row.id) && editForm ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              className="border rounded px-2 py-1.5 text-sm"
                            />
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                              className="border rounded px-2 py-1.5 text-sm"
                            />
                            <input
                              value={editForm.phoneNumber}
                              onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                              className="border rounded px-2 py-1.5 text-sm"
                              placeholder="Phone"
                            />
                            <input
                              type="password"
                              value={editForm.password}
                              onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                              className="border rounded px-2 py-1.5 text-sm"
                              placeholder="New password (optional)"
                            />
                            <select
                              value={editForm.role}
                              onChange={(e) => {
                                const role = e.target.value;
                                const t = companyRoleTemplates[role] || companyRoleTemplates.viewer;
                                setEditForm((p) => ({ ...p, role, permissions: [...t] }));
                              }}
                              className="border rounded px-2 py-1.5 text-sm"
                            >
                              <option value="company_admin">Admin</option>
                              <option value="staff">Staff</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                            {COMPANY_PERMISSION_KEYS.map((key) => {
                              const on = editForm.permissions.includes(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() =>
                                    setEditForm((p) => ({
                                      ...p,
                                      permissions: on
                                        ? p.permissions.filter((x) => x !== key)
                                        : [...p.permissions, key],
                                    }))
                                  }
                                  className={`text-[10px] px-2 py-0.5 rounded border ${
                                    on ? 'bg-green-50 border-green-200' : 'border-gray-200'
                                  }`}
                                >
                                  {key}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(row.id)}
                              disabled={savingUserId === String(row.id)}
                              className="bg-gray-900 text-white px-3 py-1.5 rounded text-xs"
                            >
                              {savingUserId === String(row.id) ? '…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId('');
                                setEditForm(null);
                              }}
                              className="border px-3 py-1.5 rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-between gap-2 items-start">
                          <div>
                            <p className="font-medium text-gray-900">{row.user?.name}</p>
                            <p className="text-xs text-gray-500">{row.user?.email}</p>
                            <p className="text-xs text-gray-600 mt-1">{uiRole(row.role)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
                <FiUserPlus className="w-4 h-4" /> Add user
              </p>
              <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                  className="border rounded px-2 py-1.5 text-sm"
                  placeholder="Name"
                />
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  className="border rounded px-2 py-1.5 text-sm"
                  placeholder="Email"
                />
                <input
                  required
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  className="border rounded px-2 py-1.5 text-sm"
                  placeholder="Password"
                />
                <input
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser((p) => ({ ...p, phoneNumber: e.target.value }))}
                  className="border rounded px-2 py-1.5 text-sm"
                  placeholder="Phone"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => onNewRole(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                >
                  <option value="company_admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-red-600 text-white rounded py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  {creating ? '…' : 'Create'}
                </button>
                <div className="md:col-span-3 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {COMPANY_PERMISSION_KEYS.map((key) => {
                    const on = newUser.permissions.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setNewUser((p) => ({
                            ...p,
                            permissions: on
                              ? p.permissions.filter((x) => x !== key)
                              : [...p.permissions, key],
                          }))
                        }
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          on ? 'bg-green-50 border-green-200' : 'border-gray-200'
                        }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyAccess;
