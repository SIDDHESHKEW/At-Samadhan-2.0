/**
 * NeuroBoost - Social Features
 * Handles chat, friends, leaderboard, and shared goals functionality
 * Uses WebSockets for real-time chat via Django Channels
 */

// Initialize social features when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize chat if on the connections page
    if (document.getElementById('chat-container')) {
        initializeChat();
    }
    
    // Initialize friends list if present
    if (document.getElementById('friends-list')) {
        initializeFriendsList();
    }
    
    // Initialize leaderboard if present
    if (document.getElementById('leaderboard-container')) {
        initializeLeaderboard();
    }
    
    // Initialize shared goals if present
    if (document.getElementById('shared-goals-container')) {
        initializeSharedGoals();
    }
});

/**
 * Initialize WebSocket connection for chat
 */
function initializeChat() {
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const activeChatId = chatContainer.dataset.chatId;
    
    if (!activeChatId) {
        console.error('No active chat ID found');
        return;
    }
    
    // Create WebSocket connection
    const chatSocket = new WebSocket(
        'ws://' + window.location.host + '/ws/chat/' + activeChatId + '/'
    );
    
    // Handle incoming messages
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        addMessageToChat(data.message, data.username, data.timestamp, data.is_self);
        
        // Scroll to bottom of chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    
    // Handle connection close
    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
        
        // Add system message
        const systemMessage = document.createElement('div');
        systemMessage.className = 'text-center text-slate-400 text-xs py-2';
        systemMessage.textContent = 'Connection lost. Please refresh the page.';
        chatMessages.appendChild(systemMessage);
    };
    
    // Handle send button click
    sendButton.addEventListener('click', function() {
        sendChatMessage(chatSocket, messageInput);
    });
    
    // Handle enter key press
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage(chatSocket, messageInput);
        }
    });
    
    // Load previous messages
    loadPreviousMessages(activeChatId);
}

/**
 * Send a chat message via WebSocket
 * @param {WebSocket} socket - WebSocket connection
 * @param {HTMLElement} inputElement - Message input element
 */
function sendChatMessage(socket, inputElement) {
    const message = inputElement.value.trim();
    
    if (message) {
        // Send message to server
        socket.send(JSON.stringify({
            'message': message
        }));
        
        // Clear input
        inputElement.value = '';
    }
}

/**
 * Add a message to the chat display
 * @param {string} message - Message text
 * @param {string} username - Sender's username
 * @param {string} timestamp - Message timestamp
 * @param {boolean} isSelf - Whether the message is from the current user
 */
function addMessageToChat(message, username, timestamp, isSelf) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    
    // Format timestamp
    const formattedTime = formatChatTimestamp(timestamp);
    
    // Set classes based on sender
    if (isSelf) {
        messageElement.className = 'chat-message chat-message-self flex flex-col items-end mb-4 animate-message-pop';
        messageElement.innerHTML = `
            <div class="bg-violet-600 text-white rounded-lg py-2 px-4 max-w-xs break-words shadow-md">
                ${message}
            </div>
            <div class="text-xs text-slate-400 mt-1">${formattedTime}</div>
        `;
    } else {
        messageElement.className = 'chat-message chat-message-other flex flex-col items-start mb-4 animate-message-pop';
        messageElement.innerHTML = `
            <div class="font-medium text-sm text-slate-400">${username}</div>
            <div class="bg-slate-700 text-white rounded-lg py-2 px-4 max-w-xs break-words shadow-md">
                ${message}
            </div>
            <div class="text-xs text-slate-400 mt-1">${formattedTime}</div>
        `;
    }
    
    chatMessages.appendChild(messageElement);
}

/**
 * Format chat timestamp
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted time string
 */
function formatChatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    // Format time
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // If today, just show time, otherwise show date and time
    if (isToday) {
        return formattedTime;
    } else {
        return `${date.toLocaleDateString()} ${formattedTime}`;
    }
}

/**
 * Load previous messages for a chat
 * @param {string} chatId - Chat ID
 */
function loadPreviousMessages(chatId) {
    fetch(`/api/chat/${chatId}/history/`)
        .then(response => response.json())
        .then(data => {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = ''; // Clear loading state
            
            // Add messages in order
            data.messages.forEach(msg => {
                addMessageToChat(
                    msg.content,
                    msg.sender_name,
                    msg.timestamp,
                    msg.is_self
                );
            });
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = '<div class="text-center text-slate-400 py-4">Could not load messages. Please try again.</div>';
        });
}

/**
 * Initialize friends list functionality
 */
