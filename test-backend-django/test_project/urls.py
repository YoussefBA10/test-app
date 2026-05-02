from django.urls import path, include
from test_app import views

urlpatterns = [
    path('200/', views.success),
    path('400/', views.client_error),
    path('500/', views.server_error),
    path('', include('django_prometheus.urls')),
]
