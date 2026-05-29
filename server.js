const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'abl29109',
    database: process.env.DB_NAME || 'sim',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize Database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Create tasks table if not exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [tasks] = await connection.execute('SELECT * FROM tasks ORDER BY created_at DESC');
        connection.release();
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [tasks] = await connection.execute('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
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

// Create task
app.post('/api/tasks', async (req, res) => {
    const { title, description, priority } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            'INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)',
            [title, description || '', priority || 'medium']
        );
        connection.release();
        
        res.status(201).json({
            id: result.insertId,
            title,
            description,
            priority,
            completed: false,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    const { title, description, priority, completed } = req.body;

    try {
        const connection = await pool.getConnection();
        await connection.execute(
            'UPDATE tasks SET title = ?, description = ?, priority = ?, completed = ? WHERE id = ?',
            [title, description, priority, completed, req.params.id]
        );
        connection.release();
        
        res.json({ id: req.params.id, title, description, priority, completed });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        connection.release();
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // Total tasks
        const [totalResult] = await connection.execute('SELECT COUNT(*) as count FROM tasks');
        const totalTasks = totalResult[0].count;
        
        // Completed tasks
        const [completedResult] = await connection.execute('SELECT COUNT(*) as count FROM tasks WHERE completed = TRUE');
        const completedTasks = completedResult[0].count;
        
        // Pending tasks
        const [pendingResult] = await connection.execute('SELECT COUNT(*) as count FROM tasks WHERE completed = FALSE');
        const pendingTasks = pendingResult[0].count;
        
        // Tasks by priority
        const [priorityResult] = await connection.execute(`
            SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority
        `);
        
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend is running' });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    await initializeDatabase();
});
