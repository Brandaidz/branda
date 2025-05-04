import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // Import Toaster

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Add Toaster component here */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header/Navigation */}
      <header className="navbar bg-base-300 shadow-md">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl">Branda App</Link>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
            <li><Link to="/">Home (Legacy)</Link></li>
            <li><Link to="/chat">Chat</Link></li>
          </ul>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-grow">
        <Outlet /> {/* Child routes will render here */}
      </main>

      {/* Optional Footer */}
      {/* <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <aside>
          <p>Copyright © 2025 - All right reserved by Branda Industries</p>
        </aside>
      </footer> */}
    </div>
  );
};

export default MainLayout;

