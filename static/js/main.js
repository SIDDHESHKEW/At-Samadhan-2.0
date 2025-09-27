/**
 * NeuroBoost - Main JavaScript File
 * This file contains core functionality for the NeuroBoost application
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initializeXpSystem();
    initializeTaskSystem();
    initializeTimerWidget();
    initializeChatbot();
    initializeDistractionShield();
});

/**
 * XP System Functionality
 * Handles XP animations, level-ups, and related UI updates
 */
function initializeXpSystem() {
    // XP gain animation
    window.animateXpGain = function(amount) {
        // Create floating XP indicator
        const xpIndicator = document.createElement('div');
        xpIndicator.className = 'fixed text-violet-300 font-bold text-xl xp-animation';
        xpIndicator.style.left = `${Math.random() * 80 + 10}%`;
        xpIndicator.style.top = `${Math.random() * 50 + 25}%`;
        xpIndicator.textContent = `+${amount} XP`;
        document.body.appendChild(xpIndicator);
        
        // Remove after animation completes
        setTimeout(() => {
            xpIndicator.remove();
        }, 1000);
        
        // Update XP in UI if elements exist
        const currentXpElement = document.getElementById('current-xp');
        const xpBarElement = document.getElementById('xp-bar');
        const xpNeededElement = document.getElementById('xp-needed');
        const currentLevelElement = document.getElementById('current-level');
        
        if (currentXpElement) {
            // Get current values
            let currentXp = parseInt(currentXpElement.textContent);
            let currentLevel = parseInt(currentLevelElement.textContent);
            
            // Calculate new values
            currentXp += amount;
            const newLevel = Math.floor(currentXp / 100) + 1;
            const xpToNextLevel = (newLevel * 100) - currentXp;
            
            // Update UI
            currentXpElement.textContent = currentXp;
            
            // Calculate progress percentage
            const progressPercent = (currentXp % 100);
            if (xpBarElement) {
                xpBarElement.style.width = `${progressPercent}%`;
            }
            
            if (xpNeededElement) {
                xpNeededElement.textContent = `${xpToNextLevel} to next level`;
            }
            
            // Check for level up
            if (newLevel > currentLevel) {
                currentLevelElement.textContent = newLevel;
                currentLevelElement.classList.add('level-up');
                
                // Show level up message
                showNotification(`Level Up! You're now level ${newLevel}!`, 'success');
                
                // Remove animation class after it completes
                setTimeout(() => {
                    currentLevelElement.classList.remove('level-up');
                }, 1000);
            }
        }
    };
}

/**
 * Task System Functionality
 * Handles task creation, completion, and UI updates
 */
function initializeTaskSystem() {
    // Task completion toggle
    const taskCheckboxes = document.querySelectorAll('.task-checkbox');
    taskCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = this.dataset.taskId;
            const taskItem = document.getElementById(`task-${taskId}`);
            const taskTitle = document.getElementById(`task-title-${taskId}`);
            
            if (this.checked) {
                // Mark as completed
                taskItem.classList.add('completed');
                taskTitle.classList.add('completed');
                
                // Determine XP gain based on task category
                const category = this.dataset.category;
                const xpGain = category === 'Study' ? 10 : 5;
                
                // Animate XP gain
                window.animateXpGain(xpGain);
                
                // Send completion to server
                completeTask(taskId);
            } else {
                // Mark as incomplete
                taskItem.classList.remove('completed');
                taskTitle.classList.remove('completed');
                
                // Send to server
                uncompleteTask(taskId);
            }
        });
    });
    
    // Task form submission
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', function(e) {
            // Form submission is handled by Django
            // This is just for any additional client-side logic
            console.log('Task form submitted');
        });
    }
}

/**
 * Timer Widget Functionality
 * Handles focus timer operations and session logging
 */
function initializeTimerWidget() {
    // Most timer functionality is in base.html
    // This is for additional features
    
    // Log completed session to backend
    window.logFocusSession = function(minutes) {
        // Create the data to send
        const sessionData = {
            duration_minutes: minutes,
            completed: true
        };
        
        // Send to backend
        fetch('/api/focus-session/log/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(sessionData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Session logged:', data);
            
            // If session was ≥ 25 minutes, award XP
            if (minutes >= 25) {
                window.animateXpGain(15);
                showNotification('Focus session complete! +15 XP', 'success');
            }
        })
        .catch(error => {
            console.error('Error logging session:', error);
        });
    };
}

/**
 * Chatbot Functionality
 * Handles chatbot interactions and API calls
 */
