// ========== DASHBOARDPRO - COMPLETE SCRIPT ==========
const API_URL = 'http://localhost:5005/api';
let tasks = [];
let currentFilter = 'all';
let notifications = [];
let activityLog = [];
let confirmCallback = null;

// ===== AUTH & USER =====
function getUser() {
    const raw = localStorage.getItem('dashboardpro_auth') || sessionStorage.getItem('dashboardpro_auth');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function checkAuth() {
    const user = getUser();
    if (!user || !user.loggedIn) { window.location.href = 'login.html'; return false; }
    return true;
}

function handleLogout() {
    localStorage.removeItem('dashboardpro_auth');
    sessionStorage.removeItem('dashboardpro_auth');
    window.location.href = 'login.html';
}

function initUserUI() {
    const user = getUser();
    if (!user) return;
    const name = user.name || user.email?.split('@')[0] || 'Usuário';
    const initial = name.charAt(0).toUpperCase();

    // Navbar
    const avatarEl = document.getElementById('avatarCircle');
    const nameEl = document.getElementById('userNameNav');
    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = name;

    // Profile page
    const pAvatar = document.getElementById('profileAvatar');
    const pName = document.getElementById('profileName');
    const pEmail = document.getElementById('profileEmail');
    const pNameInput = document.getElementById('profileNameInput');
    const pEmailInput = document.getElementById('profileEmailInput');
    const pBio = document.getElementById('profileBio');
    if (pAvatar) pAvatar.textContent = initial;
    if (pName) pName.textContent = name;
    if (pEmail) pEmail.textContent = user.email || '';
    if (pNameInput) pNameInput.value = name;
    if (pEmailInput) pEmailInput.value = user.email || '';

    // Load saved profile extras
    const profile = JSON.parse(localStorage.getItem('dashboardpro_profile') || '{}');
    if (pBio && profile.bio) pBio.value = profile.bio;

    const memberSince = document.getElementById('profileMemberSince');
    if (memberSince && user.timestamp) {
        memberSince.textContent = new Date(user.timestamp).toLocaleDateString('pt-BR');
    }

    // Dashboard greeting
    updateGreeting(name);
}

function updateGreeting(name) {
    const el = document.getElementById('dashboardGreeting');
    if (!el) return;
    const h = new Date().getHours();
    let greeting = 'Boa noite';
    if (h >= 5 && h < 12) greeting = 'Bom dia';
    else if (h >= 12 && h < 18) greeting = 'Boa tarde';
    el.innerHTML = `<span style="display:flex;align-items:center;gap:8px"><i data-lucide="sun"></i> ${greeting}, ${name}!</span>`;
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function saveProfile() {
    const name = document.getElementById('profileNameInput').value.trim();
    const email = document.getElementById('profileEmailInput').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    if (!name) { showNotification('Informe seu nome', 'error'); return; }

    // Update auth storage
    const user = getUser();
    if (user) {
        user.name = name;
        user.email = email;
        const storage = localStorage.getItem('dashboardpro_auth') ? localStorage : sessionStorage;
        storage.setItem('dashboardpro_auth', JSON.stringify(user));
    }
    localStorage.setItem('dashboardpro_profile', JSON.stringify({ bio }));
    initUserUI();
    showNotification('Perfil atualizado!', 'success');
    addActivity('user-check', `Perfil atualizado`);
}

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => {
        if (l.getAttribute('onclick')?.includes(`'${pageId}'`)) l.classList.add('active');
    });

    // Close mobile menu
    document.getElementById('navMenu')?.classList.remove('mobile-open');

    if (pageId === 'tasks') updateTasksCounter();
    if (pageId === 'dashboard') { loadStats(); updateGreeting(getUser()?.name || 'Usuário'); }
    if (pageId === 'profile') updateProfileStats();
    if (pageId === 'investments') renderInvestmentCharts();
}

function updateProfileStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('profileTotalTasks', total);
    el('profileCompletedTasks', completed);
    el('profileCompletionRate', rate + '%');
}

// ===== THEME (fixed dark) =====
function initializeTheme() {}
function toggleTheme() {}

// ===== TAB NAVIGATION =====
function showTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event?.target) event.target.classList.add('active');
    if (tabId === 'overview') loadStats();
}

function showAccountTab(tabId) {
    // Hide all account tabs inside the account page
    document.querySelectorAll('#account .tab-pane').forEach(p => p.classList.remove('active'));
    // Show selected
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.add('active');
    // Update active state on buttons inside the account page specifically
    const tabsContainer = document.querySelector('#account .tabs');
    if (tabsContainer) {
        tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    }
    if (event?.target) event.target.classList.add('active');
}

