/**
 * NeuroBoost - Question Center
 * Handles AI-powered question generation, flashcards, and mock tests
 */

// Initialize question center features when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize syllabus registration if form exists
    const syllabusForm = document.getElementById('syllabus-form');
    if (syllabusForm) {
        initializeSyllabusForm(syllabusForm);
    }
    
    // Initialize MCQ section if it exists
    const mcqContainer = document.getElementById('mcq-container');
    if (mcqContainer) {
        initializeMCQSection(mcqContainer);
    }
    
    // Initialize mock test section if it exists
    const mockTestContainer = document.getElementById('mock-test-container');
    if (mockTestContainer) {
        initializeMockTestSection(mockTestContainer);
    }
    
    // Initialize flashcards if they exist
    const flashcardContainer = document.getElementById('flashcard-container');
    if (flashcardContainer) {
        initializeFlashcards(flashcardContainer);
    }
});

/**
 * Initialize syllabus registration form
 * @param {HTMLElement} form - Syllabus form element
 */
function initializeSyllabusForm(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<div class="animate-pulse">Processing...</div>';
        
        // Get form data
        const formData = new FormData(form);
        
        // Submit form data
        fetch('/api/question-center/register-syllabus/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Could not register syllabus');
                });
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            showNotification('Syllabus registered successfully!', 'success');
            
            // Redirect to question center dashboard
            setTimeout(() => {
                window.location.href = '/question-center/';
            }, 1000);
        })
        .catch(error => {
            showNotification(error.message || 'An error occurred', 'error');
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    });
}

/**
 * Initialize MCQ section
 * @param {HTMLElement} container - MCQ container element
 */
function initializeMCQSection(container) {
    const generateButton = container.querySelector('.generate-mcq-button');
    const mcqList = container.querySelector('.mcq-list');
    
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            // Show loading state
            mcqList.innerHTML = '<div class="text-center py-8"><div class="animate-pulse">Generating questions...</div></div>';
            
            // Get selected topic if available
            const topicSelect = container.querySelector('select[name="topic"]');
            const topic = topicSelect ? topicSelect.value : null;
            
            // Get difficulty if available
            const difficultySelect = container.querySelector('select[name="difficulty"]');
            const difficulty = difficultySelect ? difficultySelect.value : 'medium';
            
            // Get count if available
            const countInput = container.querySelector('input[name="count"]');
            const count = countInput ? countInput.value : 5;
            
            // Generate MCQs
            generateMCQs(topic, difficulty, count)
                .then(data => {
                    renderMCQs(data.questions, mcqList);
                })
                .catch(error => {
                    mcqList.innerHTML = `<div class="text-center py-8 text-red-400">${error.message || 'Could not generate questions'}</div>`;
                });
        });
    }
    
    // Handle MCQ submission
    container.addEventListener('submit', function(e) {
        if (e.target.classList.contains('mcq-form')) {
            e.preventDefault();
            
            // Get all selected answers
            const answers = {};
            const questions = container.querySelectorAll('.mcq-question');
            
            questions.forEach(question => {
                const questionId = question.dataset.questionId;
                const selectedOption = question.querySelector('input[name="question_' + questionId + '"]:checked');
                
                if (selectedOption) {
                    answers[questionId] = selectedOption.value;
                }
            });
            
            // Submit answers
            submitMCQAnswers(answers)
                .then(data => {
                    // Show results
                    showMCQResults(data.results, questions);
                    
                    // Show XP gained
                    if (data.xp_gained) {
                        animateXpGain(data.xp_gained);
                    }
                })
                .catch(error => {
                    showNotification(error.message || 'Could not submit answers', 'error');
                });
        }
    });
}

/**
 * Generate MCQs from the server
 * @param {string} topic - Topic to generate questions for
 * @param {string} difficulty - Difficulty level
 * @param {number} count - Number of questions to generate
 * @returns {Promise} Promise that resolves with generated questions
 */
