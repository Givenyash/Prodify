const jwt = require('jsonwebtoken');

const JWT_ALGORITHM = 'HS256';

// Create access token (15 minutes)
const createAccessToken = (userId, email) => {
    return jwt.sign(
        { 
            sub: userId, 
            email, 
            type: 'access' 
        },
        process.env.JWT_SECRET,
        { 
            algorithm: JWT_ALGORITHM, 
            expiresIn: '15m' 
        }
    );
};

// Create refresh token (7 days)
const createRefreshToken = (userId) => {
    return jwt.sign(
        { 
            sub: userId, 
            type: 'refresh' 
        },
        process.env.JWT_SECRET,
        { 
            algorithm: JWT_ALGORITHM, 
            expiresIn: '7d' 
        }
    );
};

// Set auth cookies on response
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/'
    });
    
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
};

// Clear auth cookies
const clearAuthCookies = (res) => {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
};

module.exports = {
    createAccessToken,
    createRefreshToken,
    setAuthCookies,
    clearAuthCookies
};
