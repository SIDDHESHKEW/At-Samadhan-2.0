from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Sum, Q, F, ExpressionWrapper, fields
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.core.serializers import serialize
import json
import random
import time
from datetime import date, datetime, timedelta

from .models import (
    Task, UserProfile, User, FocusSession, Friendship, SharedGoal, 
    ChatMessage, Syllabus, MCQuestion, MockTest, Flashcard, MotivationalContent
)
from django.core.exceptions import ObjectDoesNotExist

# This is a temporary fix until we implement proper authentication!
# It ensures every request has a user and a corresponding UserProfile.
def get_temp_user_and_profile():
    # Attempt to get the first user (likely the superuser)
    user = User.objects.first()
    profile = None
    
    if user:
        try:
            # Try to get the existing profile
            profile = user.userprofile
        except ObjectDoesNotExist:
            # If the profile doesn't exist (e.g., first run after migration), create it
            profile = UserProfile.objects.create(user=user)
    
    return user, profile

def home(request):
    first_user, user_profile = get_temp_user_and_profile()

    if request.method == 'POST':
        if first_user:
            # Handle task creation
            title = request.POST.get('title')
            category = request.POST.get('category', 'General') 
            description = request.POST.get('description', '')
            deadline_str = request.POST.get('deadline')
            
            # Parse deadline if provided
            deadline = None
            if deadline_str:
                try:
                    deadline = datetime.strptime(deadline_str, '%Y-%m-%dT%H:%M')
                except ValueError:
                    pass
            
            # Create a new task and assign it to the temporary user
            Task.objects.create(
                title=title, 
                user=first_user, 
                category=category,
                description=description,
                deadline=deadline
            ) 
            return redirect('home')
        else:
            # If no user exists, prevent task creation
            print("Error: Cannot create task because no user exists.")

    # Fetch and order tasks by creation date
    tasks = Task.objects.filter(user=first_user).order_by('-created_at') if first_user else []
    
    # Calculate XP needed for next level
    xp_to_next_level = (user_profile.level * 100) - user_profile.xp if user_profile else 0
    
    # Get recent focus sessions
    recent_focus_sessions = FocusSession.objects.filter(user=first_user).order_by('-created_at')[:5] if first_user else []
    
    # Get motivational content for the distraction shield
    motivational_content = MotivationalContent.objects.order_by('?').first()
    
    context = {
        'tasks': tasks,
        'user_profile': user_profile,  # Pass profile data to the template
        'xp_to_next_level': xp_to_next_level,
        'Task_CATEGORY_CHOICES': Task.CATEGORY_CHOICES,  # Pass category choices for the form
        'recent_focus_sessions': recent_focus_sessions,
        'motivational_content': motivational_content,
        'page': 'dashboard'
    }
    return render(request, 'NeuroBoostApp/home.html', context)