function generateMCQs(topic, difficulty, count) {
    return fetch('/api/question-center/generate-mcqs/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            topic: topic,
            difficulty: difficulty,
            count: count
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not generate questions');
            });
        }
        return response.json();
    });
}

/**
 * Render MCQs in the container
 * @param {Array} questions - Array of question objects
 * @param {HTMLElement} container - Container to render questions in
 */
function renderMCQs(questions, container) {
    if (!questions || questions.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400">No questions available</div>';
        return;
    }
    
    // Create form for MCQs
    const form = document.createElement('form');
    form.className = 'mcq-form space-y-6';
    
    // Add questions to form
    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'mcq-question bg-slate-800 rounded-lg p-4 shadow-md animate-fade-in';
        questionElement.dataset.questionId = question.id;
        questionElement.style.animationDelay = `${index * 0.1}s`;
        
        // Create question header
        const questionHeader = document.createElement('div');
        questionHeader.className = 'mb-3';
        questionHeader.innerHTML = `
            <h3 class="font-medium text-lg">${index + 1}. ${question.question}</h3>
            ${question.difficulty ? `<div class="text-xs text-slate-400 mt-1">Difficulty: ${question.difficulty}</div>` : ''}
        `;
        
        // Create options
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'space-y-2';
        
        question.options.forEach((option, optionIndex) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'flex items-start';
            
            const optionId = `question_${question.id}_option_${optionIndex}`;
            
            optionElement.innerHTML = `
                <input type="radio" id="${optionId}" name="question_${question.id}" value="${optionIndex}" class="mt-1 mr-2">
                <label for="${optionId}" class="cursor-pointer">${option}</label>
            `;
            
            optionsContainer.appendChild(optionElement);
        });
        
        // Add question and options to question element
        questionElement.appendChild(questionHeader);
        questionElement.appendChild(optionsContainer);
        
        // Add result container (hidden initially)
        const resultContainer = document.createElement('div');
        resultContainer.className = 'result-container mt-3 hidden';
        questionElement.appendChild(resultContainer);
        
        form.appendChild(questionElement);
    });
    
    // Add submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors';
    submitButton.textContent = 'Submit Answers';
    form.appendChild(submitButton);
    
    // Clear container and add form
    container.innerHTML = '';
    container.appendChild(form);
}

/**
 * Submit MCQ answers to the server
 * @param {Object} answers - Object mapping question IDs to selected option indices
 * @returns {Promise} Promise that resolves with results
 */
function submitMCQAnswers(answers) {
    return fetch('/api/question-center/submit-mcqs/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ answers: answers })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not submit answers');
            });
        }
        return response.json();
    });
}

/**
 * Show MCQ results
 * @param {Object} results - Results object mapping question IDs to result objects
 * @param {NodeList} questionElements - Question elements
 */
