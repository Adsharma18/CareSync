import apiClient from './client';

export const authApi = {
  /**
   * Register a new user/coordinator
   * POST /api/auth/register/
   */
  async register({ fullName, email, password }) {
    const payload = {
      full_name: fullName,
      email: email.trim().toLowerCase(),
      password,
    };
    const response = await apiClient.post('/api/auth/register/', payload);
    return response.data;
  },

  /**
   * Authenticate email and password
   * POST /api/auth/login/
   * Returns: { access: "...", refresh: "..." }
   */
  async login({ email, password }) {
    const payload = {
      email: email.trim().toLowerCase(),
      password,
    };
    const response = await apiClient.post('/api/auth/login/', payload);
    return response.data;
  },

  /**
   * Refresh expired access token
   * POST /api/auth/token/refresh/
   */
  async refreshToken(refreshToken) {
    const response = await apiClient.post('/api/auth/token/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  /**
   * Get authenticated user profile
   * GET /api/auth/me/
   */
  async getMe() {
    const response = await apiClient.get('/api/auth/me/');
    return response.data;
  },
};

/**
 * Format DRF error response into a human-readable string or key-value map
 */
export function formatApiError(error) {
  if (!error.response) {
    return error.message || 'Network error: Unable to connect to server.';
  }

  const data = error.response.data;
  if (typeof data === 'string') {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  // If dictionary of field errors: { email: ["..."], password: ["..."] }
  const messages = [];
  for (const [key, value] of Object.entries(data)) {
    const label = key === 'non_field_errors' ? '' : `${key}: `;
    if (Array.isArray(value)) {
      messages.push(`${label}${value.join(' ')}`);
    } else if (typeof value === 'object' && value !== null) {
      messages.push(`${label}${JSON.stringify(value)}`);
    } else {
      messages.push(`${label}${value}`);
    }
  }

  return messages.length > 0 ? messages.join(' | ') : 'An unexpected error occurred.';
}
