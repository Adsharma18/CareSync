from django.urls import path
from .views import MappingListCreateView, MappingDetailView

urlpatterns = [
    path('mappings/', MappingListCreateView.as_view(), name='mapping_list_create'),
    path('mappings/<uuid:pk>/', MappingDetailView.as_view(), name='mapping_detail'),
]