# View function to flip the 'completed' status and handle XP/Streak
def toggle_complete(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    user_profile = task.user.userprofile # Get the related user profile
    
    response_data = {
        'task_id': task_id,
        'completed': not task.completed,
    }
    
    if not task.completed:
        # Task is being marked COMPLETE
        task.completed = True
        
        # Store old values to check for changes
        old_level = user_profile.level
        old_streak = user_profile.current_streak
        
        # 1. Award XP and check for level up
        level_up_status = user_profile.gain_xp(task.xp_points)
        
        # 2. Update Streak Logic
        streak_status_changed = user_profile.update_streak()
        
        # Check if streak milestone reached (every 5 days)
        streak_bonus_xp = 0
        if streak_status_changed and user_profile.current_streak % 5 == 0:
            streak_bonus_xp = 20  # Bonus XP for streak milestone
            user_profile.gain_xp(streak_bonus_xp)
        
        # Add XP and level data to response
        response_data.update({
            'xp_gained': task.xp_points,
            'streak_bonus_xp': streak_bonus_xp,
            'total_xp': user_profile.xp,
            'level': user_profile.level,
            'level_up': level_up_status,
            'streak': user_profile.current_streak,
            'streak_milestone': user_profile.current_streak > 0 and user_profile.current_streak % 5 == 0
        })
    else:
        # Task is being marked INCOMPLETE (Undo)
        task.completed = False
        # Note: We are currently NOT deducting XP or breaking the streak on undo for simplicity.

    # Save the task completion status change
    task.save()
    
    # Return JSON response for AJAX requests
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse(response_data)
    
    # Redirect the user back to the homepage
    return redirect('home')


# API Endpoints
@login_required
def api_tasks(request):
    """API endpoint to get all tasks for the current user"""
    user = request.user
    tasks = Task.objects.filter(user=user).order_by('-created_at')
    
    tasks_data = [{
        'id': task.id,
        'title': task.title,
        'category': task.category,
        'description': task.description,
        'completed': task.completed,
        'created_at': task.created_at.strftime('%Y-%m-%d %H:%M'),
        'deadline': task.deadline.strftime('%Y-%m-%d %H:%M') if task.deadline else None,
        'xp_points': task.xp_points
    } for task in tasks]
    
    return JsonResponse({'tasks': tasks_data})


@login_required
def api_create_task(request):
    """API endpoint to create a new task"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        title = data.get('title')
        category = data.get('category', 'General')
        description = data.get('description', '')
        deadline_str = data.get('deadline')
        
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        
        # Parse deadline if provided
        deadline = None
        if deadline_str:
            try:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%dT%H:%M')
            except ValueError:
                return JsonResponse({'error': 'Invalid deadline format'}, status=400)
        
        # Create the task
        task = Task.objects.create(
            title=title,
            user=request.user,
            category=category,
            description=description,
            deadline=deadline
        )
        
        return JsonResponse({
            'success': True,
            'task': {
                'id': task.id,
                'title': task.title,
                'category': task.category,
                'description': task.description,
                'completed': task.completed,
                'created_at': task.created_at.strftime('%Y-%m-%d %H:%M'),
                'deadline': task.deadline.strftime('%Y-%m-%d %H:%M') if task.deadline else None,
                'xp_points': task.xp_points
            }
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def api_task_tree(request):
    """API endpoint to get task data for D3.js tree visualization"""
    user = request.user
    tasks = Task.objects.filter(user=user)
    
    # Create tree structure with categories as branches
    tree_data = {
        'name': 'Tasks',
        'children': []
    }
    
    # Group tasks by category
    categories = {}
    for task in tasks:
        if task.category not in categories:
            categories[task.category] = []
        categories[task.category].append(task)
    
    # Add categories as branches
    for category, category_tasks in categories.items():
        category_node = {
            'name': category,
            'children': []
        }
        
        # Add tasks as leaves
        for task in category_tasks:
            # Size based on completion status (completed tasks are larger)
            size = 15 if task.completed else 10
            
            task_node = {
                'name': task.title,
                'id': task.id,
                'size': size,
                'completed': task.completed,
                'xp': task.xp_points,
                'description': task.description,
                'deadline': task.deadline.strftime('%Y-%m-%d') if task.deadline else None
            }
            
            category_node['children'].append(task_node)
        
        tree_data['children'].append(category_node)
    
    return JsonResponse(tree_data)


@login_required
def api_chatbot(request):
    """API endpoint for the chatbot"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        message = data.get('message', '')
        
        if not message:
            return JsonResponse({'error': 'Message is required'}, status=400)
        
        # In a real implementation, this would call OpenAI/Gemini API
        # For now, we'll return a random motivational response
        responses = [
            "You're doing great! Keep up the good work!",
            "Remember, consistency is key to success in your studies.",
            "Taking regular breaks can actually improve your productivity.",
            "Try the Pomodoro technique: 25 minutes of focus, then a 5-minute break.",
            "Don't forget to celebrate your small wins along the way!",
            "Struggling with a concept? Try explaining it to someone else or even to a rubber duck!",
            "Your brain needs proper nutrition and hydration to perform at its best.",
            "Having trouble focusing? Try the 5-4-3-2-1 technique: notice 5 things you see, 4 things you feel, 3 things you hear, 2 things you smell, and 1 thing you taste.",
            "Remember your 'why' - connecting to your purpose can boost motivation.",
            "You've already completed several tasks today - that's progress!"
        ]
        
        response = random.choice(responses)
        
        # Simulate a delay for realism
        time.sleep(1)
        
        return JsonResponse({
            'response': response,
            'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def api_shield_data(request):
    """API endpoint to get data for the distraction shield"""
    user_profile = request.user.userprofile
    
    # Get motivational content
    motivational_content = MotivationalContent.objects.order_by('?').first()
    
    # Get user stats
    tasks_completed_today = Task.objects.filter(
        user=request.user,
        completed=True,
        created_at__date=timezone.now().date()
    ).count()
    
    focus_minutes_today = FocusSession.objects.filter(
        user=request.user,
        created_at__date=timezone.now().date()
    ).aggregate(total=Sum('duration_minutes'))['total'] or 0
    
    return JsonResponse({
        'quote': motivational_content.quote if motivational_content else "Stay focused on your goals!",
        'author': motivational_content.author if motivational_content else "NeuroBoost",
        'streak': user_profile.current_streak,
        'level': user_profile.level,
        'tasks_completed_today': tasks_completed_today,
        'focus_minutes_today': focus_minutes_today
    })


# Page Views
@login_required
def progress_tree(request):
    """View for the progress tree visualization page"""
    user_profile = request.user.userprofile
    
    context = {
        'user_profile': user_profile,
        'page': 'progress_tree'
    }
    
    return render(request, 'NeuroBoostApp/progress_tree.html', context)


@login_required
def connections(request):
    """View for the social connections page"""
    user = request.user
    user_profile = user.userprofile
    
    # Get friends (accepted friendships)
    friends = Friendship.objects.filter(
        (Q(user=user) & Q(status='accepted')) | 
        (Q(friend=user) & Q(status='accepted'))
    ).select_related('user', 'friend')
    
    # Get friend requests (pending friendships where user is the recipient)
    friend_requests = Friendship.objects.filter(
        friend=user,
        status='pending'
    ).select_related('user')
    
    # Get shared goals
    shared_goals = SharedGoal.objects.filter(
        Q(creator=user) | Q(participants=user)
    ).distinct()
    
    context = {
        'user_profile': user_profile,
        'friends': friends,
        'friend_requests': friend_requests,
        'shared_goals': shared_goals,
        'page': 'connections'
    }
    
    return render(request, 'NeuroBoostApp/connections.html', context)


@login_required
def question_center(request):
    """View for the AI-powered question center"""
    user = request.user
    user_profile = user.userprofile
    
    # Get user's syllabi
    syllabi = Syllabus.objects.filter(user=user)
    
    # Get mock tests
    mock_tests = MockTest.objects.filter(user=user)
    
    # Get flashcards - either syllabus-based or motivational
    if user_profile.is_student:
        flashcards = Flashcard.objects.filter(syllabus__user=user)
    else:
        # For non-students, show motivational flashcards
        flashcards = Flashcard.objects.filter(syllabus__isnull=True).order_by('?')[:10]
    
    context = {
        'user_profile': user_profile,
        'syllabi': syllabi,
        'mock_tests': mock_tests,
        'flashcards': flashcards,
        'page': 'question_center'
    }
    
    return render(request, 'NeuroBoostApp/question_center.html', context)


@login_required
def api_toggle_task_complete(request, task_id):
    """API endpoint to toggle task completion status"""
    try:
        task = get_object_or_404(Task, id=task_id, user=request.user)
        task.completed = not task.completed
        
        response_data = {
            'task_id': task_id,
            'completed': task.completed,
        }
        
        # If task is being marked as complete, award XP and update streak
        if task.completed:
            user_profile = request.user.userprofile
            old_level = user_profile.level
            old_streak = user_profile.current_streak
            
            # Award XP for task completion
            level_up = user_profile.gain_xp(task.xp_points)
            
            # Update streak and check for streak milestone
            streak_updated = user_profile.update_streak()
            
            # Check if streak milestone reached (every 5 days)
            streak_bonus_xp = 0
            if streak_updated and user_profile.current_streak % 5 == 0:
                streak_bonus_xp = 20  # Bonus XP for streak milestone
                user_profile.gain_xp(streak_bonus_xp)
            
            # Add XP and level data to response
            response_data.update({
                'xp_gained': task.xp_points,
                'streak_bonus_xp': streak_bonus_xp,
                'total_xp': user_profile.xp,
                'level': user_profile.level,
                'level_up': level_up,
                'streak': user_profile.current_streak,
                'streak_milestone': user_profile.current_streak > 0 and user_profile.current_streak % 5 == 0
            })
        
        task.save()
        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def api_user_xp(request):
    """API endpoint to get user XP and level data"""
    user_profile = request.user.userprofile
    xp_to_next_level = ((user_profile.level + 1) * 100) - user_profile.xp
    
    return JsonResponse({
        'xp': user_profile.xp,
        'level': user_profile.level,
        'xp_to_next_level': xp_to_next_level,
        'progress_percent': (user_profile.xp % 100) if user_profile.level > 0 else user_profile.xp
    })


@login_required
def api_user_streak(request):
    """API endpoint to get user streak data"""
    user_profile = request.user.userprofile
    
    return JsonResponse({
        'current_streak': user_profile.current_streak,
        'last_task_completed': user_profile.last_task_completed.strftime('%Y-%m-%d') if user_profile.last_task_completed else None
    })


@login_required
def api_progress(request):
    """API endpoint to get user progress data for charts"""
    user = request.user
    
    # Get task completion rate (overall)
    total_tasks = Task.objects.filter(user=user).count()
    completed_tasks = Task.objects.filter(user=user, completed=True).count()
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Get task completion rate by category
    category_stats = []
    for category, _ in Task.CATEGORY_CHOICES:
        category_total = Task.objects.filter(user=user, category=category).count()
        category_completed = Task.objects.filter(user=user, category=category, completed=True).count()
        category_rate = (category_completed / category_total * 100) if category_total > 0 else 0
        
        category_stats.append({
            'category': category,
            'total': category_total,
            'completed': category_completed,
            'completion_rate': category_rate
        })
    
    # Get focus session data for the last 7 days
    today = timezone.now().date()
    seven_days_ago = today - timedelta(days=6)
    
    # Create a date range for the last 7 days
    date_range = [(seven_days_ago + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    
    # Get focus sessions grouped by date
    focus_sessions = FocusSession.objects.filter(
        user=user,
        created_at__date__gte=seven_days_ago,
        created_at__date__lte=today
    ).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        total_minutes=Sum('duration_minutes')
    ).order_by('date')
    
    # Convert to dictionary for easy lookup
    focus_data_dict = {fs['date'].strftime('%Y-%m-%d'): fs['total_minutes'] for fs in focus_sessions}
    
    # Create the final focus data array with all 7 days
    focus_data = [{
        'date': date,
        'minutes': focus_data_dict.get(date, 0)
    } for date in date_range]
    
    # Calculate total focus hours in the last 7 days
    total_focus_minutes = sum(fs['total_minutes'] for fs in focus_sessions)
    total_focus_hours = round(total_focus_minutes / 60, 1)
    
    return JsonResponse({
        'overall_completion_rate': completion_rate,
        'category_stats': category_stats,
        'focus_data': focus_data,
        'total_focus_hours': total_focus_hours
    })


@login_required
def api_log_focus_session(request):
    """API endpoint to log a focus session"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        duration_minutes = data.get('duration_minutes')
        notes = data.get('notes', '')
        
        if not duration_minutes or not isinstance(duration_minutes, int) or duration_minutes <= 0:
            return JsonResponse({'error': 'Valid duration_minutes is required'}, status=400)
        
        # Create the focus session
        session = FocusSession.objects.create(
            user=request.user,
            duration_minutes=duration_minutes,
            notes=notes
        )
        
        # Update user's total focus time
        user_profile = request.user.userprofile
        user_profile.total_focus_time += duration_minutes
        
        # Award XP for focus sessions of 25 minutes or more
        xp_gained = 0
        level_up = False
        if duration_minutes >= 25:
            xp_gained = 15
            level_up = user_profile.gain_xp(xp_gained)
        
        user_profile.save()
        
        return JsonResponse({
            'success': True,
            'session_id': session.id,
            'duration_minutes': session.duration_minutes,
            'created_at': session.created_at.strftime('%Y-%m-%d %H:%M'),
            'xp_gained': xp_gained,
            'level_up': level_up,
            'total_focus_time': user_profile.total_focus_time
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
