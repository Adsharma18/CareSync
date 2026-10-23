import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Shield,
  Users,
  UserCheck,
  Network,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-badge">
            <span className="badge-pulse"></span>
            <span>Next-Generation Healthcare Management</span>
          </div>

          <h1 className="hero-title">
            Unified Patient Care & <br />
            <span className="gradient-text">Clinical Team Coordination</span>
          </h1>

          <p className="hero-subtitle">
            CareSync streamlines patient onboarding, verified physician directories,
            and multi-disciplinary care team assignments with enterprise-grade data isolation
            and RESTful simplicity.
          </p>

          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Go to Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start Coordinating Now
                  <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  Sign In to Clinic
                </Link>
              </>
            )}
          </div>

          {/* Quick Trust Highlights */}
          <div className="hero-features-strip">
            <div className="strip-item">
              <CheckCircle2 size={16} className="text-teal" />
              <span>Django REST Framework 5.1</span>
            </div>
            <div className="strip-item">
              <CheckCircle2 size={16} className="text-teal" />
              <span>JWT Bearer Token Security</span>
            </div>
            <div className="strip-item">
              <CheckCircle2 size={16} className="text-teal" />
              <span>Multi-Tenant Data Isolation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-eyebrow">Enterprise Capabilities</span>
          <h2 className="section-title">Built for Healthcare Coordinators & Clinicians</h2>
          <p className="section-description">
            Everything your medical staff needs to monitor records, manage provider directories,
            and maintain seamless patient-doctor assignments.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper teal">
              <Users size={24} />
            </div>
            <h3 className="feature-card-title">Patient Records Isolation</h3>
            <p className="feature-card-desc">
              Horizontal data isolation ensures that coordinators manage only their registered patients.
              Complete demographic tracking, contact records, and medical histories.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper blue">
              <UserCheck size={24} />
            </div>
            <h3 className="feature-card-title">Doctor Directory</h3>
            <p className="feature-card-desc">
              Centralized physician repository with specialties, years of experience, and contact channels.
              Fine-grained modification permissions protect institutional integrity.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper purple">
              <Network size={24} />
            </div>
            <h3 className="feature-card-title">Care Team Assignments</h3>
            <p className="feature-card-desc">
              Assign primary doctors and consulting specialists to patients. Database-level unique
              constraints guarantee zero duplicate assignments and consistent care handoffs.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper teal">
              <Shield size={24} />
            </div>
            <h3 className="feature-card-title">Role-Based Security</h3>
            <p className="feature-card-desc">
              Standard SimpleJWT authentication with automated token refreshing, encrypted passwords,
              and strict object-level permission enforcement.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper blue">
              <Clock size={24} />
            </div>
            <h3 className="feature-card-title">Real-Time Synchronization</h3>
            <p className="feature-card-desc">
              Instant updates across dashboard metrics, care team listings, and patient registries
              with asynchronous REST integration.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper purple">
              <Activity size={24} />
            </div>
            <h3 className="feature-card-title">Django Administration</h3>
            <p className="feature-card-desc">
              Seamless bridge to Django Admin for superusers with custom validations, clean model checks,
              and comprehensive auditability.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-card">
          <div className="about-content">
            <h2 className="about-title">Ready to streamline your clinical workflows?</h2>
            <p className="about-subtitle">
              Join healthcare coordinators using CareSync to organize patient histories and doctor
              teams efficiently.
            </p>
            <div className="about-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create Free Account
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Existing Coordinator Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <Activity className="footer-icon" size={20} />
            <span>CareSync Healthcare Management System</span>
          </div>
          <p className="footer-text">
            Django REST Framework 5.1 &bull; React 19 &bull; PostgreSQL 17 &bull; SimpleJWT
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
