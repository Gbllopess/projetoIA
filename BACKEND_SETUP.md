# Setup Backend com MySQL

O backend está configurado para conectar ao seu MySQL local na porta 3306.

## Pré-requisitos

- Node.js e npm instalados
- MySQL rodando na porta 3306
- Credenciais: root / abl29109
- Database: sim

## Instalação

1. **Instale as dependências:**
```bash
cd /tmp/dashboard-app
npm install
```

2. **Verifique as credenciais do MySQL em `.env`:**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=abl29109
DB_NAME=sim
PORT=5000
```

3. **Inicie o servidor backend:**
```bash
npm start
```

Você deverá ver:
```
✅ Database initialized successfully
🚀 Server running on http://localhost:5000
```

## Rodando a aplicação completa

### Terminal 1 - Backend:
```bash
cd /tmp/dashboard-app
npm start
```

### Terminal 2 - Frontend:
```bash
cd /tmp/dashboard-app
# Com Python 3
python -m http.server 8000

# Ou com Live Server (recomendado)
# Instale: npm install -g live-server
# Execute: live-server
```

Acesse: **http://localhost:8000**

## API Endpoints

### Tarefas
- `GET /api/tasks` - Lista todas as tarefas
- `GET /api/tasks/:id` - Obtém uma tarefa específica
- `POST /api/tasks` - Cria nova tarefa
- `PUT /api/tasks/:id` - Atualiza uma tarefa
- `DELETE /api/tasks/:id` - Deleta uma tarefa
- `GET /api/health` - Verifica status do servidor

### Exemplo de Request (POST):
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Exemplo de Tarefa",
    "description": "Descrição da tarefa",
    "priority": "high"
  }'
```

## Troubleshooting

**Erro: `listen EADDRINUSE :::5000`**
- A porta 5000 já está em uso
- Verifique: `lsof -i :5000`
- Ou mude `PORT` no `.env`

**Erro: `Cannot find module 'mysql2'`**
```bash
npm install
```

**Erro: `Access denied for user 'root'`**
- Verifique as credenciais em `.env`
- Teste a conexão MySQL:
```bash
mysql -h localhost -u root -p
```

**Erro: `Unknown database 'sim'`**
- O backend cria automaticamente a tabela
- Se o database não existe, crie:
```bash
mysql -u root -p -e "CREATE DATABASE sim;"
```

## Dados Persistidos

Todos os dados de tarefas são salvos no MySQL em tempo real:
- ✅ Criação de tarefas
- ✅ Atualização de status
- ✅ Deleção
- ✅ Todos sincronizados no frontend

## Ambiente de Desenvolvimento

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

(Requer `nodemon` instalado)

---

**Backend Status:** ✅ Pronto para produção
