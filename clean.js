const fs = require('fs');

let content = fs.readFileSync('script.js', 'utf8');

const replacements = [
    // Greeting
    ["'👋', `Bem-vindo", "'hand', `Bem-vindo"],
    ["👋 ${greeting}", "<i data-lucide=\\'sun\\'></i> ${greeting}"],
    
    // Activities and Notifs
    ["'✏️', `Perfil", "'user-check', `Perfil"],
    ["'✅', `Tarefa criada", "'check-circle', `Tarefa criada"],
    ["'🗑️', `Tarefa deletada", "'trash-2', `Tarefa deletada"],
    ["!task.completed ? '✅' : '🔄'", "!task.completed ? 'check-circle' : 'refresh-cw'"],
    ["!task.completed ? 'concluída ✓' : 'reaberta'", "!task.completed ? 'concluída' : 'reaberta'"],
    ["'🎉', `Tarefa concluída", "'check-circle', `Tarefa concluída"],
    ["'⚙️', 'Configurações", "'settings', 'Configurações"],
    ["'📥', 'Dados exportados", "'download', 'Dados exportados"],
    ["'🧹', 'Cache", "'trash', 'Cache"],
    ["'🔑', 'Login", "'key', 'Login"],
    
    // Confirms
    ["showConfirm('🗑️',", "showConfirm('trash-2',"],
    ["showConfirm('🔄',", "showConfirm('rotate-ccw',"],
    ["showConfirm('🧹',", "showConfirm('trash',"],
    
    // Task Meta
    ["📁 ${escapeHtml", "<i data-lucide=\\'folder\\' style=\\'width:12px;height:12px\\'></i> ${escapeHtml"],
    ["📅 ${date}", "<i data-lucide=\\'calendar\\' style=\\'width:12px;height:12px\\'></i> ${date}"],
    
    // Task actions
    ["${t.completed ? '✓' : '○'}", "<i data-lucide=\\'${t.completed ? \\'check-circle\\' : \\'circle\\'}\\' style=\\'width:18px;height:18px\\'></i>"],
    ["title=\"Deletar\">🗑️", "title=\"Deletar\"><i data-lucide=\\'trash-2\\' style=\\'width:18px;height:18px\\'></i>"],
    
    // Empty state
    ["<p style=\"font-size:2.5rem;margin-bottom:1rem;\">📝</p>", "<p style=\"font-size:2.5rem;margin-bottom:1rem;display:flex;justify-content:center;\"><i data-lucide=\\'file-text\\' style=\\'width:48px;height:48px;\\'></i></p>"],
    
    // Priority Label
    ["'🔵 Baixa'", "'Baixa'"],
    ["'🟡 Média'", "'Média'"],
    ["'🔴 Alta'", "'Alta'"],
    
    // Search Results
    ["${t.completed ? '✅' : '📝'}", "<i data-lucide=\\'${t.completed ? \\'check-circle\\' : \\'file-text\\'}\\' style=\\'width:16px;height:16px\\'></i>"],
    
    // Sidebar
    ["{ icon: '🏠', name: 'Home'", "{ icon: 'home', name: 'Home'"],
    ["{ icon: '📊', name: 'Dashboard'", "{ icon: 'layout-dashboard', name: 'Dashboard'"],
    ["{ icon: '📝', name: 'Tarefas'", "{ icon: 'file-text', name: 'Tarefas'"],
    ["{ icon: '👤', name: 'Perfil'", "{ icon: 'user', name: 'Perfil'"],
    ["{ icon: '❓', name: 'Ajuda'", "{ icon: 'help-circle', name: 'Ajuda'"],
    
    // Chatbot
    ["produtividade. ✨", "produtividade."],
    
    // Inside updateNotifUI:
    ["<span class=\"notif-icon\">${n.icon}</span>", "<span class=\"notif-icon\"><i data-lucide=\"${n.icon}\"></i></span>"],
    ["<span class=\"act-icon\">${a.icon}</span>", "<span class=\"act-icon\"><i data-lucide=\"${a.icon}\"></i></span>"]
];

for (const [search, replace] of replacements) {
    content = content.split(search).join(replace);
}

// Ensure lucide is updated after dynamic UI changes (list, kanban, etc)
content = content.replace(/list\.innerHTML = (.+);/g, 'list.innerHTML = $1;\n        if(typeof lucide !== "undefined") lucide.createIcons();');
content = content.replace(/todoEl\.innerHTML = (.+);/g, 'todoEl.innerHTML = $1;\n        if(typeof lucide !== "undefined") lucide.createIcons();');
content = content.replace(/doneEl\.innerHTML = (.+);/g, 'doneEl.innerHTML = $1;\n        if(typeof lucide !== "undefined") lucide.createIcons();');
content = content.replace(/document\.getElementById\('searchResults'\)\.innerHTML = (.+);/g, 'document.getElementById("searchResults").innerHTML = $1;\n            if(typeof lucide !== "undefined") lucide.createIcons();');
content = content.replace(/feed\.innerHTML = (.+);/g, 'feed.innerHTML = $1;\n    if(typeof lucide !== "undefined") lucide.createIcons();');

fs.writeFileSync('script.js', content, 'utf8');
console.log('clean.js done');
