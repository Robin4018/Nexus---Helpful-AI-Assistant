import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast.error('Token is missing! Please request a new password reset link.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match!');
            return;
        }

        setLoading(true);
        try {
            await api.post('password_reset/confirm/', {
                token: token,
                password: password
            });
            setSubmitted(true);
            toast.success('Password updated successfully!');
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.password?.[0] || err.response?.data?.detail || 'Invalid or expired password reset token.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"
        >
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-sidebar-accent rounded-2xl mb-3 sm:mb-4 shadow-2xl border border-border/50">
                        <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Reset Password</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">Enter your new secure workspace password</p>
                </div>

                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-6 sm:p-8">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!token && (
                                    <div className="bg-destructive/10 text-destructive text-xs sm:text-sm p-3 rounded-lg border border-destructive/20 text-center font-medium">
                                        Warning: Secure Token parameter is missing from this link. Resets will fail.
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">New Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-sidebar-accent/50 border border-border pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/50 hover:text-primary transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Confirm New Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-sidebar-accent/50 border border-border pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-primary-foreground font-bold py-3.5 mt-2 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            Update Password
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center space-y-4 py-6">
                                <div className="text-lg font-bold text-foreground">Password Reset Completed!</div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Your password has been updated. Redirecting you to the sign-in page in a few seconds...
                                </p>
                                <div className="flex justify-center pt-2">
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-sidebar-accent/30 py-4 px-6 sm:px-8 border-t border-border/50 text-center">
                        <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary font-bold hover:underline transition-all">
                            <ArrowLeft size={16} />
                            <span>Back to Sign In</span>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ResetPasswordPage;
