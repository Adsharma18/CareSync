import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Network,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const Sidebar = () => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-section">
        <span className="sidebar-section-title">Clinical Workspace</span>
        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/patients"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Patients Registry</span>
          </NavLink>

          <NavLink
            to="/doctors"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <UserCheck size={20} />
            <span>Doctors Directory</span>
          </NavLink>

          <NavLink
            to="/mappings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Network size={20} />
            <span>Care Team Mappings</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-section-title">Administration</span>
        <nav className="sidebar-nav">
          <a
            href="http://127.0.0.1:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link external"
            title="Open Django Administration"
          >
            <ShieldCheck size={20} />
            <span>Django Admin</span>
            <ExternalLink size={14} className="external-icon" />
          </a>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="compliance-badge">
          <span className="status-dot"></span>
          <span>CareSync HIPAA Isolated</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
