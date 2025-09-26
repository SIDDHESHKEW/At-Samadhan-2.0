from django.contrib import admin
from django.urls import path, include, re_path  # <--- Add 're_path' here
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('NeuroBoostApp.urls')),  # <--- Add this line
    path('accounts/login/', auth_views.LoginView.as_view(template_name='NeuroBoostApp/login.html'), name='auth_login'),
    re_path(r'^@vite/.*', RedirectView.as_view(url='/static/js/vite-mock.js')),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