// ===== API & HEADERS =====
function getAuthHeaders() {
    const user = getUser();
    const token = user?.token || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ===== STATS =====
let stats = null;
async function loadStats() {
    try {
        const r = await fetch(`${API_URL}/stats`, { headers: getAuthHeaders() });
        if (r.ok) { stats = await r.json(); updateStatsCards(); renderStatusChart(); renderPriorityChart(); }
        else if (r.status === 401 || r.status === 403) handleLogout();
    } catch (e) { console.error('Stats error:', e); }
}

function updateStatsCards() {
    if (!stats) return;
    
    // Atualizar aba Tarefas do Dashboard
    const totalEl = document.getElementById('dashTotalTasks');
    if (totalEl) totalEl.textContent = stats.totalTasks;
    const completedEl = document.getElementById('dashCompletedTasks');
    if (completedEl) completedEl.textContent = stats.completedTasks;
    const completedPctEl = document.getElementById('dashCompletedPct');
    if (completedPctEl) completedPctEl.textContent = stats.completionRate + '% completo';
    
    const pendingEl = document.getElementById('dashPendingTasks');
    if (pendingEl) pendingEl.textContent = stats.pendingTasks;
    const pendingPctEl = document.getElementById('dashPendingPct');
    if (pendingPctEl) pendingPctEl.textContent = (100 - stats.completionRate) + '% restante';

    // Atualizar aba Visão Geral (Misto) do Dashboard
    const mixTasksEl = document.getElementById('dashMixTasks');
    if (mixTasksEl) mixTasksEl.textContent = stats.pendingTasks;

    // Calcular tarefas atrasadas a partir do array de tarefas local
    let overdueCount = 0;
    if (typeof tasks !== 'undefined' && Array.isArray(tasks)) {
        const today = new Date();
        const tzOffset = today.getTimezoneOffset() * 60000;
        const localTodayStr = new Date(today.getTime() - tzOffset).toISOString().split('T')[0];

        tasks.forEach(t => {
            if (t.due_date) {
                const dueStrVal = t.due_date.split('T')[0];
                const isCompleted = t.completed == 1 || t.completed === true;
                if (!isCompleted && dueStrVal < localTodayStr) {
                    overdueCount++;
                }
            }
        });
    }

    const overdueEl = document.getElementById('dashOverdueTasks');
    if (overdueEl) overdueEl.textContent = overdueCount;
    const overdueMetaEl = document.getElementById('dashOverdueMeta');
    if (overdueMetaEl) overdueMetaEl.textContent = overdueCount > 0 ? 'Requer atenção' : 'Sem atrasos';
}

// ===== CHARTS =====
let statusChartInstance = null;
function renderStatusChart() {
    if (!stats) return;
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    if (statusChartInstance) statusChartInstance.destroy();
    
    const { completedTasks, pendingTasks } = stats;
    
    const config = {
        type: 'doughnut',
        data: {
            labels: ['Concluídas', 'Pendentes'],
            datasets: [{
                data: [completedTasks, pendingTasks],
                backgroundColor: ['#6c5ce7', '#ff6b6b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f0f0f5', padding: 20 } },
                tooltip: { backgroundColor: 'rgba(30, 30, 40, 0.9)', titleColor: '#f0f0f5', bodyColor: '#f0f0f5' }
            },
            cutout: '70%'
        }
    };

    if (ctx) statusChartInstance = new Chart(ctx, config);

    if (window.mixStatusChartInstance) window.mixStatusChartInstance.destroy();
    const mixCtx = document.getElementById('mixStatusChart');
    if (mixCtx) window.mixStatusChartInstance = new Chart(mixCtx, config);
}

let priorityChartInstance = null;
function renderPriorityChart() {
    if (!stats) return;
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;
    
    if (priorityChartInstance) priorityChartInstance.destroy();
    
    const { low, medium, high } = stats.tasksByPriority;
    
    priorityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Baixa', 'Média', 'Alta'],
            datasets: [{
                label: 'Tarefas',
                data: [low, medium, high],
                backgroundColor: ['#74b9ff', '#fdcb6e', '#ff6b6b'],
                borderRadius: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(30, 30, 40, 0.9)', titleColor: '#f0f0f5', bodyColor: '#f0f0f5' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#8a8a9a', stepSize: 1 } },
                x: { grid: { display: false }, ticks: { color: '#8a8a9a' } }
            }
        }
    });
}

// ===== TASKS =====
async function loadTasks() {
    const listEl = document.getElementById('tasksList');
    const boardEl = document.getElementById('kanbanBoard');
    // Show Skeletons
    if (listEl) listEl.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
    
    try {
        const r = await fetch(`${API_URL}/tasks`, { headers: getAuthHeaders() });
        if (r.ok) { tasks = await r.json(); renderTasks(); updateTasksCounter(); }
        else if (r.status === 401 || r.status === 403) { handleLogout(); }
        else {
            if(listEl) listEl.innerHTML = '<div class="notif-empty">Erro ao carregar tarefas.</div>';
            showNotification('Erro ao carregar tarefas', 'error');
        }
    } catch (e) {
        console.error('Tasks error:', e);
        if(listEl) listEl.innerHTML = '<div class="notif-empty">Erro de conexão. Verifique o backend.</div>';
        showNotification('Erro de conexão. Verifique o backend.', 'error');
    }
}

function showAddTaskForm() {
    document.getElementById('taskForm')?.classList.remove('hidden');
    document.getElementById('taskTitle')?.focus();
}

let editingTaskId = null;

function hideAddTaskForm() {
    document.getElementById('taskForm')?.classList.add('hidden');
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskPriority').value = 'medium';
    if(document.getElementById('taskCategory')) document.getElementById('taskCategory').value = 'Geral';
    if(document.getElementById('taskDueDate')) document.getElementById('taskDueDate').value = '';
    
    // Reset editing state
    editingTaskId = null;
    const btnSubmit = document.getElementById('btnSubmitTask');
    if(btnSubmit) btnSubmit.textContent = 'Adicionar Tarefa';
    const formTitle = document.getElementById('taskFormTitle');
    if(formTitle) formTitle.textContent = 'Nova Tarefa';
}

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const category = document.getElementById('taskCategory')?.value || 'Geral';
    const due_date = document.getElementById('taskDueDate')?.value || null;
    
    if (!title) { showNotification('Informe o título da tarefa', 'error'); return; }

    const method = editingTaskId ? 'PUT' : 'POST';
    const url = editingTaskId ? `${API_URL}/tasks/${editingTaskId}` : `${API_URL}/tasks`;
    
    let bodyData = { title, description, priority, category, due_date };
    if (editingTaskId) {
        const existingTask = tasks.find(t => t.id === editingTaskId);
        bodyData.completed = existingTask ? existingTask.completed : false;
    }

    fetch(url, {
        method: method, headers: getAuthHeaders(),
        body: JSON.stringify(bodyData)
    }).then(r => {
        if (r.ok) {
            const isEditing = !!editingTaskId;
            hideAddTaskForm(); loadTasks(); loadStats();
            showNotification(isEditing ? 'Tarefa atualizada!' : 'Tarefa criada com sucesso!', 'success');
            if(!isEditing) {
                addActivity('check-circle', `Tarefa criada: <strong>${escapeHtml(title)}</strong>`);
                addNotif('check-circle', `Nova tarefa: ${title}`);
            }
        } else if (r.status === 401 || r.status === 403) handleLogout();
        else showNotification('Erro ao salvar tarefa', 'error');
    }).catch(() => showNotification('Erro de conexão', 'error'));
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    editingTaskId = id;
    showAddTaskForm();
    
    const formTitle = document.getElementById('taskFormTitle');
    if(formTitle) formTitle.textContent = 'Editar Tarefa';
    
    const btnSubmit = document.getElementById('btnSubmitTask');
    if(btnSubmit) btnSubmit.textContent = 'Atualizar Tarefa';

    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority || 'medium';
    if(document.getElementById('taskCategory')) document.getElementById('taskCategory').value = task.category || 'Geral';
    
    if(document.getElementById('taskDueDate') && task.due_date) {
        // Formato para input type="date" é YYYY-MM-DD
        document.getElementById('taskDueDate').value = task.due_date.split('T')[0];
    }
}

