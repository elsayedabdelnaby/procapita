const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
        console.log(`QR Code generated for company ${companyId}`);
        // Convert QR string to base64 image
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
            clients.set(`qr_${companyId}`, qrImage);
            clients.set(`status_${companyId}`, 'qr_code');
            console.log(`QR Code image generated and stored for company ${companyId}`);
        } catch (error) {
            console.error('Error converting QR to image:', error);
            // Fallback to string
            clients.set(`qr_${companyId}`, qr);
            clients.set(`status_${companyId}`, 'qr_code');
        }
    });

    client.on('ready', () => {
        console.log(`WhatsApp client ready for company ${companyId}`);
        const info = client.info;
        clients.set(`status_${companyId}`, 'ready');
        clients.set(`phone_${companyId}`, info.wid.user);
        clients.set(`client_${companyId}`, client);
        
        // Keep client alive - don't destroy it
        console.log(`WhatsApp session for company ${companyId} is now active and will stay connected`);
    });

    client.on('authenticated', () => {
        console.log(`WhatsApp authenticated for company ${companyId}`);
        clients.set(`status_${companyId}`, 'authenticated');
        clients.set(`client_${companyId}`, client);
    });

    client.on('auth_failure', (msg) => {
        console.error(`Auth failure for company ${companyId}:`, msg);
        clients.set(`status_${companyId}`, 'disconnected');
    });

    client.on('disconnected', (reason) => {
        console.log(`WhatsApp disconnected for company ${companyId}:`, reason);
        clients.set(`status_${companyId}`, 'disconnected');
        clients.delete(`qr_${companyId}`);
        clients.delete(`client_${companyId}`);
        
        // Auto-reconnect after 5 seconds
        if (reason !== 'LOGOUT') {
            console.log(`Attempting to reconnect company ${companyId} in 5 seconds...`);
            setTimeout(() => {
                if (!clients.has(`client_${companyId}`)) {
                    const newClient = initializeClient(companyId);
                    clients.set(`client_${companyId}`, newClient);
                    newClient.initialize().catch(err => {
                        console.error(`Reconnection failed for company ${companyId}:`, err);
                    });
                }
            }, 5000);
        }
    });

    // Handle incoming messages
    client.on('message', async (message) => {
        const from = message.from;
        const body = message.body;
        const messageId = message.id._serialized;
        
        console.log(`Message received for company ${companyId} from ${from}: ${body}`);
        
        // Store message info (you can send this to Laravel via webhook)
        clients.set(`last_message_${companyId}_${from}`, {
            id: messageId,
            from: from,
            body: body,
            timestamp: new Date(),
        });
    });

    return client;
}

// Auto-initialize existing sessions on startup
function initializeExistingSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) {
        return;
    }
    
    const companyDirs = fs.readdirSync(SESSIONS_DIR).filter(dir => {
        return dir.startsWith('company_') && fs.statSync(path.join(SESSIONS_DIR, dir)).isDirectory();
    });
    
    companyDirs.forEach(dir => {
        const companyId = dir.replace('company_', '');
        const sessionPath = path.join(SESSIONS_DIR, dir);
        const authFile = path.join(sessionPath, '.wwebjs_auth', 'session');
        
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
}

// API Routes
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
    const limit = parseInt(req.query.limit) || 50;
    
    const client = clients.get(`client_${companyId}`);
    
    if (!client) {
        return res.status(404).json({ error: 'WhatsApp client not initialized' });
    }
    
    try {
        const chat = await client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit });
        
        const formattedMessages = messages.map(msg => ({
            id: msg.id._serialized,
            body: msg.body,
            from: msg.from,
            to: msg.to,
            timestamp: msg.timestamp,
            type: msg.type,
            isForwarded: msg.isForwarded,
            hasMedia: msg.hasMedia,
            mediaUrl: msg.hasMedia ? null : null, // Will be handled separately
        }));
        
        res.json({ messages: formattedMessages });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send message
app.post('/api/whatsapp/:companyId/send', async (req, res) => {
    const companyId = req.params.companyId;
    const { phone_number, message } = req.body;
    
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
        
        const result = await client.sendMessage(formattedNumber, message);
        
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
        
        const media = MessageMedia.fromFilePath(file.path);
        const result = await client.sendMessage(formattedNumber, media, { caption: file.originalname || file.filename });
        
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

// Initialize existing sessions on startup
initializeExistingSessions();

app.listen(PORT, () => {
    console.log(`WhatsApp service running on port ${PORT}`);
    console.log(`Auto-initializing existing sessions...`);
});

