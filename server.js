const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dashboardpro';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Auth Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
}

// MySQL Connection Pool
let pool;

// Initialize Database
async function initializeDatabase() {
    try {
        const dbName = process.env.DB_NAME || 'sim';
        const initialConnection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'abl29109'
        });
        await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await initialConnection.end();

        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'abl29109',
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const connection = await pool.getConnection();
        
        // Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create tasks table if not exists (with user_id, due_date, and category)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
                category VARCHAR(50) DEFAULT 'Geral',
                due_date DATE DEFAULT NULL,
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // We try to alter the table to add new columns if it already exists
        try { await connection.execute(`ALTER TABLE tasks ADD COLUMN user_id INT NOT NULL DEFAULT 1`); } catch (e) {}
        try { await connection.execute(`ALTER TABLE tasks ADD COLUMN category VARCHAR(50) DEFAULT 'Geral'`); } catch (e) {}
        try { await connection.execute(`ALTER TABLE tasks ADD COLUMN due_date DATE DEFAULT NULL`); } catch (e) {}

        // Create transactions table for finances
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                description VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                category VARCHAR(50) NOT NULL,
                trans_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        connection.release();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        process.exit(1);
    }
}

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

    try {
        const connection = await pool.getConnection();
        const [existing] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }

        const hashed = await bcrypt.hash(password, 10);
        await connection.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed]);
        connection.release();
        
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

    try {
        const connection = await pool.getConnection();
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        connection.release();

        const user = users[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Get all tasks (Protected)
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [tasks] = await connection.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        connection.release();
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get single task (Protected)
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [tasks] = await connection.execute('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        connection.release();
        
        if (tasks.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(tasks[0]);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// Create task (Protected)
app.post('/api/tasks', authenticateToken, async (req, res) => {
    const { title, description, priority, category, due_date } = req.body;
    
    try {
        const connection = await pool.getConnection();
        let formattedDate = null;
        if (due_date) {
            try { formattedDate = new Date(due_date).toISOString().split('T')[0]; } 
            catch(e) { formattedDate = null; }
        }

        const [result] = await connection.execute(
            'INSERT INTO tasks (user_id, title, description, priority, category, due_date) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, title, description || '', priority || 'medium', category || 'Geral', formattedDate]
        );
        connection.release();
        
        res.status(201).json({
            id: result.insertId,
            user_id: req.user.id,
            title,
            description,
            priority,
            category: category || 'Geral',
            due_date: formattedDate,
            completed: false,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task (Protected)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    const { title, description, priority, category, due_date, completed } = req.body;

    try {
        const connection = await pool.getConnection();
        // Check ownership
        const [existing] = await connection.execute('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Task not found or not yours' });
        }

        let formattedDate = null;
        if (due_date) {
            try { formattedDate = new Date(due_date).toISOString().split('T')[0]; } 
            catch(e) { formattedDate = null; }
        }
        
        // Ensure completed is boolean/int compatible
        const isCompleted = completed === true || completed === 1 || completed === '1' ? 1 : 0;

        await connection.execute(
            'UPDATE tasks SET title = ?, description = ?, priority = ?, category = ?, due_date = ?, completed = ? WHERE id = ? AND user_id = ?',
            [title, description, priority, category || 'Geral', formattedDate, isCompleted, req.params.id, req.user.id]
        );
        connection.release();
        
        res.json({ id: req.params.id, title, description, priority, category, due_date: formattedDate, completed: isCompleted });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task (Protected)
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        connection.release();
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Task not found or not yours' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Get statistics (Protected)
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const uid = req.user.id;
        
        // Total tasks
        const [totalResult] = await connection.execute('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?', [uid]);
        const totalTasks = totalResult[0].count;
        
        // Completed tasks
        const [completedResult] = await connection.execute('SELECT COUNT(*) as count FROM tasks WHERE completed = TRUE AND user_id = ?', [uid]);
        const completedTasks = completedResult[0].count;
        
        // Pending tasks
        const [pendingResult] = await connection.execute('SELECT COUNT(*) as count FROM tasks WHERE completed = FALSE AND user_id = ?', [uid]);
        const pendingTasks = pendingResult[0].count;
        
        // Tasks by priority
        const [priorityResult] = await connection.execute(`
            SELECT priority, COUNT(*) as count FROM tasks WHERE user_id = ? GROUP BY priority
        `, [uid]);
        
        const tasksByPriority = {
            low: 0,
            medium: 0,
            high: 0
        };
        
        priorityResult.forEach(row => {
            tasksByPriority[row.priority] = row.count;
        });
        
        connection.release();
        
        res.json({
            totalTasks,
            completedTasks,
            pendingTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            tasksByPriority
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ========== TRANSACTIONS ROUTES ==========

// Get user transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY trans_date DESC, created_at DESC',
            [req.user.id]
        );
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Create transaction
app.post('/api/transactions', authenticateToken, async (req, res) => {
    const { description, amount, type, category, trans_date } = req.body;
    try {
        const connection = await pool.getConnection();
        let formattedDate = null;
        if (trans_date) {
            try { formattedDate = new Date(trans_date).toISOString().split('T')[0]; } 
            catch(e) { formattedDate = null; }
        }
        
        if (!formattedDate) {
            // Default to today local time
            const today = new Date();
            const tzOffset = today.getTimezoneOffset() * 60000;
            formattedDate = new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
        }

        const [result] = await connection.execute(
            'INSERT INTO transactions (user_id, description, amount, type, category, trans_date) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, description, amount, type, category, formattedDate]
        );
        connection.release();
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

// Delete transaction
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        connection.release();
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Transaction not found or not yours' });
        }
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend is running' });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    await initializeDatabase();
});