function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    showConfirm('trash-2', 'Deletar Tarefa', `Deseja deletar "${task?.title || 'esta tarefa'}"?`, () => {
        fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => {
            if (r.ok) {
                loadTasks(); loadStats();
                showNotification('Tarefa deletada!', 'success');
                addActivity('trash-2', `Tarefa deletada: <strong>${escapeHtml(task?.title || '')}</strong>`);
            } else if (r.status === 401 || r.status === 403) handleLogout();
        }).catch(() => showNotification('Erro de conexão', 'error'));
    });
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const isCompleted = task.completed == 1 || task.completed === true;

    fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ ...task, completed: !isCompleted })
    }).then(r => {
        if (r.ok) {
            loadTasks(); loadStats();
            const msg = !isCompleted ? 'concluída' : 'reaberta';
            showNotification(`Tarefa ${msg}!`, 'success');
            addActivity(!isCompleted ? 'check-circle' : 'refresh-cw', `Tarefa ${msg}: <strong>${escapeHtml(task.title)}</strong>`);
            if (!isCompleted) addNotif('check-circle', `Tarefa concluída: ${task.title}`);
        } else if (r.status === 401 || r.status === 403) handleLogout();
    }).catch(() => showNotification('Erro de conexão', 'error'));
}

function filterTasks(filter) {
    currentFilter = filter;
    let filtered = tasks;
    if (filter === 'pending') filtered = tasks.filter(t => !t.completed);
    else if (filter === 'completed') filtered = tasks.filter(t => t.completed);
    document.querySelectorAll('.task-tab-btn').forEach(b => b.classList.remove('active'));
    if (event?.target) event.target.classList.add('active');
    renderFilteredTasks(filtered);
}

function renderTasks() { 
    renderFilteredTasks(tasks); 
    if (currentTaskView === 'kanban') renderKanban(tasks);
    if (currentTaskView === 'calendar') renderCalendar(tasks);
}

function renderFilteredTasks(list) {
    const el = document.getElementById('tasksList');
    if (list.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);">
            <p style="font-size:2.5rem;margin-bottom:1rem;display:flex;justify-content:center;"><i data-lucide="file-text" style="width:40px;height:40px;"></i></p>
            <p style="font-size:1.1rem;">Nenhuma tarefa encontrada</p>
            <p style="margin-top:0.5rem;font-size:0.9rem;">Crie uma nova tarefa para começar</p></div>`;
        if(typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    // Pegar data de hoje formato YYYY-MM-DD local
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localTodayStr = new Date(today.getTime() - tzOffset).toISOString().split('T')[0];

    el.innerHTML = list.map(t => {
        const date = new Date(t.created_at).toLocaleDateString('pt-BR');
        let dueStr = '';
        if (t.due_date) {
            const dueStrVal = t.due_date.split('T')[0];
            const isCompleted = t.completed == 1 || t.completed === true;
            const isOverdue = !isCompleted && dueStrVal < localTodayStr;
            const dueDateObj = new Date(dueStrVal + 'T12:00:00'); // Evita timezone offset bug local
            dueStr = `<span style="color:${isOverdue ? '#ff6b6b' : 'var(--text-muted)'};font-size:0.85rem;margin-left:0.5rem;display:inline-flex;align-items:center;gap:4px;" title="Prazo"><i data-lucide="clock" style="width:12px;height:12px"></i> ${dueDateObj.toLocaleDateString('pt-BR')} ${isOverdue ? '(Atrasada)' : ''}</span>`;
        }
        const isCompleted = t.completed == 1 || t.completed === true;
        return `<div class="task-item ${isCompleted ? 'completed' : ''}">
            <div class="task-content">
                <h3 class="task-title">${escapeHtml(t.title)}</h3>
                ${t.description ? `<p class="task-description">${escapeHtml(t.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="task-priority ${t.priority}">${getPriorityLabel(t.priority)}</span>
                    <span style="background:rgba(108,92,231,0.15);color:#a29bfe;padding:2px 8px;border-radius:12px;font-size:0.75rem;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="folder" style="width:12px;height:12px"></i> ${escapeHtml(t.category || 'Geral')}</span>
                    <span style="color:var(--text-muted);font-size:0.85rem;margin-left:0.5rem;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${date}</span>
                    ${dueStr}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn complete" onclick="toggleTask(${t.id})" title="${isCompleted ? 'Reabrir' : 'Concluir'}"><i data-lucide="${isCompleted ? 'check-circle' : 'circle'}" style="width:18px;height:18px"></i></button>
                <button class="task-btn edit" onclick="editTask(${t.id})" title="Editar" style="color: #0984e3"><i data-lucide="edit-2" style="width:18px;height:18px"></i></button>
                <button class="task-btn delete" onclick="deleteTask(${t.id})" title="Deletar"><i data-lucide="trash-2" style="width:18px;height:18px"></i></button>
            </div>
        </div>`;
    }).join('');
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function exportTasksCSV() {
    if (!tasks || tasks.length === 0) {
        showNotification('Nenhuma tarefa para exportar', 'error');
        return;
    }
    const headers = ['ID', 'Título', 'Descrição', 'Prioridade', 'Categoria', 'Data Criação', 'Prazo', 'Status'];
    const rows = tasks.map(t => [
        t.id, 
        `"${t.title.replace(/"/g, '""')}"`, 
        `"${(t.description || '').replace(/"/g, '""')}"`, 
        t.priority, 
        t.category, 
        new Date(t.created_at).toLocaleDateString('pt-BR'), 
        t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : 'Sem prazo', 
        t.completed ? 'Concluída' : 'Pendente'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `minhas_tarefas_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showNotification('Exportação iniciada!', 'success');
}

function updateTasksCounter() {
    const all = tasks.length, pending = tasks.filter(t => !t.completed).length, done = tasks.filter(t => t.completed).length;
    const btns = document.querySelectorAll('.task-tab-btn');
    if (btns.length >= 3) { btns[0].textContent = `Todas (${all})`; btns[1].textContent = `Pendentes (${pending})`; btns[2].textContent = `Concluídas (${done})`; }
}

function getPriorityLabel(p) { return { low: 'Baixa', medium: 'Média', high: 'Alta' }[p] || p; }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// ===== KANBAN VIEW & DRAG & DROP =====
let currentTaskView = 'list';

function switchTaskView(view) {
    currentTaskView = view;
    document.getElementById('btnViewList').classList.toggle('active', view === 'list');
    document.getElementById('btnViewKanban').classList.toggle('active', view === 'kanban');
    document.getElementById('btnViewCalendar')?.classList.toggle('active', view === 'calendar');
    
    document.getElementById('tasksList').style.display = view === 'list' ? 'block' : 'none';
    document.getElementById('kanbanBoard').classList.toggle('active', view === 'kanban');
    document.getElementById('calendarView')?.classList.toggle('active', view === 'calendar');
    
    if (view === 'kanban') renderKanban(tasks);
    if (view === 'calendar') renderCalendar(tasks);
}

function renderKanban(list) {
    const todoList = list.filter(t => !t.completed);
    const doneList = list.filter(t => t.completed);
    
    document.getElementById('kbCountTodo').textContent = todoList.length;
    document.getElementById('kbCountDone').textContent = doneList.length;
    
    const createKanbanItem = (t) => {
        const date = new Date(t.created_at).toLocaleDateString('pt-BR');
        let dueStr = '';
        if (t.due_date) {
            const due = new Date(t.due_date);
            const isOverdue = !t.completed && due < new Date(new Date().setHours(0,0,0,0));
            if (isOverdue) dueStr = `<span style="color:#ff6b6b;font-size:0.75rem;margin-left:0.5rem;" title="Atrasada!">⏰</span>`;
        }
        return `<div class="task-item ${t.completed ? 'completed' : ''}" draggable="true" data-id="${t.id}" ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)">
            <div class="task-content">
                <h3 class="task-title">${escapeHtml(t.title)}</h3>
                <div class="task-meta" style="margin-top:0.5rem; flex-wrap:wrap; gap:4px;">
                    <span class="task-priority ${t.priority}">${getPriorityLabel(t.priority)}</span>
                    <span style="background:rgba(108,92,231,0.15);color:#a29bfe;padding:2px 8px;border-radius:12px;font-size:0.7rem;">${escapeHtml(t.category || 'Geral')}</span>
                    ${dueStr}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn delete" onclick="deleteTask(${t.id})" title="Deletar"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
            </div>
        </div>`;
    };

    document.getElementById('kbTodo').innerHTML = todoList.map(createKanbanItem).join('');
    document.getElementById('kbDone').innerHTML = doneList.map(createKanbanItem).join('');
    
    setupDragAndDrop();
}

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItem.dataset.id);
    setTimeout(() => draggedItem.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
    draggedItem.classList.remove('dragging');
    draggedItem = null;
    document.querySelectorAll('.kanban-items').forEach(c => c.classList.remove('drag-over'));
}

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-items');
    columns.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', e => {
            col.classList.remove('drag-over');
        });
        col.addEventListener('drop', e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const id = e.dataTransfer.getData('text/plain');
            const targetStatus = parseInt(col.dataset.status, 10);
            
            const task = tasks.find(t => t.id == id);
            if (task && task.completed !== (targetStatus === 1)) {
                // Call the API or toggle function to update
                toggleTask(task.id); 
            }
        });
    });
}

// ===== CALENDAR VIEW =====
let currentCalendarDate = new Date();

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar(tasks);
}

function renderCalendar(list) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('calendarMonthTitle').textContent = `${monthNames[month]} ${year}`;
    
    // Days of week header
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-day-header';
        div.textContent = d;
        grid.appendChild(div);
    });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    // Empty cells before start of month
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }
    
    // Group tasks by date string YYYY-MM-DD
    const tasksByDate = {};
    list.forEach(t => {
        const d = new Date(t.created_at);
        // adjust date format for simple comparison (local timezone)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
        tasksByDate[dateStr].push(t);
    });
    
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            div.classList.add('today');
        }
        
        const dateNum = document.createElement('div');
        dateNum.className = 'calendar-date-num';
        dateNum.textContent = i;
        div.appendChild(dateNum);
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        if (tasksByDate[dateStr]) {
            tasksByDate[dateStr].forEach(t => {
                const tDiv = document.createElement('div');
                tDiv.className = `calendar-task ${t.completed ? 'done' : 'pending'}`;
                tDiv.textContent = t.title;
                tDiv.title = t.title;
                tDiv.onclick = () => toggleTask(t.id);
                div.appendChild(tDiv);
            });
        }
        
        grid.appendChild(div);
    }
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:20px;right:20px;padding:1rem 1.5rem;border-radius:12px;
        background:${type === 'success' ? '#00b894' : type === 'error' ? '#ff6b6b' : '#6c5ce7'};
        color:white;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;
        animation:slideIn 0.3s ease-out;font-family:'Inter',sans-serif;font-size:0.9rem;backdrop-filter:blur(10px);`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { el.style.animation = 'slideOut 0.3s ease-out'; setTimeout(() => el.remove(), 300); }, 3000);
}

