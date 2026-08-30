import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { FiUser, FiMail, FiPhone, FiShield, FiSend, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'sonner';
import axios from '../api/axiosInstance';
import { labelPermission } from '../constants/companyPermissions';

const MyProfile = () => {
  const { user } = useUser();
  const [senderId, setSenderId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [resolvedCompanyName, setResolvedCompanyName] = useState('');

  const isSuperAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const activeCompany = useMemo(() => {
    const list = Array.isArray(user?.availableCompanies) ? user.availableCompanies : [];
    const activeId = Number(user?.activeCompanyId);
    return list.find((c) => Number(c.companyId) === activeId) || null;
  }, [user]);

  const primaryCompany = useMemo(() => {
    const list = Array.isArray(user?.availableCompanies) ? user.availableCompanies : [];
    return list.length ? list[0] : null;
  }, [user]);

  const effectiveRole = String(user?.role || '').toLowerCase() === 'admin'
    ? 'super_admin'
    : (String(user?.companyRole || '').toLowerCase() === 'admin'
      ? 'company_admin'
      : (user?.companyRole || user?.role || 'viewer'));

  const companyName =
    activeCompany?.name ||
    resolvedCompanyName ||
    activeCompany?.slug ||
    (user?.activeCompanyId ? `Company ${user.activeCompanyId}` : 'No active company selected');

  const companyPermissions = Array.isArray(user?.companyPermissions) ? user.companyPermissions : [];

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      if (isSuperAdmin) {
        const res = await axios.get('/sender-id-requests/pending');
        setPendingRequests(Array.isArray(res.data?.data) ? res.data.data : []);
      } else if (user?.activeCompanyId) {
        const res = await axios.get('/sender-id-requests/my');
        setMyRequests(Array.isArray(res.data?.data) ? res.data.data : []);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load sender ID requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.activeCompanyId, isSuperAdmin]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.activeCompanyId || activeCompany?.name) {
        if (alive) setResolvedCompanyName('');
        return;
      }
      try {
        const res = await axios.get(`/companies/${user.activeCompanyId}/summary`);
        if (!alive) return;
        setResolvedCompanyName(res.data?.data?.name || res.data?.data?.slug || '');
      } catch {
        if (alive) setResolvedCompanyName('');
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.activeCompanyId, activeCompany?.name]);

  const submitSenderIdRequest = async (e) => {
    e.preventDefault();
    if (!senderId.trim()) {
      toast.error('Sender ID is required');
      return;
    }
    if (!user?.activeCompanyId) {
      toast.error('Select an active company first');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/sender-id-requests', {
        senderId: senderId.trim(),
        reason: reason.trim() || undefined,
      });
      toast.success('Sender ID request sent to super admin');
      setSenderId('');
      setReason('');
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRequest = async (id, status) => {
    try {
      await axios.patch(`/sender-id-requests/${id}/review`, { status });
      toast.success(`Request ${status}`);
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to review request');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-rose-50/20 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-red-50 text-red-600">
              <FiUser className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-sm text-gray-500">Your account details and access level</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Name</p>
              <p className="text-sm font-medium text-gray-900">{user?.name || '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Role</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{effectiveRole || '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1 inline-flex items-center gap-1">
                <FiMail className="w-3.5 h-3.5" /> Email
              </p>
              <p className="text-sm font-medium text-gray-900 break-all">{user?.email || '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1 inline-flex items-center gap-1">
                <FiPhone className="w-3.5 h-3.5" /> Phone
              </p>
              <p className="text-sm font-medium text-gray-900">{user?.phoneNumber || '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1 inline-flex items-center gap-1">
                <FiShield className="w-3.5 h-3.5" /> Company Access
              </p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user?.companyRole || '—'}</p>
              <p className="text-sm text-gray-600 mt-1">{companyName}</p>
              {primaryCompany && (
                <p className="text-xs text-gray-500 mt-1">
                  Primary company: {primaryCompany.name || primaryCompany.slug || `Company ${primaryCompany.companyId}`}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Company Permissions</p>
              {companyPermissions.length ? (
                <div className="flex flex-wrap gap-2">
                  {companyPermissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-xs px-2 py-1 rounded border border-green-200 bg-green-50 text-green-800"
                    >
                      {labelPermission(perm)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No company permissions assigned.</p>
              )}
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="mt-6 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Request Premium Sender ID</p>
              <form onSubmit={submitSenderIdRequest} className="space-y-3">
                <input
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Sender ID (1-11 letters/numbers)"
                />
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Reason (optional)"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  <FiSend className="w-4 h-4" />
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              {isSuperAdmin ? 'Pending Sender ID Requests' : 'My Sender ID Requests'}
            </p>
            {loadingRequests ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-2">
                {(isSuperAdmin ? pendingRequests : myRequests).length ? (
                  (isSuperAdmin ? pendingRequests : myRequests).map((row) => (
                    <div key={row.id} className="rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{row.senderId}</p>
                        <p className="text-xs text-gray-500">
                          Company: {row.company?.name || row.company?.slug || row.companyId}
                          {isSuperAdmin && row.requester ? ` • Requested by ${row.requester.name || row.requester.email}` : ''}
                        </p>
                        {row.reason ? <p className="text-xs text-gray-600 mt-1">Reason: {row.reason}</p> : null}
                      </div>
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => reviewRequest(row.id, 'approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-green-300 bg-green-50 text-green-700 text-xs"
                          >
                            <FiCheck className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => reviewRequest(row.id, 'rejected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-300 bg-red-50 text-red-700 text-xs"
                          >
                            <FiX className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded border ${
                          row.status === 'approved'
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : row.status === 'rejected'
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {row.status}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No requests yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
