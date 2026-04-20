import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiUsers, FiShield, FiPlus } from 'react-icons/fi';
import { toast } from 'sonner';
import axios from '../api/axiosInstance';
import { useUser } from '../context/UserContext';

const Companies = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const isSuperAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const [companies, setCompanies] = useState([]);
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
      <div className="bg-white border-b border-gray-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiBriefcase className="text-red-600" /> Companies
          </h1>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FiUsers className="w-4 h-4" /> Platform users
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 xl:grid-cols-3 gap-6">
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

        <section className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${isSuperAdmin ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company list</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading companies...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-gray-500">No companies yet.</p>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => (
                <div key={company.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{company.name}</p>
                    <p className="text-xs text-gray-500">/{company.slug} · {company.plan} · {company.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/company-access?company=${company.id}`)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                    >
                      <FiShield className="w-4 h-4" /> Company access
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => navigate('/users')}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                      >
                        <FiUsers className="w-4 h-4" /> Users
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Companies;
