import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon-wrapper">
          <FileQuestion size={48} className="text-teal" />
        </div>
        <h1 className="not-found-title">404 - Page Not Found</h1>
        <p className="not-found-subtitle">
          The healthcare resource or clinical page you requested does not exist or has been moved.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-outline">
            <Home size={18} />
            <span>CareSync Home</span>
          </Link>
          <Link to="/dashboard" className="btn btn-primary">
            <ArrowLeft size={18} />
            <span>Clinical Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