function initializeFriendsList() {
    const addFriendForm = document.getElementById('add-friend-form');
    const friendsList = document.getElementById('friends-list');
    
    // Handle add friend form submission
    if (addFriendForm) {
        addFriendForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usernameInput = addFriendForm.querySelector('input[name="username"]');
            const username = usernameInput.value.trim();
            
            if (username) {
                addFriend(username)
                    .then(response => {
                        // Clear input
                        usernameInput.value = '';
                        
                        // Refresh friends list
                        loadFriendsList();
                        
                        // Show success message
                        showNotification('Friend request sent!', 'success');
                    })
                    .catch(error => {
                        showNotification(error.message || 'Could not add friend', 'error');
                    });
            }
        });
    }
    
    // Load initial friends list
    loadFriendsList();
    
    // Set up friend request buttons
    document.addEventListener('click', function(e) {
        // Accept friend request
        if (e.target.classList.contains('accept-friend')) {
            const requestId = e.target.dataset.requestId;
            respondToFriendRequest(requestId, 'accept')
                .then(() => loadFriendsList())
                .catch(error => showNotification(error.message, 'error'));
        }
        
        // Reject friend request
        if (e.target.classList.contains('reject-friend')) {
            const requestId = e.target.dataset.requestId;
            respondToFriendRequest(requestId, 'reject')
                .then(() => loadFriendsList())
                .catch(error => showNotification(error.message, 'error'));
        }
    });
}

/**
 * Load friends list from server
 */
function loadFriendsList() {
    const friendsList = document.getElementById('friends-list');
    const friendRequests = document.getElementById('friend-requests');
    
    // Show loading state
    if (friendsList) {
        friendsList.innerHTML = '<div class="text-center py-4"><div class="animate-pulse">Loading friends...</div></div>';
    }
    
    // Fetch friends data
    fetch('/api/friends/')
        .then(response => response.json())
        .then(data => {
            // Update friends list
            if (friendsList) {
                if (data.friends.length === 0) {
                    friendsList.innerHTML = '<div class="text-center text-slate-400 py-4">No friends yet. Add some friends to get started!</div>';
                } else {
                    friendsList.innerHTML = '';
                    data.friends.forEach(friend => {
                        const friendElement = document.createElement('div');
                        friendElement.className = 'friend-item flex items-center justify-between p-3 bg-slate-800 rounded-lg mb-2 hover:bg-slate-700 transition-colors';
                        friendElement.innerHTML = `
                            <div class="flex items-center">
                                <div class="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                                    ${friend.username.charAt(0).toUpperCase()}
                                </div>
                                <div class="ml-3">
                                    <div class="font-medium">${friend.username}</div>
                                    <div class="text-xs text-slate-400">Level ${friend.level || 1}</div>
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                <button class="start-chat px-3 py-1 bg-violet-600 text-white text-sm rounded hover:bg-violet-700 transition-colors" data-username="${friend.username}">Chat</button>
                            </div>
                        `;
                        friendsList.appendChild(friendElement);
                    });
                }
            }
            
            // Update friend requests
            if (friendRequests) {
                if (data.requests.length === 0) {
                    friendRequests.innerHTML = '<div class="text-center text-slate-400 py-2 text-sm">No pending requests</div>';
                } else {
                    friendRequests.innerHTML = '<h3 class="text-lg font-semibold mb-2">Friend Requests</h3>';
                    data.requests.forEach(request => {
                        const requestElement = document.createElement('div');
                        requestElement.className = 'friend-request flex items-center justify-between p-2 bg-slate-800 rounded-lg mb-2';
                        requestElement.innerHTML = `
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
                                    ${request.sender.charAt(0).toUpperCase()}
                                </div>
                                <div class="ml-2 font-medium text-sm">${request.sender}</div>
                            </div>
                            <div class="flex space-x-2">
                                <button class="accept-friend px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors" data-request-id="${request.id}">Accept</button>
                                <button class="reject-friend px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-700 transition-colors" data-request-id="${request.id}">Reject</button>
                            </div>
                        `;
                        friendRequests.appendChild(requestElement);
                    });
                }
            }
            
            // Set up chat buttons
            document.querySelectorAll('.start-chat').forEach(button => {
                button.addEventListener('click', function() {
                    const username = this.dataset.username;
                    startChat(username);
                });
            });
        })
        .catch(error => {
            console.error('Error loading friends:', error);
            if (friendsList) {
                friendsList.innerHTML = '<div class="text-center text-slate-400 py-4">Could not load friends. Please try again.</div>';
            }
        });
}

/**
 * Send a friend request
 * @param {string} username - Username to add as friend
 * @returns {Promise} Promise that resolves when request is sent
 */
