const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true,
        index: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastAttempt: {
        type: Date,
        default: Date.now
    },
    lockedUntil: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
