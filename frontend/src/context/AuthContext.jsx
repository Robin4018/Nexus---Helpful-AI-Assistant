import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token');
            const storedUsername = localStorage.getItem('username');

            if (token) {
                if (storedUsername) {
                    setUser({ authenticated: true, username: storedUsername });
                    setLoading(false);
                } else {
                    try {
                        const response = await api.get('profile/');
                        localStorage.setItem('username', response.data.username);
                        setUser({ authenticated: true, username: response.data.username });
                    } catch (err) {
                        console.error("Failed to fetch user profile", err);
                        setUser({ authenticated: true, username: 'User' });
                    } finally {
                        setLoading(false);
                    }
                }
            } else {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (username, password) => {
        const response = await api.post('login/', { username, password });
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('username', response.data.username);

        setUser({ authenticated: true, username: response.data.username });
        return response.data;
    };

    const signup = async (username, email, password, security_question, security_answer) => {
        const response = await api.post('signup/', {
            username,
            email,
            password,
            security_question,
            security_answer
        });
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');

        setUser(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
