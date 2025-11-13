import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';

const DeliveryStatus = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/sms/status')
      .then(res => setMessages(res.data))
      .catch(() => console.error('Failed to load delivery status'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Delivery Status</h1>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">No messages found.</p>
      ) : (
        <ul className="space-y-4">
          {messages.map(msg => (
            <li key={msg._id} className="bg-white p-4 rounded shadow">
              <p><strong>To:</strong> {msg.recipient}</p>
              <p><strong>Message:</strong> {msg.content}</p>
              <p><strong>Status:</strong> {msg.status}</p>
              <p className="text-sm text-gray-600">{new Date(msg.sentAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DeliveryStatus;