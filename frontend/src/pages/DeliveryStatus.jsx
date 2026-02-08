import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../api/axiosInstance';
import { motion } from 'motion/react';
import {
  FiMessageCircle,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiPhone,
  FiDownload,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX
} from 'react-icons/fi';
import { toast } from 'sonner';
import DetailPanel from '../components/DetailPanel';

const DeliveryStatus = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, sent, failed, pending
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
  const hasInitializedFromUrlRef = useRef(false);

  useEffect(() => {
    const urlPage = Number(searchParams.get('page')) || 1;
    const urlSearch = searchParams.get('search') || '';
    const urlFilter = searchParams.get('status') || 'all';
    const urlStart = searchParams.get('startDate') || '';
    const urlEnd = searchParams.get('endDate') || '';
    setPage(urlPage);
    setSearch(urlSearch);
    setSearchInput(urlSearch);
    setFilter(urlFilter);
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
            status: filter === 'all' ? undefined : filter,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            sortBy: 'created_at',
            sortDir: 'DESC',
          }
        });
        setMessages(res.data?.data || []);
        setTotal(res.data?.total || 0);
        setTotalPages(res.data?.totalPages || 1);
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
    setSearchParams(nextParams);
  }, [page, pageSize, search, filter, startDate, endDate, setSearchParams, refreshKey]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const stats = useMemo(() => ({
    total: total,
    sent: messages.filter((m) => m.status === 'sent').length,
    failed: messages.filter((m) => m.status === 'failed').length,
    pending: messages.filter((m) => m.status === 'pending').length,
  }), [messages, total]);

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

  const handleExport = () => {
    if (!messages.length) return toast.error('No messages to export');
    const headers = ['recipient', 'phoneNumber', 'status', 'content', 'campaign', 'sentAt'];
    const rows = messages.map((m) => [
      m.recipient || '',
      m.phoneNumber || '',
      m.status || '',
      (m.content || m.message || '').replace(/\n/g, ' '),
      m.campaign?.name || '',
      m.sentAt || m.createdAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'delivery-status.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredMessages = messages;

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
              <p className="text-sm text-gray-500">Live delivery outcomes for sent messages</p>
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
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search recipient or message"
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 py-2.5 px-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="all">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
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
            <span>Page {page} of {totalPages} • {total} messages</span>
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
        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FiMessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages found</h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'No messages have been sent yet.'
                : `No ${filter} messages found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message, index) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => setSelectedDetail(message)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                      <FiMessageCircle className="w-5 h-5" style={{ color: '#DF0A0A' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FiPhone className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {message.recipient || message.phoneNumber || 'Unknown recipient'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <FiClock className="w-4 h-4" />
                        {message.sentAt
                          ? new Date(message.sentAt).toLocaleString()
                          : message.createdAt
                            ? new Date(message.createdAt).toLocaleString()
                            : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(message.status)}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                      {message.status || 'pending'}
                    </span>
                  </div>
                </div>
                <div className="ml-11">
                  <p className="text-gray-900 leading-relaxed">{message.content || message.message}</p>
                  {message.campaign && (
                    <p className="text-sm text-gray-500 mt-2">
                      Campaign: {message.campaign?.name || 'Unknown'}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <DetailPanel open={!!selectedDetail} onClose={() => setSelectedDetail(null)} title={'Message Details'}>
          {selectedDetail && (
            <div className="space-y-3 text-sm">
              <div><strong>Recipient:</strong> {selectedDetail.recipient || selectedDetail.phoneNumber}</div>
              <div><strong>Status:</strong> {selectedDetail.status}</div>
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

