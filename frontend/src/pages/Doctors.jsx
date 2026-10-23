import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { doctorsApi } from '../api/doctors';
import { formatApiError } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  specialization: 'Cardiology',
  contact_number: '',
  email: '',
  years_of_experience: 5,
};

const COMMON_SPECIALIZATIONS = [
  'All Specializations',
  'Cardiology',
  'Pediatrics',
  'Neurology',
  'Dermatology',
  'Oncology',
  'Orthopedics',
  'Psychiatry',
  'General Medicine',
  'Surgery',
  'Endocrinology',
];

export const Doctors = () => {
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specFilter, setSpecFilter] = useState('All Specializations');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null); // null = Create, object = Edit
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deletingDoctor, setDeletingDoctor] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Page level alerts
  const [pageAlert, setPageAlert] = useState(null);

  const fetchDoctors = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await doctorsApi.getDoctors();
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      setPageAlert({ type: 'error', message: formatApiError(err) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const query = searchQuery.toLowerCase().trim();
      const fullName = `Dr. ${doc.first_name} ${doc.last_name}`.toLowerCase();
      const spec = (doc.specialization || '').toLowerCase();
      const email = (doc.email || '').toLowerCase();

      const matchesQuery =
        !query ||
        fullName.includes(query) ||
        spec.includes(query) ||
        email.includes(query);

      const matchesSpec =
        specFilter === 'All Specializations' ||
        doc.specialization.toLowerCase() === specFilter.toLowerCase();

      return matchesQuery && matchesSpec;
    });
  }, [doctors, searchQuery, specFilter]);

  const handleOpenCreate = () => {
    setEditingDoctor(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      first_name: doctor.first_name || '',
      last_name: doctor.last_name || '',
      specialization: doctor.specialization || 'Cardiology',
      contact_number: doctor.contact_number || '',
      email: doctor.email || '',
      years_of_experience: doctor.years_of_experience ?? 0,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'years_of_experience' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email address is required.');
      return;
    }
    if (!formData.contact_number.trim()) {
      setFormError('Contact number is required.');
      return;
    }
    if (formData.years_of_experience < 0) {
      setFormError('Years of experience must be 0 or greater.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingDoctor) {
        await doctorsApi.updateDoctor(editingDoctor.id, formData);
        setPageAlert({
          type: 'success',
          message: `Dr. ${formData.first_name} ${formData.last_name} updated successfully.`,
        });
      } else {
        await doctorsApi.createDoctor(formData);
        setPageAlert({
          type: 'success',
          message: `Dr. ${formData.first_name} ${formData.last_name} registered into directory.`,
        });
      }
      setIsFormModalOpen(false);
      fetchDoctors(true);
    } catch (err) {
      if (err.response?.status === 403) {
        setFormError(
          'Permission Denied: Only the coordinator who registered this doctor or an administrator can modify this record.'
        );
      } else {
        setFormError(formatApiError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDoctor) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await doctorsApi.deleteDoctor(deletingDoctor.id);
      setPageAlert({
        type: 'success',
        message: `Dr. ${deletingDoctor.first_name} ${deletingDoctor.last_name} was removed from the directory.`,
      });
      setDeletingDoctor(null);
      fetchDoctors(true);
    } catch (err) {
      if (err.response?.status === 403) {
        setDeleteError(
          'Permission Denied: You do not have permission to delete this doctor. Only the original registrar or an administrator can remove doctors.'
        );
      } else {
        setDeleteError(formatApiError(err));
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading doctor directory..." />;
  }

  return (
    <div className="doctors-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Institutional Doctor Directory</h1>
          <p className="page-subtitle">
            Shared directory of verified medical specialists across all clinical departments.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fetchDoctors(true)}
            disabled={refreshing}
            title="Refresh doctors directory"
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
            <span>Register Doctor</span>
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
            placeholder="Search doctors by name, specialty, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="form-control select-control"
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            aria-label="Filter by specialization"
          >
            {COMMON_SPECIALIZATIONS.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctor Cards / Grid */}
      {filteredDoctors.length === 0 ? (
        <div className="card p-6">
          <div className="empty-state">
            <UserCheck size={40} className="empty-icon" />
            <p className="empty-title">
              {searchQuery || specFilter !== 'All Specializations'
                ? 'No doctors found matching filters'
                : 'No doctors registered in directory'}
            </p>
            <p className="empty-description">
              {searchQuery || specFilter !== 'All Specializations'
                ? 'Try adjusting your search terms or clearing specialization filters.'
                : 'Click "Register Doctor" to add specialists to the institutional directory.'}
            </p>
            {!searchQuery && specFilter === 'All Specializations' && (
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>Register Doctor</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="doctors-grid">
          {filteredDoctors.map((doc) => {
            const isCreator = doc.created_by_email === user?.email;

            return (
              <div key={doc.id} className="doctor-card">
                <div className="doctor-card-header">
                  <div className="doctor-avatar-circle">
                    <UserCheck size={24} className="text-teal" />
                  </div>
                  <div className="doctor-main-info">
                    <h3 className="doctor-name">
                      Dr. {doc.first_name} {doc.last_name}
                    </h3>
                    <span className="badge badge-teal">{doc.specialization}</span>
                  </div>
                </div>

                <div className="doctor-card-body">
                  <div className="doctor-detail-row">
                    <Briefcase size={15} className="text-muted" />
                    <span>
                      {doc.years_of_experience}{' '}
                      {doc.years_of_experience === 1 ? 'year' : 'years'} experience
                    </span>
                  </div>

                  <div className="doctor-detail-row">
                    <Mail size={15} className="text-muted" />
                    <span className="truncate" title={doc.email}>
                      {doc.email}
                    </span>
                  </div>

                  <div className="doctor-detail-row">
                    <Phone size={15} className="text-muted" />
                    <span>{doc.contact_number}</span>
                  </div>
                </div>

                <div className="doctor-card-footer">
                  <div className="doctor-creator-badge" title={`Registered by ${doc.created_by_email}`}>
                    {isCreator ? (
                      <span className="badge badge-subtle">Registered by you</span>
                    ) : (
                      <span className="text-xs text-muted truncate">
                        By {doc.created_by_email || 'Staff'}
                      </span>
                    )}
                  </div>

                  <div className="doctor-card-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      title={
                        isCreator
                          ? 'Edit Doctor'
                          : 'Edit Doctor (Requires Creator or Admin Privileges)'
                      }
                      onClick={() => handleOpenEdit(doc)}
                    >
                      <Edit size={16} className={isCreator ? 'text-blue' : 'text-muted'} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      title={
                        isCreator
                          ? 'Delete Doctor'
                          : 'Delete Doctor (Requires Creator or Admin Privileges)'
                      }
                      onClick={() => setDeletingDoctor(doc)}
                    >
                      <Trash2 size={16} className={isCreator ? 'text-red' : 'text-muted'} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Doctor Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !submitting && setIsFormModalOpen(false)}
        title={editingDoctor ? 'Edit Doctor Information' : 'Register New Doctor'}
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

        <form onSubmit={handleFormSubmit} id="doctor-form">
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
                placeholder="e.g. Robert"
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
                placeholder="e.g. Chen"
                value={formData.last_name}
                onChange={handleFormChange}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="specialization" className="form-label">
                Medical Specialization <span className="text-red">*</span>
              </label>
              <input
                id="specialization"
                type="text"
                name="specialization"
                className="form-control"
                placeholder="e.g. Cardiology, Neurology"
                value={formData.specialization}
                onChange={handleFormChange}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="years_of_experience" className="form-label">
                Years of Experience <span className="text-red">*</span>
              </label>
              <input
                id="years_of_experience"
                type="number"
                min="0"
                name="years_of_experience"
                className="form-control"
                value={formData.years_of_experience}
                onChange={handleFormChange}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Professional Email Address <span className="text-red">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-control"
              placeholder="dr.chen@hospital.org"
              value={formData.email}
              onChange={handleFormChange}
              required
              disabled={submitting}
            />
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
              placeholder="+1-555-018-9943"
              value={formData.contact_number}
              onChange={handleFormChange}
              required
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
                ? editingDoctor
                  ? 'Saving Changes...'
                  : 'Registering...'
                : editingDoctor
                ? 'Save Changes'
                : 'Register Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingDoctor}
        onClose={() => !deleting && setDeletingDoctor(null)}
        title="Remove Doctor from Directory"
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
            Are you sure you want to remove{' '}
            <strong>
              Dr. {deletingDoctor?.first_name} {deletingDoctor?.last_name}
            </strong>{' '}
            ({deletingDoctor?.specialization}) from the institutional directory?
          </p>
          <div className="callout callout-warning">
            <ShieldAlert size={18} className="text-red" />
            <span>
              Note: Only the original registrant ({deletingDoctor?.created_by_email}) or an
              administrator has authority to delete this record.
            </span>
          </div>
        </div>

        <div className="modal-footer px-0 pb-0 pt-4">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setDeletingDoctor(null)}
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
    </div>
  );
};

export default Doctors;
