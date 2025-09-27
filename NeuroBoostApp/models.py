from django.db import models
from django.contrib.auth.models import User
import math 
from datetime import date, datetime, timedelta
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

# Our Task model to store all to-do items.
class Task(models.Model):
    # A ForeignKey is a link to another table. This links each task to a specific User.
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    # Added CHOICES for better category management
    CATEGORY_CHOICES = [
        ('Study', 'Study'),
        ('General', 'General'),
    ]
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='General')
    description = models.TextField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(null=True, blank=True)
    # XP points earned for this task.
    xp_points = models.IntegerField(default=0)

    # Set XP points based on category upon creation
    def save(self, *args, **kwargs):
        if self.category == 'Study':
            self.xp_points = 10
        else:
            self.xp_points = 5
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

# The UserProfile model to store gamification data.
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    current_streak = models.IntegerField(default=0)
    last_task_completed = models.DateField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    is_student = models.BooleanField(default=True)
    total_focus_time = models.IntegerField(default=0)  # Total minutes spent in focus sessions

    # Helper method to calculate level from XP
    def calculate_level(self):
        # Level = floor(XP / 100) + 1 (Start at level 1)
        return math.floor(self.xp / 100) + 1

    # Method to handle XP gain and level updates
    def gain_xp(self, amount, source='task_completion', description=''):
        self.xp += amount
        new_level = self.calculate_level()
        
        level_up = False
        if new_level > self.level:
            self.level = new_level
            level_up = True # Track if a level up occurred
            
        self.save()
        
        # Create XP history entry
        XPHistory.objects.create(
            user=self.user,
            amount=amount,
            source=source,
            description=description
        )
        
        return level_up # Return status for potential notification
    
    # NEW: Method to update streak
    def update_streak(self):
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        streak_changed = False

        if self.last_task_completed is None:
            # First task ever completed
            self.current_streak = 1
            streak_changed = True
        elif self.last_task_completed == yesterday:
            # Completed task yesterday, so streak continues
            self.current_streak += 1
            streak_changed = True
        elif self.last_task_completed < yesterday:
            # Day missed, reset streak, or start new streak if it was more than 1 day ago
            self.current_streak = 1
            streak_changed = True
        # If last_task_completed == today, the streak count doesn't change, but we update the date

        # Always update the last task date to today
        self.last_task_completed = today
        self.save()
        return streak_changed

    def __str__(self):
        return f'{self.user.username} Profile (Level {self.level})'


# Create UserProfile automatically when a User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.userprofile.save()


# Model to track focus sessions
class FocusSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)  # Duration in minutes
    created_at = models.DateTimeField(auto_now_add=True)
    xp_awarded = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    
    def save(self, *args, **kwargs):
        # Calculate duration if not set
        if not self.duration_minutes and self.start_time and self.end_time:
            delta = self.end_time - self.start_time
            self.duration_minutes = delta.seconds // 60
        
        # Award XP for sessions 25 minutes or longer
        if self.duration_minutes >= 25 and self.xp_awarded == 0:
            self.xp_awarded = 15
            
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f'{self.user.username} - {self.duration_minutes} minutes on {self.created_at.date()}'


# Model for friend connections
class Friendship(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    sender = models.ForeignKey(User, related_name='friendship_requests_sent', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='friendship_requests_received', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('sender', 'receiver')
    
    def __str__(self):
        return f'{self.sender.username} -> {self.receiver.username} ({self.status})'


# Model for shared goals between friends
class SharedGoal(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, related_name='goals_created', on_delete=models.CASCADE)
    participants = models.ManyToManyField(User, related_name='shared_goals')
    completed = models.BooleanField(default=False)
    deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    xp_reward = models.IntegerField(default=30)  # Bonus XP for completing shared goal
    
    def __str__(self):
        return self.title


# Model for chat messages between friends
class ChatMessage(models.Model):
    sender = models.ForeignKey(User, related_name='messages_sent', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='messages_received', on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f'{self.sender.username} to {self.receiver.username}: {self.content[:20]}...'


# Model for student syllabus registration
class Syllabus(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    subject = models.CharField(max_length=100)
    description = models.TextField()
    goal = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f'{self.subject} - {self.user.username}'


# Model for AI-generated MCQs
class MCQuestion(models.Model):
    syllabus = models.ForeignKey(Syllabus, on_delete=models.CASCADE, null=True, blank=True)
    question = models.TextField()
    option_a = models.CharField(max_length=200)
    option_b = models.CharField(max_length=200)
    option_c = models.CharField(max_length=200)
    option_d = models.CharField(max_length=200)
    correct_option = models.CharField(max_length=1, choices=[
        ('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')
    ])
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=[
        ('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')
    ], default='medium')
    is_general_knowledge = models.BooleanField(default=False)  # For non-student users
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.question[:50]


# Model for mock tests
class MockTest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    syllabus = models.ForeignKey(Syllabus, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=200)
    questions = models.ManyToManyField(MCQuestion)
    duration = models.IntegerField(default=30)  # Duration in minutes
    created_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)
    score = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return f'{self.title} - {self.user.username}'


# Model for flashcards
class Flashcard(models.Model):
    syllabus = models.ForeignKey(Syllabus, on_delete=models.CASCADE, null=True, blank=True)
    front = models.TextField()  # Question or term
    back = models.TextField()   # Answer or definition
    is_motivational = models.BooleanField(default=False)  # For non-student users
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.front[:50]


# Model for distraction shield motivational content
class MotivationalContent(models.Model):
    content_type = models.CharField(max_length=20, choices=[
        ('quote', 'Quote'), ('fact', 'Fact'), ('tip', 'Productivity Tip')
    ])
    content = models.TextField()
    author = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f'{self.content_type}: {self.content[:50]}...'


# Model to track XP history for analytics
class XPHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.IntegerField()  # XP gained or lost
    source = models.CharField(max_length=50)  # 'task_completion', 'focus_session', 'streak_bonus', etc.
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f'{self.user.username}: +{self.amount} XP from {self.source}'