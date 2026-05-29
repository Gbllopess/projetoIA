# Dashboard Pro - Gerenciador Inteligente

Uma interface web moderna e responsiva para gerenciar tarefas, visualizar métricas e organizar sua produtividade.

## ✨ Funcionalidades

- **Landing Page** - Página inicial atraente com showcase de recursos
- **Dashboard** - Visualização de métricas com múltiplas abas (Visão Geral, Análitica, Usuários, Configurações)
- **Gerenciador de Tarefas** - Criar, editar, deletar e filtrar tarefas
- **Design Responsivo** - Funciona perfeitamente em desktop, tablet e mobile
- **Armazenamento Local** - Dados salvos localmente no navegador
- **Interface Moderna** - UI limpa e intuitiva com animações suaves

## 🚀 Começando Rápido

### Opção 1: Abrir diretamente no navegador
Simplesmente abra o arquivo `index.html` no seu navegador favorito.

### Opção 2: Usar um servidor local (recomendado)
```bash
# Se tiver Python 3 instalado
python -m http.server 8000

# Ou se tiver Python 2
python -m SimpleHTTPServer 8000

# Ou com Node.js (npx)
npx serve .
```

Então acesse: `http://localhost:8000`

## 📁 Estrutura do Projeto

```
dashboard-app/
├── index.html      # Estrutura HTML principal
├── styles.css      # Estilos e design
├── script.js       # Lógica e funcionalidades
└── README.md       # Este arquivo
```

## 🎯 Como Usar

### 1. Landing Page (Home)
- Visualize a página inicial com informações sobre o app
- Veja os recursos principais
- Estatísticas de uso

### 2. Dashboard
Navegue pelas abas:
- **Visão Geral**: Métricas em tempo real de tarefas
- **Análitica**: Performance geral e estatísticas
- **Usuários**: Lista de usuários do sistema
- **Configurações**: Preferências e privacidade

### 3. Gerenciador de Tarefas
- Clique em "+ Nova Tarefa" para criar uma tarefa
- Preencha título, descrição e prioridade
- Marque como completo ✓ ou delete 🗑️
- Filtre por status: Todas, Pendentes, Concluídas

## 🎨 Personalizações

### Cores
Edite as variáveis CSS em `styles.css`:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --success-color: #10b981;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
}
```

### Adicionar Novas Seções
1. Crie uma nova `<section id="nome" class="page">`
2. Adicione o link na navbar
3. Implemente a lógica em `script.js`

## 💾 Dados

Todos os dados são salvos localmente no navegador usando `localStorage`. Eles persistem entre sessões mas são específicos do navegador.

Para limpar dados:
```javascript
localStorage.clear();
```

## 🖥️ Compatibilidade

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Responsibilidade

A interface é totalmente responsiva:
- Desktop: Layout completo com múltiplas colunas
- Tablet: Layout adaptado
- Mobile: Interface otimizada para toque

## 🔧 Desenvolvimento

Para adicionar novas funcionalidades:

1. **Adicionar uma página**: Crie uma nova `<section>` em `index.html`
2. **Adicionar um botão**: Use classe `btn btn-primary` ou `btn-secondary`
3. **Adicionar um card**: Use classe `card`
4. **Adicionar uma tarefa**: Edite o formulário em HTML

## 🐛 Troubleshooting

**As tarefas não estão salvando?**
- Verifique se o localStorage está habilitado no navegador
- Tente em uma aba privada/incognito

**O estilo parece errado?**
- Limpe o cache do navegador (Ctrl+Shift+Del ou Cmd+Shift+Delete)
- Verifique se o arquivo `styles.css` está no mesmo diretório

## 📝 Licença

Este projeto é de código aberto e gratuito para uso pessoal e comercial.

## 🎓 Próximas Melhorias

- [ ] Sincronização com backend
- [ ] Autenticação de usuários
- [ ] Compartilhamento de tarefas
- [ ] Notificações em tempo real
- [ ] Tema escuro/claro
- [ ] Integração com calendário
- [ ] Exportar dados (JSON, PDF)

---

**Desenvolvido com ❤️ em 2026**
