import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Network,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  RefreshCw,
  AlertCircle,
  Clock,
  FileText,
  Filter,
} from 'lucide-react';
import { mappingsApi } from '../api/mappings';
import { patientsApi } from '../api/patients';
import { doctorsApi } from '../api/doctors';
import { formatApiError } from '../api/auth';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

const INITIAL_MAPPING_FORM = {
  patient: '',
  doctor: '',
  notes: '',
};

export const Mappings = () => {
  const [mappings, setMappings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('ALL');

  // Create Assignment Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_MAPPING_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Assignment Modal
  const [deletingMapping, setDeletingMapping] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Care Team View Modal
  const [viewingPatientId, setViewingPatientId] = useState(null);
  const [patientCareTeam, setPatientCareTeam] = useState(null);
  const [loadingCareTeam, setLoadingCareTeam] = useState(false);

  // Page level alerts
  const [pageAlert, setPageAlert] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [mappingsData, patientsData, doctorsData] = await Promise.all([
        mappingsApi.getMappings(),
        patientsApi.getPatients(),
        doctorsApi.getDoctors(),
      ]);

      setMappings(Array.isArray(mappingsData) ? mappingsData : []);
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
    } catch (err) {
      setPageAlert({ type: 'error', message: formatApiError(err) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      const query = searchQuery.toLowerCase().trim();
      const patientName = (m.patient_name || '').toLowerCase();
      const doctorName = (m.doctor_name || '').toLowerCase();
      const spec = (m.specialization || '').toLowerCase();
      const notes = (m.notes || '').toLowerCase();

      const matchesQuery =
        !query ||
        patientName.includes(query) ||
        doctorName.includes(query) ||
        spec.includes(query) ||
        notes.includes(query);

      const matchesPatient =
        patientFilter === 'ALL' || m.patient === patientFilter;

      return matchesQuery && matchesPatient;
    });
  }, [mappings, searchQuery, patientFilter]);

  const handleOpenCreate = () => {
    setFormData({
      patient: patients[0]?.id || '',
      doctor: doctors[0]?.id || '',
      notes: '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.patient) {
      setFormError('Please select a patient.');
      return;
    }
    if (!formData.doctor) {
      setFormError('Please select a doctor to assign.');
      return;
    }

    setSubmitting(true);

    try {
      await mappingsApi.createMapping(formData);
      setPageAlert({
        type: 'success',
        message: 'Doctor successfully assigned to patient care team.',
      });
      setIsCreateModalOpen(false);
      fetchData(true);
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMapping) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await mappingsApi.deleteMapping(deletingMapping.id);
      setPageAlert({
        type: 'success',
        message: `Removed assignment: ${deletingMapping.doctor_name} from ${deletingMapping.patient_name}.`,
      });
      setDeletingMapping(null);
      fetchData(true);
    } catch (err) {
      setDeleteError(formatApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleViewPatientCareTeam = async (patientId) => {
    setViewingPatientId(patientId);
    setLoadingCareTeam(true);

    try {
      const data = await mappingsApi.getPatientCareTeam(patientId);
      setPatientCareTeam(data);
    } catch (err) {
      setPatientCareTeam(null);
      setPageAlert({
        type: 'error',
        message: `Unable to fetch care team: ${formatApiError(err)}`,
      });
    } finally {
      setLoadingCareTeam(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading care team assignments..." />;
  }

  return (
    <div className="mappings-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient-Doctor Care Team Assignments</h1>
          <p className="page-subtitle">
            Manage multi-disciplinary physician assignments with strict duplicate protection.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh assignments"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
            disabled={patients.length === 0 || doctors.length === 0}
            title={
              patients.length === 0
                ? 'Register at least one patient first'
                : doctors.length === 0
                ? 'Register at least one doctor first'
                : 'Create new assignment'
            }
          >
            <Plus size={16} />
            <span>Assign Doctor to Patient</span>
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

      {/* Warning callout if no patients or doctors exist yet */}
      {patients.length === 0 && (
        <div className="callout callout-warning mb-6">
          <AlertCircle size={20} className="text-amber" />
          <span>
            You have no registered patients yet. Please register a patient before creating
            assignments.
          </span>
        </div>
      )}

      {doctors.length === 0 && (
        <div className="callout callout-warning mb-6">
          <AlertCircle size={20} className="text-amber" />
          <span>
            No doctors are currently in the directory. Please register institutional doctors first.
          </span>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="filter-card">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by patient, doctor, specialty, or clinical notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="form-control select-control"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            aria-label="Filter assignments by patient"
          >
            <option value="ALL">All Patients ({mappings.length})</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-title">
            <Network size={20} className="text-purple" />
            <h2>
              {filteredMappings.length}{' '}
              {filteredMappings.length === 1 ? 'Assignment' : 'Assignments'} Active
            </h2>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredMappings.length === 0 ? (
            <div className="empty-state p-6">
              <Network size={40} className="empty-icon" />
              <p className="empty-title">
                {searchQuery || patientFilter !== 'ALL'
                  ? 'No assignments match your filter'
                  : 'No patient-doctor assignments established'}
              </p>
              <p className="empty-description">
                {searchQuery || patientFilter !== 'ALL'
                  ? 'Try selecting a different patient or clearing search keywords.'
                  : 'Link attending physicians and consulting specialists to your patients.'}
              </p>
              {patients.length > 0 && doctors.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-3"
                  onClick={handleOpenCreate}
                >
                  <Plus size={16} />
                  <span>Assign Doctor</span>
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Assigned Doctor</th>
                    <th>Specialization</th>
                    <th>Clinical Notes</th>
                    <th>Assigned At</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMappings.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <button
                          type="button"
                          className="table-link-btn"
                          title="Click to view complete care team for this patient"
                          onClick={() => handleViewPatientCareTeam(m.patient)}
                        >
                          <div className="font-semibold text-teal hover-underline">
                            {m.patient_name}
                          </div>
                        </button>
                      </td>
                      <td>
                        <div className="font-medium text-dark">
                          {m.doctor_name}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-teal">
                          {m.specialization}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-body">
                          {m.notes || <em className="text-muted">None provided</em>}
                        </span>
                      </td>
                      <td>
                        <div className="inline-flex items-center text-xs text-muted">
                          <Clock size={13} className="mr-1" />
                          <span>{new Date(m.assigned_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Remove assignment"
                          onClick={() => setDeletingMapping(m)}
                        >
                          <Trash2 size={16} className="text-red" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !submitting && setIsCreateModalOpen(false)}
        title="Assign Doctor to Patient"
        maxWidth="500px"
      >
        {formError && (
          <Alert
            type="error"
            message={formError}
            onClose={() => setFormError(null)}
            className="mb-4"
          />
        )}

        <form onSubmit={handleCreateSubmit} id="mapping-form">
          <div className="form-group">
            <label htmlFor="patient" className="form-label">
              Select Patient <span className="text-red">*</span>
            </label>
            <select
              id="patient"
              name="patient"
              className="form-control"
              value={formData.patient}
              onChange={handleFormChange}
              required
              disabled={submitting}
            >
              <option value="" disabled>
                -- Choose Patient --
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} (DOB: {p.date_of_birth})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="doctor" className="form-label">
              Select Doctor <span className="text-red">*</span>
            </label>
            <select
              id="doctor"
              name="doctor"
              className="form-control"
              value={formData.doctor}
              onChange={handleFormChange}
              required
              disabled={submitting}
            >
              <option value="" disabled>
                -- Choose Doctor --
              </option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.first_name} {d.last_name} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Assignment Notes / Role in Care Plan
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="form-control"
              placeholder="e.g. Attending Cardiologist for pre-op review..."
              value={formData.notes}
              onChange={handleFormChange}
              disabled={submitting}
            />
          </div>

          <div className="modal-footer px-0 pb-0 pt-4">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Assigning...' : 'Assign to Care Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Assignment Confirmation Modal */}
      <Modal
        isOpen={!!deletingMapping}
        onClose={() => !deleting && setDeletingMapping(null)}
        title="Remove Care Team Assignment"
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
            Are you sure you want to remove <strong>{deletingMapping?.doctor_name}</strong> from{' '}
            <strong>{deletingMapping?.patient_name}</strong>'s care team?
          </p>
          <div className="callout callout-warning">
            <AlertCircle size={18} className="text-red" />
            <span>This removes the active mapping record from the database.</span>
          </div>
        </div>

        <div className="modal-footer px-0 pb-0 pt-4">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setDeletingMapping(null)}
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
            {deleting ? 'Removing...' : 'Confirm Removal'}
          </button>
        </div>
      </Modal>

      {/* Patient Care Team Modal */}
      <Modal
        isOpen={!!viewingPatientId}
        onClose={() => setViewingPatientId(null)}
        title={`Complete Care Team — ${patientCareTeam?.patient_name || 'Patient'}`}
        maxWidth="520px"
      >
        {loadingCareTeam ? (
          <LoadingSpinner inline message="Loading assigned physicians..." />
        ) : !patientCareTeam || patientCareTeam.assigned_doctors?.length === 0 ? (
          <div className="empty-state p-4">
            <UserCheck size={36} className="empty-icon" />
            <p className="empty-title">No assigned doctors</p>
            <p className="empty-description">This patient currently has no active doctor mappings.</p>
          </div>
        ) : (
          <div className="care-team-modal-body">
            <p className="text-sm text-muted mb-3">
              Physicians assigned to <strong>{patientCareTeam.patient_name}</strong>:
            </p>
            <div className="care-team-items">
              {patientCareTeam.assigned_doctors.map((doc) => (
                <div key={doc.mapping_id} className="care-team-item">
                  <div className="care-team-avatar">
                    <UserCheck size={20} className="text-teal" />
                  </div>
                  <div className="care-team-info">
                    <div className="font-semibold text-dark">{doc.doctor_name}</div>
                    <div className="text-sm text-teal">{doc.specialization}</div>
                    {doc.notes && (
                      <div className="text-xs text-muted mt-1">
                        <strong>Clinical Notes:</strong> {doc.notes}
                      </div>
                    )}
                    <div className="text-xs text-muted mt-1">
                      Assigned on {new Date(doc.assigned_at).toLocaleDateString()}
                    </div>
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
            onClick={() => setViewingPatientId(null)}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Mappings;