function addNotif(icon, text) {
    notifications.unshift({ icon, text, time: new Date() });
    if (notifications.length > 20) notifications.pop();
    updateNotifUI();
}

function updateNotifUI() {
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');
    if (badge) { badge.textContent = notifications.length; badge.style.display = notifications.length > 0 ? 'flex' : 'none'; }
    if (list) {
        if (notifications.length === 0) { list.innerHTML = '<div class="notif-empty">Sem notificações</div>'; return; }
        list.innerHTML = notifications.map(n => {
            const ago = timeAgo(n.time);
            return `<div class="notif-item"><span class="notif-icon"><i data-lucide="${n.icon}"></i></span><div class="notif-text"><span>${n.text}</span><div class="notif-time">${ago}</div></div></div>`;
        }).join('');
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notifPanel');
    panel?.classList.toggle('open');
    document.getElementById('userDropdown')?.classList.remove('open');
}

function clearNotifications() {
    notifications = [];
    updateNotifUI();
    document.getElementById('notifPanel')?.classList.remove('open');
}

// ===== ACTIVITY LOG =====
function addActivity(icon, text) {
    activityLog.unshift({ icon, text, time: new Date() });
    if (activityLog.length > 15) activityLog.pop();
    updateActivityUI();
}

function updateActivityUI() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    if (activityLog.length === 0) { feed.innerHTML = '<div class="notif-empty">Nenhuma atividade ainda</div>'; return; }
    feed.innerHTML = activityLog.slice(0, 8).map(a =>
        `<div class="activity-item"><span class="act-icon"><i data-lucide="${a.icon}" style="width:16px;height:16px"></i></span><div><div class="act-text">${a.text}</div><div class="act-time">${timeAgo(a.time)}</div></div></div>`
    ).join('');
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function timeAgo(date) {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return 'agora mesmo';
    if (s < 3600) return Math.floor(s / 60) + ' min atrás';
    if (s < 86400) return Math.floor(s / 3600) + 'h atrás';
    return Math.floor(s / 86400) + 'd atrás';
}

// ===== USER MENU =====
function toggleUserMenu() {
    document.getElementById('userDropdown')?.classList.toggle('open');
    document.getElementById('notifPanel')?.classList.remove('open');
}

function toggleMobileMenu() {
    document.getElementById('navMenu')?.classList.toggle('mobile-open');
}

// ===== SEARCH =====
function openSearch() { document.getElementById('searchModal')?.classList.add('open'); document.getElementById('searchInput')?.focus(); }
function closeSearch() { document.getElementById('searchModal')?.classList.remove('open'); document.getElementById('searchInput').value = ''; document.getElementById('searchResults').innerHTML = ''; }

function handleSearch(query) {
    const lowerQuery = query.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    if (!query.trim()) { resultsContainer.innerHTML = ''; return; }

    // 1. Search Navigation
    const navItems = [
        { icon: 'home', name: 'Home', desc: 'Página inicial', page: 'home' },
        { icon: 'layout-dashboard', name: 'Dashboard', desc: 'Métricas e gráficos', page: 'dashboard' },
        { icon: 'file-text', name: 'Tarefas', desc: 'Gerenciar tarefas', page: 'tasks' },
        { icon: 'user', name: 'Perfil', desc: 'Suas informações', page: 'profile' },
        { icon: 'help-circle', name: 'Ajuda', desc: 'Dicas e guias', page: 'help' }
    ];

    let html = '';
    
    navItems.forEach(item => {
        if (item.name.toLowerCase().includes(lowerQuery) || item.desc.toLowerCase().includes(lowerQuery)) {
            html += `
            <div class="search-result-item" onclick="showPage('${item.page}');closeSearch()">
                <span class="result-icon"><i data-lucide="${item.icon}" style="width:16px;height:16px"></i></span>
                <div>
                    <div class="result-title">${item.name}</div>
                    <div class="result-desc">${item.desc}</div>
                </div>
            </div>`;
        }
    });

    tasks.forEach(t => {
        if (t.title.toLowerCase().includes(lowerQuery) || (t.description || '').toLowerCase().includes(lowerQuery) || (t.category || '').toLowerCase().includes(lowerQuery)) {
            html += `
            <div class="search-result-item" onclick="showPage('tasks');closeSearch()">
                <span class="result-icon"><i data-lucide="${t.completed ? 'check-circle' : 'file-text'}" style="width:16px;height:16px"></i></span>
                <div>
                    <div class="result-title">${escapeHtml(t.title)}</div>
                    <div class="result-desc">${t.completed ? 'Concluída' : 'Pendente'} ${t.category ? ` • ${t.category}` : ''}</div>
                </div>
            </div>`;
        }
    });

    if (!html) html = '<div class="search-no-results">Nenhum resultado para "' + escapeHtml(query) + '"</div>';
    resultsContainer.innerHTML = html;
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

// ===== CONFIRM MODAL =====
function showConfirm(icon, title, message, callback) {
    document.getElementById('confirmIcon').innerHTML = `<i data-lucide="${icon}" style="width:24px;height:24px;"></i>`;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirmModal')?.classList.add('open');
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function closeConfirm(confirmed) {
    document.getElementById('confirmModal')?.classList.remove('open');
    if (confirmed && confirmCallback) confirmCallback();
    confirmCallback = null;
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl+K = Search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    // ESC = Close modals
    if (e.key === 'Escape') {
        closeSearch();
        closeConfirm(false);
        document.getElementById('notifPanel')?.classList.remove('open');
        document.getElementById('userDropdown')?.classList.remove('open');
    }
    // N = New task (when not in input)
    if (e.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        const tasksPage = document.getElementById('tasks');
        if (tasksPage?.classList.contains('active')) { e.preventDefault(); showAddTaskForm(); }
    }
});

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.notification-wrap')) document.getElementById('notifPanel')?.classList.remove('open');
    if (!e.target.closest('.user-menu-wrap')) document.getElementById('userDropdown')?.classList.remove('open');
});

