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

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading... please wait!</div>;

    if (!user) return <Navigate to="/login" />;

    return children;
};

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname.startsWith('/chat') ? 'chat-view' : location.pathname}>
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route
                    path="/chat/:id?"
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

function App() {
    return (
        <AuthProvider>
            <Toaster theme="dark" position="top-center" />

            <Router>
                <AnimatedRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;
