from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import CustomUser


class AuthenticationAPITests(APITestCase):
    """
    Automated test suite for CareSync Authentication Endpoints.
    Tests registration, duplicate detection, password validation,
    login, JWT issuance, token refresh, and protected endpoint authorization.
    """

    def setUp(self):
        self.register_url = reverse('auth_register')
        self.login_url = reverse('auth_login')
        self.refresh_url = reverse('auth_token_refresh')
        self.me_url = reverse('auth_me')

        self.valid_user_data = {
            'full_name': 'Dr. Sarah Jenkins',
            'email': 'sarah.jenkins@clinic.org',
            'password': 'SecurePassword123!'
        }

    def test_registration_success(self):
        """Verify successful user registration with valid data."""
        response = self.client.post(self.register_url, self.valid_user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['email'], self.valid_user_data['email'])
        self.assertEqual(response.data['full_name'], self.valid_user_data['full_name'])
        self.assertNotIn('password', response.data)

        # Verify database persistence and password hashing
        user = CustomUser.objects.get(email=self.valid_user_data['email'])
        self.assertTrue(user.check_password(self.valid_user_data['password']))
        self.assertNotEqual(user.password, self.valid_user_data['password'])

    def test_registration_with_name_alias(self):
        """Verify registration works when 'name' is supplied instead of 'full_name'."""
        payload = {
            'name': 'Dr. Marcus Brody',
            'email': 'marcus.brody@clinic.org',
            'password': 'SecurePassword123!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['full_name'], 'Dr. Marcus Brody')

    def test_registration_duplicate_email(self):
        """Verify registering with an existing email returns 400 Bad Request."""
        # Create initial user
        self.client.post(self.register_url, self.valid_user_data, format='json')

        # Attempt to register with identical email (mixed case)
        duplicate_data = {
            'full_name': 'Another User',
            'email': 'SARAH.JENKINS@clinic.org',
            'password': 'DifferentPassword456!'
        }
        response = self.client.post(self.register_url, duplicate_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_registration_weak_password(self):
        """Verify password validation rejects passwords under 8 characters."""
        weak_data = {
            'full_name': 'Weak User',
            'email': 'weak.user@clinic.org',
            'password': '123'
        }
        response = self.client.post(self.register_url, weak_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_registration_missing_required_fields(self):
        """Verify registration rejects empty payloads."""
        response = self.client.post(self.register_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        """Verify valid credentials return JWT access and refresh tokens."""
        # Register user
        self.client.post(self.register_url, self.valid_user_data, format='json')

        # Login
        login_payload = {
            'email': self.valid_user_data['email'],
            'password': self.valid_user_data['password']
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(len(response.data['access']) > 20)
        self.assertTrue(len(response.data['refresh']) > 20)

    def test_login_case_insensitive_email(self):
        """Verify login succeeds regardless of email casing."""
        self.client.post(self.register_url, self.valid_user_data, format='json')

        login_payload = {
            'email': self.valid_user_data['email'].upper(),
            'password': self.valid_user_data['password']
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_login_invalid_password(self):
        """Verify invalid password returns 401 Unauthorized."""
        self.client.post(self.register_url, self.valid_user_data, format='json')

        login_payload = {
            'email': self.valid_user_data['email'],
            'password': 'WrongPassword999!'
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)

    def test_login_nonexistent_email(self):
        """Verify non-existent user returns 401 Unauthorized."""
        login_payload = {
            'email': 'ghost@clinic.org',
            'password': 'AnyPassword123!'
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_success(self):
        """Verify valid refresh token issues a new access token."""
        self.client.post(self.register_url, self.valid_user_data, format='json')
        login_resp = self.client.post(self.login_url, {
            'email': self.valid_user_data['email'],
            'password': self.valid_user_data['password']
        }, format='json')
        refresh_token = login_resp.data['refresh']

        refresh_resp = self.client.post(self.refresh_url, {'refresh': refresh_token}, format='json')
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_resp.data)

    def test_token_refresh_invalid_token(self):
        """Verify invalid refresh token returns 401 Unauthorized."""
        response = self.client.post(self.refresh_url, {'refresh': 'invalid.token.here'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_access_without_token(self):
        """Verify protected endpoint blocks requests without token."""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_access_with_valid_token(self):
        """Verify protected endpoint succeeds with valid Bearer access token."""
        self.client.post(self.register_url, self.valid_user_data, format='json')
        login_resp = self.client.post(self.login_url, {
            'email': self.valid_user_data['email'],
            'password': self.valid_user_data['password']
        }, format='json')
        access_token = login_resp.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.valid_user_data['email'])
        self.assertEqual(response.data['full_name'], self.valid_user_data['full_name'])
