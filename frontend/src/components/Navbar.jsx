import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, LogOut, User, LayoutDashboard, Users, UserCheck, Network } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="navbar-brand" onClick={closeMenu}>
          <div className="brand-icon-wrapper">
            <Activity className="brand-icon" size={24} />
          </div>
          <span className="brand-name">Care<span>Sync</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="navbar-nav desktop-nav">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/patients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Patients</span>
              </NavLink>
              <NavLink to="/doctors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <UserCheck size={18} />
                <span>Doctors</span>
              </NavLink>
              <NavLink to="/mappings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Network size={18} />
                <span>Assignments</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Home
              </NavLink>
              <a href="#features" className="nav-link">
                Features
              </a>
              <a href="#about" className="nav-link">
                About
              </a>
            </>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="navbar-actions desktop-nav">
          {isAuthenticated ? (
            <div className="user-profile-menu">
              <div className="user-info-badge">
                <div className="avatar-circle">
                  {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="user-details-text">
                  <span className="user-name">{user?.full_name || 'Care Coordinator'}</span>
                  <span className="user-email">{user?.email}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm logout-btn"
                onClick={handleLogout}
                title="Sign out of CareSync"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle button */}
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          {isAuthenticated ? (
            <div className="mobile-menu-inner">
              <div className="mobile-user-card">
                <div className="avatar-circle">
                  {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{user?.full_name || 'Care Coordinator'}</div>
                  <div className="user-email">{user?.email}</div>
                </div>
              </div>

              <NavLink to="/dashboard" className="mobile-nav-link" onClick={closeMenu}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/patients" className="mobile-nav-link" onClick={closeMenu}>
                <Users size={20} />
                <span>Patients</span>
              </NavLink>
              <NavLink to="/doctors" className="mobile-nav-link" onClick={closeMenu}>
                <UserCheck size={20} />
                <span>Doctors Directory</span>
              </NavLink>
              <NavLink to="/mappings" className="mobile-nav-link" onClick={closeMenu}>
                <Network size={20} />
                <span>Patient-Doctor Assignments</span>
              </NavLink>

              <button
                type="button"
                className="btn btn-danger btn-block mobile-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="mobile-menu-inner">
              <Link to="/" className="mobile-nav-link" onClick={closeMenu}>
                Home
              </Link>
              <div className="mobile-auth-actions">
                <Link to="/login" className="btn btn-outline btn-block" onClick={closeMenu}>
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-block" onClick={closeMenu}>
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
