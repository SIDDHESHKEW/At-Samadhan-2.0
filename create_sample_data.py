#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'NeuroBoost.settings')
django.setup()

from django.contrib.auth.models import User
from NeuroBoostApp.models import Task, UserProfile, MotivationalContent, FocusSession

def create_sample_data():
    print("Creating sample data...")
    
    # Create a test user if it doesn't exist
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    if created:
        user.set_password('password123')
        user.save()
        print("Created test user: testuser / password123")
    
    # Get or create user profile
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'xp': 150,
            'level': 2,
            'current_streak': 3,
            'is_student': True,
            'total_focus_time': 180
        }
    )
    
    # Create sample tasks
    sample_tasks = [
        {
            'title': 'Study Django Models',
            'category': 'Study',
            'description': 'Learn about Django model relationships and best practices',
            'completed': True
        },
        {
            'title': 'Complete React Tutorial',
            'category': 'Study',
            'description': 'Finish the React hooks tutorial',
            'completed': False
        },
        {
            'title': 'Buy groceries',
            'category': 'General',
            'description': 'Get milk, bread, and vegetables',
            'completed': False
        },
        {
            'title': 'Review Python Functions',
            'category': 'Study',
            'description': 'Go through advanced Python function concepts',
            'completed': True
        },
        {
            'title': 'Exercise for 30 minutes',
            'category': 'General',
            'description': 'Go for a jog or do home workout',
            'completed': False
        }
    ]
    
    for task_data in sample_tasks:
        task, created = Task.objects.get_or_create(
            user=user,
            title=task_data['title'],
            defaults=task_data
        )
        if created:
            print(f"Created task: {task.title}")
    
    # Create motivational content
    motivational_quotes = [
        {
            'content_type': 'quote',
            'content': 'The only way to do great work is to love what you do.',
            'author': 'Steve Jobs'
        },
        {
            'content_type': 'quote',
            'content': 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
            'author': 'Winston Churchill'
        },
        {
            'content_type': 'tip',
            'content': 'Take breaks every 25 minutes to maintain focus and productivity.',
            'author': 'Pomodoro Technique'
        },
        {
            'content_type': 'fact',
            'content': 'The brain processes information better in short, focused sessions.',
            'author': 'Cognitive Science'
        }
    ]
    
    for quote_data in motivational_quotes:
        quote, created = MotivationalContent.objects.get_or_create(
            content=quote_data['content'],
            defaults=quote_data
        )
        if created:
            print(f"Created motivational content: {quote.content[:50]}...")
    
    # Create sample focus sessions
    focus_sessions = [
        {'duration_minutes': 25, 'notes': 'Studied Django models'},
        {'duration_minutes': 30, 'notes': 'React tutorial session'},
        {'duration_minutes': 15, 'notes': 'Quick Python review'},
        {'duration_minutes': 45, 'notes': 'Deep work on project'},
    ]
    
    for session_data in focus_sessions:
        session, created = FocusSession.objects.get_or_create(
            user=user,
            duration_minutes=session_data['duration_minutes'],
            defaults=session_data
        )
        if created:
            print(f"Created focus session: {session.duration_minutes} minutes")
    
    print("Sample data creation completed!")
    print(f"Test user: {user.username} (password: password123)")
    print(f"User profile: Level {profile.level}, {profile.xp} XP, {profile.current_streak} day streak")

if __name__ == '__main__':
    create_sample_data()
