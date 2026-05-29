// Page Navigation
function showPage(pageId, skipEvent = false) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Update navbar links only if not from initialization
    if (!skipEvent) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        if (event?.target) {
            event.target.classList.add('active');
        }
    }

    // Initialize tasks counter on tasks page
    if (pageId === 'tasks') {
        updateTasksCounter();
    }
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeButton(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function updateThemeButton(theme) {
    const themeIcon = document.getElementById('themeIcon');
    const themeLabel = document.getElementById('themeLabel');
    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeLabel.textContent = 'Claro';
    } else {
        themeIcon.textContent = '🌙';
        themeLabel.textContent = 'Escuro';
    }
}

// Tab Navigation
function showTab(tabId) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // Show selected tab pane
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event?.target) {
        event.target.classList.add('active');
    }
    
    // Load stats when overview tab is opened
    if (tabId === 'overview') {
        loadStats();
    }
}

// Statistics Management
const API_URL = 'http://localhost:5000/api';
let stats = null;

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (response.ok) {
            stats = await response.json();
            updateStatsCards();
            renderStatusChart();
            renderPriorityChart();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatsCards() {
    if (!stats) return;
    
    const cards = document.querySelectorAll('#overview .card');
    if (cards.length >= 4) {
        cards[0].querySelector('.card-number').textContent = stats.totalTasks;
        cards[0].querySelector('.card-meta').textContent = stats.totalTasks > 0 ? '+ tarefas' : 'Sem tarefas';
        
        cards[1].querySelector('.card-number').textContent = stats.completedTasks;
        cards[1].querySelector('.card-meta').textContent = stats.completionRate + '% completo';
        
        cards[2].querySelector('.card-number').textContent = stats.pendingTasks;
        cards[2].querySelector('.card-meta').textContent = (100 - stats.completionRate) + '% restante';
        
        cards[3].querySelector('.card-number').textContent = '0';
        cards[3].querySelector('.card-meta').textContent = 'Sem atrasos';
    }
}

function renderStatusChart() {
    if (!stats) return;
    
    const svg = document.getElementById('statusChart');
    if (!svg) return;
    
    svg.innerHTML = '';
    
    const width = svg.clientWidth;
    const height = 250;
    const radius = Math.min(width, height) / 2 - 40;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Get colors from CSS variables
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary-color').trim();
    const lightText = style.getPropertyValue('--light-text').trim();
    
    const completed = stats.completedTasks;
    const pending = stats.pendingTasks;
    const total = stats.totalTasks;
    
    if (total === 0) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', centerX);
        text.setAttribute('y', centerY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '14');
        text.setAttribute('fill', lightText);
        text.textContent = 'Nenhuma tarefa';
        svg.appendChild(text);
        return;
    }
    
    const completedPercent = completed / total;
    const pendingPercent = pending / total;
    
    // Draw completed slice (blue/primary color)
    const completedAngle = completedPercent * 2 * Math.PI;
    const completedX = centerX + radius * Math.cos(completedAngle - Math.PI / 2);
    const completedY = centerY + radius * Math.sin(completedAngle - Math.PI / 2);
    
    const largeArc = completedPercent > 0.5 ? 1 : 0;
    const pathData = `M ${centerX} ${centerY} L ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${completedX} ${completedY} Z`;
    
    const completedSlice = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    completedSlice.setAttribute('d', pathData);
    completedSlice.setAttribute('fill', primaryColor);
    svg.appendChild(completedSlice);
    
    // Draw pending slice (light color)
    const pendingSliceStart = completedAngle;
    const pendingSliceEnd = pendingSliceStart + pendingPercent * 2 * Math.PI;
    const pendingLargeArc = pendingPercent > 0.5 ? 1 : 0;
    const pendingX = centerX + radius * Math.cos(pendingSliceEnd - Math.PI / 2);
    const pendingY = centerY + radius * Math.sin(pendingSliceEnd - Math.PI / 2);
    
    const pendingPath = `M ${centerX} ${centerY} L ${completedX} ${completedY} A ${radius} ${radius} 0 ${pendingLargeArc} 1 ${pendingX} ${pendingY} Z`;
    
    const pendingSlice = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pendingSlice.setAttribute('d', pendingPath);
    pendingSlice.setAttribute('fill', lightText);
    pendingSlice.setAttribute('opacity', '0.3');
    svg.appendChild(pendingSlice);
    
    // Add legend
    const legendY = height - 30;
    
    const completedDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    completedDot.setAttribute('cx', 20);
    completedDot.setAttribute('cy', legendY);
    completedDot.setAttribute('r', 4);
    completedDot.setAttribute('fill', primaryColor);
    svg.appendChild(completedDot);
    
    const completedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    completedText.setAttribute('x', 30);
    completedText.setAttribute('y', legendY + 4);
    completedText.setAttribute('font-size', '12');
    completedText.setAttribute('fill', primaryColor);
    completedText.textContent = `Concluídas (${completed})`;
    svg.appendChild(completedText);
    
    const pendingDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pendingDot.setAttribute('cx', width / 2);
    pendingDot.setAttribute('cy', legendY);
    pendingDot.setAttribute('r', 4);
    pendingDot.setAttribute('fill', lightText);
    svg.appendChild(pendingDot);
    
    const pendingText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    pendingText.setAttribute('x', width / 2 + 10);
    pendingText.setAttribute('y', legendY + 4);
    pendingText.setAttribute('font-size', '12');
    pendingText.setAttribute('fill', lightText);
    pendingText.textContent = `Pendentes (${pending})`;
    svg.appendChild(pendingText);
}

