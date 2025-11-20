import { Outlet, NavLink, useNavigate } from "react-router-dom";

import React, { useState, useEffect, useRef } from 'react';
import {
  FiMenu, FiSearch, FiSend, FiUsers, FiSettings, FiBarChart2, FiDollarSign, FiMessageCircle
} from 'react-icons/fi';



const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const fadeInRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('opacity-100', 'translate-y-0');
      }
    }, { threshold: 0.1 });

    if (fadeInRef.current) {
      fadeInRef.current.classList.add('opacity-0', 'translate-y-4', 'transition', 'duration-700');
      observer.observe(fadeInRef.current);
    }
  }, []);

  return (
    <>
      <div className="flex min-h-screen bg-gray-100 ">
        <header className={`fixed top-0 left-0 right-0 z-10 bg-white shadow ${scrolled ? 'shadow-lg' : ''} transition`}>
                 <div className="flex items-center justify-between px-6 py-4">
                   <div className="flex items-center gap-4">
                     <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#E53935] text-xl">
                       <FiMenu />
                     </button>
                     <h1 className="text-xl font-bold text-[#E53935]">Afroel SMS</h1>
                  </div>
                   <div className="relative w-1/2">
                     <FiSearch className="absolute top-2.5 left-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users, campaigns, senders..."
                      className="pl-10 pr-4 py-2 border rounded w-full focus:ring-2 focus:ring-[#E53935] transition"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button className="bg-[#E53935] text-white px-4 py-2 rounded hover:bg-red-600 transition">Smart Send Time</button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Create Test Campaign</button>
                  </div>
        
                  {/* ...search and buttons... */}
                </div>
              </header>

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
    </>
  );
};
const Button = ({ label, color = 'red' }) => (
  <button
    className={`bg-${color}-600 text-white px-4 py-2 rounded hover:bg-${color}-700 transition transform hover:scale-105`}
  >
    {label}
  </button>
);

export default AdminLayout;