function showMCQResults(results, questionElements) {
    // Calculate overall score
    let correctCount = 0;
    let totalCount = Object.keys(results).length;
    
    // Update each question with results
    questionElements.forEach(questionElement => {
        const questionId = questionElement.dataset.questionId;
        const result = results[questionId];
        
        if (!result) return;
        
        // Get result container
        const resultContainer = questionElement.querySelector('.result-container');
        
        // Get selected option
        const selectedOption = questionElement.querySelector(`input[name="question_${questionId}"]:checked`);
        
        // Disable all inputs
        questionElement.querySelectorAll('input').forEach(input => {
            input.disabled = true;
        });
        
        // Update result container
        if (result.correct) {
            correctCount++;
            resultContainer.className = 'result-container mt-3 text-emerald-400 py-2 px-3 bg-emerald-900 bg-opacity-20 rounded';
            resultContainer.innerHTML = '<div class="flex items-center"><svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Correct!</div>';
        } else {
            resultContainer.className = 'result-container mt-3 text-red-400 py-2 px-3 bg-red-900 bg-opacity-20 rounded';
            resultContainer.innerHTML = `
                <div class="flex items-center"><svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg> Incorrect</div>
                <div class="text-xs mt-1">Correct answer: ${result.correct_option_text}</div>
                ${result.explanation ? `<div class="text-xs mt-1">${result.explanation}</div>` : ''}
            `;
        }
        
        // Show result container
        resultContainer.classList.remove('hidden');
        
        // Highlight correct and incorrect options
        const options = questionElement.querySelectorAll('input');
        options.forEach((option, index) => {
            const label = option.nextElementSibling;
            
            if (index === result.correct_option) {
                // Correct option
                label.classList.add('text-emerald-400');
            } else if (selectedOption && parseInt(selectedOption.value) === index && !result.correct) {
                // Selected incorrect option
                label.classList.add('text-red-400');
            }
        });
    });
    
    // Show overall score
    const scoreElement = document.createElement('div');
    scoreElement.className = 'text-center py-4 mt-6 bg-slate-800 rounded-lg animate-fade-in';
    scoreElement.innerHTML = `
        <h3 class="text-xl font-semibold">Your Score</h3>
        <div class="text-3xl font-bold mt-2">${correctCount}/${totalCount}</div>
        <div class="text-sm text-slate-400 mt-1">${Math.round((correctCount / totalCount) * 100)}%</div>
    `;
    
    // Add score element after the form
    const form = document.querySelector('.mcq-form');
    form.appendChild(scoreElement);
    
    // Disable submit button
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Answers Submitted';
}

/**
 * Initialize mock test section
 * @param {HTMLElement} container - Mock test container element
 */
function initializeMockTestSection(container) {
    const startButton = container.querySelector('.start-mock-test');
    const mockTestContent = container.querySelector('.mock-test-content');
    
    if (startButton) {
        startButton.addEventListener('click', function() {
            // Show loading state
            mockTestContent.innerHTML = '<div class="text-center py-8"><div class="animate-pulse">Preparing mock test...</div></div>';
            
            // Get selected topic if available
            const topicSelect = container.querySelector('select[name="topic"]');
            const topic = topicSelect ? topicSelect.value : null;
            
            // Get duration if available
            const durationSelect = container.querySelector('select[name="duration"]');
            const duration = durationSelect ? parseInt(durationSelect.value) : 30;
            
            // Start mock test
            startMockTest(topic, duration)
                .then(data => {
                    renderMockTest(data, mockTestContent, duration);
                })
                .catch(error => {
                    mockTestContent.innerHTML = `<div class="text-center py-8 text-red-400">${error.message || 'Could not start mock test'}</div>`;
                });
        });
    }
}

/**
 * Start a mock test
 * @param {string} topic - Topic for the mock test
 * @param {number} duration - Duration in minutes
 * @returns {Promise} Promise that resolves with mock test data
 */
function startMockTest(topic, duration) {
    return fetch('/api/question-center/start-mock-test/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            topic: topic,
            duration: duration
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not start mock test');
            });
        }
        return response.json();
    });
}

/**
 * Render a mock test
 * @param {Object} data - Mock test data
 * @param {HTMLElement} container - Container to render the test in
 * @param {number} duration - Test duration in minutes
 */
