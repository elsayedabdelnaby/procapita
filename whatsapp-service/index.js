const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = path.join(__dirname, '../storage/app/whatsapp/sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Store active clients - keep them alive
const clients = new Map();

// Initialize WhatsApp client for a company
function initializeClient(companyId) {
    const sessionPath = path.join(SESSIONS_DIR, `company_${companyId}`);
    return initializeClientWithPath(companyId, sessionPath);
}

// Initialize WhatsApp client for a riding company
function initializeRidingCompanyClient(ridingCompanyId) {
    const sessionPath = path.join(SESSIONS_DIR, `riding_company_${ridingCompanyId}`);
    return initializeClientWithPath(`riding_${ridingCompanyId}`, sessionPath);
}

// Common function to initialize client with custom path
function initializeClientWithPath(clientKey, sessionPath) {
    
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: sessionPath,
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        },
        // Keep session alive
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2413.51-beta.html',
        }
    });

    client.on('qr', async (qr) => {
        // Silently generate QR code without console logs
        // QR code will be shown only when requested via API endpoint
        try {
            const qrImage = await QRCode.toDataURL(qr, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            clients.set(`qr_${clientKey}`, qrImage);
            clients.set(`status_${clientKey}`, 'qr_code');
        } catch (error) {
            // Fallback to string
            clients.set(`qr_${clientKey}`, qr);
            clients.set(`status_${clientKey}`, 'qr_code');
        }
    });

    client.on('ready', async () => {
        console.log(`WhatsApp client ready for ${clientKey}`);
        const info = client.info;
        clients.set(`status_${clientKey}`, 'ready');
        clients.set(`phone_${clientKey}`, info.wid.user);
        
        // Get contact name (pushname) from WhatsApp
        let contactName = null;
        try {
            const contact = await client.getContactById(info.wid._serialized);
            contactName = contact.pushname || contact.name || null;
            clients.set(`name_${clientKey}`, contactName);
        } catch (error) {
            console.error(`Error getting contact name for ${clientKey}:`, error);
        }
        
        clients.set(`client_${clientKey}`, client);
        
        // Keep client alive - don't destroy it
        console.log(`WhatsApp session for ${clientKey} is now active and will stay connected`);
    });

    client.on('authenticated', () => {
        console.log(`WhatsApp authenticated for ${clientKey}`);
        clients.set(`status_${clientKey}`, 'authenticated');
        clients.set(`client_${clientKey}`, client);
    });

    client.on('auth_failure', (msg) => {
        console.error(`Auth failure for ${clientKey}:`, msg);
        clients.set(`status_${clientKey}`, 'disconnected');
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`Loading screen for ${clientKey}: ${percent}% - ${message}`);
        if (!clients.has(`status_${clientKey}`) || clients.get(`status_${clientKey}`) === 'disconnected') {
            clients.set(`status_${clientKey}`, 'connecting');
        }
    });

    client.on('disconnected', (reason) => {
        console.log(`WhatsApp disconnected for ${clientKey}:`, reason);
        clients.set(`status_${clientKey}`, 'disconnected');
        clients.delete(`qr_${clientKey}`);
        clients.delete(`client_${clientKey}`);
        
        // Auto-reconnect after 5 seconds (only for company clients, not riding company)
        if (reason !== 'LOGOUT' && clientKey.startsWith('riding_')) {
            const ridingCompanyId = clientKey.replace('riding_', '');
            console.log(`Attempting to reconnect riding company ${ridingCompanyId} in 5 seconds...`);
            setTimeout(() => {
                if (!clients.has(`client_${clientKey}`)) {
                    const newClient = initializeRidingCompanyClient(ridingCompanyId);
                    clients.set(`client_${clientKey}`, newClient);
                    newClient.initialize().catch(err => {
                        console.error(`Reconnection failed for ${clientKey}:`, err);
                    });
                }
            }, 5000);
        } else if (reason !== 'LOGOUT') {
            const companyId = clientKey;
            console.log(`Attempting to reconnect company ${companyId} in 5 seconds...`);
            setTimeout(() => {
                if (!clients.has(`client_${clientKey}`)) {
                    const newClient = initializeClient(companyId);
                    clients.set(`client_${clientKey}`, newClient);
                    newClient.initialize().catch(err => {
                        console.error(`Reconnection failed for ${clientKey}:`, err);
                    });
                }
            }, 5000);
        }
    });

    // Handle incoming messages
    client.on('message', async (message) => {
        // Ignore all group messages (groups have @g.us in the from field)
        if (message.from && message.from.includes('@g.us')) {
            return; // Silently ignore group messages
        }
        
        const from = message.from;
        const body = message.body;
        const messageId = message.id._serialized;
        const timestamp = message.timestamp * 1000; // Convert to milliseconds
        const type = message.type || 'text';
        
        console.log(`[${new Date().toISOString()}] Message received for ${clientKey} from ${from}: ${body}`);
        
        // Store message info (you can send this to Laravel via webhook)
        clients.set(`last_message_${clientKey}_${from}`, {
            id: messageId,
            from: from,
            body: body,
            timestamp: new Date(),
        });

        // Send to Laravel webhook if this is a riding company client
        if (clientKey.startsWith('riding_')) {
            const ridingCompanyId = clientKey.replace('riding_', '');
            
            // Get chat to extract correct phone number (WhatsApp changed phone number format in December)
            let phoneNumber = null;
            let contactName = null;
            
            try {
                const chat = await message.getChat();
                
                // Extract phone number using the correct method (as per WhatsApp December update):
                // 1. From chat.name - contains the correct number as shown in WhatsApp Web
                // 2. From chat.id._serialized - if number not in chat.name
                // 3. From chat.id.user - as last resort only
                if (chat.name && chat.name.trim()) {
                    phoneNumber = chat.name.trim().replace(/\s+/g, '');
                } else if (chat.id && chat.id._serialized) {
                    phoneNumber = chat.id._serialized.split('@')[0].trim().replace(/\s+/g, '');
                } else if (chat.id && chat.id.user) {
                    phoneNumber = chat.id.user.trim().replace(/\s+/g, '');
                }
                
                // Get contact name
                try {
                    const contact = await message.getContact();
                    contactName = contact.pushname || contact.name || null;
                } catch (error) {
                    // Ignore contact name errors
                }
            } catch (error) {
                // Fallback to message.from if chat retrieval fails
                console.error(`[${new Date().toISOString()}] Error getting chat, using message.from:`, error.message);
                if (from && !from.includes('@g.us')) {
                    phoneNumber = from.replace('@c.us', '').trim().replace(/\s+/g, '');
                }
            }
            
            // Validate phone number before processing
            if (!phoneNumber || !phoneNumber.trim()) {
                return; // Silently ignore messages with empty phone number
            }
            
            // Validate phone number contains at least 5 digits
            const digitsOnly = phoneNumber.replace(/\D/g, '');
            if (!digitsOnly || digitsOnly.length < 5) {
                return; // Silently ignore invalid phone numbers
            }
            
            console.log(`[${new Date().toISOString()}] Processing message for riding company ${ridingCompanyId} from ${phoneNumber}`);
            
            try {
                // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
                const laravelUrl = process.env.LARAVEL_URL || 'http://127.0.0.1:8000';
                const webhookUrl = `${laravelUrl}/whatsapp/webhook/message`;
                
                // Normalize message type: 'chat' -> 'text', 'ptt' -> 'audio'
                let normalizedType = type === 'chat' ? 'text' : type;
                if (normalizedType === 'ptt') {
                    normalizedType = 'audio'; // PTT (Push To Talk) is a voice message
                }
                
                // Format phone number for webhook (add @c.us if not present)
                const formattedPhoneNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
                
                const payload = {
                    riding_company_id: parseInt(ridingCompanyId),
                    from_number: formattedPhoneNumber,
                    to_number: message.to || '',
                    message_id: messageId,
                    body: body,
                    type: normalizedType,
                    timestamp: Math.floor(timestamp / 1000), // Convert to seconds
                    contact_name: contactName,
                };
                
                console.log(`[${new Date().toISOString()}] Sending webhook to ${webhookUrl}`, payload);
                
                // Use http module for better compatibility
                const url = new URL(webhookUrl);
                const postData = JSON.stringify(payload);
                
                const options = {
                    hostname: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
                    port: url.port || (url.protocol === 'https:' ? 443 : 80),
                    path: url.pathname,
                    method: 'POST',
                    family: 4, // Force IPv4
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Content-Length': Buffer.byteLength(postData),
                    },
                    timeout: 10000,
                };
                
                const response = await new Promise((resolve, reject) => {
                    const req = http.request(options, (res) => {
                        let data = '';
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        res.on('end', () => {
                            try {
                                const jsonData = JSON.parse(data);
                                resolve({
                                    ok: res.statusCode >= 200 && res.statusCode < 300,
                                    status: res.statusCode,
                                    json: async () => jsonData,
                                });
                            } catch (e) {
                                resolve({
                                    ok: res.statusCode >= 200 && res.statusCode < 300,
                                    status: res.statusCode,
                                    json: async () => ({ error: 'Invalid JSON response', data }),
                                });
                            }
                        });
                    });
                    
                    req.on('error', (error) => {
                        reject(error);
                    });
                    
                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('Request timeout'));
                    });
                    
                    req.write(postData);
                    req.end();
                });
                
                const responseData = await response.json();
                
                if (response.ok) {
                    console.log(`[${new Date().toISOString()}] Message sent to Laravel webhook for riding company ${ridingCompanyId}`, {
                        success: responseData.success,
                        driver_created: responseData.driver_created,
                        driver_id: responseData.driver_id,
                    });
                } else {
                    console.error(`[${new Date().toISOString()}] Error from Laravel webhook:`, {
                        status: response.status,
                        statusText: response.statusText,
                        error: responseData.error,
                        errors: responseData.errors,
                        response: responseData,
                    });
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error sending message to Laravel webhook:`, {
                    error: error.message,
                    stack: error.stack,
                    riding_company_id: ridingCompanyId,
                    from_number: from,
                    webhook_url: `${process.env.LARAVEL_URL || 'http://127.0.0.1:8000'}/whatsapp/webhook/message`,
                });
            }
        } else {
            console.log(`[${new Date().toISOString()}] Message received for non-riding-company client ${clientKey}, skipping webhook`);
        }
    });

    return client;
}

// Auto-initialize existing sessions on startup
function initializeExistingSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) {
        return;
    }
    
    // Initialize company sessions
    const companyDirs = fs.readdirSync(SESSIONS_DIR).filter(dir => {
        return dir.startsWith('company_') && fs.statSync(path.join(SESSIONS_DIR, dir)).isDirectory();
    });
    
    companyDirs.forEach(dir => {
        const companyId = dir.replace('company_', '');
        const sessionPath = path.join(SESSIONS_DIR, dir);
        
        // Check if session exists
        if (fs.existsSync(sessionPath)) {
            console.log(`Found existing session for company ${companyId}, initializing...`);
            const client = initializeClient(companyId);
            clients.set(`client_${companyId}`, client);
            client.initialize().catch(err => {
                console.error(`Failed to initialize existing session for company ${companyId}:`, err);
            });
        }
    });
    
    // Initialize riding company sessions
    const ridingCompanyDirs = fs.readdirSync(SESSIONS_DIR).filter(dir => {
        return dir.startsWith('riding_company_') && fs.statSync(path.join(SESSIONS_DIR, dir)).isDirectory();
    });
    
    ridingCompanyDirs.forEach(dir => {
        const ridingCompanyId = dir.replace('riding_company_', '');
        const sessionPath = path.join(SESSIONS_DIR, dir);
        
        // Check if session exists
        if (fs.existsSync(sessionPath)) {
            console.log(`Found existing session for riding company ${ridingCompanyId}, initializing...`);
            const client = initializeRidingCompanyClient(ridingCompanyId);
            clients.set(`client_riding_${ridingCompanyId}`, client);
            client.initialize().catch(err => {
                console.error(`Failed to initialize existing session for riding company ${ridingCompanyId}:`, err);
            });
        }
    });
}

// API Routes

// Health check endpoint
app.get('/api/whatsapp/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/whatsapp/:companyId/initialize', async (req, res) => {
    const companyId = req.params.companyId;
    
    try {
        let client = clients.get(`client_${companyId}`);
        
        if (!client) {
            client = initializeClient(companyId);
            clients.set(`client_${companyId}`, client);
            await client.initialize();
        } else {
            // If client exists, check if QR is available
            const existingQR = clients.get(`qr_${companyId}`);
            if (existingQR) {
                return res.json({
                    success: true,
                    status: clients.get(`status_${companyId}`) || 'qr_code',
                    qr_code: existingQR,
                });
            }
        }

        // Wait a bit for QR code to be generated
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({
            success: true,
            status: clients.get(`status_${companyId}`) || 'connecting',
            qr_code: clients.get(`qr_${companyId}`) || null,
        });
    } catch (error) {
        console.error('Error initializing client:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Track last status to avoid duplicate logs
const lastStatusLog = new Map();

app.get('/api/whatsapp/:companyId/status', (req, res) => {
    const companyId = req.params.companyId;
    const status = clients.get(`status_${companyId}`) || 'disconnected';
    const qrCode = clients.get(`qr_${companyId}`) || null;
    const phoneNumber = clients.get(`phone_${companyId}`) || null;
    
    // Only log if status changed or first time
    const statusKey = `${companyId}_${status}_${!!qrCode}`;
    if (!lastStatusLog.has(statusKey)) {
        console.log(`Status for company ${companyId}: ${status}${qrCode ? ' (QR available)' : ''}`);
        lastStatusLog.set(statusKey, Date.now());
        
        // Clean old entries (older than 5 minutes)
        for (const [key, timestamp] of lastStatusLog.entries()) {
            if (Date.now() - timestamp > 5 * 60 * 1000) {
                lastStatusLog.delete(key);
            }
        }
    }
    
    res.json({
        status: status,
        phone_number: phoneNumber,
        qr_code: qrCode,
    });
});

app.get('/api/whatsapp/:companyId/qr', (req, res) => {
    const companyId = req.params.companyId;
    const qr = clients.get(`qr_${companyId}`);
    
    if (qr) {
        res.json({ qr_code: qr });
    } else {
        res.status(404).json({ error: 'QR code not found' });
    }
});

app.post('/api/whatsapp/:companyId/disconnect', async (req, res) => {
    const companyId = req.params.companyId;
    const client = clients.get(`client_${companyId}`);
    
    if (client) {
        try {
            await client.logout();
            await client.destroy();
            clients.delete(`client_${companyId}`);
            clients.delete(`status_${companyId}`);
            clients.delete(`phone_${companyId}`);
            clients.delete(`qr_${companyId}`);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    } else {
        res.json({ success: true });
    }
});

// Get chats for a user (filtered by driver phone numbers)
app.post('/api/whatsapp/:companyId/chats', async (req, res) => {
    const companyId = req.params.companyId;
    const { phone_numbers } = req.body; // Array of driver phone numbers (optional - if empty, return all chats)
    
    const client = clients.get(`client_${companyId}`);
    
    if (!client) {
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    if (clients.get(`status_${companyId}`) !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp not ready' });
    }
    
    try {
        const chats = await client.getChats();
        
        // Filter out group chats - only show individual chats
        let filteredChats = chats.filter(chat => !chat.isGroup);
        
        // If phone_numbers provided, filter by them. Otherwise, return all individual chats
        if (phone_numbers && phone_numbers.length > 0) {
            filteredChats = filteredChats.filter(chat => {
                const chatNumber = chat.id.user || chat.id._serialized.split('@')[0];
                return phone_numbers.some(phone => {
                    // Normalize phone numbers for comparison
                    const normalizedChat = chatNumber.replace(/\D/g, '');
                    const normalizedPhone = phone.replace(/\D/g, '');
                    return normalizedChat.includes(normalizedPhone) || normalizedPhone.includes(normalizedChat);
                });
            });
        }
        
        // Format and sort chats by last message timestamp
        const formattedChats = filteredChats
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name || chat.id.user || 'Unknown',
                phone: chat.id.user || chat.id._serialized.split('@')[0],
                unreadCount: chat.unreadCount || 0,
                lastMessage: chat.lastMessage ? {
                    body: chat.lastMessage.body || '',
                    timestamp: chat.lastMessage.timestamp || Math.floor(Date.now() / 1000),
                } : null,
                isGroup: false, // Always false since we filtered groups
            }))
            .sort((a, b) => {
                // Sort by last message timestamp (newest first)
                const aTime = a.lastMessage?.timestamp || 0;
                const bTime = b.lastMessage?.timestamp || 0;
                return bTime - aTime;
            });
        
        res.json({ chats: formattedChats });
    } catch (error) {
        console.error('Error getting chats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a specific chat
app.get('/api/whatsapp/:companyId/chats/:chatId/messages', async (req, res) => {
    const companyId = req.params.companyId;
    const chatId = req.params.chatId;
    const limit = parseInt(req.query.limit) || 50; // Reduced default from 1000 to 50 for better performance
    
    const client = clients.get(`client_${companyId}`);
    
    if (!client) {
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    try {
        const chat = await client.getChatById(chatId);
        
        console.log(`Fetching messages for chat ${chatId} with limit ${limit}`);
        
        // Fetch messages with limit
        const messages = await chat.fetchMessages({ limit: limit });
        
        console.log(`Fetched ${messages.length} messages`);
        
        const filteredMessages = messages;
        
        // Load media for all messages - process sequentially to avoid overwhelming the server
        const formattedMessages = [];
        for (const msg of filteredMessages) {
            let mediaUrl = null;
            let mimetype = null;
            let filename = null;
            
            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media && media.data) {
                        mediaUrl = `data:${media.mimetype};base64,${media.data}`;
                        mimetype = media.mimetype;
                        filename = media.filename || null;
                    }
                } catch (mediaError) {
                    console.error('Error downloading media for message:', msg.id._serialized, mediaError.message);
                    // Get media info even if download fails
                    if (msg._data && msg._data.mimetype) {
                        mimetype = msg._data.mimetype;
                        filename = msg._data.filename || null;
                    }
                }
            } else if (msg._data) {
                mimetype = msg._data.mimetype || null;
                filename = msg._data.filename || null;
            }
            
            // Get body - for media messages, body might be caption or filename
            let body = msg.body || '';
            if (msg.hasMedia && !body && msg._data) {
                body = msg._data.caption || msg._data.filename || '';
            }
            
            formattedMessages.push({
                id: msg.id._serialized,
                body: body,
                from: msg.from,
                to: msg.to,
                timestamp: msg.timestamp,
                type: msg.type,
                isForwarded: msg.isForwarded,
                hasMedia: msg.hasMedia,
                mediaUrl: mediaUrl,
                mimetype: mimetype,
                filename: filename,
            });
        }
        
        res.json({ messages: formattedMessages, total: messages.length });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send message
app.post('/api/whatsapp/:companyId/send', async (req, res) => {
    const companyId = req.params.companyId;
    const { phone_number, message, quoted_message_id } = req.body;
    
    const client = clients.get(`client_${companyId}`);
    
    if (!client) {
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    if (clients.get(`status_${companyId}`) !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp not ready' });
    }
    
    try {
        // Format phone number (add country code if needed)
        const formattedNumber = phone_number.includes('@') 
            ? phone_number 
            : `${phone_number}@c.us`;
        
        const options = {};
        
        // Handle reply/quote
        if (quoted_message_id) {
            options.quotedMessageId = quoted_message_id;
        }
        
        const result = await client.sendMessage(formattedNumber, message, options);
        
        res.json({
            success: true,
            message_id: result.id._serialized,
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send file/media
app.post('/api/whatsapp/:companyId/send-file', upload.single('file'), async (req, res) => {
    const companyId = req.params.companyId;
    const { phone_number } = req.body;
    const file = req.file;
    
    if (!file) {
        return res.status(400).json({ error: 'No file provided' });
    }
    
    const client = clients.get(`client_${companyId}`);
    
    if (!client) {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    if (clients.get(`status_${companyId}`) !== 'ready') {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'WhatsApp not ready' });
    }
    
    try {
        const formattedNumber = phone_number.includes('@') 
            ? phone_number 
            : `${phone_number}@c.us`;
        
        // Read file and create MessageMedia with original filename
        const fileData = fs.readFileSync(file.path);
        const base64Data = fileData.toString('base64');
        const media = new MessageMedia(file.mimetype, base64Data, file.originalname);
        
        const result = await client.sendMessage(formattedNumber, media);
        
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        
        res.json({
            success: true,
            message_id: result.id._serialized,
        });
    } catch (error) {
        // Clean up uploaded file on error
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        console.error('Error sending file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Riding Company API Routes
app.post('/api/whatsapp/riding-company/:ridingCompanyId/initialize', async (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const clientKey = `riding_${ridingCompanyId}`;
    
    try {
        let client = clients.get(`client_${clientKey}`);
        let isNewClient = false;
        
        if (!client) {
            console.log(`Initializing new WhatsApp client for riding company ${ridingCompanyId}`);
            client = initializeRidingCompanyClient(ridingCompanyId);
            clients.set(`client_${clientKey}`, client);
            clients.set(`status_${clientKey}`, 'connecting');
            isNewClient = true;
            
            // Initialize client (this will trigger QR code generation if needed)
            client.initialize().catch(err => {
                console.error(`Error during client initialization for ${clientKey}:`, err);
                clients.set(`status_${clientKey}`, 'error');
            });
        } else {
            // If client exists, check if QR is available
            const existingQR = clients.get(`qr_${clientKey}`);
            const existingStatus = clients.get(`status_${clientKey}`);
            
            if (existingQR) {
                return res.json({
                    success: true,
                    status: existingStatus || 'qr_code',
                    qr_code: existingQR,
                });
            }
            
            // If client exists but no QR, check status
            if (existingStatus === 'ready') {
                return res.json({
                    success: true,
                    status: 'ready',
                    qr_code: null,
                });
            }
        }

        // Wait longer for QR code to be generated (up to 5 seconds)
        let qrCode = null;
        let status = clients.get(`status_${clientKey}`) || 'connecting';
        
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            qrCode = clients.get(`qr_${clientKey}`);
            status = clients.get(`status_${clientKey}`) || 'connecting';
            
            if (qrCode || status === 'ready' || status === 'authenticated') {
                break;
            }
        }

        res.json({
            success: true,
            status: status,
            qr_code: qrCode,
        });
    } catch (error) {
        console.error('Error initializing riding company client:', error);
        clients.set(`status_${clientKey}`, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/whatsapp/riding-company/:ridingCompanyId/status', (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const clientKey = `riding_${ridingCompanyId}`;
    const status = clients.get(`status_${clientKey}`) || 'disconnected';
    const qrCode = clients.get(`qr_${clientKey}`) || null;
    const phoneNumber = clients.get(`phone_${clientKey}`) || null;
    const contactName = clients.get(`name_${clientKey}`) || null;
    
    res.json({
        status: status,
        phone_number: phoneNumber,
        contact_name: contactName,
        qr_code: qrCode,
    });
});

app.post('/api/whatsapp/riding-company/:ridingCompanyId/disconnect', async (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const clientKey = `riding_${ridingCompanyId}`;
    const client = clients.get(`client_${clientKey}`);
    
    if (client) {
        try {
            await client.logout();
            await client.destroy();
            clients.delete(`client_${clientKey}`);
            clients.delete(`status_${clientKey}`);
            clients.delete(`phone_${clientKey}`);
            clients.delete(`qr_${clientKey}`);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    } else {
        res.json({ success: true });
    }
});

// Delete session files for a riding company
app.post('/api/whatsapp/riding-company/:ridingCompanyId/delete-session-files', async (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const clientKey = `riding_${ridingCompanyId}`;
    const sessionPath = path.join(SESSIONS_DIR, `riding_company_${ridingCompanyId}`);
    
    try {
        // Disconnect client if active
        const client = clients.get(`client_${clientKey}`);
        if (client) {
            try {
                await client.logout();
                await client.destroy();
            } catch (error) {
                console.error('Error disconnecting client:', error);
            }
            clients.delete(`client_${clientKey}`);
            clients.delete(`status_${clientKey}`);
            clients.delete(`phone_${clientKey}`);
            clients.delete(`qr_${clientKey}`);
        }
        
        // Delete session directory
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`Deleted session files for riding company ${ridingCompanyId}`);
        }
        
        res.json({ success: true, message: 'Session files deleted' });
    } catch (error) {
        console.error('Error deleting session files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get chats for a riding company
app.post('/api/whatsapp/riding-company/:ridingCompanyId/chats', async (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const clientKey = `riding_${ridingCompanyId}`;
    const { phone_numbers } = req.body;
    
    console.log(`[${new Date().toISOString()}] ========== GET CHATS REQUEST ==========`);
    console.log(`[${new Date().toISOString()}] Riding Company ID: ${ridingCompanyId}`);
    console.log(`[${new Date().toISOString()}] Phone numbers requested:`, phone_numbers);
    console.log(`[${new Date().toISOString()}] Phone numbers count:`, phone_numbers ? phone_numbers.length : 0);
    
    const client = clients.get(`client_${clientKey}`);
    
    if (!client) {
        console.error(`[${new Date().toISOString()}] ERROR: WhatsApp client not initialized for ${clientKey}`);
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    const status = clients.get(`status_${clientKey}`);
    console.log(`[${new Date().toISOString()}] Client status: ${status}`);
    
    if (status !== 'ready') {
        console.error(`[${new Date().toISOString()}] ERROR: WhatsApp not ready, status: ${status}`);
        return res.status(400).json({ error: 'WhatsApp not ready' });
    }
    
    try {
        console.log(`[${new Date().toISOString()}] Fetching all chats from WhatsApp...`);
        const chats = await client.getChats();
        console.log(`[${new Date().toISOString()}] Total chats fetched: ${chats.length}`);
        
        // Filter out group chats
        let filteredChats = chats.filter(chat => !chat.isGroup);
        console.log(`[${new Date().toISOString()}] Individual chats (after group filter): ${filteredChats.length}`);
        
        // If phone_numbers provided, filter by them
        if (phone_numbers && phone_numbers.length > 0) {
            console.log(`[${new Date().toISOString()}] Filtering chats by ${phone_numbers.length} phone numbers...`);
            let matchCount = 0;
            let noMatchCount = 0;
            
            filteredChats = filteredChats.filter(chat => {
                // Get phone number from chat - try multiple sources (as per WhatsApp December update)
                let chatNumber = chat.id.user || chat.id._serialized.split('@')[0];
                const originalChatNumber = chatNumber;
                
                // Also try chat.name if available
                if (chat.name && chat.name.trim()) {
                    const nameNumber = chat.name.trim().replace(/\s+/g, '').replace(/[^\d+]/g, '');
                    if (nameNumber && nameNumber.length >= 9) {
                        chatNumber = nameNumber;
                        console.log(`[${new Date().toISOString()}] Using chat.name for chat ${chat.id._serialized}: ${nameNumber} (original: ${originalChatNumber})`);
                    }
                }
                
                const normalizedChat = chatNumber.replace(/\D/g, '');
                
                const matched = phone_numbers.some(phone => {
                    let normalizedPhone = phone.replace(/\D/g, '');
                    // Remove leading zeros
                    normalizedPhone = normalizedPhone.replace(/^0+/, '');
                    
                    // Try multiple matching strategies
                    // 1. Exact match
                    if (normalizedChat === normalizedPhone) {
                        console.log(`[${new Date().toISOString()}] ✓ MATCH (exact): chat=${normalizedChat}, driver=${normalizedPhone}`);
                        return true;
                    }
                    
                    // 2. Match last 9-10 digits (for Egyptian numbers)
                    const chatLast9 = normalizedChat.slice(-9);
                    const chatLast10 = normalizedChat.slice(-10);
                    const phoneLast9 = normalizedPhone.slice(-9);
                    const phoneLast10 = normalizedPhone.slice(-10);
                    if (chatLast9 && phoneLast9 && chatLast9 === phoneLast9) {
                        console.log(`[${new Date().toISOString()}] ✓ MATCH (last9): chat=${normalizedChat} (last9=${chatLast9}), driver=${normalizedPhone} (last9=${phoneLast9})`);
                        return true;
                    }
                    if (chatLast10 && phoneLast10 && chatLast10 === phoneLast10) {
                        console.log(`[${new Date().toISOString()}] ✓ MATCH (last10): chat=${normalizedChat} (last10=${chatLast10}), driver=${normalizedPhone} (last10=${phoneLast10})`);
                        return true;
                    }
                    
                    // 3. One contains the other (for cases with/without country code)
                    if (normalizedChat.includes(normalizedPhone) || normalizedPhone.includes(normalizedChat)) {
                        // Make sure the match is at least 9 digits to avoid false positives
                        const minLength = Math.min(normalizedChat.length, normalizedPhone.length);
                        if (minLength >= 9) {
                            console.log(`[${new Date().toISOString()}] ✓ MATCH (contains): chat=${normalizedChat}, driver=${normalizedPhone}`);
                            return true;
                        }
                    }
                    
                    // 4. Ends with match (for cases where country code is different)
                    if (normalizedChat.endsWith(normalizedPhone) || normalizedPhone.endsWith(normalizedChat)) {
                        const minLength = Math.min(normalizedChat.length, normalizedPhone.length);
                        if (minLength >= 9) {
                            console.log(`[${new Date().toISOString()}] ✓ MATCH (endsWith): chat=${normalizedChat}, driver=${normalizedPhone}`);
                            return true;
                        }
                    }
                    
                    return false;
                });
                
                if (matched) {
                    matchCount++;
                    console.log(`[${new Date().toISOString()}] ✓ Chat matched: id=${chat.id._serialized}, name=${chat.name}, phone=${chatNumber}, normalized=${normalizedChat}`);
                } else {
                    noMatchCount++;
                    console.log(`[${new Date().toISOString()}] ✗ Chat NOT matched: id=${chat.id._serialized}, name=${chat.name}, phone=${chatNumber}, normalized=${normalizedChat}`);
                }
                
                return matched;
            });
            
            console.log(`[${new Date().toISOString()}] Filtering results: ${matchCount} matched, ${noMatchCount} not matched, ${filteredChats.length} total after filter`);
        } else {
            console.log(`[${new Date().toISOString()}] No phone numbers provided, returning all ${filteredChats.length} individual chats`);
        }
        
        console.log(`[${new Date().toISOString()}] Formatting ${filteredChats.length} chats...`);
        const formattedChats = filteredChats
            .map((chat, index) => {
                // Get phone number from chat - try multiple sources (as per WhatsApp December update)
                let chatNumber = chat.id.user || chat.id._serialized.split('@')[0];
                // Also try chat.name if available
                if (chat.name && chat.name.trim()) {
                    const nameNumber = chat.name.trim().replace(/\s+/g, '').replace(/[^\d+]/g, '');
                    if (nameNumber && nameNumber.length >= 9) {
                        // Use chat.name if it looks like a phone number
                        chatNumber = nameNumber.replace(/^\+/, '').replace(/^20/, '');
                        console.log(`[${new Date().toISOString()}] Chat ${index + 1}: Using chat.name=${nameNumber}, extracted phone=${chatNumber}`);
                    }
                }
                
                const formatted = {
                    id: chat.id._serialized,
                    name: chat.name || chatNumber || 'Unknown',
                    phone: chatNumber,
                    unreadCount: chat.unreadCount || 0,
                    lastMessage: chat.lastMessage ? {
                        body: chat.lastMessage.body || '',
                        timestamp: chat.lastMessage.timestamp || Math.floor(Date.now() / 1000),
                    } : null,
                    isGroup: false,
                };
                
                console.log(`[${new Date().toISOString()}] Chat ${index + 1}: id=${formatted.id}, name=${formatted.name}, phone=${formatted.phone}`);
                return formatted;
            })
            .filter(chat => {
                // Additional validation: ensure phone is valid
                const normalizedPhone = chat.phone.replace(/\D/g, '');
                const isValid = normalizedPhone && normalizedPhone !== '0' && normalizedPhone.length >= 5;
                if (!isValid) {
                    console.log(`[${new Date().toISOString()}] ✗ Filtered out invalid chat: phone=${chat.phone}, normalized=${normalizedPhone}`);
                }
                return isValid;
            })
            .sort((a, b) => {
                const aTime = a.lastMessage?.timestamp || 0;
                const bTime = b.lastMessage?.timestamp || 0;
                return bTime - aTime;
            });
        
        // Removed console logs to reduce noise - chats are requested frequently by frontend polling
        
        console.log(`[${new Date().toISOString()}] Final formatted chats count: ${formattedChats.length}`);
        console.log(`[${new Date().toISOString()}] Returning chats:`, formattedChats.map(c => ({ id: c.id, name: c.name, phone: c.phone })));
        console.log(`[${new Date().toISOString()}] ========== END GET CHATS ==========`);
        
        res.json({ chats: formattedChats });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR getting chats for riding company:`, error);
        console.error(`[${new Date().toISOString()}] Error stack:`, error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a specific chat (riding company)
app.get('/api/whatsapp/riding-company/:ridingCompanyId/chats/:chatId/messages', async (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const chatId = req.params.chatId;
    const clientKey = `riding_${ridingCompanyId}`;
    const limit = parseInt(req.query.limit) || 50; // Reduced default from 1000 to 50 for better performance
    
    const client = clients.get(`client_${clientKey}`);
    
    if (!client) {
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    try {
        const chat = await client.getChatById(chatId);
        
        console.log(`Fetching messages for riding company chat ${chatId} with limit ${limit}`);
        
        // Fetch messages with limit
        const messages = await chat.fetchMessages({ limit: limit });
        
        console.log(`Fetched ${messages.length} messages for riding company`);
        
        const filteredMessages = messages;
        
        // Load media for all messages - process sequentially to avoid overwhelming the server
        const formattedMessages = [];
        for (const msg of filteredMessages) {
            let mediaUrl = null;
            let mimetype = null;
            let filename = null;
            
            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media && media.data) {
                        mediaUrl = `data:${media.mimetype};base64,${media.data}`;
                        mimetype = media.mimetype;
                        filename = media.filename || null;
                    }
                } catch (mediaError) {
                    console.error('Error downloading media for message:', msg.id._serialized, mediaError.message);
                    // Get media info even if download fails
                    if (msg._data && msg._data.mimetype) {
                        mimetype = msg._data.mimetype;
                        filename = msg._data.filename || null;
                    }
                }
            } else if (msg._data) {
                mimetype = msg._data.mimetype || null;
                filename = msg._data.filename || null;
            }
            
            // Get body - for media messages, body might be caption or filename
            let body = msg.body || '';
            if (msg.hasMedia && !body && msg._data) {
                body = msg._data.caption || msg._data.filename || '';
            }
            
            formattedMessages.push({
                id: msg.id._serialized,
                body: body,
                from: msg.from,
                to: msg.to,
                timestamp: msg.timestamp,
                type: msg.type,
                isForwarded: msg.isForwarded,
                hasMedia: msg.hasMedia,
                mediaUrl: mediaUrl,
                mimetype: mimetype,
                filename: filename,
            });
        }
        
        res.json({ messages: formattedMessages, total: messages.length });
    } catch (error) {
        console.error('Error getting messages for riding company:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send message (riding company)
app.post('/api/whatsapp/riding-company/:ridingCompanyId/send', async (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const clientKey = `riding_${ridingCompanyId}`;
    const { phone_number, message, quoted_message_id } = req.body;
    
    const client = clients.get(`client_${clientKey}`);
    
    if (!client) {
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    if (clients.get(`status_${clientKey}`) !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp not ready' });
    }
    
    try {
        // Clean and format phone number
        let cleanNumber = phone_number.toString().trim();
        
        // Remove @c.us if present
        cleanNumber = cleanNumber.replace('@c.us', '').replace('@g.us', '');
        
        // Remove all non-digit characters except +
        cleanNumber = cleanNumber.replace(/[^\d+]/g, '');
        
        // Remove leading + if present (we'll add it back if needed)
        const hasPlus = cleanNumber.startsWith('+');
        cleanNumber = cleanNumber.replace(/^\+/, '');
        
        // Remove leading zeros
        cleanNumber = cleanNumber.replace(/^0+/, '');
        
        console.log(`[${new Date().toISOString()}] Phone number processing: original=${phone_number}, after_clean=${cleanNumber}, length=${cleanNumber.length}, starts_with_20=${cleanNumber.startsWith('20')}`);
        
        // If number doesn't start with country code, assume it's Egyptian (20)
        // Egyptian numbers are typically 10-11 digits (with country code) or 9-10 digits (without)
        if (!cleanNumber.startsWith('20')) {
            // If number is 9-10 digits, it's likely missing country code
            if (cleanNumber.length >= 9 && cleanNumber.length <= 10) {
                const beforeAdd = cleanNumber;
                cleanNumber = '20' + cleanNumber;
                console.log(`[${new Date().toISOString()}] Added country code: ${beforeAdd} -> ${cleanNumber}`);
            }
        }
        
        // Add + back if it was there or if we added country code
        if (hasPlus || cleanNumber.startsWith('20')) {
            cleanNumber = '+' + cleanNumber;
        }
        
        // Format for WhatsApp: +[country][number]@c.us
        const formattedNumber = `${cleanNumber}@c.us`;
        
        console.log(`[${new Date().toISOString()}] Sending message to ${formattedNumber} (original: ${phone_number}, cleaned: ${cleanNumber})`);
        
        // Try to get chat first to verify the number
        let chat = null;
        try {
            chat = await client.getChatById(formattedNumber);
            console.log(`[${new Date().toISOString()}] Chat found for ${formattedNumber}`);
        } catch (chatError) {
            console.log(`[${new Date().toISOString()}] Chat not found for ${formattedNumber}, will create by sending message`);
        }
        
        const options = {};
        
        // Handle reply/quote
        if (quoted_message_id) {
            options.quotedMessageId = quoted_message_id;
        }
        
        // Try sending message - this will create the chat if it doesn't exist
        try {
            const result = await client.sendMessage(formattedNumber, message, options);
            
            res.json({
                success: true,
                message_id: result.id._serialized,
                chat_created: !chat, // Indicate if chat was created
            });
        } catch (sendError) {
            // If sendMessage fails, try alternative format without country code
            if (cleanNumber.startsWith('20') && cleanNumber.length > 2) {
                const alternativeNumber = cleanNumber.substring(2); // Remove country code
                const alternativeFormatted = `${alternativeNumber}@c.us`;
                console.log(`[${new Date().toISOString()}] Trying alternative format: ${alternativeFormatted}`);
                
                try {
                    const result = await client.sendMessage(alternativeFormatted, message, options);
                    res.json({
                        success: true,
                        message_id: result.id._serialized,
                        chat_created: true,
                        used_alternative_format: true,
                    });
                } catch (altError) {
                    throw sendError; // Throw original error
                }
            } else {
                throw sendError;
            }
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending message for riding company:`, {
            error: error.message,
            stack: error.stack,
            phone_number: phone_number,
            riding_company_id: ridingCompanyId,
        });
        
        // Provide more helpful error message
        let errorMessage = 'فشل في إرسال الرسالة.';
        if (error.message.includes('Evaluation failed')) {
            errorMessage = 'الرقم غير صحيح أو ليس لديه WhatsApp. يرجى التحقق من الرقم.';
        } else if (error.message.includes('not registered')) {
            errorMessage = 'هذا الرقم غير مسجل في WhatsApp.';
        } else {
            errorMessage = error.message || 'فشل في إرسال الرسالة.';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: 'The number may not have WhatsApp or the format is incorrect.',
            original_error: error.message
        });
    }
});

// Send file/media for riding company
app.post('/api/whatsapp/riding-company/:ridingCompanyId/send-file', upload.single('file'), async (req, res) => {
    const ridingCompanyId = req.params.ridingCompanyId;
    const clientKey = `riding_${ridingCompanyId}`;
    const { phone_number } = req.body;
    const file = req.file;
    
    if (!file) {
        return res.status(400).json({ error: 'No file provided' });
    }
    
    const client = clients.get(`client_${clientKey}`);
    
    if (!client) {
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    if (clients.get(`status_${clientKey}`) !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp not ready' });
    }
    
    try {
        // Clean and format phone number (same logic as send message)
        let cleanNumber = phone_number.toString().trim();
        cleanNumber = cleanNumber.replace('@c.us', '').replace('@g.us', '');
        cleanNumber = cleanNumber.replace(/[^\d+]/g, '');
        const hasPlus = cleanNumber.startsWith('+');
        cleanNumber = cleanNumber.replace(/^\+/, '').replace(/^0+/, '');
        if (!cleanNumber.startsWith('20') && cleanNumber.length >= 9) {
            cleanNumber = '20' + cleanNumber;
        }
        if (hasPlus || cleanNumber.startsWith('20')) {
            cleanNumber = '+' + cleanNumber;
        }
        const formattedNumber = `${cleanNumber}@c.us`;
        
        // Read file and create MessageMedia with original filename
        const fileData = fs.readFileSync(file.path);
        const base64Data = fileData.toString('base64');
        const media = new MessageMedia(file.mimetype, base64Data, file.originalname);
        
        const result = await client.sendMessage(formattedNumber, media);
        
        // Clean up uploaded file
        fs.unlinkSync(file.path);

        res.json({
            success: true,
            message_id: result.id._serialized,
        });
    } catch (error) {
        console.error('Error sending file for riding company:', error);
        // Clean up uploaded file on error
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Initialize existing sessions on startup
initializeExistingSessions();

app.listen(PORT, () => {
    console.log(`WhatsApp service running on port ${PORT}`);
    console.log(`Auto-initializing existing sessions...`);
});

