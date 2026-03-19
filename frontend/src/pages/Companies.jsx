import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  FiBriefcase,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiGlobe,
  FiMail,
  FiPhone,
  FiPlus,
  FiSave,
  FiShield,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import axios from '../api/axiosInstance';

const permissionOptions = [
  'dashboard.view',
  'campaign.view',
  'campaign.send',
  'contact.view',
  'contact.manage',
  'group.view',
  'group.manage',
  'user.manage',
  'sms.send',
  'delivery.view',
  'appointment.view',
  'appointment.manage',
  'inbox.view',
  'inbox.reply',
  'geo.send',
  'billing.send',
  'company.manage',
];

const labelForPermission = (permission) =>
  permission
    .replace('.', ' - ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanyId, setExpandedCompanyId] = useState('');
  const [permissionDraft, setPermissionDraft] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    slug: '',
    plan: 'starter',
    status: 'trial',
    contactEmail: '',
    contactPhone: '',
    timezone: 'Africa/Addis_Ababa',
  });

  const [userForm, setUserForm] = useState({
    companyId: '',
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'staff',
    permissions: [],
  });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/companies');
      const nextCompanies = res.data?.data || [];
      setCompanies(nextCompanies);
      if (!expandedCompanyId && nextCompanies.length > 0) {
        setExpandedCompanyId(String(nextCompanies[0].id));
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error(error.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleExpand = (company) => {
    const companyId = String(company.id);
    const willOpen = expandedCompanyId !== companyId;
    setExpandedCompanyId(willOpen ? companyId : '');
    if (willOpen) {
      setPermissionDraft(Array.isArray(company.permissions) ? company.permissions : []);
      setUserForm((prev) => ({ ...prev, companyId }));
    }
  };

  const togglePermission = (permission) => {
    setPermissionDraft((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const toggleUserPermission = (permission) => {
    setUserForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const createCompany = async (e) => {
    e.preventDefault();
    setCreatingCompany(true);
    try {
      await axios.post('/admin/companies', {
        ...companyForm,
        permissions: permissionOptions.filter((p) => ['dashboard.view', 'campaign.view', 'contact.view'].includes(p)),
      });
      toast.success('Company created successfully');
      setCompanyForm({
        name: '',
        slug: '',
        plan: 'starter',
        status: 'trial',
        contactEmail: '',
        contactPhone: '',
        timezone: 'Africa/Addis_Ababa',
      });
      await fetchCompanies();
    } catch (error) {
      console.error('Failed to create company:', error);
      toast.error(error.response?.data?.message || 'Failed to create company');
    } finally {
      setCreatingCompany(false);
    }
  };

  const saveCompanyPermissions = async (companyId) => {
    if (!companyId) return;
    setSavingPermissions(true);
    try {
      await axios.put(`/admin/companies/${companyId}/permissions`, {
        permissions: permissionDraft,
      });
      toast.success('Permissions updated');
      await fetchCompanies();
    } catch (error) {
      console.error('Failed to update company permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const createCompanyUser = async (e) => {
    e.preventDefault();
    if (!userForm.companyId) {
      toast.error('Select a company first');
      return;
    }

    setCreatingUser(true);
    try {
      await axios.post(`/admin/companies/${userForm.companyId}/users`, userForm);
      toast.success('Company user created');
      setUserForm((prev) => ({
        ...prev,
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'staff',
        permissions: [],
      }));
      await fetchCompanies();
    } catch (error) {
      console.error('Failed to create company user:', error);
      toast.error(error.response?.data?.message || 'Failed to create company user');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-rose-50/30">
      <div className="bg-white border-b border-gray-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiBriefcase className="text-red-600" />
            Company Control Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create companies, assign feature permissions, and onboard team members.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiPlus className="text-red-600" /> New Company
          </h2>
          <form onSubmit={createCompany} className="space-y-3">
            <input
              value={companyForm.name}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Company Name"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
            <input
              value={companyForm.slug}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="Slug (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={companyForm.plan}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, plan: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={companyForm.status}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, status: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={companyForm.contactEmail}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="Billing / Admin Email"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={companyForm.contactPhone}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="Contact Phone"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="relative">
              <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={companyForm.timezone}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, timezone: e.target.value }))}
                placeholder="Timezone"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={creatingCompany}
              className="w-full bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {creatingCompany ? 'Creating...' : 'Create Company'}
            </button>
          </form>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 xl:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiBriefcase className="text-red-600" /> Companies
            </h2>
            <span className="text-xs text-gray-500">Tap a company to expand details</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No companies yet. Create the first one.</div>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => {
                const isExpanded = String(company.id) === expandedCompanyId;
                return (
                  <div key={company.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(company)}
                      className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{company.name}</h3>
                          <p className="text-xs text-gray-500">/{company.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{company.plan}</span>
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                            company.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : company.status === 'suspended'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {company.status}
                          </span>
                          <span className="text-xs text-gray-500">{company.membersCount || 0} users</span>
                          {isExpanded ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                          <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium text-gray-800 break-words">{company.contactEmail || 'Not set'}</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm font-medium text-gray-800">{company.contactPhone || 'Not set'}</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-xs text-gray-500">Timezone</p>
                            <p className="text-sm font-medium text-gray-800">{company.timezone || 'Not set'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <FiShield className="text-red-600" /> Permissions
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setUserForm((prev) => ({ ...prev, companyId: String(company.id) }))}
                              className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
                            >
                              Use In User Form
                            </button>
                            <button
                              type="button"
                              onClick={() => saveCompanyPermissions(company.id)}
                              disabled={savingPermissions}
                              className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-black disabled:opacity-60"
                            >
                              <FiSave /> {savingPermissions ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {permissionOptions.map((permission) => {
                            const active = permissionDraft.includes(permission);
                            return (
                              <button
                                key={`${company.id}-${permission}`}
                                type="button"
                                onClick={() => togglePermission(permission)}
                                className={`text-left border rounded-lg px-3 py-2 text-sm transition-colors ${
                                  active
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                                }`}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span>{labelForPermission(permission)}</span>
                                  {active && <FiCheck className="text-green-700" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 xl:col-span-3"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiUserPlus className="text-red-600" /> Add Company User
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Current target company ID: <span className="font-semibold text-gray-700">{userForm.companyId || 'None selected'}</span>
          </p>
          <form onSubmit={createCompanyUser} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <select
              value={userForm.companyId}
              onChange={(e) => setUserForm((prev) => ({ ...prev, companyId: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <input
              value={userForm.name}
              onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Password"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              value={userForm.phoneNumber}
              onChange={(e) => setUserForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="Phone number"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>

            <div className="md:col-span-2 xl:col-span-2 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FiUsers /> Extra Permissions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-auto pr-1">
                {permissionOptions.map((permission) => {
                  const active = userForm.permissions.includes(permission);
                  return (
                    <button
                      key={`user-perm-${permission}`}
                      type="button"
                      onClick={() => toggleUserPermission(permission)}
                      className={`border rounded-md px-2 py-1 text-xs text-left ${
                        active ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {labelForPermission(permission)}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingUser}
              className="md:col-span-2 xl:col-span-4 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {creatingUser ? 'Creating User...' : 'Create Company User'}
            </button>
          </form>
        </motion.section>
      </div>
    </div>
  );
};

export default Companies;
