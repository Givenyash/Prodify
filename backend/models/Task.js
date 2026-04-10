const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    description: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    deadline: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'done'],
        default: 'todo'
    },
    tags: {
        type: [String],
        default: []
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    position: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, position: 1 });
taskSchema.index({ id: 1 });

module.exports = mongoose.model('Task', taskSchema);