// ===== ANIMATION STYLES =====
const styleEl = document.createElement('style');
styleEl.textContent = `
    @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
`;
document.head.appendChild(styleEl);

// ===== SETTINGS =====
function saveSettings() {
    const settings = {
        animations: document.getElementById('settingAnimations')?.checked ?? true,
        gradients: document.getElementById('settingGradients')?.checked ?? true,
        notifTasks: document.getElementById('settingNotifTasks')?.checked ?? true,
        notifComplete: document.getElementById('settingNotifComplete')?.checked ?? true,
        notifSound: document.getElementById('settingNotifSound')?.checked ?? false,
        notifBadge: document.getElementById('settingNotifBadge')?.checked ?? true,
        publicProfile: document.getElementById('settingPublicProfile')?.checked ?? true,
        shareData: document.getElementById('settingShareData')?.checked ?? false,
        remember: document.getElementById('settingRemember')?.checked ?? true,
        language: document.getElementById('settingLanguage')?.value ?? 'pt-BR',
        dateFormat: document.getElementById('settingDateFormat')?.value ?? 'dd/mm/yyyy',
        timezone: document.getElementById('settingTimezone')?.value ?? '-3',
    };
    localStorage.setItem('dashboardpro_settings', JSON.stringify(settings));
    showNotification('Configurações salvas com sucesso!', 'success');
    addActivity('settings', 'Configurações atualizadas');
}

function loadSettings() {
    const raw = localStorage.getItem('dashboardpro_settings');
    if (!raw) return;
    try {
        const s = JSON.parse(raw);
        const set = (id, val) => { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = val; else el.value = val; } };
        set('settingAnimations', s.animations);
        set('settingGradients', s.gradients);
        set('settingNotifTasks', s.notifTasks);
        set('settingNotifComplete', s.notifComplete);
        set('settingNotifSound', s.notifSound);
        set('settingNotifBadge', s.notifBadge);
        set('settingPublicProfile', s.publicProfile);
        set('settingShareData', s.shareData);
        set('settingRemember', s.remember);
        set('settingLanguage', s.language);
        set('settingDateFormat', s.dateFormat);
        set('settingTimezone', s.timezone);
    } catch (e) { console.error('Settings load error:', e); }
}

function resetSettings() {
    showConfirm('rotate-ccw', 'Restaurar Padrões', 'Todas as configurações voltarão ao padrão. Continuar?', () => {
        localStorage.removeItem('dashboardpro_settings');
        location.reload();
    });
}

