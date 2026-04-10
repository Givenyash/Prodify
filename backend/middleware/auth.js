const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from cookie first, then header
        let token = req.cookies.access_token;
        
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ detail: 'Not authenticated' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'access') {
            return res.status(401).json({ detail: 'Invalid token type' });
        }

        // Find user
        const user = await User.findById(decoded.sub).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ detail: 'User not found' });
        }

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ detail: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ detail: 'Invalid token' });
        }
        console.error('Auth middleware error:', error);
        return res.status(401).json({ detail: 'Authentication failed' });
    }
};

module.exports = auth;
