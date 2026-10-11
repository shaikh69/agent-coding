from django.urls import path
from . import views

urlpatterns = [
    path('auth/github/', views.github_auth, name='github_auth'),
    path('health/', views.health_check, name='health_check'),
]
