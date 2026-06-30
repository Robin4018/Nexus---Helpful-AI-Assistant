import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Sends a request to django-rest-passwordreset token generator
            await api.post('password_reset/', { email });
            setSubmitted(true);
            toast.success('Reset email has been dispatched!');
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.email?.[0] || 'No account associated with that email address.';
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
                        <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Forgot Password</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">Recover your Nexus workspace access</p>
                </div>

                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-6 sm:p-8">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                    Enter your registered email address below. We'll send you a link with a secure token to reset your password.
                                </p>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input 
                                            type="email" 
                                            placeholder="you@example.com" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-sidebar-accent/50 border border-border px-10 py-3 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm"
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
                                            Send Reset Link
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center space-y-4 py-4">
                                <div className="text-sm text-foreground/90 font-medium">
                                    A password reset link has been dispatched to:
                                </div>
                                <div className="bg-sidebar-accent/50 border border-border rounded-xl p-3 text-xs sm:text-sm font-semibold select-all text-primary truncate max-w-full">
                                    {email}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                                    Please check your inbox (or console logs in development) and click the reset link to update your password.
                                </p>
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

export default ForgotPasswordPage;
