import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Calendar,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { patientsApi } from '../api/patients';
import { mappingsApi } from '../api/mappings';
import { formatApiError } from '../api/auth';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'Male',
  contact_number: '',
  medical_history: '',
};

export const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null); // null = Create, object = Edit
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deletingPatient, setDeletingPatient] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Care Team Inspection Modal State
  const [inspectingPatient, setInspectingPatient] = useState(null);
  const [careTeam, setCareTeam] = useState(null);
  const [loadingCareTeam, setLoadingCareTeam] = useState(false);

  // Page level alerts
  const [pageAlert, setPageAlert] = useState(null);

  const fetchPatients = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await patientsApi.getPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      setPageAlert({ type: 'error', message: formatApiError(err) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const query = searchQuery.toLowerCase().trim();
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      const contact = (patient.contact_number || '').toLowerCase();
      const history = (patient.medical_history || '').toLowerCase();

      const matchesQuery =
        !query ||
        fullName.includes(query) ||
        contact.includes(query) ||
        history.includes(query);

      const matchesGender =
        genderFilter === 'ALL' ||
        patient.gender.toLowerCase() === genderFilter.toLowerCase();

      return matchesQuery && matchesGender;
    });
  }, [patients, searchQuery, genderFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPatient(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      date_of_birth: patient.date_of_birth || '',
      gender: patient.gender || 'Male',
      contact_number: patient.contact_number || '',
      medical_history: patient.medical_history || '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Basic frontend validations
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    if (!formData.date_of_birth) {
      setFormError('Date of birth is required.');
      return;
    }
    if (!formData.contact_number.trim()) {
      setFormError('Contact number is required.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingPatient) {
        await patientsApi.updatePatient(editingPatient.id, formData);
        setPageAlert({
          type: 'success',
          message: `Patient ${formData.first_name} ${formData.last_name} updated successfully.`,
        });
      } else {
        await patientsApi.createPatient(formData);
        setPageAlert({
          type: 'success',
          message: `Patient ${formData.first_name} ${formData.last_name} registered successfully.`,
        });
      }
      setIsFormModalOpen(false);
      fetchPatients(true);
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingPatient) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await patientsApi.deletePatient(deletingPatient.id);
      setPageAlert({
        type: 'success',
        message: `Patient ${deletingPatient.first_name} ${deletingPatient.last_name} was removed.`,
      });
      setDeletingPatient(null);
      fetchPatients(true);
    } catch (err) {
      setDeleteError(formatApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  // Inspect Care Team for Patient
  const handleInspectCareTeam = async (patient) => {
    setInspectingPatient(patient);
    setLoadingCareTeam(true);
    try {
      const data = await mappingsApi.getPatientCareTeam(patient.id);
      setCareTeam(data);
    } catch (err) {
      setCareTeam(null);
      setPageAlert({
        type: 'error',
        message: `Could not load care team: ${formatApiError(err)}`,
      });
    } finally {
      setLoadingCareTeam(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading patient registry..." />;
  }

  return (
    <div className="patients-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients Registry</h1>
          <p className="page-subtitle">
            Manage your assigned patients, demographic records, and medical histories.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fetchPatients(true)}
            disabled={refreshing}
            title="Refresh patient list"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {pageAlert && (
        <Alert
          type={pageAlert.type}
          message={pageAlert.message}
          onClose={() => setPageAlert(null)}
          className="mb-6"
        />
      )}

      {/* Filter and Search Controls */}
      <div className="filter-card">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by patient name, phone, or medical conditions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="form-control select-control"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            aria-label="Filter by gender"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Patient Table / Cards */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-title">
            <Users size={20} className="text-teal" />
            <h2>
              {filteredPatients.length} {filteredPatients.length === 1 ? 'Patient' : 'Patients'} Found
            </h2>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredPatients.length === 0 ? (
            <div className="empty-state p-6">
              <Users size={40} className="empty-icon" />
              <p className="empty-title">
                {searchQuery || genderFilter !== 'ALL'
                  ? 'No patients match your search criteria'
                  : 'No patients registered yet'}
              </p>
              <p className="empty-description">
                {searchQuery || genderFilter !== 'ALL'
                  ? 'Try clearing the search filters or using different keywords.'
                  : 'Start by clicking "Register Patient" to record your first clinical patient.'}
              </p>
              {!searchQuery && genderFilter === 'ALL' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-3"
                  onClick={handleOpenCreate}
                >
                  <Plus size={16} />
                  <span>Register Patient</span>
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Date of Birth</th>
                    <th>Gender</th>
                    <th>Contact</th>
                    <th>Medical History</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <div className="font-semibold text-dark">
                          {patient.first_name} {patient.last_name}
                        </div>
                        <span className="text-xs text-muted">ID: {patient.id.slice(0, 8)}...</span>
                      </td>
                      <td>
                        <div className="inline-flex items-center text-sm">
                          <Calendar size={14} className="text-muted mr-1" />
                          <span>{patient.date_of_birth}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            patient.gender === 'Female'
                              ? 'badge-purple'
                              : patient.gender === 'Male'
                              ? 'badge-teal'
                              : 'badge-subtle'
                          }`}
                        >
                          {patient.gender}
                        </span>
                      </td>
                      <td>
                        <div className="inline-flex items-center text-sm">
                          <Phone size={14} className="text-muted mr-1" />
                          <span>{patient.contact_number}</span>
                        </div>
                      </td>
                      <td>
                        <div className="medical-history-cell" title={patient.medical_history || 'None recorded'}>
                          {patient.medical_history ? (
                            <span>{patient.medical_history}</span>
                          ) : (
                            <span className="text-muted italic">None recorded</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-icon"
                            title="View Assigned Care Team"
                            onClick={() => handleInspectCareTeam(patient)}
                          >
                            <UserCheck size={16} className="text-teal" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit Patient Details"
                            onClick={() => handleOpenEdit(patient)}
                          >
                            <Edit size={16} className="text-blue" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Delete Patient Record"
                            onClick={() => setDeletingPatient(patient)}
                          >
                            <Trash2 size={16} className="text-red" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Patient Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !submitting && setIsFormModalOpen(false)}
        title={editingPatient ? 'Edit Patient Record' : 'Register New Patient'}
        maxWidth="540px"
      >
        {formError && (
          <Alert
            type="error"
            message={formError}
            onClose={() => setFormError(null)}
            className="mb-4"
          />
        )}

        <form onSubmit={handleFormSubmit} id="patient-form">
          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="first_name" className="form-label">
                First Name <span className="text-red">*</span>
              </label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                className="form-control"
                placeholder="e.g. Eleanor"
                value={formData.first_name}
                onChange={handleFormChange}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="last_name" className="form-label">
                Last Name <span className="text-red">*</span>
              </label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                className="form-control"
                placeholder="e.g. Vance"
                value={formData.last_name}
                onChange={handleFormChange}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="date_of_birth" className="form-label">
                Date of Birth <span className="text-red">*</span>
              </label>
              <input
                id="date_of_birth"
                type="date"
                name="date_of_birth"
                className="form-control"
                max={new Date().toISOString().split('T')[0]}
                value={formData.date_of_birth}
                onChange={handleFormChange}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="gender" className="form-label">
                Gender <span className="text-red">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                className="form-control"
                value={formData.gender}
                onChange={handleFormChange}
                required
                disabled={submitting}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contact_number" className="form-label">
              Contact Phone Number <span className="text-red">*</span>
            </label>
            <input
              id="contact_number"
              type="tel"
              name="contact_number"
              className="form-control"
              placeholder="+1-555-019-2834"
              value={formData.contact_number}
              onChange={handleFormChange}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="medical_history" className="form-label">
              Medical History / Allergies / Pre-existing Conditions
            </label>
            <textarea
              id="medical_history"
              name="medical_history"
              rows={3}
              className="form-control"
              placeholder="e.g. Type 2 Diabetes, Penicillin allergy, Hypertension..."
              value={formData.medical_history}
              onChange={handleFormChange}
              disabled={submitting}
            />
          </div>

          <div className="modal-footer px-0 pb-0 pt-4">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? editingPatient
                  ? 'Saving Changes...'
                  : 'Registering...'
                : editingPatient
                ? 'Save Changes'
                : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={!!deletingPatient}
        onClose={() => !deleting && setDeletingPatient(null)}
        title="Confirm Patient Removal"
        maxWidth="460px"
      >
        {deleteError && (
          <Alert
            type="error"
            message={deleteError}
            onClose={() => setDeleteError(null)}
            className="mb-4"
          />
        )}

        <div className="p-2">
          <p className="text-body mb-4">
            Are you sure you want to permanently delete{' '}
            <strong>
              {deletingPatient?.first_name} {deletingPatient?.last_name}
            </strong>
            ? This will also remove any active doctor assignments associated with this patient.
          </p>
          <div className="callout callout-warning">
            <AlertCircle size={18} className="text-red" />
            <span>This action cannot be undone.</span>
          </div>
        </div>

        <div className="modal-footer px-0 pb-0 pt-4">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setDeletingPatient(null)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDeleteConfirm}
            disabled={deleting}
          >
            {deleting ? 'Removing Patient...' : 'Yes, Remove Patient'}
          </button>
        </div>
      </Modal>

      {/* Inspect Care Team Modal */}
      <Modal
        isOpen={!!inspectingPatient}
        onClose={() => setInspectingPatient(null)}
        title={`Care Team — ${inspectingPatient?.first_name} ${inspectingPatient?.last_name}`}
        maxWidth="520px"
      >
        {loadingCareTeam ? (
          <LoadingSpinner inline message="Fetching assigned physicians..." />
        ) : !careTeam || careTeam.assigned_doctors?.length === 0 ? (
          <div className="empty-state p-4">
            <UserCheck size={36} className="empty-icon" />
            <p className="empty-title">No doctors assigned yet</p>
            <p className="empty-description">
              This patient currently has no physicians assigned to their care team.
            </p>
          </div>
        ) : (
          <div className="care-team-list">
            <p className="text-sm text-muted mb-3">
              The following physicians are currently assigned to this patient:
            </p>
            <div className="care-team-items">
              {careTeam.assigned_doctors.map((doc) => (
                <div key={doc.mapping_id} className="care-team-item">
                  <div className="care-team-avatar">
                    <UserCheck size={20} className="text-teal" />
                  </div>
                  <div className="care-team-info">
                    <div className="font-semibold text-dark">{doc.doctor_name}</div>
                    <div className="text-sm text-teal">{doc.specialization}</div>
                    {doc.notes && (
                      <div className="text-xs text-muted mt-1">
                        <strong>Notes:</strong> {doc.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer px-0 pb-0 pt-4">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setInspectingPatient(null)}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Patients;
