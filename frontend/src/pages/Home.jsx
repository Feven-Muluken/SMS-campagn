// import { useUser } from '../context/UserContext';
// import { Link } from 'react-router-dom';

// const Home = () => {
//   const { user } = useUser();

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
//       <div className="max-w-xl w-full bg-white p-6 rounded shadow text-center space-y-6">
//         <h1 className="text-3xl font-bold">Welcome {user?.name || 'User'}!</h1>
//         <p className="text-gray-600">This is your SMS campaign platform. Choose where to go next:</p>

//         {user?.role === 'admin' ? (
//           <div className="space-y-4">
//             <Link to="/dashboard" className="block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
//               Go to Admin Dashboard
//             </Link>
//             <Link to="/send-sms" className="block bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
//               Send New SMS
//             </Link>
//             <Link to="/campaigns" className="block bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
//               View Campaigns
//             </Link>
//           </div>
//         ) : (
//           <Link to="/my-messages" className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
//             View My Messages
//           </Link>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Home;


// import React, { useEffect, useState } from 'react';
// import {
//   FiMenu, FiSearch, FiSend, FiUsers, FiSettings, FiBarChart2, FiDollarSign, FiMessageCircle
// } from 'react-icons/fi';

// const useScrollFadeIn = () => {
//   const ref = useRef();
//   useEffect(() => {
//     const observer = new IntersectionObserver(([entry]) => {
//       if (entry.isIntersecting) {
//         entry.target.classList.add('opacity-100', 'translate-y-0');
//       }
//     }, { threshold: 0.1 });

//     if (ref.current) {
//       ref.current.classList.add('opacity-0', 'translate-y-4', 'transition', 'duration-700');
//       observer.observe(ref.current);
//     }
//   }, []);
//   return ref;
// };
// const fadeInRef = useScrollFadeIn();

// const Home = () => {
//   const [scrolled, setScrolled] = useState(false);
//   const [sidebarOpen, setSidebarOpen] = useState(true); 

//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 20);
//     window.addEventListener('scroll', onScroll);
//     return () => window.removeEventListener('scroll', onScroll);
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-100 font-inter">
//       {/* Top Bar */}
//       <header className={`fixed top-0 left-0 right-0 z-10 bg-white shadow ${scrolled ? 'shadow-lg' : ''} transition`}>
//         <div className="flex items-center justify-between px-6 py-4">
//           <div className="flex items-center gap-4">
//             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#E53935] text-xl">
//               <FiMenu />
//             </button>
//             <h1 className="text-xl font-bold text-[#E53935]">Afroel SMS</h1>
//           </div>
//           <div className="relative w-1/2">
//             <FiSearch className="absolute top-2.5 left-3 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search users, campaigns, senders..."
//               className="pl-10 pr-4 py-2 border rounded w-full focus:ring-2 focus:ring-[#E53935] transition"
//             />
//           </div>
//           <div className="flex gap-4">
//             <button className="bg-[#E53935] text-white px-4 py-2 rounded hover:bg-red-600 transition">Smart Send Time</button>
//             <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Create Test Campaign</button>
//           </div>

//           {/* ...search and buttons... */}
//         </div>
//       </header>
//       {/* <section ref={fadeInRef} className="bg-white p-6 rounded shadow">
//         <h2 className="text-lg font-semibold mb-4">Usage Over Time</h2>
//         <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-500">[Chart Placeholder]</div>
//       </section> */}
//       {/* Sidebar */}
//       <aside className={`fixed top-16 left-0 w-64 h-full bg-white shadow-md p-6 space-y-4 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
//         <nav className='p-6 space-y-4'>
//           {[
//             ['Dashboard', FiBarChart2],
//             ['Campaigns', FiSend],
//             ['Contacts', FiUsers],
//             ['Templates', FiMessageCircle],
//             ['Analytics', FiBarChart2],
//             ['Settings', FiSettings],
//             ['Recruitment / Referral', FiUsers],
//             ['Earnings', FiDollarSign],
//           ].map(([label, Icon], i) => (
//             <a key={i} href="#" className="flex items-center gap-2 text-gray-700 hover:text-[#E53935] transition">
//               <Icon />
//               {label}
//             </a>
//           ))}
//         </nav>
//       </aside>

