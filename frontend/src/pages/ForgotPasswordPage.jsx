import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { KeyRound, ArrowRight, Loader2, ArrowLeft, Lock, HelpCircle, CheckCircle, Eye, EyeOff, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const ForgotPasswordPage = () => {
    const [step, setStep] = useState(1); // 1: Identity, 2: Answer & Reset, 3: Success
    const [identity, setIdentity] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Step 1: Submit identity to fetch security question
    const handleFetchQuestion = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('password_reset/security_question/', { identity });
            setSecurityQuestion(response.data.security_question);
            setStep(2);
            toast.success('Security question retrieved!');
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || 'No account associated with that username or email.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify answer and set new password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            toast.error('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.post('password_reset/security_question/verify/', {
                identity,
                security_answer: securityAnswer,
                new_password: newPassword
            });
            setStep(3);
            toast.success('Password reset successfully!');
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || 'Incorrect answer or invalid parameters.';
            setError(errorMsg);
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
                        {step === 3 ? (
                            <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        ) : (
                            <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        {step === 3 ? 'Success!' : 'Reset Password'}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                        {step === 1 && 'Enter details to verify your identity'}
                        {step === 2 && 'Answer your security question'}
                        {step === 3 && 'Your account password has been updated'}
                    </p>
                </div>

                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-6 sm:p-8">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-destructive/10 text-destructive text-sm p-3 mb-4 rounded-lg border border-destructive/20 text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        {step === 1 && (
                            <form onSubmit={handleFetchQuestion} className="space-y-5">
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                    Enter your registered username or email address below to fetch your security question.
                                </p>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Username or Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Enter username or email" 
                                            value={identity} 
                                            onChange={(e) => setIdentity(e.target.value)}
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
                                            Fetch Question
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleResetPassword} className="space-y-5">
                                <div className="p-3 bg-sidebar-accent/40 border border-border/50 rounded-xl flex items-start gap-2.5">
                                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Your Question</div>
                                        <div className="text-sm font-semibold text-foreground leading-relaxed mt-0.5">{securityQuestion}</div>
                                    </div>
                                </div>

                                {/* Answer Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Secret Answer</label>
                                    <input 
                                        type="text" 
                                        placeholder="Type your secret answer" 
                                        value={securityAnswer} 
                                        onChange={(e) => setSecurityAnswer(e.target.value)}
                                        className="w-full bg-sidebar-accent/50 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm"
                                        required
                                    />
                                </div>

                                {/* New Password */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">New Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            value={newPassword} 
                                            onChange={(e) => setNewPassword(e.target.value)}
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

                                {/* Confirm New Password */}
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
                        )}

                        {step === 3 && (
                            <div className="text-center py-4 space-y-5">
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                    Your password has been successfully updated! You can now log into your workspace with your new password.
                                </p>
                                <button 
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg"
                                >
                                    Sign In Now
                                </button>
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
