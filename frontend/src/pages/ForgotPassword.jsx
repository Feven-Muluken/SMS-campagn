import { useState } from 'react';
import { Link } from 'react-router-dom';
import publicAuthClient from '../api/publicAuthClient';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setDevLink('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Enter your email address');
      setLoading(false);
      return;
    }

    try {
      const { data } = await publicAuthClient.post('/auth/forgot-password', { email: trimmed });

      if (data.emailSent === true) {
        toast.success(data.message || 'Check your email for the reset link.');
      } else if (data.emailSent === false) {
        toast.warning(data.message || 'Email was not sent.');
        if (data.resetUrl) {
          setDevLink(data.resetUrl);
        }
      } else {
        toast.info(data.message || 'Request received.');
      }
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
        <p className="text-sm text-gray-600 mb-6">
          Enter the email for your account. We will send a one-time link (valid 15 minutes) if the account exists.
        </p>

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
              autoComplete="email"
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

        {devLink && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 break-all">
            <p className="font-medium mb-1">Development only — email not configured</p>
            <a href={devLink} className="text-red-700 underline">Open reset link</a>
          </div>
        )}

        <p className="text-sm text-gray-600 mt-6 text-center">
          Remembered your password?{' '}
          <Link to="/login" className="text-red-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
