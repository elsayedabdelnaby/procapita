import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    mimetype?: string;
    filename?: string;
}

interface Driver {
    id: number;
    name: string;
    phone?: string;
    whatsapp_phone?: string;
    avatar?: string;
}

interface WhatsAppWindowProps {
    companyId?: number | null;
    ridingCompanyId?: number | null;
    driverPhoneNumbers: string[];
    drivers?: Driver[];
    isOpen: boolean;
    onClose: () => void;
    initialChatPhone?: string;
    isFloating?: boolean;
    onToggleFloating?: () => void;
    singleChatMode?: boolean; // Hide chat list and show only the conversation
}

export function WhatsAppWindow({ 
    companyId, 
    ridingCompanyId,
    driverPhoneNumbers, 
    drivers = [],
    isOpen, 
    onClose,
    initialChatPhone,
    isFloating: externalIsFloating,
    onToggleFloating,
    singleChatMode = false
}: WhatsAppWindowProps) {
    // Determine the API base path based on whether we're using riding company or company
    const apiBasePath = ridingCompanyId 
        ? `/whatsapp/riding-companies/${ridingCompanyId}`
        : companyId 
            ? `/whatsapp/${companyId}`
            : null;
    
    const nodeApiBasePath = ridingCompanyId
        ? `/api/whatsapp/riding-company/${ridingCompanyId}`
        : companyId
            ? `/api/whatsapp/${companyId}`
            : null;
    const [chats, setChats] = useState<WhatsAppChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFloating, setIsFloating] = useState(externalIsFloating || false);
    const [chatsPanelWidth, setChatsPanelWidth] = useState(() => {
        const saved = localStorage.getItem('whatsapp_chats_panel_width');
        return saved ? parseFloat(saved) : 33.33;
    }); // Percentage width for chats panel (default 1/3 = 33.33%)
    const [chatNotFoundError, setChatNotFoundError] = useState<string | null>(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
    const [replyToMessage, setReplyToMessage] = useState<WhatsAppMessage | null>(null);
    const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video'; filename?: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const windowRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef<boolean>(true);
    const lastMessageCountRef = useRef<number>(0);

    // Get WhatsApp service URL from environment or use default
    const whatsappServiceUrl = (window as any).WHATSAPP_SERVICE_URL || import.meta.env.VITE_WHATSAPP_SERVICE_URL || 'http://localhost:3001';

    // Find driver by phone number
    const findDriverByPhone = (phone: string): Driver | undefined => {
        if (!phone || drivers.length === 0) {
            console.log('findDriverByPhone: No phone or no drivers', { phone, driversCount: drivers.length });
            return undefined;
        }
        
        // Clean phone - remove all non-digits
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        // Get last 9-10 digits for comparison (ignoring country code)
        const phoneLast9 = cleanPhone.slice(-9);
        
        const found = drivers.find(d => {
            const driverPhone = (d.phone || '').replace(/[^0-9]/g, '');
            const driverWhatsapp = (d.whatsapp_phone || '').replace(/[^0-9]/g, '');
            const driverPhoneLast9 = driverPhone.slice(-9);
            const driverWhatsappLast9 = driverWhatsapp.slice(-9);
            
            // Match by last 9 digits (Egyptian numbers without country code)
            const match = (driverPhoneLast9 && phoneLast9 === driverPhoneLast9) ||
                   (driverWhatsappLast9 && phoneLast9 === driverWhatsappLast9) ||
                   // Also try full number match
                   cleanPhone === driverPhone || cleanPhone === driverWhatsapp ||
                   // Or ends with
                   cleanPhone.endsWith(driverPhone) || cleanPhone.endsWith(driverWhatsapp) ||
                   (driverPhone && driverPhone.endsWith(phoneLast9)) ||
                   (driverWhatsapp && driverWhatsapp.endsWith(phoneLast9));
            
            return match;
        });
        
        console.log('findDriverByPhone:', { phone, cleanPhone, phoneLast9, found: found?.name, driversCount: drivers.length });
        return found;
    };

    // Get driver for selected chat
    const selectedDriver = selectedChat ? findDriverByPhone(selectedChat.phone) : undefined;

    useEffect(() => {
        if (isOpen && (companyId || ridingCompanyId)) {
            loadChats();
            // Auto-refresh chats every 10 seconds
            const interval = setInterval(() => {
                loadChats();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [isOpen, companyId, ridingCompanyId, driverPhoneNumbers]);

    useEffect(() => {
        if (selectedChat && nodeApiBasePath) {
            setMessages([]);
            setLoadingMessages(true);
            // Enable auto-scroll when selecting a new chat
            shouldAutoScrollRef.current = true;
            lastMessageCountRef.current = 0;
            loadMessages(selectedChat.id);
            // Poll for new messages every 10 seconds
            const interval = setInterval(() => {
                if (!loadingMessages && selectedChat) {
                    loadMessages(selectedChat.id);
                }
            }, 10000);
            return () => clearInterval(interval);
        } else if (selectedChat && !nodeApiBasePath) {
            console.error('[WhatsApp] Cannot load messages: nodeApiBasePath is not set');
            setLoadingMessages(false);
            setMessages([]);
        }
    }, [selectedChat, nodeApiBasePath]);

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
                    // Chat not found - create new chat by sending an initial message
                    if (!isCreatingChat) {
                        setIsCreatingChat(true);
                        (async () => {
                            try {
                                await createNewChat(initialChatPhone);
                                // Reload chats and try to find the new chat
                                const findChat = async () => {
                                    const normalizedInitial = normalizePhone(initialChatPhone);
                                    
                                    // Reload chats
                                    await loadChats();
                                    
                                    // Wait a bit for state to update, then check again
                                    setTimeout(() => {
                                        const updatedChats = chats;
                                        const newChat = updatedChats.find(c => {
                                            const normalizedChat = normalizePhone(c.phone);
                                            const chatId = c.id || '';
                                            const phoneInId = chatId.split('@')[0].replace(/\D/g, '');
                                            return normalizedChat === normalizedInitial || 
                                                   normalizedChat.includes(normalizedInitial) || 
                                                   normalizedInitial.includes(normalizedChat) ||
                                                   phoneInId === normalizedInitial ||
                                                   phoneInId.includes(normalizedInitial) ||
                                                   normalizedInitial.includes(phoneInId);
                                        });
                                        
                                        if (newChat) {
                                            setSelectedChat(newChat);
                                            setChatNotFoundError(null);
                                            setIsCreatingChat(false);
                                        } else {
                                            // If still not found, try reloading chats one more time
                                            setTimeout(async () => {
                                                await loadChats();
                                                setTimeout(() => {
                                                    const finalChats = chats;
                                                    const finalChat = finalChats.find(c => {
                                                        const normalizedChat = normalizePhone(c.phone);
                                                        const chatId = c.id || '';
                                                        const phoneInId = chatId.split('@')[0].replace(/\D/g, '');
                                                        return normalizedChat === normalizedInitial || 
                                                               normalizedChat.includes(normalizedInitial) || 
                                                               normalizedInitial.includes(normalizedChat) ||
                                                               phoneInId === normalizedInitial ||
                                                               phoneInId.includes(normalizedInitial) ||
                                                               normalizedInitial.includes(phoneInId);
                                                    });
                                                    
                                                    if (finalChat) {
                                                        setSelectedChat(finalChat);
                                                        setChatNotFoundError(null);
                                                    } else {
                                                        setChatNotFoundError(`تم إنشاء الشات. يرجى إعادة فتح الواتساب.`);
                                                    }
                                                    setIsCreatingChat(false);
                                                }, 500);
                                            }, 2000);
                                        }
                                    }, 1000);
                                };
                                
                                // Start finding chat after initial delay
                                setTimeout(findChat, 1500);
                            } catch (error: any) {
                                console.error('Error creating new chat:', error);
                                setIsCreatingChat(false);
                                setChatNotFoundError(`فشل في إنشاء شات جديد: ${error.response?.data?.error || error.message}`);
                                setSelectedChat(null);
                            }
                        })();
                    }
                }
            }
        } else if (initialChatPhone && chats.length === 0 && !loading && !isCreatingChat) {
            // If chats are loaded but empty, and we're looking for a specific phone, create new chat
            setIsCreatingChat(true);
            (async () => {
                try {
                    await createNewChat(initialChatPhone);
                    // Reload chats after creating new chat
                    await loadChats();
                    setIsCreatingChat(false);
                } catch (error: any) {
                    console.error('Error creating new chat:', error);
                    setIsCreatingChat(false);
                    setChatNotFoundError(`فشل في إنشاء شات جديد: ${error.response?.data?.error || error.message}`);
                }
            })();
        }
    }, [initialChatPhone, chats, loading]);

    // Handle scroll position - only auto-scroll if user is near bottom or new messages were added
    useEffect(() => {
        if (!messagesContainerRef.current) return;
        
        const container = messagesContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100; // 100px threshold
        const hasNewMessages = messages.length > lastMessageCountRef.current;
        
        // Only auto-scroll if:
        // 1. User is near bottom (within 100px), OR
        // 2. New messages were added (message count increased)
        if (shouldAutoScrollRef.current && (isNearBottom || hasNewMessages)) {
            // Use scrollTop instead of scrollIntoView to avoid affecting page scroll
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        }
        
        lastMessageCountRef.current = messages.length;
    }, [messages]);

    // Track scroll position to detect manual scrolling
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            shouldAutoScrollRef.current = isNearBottom;
        };

        // Use passive listener for better performance
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const loadChats = async () => {
        if (!nodeApiBasePath) {
            console.error('[WhatsApp] loadChats: nodeApiBasePath is not set');
            return;
        }
        
        try {
            setLoading(true);
            // Send phone_numbers only if provided, otherwise get all chats
            const payload = driverPhoneNumbers && driverPhoneNumbers.length > 0 
                ? { phone_numbers: driverPhoneNumbers }
                : {};
            
            console.log('[WhatsApp] ========== LOAD CHATS REQUEST ==========');
            console.log('[WhatsApp] API Path:', nodeApiBasePath);
            console.log('[WhatsApp] Full URL:', `${whatsappServiceUrl}${nodeApiBasePath}/chats`);
            console.log('[WhatsApp] Payload:', payload);
            console.log('[WhatsApp] Driver phone numbers count:', driverPhoneNumbers ? driverPhoneNumbers.length : 0);
            console.log('[WhatsApp] Driver phone numbers:', driverPhoneNumbers);
            
            const response = await axios.post(
                `${whatsappServiceUrl}${nodeApiBasePath}/chats`,
                payload
            );
            
            console.log('[WhatsApp] Response status:', response.status);
            console.log('[WhatsApp] Response data:', response.data);
            console.log('[WhatsApp] Total chats in response:', response.data.chats ? response.data.chats.length : 0);
            // Filter out any group chats and chats with phone number "0"
            const individualChats = (response.data.chats || []).filter((chat: WhatsAppChat) => {
                // Group chats typically have IDs that don't contain a phone number pattern
                // or have @g.us suffix instead of @c.us
                const chatId = chat.id || '';
                const phone = chat.phone || '';
                
                // Filter out group chats
                if (chatId.includes('@g.us') || chat.isGroup) return false;
                
                // Filter out chats with phone number "0" or invalid phone numbers
                const normalizedPhone = phone.replace(/\D/g, '');
                if (!normalizedPhone || normalizedPhone === '0' || normalizedPhone.length < 5) return false;
                
                // If driverPhoneNumbers is provided, ensure this chat matches one of them
                if (driverPhoneNumbers && driverPhoneNumbers.length > 0) {
                    const chatLast9 = normalizedPhone.slice(-9);
                    const matches = driverPhoneNumbers.some(driverPhone => {
                        const normalizedDriverPhone = driverPhone.replace(/\D/g, '');
                        const driverLast9 = normalizedDriverPhone.slice(-9);
                        return normalizedPhone === normalizedDriverPhone || 
                               (chatLast9 && driverLast9 && chatLast9 === driverLast9) ||
                               normalizedPhone.includes(normalizedDriverPhone) ||
                               normalizedDriverPhone.includes(normalizedPhone);
                    });
                    if (!matches) return false;
                }
                
                return true;
            });
            
            console.log('[WhatsApp] Individual chats after filtering:', individualChats.length);
            console.log('[WhatsApp] Individual chats details:', individualChats.map(c => ({ id: c.id, name: c.name, phone: c.phone })));
            console.log('[WhatsApp] ========== END LOAD CHATS ==========');
            setChats(individualChats);
        } catch (error: any) {
            console.error('[WhatsApp] ERROR loading chats:', error);
            console.error('[WhatsApp] Error response:', error.response?.data);
            console.error('[WhatsApp] Error message:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const [loadingMessages, setLoadingMessages] = useState(false);
    const loadMessages = async (chatId: string) => {
        if (!nodeApiBasePath) {
            console.error('[WhatsApp] loadMessages: nodeApiBasePath is not set');
            setLoadingMessages(false);
            return;
        }
        
        setLoadingMessages(true);
        try {
            console.log('[WhatsApp] Loading messages for chat:', chatId);
            console.log('[WhatsApp] API Path:', nodeApiBasePath);
            console.log('[WhatsApp] Full URL:', `${whatsappServiceUrl}${nodeApiBasePath}/chats/${chatId}/messages`);
            
            const response = await axios.get(
                `${whatsappServiceUrl}${nodeApiBasePath}/chats/${chatId}/messages`
            );
            const newMessages = response.data.messages || [];
            console.log(`[WhatsApp] Loaded ${newMessages.length} messages`);
            setMessages(newMessages);
        } catch (error: any) {
            console.error('[WhatsApp] Error loading messages:', error);
            console.error('[WhatsApp] Error response:', error.response?.data);
            // Set empty messages array on error to show "No messages yet" instead of infinite loading
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    // Create new chat by sending an initial message
    const createNewChat = async (phoneNumber: string) => {
        if (!phoneNumber || !nodeApiBasePath) return;

        try {
            const payload: any = {
                phone_number: phoneNumber,
                message: 'مرحباً', // Initial message to create chat
            };
            
            const response = await axios.post(
                `${whatsappServiceUrl}${nodeApiBasePath}/send`,
                payload
            );
            
            // Clear error after successful creation
            setChatNotFoundError(null);
            return response.data;
        } catch (error: any) {
            console.error('Error creating new chat:', error);
            
            // Provide better error message
            let errorMessage = 'فشل في إنشاء الشات.';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
        }
    };

    const sendMessage = async () => {
        if (!messageText.trim() || !selectedChat || !nodeApiBasePath) return;

        try {
            const payload: any = {
                    phone_number: selectedChat.phone,
                    message: messageText,
            };
            
            // Add reply info if replying to a message
            if (replyToMessage) {
                payload.quoted_message_id = replyToMessage.id;
                }
            
            await axios.post(
                `${whatsappServiceUrl}${nodeApiBasePath}/send`,
                payload
            );
            setMessageText('');
            setReplyToMessage(null);
            // Enable auto-scroll when sending a new message
            shouldAutoScrollRef.current = true;
            // Reload messages
            loadMessages(selectedChat.id);
        } catch (error: any) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + (error.response?.data?.error || error.message));
        }
    };

    const sendFile = async (file: File) => {
        if (!selectedChat) return;

        // Determine the correct API path for sending files
        const sendFileApiPath = ridingCompanyId 
            ? `${whatsappServiceUrl}/api/whatsapp/riding-company/${ridingCompanyId}/send-file`
            : `${whatsappServiceUrl}/api/whatsapp/${companyId}/send-file`;

        try {
            const formData = new FormData();
            formData.append('phone_number', selectedChat.phone);
            formData.append('file', file);
            formData.append('message', file.name);

            await axios.post(
                sendFileApiPath,
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

    // Download media file
    const downloadMedia = (mediaUrl: string, filename: string, mimetype?: string) => {
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.download = filename || `download_${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Ref to store audio chunks during recording
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    // Start voice recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            // Try different mimetypes for browser compatibility
            let mimeType = 'audio/ogg;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm;codecs=opus';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/mp4';
            }
            
            const recorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                try {
                    const chunks = audioChunksRef.current;
                    if (chunks.length === 0) {
                        console.error('No audio chunks recorded');
                        return;
                    }
                    const audioBlob = new Blob(chunks, { type: mimeType });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    setRecordedAudio({ blob: audioBlob, url: audioUrl });
                } catch (err) {
                    console.error('Error processing voice message:', err);
                    alert('Failed to process voice message');
                } finally {
                    streamRef.current?.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            setMediaRecorder(recorder);
            recorder.start(100); // Collect data every 100ms
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    // Stop voice recording
    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            setMediaRecorder(null);
        }
    };

    // Send recorded voice
    const sendRecordedVoice = async () => {
        if (!recordedAudio) return;
        try {
            const ext = recordedAudio.blob.type.includes('ogg') ? 'ogg' : recordedAudio.blob.type.includes('mp4') ? 'm4a' : 'webm';
            const audioFile = new File([recordedAudio.blob], `voice_${Date.now()}.${ext}`, { type: recordedAudio.blob.type });
            await sendFile(audioFile);
            cancelRecordedVoice();
        } catch (err) {
            console.error('Error sending voice message:', err);
            alert('Failed to send voice message');
        }
    };

    // Cancel recorded voice
    const cancelRecordedVoice = () => {
        if (recordedAudio) {
            URL.revokeObjectURL(recordedAudio.url);
            setRecordedAudio(null);
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

    const windowContent = (
        <div 
            ref={windowRef}
            className="bg-white dark:bg-neutral-900 flex h-full"
            style={isFloating ? { width: '900px', height: '700px' } : {}}
        >
            {/* Left Panel - Chats List (hidden in singleChatMode) */}
            {!singleChatMode && (
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
                        filteredChats.map((chat) => {
                            const driver = findDriverByPhone(chat.phone);
                            const displayName = driver?.name || chat.name;
                            return (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`flex items-center gap-3 p-3 hover:bg-[#f5f6f6] dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 transition-colors ${
                                    selectedChat?.id === chat.id ? 'bg-[#f0f2f5] dark:bg-neutral-800' : ''
                                }`}
                            >
                                {driver?.avatar ? (
                                    <img 
                                        src={driver.avatar} 
                                        alt={displayName}
                                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                    />
                                ) : (
                                <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center text-white font-semibold flex-shrink-0 text-lg">
                                        {displayName.charAt(0).toUpperCase()}
                                </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="truncate flex flex-col gap-0.5">
                                            {driver && (
                                                <h4 className="font-medium text-sm truncate text-blue-600 dark:text-blue-400">{driver.name}</h4>
                                            )}
                                            {chat.phone && (
                                                <span className={`text-xs ${driver ? 'text-neutral-600 dark:text-neutral-400' : 'font-medium text-sm text-neutral-900 dark:text-neutral-100'}`}>
                                                    {chat.phone}
                                                </span>
                                            )}
                                        </div>
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
                            );
                        })
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
                        
                        let finalWidth = startWidth;
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                            const diff = moveEvent.clientX - startX;
                            const widthChangePercent = (diff / containerWidth) * 100;
                            finalWidth = Math.max(20, Math.min(70, startWidth + widthChangePercent));
                            setChatsPanelWidth(finalWidth);
                        };
                        const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                            // Save the width to localStorage
                            localStorage.setItem('whatsapp_chats_panel_width', finalWidth.toString());
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }}
                    title="Drag to resize"
                />
            </div>
            )}

            {/* Right Panel - Chat View */}
            <div 
                className="flex flex-col bg-[#efeae2] dark:bg-[#0b141a]"
                style={{ width: singleChatMode ? '100%' : `${100 - chatsPanelWidth}%`, minWidth: '30%' }}
            >
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-[#075e54] dark:bg-[#202c33] text-white p-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                {!singleChatMode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedChat(null)}
                                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                )}
                                {selectedDriver?.avatar ? (
                                    <img 
                                        src={selectedDriver.avatar} 
                                        alt={selectedDriver.name}
                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    />
                                ) : (
                                <div className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold">{(selectedDriver?.name || selectedChat.name).charAt(0).toUpperCase()}</span>
                                </div>
                                )}
                                <div className="flex-1">
                                    {selectedDriver ? (
                                        <>
                                            <h3 className="font-semibold text-sm">{selectedDriver.name}</h3>
                                            <p className="text-xs text-white/80">{selectedChat.phone}</p>
                                        </>
                                    ) : (
                                        <>
                                    <h3 className="font-semibold text-sm">{selectedChat.name}</h3>
                                    <p className="text-xs text-white/80">{selectedChat.phone}</p>
                                        </>
                                    )}
                                </div>
                                {selectedDriver && (
                                    <a
                                        href={`/drivers/drivers/${selectedDriver.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                                        title="Open Lead Details"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Open
                                    </a>
                                )}
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
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#efeae2] dark:bg-[#0b141a]" 
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23d4d4d4' stroke-width='0.5' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`,
                                backgroundSize: '100px 100px',
                            }}
                        >
                            {/* Loading indicator */}
                            {loadingMessages && messages.length === 0 && (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
                                        <span className="text-sm text-neutral-500">Loading messages...</span>
                                    </div>
                                </div>
                            )}
                            {!loadingMessages && messages.length === 0 ? (
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
                                            <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-0.5 group/msg`}>
                                                <div className={`flex items-start gap-1 ${isFromMe ? 'flex-row-reverse' : ''}`}>
                                                    {/* Reply button */}
                                                    <button
                                                        onClick={() => setReplyToMessage(message)}
                                                        className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-2"
                                                        title="Reply"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                        </svg>
                                                    </button>
                                                <div
                                                    className={`max-w-[65%] rounded-lg px-3 py-2 shadow-md ${
                                                        isFromMe
                                                            ? 'bg-[#dcf8c6] dark:bg-[#005c4b]'
                                                            : 'bg-white dark:bg-[#202c33]'
                                                    }`}
                                                >
                                                    {message.hasMedia && (
                                                        <div className="mb-1">
                                                            {/* Media not available placeholder */}
                                                            {!message.mediaUrl && (
                                                                <div className="flex items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-700 rounded text-sm text-neutral-500">
                                                                    {message.mimetype?.startsWith('image/') && (
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                        </svg>
                                                                    )}
                                                                    {(message.mimetype?.startsWith('audio/') || message.type === 'ptt') && (
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                                        </svg>
                                                                    )}
                                                                    {message.mimetype?.startsWith('video/') && (
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                        </svg>
                                                                    )}
                                                                    {message.mimetype && !message.mimetype.startsWith('image/') && !message.mimetype.startsWith('audio/') && !message.mimetype.startsWith('video/') && message.type !== 'ptt' && (
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                        </svg>
                                                                    )}
                                                                    <span className="flex-1">{message.filename || message.mimetype || 'Media'}</span>
                                                                    <span className="text-xs text-neutral-400">(غير متاح)</span>
                                                                </div>
                                                            )}
                                                            {/* Image */}
                                                            {message.mediaUrl && message.mimetype?.startsWith('image/') && (
                                                                <div className="relative group">
                                                                    <img 
                                                                        src={message.mediaUrl} 
                                                                        alt="Media" 
                                                                        className="max-w-full max-h-[400px] rounded cursor-pointer object-contain"
                                                                        onClick={() => setViewingMedia({ 
                                                                            url: message.mediaUrl!, 
                                                                            type: 'image',
                                                                            filename: message.filename 
                                                                        })}
                                                                    />
                                                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(message.mediaUrl!, '_blank');
                                                                            }}
                                                                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                                                                            title="Open in new tab"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setViewingMedia({ 
                                                                                    url: message.mediaUrl!, 
                                                                                    type: 'image',
                                                                                    filename: message.filename 
                                                                                });
                                                                            }}
                                                                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                                                                            title="View Full Size"
                                                                        >
                                                                            <Maximize className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                downloadMedia(message.mediaUrl!, message.filename || `image_${message.timestamp}.jpg`, message.mimetype);
                                                                            }}
                                                                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                                                                            title="Download"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Audio/Voice */}
                                                            {message.mediaUrl && (message.mimetype?.startsWith('audio/') || message.type === 'ptt') && (
                                                                <div className="flex items-center gap-2 min-w-[200px] bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2">
                                                                    <audio 
                                                                        controls 
                                                                        src={message.mediaUrl} 
                                                                        className="h-10 flex-1"
                                                                        style={{ maxWidth: '300px', minWidth: '200px' }}
                                                                    />
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => window.open(message.mediaUrl!, '_blank')}
                                                                            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                                            title="Open in new tab"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </button>
                                                                    <button
                                                                        onClick={() => downloadMedia(message.mediaUrl!, message.filename || `audio_${message.timestamp}.ogg`, message.mimetype)}
                                                                            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                                        title="Download"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                        </svg>
                                                                    </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Video */}
                                                            {message.mediaUrl && message.mimetype?.startsWith('video/') && (
                                                                <div className="relative group">
                                                                    <video 
                                                                        controls 
                                                                        src={message.mediaUrl} 
                                                                        className="max-w-full max-h-[400px] rounded cursor-pointer"
                                                                        onClick={() => setViewingMedia({ 
                                                                            url: message.mediaUrl!, 
                                                                            type: 'video',
                                                                            filename: message.filename 
                                                                        })}
                                                                    />
                                                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(message.mediaUrl!, '_blank');
                                                                            }}
                                                                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                                                                            title="Open in new tab"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setViewingMedia({ 
                                                                                    url: message.mediaUrl!, 
                                                                                    type: 'video',
                                                                                    filename: message.filename 
                                                                                });
                                                                            }}
                                                                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                                                                            title="View Full Size"
                                                                        >
                                                                            <Maximize className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                downloadMedia(message.mediaUrl!, message.filename || `video_${message.timestamp}.mp4`, message.mimetype);
                                                                            }}
                                                                            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                                                                            title="Download"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Document/File */}
                                                            {message.mediaUrl && message.mimetype && !message.mimetype.startsWith('image/') && !message.mimetype.startsWith('audio/') && !message.mimetype.startsWith('video/') && message.type !== 'ptt' && (
                                                                <div 
                                                                    className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 border border-neutral-200 dark:border-neutral-600"
                                                                >
                                                                    <svg className="w-10 h-10 text-neutral-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium truncate">{message.filename || 'Document'}</p>
                                                                        <p className="text-xs text-neutral-500 mt-0.5">{message.mimetype}</p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(message.mediaUrl!, '_blank');
                                                                            }}
                                                                            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-2 rounded hover:bg-neutral-300 dark:hover:bg-neutral-500"
                                                                            title="Open in new tab"
                                                                        >
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                downloadMedia(message.mediaUrl!, message.filename || `file_${message.timestamp}`, message.mimetype);
                                                                            }}
                                                                            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-2 rounded hover:bg-neutral-300 dark:hover:bg-neutral-500"
                                                                            title="Download"
                                                                        >
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
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
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Preview */}
                        {replyToMessage && (
                            <div className="px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-neutral-200 dark:border-[#313d45]">
                                <div className="flex items-center gap-2 bg-white dark:bg-neutral-700 rounded-lg p-2 border-l-4 border-[#25d366]">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[#25d366] font-medium">
                                            {replyToMessage.from.includes(selectedChat?.phone || '') ? (findDriverByPhone(selectedChat?.phone || '')?.name || selectedChat?.name) : 'You'}
                                        </p>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-300 truncate">
                                            {replyToMessage.hasMedia && !replyToMessage.body ? '📎 Media' : replyToMessage.body}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setReplyToMessage(null)}
                                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

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
                                {recordedAudio ? (
                                    // Voice preview mode
                                    <>
                                        <Button
                                            onClick={cancelRecordedVoice}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full h-10 w-10 p-0"
                                            title="Cancel"
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                        <audio 
                                            controls 
                                            src={recordedAudio.url} 
                                            className="h-10 flex-1"
                                            style={{ maxWidth: '200px' }}
                                        />
                                        <Button
                                            onClick={sendRecordedVoice}
                                            className="bg-[#25d366] hover:bg-[#20ba5a] text-white rounded-full h-10 w-10 p-0"
                                            title="Send voice message"
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </>
                                ) : messageText.trim() ? (
                                    <Button
                                        onClick={sendMessage}
                                        className="bg-[#25d366] hover:bg-[#20ba5a] text-white rounded-full h-10 w-10 p-0"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                ) : isRecording ? (
                                    <Button
                                        onClick={stopRecording}
                                        className="bg-red-500 hover:bg-red-600 text-white rounded-full h-10 w-10 p-0 animate-pulse"
                                        title="Stop recording"
                                    >
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                            <rect x="6" y="6" width="12" height="12" rx="2" />
                                        </svg>
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={startRecording}
                                        variant="ghost"
                                        size="sm"
                                        className="text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full h-10 w-10 p-0"
                                        title="Record voice message"
                                    >
                                        <Mic className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                ) : isCreatingChat ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md px-4">
                            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                                <Phone className="h-12 w-12 text-green-500 dark:text-green-400 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                                جاري إنشاء الشات...
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                يرجى الانتظار بينما نقوم بإنشاء شات جديد مع هذا الرقم
                            </p>
                        </div>
                    </div>
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

    // Media Viewer Dialog Component (shared between both return statements)
    const mediaViewerDialog = (
        <Dialog open={!!viewingMedia} onOpenChange={(open) => !open && setViewingMedia(null)}>
            <DialogContent className="!max-w-[95vw] !max-h-[95vh] p-0 overflow-hidden flex flex-col">
                {viewingMedia && (
                    <>
                        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                            <DialogTitle className="flex items-center justify-between">
                                <span>{viewingMedia.filename || (viewingMedia.type === 'image' ? 'Image' : 'Video')}</span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadMedia(
                                            viewingMedia.url,
                                            viewingMedia.filename || `${viewingMedia.type}_${Date.now()}.${viewingMedia.type === 'image' ? 'jpg' : 'mp4'}`,
                                            viewingMedia.type === 'image' ? 'image/jpeg' : 'video/mp4'
                                        )}
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download
                                    </Button>
                                </div>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black/5 dark:bg-black/20">
                            {viewingMedia.type === 'image' ? (
                                <img
                                    src={viewingMedia.url}
                                    alt={viewingMedia.filename || 'Image'}
                                    className="max-w-full max-h-[85vh] object-contain rounded"
                                    style={{ cursor: 'zoom-in' }}
                                    onClick={() => {
                                        window.open(viewingMedia.url, '_blank');
                                    }}
                                />
                            ) : (
                                <video
                                    controls
                                    src={viewingMedia.url}
                                    className="max-w-full max-h-[85vh] rounded"
                                    autoPlay
                                />
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );

    if (!isOpen) {
        return mediaViewerDialog;
    }

    if (isFloating) {
        return (
            <>
                <div className="fixed bottom-4 right-4 z-[100] shadow-2xl rounded-lg overflow-hidden" style={{ width: '900px', height: '700px' }}>
                    {windowContent}
                </div>
                
                {/* Media Viewer Dialog */}
                {mediaViewerDialog}
            </>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col border-l border-neutral-200 dark:border-neutral-700">
                {windowContent}
            </div>
            
            {/* Media Viewer Dialog */}
            {mediaViewerDialog}
        </>
    );
}
