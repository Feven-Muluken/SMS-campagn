import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';

const UserMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/messages')
      .then(res => setMessages(res.data))
      .catch(() => console.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Messages</h1>
      {messages.length === 0 ? (
        <p className="text-gray-500">You haven’t received any messages yet.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map(msg => (
            <li key={msg._id} className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-600">{new Date(msg.sentAt).toLocaleString()}</p>
              <p className="text-lg">{msg.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserMessages;