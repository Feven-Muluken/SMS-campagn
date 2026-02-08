import { Link, useLocation } from 'react-router-dom';
import { FiLock, FiArrowLeftCircle } from 'react-icons/fi';

const Unauthorized = () => {
  const location = useLocation();
  const from = location.state?.from || '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white px-6">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-lg border border-gray-200 p-10 text-center">
        <div className="mx-auto mb-6 h-16 w-16 flex items-center justify-center rounded-full" style={{ backgroundColor: '#FEE2E2' }}>
          <FiLock className="h-8 w-8" style={{ color: '#DF0A0A' }} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          You do not have permission to view this page. If you believe this is a mistake, please contact an administrator.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={from}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#DF0A0A', boxShadow: '0 4px 15px rgba(223, 10, 10, 0.25)' }}
          >
            <FiArrowLeftCircle className="h-5 w-5" />
            Go Back
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
