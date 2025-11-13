import { Outlet, NavLink, useNavigate } from "react-router-dom";

const AdminLayout = () => {
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-50 bg-white shadow-md">
        <div className="p-4 text-xl font-bold border-b">SMS Admin</div>
        <nav className="flex flex-col p-4 space-y-2">
          <NavLink to="/" className="<NavLink to='/' className="text-gray-700 hover:text-blue-600>Dashboard</NavLink>
          <NavLink to="/CreateCampaign">CreateCampaign</NavLink>
          <NavLink to="/campaigns">Campaigns</NavLink>
          <NavLink to="/send-sms">Send SMS</NavLink>
          <NavLink to="/contacts">Contacts</NavLink>
          <NavLink to="/groups">Groups</NavLink>
          <NavLink to="/users">Users</NavLink>
          <button onClick={handleLogout} className="text-red-600 mt-4">Logout</button>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};


export default AdminLayout;