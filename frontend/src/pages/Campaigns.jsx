import { useEffect, useState } from "react";
import axios from '../api/axiosInstance';
import { Link } from 'react-router-dom';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/campaigns')
      .then(res => setCampaigns(res.data))
      .catch(err => console.error('Failed to fetch campaigns:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <Link to="/campaigns/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Create Campaign
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading campaigns ... </p>
        ) : campaigns.length == 0 ? (
          <p className="text-gray-500">No campaigns found.</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Message</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Recipients</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr kwy={c._id} className="border-t">
                    <td className="p-3">{c.message.slice(0, 40)} ... </td>
                    <td className="p-3 capitalize">{c.type}</td>
                    <td className="p-3">{c.recipients.length}</td>
                    <td className="p-3">{c.status ?? 'Pending'}</td>
                    <td className="p-3">{new Date(c.schedule).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )};
      </div>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link to="/create-campaign" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block">
          Create New Campaign
        </Link>

        {loading ? (
          <p className="text-gray-500">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500">No campaigns found.</p>
        ) : (
          <ul className="space-y-4">
            {campaigns.map(c => (
              <li key={c._id} className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                <p className="text-sm text-gray-600">Type: {c.type} | Scheduled: {new Date(c.schedule).toLocaleString()}</p>
                <p>{c.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default Campaigns;
