import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { FiLogOut, FiUser } from 'react-icons/fi';

const PlatformLayout = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('activeCompanyId');
    sessionStorage.removeItem('activeCompanyId');
    localStorage.removeItem('companyPermissions');
    sessionStorage.removeItem('companyPermissions');
    localStorage.removeItem('companyRole');
    sessionStorage.removeItem('companyRole');
    localStorage.removeItem('memberCompanies');
    sessionStorage.removeItem('memberCompanies');
    refreshUser();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/20">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Afroel</p>
            <h1 className="text-lg font-bold text-red-600 leading-tight">Platform hub</h1>
            <p className="text-xs text-gray-500">Superadmin — not tenant workspace</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="text-sm font-medium text-gray-700 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-red-200 transition-colors"
            >
              Open workspace
            </Link>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
              <FiUser className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{user?.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <FiLogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default PlatformLayout;