function renderPriorityChart() {
    if (!stats) return;
    
    const svg = document.getElementById('priorityChart');
    if (!svg) return;
    
    svg.innerHTML = '';
    
    const width = svg.clientWidth;
    const height = 250;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary-color').trim();
    const lightText = style.getPropertyValue('--light-text').trim();
    
    const { low, medium, high } = stats.tasksByPriority;
    const maxTasks = Math.max(low, medium, high, 1);
    
    const barWidth = chartWidth / 3 - 20;
    const barSpacing = chartWidth / 3;
    
    // Draw bars
    const priorities = [
        { label: 'Baixa', value: low, x: padding, color: '#0984e3' },
        { label: 'Média', value: medium, x: padding + barSpacing, color: '#fdcb6e' },
        { label: 'Alta', value: high, x: padding + barSpacing * 2, color: '#d63031' }
    ];
    
    priorities.forEach(pri => {
        const barHeight = (pri.value / maxTasks) * chartHeight;
        const barY = padding + chartHeight - barHeight;
        
        // Draw bar
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', pri.x + 10);
        rect.setAttribute('y', barY);
        rect.setAttribute('width', barWidth);
        rect.setAttribute('height', barHeight);
        rect.setAttribute('fill', pri.color);
        svg.appendChild(rect);
        
        // Draw label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', pri.x + barWidth / 2 + 10);
        label.setAttribute('y', height - 10);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '12');
        label.setAttribute('fill', lightText);
        label.textContent = pri.label;
        svg.appendChild(label);
        
        // Draw value
        if (pri.value > 0) {
            const value = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            value.setAttribute('x', pri.x + barWidth / 2 + 10);
            value.setAttribute('y', barY - 5);
            value.setAttribute('text-anchor', 'middle');
            value.setAttribute('font-size', '14');
            value.setAttribute('font-weight', 'bold');
            value.setAttribute('fill', primaryColor);
            value.textContent = pri.value;
            svg.appendChild(value);
        }
    });
}

// Tasks Management
let tasks = [];
let currentFilter = 'all';

async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (response.ok) {
            tasks = await response.json();
            renderTasks();
            updateTasksCounter();
        } else {
            console.error('Failed to load tasks');
            showNotification('Erro ao carregar tarefas', 'error');
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Erro de conexão. Verifique se o backend está rodando.', 'error');
    }
}

function saveTasks() {
    // Dados são salvos automaticamente na API
}

function showAddTaskForm() {
    const form = document.getElementById('taskForm');
    form.classList.remove('hidden');
    document.getElementById('taskTitle').focus();
}

function hideAddTaskForm() {
    const form = document.getElementById('taskForm');
    form.classList.add('hidden');
    // Clear form
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskPriority').value = 'medium';
}

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;

    if (!title) {
        alert('Por favor, entre com um título para a tarefa');
        return;
    }

    // Disable button during request
    const btn = event.target;
    btn.disabled = true;

    fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, description, priority })
    })
    .then(response => {
        btn.disabled = false;
        if (response.ok) {
            hideAddTaskForm();
            loadTasks();
            loadStats();
            showNotification('Tarefa criada com sucesso!', 'success');
            currentFilter = 'all';
            filterTasks('all');
        } else {
            showNotification('Erro ao criar tarefa', 'error');
        }
    })
    .catch(error => {
        btn.disabled = false;
        console.error('Error adding task:', error);
        showNotification('Erro de conexão', 'error');
    });
}

