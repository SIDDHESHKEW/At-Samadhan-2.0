from django.urls import path
from . import views

urlpatterns = [
    # Page Views
    path('', views.home, name='home'),
    path('progress-tree/', views.progress_tree, name='progress_tree'),
    path('connections/', views.connections, name='connections'),
    path('question-center/', views.question_center, name='question_center'),
    
    # Task Management
    path('complete/<int:task_id>/', views.toggle_complete, name='toggle_complete'),
    
    # API Endpoints
    path('api/tasks/', views.api_tasks, name='api_tasks'),
    path('api/tasks/create/', views.api_create_task, name='api_create_task'),
    path('api/tasks/toggle/<int:task_id>/', views.api_toggle_task_complete, name='api_toggle_task_complete'),
    path('api/tasks/tree/', views.api_task_tree, name='api_task_tree'),
    
    # User Data APIs
    path('api/user/xp/', views.api_user_xp, name='api_user_xp'),
    path('api/user/streak/', views.api_user_streak, name='api_user_streak'),
    path('api/user/progress/', views.api_progress, name='api_progress'),
    
    # Focus Session API
    path('api/focus-session/log/', views.api_log_focus_session, name='api_log_focus_session'),
    
    # Universal Widgets APIs
    path('api/chatbot/', views.api_chatbot, name='api_chatbot'),
    path('api/shield-data/', views.api_shield_data, name='api_shield_data'),
]

