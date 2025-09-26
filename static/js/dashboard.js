/**
 * NeuroBoost - Dashboard
 * Handles to-do list, progress tracker, XP system, and streak functionality
 */

// Initialize dashboard features when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize to-do list if it exists
    if (document.getElementById('task-list')) {
        initializeTaskList();
    }
    
    // Initialize progress tracker if it exists
    if (document.getElementById('progress-tracker')) {
        initializeProgressTracker();
    }
    
    // Initialize XP display if it exists
    if (document.getElementById('xp-display')) {
        initializeXPDisplay();
    }
    
    // Initialize streak tracker if it exists
    if (document.getElementById('streak-tracker')) {
        initializeStreakTracker();
    }
});

/**
 * Initialize task list functionality
 */
function initializeTaskList() {
    const taskList = document.getElementById('task-list');
    const taskForm = document.getElementById('task-form');
    const incompleteTasksSection = document.getElementById('incomplete-tasks');
    
    // Handle task form submission
    if (taskForm) {
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(taskForm);
            
            // Show loading state
            const submitButton = taskForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="animate-pulse">Adding...</div>';
            
            // Submit form data
            fetch('/api/tasks/create/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Could not create task');
                    });
                }
                return response.json();
            })
            .then(data => {
                // Add new task to list
                addTaskToList(data.task);
                
                // Reset form
                taskForm.reset();
                
                // Reset button
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                
                // Show success message
                showNotification('Task added successfully!', 'success');
                
                // Update incomplete tasks section
                updateIncompleteTasks();
            })
            .catch(error => {
                showNotification(error.message || 'An error occurred', 'error');
                
                // Reset button
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            });
        });
    }
    
    // Handle task completion toggle
    taskList.addEventListener('click', function(e) {
        if (e.target.classList.contains('task-checkbox') || e.target.closest('.task-checkbox')) {
            const checkbox = e.target.classList.contains('task-checkbox') ? e.target : e.target.closest('.task-checkbox');
            const taskItem = checkbox.closest('.task-item');
            const taskId = taskItem.dataset.taskId;
            const isCompleted = checkbox.classList.contains('checked');
            
            // Toggle completion status
            toggleTaskCompletion(taskId, !isCompleted, taskItem);
        }
    });
    
    // Load initial tasks
    loadTasks();
}

/**
 * Load tasks from the server
 */
function loadTasks() {
    const taskList = document.getElementById('task-list');
    
    // Show loading state
    taskList.innerHTML = '<div class="text-center py-4"><div class="animate-pulse">Loading tasks...</div></div>';
    
    // Fetch tasks
    fetch('/api/tasks/')
        .then(response => response.json())
        .then(data => {
            // Clear loading state
            taskList.innerHTML = '';
            
            if (data.tasks.length === 0) {
                taskList.innerHTML = '<div class="text-center text-slate-400 py-4">No tasks yet. Add some tasks to get started!</div>';
                return;
            }
            
            // Add tasks to list
            data.tasks.forEach(task => {
                addTaskToList(task);
            });
            
            // Update incomplete tasks section
            updateIncompleteTasks();
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            taskList.innerHTML = '<div class="text-center text-slate-400 py-4">Could not load tasks. Please try again.</div>';
        });
}

/**
 * Add a task to the task list
 * @param {Object} task - Task object
 */
