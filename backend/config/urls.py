"""
CareSync Global URL Configuration.
"""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse


@api_view(['GET'])
def api_root(request, format=None):
    """
    CareSync Central API Root.
    Provides hyperlinked navigation to all core API service entry points.
    Subject to default IsAuthenticated policy (requires Bearer <access_token>).
    """
    return Response({
        'auth_register': reverse('auth_register', request=request, format=format),
        'auth_login': reverse('auth_login', request=request, format=format),
        'auth_token_refresh': reverse('auth_token_refresh', request=request, format=format),
        'auth_me': reverse('auth_me', request=request, format=format),
        'patients': reverse('patient-list', request=request, format=format),
        'doctors': reverse('doctor-list', request=request, format=format),
        'mappings': reverse('mapping_list_create', request=request, format=format),
    })


urlpatterns = [
    # Empty-path root route: Redirect to API root
    path('', RedirectView.as_view(url='/api/', permanent=False), name='root_redirect'),
    path('admin/', admin.site.urls),
    # Central API Root View
    path('api/', api_root, name='api_root'),
    # Authentication & User Account Endpoints
    path('api/auth/', include('apps.accounts.urls')),
    # Patient Management Endpoints
    path('api/', include('apps.patients.urls')),
    # Doctor Directory Endpoints
    path('api/', include('apps.doctors.urls')),
    # Patient-Doctor Mapping Endpoints
    path('api/', include('apps.mappings.urls')),
]
