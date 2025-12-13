<?php

namespace Modules\WhatsApp\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\WhatsApp\app\Models\WhatsAppSession;

class WhatsAppController extends Controller
{
    /**
     * Get or create WhatsApp session for a company
     */
    public function getSession(Request $request, int $companyId)
    {
        $company = Company::findOrFail($companyId);
        
        // Check if user has permission to access this company
        $user = Auth::user();
        if (!$user->is_super_admin && $user->company_id !== $companyId) {
            abort(403, 'Unauthorized');
        }

        $session = WhatsAppSession::firstOrCreate(
            ['company_id' => $companyId],
            [
                'session_id' => 'whatsapp_' . $companyId . '_' . time(),
                'status' => 'disconnected',
            ]
        );

        return response()->json([
            'session' => $session,
            'qr_code' => $session->qr_code,
            'status' => $session->status,
        ]);
    }

    /**
     * Generate QR code for WhatsApp linking
     */
    public function generateQRCode(Request $request, int $companyId)
    {
        $company = Company::findOrFail($companyId);
        
        $user = Auth::user();
        if (!$user->is_super_admin && $user->company_id !== $companyId) {
            abort(403, 'Unauthorized');
        }

        $session = WhatsAppSession::firstOrCreate(
            ['company_id' => $companyId],
            [
                'session_id' => 'whatsapp_' . $companyId . '_' . time(),
                'status' => 'disconnected',
            ]
        );

        // Call Node.js service to initialize WhatsApp client
        $nodeServiceUrl = env('WHATSAPP_SERVICE_URL', 'http://localhost:3001');
        
        try {
            $response = Http::timeout(15)->post("{$nodeServiceUrl}/api/whatsapp/{$companyId}/initialize");
            
            if ($response->successful()) {
                $data = $response->json();
                
                // Get QR code from response
                $qrCode = $data['qr_code'] ?? null;
                $status = $data['status'] ?? 'connecting';
                
                // If QR code is not in response, poll for it
                if (!$qrCode && $status === 'qr_code') {
                    // Wait a bit and try to get QR code
                    sleep(2);
                    $statusResponse = Http::timeout(5)->get("{$nodeServiceUrl}/api/whatsapp/{$companyId}/status");
                    if ($statusResponse->successful()) {
                        $statusData = $statusResponse->json();
                        $qrCode = $statusData['qr_code'] ?? null;
                        $status = $statusData['status'] ?? $status;
                    }
                }
                
                // Update session
                $session->update([
                    'status' => $status,
                    'qr_code' => $qrCode,
                    'qr_code_expires_at' => $qrCode ? now()->addMinutes(5) : null,
                ]);

                return response()->json([
                    'qr_code' => $qrCode,
                    'status' => $status,
                    'expires_at' => $session->qr_code_expires_at?->toISOString(),
                    'session' => $session->fresh(),
                ]);
            } else {
                throw new \Exception('Node.js service error: ' . $response->body());
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('WhatsApp service connection failed: ' . $e->getMessage());
            
            // Return helpful error message
            return response()->json([
                'error' => 'WhatsApp service is not running',
                'message' => 'Please start the WhatsApp service by running: cd whatsapp-service && npm start',
                'status' => 'service_unavailable',
            ], 503);
        } catch (\Exception $e) {
            Log::error('WhatsApp QR generation failed: ' . $e->getMessage());
            
            // Return error message
            return response()->json([
                'error' => 'Failed to generate QR code',
                'message' => $e->getMessage(),
                'status' => 'error',
            ], 500);
        }
    }

    /**
     * Generate QR code image from string
     */
    private function generateQRCodeImage(string $qrString): string
    {
        // Use a QR code library to convert string to image
        // For now, return the string as-is (whatsapp-web.js returns QR as string)
        // You can use a library like simple-qrcode or endroid/qr-code to convert to image
        return $qrString;
    }

    /**
     * Get session status
     */
    public function getStatus(Request $request, int $companyId)
    {
        $company = Company::findOrFail($companyId);
        
        $user = Auth::user();
        if (!$user->is_super_admin && $user->company_id !== $companyId) {
            abort(403, 'Unauthorized');
        }

        $session = WhatsAppSession::where('company_id', $companyId)->first();

        // Try to get status from Node.js service
        $nodeServiceUrl = env('WHATSAPP_SERVICE_URL', 'http://localhost:3001');
        
        try {
            $response = Http::timeout(5)->get("{$nodeServiceUrl}/api/whatsapp/{$companyId}/status");
            
            if ($response->successful()) {
                $data = $response->json();
                
                // Update session from Node.js service
                if ($session) {
                    $session->update([
                        'status' => $data['status'] ?? 'disconnected',
                        'phone_number' => $data['phone_number'] ?? null,
                        'qr_code' => $data['qr_code'] ?? $session->qr_code,
                    ]);
                }
            }
        } catch (\Exception $e) {
            // If Node.js service is not available, use database status
            Log::debug('WhatsApp service not available, using database status');
        }

        if (!$session) {
            return response()->json([
                'status' => 'disconnected',
                'session' => null,
            ]);
        }

        return response()->json([
            'status' => $session->status,
            'session' => $session,
            'phone_number' => $session->phone_number,
        ]);
    }

    /**
     * Disconnect WhatsApp session
     */
    public function disconnect(Request $request, int $companyId)
    {
        $company = Company::findOrFail($companyId);
        
        $user = Auth::user();
        if (!$user->is_super_admin && $user->company_id !== $companyId) {
            abort(403, 'Unauthorized');
        }

        // Disconnect from Node.js service
        $nodeServiceUrl = env('WHATSAPP_SERVICE_URL', 'http://localhost:3001');
        
        try {
            Http::timeout(10)->post("{$nodeServiceUrl}/api/whatsapp/{$companyId}/disconnect");
        } catch (\Exception $e) {
            Log::error('WhatsApp disconnect failed: ' . $e->getMessage());
        }

        $session = WhatsAppSession::where('company_id', $companyId)->first();
        
        if ($session) {
            $session->update([
                'status' => 'disconnected',
                'qr_code' => null,
                'qr_code_expires_at' => null,
                'phone_number' => null,
            ]);
        }

        return response()->json(['success' => true]);
    }
}
