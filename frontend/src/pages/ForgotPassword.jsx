import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/auth/forgot-password', { email });
      toast.success(response.data?.message || 'Password reset instructions sent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <BackButton fallbackPath="/login" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password</h1>
        <p className="text-sm text-gray-600 mb-6">Enter your email to generate a password reset link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#DF0A0A' }}
          >
            {loading ? 'Processing...' : 'Send reset link'}
          </button>
        </form>

        

        <p className="text-sm text-gray-600 mt-6 text-center">
          Remembered your password?{' '}
          <Link to="/login" className="text-red-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
