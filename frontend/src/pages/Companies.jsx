import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiUsers, FiShield, FiPlus, FiChevronDown, FiChevronUp, FiMail, FiPhone, FiGlobe } from 'react-icons/fi';
import { toast } from 'sonner';
import axios from '../api/axiosInstance';
import { useUser } from '../context/UserContext';
import { labelPermission } from '../constants/companyPermissions';

const Companies = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const isSuperAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const [companies, setCompanies] = useState([]);
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);
  const [permissionsByCompany, setPermissionsByCompany] = useState({});
  const [permissionsLoading, setPermissionsLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'starter',
    status: 'trial',
    contactEmail: '',
    contactPhone: '',
    timezone: 'Africa/Addis_Ababa',
  });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await axios.get('/admin/companies');
      } catch (error) {
        if (error.response?.status === 403) {
          res = await axios.get('/companies/manageable');
        } else {
          throw error;
        }
      }
      setCompanies(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error('Failed to load companies:', error);
      toast.error(error.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const loadCompanyPermissions = async (companyId) => {
    if (!companyId || permissionsByCompany[companyId]) return;
    setPermissionsLoading((prev) => ({ ...prev, [companyId]: true }));
    try {
      const res = await axios.get(`/company-permissions/${companyId}`);
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const enabled = rows.filter((r) => r.isEnabled).map((r) => r.permissionKey);
      setPermissionsByCompany((prev) => ({ ...prev, [companyId]: enabled }));
    } catch (error) {
      console.error('Failed to load company permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to load company permissions');
      setPermissionsByCompany((prev) => ({ ...prev, [companyId]: [] }));
    } finally {
      setPermissionsLoading((prev) => ({ ...prev, [companyId]: false }));
    }
  };

  const toggleCompany = async (company) => {
    const id = Number(company.id);
    if (expandedCompanyId === id) {
      setExpandedCompanyId(null);
      return;
    }
    setExpandedCompanyId(id);
    await loadCompanyPermissions(id);
  };

  const statusBadgeClass = (status) => {
    const value = String(status || '').toLowerCase();
    if (value === 'active') return 'bg-green-100 text-green-700';
    if (value === 'trial') return 'bg-amber-100 text-amber-700';
    if (value === 'suspended') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const createCompany = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error('Only super admin can create companies');
      return;
    }
    setCreating(true);
    try {
      await axios.post('/admin/companies', form);
      toast.success('Company created successfully');
      setForm({
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
      console.error('Create company failed:', error);
      toast.error(error.response?.data?.message || 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-rose-50/20">
      {/* <div className="bg-white border-b border-gray-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiBriefcase className="text-red-600" /> Companies
          </h1>
        </div>
      </div> */}

      <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <section className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${isSuperAdmin ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FiBriefcase className="text-red-600" /> Company list
            </h2>
            <span className="text-xs text-gray-500">Tap a company to expand details</span>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading companies...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-gray-500">No companies yet.</p>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => {
                const id = Number(company.id);
                const isOpen = expandedCompanyId === id;
                const usersCount = Number(company.membersCount || company.usersCount || 0);
                const permissions = permissionsByCompany[id] || [];
                const isPermLoading = Boolean(permissionsLoading[id]);

                return (
                  <div key={company.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCompany(company)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-2xl">{company.name}</p>
                        <p className="text-xs text-gray-500">/{company.slug}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{company.plan || 'starter'}</span>
                        <span className={`px-2 py-1 rounded-full capitalize ${statusBadgeClass(company.status)}`}>{company.status || 'trial'}</span>
                        <span className="text-gray-500 inline-flex items-center gap-1"><FiUsers className="w-3.5 h-3.5" /> {usersCount} users</span>
                        {isOpen ? <FiChevronUp className="w-4 h-4 text-gray-500" /> : <FiChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50/40">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <p className="text-xs text-gray-500 inline-flex items-center gap-1"><FiMail className="w-3.5 h-3.5" /> Email</p>
                            <p className="text-sm font-semibold text-gray-900 break-all">{company.contactEmail || '—'}</p>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <p className="text-xs text-gray-500 inline-flex items-center gap-1"><FiPhone className="w-3.5 h-3.5" /> Phone</p>
                            <p className="text-sm font-semibold text-gray-900">{company.contactPhone || '—'}</p>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <p className="text-xs text-gray-500 inline-flex items-center gap-1"><FiGlobe className="w-3.5 h-3.5" /> Timezone</p>
                            <p className="text-sm font-semibold text-gray-900">{company.timezone || 'Africa/Addis_Ababa'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2"><FiShield className="text-red-600" /> Permissions</h3>
                          <button
                            type="button"
                            onClick={() => navigate(`/company-access?company=${company.id}`)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-white"
                          >
                            <FiShield className="w-4 h-4" /> Manage in Company Access
                          </button>
                        </div>

                        {isPermLoading ? (
                          <p className="text-sm text-gray-500">Loading permissions...</p>
                        ) : permissions.length ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {permissions.map((key) => (
                              <div key={key} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                {labelPermission(key)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No enabled permissions.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {isSuperAdmin && (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiPlus className="text-red-600" /> Create company
            </h2>
            <form onSubmit={createCompany} className="space-y-3">
              <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Company Name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="Slug (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <input type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} placeholder="Contact Email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} placeholder="Contact Phone" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} placeholder="Timezone" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <button type="submit" disabled={creating} className="w-full rounded-lg bg-red-600 text-white py-2.5 text-sm font-medium disabled:opacity-60">
                {creating ? 'Creating...' : 'Create Company'}
              </button>
            </form>
          </section>
        )}

        
      </div>
    </div>
  );
};

export default Companies;
