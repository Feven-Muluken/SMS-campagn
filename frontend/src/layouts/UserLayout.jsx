import { Outlet, useNavigate } from 'react-router-dom';

const UserLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">My Messages</h1>
        <button onClick={handleLogout} className="text-red-600">Logout</button>
      </header>
      <Outlet />
    </div>
  );
};

export default UserLayout;