function addTaskToList(task) {
    const taskList = document.getElementById('task-list');
    
    // Create task item
    const taskItem = document.createElement('div');
    taskItem.className = `task-item flex items-center justify-between p-3 ${task.completed ? 'bg-slate-800/50' : 'bg-slate-800'} rounded-lg mb-2 hover:bg-slate-700 transition-colors animate-fade-in`;
    taskItem.dataset.taskId = task.id;
    taskItem.dataset.category = task.category;
    taskItem.dataset.completed = task.completed;
    taskItem.dataset.xpPoints = task.xp_points;
    
    // Format deadline if available
    let deadlineStr = '';
    if (task.deadline) {
        const deadline = new Date(task.deadline);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (deadline.toDateString() === today.toDateString()) {
            deadlineStr = 'Today';
        } else if (deadline.toDateString() === tomorrow.toDateString()) {
            deadlineStr = 'Tomorrow';
        } else {
            deadlineStr = deadline.toLocaleDateString();
        }
    }
    
    // Set task item content
    taskItem.innerHTML = `
        <div class="flex items-center">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}">
                <svg class="w-5 h-5 ${task.completed ? 'opacity-100' : 'opacity-0'}" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
            </div>
            <div class="ml-3 ${task.completed ? 'line-through text-slate-400' : ''}">
                <div class="font-medium">${task.title}</div>
                ${task.description ? `<div class="text-sm text-slate-400">${task.description}</div>` : ''}
            </div>
        </div>
        <div class="flex items-center">
            ${deadlineStr ? `<div class="text-xs ${isDeadlineSoon(task.deadline) ? 'text-amber-400' : 'text-slate-400'} mr-3">${deadlineStr}</div>` : ''}
            <div class="task-category px-2 py-1 rounded text-xs ${task.category === 'Study' ? 'bg-violet-600/20 text-violet-400' : 'bg-emerald-600/20 text-emerald-400'}">
                ${task.category}
            </div>
            <div class="ml-2 text-xs text-amber-400 font-semibold">+${task.xp_points} XP</div>
        </div>
    `;
    
    // Add task to list (completed tasks at the bottom)
    if (task.completed) {
        taskList.appendChild(taskItem);
    } else {
        taskList.insertBefore(taskItem, taskList.firstChild);
    }
}

/**
 * Toggle task completion status
 * @param {string} taskId - Task ID
 * @param {boolean} completed - New completion status
 * @param {HTMLElement} taskItem - Task item element
 */