function renderMockTest(data, container, duration) {
    if (!data.questions || data.questions.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400">No questions available for mock test</div>';
        return;
    }
    
    // Create mock test container
    const mockTest = document.createElement('div');
    mockTest.className = 'mock-test';
    mockTest.dataset.testId = data.test_id;
    
    // Create timer
    const timerContainer = document.createElement('div');
    timerContainer.className = 'fixed top-4 right-4 bg-slate-800 rounded-lg p-3 shadow-lg z-10';
    timerContainer.innerHTML = `
        <div class="text-center">
            <div class="text-sm text-slate-400">Time Remaining</div>
            <div class="timer-display text-xl font-bold">${formatTime(duration * 60)}</div>
        </div>
    `;
    mockTest.appendChild(timerContainer);
    
    // Create form for questions
    const form = document.createElement('form');
    form.className = 'mock-test-form space-y-6 mt-4';
    
    // Add questions to form
    data.questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'mock-test-question bg-slate-800 rounded-lg p-4 shadow-md';
        questionElement.dataset.questionId = question.id;
        
        // Create question header
        const questionHeader = document.createElement('div');
        questionHeader.className = 'mb-3';
        questionHeader.innerHTML = `
            <h3 class="font-medium text-lg">${index + 1}. ${question.question}</h3>
        `;
        
        // Create options
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'space-y-2';
        
        question.options.forEach((option, optionIndex) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'flex items-start';
            
            const optionId = `mock_question_${question.id}_option_${optionIndex}`;
            
            optionElement.innerHTML = `
                <input type="radio" id="${optionId}" name="question_${question.id}" value="${optionIndex}" class="mt-1 mr-2">
                <label for="${optionId}" class="cursor-pointer">${option}</label>
            `;
            
            optionsContainer.appendChild(optionElement);
        });
        
        // Add question and options to question element
        questionElement.appendChild(questionHeader);
        questionElement.appendChild(optionsContainer);
        
        form.appendChild(questionElement);
    });
    
    // Add submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors';
    submitButton.textContent = 'Submit Test';
    form.appendChild(submitButton);
    
    // Add form to mock test container
    mockTest.appendChild(form);
    
    // Clear container and add mock test
    container.innerHTML = '';
    container.appendChild(mockTest);
    
    // Start timer
    startMockTestTimer(duration * 60, timerContainer.querySelector('.timer-display'), data.test_id, form);
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitMockTest(data.test_id, form);
    });
}

/**
 * Start mock test timer
 * @param {number} seconds - Duration in seconds
 * @param {HTMLElement} display - Timer display element
 * @param {string} testId - Test ID
 * @param {HTMLElement} form - Test form element
 */
function startMockTestTimer(seconds, display, testId, form) {
    let timer = seconds;
    let interval = setInterval(function() {
        timer--;
        
        // Update display
        display.textContent = formatTime(timer);
        
        // Flash timer when less than 5 minutes remaining
        if (timer <= 300) {
            display.classList.add('text-red-400');
            
            if (timer <= 60) {
                // Pulse animation for last minute
                display.classList.add('animate-timer-pulse');
            }
        }
        
        // Auto-submit when time is up
        if (timer <= 0) {
            clearInterval(interval);
            submitMockTest(testId, form, true);
        }
    }, 1000);
    
    // Store interval ID on form for cleanup
    form.dataset.timerInterval = interval;
}

/**
 * Format time in seconds to MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Submit a mock test
 * @param {string} testId - Test ID
 * @param {HTMLElement} form - Test form element
 * @param {boolean} timeUp - Whether time is up
 */
function submitMockTest(testId, form, timeUp = false) {
    // Clear timer interval
    if (form.dataset.timerInterval) {
        clearInterval(form.dataset.timerInterval);
    }
    
    // Disable form
    form.querySelectorAll('input, button').forEach(element => {
        element.disabled = true;
    });
    
    // Show submitting state
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.innerHTML = '<div class="animate-pulse">Submitting...</div>';
    
    // Get all answers
    const answers = {};
    form.querySelectorAll('.mock-test-question').forEach(question => {
        const questionId = question.dataset.questionId;
        const selectedOption = question.querySelector(`input[name="question_${questionId}"]:checked`);
        
        if (selectedOption) {
            answers[questionId] = selectedOption.value;
        }
    });
    
    // Submit test
    fetch('/api/question-center/submit-mock-test/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            test_id: testId,
            answers: answers,
            time_up: timeUp
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not submit test');
            });
        }
        return response.json();
    })
    .then(data => {
        // Show results
        showMockTestResults(data, form);
        
        // Show XP gained
        if (data.xp_gained) {
            animateXpGain(data.xp_gained);
        }
    })
    .catch(error => {
        submitButton.innerHTML = 'Submit Test';
        submitButton.disabled = false;
        form.querySelectorAll('input').forEach(input => {
            input.disabled = false;
        });
        
        showNotification(error.message || 'Could not submit test', 'error');
    });
}