function exportData() {
    const data = {
        tasks, settings: JSON.parse(localStorage.getItem('dashboardpro_settings') || '{}'),
        profile: JSON.parse(localStorage.getItem('dashboardpro_profile') || '{}'),
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dashboardpro_dados.json'; a.click();
    URL.revokeObjectURL(url);
    showNotification('Dados exportados com sucesso!', 'success');
    addActivity('download', 'Dados exportados');
}

function clearAllData() {
    showConfirm('trash', 'Limpar Cache', 'Isso removerá dados locais (configurações e perfil). Tarefas no servidor serão mantidas.', () => {
        localStorage.removeItem('dashboardpro_settings');
        localStorage.removeItem('dashboardpro_profile');
        showNotification('Cache local limpo!', 'success');
        addActivity('trash', 'Cache local limpo');
    });
}

function confirmDeleteAccount() {
    showConfirm('user-x', 'Excluir Conta', 'Esta ação é IRREVERSÍVEL. Todos os seus dados serão perdidos. Deseja continuar?', () => {
        localStorage.clear();
        sessionStorage.clear();
        showNotification('Conta excluída.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    });
}

// ===== AI ASSISTANT =====
function toggleAIChat() {
    const panel = document.getElementById('aiChatPanel');
    if (panel) {
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            document.getElementById('aiChatInput').focus();
        }
    }
}

function handleAIChatKeyPress(e) {
    if (e.key === 'Enter') sendAIMessage();
}

function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const msg = input.value.trim();
    if (!msg) return;

    // Append User message
    const body = document.getElementById('aiChatBody');
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-message user';
    userDiv.textContent = msg;
    body.appendChild(userDiv);
    input.value = '';
    body.scrollTop = body.scrollHeight;

    // Add typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message bot';
    typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    body.appendChild(typingDiv);
    body.scrollTop = body.scrollHeight;

    // Simulate AI response
    setTimeout(() => {
        body.removeChild(typingDiv);
        const botDiv = document.createElement('div');
        botDiv.className = 'ai-message bot';
        
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('tarefa') && lowerMsg.includes('criar')) {
            botDiv.innerHTML = 'Para criar uma tarefa, você pode ir até a aba <b>Tarefas</b> e clicar no botão azul "+ Nova Tarefa". Posso te ajudar com mais alguma coisa?';
        } else if (lowerMsg.includes('obrigado') || lowerMsg.includes('vlw')) {
            botDiv.innerHTML = 'Por nada! Estou sempre aqui para otimizar sua produtividade.';
        } else if (lowerMsg.includes('estatística') || lowerMsg.includes('dashboard')) {
            botDiv.innerHTML = 'Suas estatísticas estão mostrando que você tem ' + stats?.completedTasks + ' tarefas concluídas de ' + stats?.totalTasks + '. Continue o ótimo trabalho!';
        } else {
            const responses = [
                "Entendi! Como a IA ainda está em fase de testes, minha capacidade é um pouco limitada no momento. Mas logo poderei organizar suas tarefas sozinho!",
                "Interessante... Sugiro focar nas tarefas de <b>Alta prioridade</b> hoje para manter seu dashboard no verde.",
                "Claro! O DashboardPro foi criado para deixar isso tudo mais fluido para você."
            ];
            botDiv.innerHTML = responses[Math.floor(Math.random() * responses.length)];
        }
        body.appendChild(botDiv);
        body.scrollTop = body.scrollHeight;
    }, 1500);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    initUserUI();
    loadSettings();
    showPage('dashboard');
    loadTasks();
    loadStats();
    loadFinances();

    document.getElementById('taskTitle')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Welcome notification
    const user = getUser();
    addNotif('hand', `Bem-vindo de volta, ${user?.name || 'Usuário'}!`);
    addActivity('key', 'Login realizado');
});

// ===== REAL-TIME MARKET DATA (AWESOMEAPI + B3 STOCKS) =====
let invCharts = [];
let marketInterval = null;

// Mocked B3 Stocks (Base prices)
const b3Stocks = [
    { symbol: 'PETR4', name: 'Petrobras', basePrice: 38.45 },
    { symbol: 'VALE3', name: 'Vale S.A.', basePrice: 62.10 },
    { symbol: 'ITUB4', name: 'Itaú Unibanco', basePrice: 33.80 },
    { symbol: 'BBAS3', name: 'Banco do Brasil', basePrice: 27.40 },
    { symbol: 'BBDC4', name: 'Bradesco', basePrice: 14.15 },
    { symbol: 'WEGE3', name: 'WEG S.A.', basePrice: 42.50 },
    { symbol: 'ABEV3', name: 'Ambev S.A.', basePrice: 11.90 },
    { symbol: 'MGLU3', name: 'Magaz. Luiza', basePrice: 1.45 }
];

async function fetchRealTimeMarketData() {
    try {
        const btn = document.querySelector('button[onclick="fetchRealTimeMarketData()"]');
        if (btn) btn.innerHTML = '<i data-lucide="refresh-cw" style="width:16px;height:16px;vertical-align:text-bottom;"></i> Atualizando...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // 1. Fetch Real Currencies (AwesomeAPI)
        const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
        const data = await res.json();

        const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        const getPct = (pct) => `<span style="color:${pct > 0 ? '#55efc4' : pct < 0 ? '#ff7675' : '#dfe6e9'}">${pct}%</span>`;

        document.getElementById('market-usd-val').textContent = formatBRL(data.USDBRL.bid);
        document.getElementById('market-usd-var').innerHTML = getPct(data.USDBRL.pctChange);
        document.getElementById('market-eur-val').textContent = formatBRL(data.EURBRL.bid);
        document.getElementById('market-eur-var').innerHTML = getPct(data.EURBRL.pctChange);
        document.getElementById('market-btc-val').textContent = formatBRL(data.BTCBRL.bid);
        document.getElementById('market-btc-var').innerHTML = getPct(data.BTCBRL.pctChange);

        // 2. Generate Real-time Stock Variations (B3 Mock due to API Token requirements)
        const currentStocks = b3Stocks.map(s => {
            // Random daily variation between -3% and +3%
            const pct = (Math.random() * 6 - 3).toFixed(2);
            const price = (s.basePrice * (1 + pct / 100)).toFixed(2);
            return { ...s, price, pct };
        });

        const tickerHtml = currentStocks.map(s => `
            <div class="stock-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="stock-symbol">${s.symbol}</span>
                    <span class="stock-var" style="color:${s.pct > 0 ? '#55efc4' : '#ff7675'}">${s.pct > 0 ? '▲' : '▼'} ${s.pct}%</span>
                </div>
                <div class="stock-name">${s.name}</div>
                <div class="stock-price">R$ ${s.price.replace('.', ',')}</div>
            </div>
        `).join('');
        
        const tickerContainer = document.getElementById('stock-ticker');
        if(tickerContainer) tickerContainer.innerHTML = tickerHtml;

        // 3. Update Unified Table
        const tbody = document.getElementById('market-table-body');
        if (tbody) {
            let tableHtml = [data.USDBRL, data.EURBRL, data.BTCBRL].map(item => {
                const name = item.name.split('/')[0];
                return `<tr>
                    <td><strong>${name}</strong></td>
                    <td>${formatBRL(item.bid)}</td>
                    <td><small style="color:#55efc4">↑ ${formatBRL(item.high)}</small></td>
                    <td><small style="color:#ff7675">↓ ${formatBRL(item.low)}</small></td>
                </tr>`;
            }).join('');
            
            tableHtml += currentStocks.slice(0, 4).map(s => `<tr>
                <td><strong>${s.symbol}</strong></td>
                <td>R$ ${s.price.replace('.', ',')}</td>
                <td><small style="color:#55efc4">↑ R$ ${(s.price * 1.02).toFixed(2).replace('.', ',')}</small></td>
                <td><small style="color:#ff7675">↓ R$ ${(s.price * 0.98).toFixed(2).replace('.', ',')}</small></td>
            </tr>`).join('');

            tbody.innerHTML = tableHtml;
        }

        // 4. Render Charts
        renderMarketCharts(data, currentStocks);

        if (btn) { 
            btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;vertical-align:text-bottom;"></i> Atualizado'; 
            if(typeof lucide !== 'undefined') lucide.createIcons();
            setTimeout(() => { 
                btn.innerHTML = '<i data-lucide="refresh-cw" style="width:16px;height:16px;vertical-align:text-bottom;"></i> Atualizar Cotações'; 
                if(typeof lucide !== 'undefined') lucide.createIcons();
            }, 2000); 
        }
    } catch (err) {
        console.error("Market API Error", err);
        showNotification('Erro ao buscar dados do mercado', 'error');
    }
}

