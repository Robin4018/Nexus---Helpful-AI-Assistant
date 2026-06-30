import React, { useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatPage from './pages/ChatPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { Toaster } from 'sonner';

// This is a special component that checks if a user is logged in.
// If they are not logged in, it sends them back to the login page.
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    // While we are checking if the user is logged in, we show a 'Loading' screen
    if (loading) return <div>Loading... please wait!</div>;

    // If no user is found, go to /login
    if (!user) return <Navigate to="/login" />;

    // If everything is okay, show the page!
    return children;
};

// This part handles moving between different pages with nice animations
const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname.startsWith('/chat') ? 'chat-view' : location.pathname}>
                {/* Regular pages */}
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Secret pages only for logged-in users */}
                <Route
                    path="/chat"
                    element={
                        <ProtectedRoute>
                            <ChatPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/chat/:id"
                    element={
                        <ProtectedRoute>
                            <ChatPage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </AnimatePresence>
    );
};

// This is the Main App component - the first thing that runs in our website
function App() {
    return (
        <AuthProvider>
            {/* Toaster shows little pop-up notifications like "Login Success!" */}
            <Toaster theme="dark" position="top-center" />

            {/* The Router helps us navigate between pages */}
            <Router>
                <AnimatedRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;
