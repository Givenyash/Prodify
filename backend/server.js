require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { seedAdmin } = require('./utils/seed');

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/api/', (req, res) => {
    res.json({ message: 'ProdiFY API is running', version: '1.0.0' });
});

// Tags endpoint
app.get('/api/tags', require('./middleware/auth'), async (req, res) => {
    try {
        const Task = require('./models/Task');
        const results = await Task.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        res.json(results.map(r => ({ name: r._id, count: r.count })));
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ detail: 'Failed to get tags' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({ 
        detail: err.message || 'Internal server error' 
    });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URL)
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Seed admin user
        await seedAdmin();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`ProdiFY API running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

module.exports = app;
