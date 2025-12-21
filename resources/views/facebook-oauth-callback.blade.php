<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facebook OAuth Callback</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .container {
            text-align: center;
            color: white;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .message {
            font-size: 16px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        @if($success)
            <div class="spinner"></div>
            <div class="message">Connecting Facebook account...</div>
        @else
            <div class="message">Error: {{ $message }}</div>
        @endif
    </div>

    <script>
        // Send message to parent window
        if (window.opener && !window.opener.closed) {
            const message = {
                type: @json($success) ? 'FACEBOOK_OAUTH_SUCCESS' : 'FACEBOOK_OAUTH_ERROR',
                success: @json($success),
                message: @json($message),
                riding_company_id: @json($riding_company_id)
            };
            
            console.log('Sending message to parent:', message);
            
            // Try to send message multiple times to ensure it's received
            window.opener.postMessage(message, window.location.origin);
            
            // Also try with different message format for compatibility
            window.opener.postMessage({
                type: message.type,
                ...message
            }, window.location.origin);
            
            // Close popup after a short delay
            setTimeout(() => {
                if (window.opener && !window.opener.closed) {
                    window.close();
                }
            }, 1500);
        } else {
            // If no opener (direct access), redirect to the integration page
            @if($success && $riding_company_id)
                setTimeout(() => {
                    window.location.href = '/ridingcarcompanies/riding-companies/{{ $riding_company_id }}/facebook';
                }, 2000);
            @else
                setTimeout(() => {
                    window.location.href = '/ridingcarcompanies/riding-companies';
                }, 2000);
            @endif
        }
    </script>
</body>
</html>

