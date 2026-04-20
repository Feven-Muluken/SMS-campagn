import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../api/axiosInstance';
import { motion } from 'motion/react';
import {
  FiMessageCircle,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiLayers,
  FiPhoneCall,
} from 'react-icons/fi';
import { toast } from 'sonner';
import DetailPanel from '../components/DetailPanel';

const API_STATUS_FILTERS = ['all', 'sent', 'failed', 'pending'];

const DeliveryStatus = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all = no API-status filter (sent + failed + pending)
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [statusCounts, setStatusCounts] = useState({ sent: 0, failed: 0, pending: 0 });
  const hasInitializedFromUrlRef = useRef(false);

  useEffect(() => {
    const urlPage = Number(searchParams.get('page')) || 1;
    const urlSearch = searchParams.get('search') || '';
    const rawStatus = searchParams.get('status') || 'all';
    const urlFilter = API_STATUS_FILTERS.includes(rawStatus) ? rawStatus : 'all';
    const urlStart = searchParams.get('startDate') || '';
    const urlEnd = searchParams.get('endDate') || '';
    const urlDelivery = searchParams.get('delivery') || '';
    setPage(urlPage);
    setSearch(urlSearch);
    setSearchInput(urlSearch);
    setFilter(urlFilter);
    setDeliveryFilter(urlDelivery);
    setStartDate(urlStart);
    setEndDate(urlEnd);
    hasInitializedFromUrlRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasInitializedFromUrlRef.current) return;
    const id = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) {
        setPage(1);
        setSearch(next);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput, search]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/sms/status', {
          params: {
            page,
            pageSize,
            search,
            // Backend: status=all or omitted → list includes sent, failed, and pending
            status: filter === 'all' ? 'all' : filter,
            delivery: deliveryFilter || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            sortBy: 'created_at',
            sortDir: 'DESC',
            aggregateCampaigns: true,
          }
        });
        setMessages(res.data?.data || []);
        setTotal(res.data?.total || 0);
        setTotalPages(res.data?.totalPages || 1);
        const sc = res.data?.statusCounts;
        setStatusCounts(
          sc && typeof sc === 'object'
            ? {
                sent: Number(sc.sent) || 0,
                failed: Number(sc.failed) || 0,
                pending: Number(sc.pending) || 0,
              }
            : { sent: 0, failed: 0, pending: 0 }
        );
      } catch (error) {
        console.error('Failed to load delivery status:', error);
        toast.error('Failed to load delivery status');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const nextParams = new URLSearchParams();
    if (search) nextParams.set('search', search);
    if (filter !== 'all') nextParams.set('status', filter);
    if (page && page !== 1) nextParams.set('page', String(page));
    if (startDate) nextParams.set('startDate', startDate);
    if (endDate) nextParams.set('endDate', endDate);
    if (deliveryFilter) nextParams.set('delivery', deliveryFilter);
    setSearchParams(nextParams);
  }, [page, pageSize, search, filter, deliveryFilter, startDate, endDate, setSearchParams, refreshKey]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const stats = useMemo(() => {
    const { sent, failed, pending } = statusCounts;
    return {
      total: sent + failed + pending,
      sent,
      failed,
      pending,
    };
  }, [statusCounts]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <FiXCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FiClock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const countSummary = (m) => {
    const n = m.recipientCount ?? 0;
    return [
      `${n} recipient${n === 1 ? '' : 's'}`,
      `${m.sentCount ?? 0} sent`,
      `${m.failedCount ?? 0} failed`,
      `${m.pendingCount ?? 0} pending`,
    ].join(' · ');
  };

  const messageListPrimary = (m) => {
    if (m.listKind === 'campaign') return m.campaign?.name || 'Campaign';
    if (m.listKind === 'group_send') return m.group?.name || 'Group';
    if (m.group?.name) return m.group.name;
    const phone = String(m.phoneNumber || '').trim();
    const nm = String(m.recipientDisplayName || m.recipient || '').trim();
    if (nm && phone && nm !== phone) return nm;
    if (phone) return phone;
    if (nm) return nm;
    return 'Unknown recipient';
  };

  const messageListSecondary = (m) => {
    if (m.listKind === 'campaign') {
      const audience = m.audienceGroup?.name ? `Audience: ${m.audienceGroup.name}` : null;
      return [audience, countSummary(m)].filter(Boolean).join(' · ');
    }
    if (m.listKind === 'group_send') return countSummary(m);
    if (m.group?.name) {
      return m.memberName ? `Member: ${m.memberName}` : 'Group broadcast';
    }
    return null;
  };

  const isDirectMessage = (m) =>
    m.listKind !== 'campaign' && m.listKind !== 'group_send' && !m.group?.name;

  const telHref = (raw) => {
    const compact = String(raw || '').replace(/\s/g, '');
    return compact ? `tel:${compact}` : undefined;
  };

  const deliveryKindLabel = (m) => {
    if (m.listKind === 'campaign') return 'Campaign send';
    if (m.listKind === 'group_send') return 'Group send';
    if (m.group?.name) return 'Group message';
    return 'Direct message';
  };

  const formatDeliveryTime = (m) => {
    const raw = m.sentAt || m.createdAt;
    if (!raw) return 'Unknown date';
    try {
      return new Date(raw).toLocaleString();
    } catch {
      return String(raw);
    }
  };

  const renderDeliveryHeaderMeta = (m) => {
    if (m.listKind === 'campaign') {
      return (
        <div className="space-y-1">
          {m.audienceGroup?.name ? (
            <p className="text-sm leading-relaxed text-gray-600">
              <span className="font-medium text-gray-700">Audience</span>: {m.audienceGroup.name}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed text-gray-600">{countSummary(m)}</p>
        </div>
      );
    }
    if (m.listKind === 'group_send') {
      return <p className="text-sm leading-relaxed text-gray-600">{countSummary(m)}</p>;
    }
    if (isDirectMessage(m)) {
      const phone = String(m.phoneNumber || '').trim();
      const href = telHref(phone);
      return (
        <p className="text-sm leading-relaxed">
          <a
            href={href}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex max-w-full items-center gap-2 break-all text-gray-600 hover:text-red-700"
          >
            <FiPhoneCall className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            <span>{phone}</span>
          </a>
        </p>
      );
    }
    const sec = messageListSecondary(m);
    return sec ? <p className="text-sm leading-relaxed text-gray-600 break-words">{sec}</p> : null;
  };

  const handleExport = () => {
    if (!messages.length) return toast.error('No messages to export');
    const headers = ['type', 'group', 'recipientName', 'phoneNumber', 'status', 'networkDelivery', 'content', 'campaign', 'counts', 'sentAt'];
    const rows = messages.map((m) => {
      if (m.listKind === 'campaign') {
        const counts = `recipients=${m.recipientCount ?? 0}; sent=${m.sentCount ?? 0}; failed=${m.failedCount ?? 0}; pending=${m.pendingCount ?? 0}`;
        return [
          'campaign',
          m.audienceGroup?.name || '',
          '',
          '',
          m.status || '',
          '',
          (m.content || m.campaign?.message || '').replace(/\n/g, ' '),
          m.campaign?.name || '',
          counts,
          m.sentAt || m.createdAt || '',
        ];
      }
      if (m.listKind === 'group_send') {
        const counts = `recipients=${m.recipientCount ?? 0}; sent=${m.sentCount ?? 0}; failed=${m.failedCount ?? 0}; pending=${m.pendingCount ?? 0}`;
        return [
          'group_send',
          m.group?.name || '',
          '',
          '',
          m.status || '',
          '',
          (m.content || '').replace(/\n/g, ' '),
          '',
          counts,
          m.sentAt || m.createdAt || '',
        ];
      }
      return [
        'message',
        m.group?.name || '',
        m.memberName || m.recipientDisplayName || m.recipient || '',
        m.phoneNumber || '',
        m.status || '',
        m.networkDeliveryStatus || '',
        (m.content || m.message || '').replace(/\n/g, ' '),
        m.campaign?.name || '',
        '',
        m.sentAt || m.createdAt || '',
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'delivery-status.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delivery Status</h1>
              <p className="text-sm text-gray-500">
                API send result (sent / failed / pending) plus network status when Africa&apos;s Talking delivery-report webhook is configured.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4"
                />
                Auto-refresh (30s)
              </label>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
              >
                <FiRefreshCw className="w-4 h-4" /> Refresh now
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
              >
                <FiDownload className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Total Messages</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Sent</p>
            <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Failed</p>
            <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-1 md:gap-4">
            <div className="relative w-full md:w-64">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                placeholder="Search recipient or message"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
            <select
              value={API_STATUS_FILTERS.includes(filter) ? filter : 'all'}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 py-2.5 px-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="all">All statuses (sent, failed, pending)</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={deliveryFilter}
              onChange={(e) => { setDeliveryFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 py-2.5 px-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="">Any network status</option>
              <option value="Success">Network: Success</option>
              <option value="Sent">Network: Sent</option>
              <option value="Queued">Network: Queued</option>
              <option value="Failed">Network: Failed</option>
              <option value="Rejected">Network: Rejected</option>
            </select>
            <div className="flex gap-2 items-center">
              <div className="flex flex-col text-sm text-gray-700">
                <label className="mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div className="flex flex-col text-sm text-gray-700">
                <label className="mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Page {page} of {totalPages} • {total} items</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                <FiChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
              >
                Next <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages List */}
        {messages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FiMessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages found</h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'No messages match your filters.'
                : `No ${filter} messages found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => setSelectedDetail(message)}
              >
                {/* Header: grid — type + title stack (no horizontal flex jumble), status top-right */}
                <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-x-3 items-start pb-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg self-start"
                    style={{ backgroundColor: '#FEE2E2' }}
                    aria-hidden
                  >
                    {message.listKind === 'campaign' ? (
                      <FiLayers className="h-5 w-5" style={{ color: '#DF0A0A' }} />
                    ) : message.listKind === 'group_send' || message.group?.name ? (
                      <FiUsers className="h-5 w-5" style={{ color: '#DF0A0A' }} />
                    ) : (
                      <FiMessageCircle className="h-5 w-5" style={{ color: '#DF0A0A' }} />
                    )}
                  </div>

                  <div className="min-w-0 col-start-2 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
                      {deliveryKindLabel(message)}
                    </p>
                    <h3 className="text-base font-semibold leading-snug text-gray-900 break-words">
                      {messageListPrimary(message)}
                    </h3>
                    {renderDeliveryHeaderMeta(message)}
                  </div>

                  <div className="col-start-3 row-start-1 justify-self-end text-right space-y-1">
                    <div className="inline-grid justify-items-end gap-1">
                      <span className="inline-flex items-center gap-1.5">
                        {getStatusIcon(message.status)}
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(message.status)}`}>
                          {message.status || 'pending'}
                        </span>
                      </span>
                      {message.networkDeliveryStatus ? (
                        <span className="block max-w-[10rem] text-xs leading-tight text-gray-500 sm:max-w-none">
                          Network: {message.networkDeliveryStatus}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Body: message + context lines */}
                <div className="space-y-2 border-b border-gray-100 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
                    {message.content || message.message || '—'}
                  </p>
                  {message.listKind === 'campaign' && message.campaign?.type ? (
                    <p className="text-sm text-gray-500">Campaign type: {message.campaign.type}</p>
                  ) : null}
                  {message.listKind !== 'campaign' && message.listKind !== 'group_send' && message.campaign ? (
                    <p className="text-sm text-gray-500">Campaign: {message.campaign?.name || 'Unknown'}</p>
                  ) : null}
                  {message.listKind !== 'campaign' && message.listKind !== 'group_send' && message.group?.name ? (
                    <p className="text-sm text-gray-500">
                      Group: {message.group.name}
                      {message.memberName ? ` · ${message.memberName}` : ''}
                    </p>
                  ) : null}
                </div>

                {/* Footer: time at bottom */}
                <div className="pt-4">
                  <p className="text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <FiClock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                      <span>{formatDeliveryTime(message)}</span>
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <DetailPanel
          open={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
          title={
            selectedDetail?.listKind === 'campaign'
              ? 'Campaign send'
              : selectedDetail?.listKind === 'group_send'
                ? 'Group send'
                : 'Message Details'
          }
        >
          {selectedDetail && selectedDetail.listKind === 'campaign' && (
            <div className="space-y-3 text-sm">
              <div><strong>Campaign:</strong> {selectedDetail.campaign?.name || '—'}</div>
              {selectedDetail.audienceGroup?.name && (
                <div><strong>Audience group:</strong> {selectedDetail.audienceGroup.name}</div>
              )}
              <div><strong>Campaign record status:</strong> {selectedDetail.campaign?.status || '—'}</div>
              <div><strong>Rollup (recipients):</strong> {selectedDetail.status}</div>
              <div>
                <strong>Counts:</strong> {selectedDetail.recipientCount ?? 0} total · {selectedDetail.sentCount ?? 0} sent ·{' '}
                {selectedDetail.failedCount ?? 0} failed · {selectedDetail.pendingCount ?? 0} pending
              </div>
              <div><strong>Message template:</strong> {selectedDetail.content || selectedDetail.campaign?.message || '—'}</div>
              <div><strong>Last activity:</strong>{' '}
                {selectedDetail.sentAt
                  ? new Date(selectedDetail.sentAt).toLocaleString()
                  : selectedDetail.createdAt
                    ? new Date(selectedDetail.createdAt).toLocaleString()
                    : '—'}
              </div>
              {selectedDetail.sampleRecipients?.length > 0 && (
                <div>
                  <strong>Sample recipients:</strong>
                  <ul className="mt-1 list-disc pl-5 text-gray-700">
                    {selectedDetail.sampleRecipients.map((r, i) => (
                      <li key={i}>
                        {r.phoneNumber} ({r.status})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {selectedDetail && selectedDetail.listKind === 'group_send' && (
            <div className="space-y-3 text-sm">
              <div><strong>Group:</strong> {selectedDetail.group?.name || '—'}</div>
              <div><strong>Rollup (recipients):</strong> {selectedDetail.status}</div>
              <div>
                <strong>Counts:</strong> {selectedDetail.recipientCount ?? 0} total · {selectedDetail.sentCount ?? 0} sent ·{' '}
                {selectedDetail.failedCount ?? 0} failed · {selectedDetail.pendingCount ?? 0} pending
              </div>
              <div><strong>Sample message (one member):</strong> {selectedDetail.content || '—'}</div>
              <div><strong>Last activity:</strong>{' '}
                {selectedDetail.sentAt
                  ? new Date(selectedDetail.sentAt).toLocaleString()
                  : selectedDetail.createdAt
                    ? new Date(selectedDetail.createdAt).toLocaleString()
                    : '—'}
              </div>
              {selectedDetail.sampleRecipients?.length > 0 && (
                <div>
                  <strong>Sample recipients:</strong>
                  <ul className="mt-1 list-disc pl-5 text-gray-700">
                    {selectedDetail.sampleRecipients.map((r, i) => (
                      <li key={i}>
                        {r.phoneNumber} ({r.status})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {selectedDetail && selectedDetail.listKind !== 'campaign' && selectedDetail.listKind !== 'group_send' && (
            <div className="space-y-3 text-sm">
              {selectedDetail.group?.name && (
                <div><strong>Group:</strong> {selectedDetail.group.name}</div>
              )}
              {(() => {
                const d = selectedDetail;
                const phone = String(d.phoneNumber || '').trim();
                const nm = String(d.memberName || d.recipientDisplayName || d.recipient || '').trim();
                const href = telHref(phone);
                const hasDistinctName = Boolean(nm && phone && nm !== phone);
                if (d.group?.name) {
                  return (
                    <>
                      <div>
                        <strong>Recipient:</strong>{' '}
                        {d.memberName || d.recipientDisplayName || d.recipient || d.phoneNumber}
                      </div>
                      <div>
                        <strong>Phone:</strong>{' '}
                        {href ? (
                          <a href={href} className="inline-flex items-center gap-1.5 text-red-700 hover:text-red-800">
                            <FiPhoneCall className="h-4 w-4 shrink-0" aria-hidden />
                            {phone}
                          </a>
                        ) : (
                          phone || '—'
                        )}
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    {hasDistinctName ? (
                      <div>
                        <strong>Name:</strong> {nm}
                      </div>
                    ) : null}
                    <div>
                      <strong>Phone:</strong>{' '}
                      {phone ? (
                        href ? (
                          <a href={href} className="inline-flex items-center gap-1.5 text-red-700 hover:text-red-800">
                            <FiPhoneCall className="h-4 w-4 shrink-0" aria-hidden />
                            {phone}
                          </a>
                        ) : (
                          phone
                        )
                      ) : (
                        '—'
                      )}
                    </div>
                  </>
                );
              })()}
              <div><strong>API status:</strong> {selectedDetail.status}</div>
              <div><strong>Network status:</strong> {selectedDetail.networkDeliveryStatus || '— (configure /sms/delivery-report webhook)'}</div>
              <div><strong>Provider message id:</strong> {selectedDetail.providerMessageId || '—'}</div>
              <div><strong>Content:</strong> {selectedDetail.content || selectedDetail.message}</div>
              <div><strong>Campaign:</strong> {selectedDetail.campaign?.name || '—'}</div>
              <div><strong>Sent At:</strong> {selectedDetail.sentAt ? new Date(selectedDetail.sentAt).toLocaleString() : (selectedDetail.createdAt ? new Date(selectedDetail.createdAt).toLocaleString() : '—')}</div>
              <div><strong>Provider response:</strong> <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(selectedDetail.response || selectedDetail.providerResponse || selectedDetail.responseData || {}, null, 2)}</pre></div>
              <div><strong>Raw ID:</strong> <code>{selectedDetail.id}</code></div>
            </div>
          )}
        </DetailPanel>
      </div>
    </div>
  );
};

export default DeliveryStatus;

