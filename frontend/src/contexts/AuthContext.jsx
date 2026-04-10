import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper to format API errors
function formatApiErrorDetail(detail) {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

export function AuthProvider({ children }) {
    // null = checking, false = not authenticated, object = authenticated
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true });
            setUser(data);
        } catch (e) {
            setUser(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post(
                `${API}/auth/login`,
                { email, password },
                { withCredentials: true }
            );
            setUser(data);
            return { success: true };
        } catch (e) {
            return { 
                success: false, 
                error: formatApiErrorDetail(e.response?.data?.detail) || e.message 
            };
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await axios.post(
                `${API}/auth/register`,
                { name, email, password },
                { withCredentials: true }
            );
            setUser(data);
            return { success: true };
        } catch (e) {
            return { 
                success: false, 
                error: formatApiErrorDetail(e.response?.data?.detail) || e.message 
            };
        }
    };

    const logout = async () => {
        try {
            await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
        } catch (e) {
            console.error('Logout error:', e);
        } finally {
            setUser(false);
        }
    };

    const refreshToken = async () => {
        try {
            await axios.post(`${API}/auth/refresh`, {}, { withCredentials: true });
            return true;
        } catch (e) {
            setUser(false);
            return false;
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshToken,
        checkAuth
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
