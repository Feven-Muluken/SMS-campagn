import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';

const Home = () => {
  const { user } = useUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-xl w-full bg-white p-6 rounded shadow text-center space-y-6">
        <h1 className="text-3xl font-bold">Welcome {user?.name || 'User'}!</h1>
        <p className="text-gray-600">This is your SMS campaign platform. Choose where to go next:</p>

        {user?.role === 'admin' ? (
          <div className="space-y-4">
            <Link to="/dashboard" className="block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Go to Admin Dashboard
            </Link>
            <Link to="/send-sms" className="block bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
              Send New SMS
            </Link>
            <Link to="/campaigns" className="block bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
              View Campaigns
            </Link>
          </div>
        ) : (
          <Link to="/my-messages" className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
            View My Messages
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home;