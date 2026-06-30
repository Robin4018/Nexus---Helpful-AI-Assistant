import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Context is like a 'Global Variable' box that any page can reach into.
// We use it to store whether the user is logged in or not.
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // 'user' will be null if logged out, or an object if logged in
    const [user, setUser] = useState(null);

    // 'loading' is true while we check the computer for saved login tokens
    const [loading, setLoading] = useState(true);

    // This runs as soon as the website opens
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token');
            const storedUsername = localStorage.getItem('username');

            if (token) {
                if (storedUsername) {
                    setUser({ authenticated: true, username: storedUsername });
                    setLoading(false);
                } else {
                    // If we have a token but no username, fetch it from the server
                    try {
                        const response = await api.get('profile/');
                        localStorage.setItem('username', response.data.username);
                        setUser({ authenticated: true, username: response.data.username });
                    } catch (err) {
                        console.error("Failed to fetch user profile", err);
                        // If the token is invalid, we might want to logout
                        // but for now just set as authenticated without name
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

    // Function to handle logging in
    const login = async (username, password) => {
        // Send the username and password to Django
        const response = await api.post('login/', { username, password });

        // Save the secret tokens so we stay logged in even if we refresh the page
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('username', response.data.username);

        // Update our global user status
        setUser({ authenticated: true, username: response.data.username });
        return response.data;
    };

    // Function to handle signing up
    const signup = async (username, email, password) => {
        const response = await api.post('signup/', { username, email, password });
        return response.data;
    };

    // Function to handle logging out
    const logout = () => {
        // Clear all secret tokens from memory
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');

        // Mark as logged out
        setUser(null);

        // Send the user back to the login page
        window.location.href = '/';
    };

    return (
        // We "provide" these functions (login, logout, signup) to the whole app
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
