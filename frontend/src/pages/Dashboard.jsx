import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Network,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  Activity,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { patientsApi } from '../api/patients';
import { doctorsApi } from '../api/doctors';
import { mappingsApi } from '../api/mappings';
import { formatApiError } from '../api/auth';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

export const Dashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    patientsCount: 0,
    doctorsCount: 0,
    mappingsCount: 0,
  });

  const [recentPatients, setRecentPatients] = useState([]);
  const [recentMappings, setRecentMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [patientsData, doctorsData, mappingsData] = await Promise.all([
        patientsApi.getPatients(),
        doctorsApi.getDoctors(),
        mappingsApi.getMappings(),
      ]);

      const patientsList = Array.isArray(patientsData) ? patientsData : [];
      const doctorsList = Array.isArray(doctorsData) ? doctorsData : [];
      const mappingsList = Array.isArray(mappingsData) ? mappingsData : [];

      setStats({
        patientsCount: patientsList.length,
        doctorsCount: doctorsList.length,
        mappingsCount: mappingsList.length,
      });

      // Sort recent items by created_at or assigned_at descending
      setRecentPatients(
        [...patientsList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
      );

      setRecentMappings(
        [...mappingsList].sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at)).slice(0, 5)
      );
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <LoadingSpinner message="Loading clinical dashboard..." />;
  }

  return (
    <div className="dashboard-page">
      {/* Welcome & Overview Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome, {user?.full_name || 'Care Coordinator'}
          </h1>
          <p className="page-subtitle">
            Healthcare operations overview &bull; {user?.email}
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            title="Refresh clinical metrics"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Metric Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper teal">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">My Registered Patients</span>
            <span className="stat-value">{stats.patientsCount}</span>
            <span className="stat-subtext">Isolated to your coordinator account</span>
          </div>
          <Link to="/patients" className="stat-card-link">
            <span>View Patients</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <UserCheck size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Institutional Doctors</span>
            <span className="stat-value">{stats.doctorsCount}</span>
            <span className="stat-subtext">Active medical specialists</span>
          </div>
          <Link to="/doctors" className="stat-card-link">
            <span>Explore Directory</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Network size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Care Assignments</span>
            <span className="stat-value">{stats.mappingsCount}</span>
            <span className="stat-subtext">Patient-Doctor links</span>
          </div>
          <Link to="/mappings" className="stat-card-link">
            <span>Manage Assignments</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="quick-actions-bar">
        <span className="quick-actions-title">Clinical Actions:</span>
        <div className="quick-action-buttons">
          <Link to="/patients" className="btn btn-sm btn-primary">
            <PlusCircle size={16} />
            <span>Add Patient</span>
          </Link>
          <Link to="/doctors" className="btn btn-sm btn-outline">
            <PlusCircle size={16} />
            <span>Add Doctor</span>
          </Link>
          <Link to="/mappings" className="btn btn-sm btn-outline">
            <Network size={16} />
            <span>New Assignment</span>
          </Link>
        </div>
      </div>

      {/* Two-Column Recent Data Overview */}
      <div className="dashboard-grid">
        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title">
              <Users size={20} className="text-teal" />
              <h2>Recent Patients</h2>
            </div>
            <Link to="/patients" className="card-header-link">
              View all
            </Link>
          </div>

          <div className="card-body">
            {recentPatients.length === 0 ? (
              <div className="empty-state">
                <Users size={36} className="empty-icon" />
                <p className="empty-title">No patients registered yet</p>
                <p className="empty-description">
                  Add your first patient to begin tracking medical history and care teams.
                </p>
                <Link to="/patients" className="btn btn-primary btn-sm mt-3">
                  Register Patient
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>DOB / Gender</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <div className="font-semibold text-dark">
                            {patient.first_name} {patient.last_name}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-subtle">
                            {patient.gender}
                          </span>
                          <span className="text-muted text-xs ml-2">
                            {patient.date_of_birth}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted">{patient.contact_number}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title">
              <Network size={20} className="text-purple" />
              <h2>Recent Care Team Assignments</h2>
            </div>
            <Link to="/mappings" className="card-header-link">
              View all
            </Link>
          </div>

          <div className="card-body">
            {recentMappings.length === 0 ? (
              <div className="empty-state">
                <Network size={36} className="empty-icon" />
                <p className="empty-title">No doctor assignments yet</p>
                <p className="empty-description">
                  Assign registered doctors to your patients to form care teams.
                </p>
                <Link to="/mappings" className="btn btn-primary btn-sm mt-3">
                  Create Assignment
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Assigned Doctor</th>
                      <th>Specialization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMappings.map((mapping) => (
                      <tr key={mapping.id}>
                        <td className="font-semibold text-dark">
                          {mapping.patient_name}
                        </td>
                        <td>
                          <span className="text-teal font-medium">
                            {mapping.doctor_name}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-teal">
                            {mapping.specialization}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