//       {/* Main Content */}
//       <main className="ml-64 pt-24 px-8 space-y-12">
//         {/* Admin Overview */}
//         <section className="grid grid-cols-3 gap-6">
//           {[
//             ['Total SMS Sent', '2.48M'],
//             ['Delivery Rate', '96.2%'],
//             ['Total Users', '184'],
//             ['Active Users', '184'],
//             ['Active Campaigns', '47'],
//             ['Earnings', '$38.4K'],
//           ].map(([label, value], i) => (
//             <div
//               key={i}
//               className="bg-white p-4 rounded shadow hover:shadow-lg transform hover:scale-105 transition duration-300 border-l-4 border-[#E53935]"
//             >
//               <p className="text-sm text-gray-500">{label}</p>
//               <p className="text-2xl font-bold">{value}</p>
//             </div>
//           ))}
//         </section>

//         {/* Usage Over Time */}
//         <section className="bg-white p-6 rounded shadow">
//           <h2 className="text-lg font-semibold mb-4">Usage Over Time</h2>
//           <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-500">[Chart Placeholder]</div>
//         </section>

//         {/* Top Users Table */}
//         <section className="bg-white p-6 rounded shadow">
//           <h2 className="text-lg font-semibold mb-4">Top Users</h2>
//           <table className="w-full table-auto">
//             <thead>
//               <tr className="text-left text-gray-600">
//                 <th>User</th>
//                 <th>SMS Sent</th>
//                 <th>Campaigns</th>
//                 <th>Earnings</th>
//               </tr>
//             </thead>
//             <tbody>
//               {[
//                 ['Afroel', '1.2M', '20', '$12K'],
//                 ['Computopia', '800K', '15', '$9K'],
//                 ['Sika Tech', '300K', '7', '$4K'],
//                 ['HealthReach 2.0', '180K', '5', '$3.4K'],
//               ].map(([user, sms, campaigns, earnings], i) => (
//                 <tr key={i} className="border-t hover:bg-gray-50 transition">
//                   <td className="py-2">{user}</td>
//                   <td>{sms}</td>
//                   <td>{campaigns}</td>
//                   <td>{earnings}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </section>

//         {/* Recent Campaigns */}
//         <section className="bg-white p-6 rounded shadow">
//           <h2 className="text-lg font-semibold mb-4">Recent Campaigns</h2>
//           <table className="w-full table-auto">
//             <thead>
//               <tr className="text-left text-gray-600">
//                 <th>Campaign</th>
//                 <th>User</th>
//                 <th>Status</th>
//                 <th>Delivery Rate</th>
//               </tr>
//             </thead>
//             <tbody>
//               {[
//                 ['Afroel Promo', 'Afroel', 'Sent', '98%'],
//                 ['Dashboard', 'Afroel', 'Draft', '—'],
//                 ['Sika Tech Promo', 'Sika Tech', 'Sent', '95%'],
//                 ['Computopia Promo', 'Computopia', 'Sent', '93%'],
//               ].map(([name, user, status, rate], i) => (
//                 <tr key={i} className="border-t hover:bg-gray-50 transition">
//                   <td className="py-2">{name}</td>
//                   <td>{user}</td>
//                   <td>{status}</td>
//                   <td>{rate}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </section>
//       </main>
//     </div>
//   );
// };

// export default Home;

import React, { useState, useEffect, useRef } from 'react';
import {
  FiMenu, FiSearch, FiSend, FiUsers, FiSettings, FiBarChart2, FiDollarSign, FiMessageCircle
} from 'react-icons/fi';