function addFriend(username) {
    return fetch('/api/friends/add/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ username: username })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not add friend');
            });
        }
        return response.json();
    });
}

/**
 * Respond to a friend request
 * @param {string} requestId - Request ID
 * @param {string} action - 'accept' or 'reject'
 * @returns {Promise} Promise that resolves when action is completed
 */
function respondToFriendRequest(requestId, action) {
    return fetch(`/api/friends/request/${requestId}/${action}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `Could not ${action} friend request`);
            });
        }
        return response.json();
    });
}

/**
 * Start a chat with a friend
 * @param {string} username - Friend's username
 */
function startChat(username) {
    fetch('/api/chat/start/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ username: username })
    })
    .then(response => response.json())
    .then(data => {
        // Redirect to chat page
        window.location.href = `/connections/chat/${data.chat_id}/`;
    })
    .catch(error => {
        console.error('Error starting chat:', error);
        showNotification('Could not start chat. Please try again.', 'error');
    });
}

/**
 * Initialize leaderboard functionality
 */
function initializeLeaderboard() {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const leaderboardTabs = document.querySelectorAll('.leaderboard-tab');
    
    // Load initial leaderboard (friends by default)
    loadLeaderboard('friends');
    
    // Set up tab switching
    leaderboardTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            leaderboardTabs.forEach(t => t.classList.remove('active-tab'));
            
            // Add active class to clicked tab
            this.classList.add('active-tab');
            
            // Load leaderboard for selected type
            const type = this.dataset.type;
            loadLeaderboard(type);
        });
    });
}

/**
 * Load leaderboard data
 * @param {string} type - 'friends' or 'global'
 */
function loadLeaderboard(type) {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    // Show loading state
    leaderboardList.innerHTML = '<div class="text-center py-4"><div class="animate-pulse">Loading leaderboard...</div></div>';
    
    // Fetch leaderboard data
    fetch(`/api/leaderboard/${type}/`)
        .then(response => response.json())
        .then(data => {
            if (data.users.length === 0) {
                leaderboardList.innerHTML = '<div class="text-center text-slate-400 py-4">No data available</div>';
                return;
            }
            
            leaderboardList.innerHTML = '';
            
            // Add users to leaderboard
            data.users.forEach((user, index) => {
                const userElement = document.createElement('div');
                userElement.className = 'leaderboard-item flex items-center justify-between p-3 bg-slate-800 rounded-lg mb-2 hover:bg-slate-700 transition-colors';
                
                // Add special styling for top 3
                let rankClass = '';
                let medalIcon = '';
                
                if (index === 0) {
                    rankClass = 'text-yellow-400 font-bold';
                    medalIcon = '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"></path></svg>';
                } else if (index === 1) {
                    rankClass = 'text-slate-300 font-bold';
                    medalIcon = '<svg class="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"></path></svg>';
                } else if (index === 2) {
                    rankClass = 'text-amber-600 font-bold';
                    medalIcon = '<svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"></path></svg>';
                }
                
                userElement.innerHTML = `
                    <div class="flex items-center">
                        <div class="w-8 text-center ${rankClass}">${index + 1}</div>
                        <div class="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold ml-2">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div class="ml-3">
                            <div class="font-medium flex items-center">
                                ${user.username} ${medalIcon}
                            </div>
                            <div class="text-xs text-slate-400">Level ${user.level || 1}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-violet-400">${user.xp} XP</div>
                        <div class="text-xs text-slate-400">${user.streak_days} day streak</div>
                    </div>
                `;
                
                leaderboardList.appendChild(userElement);
            });
        })
        .catch(error => {
            console.error('Error loading leaderboard:', error);
            leaderboardList.innerHTML = '<div class="text-center text-slate-400 py-4">Could not load leaderboard. Please try again.</div>';
        });
}

/**
 * Initialize shared goals functionality
 */
function initializeSharedGoals() {
    const sharedGoalsContainer = document.getElementById('shared-goals-container');
    const createSharedGoalForm = document.getElementById('create-shared-goal-form');
    
    // Load initial shared goals
    loadSharedGoals();
    
    // Handle create shared goal form submission
    if (createSharedGoalForm) {
        createSharedGoalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const title = createSharedGoalForm.querySelector('input[name="title"]').value.trim();
            const description = createSharedGoalForm.querySelector('textarea[name="description"]').value.trim();
            const participants = Array.from(createSharedGoalForm.querySelectorAll('input[name="participants"]:checked')).map(input => input.value);
            
            if (title && participants.length > 0) {
                createSharedGoal(title, description, participants)
                    .then(() => {
                        // Reset form
                        createSharedGoalForm.reset();
                        
                        // Reload shared goals
                        loadSharedGoals();
                        
                        // Show success message
                        showNotification('Shared goal created!', 'success');
                    })
                    .catch(error => {
                        showNotification(error.message || 'Could not create shared goal', 'error');
                    });
            } else {
                showNotification('Please enter a title and select at least one participant', 'error');
            }
        });
    }
    
    // Set up shared goal action buttons
    document.addEventListener('click', function(e) {
        // Complete shared goal
        if (e.target.classList.contains('complete-shared-goal')) {
            const goalId = e.target.dataset.goalId;
            completeSharedGoal(goalId)
                .then(() => loadSharedGoals())
                .catch(error => showNotification(error.message, 'error'));
        }
    });
}

/**
 * Load shared goals from server
 */
function loadSharedGoals() {
    const sharedGoalsList = document.getElementById('shared-goals-list');
    
    // Show loading state
    if (sharedGoalsList) {
        sharedGoalsList.innerHTML = '<div class="text-center py-4"><div class="animate-pulse">Loading shared goals...</div></div>';
    }
    
    // Fetch shared goals data
    fetch('/api/shared-goals/')
        .then(response => response.json())
        .then(data => {
            if (data.goals.length === 0) {
                sharedGoalsList.innerHTML = '<div class="text-center text-slate-400 py-4">No shared goals yet. Create one to get started!</div>';
                return;
            }
            
            sharedGoalsList.innerHTML = '';
            
            // Add goals to list
            data.goals.forEach(goal => {
                const goalElement = document.createElement('div');
                goalElement.className = `shared-goal-item p-4 bg-slate-800 rounded-lg mb-3 ${goal.completed ? 'border-l-4 border-emerald-500' : ''}`;
                
                // Format participants
                const participantsHtml = goal.participants.map(p => {
                    return `<span class="inline-block bg-slate-700 rounded-full px-2 py-1 text-xs mr-1 mb-1">${p.username}</span>`;
                }).join('');
                
                // Calculate progress
                const completedCount = goal.participants.filter(p => p.completed).length;
                const totalCount = goal.participants.length;
                const progressPercent = Math.round((completedCount / totalCount) * 100);
                
                goalElement.innerHTML = `
                    <div class="flex justify-between items-start">
                        <h3 class="font-semibold text-lg ${goal.completed ? 'text-emerald-400' : ''}">${goal.title}</h3>
                        <div class="text-xs text-slate-400">${new Date(goal.created_at).toLocaleDateString()}</div>
                    </div>
                    ${goal.description ? `<p class="text-slate-300 text-sm mt-2">${goal.description}</p>` : ''}
                    <div class="mt-3">
                        <div class="text-xs text-slate-400 mb-1">Participants:</div>
                        <div class="flex flex-wrap">${participantsHtml}</div>
                    </div>
                    <div class="mt-3">
                        <div class="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Progress: ${completedCount}/${totalCount} completed</span>
                            <span>${progressPercent}%</span>
                        </div>
                        <div class="w-full bg-slate-700 rounded-full h-2">
                            <div class="bg-violet-600 h-2 rounded-full" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    ${!goal.completed && !goal.user_completed ? `
                        <div class="mt-3 flex justify-end">
                            <button class="complete-shared-goal px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors" data-goal-id="${goal.id}">
                                Mark as Completed
                            </button>
                        </div>
                    ` : ''}
                    ${goal.completed ? `
                        <div class="mt-2 text-center">
                            <div class="text-emerald-400 text-sm font-semibold">Completed! +${goal.bonus_xp} XP Bonus</div>
                        </div>
                    ` : ''}
                `;
                
                sharedGoalsList.appendChild(goalElement);
            });
        })
        .catch(error => {
            console.error('Error loading shared goals:', error);
            sharedGoalsList.innerHTML = '<div class="text-center text-slate-400 py-4">Could not load shared goals. Please try again.</div>';
        });
}

/**
 * Create a new shared goal
 * @param {string} title - Goal title
 * @param {string} description - Goal description
 * @param {Array} participants - Array of participant usernames
 * @returns {Promise} Promise that resolves when goal is created
 */
function createSharedGoal(title, description, participants) {
    return fetch('/api/shared-goals/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            title: title,
            description: description,
            participants: participants
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not create shared goal');
            });
        }
        return response.json();
    });
}

/**
 * Mark a shared goal as completed by the current user
 * @param {string} goalId - Goal ID
 * @returns {Promise} Promise that resolves when goal is marked as completed
 */
function completeSharedGoal(goalId) {
    return fetch(`/api/shared-goals/${goalId}/complete/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not complete shared goal');
            });
        }
        return response.json();
    });
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