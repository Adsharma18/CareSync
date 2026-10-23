import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export const Alert = ({ type = 'info', message, onClose, className = '' }) => {
  if (!message) return null;

  const icons = {
    error: <AlertCircle className="alert-icon" size={20} />,
    success: <CheckCircle className="alert-icon" size={20} />,
    info: <Info className="alert-icon" size={20} />,
    warning: <AlertTriangle className="alert-icon" size={20} />,
  };

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <div className="alert-content">
        {icons[type] || icons.info}
        <span className="alert-text">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          className="alert-close"
          onClick={onClose}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