/**
 * Show mock test results
 * @param {Object} data - Test results data
 * @param {HTMLElement} form - Test form element
 */
function showMockTestResults(data, form) {
    // Replace submit button with results button
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.innerHTML = 'View Detailed Results';
    submitButton.disabled = false;
    submitButton.className = 'px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors mt-4';
    
    // Create results summary
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-summary bg-slate-800 rounded-lg p-4 shadow-md mt-6 animate-fade-in';
    
    // Calculate percentage
    const percentage = Math.round((data.correct_count / data.total_count) * 100);
    
    // Set results content
    resultsContainer.innerHTML = `
        <h2 class="text-xl font-semibold text-center">Test Results</h2>
        <div class="flex justify-center mt-4">
            <div class="w-32 h-32 rounded-full flex items-center justify-center border-4 ${percentage >= 70 ? 'border-emerald-500' : percentage >= 40 ? 'border-amber-500' : 'border-red-500'}">
                <div class="text-center">
                    <div class="text-3xl font-bold">${percentage}%</div>
                    <div class="text-sm text-slate-400">${data.correct_count}/${data.total_count}</div>
                </div>
            </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4 text-center">
            <div class="bg-slate-700 p-2 rounded">
                <div class="text-sm text-slate-400">Time Taken</div>
                <div class="font-semibold">${data.time_taken} minutes</div>
            </div>
            <div class="bg-slate-700 p-2 rounded">
                <div class="text-sm text-slate-400">XP Earned</div>
                <div class="font-semibold text-violet-400">+${data.xp_gained} XP</div>
            </div>
        </div>
        <div class="mt-4 text-center">
            <div class="text-sm text-slate-400">Performance</div>
            <div class="font-semibold">${getPerformanceMessage(percentage)}</div>
        </div>
    `;
    
    // Insert results before the submit button
    form.insertBefore(resultsContainer, submitButton);
    
    // Update questions with correct answers
    if (data.question_results) {
        Object.keys(data.question_results).forEach(questionId => {
            const result = data.question_results[questionId];
            const questionElement = form.querySelector(`.mock-test-question[data-question-id="${questionId}"]`);
            
            if (questionElement) {
                // Add result indicator
                const resultIndicator = document.createElement('div');
                resultIndicator.className = result.correct ? 'text-emerald-400 text-sm mt-2' : 'text-red-400 text-sm mt-2';
                resultIndicator.innerHTML = result.correct ? 
                    '<svg class="w-4 h-4 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Correct' : 
                    '<svg class="w-4 h-4 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg> Incorrect';
                
                // Add correct answer if incorrect
                if (!result.correct) {
                    resultIndicator.innerHTML += `<div class="mt-1">Correct answer: ${result.correct_option_text}</div>`;
                }
                
                // Add explanation if available
                if (result.explanation) {
                    resultIndicator.innerHTML += `<div class="mt-1 text-slate-300">${result.explanation}</div>`;
                }
                
                questionElement.appendChild(resultIndicator);
                
                // Highlight correct and selected options
                const options = questionElement.querySelectorAll('input');
                options.forEach((option, index) => {
                    const label = option.nextElementSibling;
                    
                    if (index === result.correct_option) {
                        // Correct option
                        label.classList.add('text-emerald-400');
                    } else if (option.checked && !result.correct) {
                        // Selected incorrect option
                        label.classList.add('text-red-400');
                    }
                });
            }
        });
    }
    
    // Change button to navigate to results page
    submitButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `/question-center/mock-test-results/${data.test_id}/`;
    });
}

/**
 * Get performance message based on percentage
 * @param {number} percentage - Score percentage
 * @returns {string} Performance message
 */
