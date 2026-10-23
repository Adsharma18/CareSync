import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-shell">
      <Navbar />

      {isAuthenticated ? (
        <div className="authenticated-layout">
          <Sidebar />
          <main className="main-content">
            <div className="content-container">
              <Outlet />
            </div>
          </main>
        </div>
      ) : (
        <main className="public-content">
          <Outlet />
        </main>
      )}
    </div>
  );
};

export default Layout;