function deleteTask(id) {
    if (confirm('Tem certeza que deseja deletar esta tarefa?')) {
        fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                loadTasks();
                loadStats();
                showNotification('Tarefa deletada!', 'success');
            } else {
                showNotification('Erro ao deletar tarefa', 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting task:', error);
            showNotification('Erro de conexão', 'error');
        });
    }
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...task,
                completed: !task.completed
            })
        })
        .then(response => {
            if (response.ok) {
                loadTasks();
                loadStats();
                showNotification(
                    !task.completed ? 'Tarefa marcada como completa! ✓' : 'Tarefa marcada como pendente',
                    'success'
                );
            }
        })
        .catch(error => {
            console.error('Error toggling task:', error);
            showNotification('Erro de conexão', 'error');
        });
    }
}

function filterTasks(filter) {
    currentFilter = filter;

    let filtered = tasks;
    if (filter === 'pending') {
        filtered = tasks.filter(t => !t.completed);
    } else if (filter === 'completed') {
        filtered = tasks.filter(t => t.completed);
    }

    // Update tab buttons
    document.querySelectorAll('.task-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event?.target) {
        event.target.classList.add('active');
    }

    renderFilteredTasks(filtered);
}

function renderTasks() {
    renderFilteredTasks(tasks);
}

function renderFilteredTasks(taskList) {
    const tasksList = document.getElementById('tasksList');
    
    if (taskList.length === 0) {
        tasksList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--light-text);">
                <p style="font-size: 1.1rem;">Nenhuma tarefa encontrada</p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem;">Crie uma nova tarefa para começar</p>
            </div>
        `;
        return;
    }

    tasksList.innerHTML = taskList.map(task => {
        // Format date from MySQL timestamp
        const dateObj = new Date(task.created_at);
        const formattedDate = dateObj.toLocaleDateString('pt-BR');
        
        return `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-content">
                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="task-priority ${task.priority}">${getPriorityLabel(task.priority)}</span>
                    <span style="color: var(--light-text); font-size: 0.85rem;">📅 ${formattedDate}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn complete" onclick="toggleTask(${task.id})" title="${task.completed ? 'Marcar como pendente' : 'Marcar como completo'}">
                    ${task.completed ? '✓' : '○'}
                </button>
                <button class="task-btn delete" onclick="deleteTask(${task.id})" title="Deletar tarefa">
                    🗑️
                </button>
            </div>
        </div>
    `
    }).join('');
}

function updateTasksCounter() {
    const allCount = tasks.length;
    const pendingCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;

    // Update tab buttons text
    const tabBtns = document.querySelectorAll('.task-tab-btn');
    if (tabBtns.length >= 3) {
        tabBtns[0].textContent = `Todas (${allCount})`;
        tabBtns[1].textContent = `Pendentes (${pendingCount})`;
        tabBtns[2].textContent = `Concluídas (${completedCount})`;
    }

    // Also update dashboard card if visible
    updateDashboardCards();
}

function updateDashboardCards() {
    const allTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;

    const cards = document.querySelectorAll('.dashboard-grid .card');
    if (cards.length >= 3) {
        cards[0].innerHTML = `
            <h3>Tarefas Totais</h3>
            <p class="card-number">${allTasks}</p>
            <p class="card-meta">${allTasks > 0 ? `${Math.round((completedTasks / allTasks) * 100)}% completo` : 'Nenhuma tarefa'}</p>
        `;
        cards[1].innerHTML = `
            <h3>Concluídas</h3>
            <p class="card-number">${completedTasks}</p>
            <p class="card-meta">${allTasks > 0 ? `${Math.round((completedTasks / allTasks) * 100)}% completo` : '-'}</p>
        `;
        cards[2].innerHTML = `
            <h3>Pendentes</h3>
            <p class="card-number">${pendingTasks}</p>
            <p class="card-meta">${allTasks > 0 ? `${Math.round((pendingTasks / allTasks) * 100)}% restante` : '-'}</p>
        `;
    }
}

function getPriorityLabel(priority) {
    const labels = {
        low: '🔵 Baixa',
        medium: '🟡 Média',
        high: '🔴 Alta'
    };
    return labels[priority] || priority;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        color: white;
        font-weight: 600;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Animation styles for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initializeTheme();
    
    // Set home page as active (skip event handling during init)
    showPage('home', true);

    // Load tasks from API
    loadTasks();
    
    // Load stats from API
    loadStats();

    // Handle Enter key in task form
    document.getElementById('taskTitle')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Mobile nav toggle (if needed)
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu?.classList.toggle('active');
        });
    }
});

// Notes: Tasks are now managed by backend API at http://localhost:5000/api
// All data is persisted in MySQL database
