/**
 * NeuroBoost - Progress Tree Visualization
 * Uses D3.js to create an interactive, gamified task tree visualization
 */

// Initialize the tree visualization when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if the tree container exists on this page
    const treeContainer = document.getElementById('progress-tree-container');
    if (!treeContainer) return;
    
    // Fetch task data from the server
    fetchTaskData()
        .then(data => {
            createTaskTree(data);
        })
        .catch(error => {
            console.error('Error fetching task data:', error);
            treeContainer.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-slate-400">Could not load progress tree. Please try again later.</p>
                </div>
            `;
        });
});

/**
 * Fetch task data from the server
 * @returns {Promise} Promise that resolves with task data
 */
function fetchTaskData() {
    return fetch('/api/progress/tree/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
}

/**
 * Create the task tree visualization using D3.js
 * @param {Array} data - Task data from the server
 */
function createTaskTree(data) {
    // Clear any existing content
    const treeContainer = document.getElementById('progress-tree-container');
    treeContainer.innerHTML = '';
    
    // Set up dimensions
    const width = treeContainer.clientWidth;
    const height = treeContainer.clientHeight;
    
    // Create SVG container
    const svg = d3.select('#progress-tree-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2}, 50)`);
    
    // Create a tree layout
    const treeLayout = d3.tree()
        .size([width - 50, height - 50]);
    
    // Convert flat data to hierarchical structure if needed
    const hierarchicalData = createHierarchy(data);
    
    // Create the root node
    const root = d3.hierarchy(hierarchicalData);
    
    // Generate the tree layout
    treeLayout(root);
    
    // Add links between nodes
    svg.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', d => {
            // Thicker branches for tasks with more time spent
            const timeSpent = d.target.data.time_spent || 0;
            return timeSpent > 60 ? 'tree-link tree-link-thick' : 'tree-link';
        })
        .attr('d', d => {
            return `M${d.source.x},${d.source.y}
                    C${d.source.x},${(d.source.y + d.target.y) / 2}
                    ${d.target.x},${(d.source.y + d.target.y) / 2}
                    ${d.target.x},${d.target.y}`;
        });
    
    // Create a group for each node
    const nodes = svg.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
    
    // Add circles (leaves) for each node
    nodes.append('circle')
        .attr('r', d => {
            // Root node is larger
            if (!d.parent) return 15;
            // Size based on XP value
            return d.data.xp_points ? 10 + (d.data.xp_points / 5) : 8;
        })
        .attr('class', d => {
            // Apply different styles based on completion status
            return d.data.completed ? 'tree-node tree-node-completed' : 'tree-node tree-node-incomplete';
        })
        .on('mouseover', function(event, d) {
            // Highlight on hover
            d3.select(this).attr('r', function() {
                return parseFloat(d3.select(this).attr('r')) * 1.2;
            });
            
            // Show tooltip
            showTooltip(event, d);
        })
        .on('mouseout', function() {
            // Return to normal size
            d3.select(this).attr('r', function() {
                return parseFloat(d3.select(this).attr('r')) / 1.2;
            });
            
            // Hide tooltip
            hideTooltip();
        })
        .on('click', function(event, d) {
            // Animate node on click
            d3.select(this)
                .transition()
                .duration(300)
                .attr('r', function() {
                    return parseFloat(d3.select(this).attr('r')) * 1.5;
                })
                .transition()
                .duration(300)
                .attr('r', function() {
                    return parseFloat(d3.select(this).attr('r')) / 1.5;
                });
            
            // If it's a task node, navigate to task detail or show modal
            if (d.data.id && d.data.id !== 'root') {
                showTaskDetail(d.data.id);
            }
        });
    
    // Add labels for each node
    nodes.append('text')
        .attr('dy', d => d.children ? -20 : 20)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-sm font-medium')
        .style('fill', d => d.data.completed ? '#10b981' : '#94a3b8')
        .text(d => d.data.title ? truncateText(d.data.title, 20) : '');
    
    // Add XP indicators for completed nodes
    nodes.filter(d => d.data.completed && d.data.xp_points)
        .append('text')
        .attr('dy', 35)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-xs font-semibold')
        .style('fill', '#a78bfa')
        .text(d => `+${d.data.xp_points} XP`);
    
    // Add glow effects for completed nodes
    svg.selectAll('.tree-node-completed')
        .each(function() {
            const node = d3.select(this);
            const glow = node.clone(true)
                .attr('class', 'glow')
                .style('fill', 'none')
                .style('stroke', '#10b981')
                .style('stroke-width', 2)
                .style('stroke-opacity', 0.5)
                .attr('r', function() {
                    return parseFloat(node.attr('r')) + 5;
                });
            
            // Animate the glow
            glow.transition()
                .duration(2000)
                .attr('r', function() {
                    return parseFloat(node.attr('r')) + 10;
                })
                .style('stroke-opacity', 0)
                .on('end', function() {
                    d3.select(this).remove();
                });
        });
    
    // Create tooltip div if it doesn't exist
    if (!document.getElementById('tree-tooltip')) {
        d3.select('body').append('div')
            .attr('id', 'tree-tooltip')
            .attr('class', 'absolute hidden bg-slate-800 text-white p-2 rounded-lg shadow-lg z-50 text-sm border border-slate-700')
            .style('pointer-events', 'none');
    }
    
    // Add resize handler
    window.addEventListener('resize', function() {
        // Recreate the tree on resize
        setTimeout(() => {
            createTaskTree(data);
        }, 100);
    });
}

