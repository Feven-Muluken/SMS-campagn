import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';

const initialForm = {
  businessName: '',
  serviceName: '',
  customerName: '',
  phoneNumber: '',
  scheduledAt: '',
  notes: '',
  reminderMinutesBefore: 60,
  followUpMinutesAfter: 120,
};

const AppointmentSystem = () => {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAppointments = async () => {
    try {
      const res = await axios.get('/appointments', { params: { pageSize: 100 } });
      setAppointments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load appointments');
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/appointments', {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      toast.success('Appointment created');
      setForm(initialForm);
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (appointment) => {
    try {
      await axios.put(`/appointments/${appointment.id}`, { status: 'completed' });
      toast.success('Appointment marked as completed');
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update appointment');
    }
  };

  const cancelAppointment = async (appointment) => {
    try {
      await axios.post(`/appointments/${appointment.id}/cancel`);
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return appointments;
    return appointments.filter((item) => {
      return [item.businessName, item.customerName, item.phoneNumber, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [appointments, search]);

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      booked: appointments.filter((item) => item.status === 'booked').length,
      completed: appointments.filter((item) => item.status === 'completed').length,
      cancelled: appointments.filter((item) => item.status === 'cancelled').length,
    };
  }, [appointments]);

  const formatDate = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleString();
  };

  const statusClasses = {
    booked: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-8">
      <BackButton fallbackPath="/admin" />
      <h1 className="text-2xl font-bold text-gray-900">SMS Appointment System</h1>
      <p className="text-sm text-gray-600 mt-1">Create appointments and automate confirmation, reminders, cancellations, and follow-up messages.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Booked</p>
          <p className="text-2xl font-bold text-blue-700">{stats.booked}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Cancelled</p>
          <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <form onSubmit={handleCreate} className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New Appointment</h2>
          <p className="text-xs text-gray-500">Confirmation SMS will be sent automatically after booking.</p>
          <input className="w-full border rounded-lg p-2" placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
          <input className="w-full border rounded-lg p-2" placeholder="Service name" value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} />
          <input className="w-full border rounded-lg p-2" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="w-full border rounded-lg p-2" placeholder="Phone (+251...)" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} required pattern="^\+[1-9]\d{1,14}$" />
          <input className="w-full border rounded-lg p-2" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
          <textarea className="w-full border rounded-lg p-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="w-full border rounded-lg p-2" type="number" min="0" placeholder="Reminder mins" value={form.reminderMinutesBefore} onChange={(e) => setForm({ ...form, reminderMinutesBefore: Number(e.target.value) })} />
            <input className="w-full border rounded-lg p-2" type="number" min="0" placeholder="Follow-up mins" value={form.followUpMinutesAfter} onChange={(e) => setForm({ ...form, followUpMinutesAfter: Number(e.target.value) })} />
          </div>
          <p className="text-xs text-gray-500">Reminders and follow-up run by the scheduler automatically.</p>
          <button disabled={loading} className="w-full text-white rounded-lg py-2" style={{ backgroundColor: '#DF0A0A' }}>
            {loading ? 'Saving...' : 'Create appointment'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-900">Appointments and Automation Status</h2>
            <input className="border rounded-lg p-2 text-sm" placeholder="Search appointments" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-3 max-h-[520px] overflow-auto">
            {filtered.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{item.businessName} - {item.customerName || 'Customer'}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusClasses[item.status] || 'bg-gray-100 text-gray-700'}`}>{item.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">{item.phoneNumber}</p>
                    <p className="text-sm text-gray-600">{new Date(item.scheduledAt).toLocaleString()}</p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <p>Confirmation: {item.confirmationSentAt ? formatDate(item.confirmationSentAt) : 'Pending'}</p>
                      <p>Reminder: {item.reminderSentAt ? formatDate(item.reminderSentAt) : 'Pending'}</p>
                      <p>Cancellation: {item.cancellationSentAt ? formatDate(item.cancellationSentAt) : 'Not sent'}</p>
                      <p>Follow-up: {item.followUpSentAt ? formatDate(item.followUpSentAt) : 'Pending'}</p>
                    </div>
                    {item.lastNotificationError && (
                      <p className="text-xs mt-2 text-red-600">Last notification error: {item.lastNotificationError}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {item.status !== 'completed' && item.status !== 'cancelled' && (
                      <button onClick={() => markCompleted(item)} className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50">Complete</button>
                    )}
                    {item.status !== 'cancelled' && (
                      <button onClick={() => cancelAppointment(item)} className="px-3 py-1 text-sm rounded text-white" style={{ backgroundColor: '#DF0A0A' }}>Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!filtered.length && <p className="text-sm text-gray-500">No appointments found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentSystem;