function renderMarketCharts(data, stocks) {
    invCharts.forEach(c => c.destroy());
    invCharts = [];
    
    const commonSparklineOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 0 } },
        elements: { point: { radius: 0 }, line: { tension: 0.4, borderWidth: 3 } }
    };

    const createWalk = (base) => {
        let w = [base];
        for(let i=0; i<6; i++) w.push(w[i] * (1 + (Math.random() * 0.02 - 0.01)));
        return w;
    };

    ['invChart1', 'invChart2', 'invChart3'].forEach((id, idx) => {
        const ctx = document.getElementById(id);
        if (ctx) {
            const bases = [parseFloat(data.USDBRL.bid), parseFloat(data.EURBRL.bid), parseFloat(data.BTCBRL.bid)];
            invCharts.push(new Chart(ctx, {
                type: 'line',
                data: { labels: ['1','2','3','4','5','6','7'], datasets: [{ data: createWalk(bases[idx]), borderColor: '#ffffff' }] },
                options: commonSparklineOptions
            }));
        }
    });

    const barCtx = document.getElementById('invBarChart');
    if (barCtx) {
        invCharts.push(new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Dólar', 'Euro', 'Bitcoin', stocks[0].symbol, stocks[1].symbol],
                datasets: [
                    { 
                        label: 'Variação % Hoje', 
                        data: [parseFloat(data.USDBRL.pctChange), parseFloat(data.EURBRL.pctChange), parseFloat(data.BTCBRL.pctChange), parseFloat(stocks[0].pct), parseFloat(stocks[1].pct)], 
                        backgroundColor: (ctx) => ctx.raw > 0 ? '#00b894' : '#ff7675'
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(30, 30, 40, 0.9)', titleColor: '#f0f0f5', bodyColor: '#f0f0f5' }
                },
                scales: {
                    y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#8a8a9a', callback: v => v + '%' } },
                    x: { grid: { display: false }, ticks: { color: '#8a8a9a' } }
                }
            }
        }));
    }
}

function renderInvestmentCharts() {
    fetchRealTimeMarketData();
    if (!marketInterval) marketInterval = setInterval(fetchRealTimeMarketData, 30000);
}

// ========== FINANCES MODULE ==========
let transactions = [];
let financeChartInstance = null;

