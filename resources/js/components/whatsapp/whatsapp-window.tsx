import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { 
    ArrowLeft, 
    Maximize2, 
    Minimize2, 
    MoreVertical, 
    Paperclip, 
    Phone, 
    Search, 
    Send, 
    Video,
    X,
    Image as ImageIcon,
    Mic,
    Smile,
    Maximize
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WhatsAppChat {
    id: string;
    name: string;
    phone: string;
    unreadCount: number;
    lastMessage: {
        body: string;
        timestamp: number;
    } | null;
    isGroup?: boolean;
}

interface WhatsAppMessage {
    id: string;
    body: string;
    from: string;
    to: string;
    timestamp: number;
    type: string;
    isForwarded: boolean;
    hasMedia: boolean;
    mediaUrl?: string;
}

interface WhatsAppWindowProps {
    companyId: number;
    driverPhoneNumbers: string[];
    isOpen: boolean;
    onClose: () => void;
    initialChatPhone?: string;
    isFloating?: boolean;
    onToggleFloating?: () => void;
}

export function WhatsAppWindow({ 
    companyId, 
    driverPhoneNumbers, 
    isOpen, 
    onClose,
    initialChatPhone,
    isFloating: externalIsFloating,
    onToggleFloating
}: WhatsAppWindowProps) {
    const [chats, setChats] = useState<WhatsAppChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFloating, setIsFloating] = useState(externalIsFloating || false);
    const [chatsPanelWidth, setChatsPanelWidth] = useState(33.33); // Percentage width for chats panel (default 1/3 = 33.33%)
    const [chatNotFoundError, setChatNotFoundError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const windowRef = useRef<HTMLDivElement>(null);

    // Get WhatsApp service URL from environment or use default
    const whatsappServiceUrl = (window as any).WHATSAPP_SERVICE_URL || import.meta.env.VITE_WHATSAPP_SERVICE_URL || 'http://localhost:3001';

    useEffect(() => {
        if (isOpen && companyId) {
            loadChats();
            // Auto-refresh chats every 10 seconds
            const interval = setInterval(() => {
                loadChats();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [isOpen, companyId, driverPhoneNumbers]);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id);
            // Poll for new messages every 5 seconds
            const interval = setInterval(() => {
                loadMessages(selectedChat.id);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    useEffect(() => {
        if (initialChatPhone && chats.length > 0) {
            // Clear previous error
            setChatNotFoundError(null);
            
            // Normalize phone numbers for comparison
            const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
            const normalizedInitial = normalizePhone(initialChatPhone);
            
            const chat = chats.find(c => {
                const normalizedChat = normalizePhone(c.phone);
                // Check if phones match (either exact match or one contains the other)
                return normalizedChat === normalizedInitial || 
                       normalizedChat.includes(normalizedInitial) || 
                       normalizedInitial.includes(normalizedChat);
            });
            
            if (chat) {
                setSelectedChat(chat);
                setChatNotFoundError(null);
            } else {
                // If chat not found, try to find by phone number in chat ID
                const chatById = chats.find(c => {
                    const chatId = c.id || '';
                    const phoneInId = chatId.split('@')[0].replace(/\D/g, '');
                    return phoneInId === normalizedInitial || 
                           phoneInId.includes(normalizedInitial) || 
                           normalizedInitial.includes(phoneInId);
                });
                if (chatById) {
                    setSelectedChat(chatById);
                    setChatNotFoundError(null);
                } else {
                    // Chat not found - show error message
                    setChatNotFoundError(`هذا الرقم (${initialChatPhone}) ليس لديه WhatsApp`);
                    setSelectedChat(null);
                }
            }
        } else if (initialChatPhone && chats.length === 0 && !loading) {
            // If chats are loaded but empty, and we're looking for a specific phone
            setChatNotFoundError(`هذا الرقم (${initialChatPhone}) ليس لديه WhatsApp`);
        }
    }, [initialChatPhone, chats, loading]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChats = async () => {
        try {
            setLoading(true);
            // Send phone_numbers only if provided, otherwise get all chats
            const payload = driverPhoneNumbers && driverPhoneNumbers.length > 0 
                ? { phone_numbers: driverPhoneNumbers }
                : {};
            
            const response = await axios.post(
                `${whatsappServiceUrl}/api/whatsapp/${companyId}/chats`,
                payload
            );
            // Filter out any group chats that might have slipped through (double check)
            const individualChats = (response.data.chats || []).filter((chat: WhatsAppChat) => {
                // Group chats typically have IDs that don't contain a phone number pattern
                // or have @g.us suffix instead of @c.us
                const chatId = chat.id || '';
                return !chatId.includes('@g.us') && !chat.isGroup;
            });
            setChats(individualChats);
        } catch (error: any) {
            console.error('Error loading chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        try {
            const response = await axios.get(
                `${whatsappServiceUrl}/api/whatsapp/${companyId}/chats/${chatId}/messages`
            );
            setMessages(response.data.messages || []);
        } catch (error: any) {
            console.error('Error loading messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!messageText.trim() || !selectedChat) return;

        try {
            await axios.post(
                `${whatsappServiceUrl}/api/whatsapp/${companyId}/send`,
                {
                    phone_number: selectedChat.phone,
                    message: messageText,
                }
            );
            setMessageText('');
            // Reload messages
            loadMessages(selectedChat.id);
        } catch (error: any) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + (error.response?.data?.error || error.message));
        }
    };

    const sendFile = async (file: File) => {
        if (!selectedChat) return;

        try {
            const formData = new FormData();
            formData.append('phone_number', selectedChat.phone);
            formData.append('file', file);
            formData.append('message', file.name);

            await axios.post(
                `${whatsappServiceUrl}/api/whatsapp/${companyId}/send-file`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            // Reload messages
            loadMessages(selectedChat.id);
        } catch (error: any) {
            console.error('Error sending file:', error);
            alert('Failed to send file: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            sendFile(file);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    };

    const filteredChats = chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.phone.includes(searchQuery)
    );

    if (!isOpen) return null;

    const windowContent = (
        <div 
            ref={windowRef}
            className="bg-white dark:bg-neutral-900 flex h-full"
            style={isFloating ? { width: '900px', height: '700px' } : {}}
        >
            {/* Left Panel - Chats List */}
            <div 
                className="border-r border-neutral-200 dark:border-neutral-700 flex flex-col bg-[#f0f2f5] dark:bg-neutral-800 relative"
                style={{ width: `${chatsPanelWidth}%`, minWidth: '200px', maxWidth: '70%' }}
            >
                {/* Header */}
                <div className="bg-[#075e54] text-white p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center">
                            <span className="text-white font-semibold">W</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">WhatsApp</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (onToggleFloating) {
                                    onToggleFloating();
                                } else {
                                    setIsFloating(!isFloating);
                                }
                            }}
                            className="text-white hover:bg-white/20 h-8 w-8 p-0"
                        >
                            <Maximize className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-white hover:bg-white/20 h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-2 bg-[#f0f2f5] dark:bg-neutral-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                            placeholder="Search or start new chat"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white dark:bg-neutral-700 border-0 h-9 rounded-lg"
                        />
                    </div>
                </div>

                {/* Chats List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
                    {loading && chats.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25d366] mx-auto mb-2"></div>
                                <p className="text-neutral-500 text-sm">Loading chats...</p>
                            </div>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <p className="text-neutral-500 text-sm mb-1">No chats found</p>
                                <p className="text-neutral-400 text-xs">Start a conversation to see chats here</p>
                            </div>
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`flex items-center gap-3 p-3 hover:bg-[#f5f6f6] dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 transition-colors ${
                                    selectedChat?.id === chat.id ? 'bg-[#f0f2f5] dark:bg-neutral-800' : ''
                                }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center text-white font-semibold flex-shrink-0 text-lg">
                                    {chat.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-medium text-sm truncate text-neutral-900 dark:text-neutral-100">{chat.name}</h4>
                                        {chat.lastMessage && (
                                            <span className="text-xs text-neutral-500 ml-2 flex-shrink-0">
                                                {formatTime(chat.lastMessage.timestamp)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        {chat.lastMessage ? (
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate flex-1">
                                                {chat.lastMessage.body}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-neutral-400 italic flex-1">No messages</p>
                                        )}
                                        {chat.unreadCount > 0 && (
                                            <div className="bg-[#25d366] text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {/* Resize Handle - Right Side of Chats Panel */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500 cursor-col-resize z-20 transition-colors"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startWidth = chatsPanelWidth;
                        const containerWidth = windowRef.current?.offsetWidth || 100;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                            const diff = moveEvent.clientX - startX;
                            const widthChangePercent = (diff / containerWidth) * 100;
                            const newWidth = Math.max(20, Math.min(70, startWidth + widthChangePercent));
                            setChatsPanelWidth(newWidth);
                        };
                        
                        const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }}
                    title="Drag to resize"
                />
            </div>

            {/* Right Panel - Chat View */}
            <div 
                className="flex flex-col bg-[#efeae2] dark:bg-[#0b141a]"
                style={{ width: `${100 - chatsPanelWidth}%`, minWidth: '30%' }}
            >
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-[#075e54] dark:bg-[#202c33] text-white p-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedChat(null)}
                                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-semibold">{selectedChat.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{selectedChat.name}</h3>
                                    <p className="text-xs text-white/80">{selectedChat.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div 
                            className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#efeae2] dark:bg-[#0b141a]" 
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23d4d4d4' stroke-width='0.5' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`,
                                backgroundSize: '100px 100px',
                            }}
                        >
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <p className="text-neutral-500 text-sm">No messages yet</p>
                                        <p className="text-neutral-400 text-xs mt-1">Start the conversation</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message, index) => {
                                    const isFromMe = !message.from.includes(selectedChat.phone);
                                    const showDate = index === 0 || 
                                        formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
                                    
                                    return (
                                        <div key={message.id}>
                                            {showDate && (
                                                <div className="text-center text-xs text-[#667781] dark:text-[#8696a0] mb-3 mt-2 font-medium">
                                                    {formatDate(message.timestamp)}
                                                </div>
                                            )}
                                            <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-0.5`}>
                                                <div
                                                    className={`max-w-[65%] rounded-lg px-3 py-2 shadow-md ${
                                                        isFromMe
                                                            ? 'bg-[#dcf8c6] dark:bg-[#005c4b]'
                                                            : 'bg-white dark:bg-[#202c33]'
                                                    }`}
                                                >
                                                    {message.hasMedia && message.mediaUrl && (
                                                        <img 
                                                            src={message.mediaUrl} 
                                                            alt="Media" 
                                                            className="max-w-full rounded mb-1"
                                                        />
                                                    )}
                                                    {message.body && (
                                                        <p className={`text-sm break-words whitespace-pre-wrap ${
                                                            isFromMe 
                                                                ? 'text-[#111b21] dark:text-white' 
                                                                : 'text-[#111b21] dark:text-[#e9edef]'
                                                        }`}>{message.body}</p>
                                                    )}
                                                    <div className="flex items-center justify-end gap-1 mt-1">
                                                        <span className={`text-xs ${
                                                            isFromMe 
                                                                ? 'text-[#667781] dark:text-[#99beb7]' 
                                                                : 'text-[#667781] dark:text-[#8696a0]'
                                                        }`}>
                                                            {formatTime(message.timestamp)}
                                                        </span>
                                                        {isFromMe && (
                                                            <span className="text-blue-500 ml-1">
                                                                <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                                                                    <path d="M15.5 0.5L8 8L0.5 0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                    <path d="M15.5 5.5L8 13L0.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-neutral-200 dark:border-[#313d45]">
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                >
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                />
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                >
                                    <Smile className="h-5 w-5" />
                                </Button>
                                <Input
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder="Type a message"
                                    className="flex-1 bg-white dark:bg-neutral-700 border-0 rounded-full px-4"
                                />
                                {messageText.trim() ? (
                                    <Button
                                        onClick={sendMessage}
                                        className="bg-[#25d366] hover:bg-[#20ba5a] text-white rounded-full h-10 w-10 p-0"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full h-10 w-10 p-0"
                                    >
                                        <Mic className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                ) : chatNotFoundError ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md px-4">
                            <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                                <Phone className="h-12 w-12 text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                                الشات غير موجود
                            </h3>
                            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                                {chatNotFoundError}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setChatNotFoundError(null);
                                    setSelectedChat(null);
                                }}
                            >
                                إغلاق
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-full bg-[#25d366] flex items-center justify-center mx-auto mb-4">
                                <span className="text-white text-4xl font-semibold">W</span>
                            </div>
                            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                                WhatsApp
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Select a chat to start messaging
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (isFloating) {
        return (
            <div className="fixed bottom-4 right-4 z-[100] shadow-2xl rounded-lg overflow-hidden" style={{ width: '900px', height: '700px' }}>
                {windowContent}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col border-l border-neutral-200 dark:border-neutral-700">
            {windowContent}
        </div>
    );
}
