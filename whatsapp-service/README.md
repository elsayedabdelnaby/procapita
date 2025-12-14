# WhatsApp Service

Node.js service for WhatsApp Web integration using whatsapp-web.js.

## Installation

1. Navigate to the whatsapp-service directory:
```bash
cd whatsapp-service
```

2. Install dependencies:
```bash
npm install
```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The service will run on port 3001 by default (or the port specified in the PORT environment variable).

## Environment Variables

Create a `.env` file in the whatsapp-service directory:

```
PORT=3001
```

## API Endpoints

- `POST /api/whatsapp/:companyId/initialize` - Initialize WhatsApp client and generate QR code
- `GET /api/whatsapp/:companyId/status` - Get current status and phone number
- `GET /api/whatsapp/:companyId/qr` - Get QR code
- `POST /api/whatsapp/:companyId/disconnect` - Disconnect WhatsApp client

## Laravel Configuration

Add to your Laravel `.env` file:

```
WHATSAPP_SERVICE_URL=http://localhost:3001
```

## Notes

- The service stores WhatsApp sessions in `storage/app/whatsapp/sessions/company_{id}/`
- Each company has its own isolated session
- QR codes expire after 5 minutes
- The service uses Puppeteer to run WhatsApp Web in headless mode

