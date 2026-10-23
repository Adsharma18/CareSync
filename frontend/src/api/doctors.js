import apiClient from './client';

export const doctorsApi = {
  /**
   * List all doctors in institutional directory
   * GET /api/doctors/
   */
  async getDoctors() {
    const response = await apiClient.get('/api/doctors/');
    return response.data;
  },

  /**
   * Get single doctor by ID
   * GET /api/doctors/<id>/
   */
  async getDoctor(id) {
    const response = await apiClient.get(`/api/doctors/${id}/`);
    return response.data;
  },

  /**
   * Register a doctor in institutional directory
   * POST /api/doctors/
   */
  async createDoctor(doctorData) {
    const response = await apiClient.post('/api/doctors/', doctorData);
    return response.data;
  },

  /**
   * Update doctor record (Creator or Admin only)
   * PATCH /api/doctors/<id>/
   */
  async updateDoctor(id, doctorData) {
    const response = await apiClient.patch(`/api/doctors/${id}/`, doctorData);
    return response.data;
  },

  /**
   * Delete doctor record (Creator or Admin only)
   * DELETE /api/doctors/<id>/
   */
  async deleteDoctor(id) {
    const response = await apiClient.delete(`/api/doctors/${id}/`);
    return response.data;
  },
};
