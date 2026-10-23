import apiClient from './client';

export const patientsApi = {
  /**
   * List all patients owned by authenticated user
   * GET /api/patients/
   */
  async getPatients() {
    const response = await apiClient.get('/api/patients/');
    return response.data;
  },

  /**
   * Get single patient by ID
   * GET /api/patients/<id>/
   */
  async getPatient(id) {
    const response = await apiClient.get(`/api/patients/${id}/`);
    return response.data;
  },

  /**
   * Create a new patient record
   * POST /api/patients/
   */
  async createPatient(patientData) {
    const response = await apiClient.post('/api/patients/', patientData);
    return response.data;
  },

  /**
   * Update an existing patient record
   * PUT /api/patients/<id>/ or PATCH /api/patients/<id>/
   */
  async updatePatient(id, patientData) {
    const response = await apiClient.patch(`/api/patients/${id}/`, patientData);
    return response.data;
  },

  /**
   * Delete a patient record
   * DELETE /api/patients/<id>/
   */
  async deletePatient(id) {
    const response = await apiClient.delete(`/api/patients/${id}/`);
    return response.data;
  },
};
