import React from 'react';

export const LoadingSpinner = ({ size = 'medium', message = 'Loading...', inline = false }) => {
  const sizeClasses = {
    small: 'spinner-sm',
    medium: 'spinner-md',
    large: 'spinner-lg',
  };

  const spinner = (
    <div className="spinner-container">
      <div className={`spinner ${sizeClasses[size] || 'spinner-md'}`} role="status">
        <span className="sr-only">{message}</span>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );

  if (inline) {
    return spinner;
  }

  return <div className="spinner-backdrop">{spinner}</div>;
};

export default LoadingSpinner;