const Home = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);

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
    <div className="min-h-screen bg-gray-100 font-inter">
      {/* Top Bar */}
      {/* <header className={`fixed top-0 left-0 right-0 z-10 bg-white ${scrolled ? 'shadow-lg' : 'shadow'} transition`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#E53935] text-xl">
              <FiMenu />
            </button>
            <h1 className="text-xl font-bold text-[#E53935] animate-fade-in">Afroel SMS Dashboard</h1>
          </div>
          <div className="relative w-1/2">
            <FiSearch className="absolute top-2.5 left-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns, users, senders..."
              className="pl-10 pr-4 py-2 border rounded w-full focus:ring-2 focus:ring-[#E53935] transition"
            />
          </div>
          <div className="flex gap-4">
            <Button label="Smart Send Time" />
            <Button label="Create Test Campaign" color="green" />
          </div>
        </div>
      </header> */}

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

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 w-64 h-full bg-white shadow-md transform transition-all duration-500 ease-in-out ${
          sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        {/* Admin Profile */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <img src="/admin-avatar.png" alt="Admin" className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-semibold text-[#E53935]">Feven Muluken</p>
              <p className="text-sm text-gray-500">Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-6 space-y-4">
          {[
            ['Dashboard', FiBarChart2],
            ['Campaigns', FiSend],
            ['Contacts', FiUsers],
            ['Templates', FiMessageCircle],
            ['Analytics', FiBarChart2],
            ['Settings', FiSettings],
            ['Recruitment / Referral', FiUsers],
            ['Earnings', FiDollarSign],
          ].map(([label, Icon], i) => (
            <a key={i} href="#" className="flex items-center gap-2 text-gray-700 hover:text-[#E53935] transition">
              <Icon />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 pt-24 px-8 space-y-12 py-10">
        {/* Welcome Message */}
        <section className="bg-white p-6 rounded shadow animate-fade-in">
          <h2 className="text-xl font-bold text-[#E53935] mb-2">Welcome, Feven 👋</h2>
          <p className="text-gray-600">Here’s your campaign overview and user activity insights.</p>
        </section>

        {/* Overview Cards */}
        <section className="grid grid-cols-3 gap-6">
          {[
            ['Total SMS Sent', '2.48M'],
            ['Delivery Rate', '96.2%'],
            ['Active Campaigns', '47'],
            ['Total Users', '184'],
            ['Active Users', '184'],
            ['Earnings', '$38.4K'],
          ].map(([label, value], i) => (
            <div
              key={i}
              className="bg-white p-4 rounded shadow hover:shadow-lg transform hover:scale-105 transition duration-300 border-l-4 border-[#E53935]"
            >
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        {/* Usage Chart */}
        <section ref={fadeInRef} className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Usage Over Time</h2>
          <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-500">[Chart Placeholder]</div>
        </section>

        {/* Top Users Table */}
        <section className="bg-white p-6 rounded shadow animate-fade-in">
          <h2 className="text-lg font-semibold mb-4">Top Users</h2>
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-gray-600">
                <th>User</th>
                <th>SMS Sent</th>
                <th>Campaigns</th>
                <th>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Afroel', '1.2M', '20', '$12K'],
                ['Computopia', '800K', '15', '$9K'],
                ['Sika Tech', '300K', '7', '$4K'],
              ].map(([user, sms, campaigns, earnings], i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition">
                  <td className="py-2">{user}</td>
                  <td>{sms}</td>
                  <td>{campaigns}</td>
                  <td>{earnings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="bg-white p-6 rounded shadow">
           <h2 className="text-lg font-semibold mb-4">Recent Campaigns</h2>
           <table className="w-full table-auto">
             <thead>
               <tr className="text-left text-gray-600">
                 <th>Campaign</th>
                 <th>User</th>
                 <th>Status</th>
                 <th>Delivery Rate</th>
               </tr>
             </thead>
             <tbody>
               {[
                ['Afroel Promo', 'Afroel', 'Sent', '98%'],
                ['Dashboard', 'Afroel', 'Draft', '—'],
                ['Sika Tech Promo', 'Sika Tech', 'Sent', '95%'],
                ['Computopia Promo', 'Computopia', 'Sent', '93%'],
              ].map(([name, user, status, rate], i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition">
                  <td className="py-2">{name}</td>
                  <td>{user}</td>
                  <td>{status}</td>
                  <td>{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

// Reusable Button
const Button = ({ label, color = 'red' }) => (
  <button
    className={`bg-${color}-600 text-white px-4 py-2 rounded hover:bg-${color}-700 transition transform hover:scale-105`}
  >
    {label}
  </button>
);

export default Home;