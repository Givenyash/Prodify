const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const auth = require('../middleware/auth');
const { createAccessToken, createRefreshToken, setAuthCookies, clearAuthCookies } = require('../utils/jwt');

const router = express.Router();

// Validation middleware
const registerValidation = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
];

// Brute force protection helpers
const checkBruteForce = async (ip, email) => {
    const identifier = `${ip}:${email}`;
    const attempt = await LoginAttempt.findOne({ identifier });
    
    if (attempt) {
        if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
            throw { status: 429, message: 'Too many failed attempts. Try again later.' };
        }
        if (attempt.attempts >= 5) {
            await LoginAttempt.updateOne(
                { identifier },
                { $set: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } }
            );
            throw { status: 429, message: 'Too many failed attempts. Try again later.' };
        }
    }
};

const recordFailedAttempt = async (ip, email) => {
    const identifier = `${ip}:${email}`;
    await LoginAttempt.updateOne(
        { identifier },
        { $inc: { attempts: 1 }, $set: { lastAttempt: new Date() } },
        { upsert: true }
    );
};

const clearFailedAttempts = async (ip, email) => {
    const identifier = `${ip}:${email}`;
    await LoginAttempt.deleteOne({ identifier });
};

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ detail: errors.array() });
        }

        const { name, email, password } = req.body;
        const normalizedEmail = email.toLowerCase();

        // Check if user exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ detail: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email: normalizedEmail,
            passwordHash,
            role: 'user'
        });

        // Create tokens
        const userId = user._id.toString();
        const accessToken = createAccessToken(userId, normalizedEmail);
        const refreshToken = createRefreshToken(userId);

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        res.status(201).json({
            id: userId,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.createdAt.toISOString()
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ detail: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ detail: errors.array() });
        }

        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase();
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        // Check brute force
        try {
            await checkBruteForce(ip, normalizedEmail);
        } catch (err) {
            return res.status(err.status).json({ detail: err.message });
        }

        // Find user
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            await recordFailedAttempt(ip, normalizedEmail);
            return res.status(401).json({ detail: 'Invalid email or password' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            await recordFailedAttempt(ip, normalizedEmail);
            return res.status(401).json({ detail: 'Invalid email or password' });
        }

        // Clear failed attempts
        await clearFailedAttempts(ip, normalizedEmail);

        // Create tokens
        const userId = user._id.toString();
        const accessToken = createAccessToken(userId, normalizedEmail);
        const refreshToken = createRefreshToken(userId);

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        res.json({
            id: userId,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.createdAt ? user.createdAt.toISOString() : null
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ detail: 'Login failed' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        created_at: req.user.createdAt ? req.user.createdAt.toISOString() : null
    });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const token = req.cookies.refresh_token;
        if (!token) {
            return res.status(401).json({ detail: 'No refresh token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ detail: 'Invalid token type' });
        }

        const user = await User.findById(decoded.sub);
        if (!user) {
            return res.status(401).json({ detail: 'User not found' });
        }

        const accessToken = createAccessToken(user._id.toString(), user.email);
        
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
            path: '/'
        });

        res.json({ message: 'Token refreshed' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ detail: 'Refresh token expired' });
        }
        console.error('Refresh error:', error);
        res.status(401).json({ detail: 'Invalid refresh token' });
    }
});

module.exports = router;
