import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
// These are little icons like the send button and trash can
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


// --- TYPEWRITER COMPONENT ---
// This makes the AI answers appear as if they are being typed in real-time
const Typewriter = ({ text, speed = 5, onUpdate, isPaused, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!isPaused && index < text.length) {
            const timeout = setTimeout(() => {
                // To match Claude's speed, we append multiple characters if the text is long
                // or just keep a very low interval. Appending 3 at once feels very smooth.
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

// --- THE MAIN CHAT PAGE ---
const ChatPage = () => {
    // These are like variables that React watches. When they change, the page updates!
    const { id } = useParams(); // Gets the ID of the chat from the URL
    const navigate = useNavigate(); // Helps us switch between pages
    const { user, logout } = useContext(AuthContext); // Gets our login info

    const [conversations, setConversations] = useState([]); // List of all our chats
    const [messages, setMessages] = useState([]); // All messages in the current chat
    const [input, setInput] = useState(''); // What is currently typed in the box
    const [loading, setLoading] = useState(false); // Are we waiting for the AI?
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); // Is the left menu open?
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Is it mobile screen?

    // Watch for window resize to handle responsiveness
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

    // This is for auto-scrolling to the bottom of the chat
    const [searchQuery, setSearchQuery] = useState(''); // For searching through chats
    const [deleteConfirmId, setDeleteConfirmId] = useState(null); // Which chat are we deleting?
    const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false); // Toggle delete account confirmation popup
    const [latestAiMessageId, setLatestAiMessageId] = useState(null); // Which message is currently typing?
    const [isPaused, setIsPaused] = useState(false); // Pause/Resume AI typing
    const [isAtBottom, setIsAtBottom] = useState(true); // Track if user is at bottom
    const [showNewMsgToast, setShowNewMsgToast] = useState(false); // Floating notification
    const [isGenerationDone, setIsGenerationDone] = useState(false); // Track completion
    const scrollContainerRef = useRef(null); // Ref for the scrollable area
    const messagesEndRef = useRef(null); // Ref for the bottom of the messages

    // File upload & management states
    const [attachments, setAttachments] = useState([]); // File list for the active chat
    const [uploadingFiles, setUploadingFiles] = useState({}); // Tracking upload progress
    const [isDragOver, setIsDragOver] = useState(false); // Drag area detection
    const fileInputRef = useRef(null); // Ref to activate file picker

    // Helper function to scroll down
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Smart scroll logic: only scroll if the user is already at the bottom
    const smartScroll = () => {
        if (isAtBottom) {
            scrollToBottom();
        } else if (latestAiMessageId) {
            // If they aren't at bottom but AI is typing, show the toast
            setShowNewMsgToast(true);
        }
    };

    // Detect if user has scrolled up
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const reachedBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(reachedBottom);
        if (reachedBottom) setShowNewMsgToast(false);
    };

    // When the page first loads, fetch all the chats from the database
    useEffect(() => {
        myFetchConversations();
    }, []);

    // If the chat ID in the URL changes, fetch the messages and attachments for that specific chat
    useEffect(() => {
        if (id) {
            myFetchMessages(id);
            myFetchAttachments(id);
            setLatestAiMessageId(null); // Stop typing animations from previous chats
        } else {
            setMessages([]); // Clear messages if no chat is selected
            setAttachments([]);
            setUploadingFiles({});
            setIsDragOver(false);
        }
    }, [id]);

    // Every time we get a new message, scroll to the bottom if we weren't looking elsewhere
    useEffect(() => {
        if (isAtBottom) scrollToBottom();
    }, [messages]);

    // Function to talk to our Django backend and get the list of chats
    const myFetchConversations = async () => {
        try {
            const response = await api.get('conversations/');
            setConversations(response.data);
        } catch (err) {
            console.error("Oh no, could not get chats!", err);
        }
    };

    // Function to get messages for one chat
    const myFetchMessages = async (convId) => {
        try {
            const response = await api.get(`conversations/${convId}/messages/`);
            setMessages(response.data);
        } catch (err) {
            console.error("Oops, could not get messages!", err);
        }
    };

    // Function to get attachments for one chat
    const myFetchAttachments = async (convId) => {
        try {
            const response = await api.get(`conversations/${convId}/`);
            setAttachments(response.data.staged_attachments || []);
        } catch (err) {
            console.error("Oops, could not fetch conversation details for attachments!", err);
        }
    };

    // Handle File Upload via drag-and-drop or file selection
    const handleFileUpload = async (files) => {
        if (!id) {
            toast.error("Please create or select a chat conversation first!");
            return;
        }

        // Loop through and upload each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 1. Validation
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

            // Create temporary key for tracking in progress loaders
            const uploadId = `${Date.now()}-${file.name}`;
            setUploadingFiles(prev => ({
                ...prev,
                [uploadId]: { name: file.name, progress: 0 }
            }));

            // Prepare multipart request data
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

                // Success! Append to attachments list
                setAttachments(prev => [...prev, response.data]);
                toast.success(`"${file.name}" uploaded successfully!`);
            } catch (err) {
                console.error(err);
                const errMsg = err.response?.data?.error || `Failed to process/upload "${file.name}"`;
                toast.error(errMsg);
            } finally {
                // Delete from loaders
                setUploadingFiles(prev => {
                    const copy = { ...prev };
                    delete copy[uploadId];
                    return copy;
                });
            }
        }
    };

    // Remove file attachment
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

    // Drag-and-drop listeners
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

    // When you click 'New Chat'
    const handleNewChat = async () => {
        try {
            const response = await api.post('conversations/', { title: 'New Conversation' });
            myFetchConversations(); // Refresh the list
            navigate(`/chat/${response.data.id}`); // Go to the new chat page
        } catch (err) {
            console.error("Could not start a new chat!", err);
        }
    };


    // When you press 'Send'
    const handleSendMessage = async (e) => {
        e.preventDefault(); // Stop the page from refreshing
        const userQuery = input.trim();
        if ((!userQuery && attachments.length === 0) || loading) return; // Don't send if empty AND no files, or still waiting

        let currentId = id;
        if (!currentId) return;

        // Remember unstaged assets to display immediately in user message bubble and restore if failure
        const stagedFilesForMessage = [...attachments];

        // Immediately show the user's message on screen
        const userMsg = {
            sender: 'user',
            content: userQuery,
            timestamp: new Date().toISOString(),
            attachments: stagedFilesForMessage
        };
        setMessages(prev => [...prev, userMsg]);
        setInput(''); // Clear the text box
        setAttachments([]); // Clear staging area files!
        setLoading(true); // Show the loading dots

        try {
            // Send the message to the AI
            const response = await api.post(`conversations/${currentId}/messages/`, { content: userQuery });

            // Replace our 'fake' user message with the real one from the server and add the AI reply
            setMessages(prev => [
                ...prev.slice(0, -1),
                response.data.user_message,
                response.data.ai_message
            ]);
            setLatestAiMessageId(response.data.ai_message.id);
            setIsPaused(false);
            setIsGenerationDone(false);
            if (isAtBottom) scrollToBottom();

            // If the chat was named "New Conversation", it might have a new name now!
            myFetchConversations();
        } catch (err) {
            // Restore attachments if send fails
            setAttachments(stagedFilesForMessage);
            setInput(userQuery); // Keep the typed message in input box for easy edit/try again
            const errorMsg = err.response?.data?.error || 'Failed to send message';
            toast.error(errorMsg);

            // Align the messages with the database (which includes the user message we created)
            myFetchMessages(currentId);
        } finally {
            setLoading(false); // Hide the loading dots
        }
    };

    // When you click 'Regenerate Response'
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

    // This shows the 'Are you sure?' popup for deleting
    const handleDeleteChat = (e, chatId) => {
        e.stopPropagation(); // Don't open the chat when clicking the delete button
        setDeleteConfirmId(chatId);
    };

    // This actually deletes the chat from the database
    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        const chatId = deleteConfirmId;
        setDeleteConfirmId(null);

        try {
            await api.delete(`conversations/${chatId}/`);
            myFetchConversations(); // Refresh the list
            if (id == chatId) navigate('/chat'); // If we were in that chat, go home
            toast.success('Chat deleted forever!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete chat.');
        }
    };

    // This actually deletes the user account from the database
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

    // Narrow down the list of chats based on what the user typed in search
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
            {/* LEFT SIDEBAR (The menu with all your chats) */}
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
                    "flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden z-40 transition-all",
                    isMobile ? "fixed inset-y-0 left-0 shadow-2xl" : "relative"
                )}
            >
                {/* Logo and App Name */}
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

                {/* New Chat Button and Search */}
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

                {/* The list of chat threads */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    {filteredConversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => navigate(`/chat/${conv.id}`)}
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
                            {/* The small delete button that appears when you hover */}
                            <button
                                onClick={(e) => handleDeleteChat(e, conv.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive text-sidebar-foreground/30 transition-all"
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

            {/* BACKDROP OVERLAY ON MOBILE */}
            <AnimatePresence>
                {isMobile && sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>
 
            {/* MAIN CHAT AREA (Where the talking happens) */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="flex-1 flex flex-col relative min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"
            >
                {/* Drag over overlay layout */}
                {isDragOver && (
                    <div className="absolute inset-0 bg-background/85 backdrop-blur-md z-30 flex flex-col items-center justify-center border-2 border-dashed border-primary/50 m-4 rounded-2xl animate-fade-in pointer-events-none">
                        <UploadCloud size={48} className="text-primary animate-pulse mb-4" />
                        <p className="text-lg font-semibold tracking-wide">Drop your files here to attach to this chat</p>
                        <p className="text-sm text-muted-foreground mt-1">Images (JPG, PNG, GIF, TIFF) & Documents (PDF, Word, Markdown, TXT) up to 10MB each</p>
                    </div>
                )}
                {/* Header at the top */}
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

                    {/* Pause/Resume button in the header if AI is typing */}
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

                {/* The area with all the bubbles */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-8"
                >
                    <div className="max-w-3xl mx-auto flex flex-col gap-8">
                        {/* If no chat is selected or the chat is empty, show a welcome message */}
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

                        {/* Show all the messages in the chat */}
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
                                    {/* Render attachments for this message block */}
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

                        {/* Show the regeneration/error option if the last message is from user and we are not loading */}
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

                        {/* Show the loading bubbles when the AI is 'thinking' */}
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
                        {/* Hidden div to help with scrolling down */}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* SCROLL TO BOTTOM NOTIFICATION */}
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

                {/* THE INPUT BOX AT THE BOTTOM */}
                {id && (
                    <div className="p-4 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0">
                        <div className="max-w-3xl mx-auto relative group">
                            <div className="absolute inset-0 rounded-xl bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* CLAUDE STYLE INPUT BOX CONTAINER */}
                            <div className="relative flex flex-col bg-sidebar-accent/50 border border-border shadow-2xl rounded-2xl p-1.5 focus-within:border-primary/50 focus-within:bg-sidebar-accent/80 transition-all duration-300 backdrop-blur-sm">

                                {/* 1st and 2nd Image style: card horizontal layout */}
                                {(attachments.length > 0 || Object.keys(uploadingFiles).length > 0) && (
                                    <div className="flex flex-wrap gap-3.5 p-2 bg-transparent relative z-10">
                                        {/* UPLOADING files (1st Image style - skeleton loader card) */}
                                        {Object.entries(uploadingFiles).map(([key, data]) => {
                                            // Extract file type from name or default
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
                                                    {/* Pulse/Skeleton lines matching 1st Image */}
                                                    <div className="space-y-1.5 mt-1.5 animate-pulse">
                                                        <div className="h-1.5 bg-foreground/20 rounded w-11" />
                                                        <div className="h-1.5 bg-foreground/15 rounded w-7" />
                                                    </div>

                                                    {/* Format badge in bottom left */}
                                                    <div className="text-[8px] font-bold text-foreground/45 px-1.5 py-0.5 bg-foreground/5 rounded uppercase w-fit block tracking-wider">
                                                        {ext}
                                                    </div>

                                                    {/* Loading progress spinner or percentage bar */}
                                                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[0.5px] flex items-center justify-center flex-col gap-1">
                                                        <Loader2 size={14} className="animate-spin text-primary" />
                                                        <span className="text-[9px] font-bold text-primary">{data.progress}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* UPLOADED attachments (2nd Image style - thumbnail or visual card) */}
                                        {attachments.map(att => {
                                            const isImg = att.file_type.startsWith('image/');
                                            const ext = att.file_name.split('.').pop()?.toUpperCase() || 'FILE';

                                            return (
                                                <div
                                                    key={att.id}
                                                    className="w-20 h-20 bg-card rounded-xl border border-border hover:border-primary/50 relative shadow-md group overflow-hidden transition-all duration-300"
                                                >
                                                    {/* Thumbnail or simulated document lines */}
                                                    {isImg ? (
                                                        <img
                                                            src={att.file} // Loaded via relative/absolute file url
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

                                                    {/* Format badge in bottom left */}
                                                    <div className="absolute bottom-1.5 left-1.5 text-[8px] font-bold text-white px-1.5 py-0.5 bg-black/75 backdrop-blur-sm rounded uppercase select-none pointer-events-none z-10 tracking-widest font-sans">
                                                        {ext}
                                                    </div>

                                                    {/* Hover: only show delete X */}
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

                                {/* Form text input section */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="relative flex items-center gap-2 bg-transparent p-0.5"
                                >
                                    {/* FILE INPUT TRIGGER BUTTON */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 ml-1 rounded-lg hover:bg-sidebar-accent hover:text-primary transition-all text-muted-foreground/75 flex items-center justify-center flex-shrink-0"
                                        title="Upload files (Images, PDF, Word, TXT, MD)"
                                        aria-label="Upload files picker"
                                    >
                                        <Paperclip size={18} />
                                    </button>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files) handleFileUpload(e.target.files);
                                            e.target.value = ''; // Clear value
                                        }}
                                        multiple
                                        className="hidden"
                                        accept="image/*,.pdf,.doc,.docx,.txt,.md"
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

            {/* DELETE POPUP (Shows when you try to delete a chat) */}
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

            {/* DELETE ACCOUNT POPUP (Shows when you try to delete your account) */}
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
