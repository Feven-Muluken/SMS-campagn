import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/admin')
      .then(res => setStats(res.data))
      .catch(() => console.error('Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {loading ? (
        <p className="text-gray-500">Loading stats...</p>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Campaigns" value={stats.campagnCount} />
          <StatCard label="Users" value={stats.userCount} />
          <StatCard label="Contacts" value={stats.contactCount} />
          <StatCard label="Messages" value={stats.messageCount} />
          <StatCard label="Groups" value={stats.gorupCount} />
        </div>
      ) : (
        <p className="text-red-500">Failed to load stats.</p>
      )}
      <div className="mt-8 space-x-4">
        <a href="/send-sms" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Send SMS</a>
        <a href="/campaigns" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">View Campaigns</a>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="bg-white p-4 rounded shadow text-center">
    <h2 className="text-sm text-gray-500">{label}</h2>
    <p className="text-3xl font-bold text-blue-600">{value}</p>
  </div>
);

export default Dashboard;