function getPerformanceMessage(percentage) {
    if (percentage >= 90) return 'Excellent! Outstanding performance!';
    if (percentage >= 80) return 'Great job! Very good understanding!';
    if (percentage >= 70) return 'Good work! Solid understanding.';
    if (percentage >= 60) return 'Satisfactory. Keep practicing!';
    if (percentage >= 50) return 'Average. More practice needed.';
    if (percentage >= 40) return 'Below average. Review the material.';
    return 'Needs improvement. Focus on fundamentals.';
}

/**
 * Initialize flashcards
 * @param {HTMLElement} container - Flashcard container element
 */
function initializeFlashcards(container) {
    const generateButton = container.querySelector('.generate-flashcards-button');
    const flashcardDeck = container.querySelector('.flashcard-deck');
    
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            // Show loading state
            flashcardDeck.innerHTML = '<div class="text-center py-8"><div class="animate-pulse">Generating flashcards...</div></div>';
            
            // Get selected topic if available
            const topicSelect = container.querySelector('select[name="topic"]');
            const topic = topicSelect ? topicSelect.value : null;
            
            // Get count if available
            const countInput = container.querySelector('input[name="count"]');
            const count = countInput ? countInput.value : 10;
            
            // Generate flashcards
            generateFlashcards(topic, count)
                .then(data => {
                    renderFlashcards(data.flashcards, flashcardDeck);
                })
                .catch(error => {
                    flashcardDeck.innerHTML = `<div class="text-center py-8 text-red-400">${error.message || 'Could not generate flashcards'}</div>`;
                });
        });
    }
}

/**
 * Generate flashcards from the server
 * @param {string} topic - Topic to generate flashcards for
 * @param {number} count - Number of flashcards to generate
 * @returns {Promise} Promise that resolves with generated flashcards
 */
function generateFlashcards(topic, count) {
    return fetch('/api/question-center/generate-flashcards/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            topic: topic,
            count: count
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Could not generate flashcards');
            });
        }
        return response.json();
    });
}

/**
 * Render flashcards in the container
 * @param {Array} flashcards - Array of flashcard objects
 * @param {HTMLElement} container - Container to render flashcards in
 */
function renderFlashcards(flashcards, container) {
    if (!flashcards || flashcards.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400">No flashcards available</div>';
        return;
    }
    
    // Create flashcard deck
    const deck = document.createElement('div');
    deck.className = 'relative h-80 w-full max-w-md mx-auto';
    
    // Add flashcards to deck (in reverse order so first card is on top)
    flashcards.reverse().forEach((flashcard, index) => {
        const card = document.createElement('div');
        card.className = 'flashcard absolute inset-0 bg-slate-800 rounded-xl shadow-lg p-6 flex items-center justify-center transform transition-all duration-300 cursor-pointer';
        card.style.zIndex = flashcards.length - index;
        card.dataset.flipped = 'false';
        card.dataset.index = index;
        
        // Create front and back of card
        card.innerHTML = `
            <div class="flashcard-front w-full h-full flex flex-col items-center justify-center">
                <div class="text-center text-lg font-medium">${flashcard.front}</div>
                <div class="text-xs text-slate-400 mt-4">Click to flip</div>
            </div>
            <div class="flashcard-back w-full h-full flex flex-col items-center justify-center hidden">
                <div class="text-center">${flashcard.back}</div>
                <div class="text-xs text-slate-400 mt-4">Click to flip back</div>
            </div>
        `;
        
        // Add slight rotation for visual effect
        const randomRotation = Math.random() * 4 - 2; // -2 to 2 degrees
        card.style.transform = `rotate(${randomRotation}deg)`;
        
        // Add click handler to flip card
        card.addEventListener('click', function() {
            flipFlashcard(this);
        });
        
        deck.appendChild(card);
    });
    
    // Add navigation buttons
    const navButtons = document.createElement('div');
    navButtons.className = 'flashcard-nav flex justify-center mt-4 space-x-4';
    navButtons.innerHTML = `
        <button class="prev-card px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Previous
        </button>
        <button class="next-card px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
            Next
        </button>
    `;
    
    // Add progress indicator
    const progress = document.createElement('div');
    progress.className = 'flashcard-progress text-center mt-2 text-sm text-slate-400';
    progress.textContent = `Card 1 of ${flashcards.length}`;
    
    // Clear container and add deck and navigation
    container.innerHTML = '';
    container.appendChild(deck);
    container.appendChild(navButtons);
    container.appendChild(progress);
    
    // Set up navigation buttons
    const prevButton = navButtons.querySelector('.prev-card');
    const nextButton = navButtons.querySelector('.next-card');
    
    prevButton.addEventListener('click', function() {
        navigateFlashcards('prev', deck, prevButton, nextButton, progress, flashcards.length);
    });
    
    nextButton.addEventListener('click', function() {
        navigateFlashcards('next', deck, prevButton, nextButton, progress, flashcards.length);
    });
}