async function loadFinances() {
    try {
        // MIGRATION: Recupera dados antigos do localStorage e joga no banco
        const migrated = localStorage.getItem('dashboardpro_finances_migrated');
        if (!migrated) {
            const localData = localStorage.getItem('dashboardpro_finances');
            if (localData) {
                try {
                    const localTrans = JSON.parse(localData);
                    if (Array.isArray(localTrans) && localTrans.length > 0) {
                        for (const lt of localTrans) {
                            await fetch(`${API_URL}/transactions`, {
                                method: 'POST', headers: getAuthHeaders(),
                                body: JSON.stringify({
                                    description: lt.desc || lt.description || 'Sem descrição',
                                    amount: lt.amount,
                                    type: lt.type,
                                    category: lt.category,
                                    trans_date: lt.date ? lt.date.split('T')[0] : null
                                })
                            });
                        }
                    }
                } catch(e) {}
            }
            localStorage.setItem('dashboardpro_finances_migrated', 'true');
        }

        const r = await fetch(`${API_URL}/transactions`, { headers: getAuthHeaders() });
        if (r.ok) {
            transactions = await r.json();
            
            // Popula o filtro de meses
            const monthFilter = document.getElementById('financeMonthFilter');
            if (monthFilter) {
                const currentVal = monthFilter.value;
                monthFilter.innerHTML = '<option value="all">Todo o Período</option>';
                const months = new Set();
                transactions.forEach(t => {
                    const d = new Date(t.trans_date);
                    // YY-MM, exemplo: "2026-06"
                    const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                    months.add(mKey);
                });
                Array.from(months).sort().reverse().forEach(m => {
                    const [yyyy, mm] = m.split('-');
                    const dateObj = new Date(yyyy, parseInt(mm)-1);
                    const label = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    monthFilter.innerHTML += `<option value="${m}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
                });
                if (Array.from(months).includes(currentVal)) {
                    monthFilter.value = currentVal;
                } else if (months.size > 0 && currentVal === 'all') {
                    // Default to all, leave it as 'all'
                }
            }
            renderFinances();
        } else if (r.status === 401 || r.status === 403) handleLogout();
    } catch (e) {
        console.error('Error loading finances', e);
    }
}

function showTransactionModal() {
    document.getElementById('transactionModal').style.display = 'flex';
    document.getElementById('transactionModal').classList.add('open');
    // Default to today
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localToday = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
    const transDateInput = document.getElementById('transDate');
    if (transDateInput) transDateInput.value = localToday;
}

function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
    document.getElementById('transactionModal').classList.remove('open');
    document.getElementById('transDesc').value = '';
    document.getElementById('transAmount').value = '';
    if (document.getElementById('transDate')) document.getElementById('transDate').value = '';
}

function updateTransCategories() {
    const type = document.getElementById('transType').value;
    const catSelect = document.getElementById('transCategory');
    catSelect.innerHTML = '';
    
    let options = [];
    if (type === 'income') {
        options = ['Salário', 'Bônus', 'Rendimento', 'Vendas', 'Pix', 'Outros'];
    } else {
        options = ['Casa', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros'];
    }
    
    options.forEach(opt => {
        catSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
    });
}

function saveTransaction() {
    const desc = document.getElementById('transDesc').value.trim();
    const amount = parseFloat(document.getElementById('transAmount').value);
    const type = document.getElementById('transType').value;
    const cat = document.getElementById('transCategory').value;
    const dateInput = document.getElementById('transDate');
    const trans_date = dateInput && dateInput.value ? dateInput.value : null;

    if (!desc || isNaN(amount) || amount <= 0) {
        showNotification('Preencha os campos corretamente', 'error');
        return;
    }

    fetch(`${API_URL}/transactions`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ description: desc, amount, type, category: cat, trans_date })
    }).then(r => {
        if (r.ok) {
            closeTransactionModal();
            loadFinances();
            showNotification('Transação salva!', 'success');
        } else if (r.status === 401 || r.status === 403) handleLogout();
        else showNotification('Erro ao salvar transação', 'error');
    }).catch(() => showNotification('Erro de conexão', 'error'));
}

function renderFinances() {
    const filter = document.getElementById('financeMonthFilter') ? document.getElementById('financeMonthFilter').value : 'all';
    
    let filteredTransactions = transactions;
    if (filter && filter !== 'all') {
        filteredTransactions = transactions.filter(t => {
            const d = new Date(t.trans_date);
            const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            return mKey === filter;
        });
    }

    let income = 0;
    let expense = 0;
    const categoryTotals = {};

    filteredTransactions.forEach(t => {
        const val = parseFloat(t.amount);
        if (t.type === 'income') income += val;
        else {
            expense += val;
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + val;
        }
    });

    const balance = income - expense;
    // Atualiza a página de finanças
    const balEl = document.getElementById('financeBalance');
    if (balEl) balEl.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    const incEl = document.getElementById('financeIncomes');
    if (incEl) incEl.textContent = `R$ ${income.toFixed(2).replace('.', ',')}`;
    const expEl = document.getElementById('financeExpenses');
    if (expEl) expEl.textContent = `R$ ${expense.toFixed(2).replace('.', ',')}`;

    // Atualiza a aba Finanças e Misto do Dashboard
    const dashBalEl = document.getElementById('dashFinanceBalance');
    if (dashBalEl) dashBalEl.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    const dashMixBalEl = document.getElementById('dashMixBalance');
    if (dashMixBalEl) dashMixBalEl.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    
    const dashIncEl = document.getElementById('dashFinanceIncomes');
    if (dashIncEl) dashIncEl.textContent = `R$ ${income.toFixed(2).replace('.', ',')}`;
    const dashExpEl = document.getElementById('dashFinanceExpenses');
    if (dashExpEl) dashExpEl.textContent = `R$ ${expense.toFixed(2).replace('.', ',')}`;

    const list = document.getElementById('transactionList');
    if (filteredTransactions.length === 0) {
        list.innerHTML = '<div class="notif-empty">Nenhuma transação registrada.</div>';
    } else {
        list.innerHTML = [...filteredTransactions].map(t => {
            const isInc = t.type === 'income';
            // Pega o date sem timezone issue
            const localDate = new Date(t.trans_date.split('T')[0] + 'T12:00:00');
            const amtStr = parseFloat(t.amount).toFixed(2).replace('.', ',');
            return `<div class="notif-item" style="padding:1rem;background:rgba(255,255,255,0.02);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:${isInc ? 'rgba(0,184,148,0.1)' : 'rgba(255,107,107,0.1)'};color:${isInc ? '#00b894' : '#ff6b6b'};"><i data-lucide="${isInc ? 'arrow-up-right' : 'arrow-down-right'}"></i></span>
                    <div>
                        <strong style="color:var(--text-light);display:block;">${escapeHtml(t.description || t.desc)}</strong>
                        <small style="color:var(--text-muted);">${t.category} • ${localDate.toLocaleDateString('pt-BR')}</small>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:1rem;">
                    <strong style="color:${isInc ? '#00b894' : '#ff6b6b'};">${isInc ? '+' : '-'} R$ ${amtStr}</strong>
                    <button onclick="deleteTransaction(${t.id})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;display:flex;align-items:center;" title="Excluir"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
                </div>
            </div>`;
        }).join('');
    }

function deleteTransaction(id) {
    showConfirm('trash-2', 'Excluir Transação', 'Tem certeza que deseja apagar este registro?', () => {
        fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => {
            if (r.ok) {
                loadFinances();
                showNotification('Transação excluída', 'info');
            } else if (r.status === 401 || r.status === 403) handleLogout();
        }).catch(() => showNotification('Erro de conexão', 'error'));
    });
}

    const financeConfig = {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: ['#6c5ce7', '#ff7675', '#00b894', '#fdcb6e', '#0984e3', '#e84393'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#8a8a9a', font: { family: 'Inter' } } }
            }
        }
    };

    if (financeChartInstance) financeChartInstance.destroy();
    const ctx = document.getElementById('financeChart');
    if (ctx && Object.keys(categoryTotals).length > 0) {
        financeChartInstance = new Chart(ctx, financeConfig);
    }

    // Chart para aba dashboard
    if (window.dashFinanceChartInstance) window.dashFinanceChartInstance.destroy();
    const dashCtx = document.getElementById('dashFinanceChart');
    if (dashCtx && Object.keys(categoryTotals).length > 0) {
        window.dashFinanceChartInstance = new Chart(dashCtx, financeConfig);
    }

    // Chart para aba overview
    if (window.mixFinanceChartInstance) window.mixFinanceChartInstance.destroy();
    const mixFinCtx = document.getElementById('mixFinanceChart');
    if (mixFinCtx && Object.keys(categoryTotals).length > 0) {
        window.mixFinanceChartInstance = new Chart(mixFinCtx, financeConfig);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Trigger render when switching pages/tabs
const originalShowPage = showPage;
showPage = function(pageId) {
    originalShowPage(pageId);
    if (pageId === 'finances' || pageId === 'dashboard') renderFinances();
};

const originalShowTab = typeof showTab !== 'undefined' ? showTab : function(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    const btn = document.querySelector(`.tab-btn[onclick="showTab('${tabId}')"]`);
    if(btn) btn.classList.add('active');
    const pane = document.getElementById(tabId);
    if(pane) pane.classList.add('active');
};
showTab = function(tabId) {
    originalShowTab(tabId);
    if (tabId === 'dash-finances' || tabId === 'overview') {
        renderFinances();
    }
    if (tabId === 'dash-tasks' || tabId === 'overview') {
        loadStats();
    }
};