/**
 * Convert flat task data to hierarchical structure for D3
 * @param {Array} data - Flat task data from the server
 * @returns {Object} Hierarchical data structure
 */
function createHierarchy(data) {
    // Create root node
    const root = {
        id: 'root',
        title: 'Your Progress',
        children: []
    };
    
    // Group tasks by category
    const categories = {};
    
    data.forEach(task => {
        if (!categories[task.category]) {
            categories[task.category] = {
                id: `category-${task.category}`,
                title: task.category,
                children: []
            };
            root.children.push(categories[task.category]);
        }
        
        categories[task.category].children.push(task);
    });
    
    return root;
}

/**
 * Show tooltip with task details
 * @param {Event} event - Mouse event
 * @param {Object} d - D3 data object
 */
function showTooltip(event, d) {
    if (!d.data.id || d.data.id === 'root') return;
    
    const tooltip = d3.select('#tree-tooltip');
    
    // Format date if available
    let dateStr = '';
    if (d.data.created_at) {
        const date = new Date(d.data.created_at);
        dateStr = date.toLocaleDateString();
    }
    
    // Build tooltip content
    let content = `<div class="font-semibold">${d.data.title}</div>`;
    
    if (d.data.category) {
        content += `<div class="text-xs text-slate-300 mt-1">Category: ${d.data.category}</div>`;
    }
    
    if (dateStr) {
        content += `<div class="text-xs text-slate-300">Created: ${dateStr}</div>`;
    }
    
    if (d.data.xp_points) {
        content += `<div class="text-xs text-violet-300 font-semibold mt-1">+${d.data.xp_points} XP</div>`;
    }
    
    if (d.data.time_spent) {
        const hours = Math.floor(d.data.time_spent / 60);
        const minutes = d.data.time_spent % 60;
        content += `<div class="text-xs text-emerald-300">Time: ${hours}h ${minutes}m</div>`;
    }
    
    // Set content and position
    tooltip.html(content)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`)
        .classed('hidden', false);
}

/**
 * Hide the tooltip
 */
function hideTooltip() {
    d3.select('#tree-tooltip').classed('hidden', true);
}

/**
 * Show task detail modal or navigate to task detail page
 * @param {string} taskId - Task ID
 */
function showTaskDetail(taskId) {
    // For now, we'll just log the task ID
    // In a real implementation, this would show a modal or navigate to a detail page
    console.log('Show task detail for:', taskId);
}

/**
 * Truncate text if it's too long
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}