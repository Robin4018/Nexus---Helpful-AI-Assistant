import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Plus,
    MessageSquare,
    LogOut,
    User,
    ChevronLeft,
    Menu,
    MoreHorizontal,
    Edit2,
    Trash2,
    TerminalSquare,
    Search,
    Pause,
    Play,
    ChevronDown,
    Paperclip,
    X,
    FileText,
    Image,
    Loader2,
    AlertTriangle,
    RotateCw,
    UploadCloud
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';


// TYPEWRITER COMPONENT
const Typewriter = ({ text, speed = 5, onUpdate, isPaused, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!isPaused && index < text.length) {
            const timeout = setTimeout(() => {
                const nextChunk = text.slice(index, index + 3);
                setDisplayedText(prev => prev + nextChunk);
                setIndex(prev => prev + nextChunk.length);
                if (onUpdate) onUpdate();
                if (index + nextChunk.length >= text.length && onComplete) onComplete();
            }, speed);
            return () => clearTimeout(timeout);
        }
    }, [index, text, speed, onUpdate, isPaused, onComplete]);

    return <ReactMarkdown>{displayedText}</ReactMarkdown>;
};

// THE MAIN CHAT PAGE
const ChatPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // For auto-scrolling to the bottom of the chat
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
    const [latestAiMessageId, setLatestAiMessageId] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showNewMsgToast, setShowNewMsgToast] = useState(false);
    const [isGenerationDone, setIsGenerationDone] = useState(false);
    const scrollContainerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [attachments, setAttachments] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState({});
    const [isDragOver, setIsDragOver] = useState(false);
    const docInputRef = useRef(null);
    const imgInputRef = useRef(null);
    const [showUploadMenu, setShowUploadMenu] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const smartScroll = () => {
        if (isAtBottom) {
            scrollToBottom();
        } else if (latestAiMessageId) {
            setShowNewMsgToast(true);
        }
    };

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const reachedBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(reachedBottom);
        if (reachedBottom) setShowNewMsgToast(false);
    };

    useEffect(() => {
        myFetchConversations();
    }, []);

    useEffect(() => {
        if (id) {
            myFetchMessages(id);
            myFetchAttachments(id);
            setLatestAiMessageId(null);
        } else {
            setMessages([]);
            setAttachments([]);
            setUploadingFiles({});
            setIsDragOver(false);
        }
    }, [id]);

    useEffect(() => {
        if (isAtBottom) scrollToBottom();
    }, [messages]);

    const myFetchConversations = async () => {
        try {
            const response = await api.get('conversations/');
            setConversations(response.data);
        } catch (err) {
            console.error("Oh no, could not get chats!", err);
        }
    };

    const myFetchMessages = async (convId) => {
        try {
            const response = await api.get(`conversations/${convId}/messages/`);
            setMessages(response.data);
        } catch (err) {
            console.error("Oops, could not get messages!", err);
        }
    };

    const myFetchAttachments = async (convId) => {
        try {
            const response = await api.get(`conversations/${convId}/`);
            setAttachments(response.data.staged_attachments || []);
        } catch (err) {
            console.error("Oops, could not fetch conversation details for attachments!", err);
        }
    };

    const handleFileUpload = async (files) => {
        if (!id) {
            toast.error("Please create or select a chat conversation first!");
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const maxFileSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxFileSize) {
                toast.error(`"${file.name}" exceeds the 10MB file limit!`);
                continue;
            }

            const currentTotalSize = attachments.reduce((sum, item) => sum + item.file_size, 0);
            if (currentTotalSize + file.size > 30 * 1024 * 1024) {
                toast.error(`Combined attachment size exceeds the 30MB limit!`);
                break;
            }

            const uploadId = `${Date.now()}-${file.name}`;
            setUploadingFiles(prev => ({
                ...prev,
                [uploadId]: { name: file.name, progress: 0 }
            }));

            const formData = new FormData();
            formData.append('file', file);
            formData.append('storage_option', 'local');

            try {
                const response = await api.post(`conversations/${id}/files/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadingFiles(prev => {
                            if (!prev[uploadId]) return prev;
                            return {
                                ...prev,
                                [uploadId]: { ...prev[uploadId], progress }
                            };
                        });
                    }
                });

                setAttachments(prev => [...prev, response.data]);
                toast.success(`"${file.name}" uploaded successfully!`);
            } catch (err) {
                console.error(err);
                const errMsg = err.response?.data?.error || `Failed to process/upload "${file.name}"`;
                toast.error(errMsg);
            } finally {
                setUploadingFiles(prev => {
                    const copy = { ...prev };
                    delete copy[uploadId];
                    return copy;
                });
            }
        }
    };

    const handleDeleteAttachment = async (fileId, fileName) => {
        try {
            await api.delete(`files/${fileId}/`);
            setAttachments(prev => prev.filter(f => f.id !== fileId));
            toast.success(`"${fileName}" deleted.`);
        } catch (err) {
            console.error(err);
            toast.error(`Could not delete "${fileName}"`);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (id) setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const handleNewChat = async () => {
        try {
            const response = await api.post('conversations/', { title: 'New Conversation' });
            myFetchConversations();
            navigate(`/chat/${response.data.id}`);
            if (isMobile) setSidebarOpen(false);
        } catch (err) {
            console.error("Could not start a new chat!", err);
        }
    };


    const handleSendMessage = async (e) => {
        e.preventDefault();
        const userQuery = input.trim();
        if ((!userQuery && attachments.length === 0) || loading) return;

        let currentId = id;
        if (!currentId) return;

        const stagedFilesForMessage = [...attachments];

        const userMsg = {
            sender: 'user',
            content: userQuery,
            timestamp: new Date().toISOString(),
            attachments: stagedFilesForMessage
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setAttachments([]);
        setLoading(true);

        try {
            const response = await api.post(`conversations/${currentId}/messages/`, { content: userQuery });

            setMessages(prev => [
                ...prev.slice(0, -1),
                response.data.user_message,
                response.data.ai_message
            ]);
            setLatestAiMessageId(response.data.ai_message.id);
            setIsPaused(false);
            setIsGenerationDone(false);
            if (isAtBottom) scrollToBottom();

            myFetchConversations();
        } catch (err) {

            const errorMsg = err.response?.data?.error || 'Failed to send message';
            toast.error(errorMsg);

            myFetchMessages(currentId);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateResponse = async () => {
        if (!id || loading) return;

        setLoading(true);
        try {
            const response = await api.post(`conversations/${id}/messages/`, { regenerate: true });

            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== response.data.ai_message.id);
                return [...filtered, response.data.ai_message];
            });
            setLatestAiMessageId(response.data.ai_message.id);
            setIsPaused(false);
            setIsGenerationDone(false);
            if (isAtBottom) scrollToBottom();

            myFetchConversations();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to regenerate response';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteChat = (e, chatId) => {
        e.stopPropagation();
        setDeleteConfirmId(chatId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        const chatId = deleteConfirmId;
        setDeleteConfirmId(null);

        try {
            await api.delete(`conversations/${chatId}/`);
            myFetchConversations();
            if (id == chatId) navigate('/chat');
            toast.success('Chat deleted forever!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete chat.');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await api.delete('profile/delete/');
            setShowDeleteAccountConfirm(false);
            toast.success('Your account has been permanently deleted.');
            logout();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete account.');
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground font-sans"
        >
            <motion.div
                initial={{ x: isMobile ? -280 : -20, opacity: 0 }}
                animate={{
                    width: isMobile ? 280 : (sidebarOpen ? 280 : 0),
                    x: isMobile ? (sidebarOpen ? 0 : -280) : 0,
                    opacity: 1
                }}
                exit={{ x: isMobile ? -280 : -20, opacity: 0 }}
                transition={{ type: "tween", duration: 0.25 }}
                className={cn(
                    "flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden z-50 transition-all",
                    isMobile ? "fixed inset-y-0 left-0 shadow-2xl" : "relative"
                )}
            >
                <div className="p-4 border-b border-sidebar-border h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                            <img src="/favicon.png" alt="Nexus Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Nexus AI</span>
                    </div>
                    {isMobile && (
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="p-3">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border/50 rounded-lg shadow-sm transition-all group"
                    >
                        <Plus size={16} className="text-primary" />
                        <span className="font-medium">New Chat</span>
                    </button>
                    <div className="mt-3 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40" />
                        <input
                            type="text"
                            placeholder="Find a chat..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-sidebar-accent/30 border-none rounded-md py-1.5 pl-9 pr-3 text-xs focus:ring-1 focus:ring-primary/50 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    {filteredConversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => {
                                navigate(`/chat/${conv.id}`);
                                if (isMobile) setSidebarOpen(false); // Close sidebar drawer on mobile viewports
                            }}
                            className={cn(
                                "group flex items-center justify-between px-3 py-2.5 text-sm rounded-md cursor-pointer transition-colors relative",
                                id == conv.id
                                    ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"
                            )}
                        >
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <MessageSquare
                                    size={16}
                                    className={id == conv.id ? "text-primary flex-shrink-0" : "text-sidebar-foreground/40 flex-shrink-0"}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="truncate font-medium">{conv.title}</div>
                                    <div className="text-[10px] text-sidebar-foreground/30 mt-0.5">
                                        {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDeleteChat(e, conv.id)}
                                className="opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive text-sidebar-foreground/30 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* User Profile and Logout */}
                <div className="p-3 border-t border-sidebar-border">
                    <div className="flex items-center justify-between bg-sidebar-accent/30 rounded-lg p-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                                <span className="text-xs font-bold text-primary">
                                    {(user?.username || 'U')[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="truncate">
                                <div className="text-sm font-medium text-sidebar-foreground">{user?.username || 'User'}</div>
                                <div className="text-[10px] text-sidebar-foreground/40 truncate">Free Plan</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowDeleteAccountConfirm(true)}
                                className="p-1.5 rounded-md text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                title="Delete Account"
                            >
                                <Trash2 size={15} />
                            </button>
                            <button
                                onClick={logout}
                                className="p-1.5 rounded-md text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isMobile && sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
                    />
                )}
            </AnimatePresence>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="flex-1 flex flex-col relative min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"
            >
                {isDragOver && (
                    <div className="absolute inset-0 bg-background/85 backdrop-blur-md z-30 flex flex-col items-center justify-center border-2 border-dashed border-primary/50 m-4 rounded-2xl animate-fade-in pointer-events-none">
                        <UploadCloud size={48} className="text-primary animate-pulse mb-4" />
                        <p className="text-lg font-semibold tracking-wide">Drop your files here to attach to this chat</p>
                        <p className="text-sm text-muted-foreground mt-1">Images (JPG, PNG, GIF, TIFF) & Documents (PDF, Word, Markdown, TXT) up to 10MB each</p>
                    </div>
                )}
                <header className="h-16 border-b border-border/50 flex items-center px-4 sm:px-6 justify-between backdrop-blur-md bg-background/80 sticky top-0 z-10">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden mr-2">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-1.5 rounded-md hover:bg-accent text-foreground/60 transition-colors flex-shrink-0"
                        >
                            {isMobile ? <Menu size={20} /> : (sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />)}
                        </button>
                        <h2 className="font-semibold text-xs sm:text-sm tracking-wide text-foreground/90 uppercase truncate">
                            {conversations.find(c => c.id == id)?.title || 'Nexus Workspace'}
                        </h2>
                    </div>

                    {latestAiMessageId && (
                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                            <span>{isPaused ? "Resume" : "Pause"} AI</span>
                        </button>
                    )}
                </header>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-8"
                >
                    <div className="max-w-3xl mx-auto flex flex-col gap-8">
                        {(!id || messages.length === 0) && (
                            <div className="flex flex-col items-center justify-center text-center mt-[15dvh]">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-16 h-16 bg-sidebar-accent rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-border overflow-hidden p-0"
                                >
                                    <img src="/favicon.png" alt="Nexus Logo" className="w-full h-full object-cover" />
                                </motion.div>
                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-3xl font-bold mb-3 tracking-tight"
                                >
                                    Welcome to Nexus
                                </motion.h1>
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-muted-foreground text-lg max-w-md mx-auto"
                                >
                                    I am your intelligent assistant. Start a chat on the left to begin!
                                </motion.p>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={index}
                                className={cn(
                                    "flex w-full gap-4",
                                    msg.sender === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                {msg.sender === 'ai' && (
                                    <div className="w-8 h-8 rounded-lg bg-sidebar-accent border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                                        <TerminalSquare size={16} className="text-primary" />
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-[85%] leading-relaxed p-4 rounded-2xl",
                                    msg.sender === 'user'
                                        ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
                                        : "bg-sidebar-accent/50 text-foreground rounded-tl-sm border border-border/50"
                                )}>
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className={cn(
                                            "flex flex-wrap gap-2 mb-3 mt-0.5",
                                            msg.sender === 'user' ? "justify-end" : "justify-start"
                                        )}>
                                            {msg.attachments.map((att) => {
                                                const ext = att.file_name.split('.').pop().toLowerCase();
                                                const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp'].includes(ext);
                                                return (
                                                    <div
                                                        key={att.id}
                                                        className="relative w-16 h-16 rounded-xl border border-border/40 overflow-hidden bg-background/20 flex-shrink-0 shadow-sm transition-transform hover:scale-102"
                                                        title={att.file_name}
                                                    >
                                                        {isImg ? (
                                                            <img
                                                                src={att.file}
                                                                alt={att.file_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col justify-between p-2">
                                                                <div className="flex flex-col gap-1 w-full mt-0.5">
                                                                    <div className={cn("h-0.5 rounded-sm w-7", msg.sender === 'user' ? "bg-white/40" : "bg-foreground/20")} />
                                                                    <div className={cn("h-0.5 rounded-sm w-9", msg.sender === 'user' ? "bg-white/25" : "bg-foreground/15")} />
                                                                    <div className={cn("h-0.5 rounded-sm w-6", msg.sender === 'user' ? "bg-white/20" : "bg-foreground/10")} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-1 left-1 text-[7px] font-bold text-white px-1.5 py-0.5 bg-black/80 rounded uppercase tracking-wider select-none font-sans">
                                                            {ext}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className={cn(
                                        "markdown-content",
                                        msg.sender === 'ai' && "prose prose-invert prose-sm max-w-none"
                                    )}>
                                        {msg.sender === 'ai' && msg.id === latestAiMessageId ? (
                                            <Typewriter
                                                text={msg.content}
                                                speed={5}
                                                isPaused={isPaused}
                                                onUpdate={smartScroll}
                                                onComplete={() => {
                                                    setLatestAiMessageId(null);
                                                    setIsGenerationDone(true);
                                                    if (!isAtBottom) setShowNewMsgToast(true);
                                                }}
                                            />
                                        ) : (
                                            <ReactMarkdown>
                                                {msg.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {messages.length > 0 && messages[messages.length - 1].sender === 'user' && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex w-full gap-4 justify-start"
                            >
                                <div className="w-8 h-8 rounded-lg bg-sidebar-accent border border-destructive/20 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                                    <AlertTriangle size={16} className="text-destructive font-medium" />
                                </div>
                                <div className="max-w-[85%] leading-relaxed p-4 rounded-2xl bg-destructive/5 text-foreground rounded-tl-sm border border-destructive/20 flex flex-col gap-3">
                                    <div className="text-xs md:text-sm font-medium text-destructive-foreground/90">
                                        Nexus AI failed to respond. The usage limit might be reached or an error occurred.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateResponse}
                                        className="flex items-center gap-2 px-4 py-2 w-fit bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-md hover:scale-102 active:scale-98"
                                    >
                                        <RotateCw size={14} />
                                        <span>Regenerate Response</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {loading && (
                            <div className="flex w-full justify-start gap-4 animate-pulse">
                                <div className="w-8 h-8 rounded-lg bg-sidebar-accent border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                                    <TerminalSquare size={16} className="text-primary" />
                                </div>
                                <div className="flex gap-1 items-center pt-4">
                                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>
                < AnimatePresence >
                    {showNewMsgToast && (
                        <motion.button
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            onClick={() => {
                                scrollToBottom();
                                setShowNewMsgToast(false);
                                setIsGenerationDone(false);
                            }}
                            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-sidebar border border-border shadow-2xl rounded-2xl text-xs font-bold text-primary hover:bg-sidebar-accent transition-all group"
                        >
                            <ChevronDown size={14} className={isGenerationDone ? "" : "animate-bounce"} />
                            <span>{isGenerationDone ? "Generation finished. Click to see." : "AI is typing newer messages..."}</span>
                        </motion.button>
                    )}
                </AnimatePresence>

                {id && (
                    <div className="p-4 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0">
                        <div className="max-w-3xl mx-auto relative group">
                            <div className="absolute inset-0 rounded-xl bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative flex flex-col bg-sidebar-accent/50 border border-border shadow-2xl rounded-2xl p-1.5 focus-within:border-primary/50 focus-within:bg-sidebar-accent/80 transition-all duration-300 backdrop-blur-sm">

                                {(attachments.length > 0 || Object.keys(uploadingFiles).length > 0) && (
                                    <div className="flex flex-wrap gap-3.5 p-2 bg-transparent relative z-10">
                                        {Object.entries(uploadingFiles).map(([key, data]) => {
                                            const name = data.name.toLowerCase();
                                            let ext = 'FILE';
                                            if (name.endsWith('.pdf')) ext = 'PDF';
                                            else if (name.endsWith('.docx') || name.endsWith('.doc')) ext = 'DOCX';
                                            else if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif')) ext = 'IMG';
                                            else if (name.endsWith('.md')) ext = 'MD';
                                            else if (name.endsWith('.txt')) ext = 'TXT';

                                            return (
                                                <div
                                                    key={key}
                                                    className="w-20 h-20 bg-sidebar-accent/80 rounded-xl border border-border/70 p-2 flex flex-col justify-between relative shadow-sm select-none overflow-hidden"
                                                >
                                                    <div className="space-y-1.5 mt-1.5 animate-pulse">
                                                        <div className="h-1.5 bg-foreground/20 rounded w-11" />
                                                        <div className="h-1.5 bg-foreground/15 rounded w-7" />
                                                    </div>

                                                    <div className="text-[8px] font-bold text-foreground/45 px-1.5 py-0.5 bg-foreground/5 rounded uppercase w-fit block tracking-wider">
                                                        {ext}
                                                    </div>
                                                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[0.5px] flex items-center justify-center flex-col gap-1">
                                                        <Loader2 size={14} className="animate-spin text-primary" />
                                                        <span className="text-[9px] font-bold text-primary">{data.progress}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {attachments.map(att => {
                                            const isImg = att.file_type.startsWith('image/');
                                            const ext = att.file_name.split('.').pop()?.toUpperCase() || 'FILE';

                                            return (
                                                <div
                                                    key={att.id}
                                                    className="w-20 h-20 bg-card rounded-xl border border-border hover:border-primary/50 relative shadow-md group overflow-hidden transition-all duration-300"
                                                >
                                                    {isImg ? (
                                                        <img
                                                            src={att.file}
                                                            alt={att.file_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-sidebar/50 flex flex-col justify-between p-2">
                                                            <div className="flex flex-col gap-1.5 w-full mt-1">
                                                                <div className="h-1 bg-foreground/25 rounded-sm w-10" />
                                                                <div className="h-1 bg-foreground/15 rounded-sm w-12" />
                                                                <div className="h-1 bg-foreground/10 rounded-sm w-9" />
                                                                <div className="h-1 bg-foreground/10 rounded-sm w-11" />
                                                                <div className="h-1 bg-foreground/[0.08] rounded-sm w-7" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-1.5 left-1.5 text-[8px] font-bold text-white px-1.5 py-0.5 bg-black/75 backdrop-blur-sm rounded uppercase select-none pointer-events-none z-10 tracking-widest font-sans">
                                                        {ext}
                                                    </div>
                                                    <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAttachment(att.id, att.file_name)}
                                                            className="p-1.5 rounded-full bg-destructive/90 hover:bg-destructive text-white hover:scale-110 transition-all shadow-lg"
                                                            title="Remove file"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <form
                                    onSubmit={handleSendMessage}
                                    className="relative flex items-center gap-2 bg-transparent p-0.5"
                                >
                                    <div className="relative flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setShowUploadMenu(!showUploadMenu)}
                                            className={cn(
                                                "p-2 ml-1 rounded-lg hover:bg-sidebar-accent hover:text-primary transition-all flex items-center justify-center flex-shrink-0",
                                                showUploadMenu ? "text-primary bg-sidebar-accent" : "text-muted-foreground/75"
                                            )}
                                            title="Attach files"
                                            aria-label="Upload files picker menu"
                                        >
                                            <Paperclip size={18} />
                                        </button>

                                        <AnimatePresence>
                                            {showUploadMenu && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40 bg-transparent"
                                                        onClick={() => setShowUploadMenu(false)}
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute bottom-12 left-1 z-50 min-w-[170px] bg-card border border-border/80 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-0.5 backdrop-blur-md"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowUploadMenu(false);
                                                                docInputRef.current?.click();
                                                            }}
                                                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground/80 hover:text-primary hover:bg-sidebar-accent/80 rounded-lg transition-colors text-left w-full"
                                                        >
                                                            <FileText size={15} className="text-primary/70" />
                                                            <span>Upload Document</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowUploadMenu(false);
                                                                imgInputRef.current?.click();
                                                            }}
                                                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground/80 hover:text-primary hover:bg-sidebar-accent/80 rounded-lg transition-colors text-left w-full"
                                                        >
                                                            <Image size={15} className="text-primary/70" />
                                                            <span>Upload Image</span>
                                                        </button>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <input
                                        type="file"
                                        ref={docInputRef}
                                        onChange={(e) => {
                                            if (e.target.files) handleFileUpload(e.target.files);
                                            e.target.value = '';
                                        }}
                                        multiple
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.txt,.md"
                                    />

                                    <input
                                        type="file"
                                        ref={imgInputRef}
                                        onChange={(e) => {
                                            if (e.target.files) handleFileUpload(e.target.files);
                                            e.target.value = '';
                                        }}
                                        multiple
                                        className="hidden"
                                        accept="image/*"
                                    />

                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent border-0 focus:ring-0 px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
                                        placeholder="Type your message here..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={loading}
                                    />

                                    <button
                                        type="submit"
                                        disabled={(!input.trim() && attachments.length === 0) || loading}
                                        className={cn(
                                            "p-2.5 rounded-lg transition-all shadow-lg mr-1",
                                            (input.trim() || attachments.length > 0) && !loading
                                                ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
                                                : "bg-muted text-muted-foreground/30"
                                        )}
                                    >
                                        <Send size={18} className={(input.trim() || attachments.length > 0) ? "translate-x-0.5 -translate-y-0.5" : ""} />
                                    </button>
                                </form>
                            </div>
                            <p className="text-center mt-3 text-[10px] text-muted-foreground/60 font-medium tracking-wide">
                                Nexus AI - Powered by Google Gemini
                            </p>
                        </div>
                    </div>
                )
                }
            </div >

            < AnimatePresence >
                {deleteConfirmId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
                            <h3 className="text-xl font-bold mb-2">Delete this chat?</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                If you click delete, all messages will be gone forever.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-4 py-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 text-foreground transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm font-bold shadow-lg shadow-destructive/20"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            <AnimatePresence>
                {showDeleteAccountConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
                            <h3 className="text-xl font-bold mb-2">Delete your account?</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                Are you sure you want to delete your account? This action is permanent and cannot be undone. All your conversations, messages, and uploaded files will be deleted forever.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteAccountConfirm(false)}
                                    className="px-4 py-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 text-foreground transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm font-bold shadow-lg shadow-destructive/20"
                                >
                                    Yes, Delete Account
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            <style>{`
                .markdown-content p { margin-bottom: 0.75rem; }
                .markdown-content p:last-child { margin-bottom: 0; }
                .markdown-content code { background-color: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.9em; }
                .markdown-content pre { background-color: #1a1a1a; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; border: 1px solid rgba(255,255,255,0.05); }
                .markdown-content strong { color: var(--color-primary); }
            `}</style>
        </motion.div >
    );
};

export default ChatPage;    
