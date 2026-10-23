import apiClient from './client';

export const mappingsApi = {
  /**
   * List all mappings for patients owned by authenticated user
   * GET /api/mappings/
   */
  async getMappings() {
    const response = await apiClient.get('/api/mappings/');
    return response.data;
  },

  /**
   * Assign a doctor to a patient
   * POST /api/mappings/
   * Payload: { patient: "<uuid>", doctor: "<uuid>", notes?: string }
   */
  async createMapping(mappingData) {
    const response = await apiClient.post('/api/mappings/', mappingData);
    return response.data;
  },

  /**
   * Get all doctors assigned to a specific patient (care team)
   * GET /api/mappings/<patient_id>/
   * Response: { patient_id, patient_name, assigned_doctors: [...] }
   */
  async getPatientCareTeam(patientId) {
    const response = await apiClient.get(`/api/mappings/${patientId}/`);
    return response.data;
  },

  /**
   * Remove a patient-doctor mapping
   * DELETE /api/mappings/<mapping_id>/
   */
  async deleteMapping(mappingId) {
    const response = await apiClient.delete(`/api/mappings/${mappingId}/`);
    return response.data;
  },
};