function toggleTaskCompletion(taskId, completed, taskItem) {
    // Update UI immediately for better UX
    const checkbox = taskItem.querySelector('.task-checkbox');
    const checkmark = checkbox.querySelector('svg');
    const taskText = taskItem.querySelector('.ml-3');
    
    if (completed) {
        checkbox.classList.add('checked');
        checkmark.classList.remove('opacity-0');
        checkmark.classList.add('opacity-100');
        taskText.classList.add('line-through', 'text-slate-400');
        taskItem.classList.add('bg-slate-800/50');
        taskItem.classList.remove('bg-slate-800');
    } else {
        checkbox.classList.remove('checked');
        checkmark.classList.remove('opacity-100');
        checkmark.classList.add('opacity-0');
        taskText.classList.remove('line-through', 'text-slate-400');
        taskItem.classList.remove('bg-slate-800/50');
        taskItem.classList.add('bg-slate-800');
    }
    
    // Update task completion status on server
    fetch(`/api/tasks/${taskId}/toggle-complete/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ completed: completed })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not update task');
            });
        }
        return response.json();
    })
    .then(data => {
        // Update task item dataset
        taskItem.dataset.completed = completed;
        
        // Show XP notification if task was completed
        if (completed && data.xp_gained) {
            // Animate XP gain
            animateXpGain(data.xp_gained);
            
            // Update XP display
            updateXPDisplay(data.new_xp, data.new_level, data.xp_to_next_level);
            
            // Check for level up
            if (data.leveled_up) {
                showLevelUpNotification(data.new_level);
            }
        }
        
        // Update streak if changed
        if (data.streak_updated) {
            updateStreakDisplay(data.current_streak, data.streak_active);
            
            // Show streak notification if increased
            if (data.streak_increased) {
                showStreakNotification(data.current_streak, data.streak_xp_gained);
            }
        }
        
        // Reorder task in list (completed tasks at the bottom)
        if (completed) {
            document.getElementById('task-list').appendChild(taskItem);
        } else {
            document.getElementById('task-list').insertBefore(taskItem, document.getElementById('task-list').firstChild);
        }
        
        // Update incomplete tasks section
        updateIncompleteTasks();
        
        // Update progress tracker
        updateProgressTracker();
    })
    .catch(error => {
        console.error('Error updating task:', error);
        
        // Revert UI changes
        if (completed) {
            checkbox.classList.remove('checked');
            checkmark.classList.remove('opacity-100');
            checkmark.classList.add('opacity-0');
            taskText.classList.remove('line-through', 'text-slate-400');
            taskItem.classList.remove('bg-slate-800/50');
            taskItem.classList.add('bg-slate-800');
        } else {
            checkbox.classList.add('checked');
            checkmark.classList.remove('opacity-0');
            checkmark.classList.add('opacity-100');
            taskText.classList.add('line-through', 'text-slate-400');
            taskItem.classList.add('bg-slate-800/50');
            taskItem.classList.remove('bg-slate-800');
        }
        
        showNotification(error.message || 'Could not update task', 'error');
    });
}

/**
 * Update incomplete tasks section
 */
function updateIncompleteTasks() {
    const incompleteTasksSection = document.getElementById('incomplete-tasks');
    if (!incompleteTasksSection) return;
    
    // Get all incomplete tasks
    const incompleteTasks = Array.from(document.querySelectorAll('.task-item[data-completed="false"]'));
    
    // Update section content
    if (incompleteTasks.length === 0) {
        incompleteTasksSection.innerHTML = '<div class="text-center text-slate-400 py-4">No incomplete tasks. Great job!</div>';
    } else {
        // Group tasks by category
        const studyTasks = incompleteTasks.filter(task => task.dataset.category === 'Study');
        const generalTasks = incompleteTasks.filter(task => task.dataset.category === 'General');
        
        // Create summary
        incompleteTasksSection.innerHTML = `
            <h3 class="text-lg font-semibold mb-3">Incomplete Tasks</h3>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-800 rounded-lg p-3">
                    <div class="text-sm text-violet-400 font-medium mb-1">Study Tasks</div>
                    <div class="text-2xl font-bold">${studyTasks.length}</div>
                    <div class="text-xs text-slate-400">${studyTasks.length * 10} XP potential</div>
                </div>
                <div class="bg-slate-800 rounded-lg p-3">
                    <div class="text-sm text-emerald-400 font-medium mb-1">General Tasks</div>
                    <div class="text-2xl font-bold">${generalTasks.length}</div>
                    <div class="text-xs text-slate-400">${generalTasks.length * 5} XP potential</div>
                </div>
            </div>
        `;
    }
}

/**
 * Initialize progress tracker
 */
function initializeProgressTracker() {
    // Load initial progress data
    updateProgressTracker();
}

/**
 * Update progress tracker with latest data
 */
function updateProgressTracker() {
    const progressTracker = document.getElementById('progress-tracker');
    if (!progressTracker) return;
    
    // Fetch progress data
    fetch('/api/progress/')
        .then(response => response.json())
        .then(data => {
            // Create charts and visualizations
            createCompletionChart(data.completion_rate, progressTracker);
            createFocusTimeChart(data.focus_sessions, progressTracker);
        })
        .catch(error => {
            console.error('Error loading progress data:', error);
            progressTracker.innerHTML = '<div class="text-center text-slate-400 py-4">Could not load progress data. Please try again.</div>';
        });
}

/**
 * Create task completion rate chart
 * @param {Object} data - Completion rate data
 * @param {HTMLElement} container - Container element
 */
function createCompletionChart(data, container) {
    // Find or create chart container
    let chartContainer = container.querySelector('.completion-chart');
    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.className = 'completion-chart bg-slate-800 rounded-lg p-4 shadow-md';
        container.appendChild(chartContainer);
    }
    
    // Set chart content
    chartContainer.innerHTML = `
        <h3 class="text-lg font-semibold mb-3">Task Completion Rate</h3>
        <div class="flex items-end space-x-2">
            <div class="flex-1">
                <canvas id="completion-chart-canvas" height="200"></canvas>
            </div>
            <div class="w-24 text-center">
                <div class="text-3xl font-bold">${data.overall_rate}%</div>
                <div class="text-xs text-slate-400">Overall</div>
            </div>
        </div>
    `;
    
    // Create chart
    const ctx = document.getElementById('completion-chart-canvas').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Completion Rate (%)',
                data: data.values,
                backgroundColor: [  
                    'rgba(167, 139, 250, 0.7)', // violet
                    'rgba(16, 185, 129, 0.7)'   // emerald
                ],
                borderColor: [
                    'rgb(167, 139, 250)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Create focus time chart
 * @param {Object} data - Focus session data
 * @param {HTMLElement} container - Container element
 */
function createFocusTimeChart(data, container) {
    // Find or create chart container
    let chartContainer = container.querySelector('.focus-time-chart');
    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.className = 'focus-time-chart bg-slate-800 rounded-lg p-4 shadow-md mt-4';
        container.appendChild(chartContainer);
    }
    
    // Set chart content
    chartContainer.innerHTML = `
        <h3 class="text-lg font-semibold mb-3">Focus Time</h3>
        <div class="flex items-end space-x-2">
            <div class="flex-1">
                <canvas id="focus-time-chart-canvas" height="200"></canvas>
            </div>
            <div class="w-24 text-center">
                <div class="text-3xl font-bold">${data.total_hours}</div>
                <div class="text-xs text-slate-400">Hours</div>
            </div>
        </div>
    `;
    
    // Create chart
    const ctx = document.getElementById('focus-time-chart-canvas').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Focus Time (minutes)',
                data: data.values,
                backgroundColor: 'rgba(167, 139, 250, 0.2)',
                borderColor: 'rgb(167, 139, 250)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Initialize XP display
 */
function initializeXPDisplay() {
    const xpDisplay = document.getElementById('xp-display');
    if (!xpDisplay) return;
    
    // Load initial XP data
    fetch('/api/user/xp/')
        .then(response => response.json())
        .then(data => {
            updateXPDisplay(data.xp, data.level, data.xp_to_next_level);
        })
        .catch(error => {
            console.error('Error loading XP data:', error);
        });
}

/**
 * Update XP display with new values
 * @param {number} xp - Current XP
 * @param {number} level - Current level
 * @param {number} xpToNextLevel - XP needed for next level
 */
function updateXPDisplay(xp, level, xpToNextLevel) {
    const xpDisplay = document.getElementById('xp-display');
    if (!xpDisplay) return;
    
    const levelElement = xpDisplay.querySelector('.level-value');
    const xpElement = xpDisplay.querySelector('.xp-value');
    const xpProgressBar = xpDisplay.querySelector('.xp-progress-bar');
    const xpToNextElement = xpDisplay.querySelector('.xp-to-next');
    
    if (levelElement) levelElement.textContent = level;
    if (xpElement) xpElement.textContent = xp;
    
    if (xpProgressBar) {
        // Calculate progress percentage
        const xpForCurrentLevel = level * 100;
        const xpProgress = xp - xpForCurrentLevel;
        const progressPercent = Math.min(100, Math.max(0, (xpProgress / 100) * 100));
        
        // Update progress bar
        xpProgressBar.style.width = `${progressPercent}%`;
    }
    
    if (xpToNextElement) xpToNextElement.textContent = xpToNextLevel;
}

/**
 * Initialize streak tracker
 */
function initializeStreakTracker() {
    const streakTracker = document.getElementById('streak-tracker');
    if (!streakTracker) return;
    
    // Load initial streak data
    fetch('/api/user/streak/')
        .then(response => response.json())
        .then(data => {
            updateStreakDisplay(data.current_streak, data.streak_active);
        })
        .catch(error => {
            console.error('Error loading streak data:', error);
        });
}

/**
 * Update streak display with new values
 * @param {number} streak - Current streak days
 * @param {boolean} isActive - Whether streak is active today
 */
function updateStreakDisplay(streak, isActive) {
    const streakTracker = document.getElementById('streak-tracker');
    if (!streakTracker) return;
    
    const streakValue = streakTracker.querySelector('.streak-value');
    const streakCard = streakTracker.querySelector('.streak-card');
    
    if (streakValue) streakValue.textContent = streak;
    
    if (streakCard) {
        if (isActive) {
            streakCard.classList.add('active-streak');
        } else {
            streakCard.classList.remove('active-streak');
        }
    }
}

/**
 * Show level up notification
 * @param {number} newLevel - New level achieved
 */
function showLevelUpNotification(newLevel) {
    // Create level up element
    const levelUp = document.createElement('div');
    levelUp.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-violet-900 bg-opacity-90 text-white p-6 rounded-lg shadow-lg z-50 text-center animate-level-up';
    levelUp.innerHTML = `
        <div class="text-3xl font-bold mb-2">Level Up!</div>
        <div class="text-5xl font-bold text-amber-400 mb-4">${newLevel}</div>
        <div class="text-sm">Keep up the great work!</div>
    `;
    
    // Add to body
    document.body.appendChild(levelUp);
    
    // Remove after animation completes
    setTimeout(() => {
        levelUp.remove();
    }, 3000);
}

/**
 * Show streak notification
 * @param {number} streak - Current streak days
 * @param {number} xpGained - XP gained from streak
 */
function showStreakNotification(streak, xpGained) {
    // Create streak notification element
    const streakNotification = document.createElement('div');
    streakNotification.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-900 bg-opacity-90 text-white p-6 rounded-lg shadow-lg z-50 text-center animate-fade-in';
    streakNotification.innerHTML = `
        <div class="text-xl font-bold mb-2">${streak} Day Streak!</div>
        <div class="text-3xl font-bold text-amber-400 mb-4">+${xpGained} XP</div>
        <div class="text-sm">Come back tomorrow to continue your streak!</div>
    `;
    
    // Add to body
    document.body.appendChild(streakNotification);
    
    // Remove after delay
    setTimeout(() => {
        streakNotification.classList.add('animate-fade-out');
        setTimeout(() => {
            streakNotification.remove();
        }, 500);
    }, 3000);
}

/**
 * Animate XP gain
 * @param {number} xp - Amount of XP gained
 */
function animateXpGain(xp) {
    // Create XP gain element
    const xpGain = document.createElement('div');
    xpGain.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-violet-400 animate-xp-gain z-50';
    xpGain.textContent = `+${xp} XP`;
    
    // Add to body
    document.body.appendChild(xpGain);
    
    // Remove after animation completes
    setTimeout(() => {
        xpGain.remove();
    }, 2000);
}

/**
 * Check if deadline is soon (today or tomorrow)
 * @param {string} deadlineStr - Deadline date string
 * @returns {boolean} Whether deadline is soon
 */
function isDeadlineSoon(deadlineStr) {
    if (!deadlineStr) return false;
    
    const deadline = new Date(deadlineStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return deadline.toDateString() === today.toDateString() || 
           deadline.toDateString() === tomorrow.toDateString();
}

/**
 * Get CSRF token from cookies
 * @returns {string} CSRF token
 */
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Show a notification message
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification p-3 rounded-lg shadow-lg max-w-xs transform transition-all duration-300 translate-x-full`;
    
    // Set background color based on type
    if (type === 'success') {
        notification.classList.add('bg-emerald-600', 'text-white');
    } else if (type === 'error') {
        notification.classList.add('bg-red-600', 'text-white');
    } else {
        notification.classList.add('bg-slate-700', 'text-white');
    }
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <div>${message}</div>
            <button class="ml-2 text-white hover:text-slate-200 close-notification">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 10);
    
    // Set up close button
    notification.querySelector('.close-notification').addEventListener('click', function() {
        closeNotification(notification);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        closeNotification(notification);
    }, 5000);
}

/**
 * Close a notification
 * @param {HTMLElement} notification - Notification element
 */
function closeNotification(notification) {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
        notification.remove();
    }, 300);
}