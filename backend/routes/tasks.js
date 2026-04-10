const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation middleware
const taskValidation = [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title required (max 200 chars)'),
    body('description').optional().isString(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('deadline').optional({ nullable: true }).isISO8601().toDate(),
    body('tags').optional().isArray()
];

const taskUpdateValidation = [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().isString(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('deadline').optional({ nullable: true }),
    body('tags').optional().isArray()
];

// Helper to format task for response
const formatTask = (task) => ({
    id: task.id,
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    deadline: task.deadline,
    status: task.status,
    tags: task.tags || [],
    user_id: task.userId.toString(),
    created_at: task.createdAt,
    updated_at: task.updatedAt
});

// GET /api/tasks
router.get('/', async (req, res) => {
    try {
        const { status, priority, tag, search } = req.query;
        const query = { userId: new mongoose.Types.ObjectId(req.user.id) };

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (tag) query.tags = tag;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const tasks = await Task.find(query).sort({ position: 1 });
        res.json(tasks.map(formatTask));
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ detail: 'Failed to get tasks' });
    }
});

// GET /api/tasks/stats/summary
router.get('/stats/summary', async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        // Get counts by status
        const results = await Task.aggregate([
            { $match: { userId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const stats = { todo: 0, in_progress: 0, done: 0 };
        results.forEach(r => {
            stats[r._id] = r.count;
        });

        const total = stats.todo + stats.in_progress + stats.done;
        const progress = total > 0 ? Math.round((stats.done / total) * 1000) / 10 : 0;

        // Count overdue tasks
        const overdue = await Task.countDocuments({
            userId,
            status: { $ne: 'done' },
            deadline: { $lt: new Date() }
        });

        res.json({
            total,
            todo: stats.todo,
            in_progress: stats.in_progress,
            done: stats.done,
            progress,
            overdue
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ detail: 'Failed to get stats' });
    }
});

// POST /api/tasks
router.post('/', taskValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ detail: errors.array() });
        }

        const { title, description, priority, status, deadline, tags } = req.body;
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const taskStatus = status || 'todo';

        // Get max position for the status column
        const maxPosTask = await Task.findOne(
            { userId, status: taskStatus }
        ).sort({ position: -1 });
        
        const position = maxPosTask ? maxPosTask.position + 1 : 0;

        const task = await Task.create({
            id: new mongoose.Types.ObjectId().toString(),
            title,
            description: description || '',
            priority: priority || 'medium',
            status: taskStatus,
            deadline: deadline || null,
            tags: tags || [],
            userId,
            position,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.status(201).json(formatTask(task));
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ detail: 'Failed to create task' });
    }
});

// GET /api/tasks/:taskId
router.get('/:taskId', async (req, res) => {
    try {
        const task = await Task.findOne({
            id: req.params.taskId,
            userId: new mongoose.Types.ObjectId(req.user.id)
        });

        if (!task) {
            return res.status(404).json({ detail: 'Task not found' });
        }

        res.json(formatTask(task));
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ detail: 'Failed to get task' });
    }
});

// PUT /api/tasks/:taskId
router.put('/:taskId', taskUpdateValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ detail: errors.array() });
        }

        const task = await Task.findOne({
            id: req.params.taskId,
            userId: new mongoose.Types.ObjectId(req.user.id)
        });

        if (!task) {
            return res.status(404).json({ detail: 'Task not found' });
        }

        const { title, description, priority, status, deadline, tags } = req.body;
        
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (priority !== undefined) task.priority = priority;
        if (status !== undefined) task.status = status;
        if (deadline !== undefined) task.deadline = deadline;
        if (tags !== undefined) task.tags = tags;
        task.updatedAt = new Date();

        await task.save();
        res.json(formatTask(task));
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ detail: 'Failed to update task' });
    }
});

// DELETE /api/tasks/:taskId
router.delete('/:taskId', async (req, res) => {
    try {
        const result = await Task.deleteOne({
            id: req.params.taskId,
            userId: new mongoose.Types.ObjectId(req.user.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ detail: 'Task not found' });
        }

        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ detail: 'Failed to delete task' });
    }
});

// POST /api/tasks/reorder
router.post('/reorder', async (req, res) => {
    try {
        const { task_id, new_status, position } = req.body;

        if (!task_id || !new_status || position === undefined) {
            return res.status(400).json({ detail: 'Missing required fields' });
        }

        const task = await Task.findOne({
            id: task_id,
            userId: new mongoose.Types.ObjectId(req.user.id)
        });

        if (!task) {
            return res.status(404).json({ detail: 'Task not found' });
        }

        task.status = new_status;
        task.position = position;
        task.updatedAt = new Date();
        await task.save();

        res.json({ message: 'Task reordered' });
    } catch (error) {
        console.error('Reorder task error:', error);
        res.status(500).json({ detail: 'Failed to reorder task' });
    }
});

module.exports = router;