/**
 * Flip a flashcard
 * @param {HTMLElement} card - Flashcard element
 */
function flipFlashcard(card) {
    const front = card.querySelector('.flashcard-front');
    const back = card.querySelector('.flashcard-back');
    const isFlipped = card.dataset.flipped === 'true';
    
    if (isFlipped) {
        // Flip to front
        card.style.transform = 'rotateY(0deg)';
        setTimeout(() => {
            front.classList.remove('hidden');
            back.classList.add('hidden');
        }, 150);
    } else {
        // Flip to back
        card.style.transform = 'rotateY(180deg)';
        setTimeout(() => {
            front.classList.add('hidden');
            back.classList.remove('hidden');
        }, 150);
    }
    
    card.dataset.flipped = isFlipped ? 'false' : 'true';
}

/**
 * Navigate through flashcards
 * @param {string} direction - 'prev' or 'next'
 * @param {HTMLElement} deck - Flashcard deck element
 * @param {HTMLElement} prevButton - Previous button element
 * @param {HTMLElement} nextButton - Next button element
 * @param {HTMLElement} progress - Progress indicator element
 * @param {number} totalCards - Total number of cards
 */
function navigateFlashcards(direction, deck, prevButton, nextButton, progress, totalCards) {
    const cards = deck.querySelectorAll('.flashcard');
    const topCard = deck.querySelector('.flashcard[style*="z-index: ' + cards.length + '"]');
    
    if (!topCard) return;
    
    const currentIndex = parseInt(topCard.dataset.index);
    let nextIndex;
    
    if (direction === 'next') {
        // Move current card to bottom of stack
        topCard.style.transform = 'translateX(150%) rotate(5deg)';
        topCard.style.opacity = '0';
        setTimeout(() => {
            topCard.style.zIndex = '1';
            topCard.style.transform = 'translateX(0) rotate(0)';
            topCard.style.opacity = '1';
            
            // Reset flip state
            topCard.dataset.flipped = 'false';
            topCard.querySelector('.flashcard-front').classList.remove('hidden');
            topCard.querySelector('.flashcard-back').classList.add('hidden');
        }, 300);
        
        // Update next card index
        nextIndex = currentIndex + 1;
        if (nextIndex >= totalCards) nextIndex = 0;
    } else {
        // Find bottom card
        const bottomCard = deck.querySelector('.flashcard[style*="z-index: 1"]');
        if (!bottomCard) return;
        
        // Move bottom card to top of stack
        bottomCard.style.zIndex = cards.length + 1;
        bottomCard.style.transform = 'translateX(0) rotate(0)';
        
        // Move current top card down one level
        topCard.style.zIndex = parseInt(topCard.style.zIndex) - 1;
        
        // Update next card index
        nextIndex = parseInt(bottomCard.dataset.index);
    }
    
    // Update buttons and progress
    prevButton.disabled = false;
    nextButton.disabled = false;
    progress.textContent = `Card ${nextIndex + 1} of ${totalCards}`;
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