function initializeChatbot() {
    const chatbotForm = document.getElementById('chatbot-form');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessages = document.getElementById('chatbot-messages');
    
    if (chatbotForm) {
        chatbotForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const message = chatbotInput.value.trim();
            
            if (message) {
                // Add user message to chat
                addChatMessage(message, 'user');
                chatbotInput.value = '';
                
                // Show typing indicator
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'flex items-start message-animation';
                typingIndicator.id = 'typing-indicator';
                typingIndicator.innerHTML = `
                    <div class="flex-shrink-0 bg-violet-500 h-8 w-8 rounded-full flex items-center justify-center">
                        <span class="text-white font-bold">N</span>
                    </div>
                    <div class="ml-3 bg-slate-700 rounded-lg py-2 px-3 max-w-[80%]">
                        <p class="text-sm text-white">Typing<span class="typing-dots">...</span></p>
                    </div>
                `;
                chatbotMessages.appendChild(typingIndicator);
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
                
                // Animate typing dots
                const typingDots = document.querySelector('.typing-dots');
                let dotCount = 3;
                const typingAnimation = setInterval(() => {
                    typingDots.textContent = '.'.repeat(dotCount);
                    dotCount = (dotCount % 3) + 1;
                }, 500);
                
                // Send to backend API
                fetch('/api/chatbot/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({ message: message })
                })
                .then(response => response.json())
                .then(data => {
                    // Remove typing indicator
                    clearInterval(typingAnimation);
                    document.getElementById('typing-indicator').remove();
                    
                    // Add bot response
                    addChatMessage(data.response, 'bot');
                })
                .catch(error => {
                    // Remove typing indicator
                    clearInterval(typingAnimation);
                    if (document.getElementById('typing-indicator')) {
                        document.getElementById('typing-indicator').remove();
                    }
                    
                    // Show error message
                    addChatMessage("Sorry, I'm having trouble connecting right now. Please try again later.", 'bot');
                    console.error('Chatbot error:', error);
                });
            }
        });
    }
    
    // Function to add chat messages
    function addChatMessage(message, sender) {
        if (!chatbotMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start message-animation';
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="ml-auto bg-violet-600 rounded-lg py-2 px-3 max-w-[80%]">
                    <p class="text-sm text-white">${message}</p>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="flex-shrink-0 bg-violet-500 h-8 w-8 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold">N</span>
                </div>
                <div class="ml-3 bg-slate-700 rounded-lg py-2 px-3 max-w-[80%]">
                    <p class="text-sm text-white">${message}</p>
                </div>
            `;
        }
        
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
}

/**
 * Distraction Shield Functionality
 * Handles the distraction blocking overlay
 */
function initializeDistractionShield() {
    const shieldContinueBtn = document.getElementById('shield-continue');
    const shieldReturnBtn = document.getElementById('shield-return');
    const distractionShield = document.getElementById('distraction-shield');
    
    if (shieldContinueBtn && shieldReturnBtn && distractionShield) {
        // Continue button - close shield
        shieldContinueBtn.addEventListener('click', function() {
            distractionShield.classList.add('hidden');
        });
        
        // Return button - close shield
        shieldReturnBtn.addEventListener('click', function() {
            distractionShield.classList.add('hidden');
        });
    }
    
    // Function to show distraction shield
    window.showDistractionShield = function() {
        if (distractionShield) {
            // Fetch latest data from backend
            fetch('/api/shield-data/')
                .then(response => response.json())
                .then(data => {
                    // Update shield data
                    document.getElementById('shield-streak').textContent = `${data.streak} days`;
                    document.getElementById('shield-focus-time').textContent = data.focus_time;
                    document.getElementById('shield-motivation').textContent = `"${data.motivation}"`;
                    
                    // Show shield
                    distractionShield.classList.remove('hidden');
                })
                .catch(error => {
                    console.error('Error fetching shield data:', error);
                    // Show shield with default data
                    distractionShield.classList.remove('hidden');
                });
        }
    };
}

/**
 * Utility Functions
 */

// Get CSRF token from cookies
function getCsrfToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue;
}

// Send task completion to server
function completeTask(taskId) {
    fetch(`/complete/${taskId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Task completed:', data);
        
        // Update task counters if they exist
        const tasksCompletedElement = document.getElementById('tasks-completed');
        if (tasksCompletedElement) {
            const [completed, total] = tasksCompletedElement.textContent.split('/');
            tasksCompletedElement.textContent = `${parseInt(completed) + 1}/${total}`;
        }
    })
    .catch(error => {
        console.error('Error completing task:', error);
    });
}

// Send task un-completion to server
function uncompleteTask(taskId) {
    fetch(`/complete/${taskId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: false })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Task uncompleted:', data);
        
        // Update task counters if they exist
        const tasksCompletedElement = document.getElementById('tasks-completed');
        if (tasksCompletedElement) {
            const [completed, total] = tasksCompletedElement.textContent.split('/');
            tasksCompletedElement.textContent = `${Math.max(0, parseInt(completed) - 1)}/${total}`;
        }
    })
    .catch(error => {
        console.error('Error uncompleting task:', error);
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 fade-in`;
    
    // Set style based on type
    switch (type) {
        case 'success':
            notification.classList.add('bg-emerald-500', 'text-white');
            break;
        case 'warning':
            notification.classList.add('bg-amber-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        default:
            notification.classList.add('bg-sky-500', 'text-white');
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <span class="font-medium">${message}</span>
            <button class="ml-4 text-white hover:text-slate-200" onclick="this.parentElement.parentElement.remove()">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}