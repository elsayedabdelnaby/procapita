<?php

namespace Modules\WhatsApp\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\WhatsApp\app\Models\WhatsAppSession;
use Modules\Drivers\app\Services\DriverService;

class WhatsAppController extends Controller
{
    public function __construct(
        protected DriverService $driverService
    ) {}

    /**
     * Check if WhatsApp service is running, start it if not
     */
    protected function ensureWhatsAppServiceRunning(): bool
    {
        $nodeServiceUrl = env('WHATSAPP_SERVICE_URL', 'http://localhost:3001');
        
        try {
            $response = Http::timeout(2)->get("{$nodeServiceUrl}/api/whatsapp/health");
            return $response->successful();
        } catch (\Exception $e) {
            // Service not running, try to start it
            $this->startWhatsAppService();
            
            // Wait and check again
            sleep(3);
            
            try {
                $response = Http::timeout(2)->get("{$nodeServiceUrl}/api/whatsapp/health");
                return $response->successful();
            } catch (\Exception $e) {
                return false;
            }
        }
    }
    
    /**
     * Start WhatsApp service in background
     */
    protected function startWhatsAppService(): void
    {
        $servicePath = base_path('whatsapp-service');
        
        if (PHP_OS_FAMILY === 'Windows') {
            // Windows: start in background
            pclose(popen("start /B node \"{$servicePath}/index.js\"", 'r'));
        } else {
            // Linux/Mac: start in background
            exec("cd {$servicePath} && node index.js > /dev/null 2>&1 &");
        }
        
        Log::info('WhatsApp service started automatically');
    }
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

        // Ensure WhatsApp service is running
        if (!$this->ensureWhatsAppServiceRunning()) {
            return response()->json([
                'success' => false,
                'error' => 'WhatsApp service could not be started. Please start it manually.',
            ], 503);
        }

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
                        'contact_name' => $data['contact_name'] ?? null,
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
            'contact_name' => $session->contact_name,
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

    /**
     * Get or create WhatsApp session for a riding company
     */
    public function getRidingCompanySession(Request $request, int $ridingCompanyId)
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        
        // Check if user has permission to access this riding company
        $user = Auth::user();
        if (!$user->is_super_admin && $user->riding_company_id !== $ridingCompanyId) {
            abort(403, 'Unauthorized');
        }

        $session = WhatsAppSession::firstOrCreate(
            ['riding_company_id' => $ridingCompanyId],
            [
                'company_id' => $ridingCompany->company_id,
                'session_id' => 'whatsapp_riding_' . $ridingCompanyId . '_' . time(),
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
     * Generate QR code for WhatsApp linking (Riding Company)
     */
    public function generateRidingCompanyQRCode(Request $request, int $ridingCompanyId)
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        
        $user = Auth::user();
        if (!$user->is_super_admin && $user->riding_company_id !== $ridingCompanyId) {
            abort(403, 'Unauthorized');
        }

        $session = WhatsAppSession::firstOrCreate(
            ['riding_company_id' => $ridingCompanyId],
            [
                'company_id' => $ridingCompany->company_id,
                'session_id' => 'whatsapp_riding_' . $ridingCompanyId . '_' . time(),
                'status' => 'disconnected',
            ]
        );

        // Ensure WhatsApp service is running
        if (!$this->ensureWhatsAppServiceRunning()) {
            return response()->json([
                'success' => false,
                'error' => 'WhatsApp service could not be started. Please start it manually.',
            ], 503);
        }

        // Call Node.js service to initialize WhatsApp client
        $nodeServiceUrl = env('WHATSAPP_SERVICE_URL', 'http://localhost:3001');
        
        try {
            $response = Http::timeout(15)->post("{$nodeServiceUrl}/api/whatsapp/riding-company/{$ridingCompanyId}/initialize");
            
            if ($response->successful()) {
                $data = $response->json();
                
                // Get QR code from response
                $qrCode = $data['qr_code'] ?? null;
                $status = $data['status'] ?? 'connecting';
                
                // If QR code is not in response, poll for it
                if (!$qrCode && $status === 'qr_code') {
                    // Wait a bit and try to get QR code
                    sleep(2);
                    $statusResponse = Http::timeout(5)->get("{$nodeServiceUrl}/api/whatsapp/riding-company/{$ridingCompanyId}/status");
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
     * Get session status (Riding Company)
     */
    public function getRidingCompanyStatus(Request $request, int $ridingCompanyId)
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        
        $user = Auth::user();
        if (!$user->is_super_admin && $user->riding_company_id !== $ridingCompanyId) {
            abort(403, 'Unauthorized');
        }

        $session = WhatsAppSession::where('riding_company_id', $ridingCompanyId)->first();

        // Try to get status from Node.js service
        $nodeServiceUrl = env('WHATSAPP_SERVICE_URL', 'http://localhost:3001');
        
        try {
            $response = Http::timeout(5)->get("{$nodeServiceUrl}/api/whatsapp/riding-company/{$ridingCompanyId}/status");
            
            if ($response->successful()) {
                $data = $response->json();
                
                // Update session from Node.js service
                if ($session) {
                    $session->update([
                        'status' => $data['status'] ?? 'disconnected',
                        'phone_number' => $data['phone_number'] ?? null,
                        'contact_name' => $data['contact_name'] ?? null,
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
            'contact_name' => $session->contact_name,
        ]);
    }

    /**
     * Disconnect WhatsApp session (Riding Company)
     */
    public function disconnectRidingCompany(Request $request, int $ridingCompanyId)
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        
        $user = Auth::user();
        if (!$user->is_super_admin && $user->riding_company_id !== $ridingCompanyId) {
            abort(403, 'Unauthorized');
        }

        // Disconnect from Node.js service
        $nodeServiceUrl = env('WHATSAPP_SERVICE_URL', 'http://localhost:3001');
        
        try {
            Http::timeout(10)->post("{$nodeServiceUrl}/api/whatsapp/riding-company/{$ridingCompanyId}/disconnect");
        } catch (\Exception $e) {
            Log::error('WhatsApp disconnect failed: ' . $e->getMessage());
        }

        $session = WhatsAppSession::where('riding_company_id', $ridingCompanyId)->first();
        
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

    /**
     * Receive incoming message from Node.js service webhook
     */
    public function receiveMessage(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            \Log::info('WhatsApp webhook received', [
                'request_data' => $request->all(),
            ]);

            $request->validate([
                'riding_company_id' => ['required', 'integer', 'exists:riding_companies,id'],
                'from_number' => ['required', 'string'],
                'to_number' => ['required', 'string'],
                'message_id' => ['nullable', 'string'],
                'body' => ['nullable', 'string'],
                'type' => ['nullable', 'string', 'in:text,chat,image,video,audio,ptt,document,location,contact'],
                'timestamp' => ['nullable', 'integer'],
                'contact_name' => ['nullable', 'string'], // Name from WhatsApp contact
            ]);

            $ridingCompanyId = $request->input('riding_company_id');
            $fromNumber = $request->input('from_number');
            $toNumber = $request->input('to_number');
            $messageId = $request->input('message_id');
            $body = $request->input('body');
            $type = $request->input('type', 'text');
            $timestamp = $request->input('timestamp');
            $contactName = $request->input('contact_name');

            \Log::info('Processing WhatsApp message', [
                'riding_company_id' => $ridingCompanyId,
                'from_number' => $fromNumber,
                'contact_name' => $contactName,
                'message_type' => $type,
                'has_body' => !empty($body),
            ]);

            // Remove @c.us suffix if present
            $cleanFromNumber = str_replace('@c.us', '', $fromNumber);
            $cleanToNumber = str_replace('@c.us', '', $toNumber);

            // Validate phone number is not empty
            if (empty($cleanFromNumber) || !trim($cleanFromNumber)) {
                \Log::warning('Empty phone number received, ignoring message', [
                    'from_number' => $fromNumber,
                    'riding_company_id' => $ridingCompanyId,
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid phone number: empty',
                ], 400);
            }

            // Reformat phone number using DriverService
            $cleanFromNumber = $this->driverService->reformatPhoneNumber($cleanFromNumber);

            // Validate phone number contains at least 5 digits after reformatting
            $digitsOnly = preg_replace('/[^0-9]/', '', $cleanFromNumber);
            if (empty($digitsOnly) || strlen($digitsOnly) < 5) {
                \Log::warning('Invalid phone number (less than 5 digits), ignoring message', [
                    'original' => $fromNumber,
                    'cleaned' => $cleanFromNumber,
                    'digits_only' => $digitsOnly,
                    'riding_company_id' => $ridingCompanyId,
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid phone number: must contain at least 5 digits',
                ], 400);
            }

            \Log::info('Cleaned phone number', [
                'original' => $fromNumber,
                'cleaned' => $cleanFromNumber,
                'digits_count' => strlen($digitsOnly),
            ]);

            // Get riding company
            $ridingCompany = \Modules\RidingCarCompanies\app\Models\RidingCompany::findOrFail($ridingCompanyId);

            // Get WhatsApp session
            $session = \Modules\WhatsApp\app\Models\WhatsAppSession::where('riding_company_id', $ridingCompanyId)->first();

            if (!$session) {
                \Log::error('WhatsApp session not found', [
                    'riding_company_id' => $ridingCompanyId,
                ]);
                return response()->json(['error' => 'WhatsApp session not found for this riding company'], 404);
            }

            // Format phone number for comparison
            $formattedForComparison = preg_replace('/[^0-9]/', '', $cleanFromNumber);

            \Log::info('Searching for driver', [
                'formatted_phone' => $formattedForComparison,
            ]);

            // Check if driver exists with this phone number (using reformatted number)
            $driver = \Modules\Drivers\app\Models\Driver::where(function ($query) use ($formattedForComparison) {
                $query->whereRaw('REPLACE(REPLACE(REPLACE(REPLACE(phone, "+", ""), " ", ""), "-", ""), ".", "") = ?', [
                    $formattedForComparison
                ])
                ->orWhereRaw('REPLACE(REPLACE(REPLACE(REPLACE(whatsapp_phone, "+", ""), " ", ""), "-", ""), ".", "") = ?', [
                    $formattedForComparison
                ]);
            })->first();

            \Log::info('Driver search result', [
                'driver_found' => $driver ? true : false,
                'driver_id' => $driver?->id,
            ]);

            // If driver doesn't exist, create one automatically
            // This applies to ALL message types (text, image, video, audio, ptt, etc.), not just text messages
            // Even if body is empty, we still create the driver if the phone number is valid
            if (!$driver) {
                \Log::info('Driver not found, creating new driver', [
                    'phone' => $cleanFromNumber,
                    'contact_name' => $contactName,
                ]);

                // Get default user for this riding company
                $defaultUserId = $ridingCompany->default_driver_user_id;
                
                if (!$defaultUserId) {
                    // Try to find fresh-Leads user for this riding company
                    $nameWithDots = str_replace(' ', '.', $ridingCompany->name);
                    $userName = "fresh-Leads-{$nameWithDots}";
                    $defaultUser = \App\Models\User::where('name', $userName)
                        ->where('riding_company_id', $ridingCompanyId)
                        ->first();
                    
                    if ($defaultUser) {
                        $defaultUserId = $defaultUser->id;
                        \Log::info('Found fresh-Leads user', [
                            'user_id' => $defaultUserId,
                            'user_name' => $userName,
                        ]);
                    } else {
                        \Log::warning('No default user found for riding company', [
                            'riding_company_id' => $ridingCompanyId,
                            'searched_user_name' => $userName,
                        ]);
                    }
                } else {
                    \Log::info('Using default driver user from riding company', [
                        'user_id' => $defaultUserId,
                    ]);
                }

                // Get or create "WhatsApp" lead source for this company
                $whatsappLeadSource = \Modules\Drivers\app\Models\LeadSource::firstOrCreate(
                    [
                        'name' => 'WhatsApp',
                        'company_id' => $ridingCompany->company_id,
                    ],
                    [
                        'name' => 'WhatsApp',
                        'description' => 'Leads created automatically from WhatsApp messages',
                        'active' => true,
                        'company_id' => $ridingCompany->company_id,
                    ]
                );

                \Log::info('WhatsApp lead source', [
                    'lead_source_id' => $whatsappLeadSource->id,
                    'name' => $whatsappLeadSource->name,
                    'company_id' => $ridingCompany->company_id,
                ]);

                // Get or create "New" lead status for this company
                $newLeadStatus = \Modules\Drivers\app\Models\LeadStatus::firstOrCreate(
                    [
                        'name' => 'New',
                        'company_id' => $ridingCompany->company_id,
                    ],
                    [
                        'name' => 'New',
                        'description' => 'New leads created automatically',
                        'active' => true,
                        'company_id' => $ridingCompany->company_id,
                    ]
                );

                \Log::info('New lead status', [
                    'lead_status_id' => $newLeadStatus->id,
                    'name' => $newLeadStatus->name,
                    'company_id' => $ridingCompany->company_id,
                ]);

                // Create driver
                try {
                    $driver = \Modules\Drivers\app\Models\Driver::create([
                        'full_name' => $contactName ?: 'NA',
                        'phone' => $cleanFromNumber,
                        'whatsapp_phone' => $cleanFromNumber,
                        'riding_company_id' => $ridingCompanyId,
                        'company_id' => $ridingCompany->company_id,
                        'assigned_to' => $defaultUserId,
                        'lead_source_id' => $whatsappLeadSource->id,
                        'lead_status_id' => $newLeadStatus->id,
                    ]);

                    \Log::info('Driver created successfully', [
                        'driver_id' => $driver->id,
                        'phone' => $cleanFromNumber,
                        'name' => $contactName ?: 'NA',
                        'riding_company_id' => $ridingCompanyId,
                        'assigned_to' => $defaultUserId,
                    ]);

                    // Assign default user if exists
                    if ($defaultUserId) {
                        $driver->assignedUsers()->sync([$defaultUserId]);
                        \Log::info('Driver assigned to user', [
                            'driver_id' => $driver->id,
                            'user_id' => $defaultUserId,
                        ]);
                    }

                    // Try to distribute driver if distribution is enabled
                    try {
                        $ridingCompany = $ridingCompany->fresh();
                        if ($ridingCompany->distribution_type === 'equal' && !empty($ridingCompany->distribution_users)) {
                            $distributionService = app(\Modules\RidingCarCompanies\app\Services\RidingCompanyService::class);
                            $distributionResult = $distributionService->distributeDrivers($ridingCompanyId);
                            
                            if ($distributionResult['success'] && $distributionResult['distributed'] > 0) {
                                \Log::info('Driver auto-distributed', [
                                    'driver_id' => $driver->id,
                                    'distributed_count' => $distributionResult['distributed'],
                                ]);
                            }
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error auto-distributing driver', [
                            'driver_id' => $driver->id,
                            'error' => $e->getMessage(),
                        ]);
                        // Don't fail driver creation if distribution fails
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create driver', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'phone' => $cleanFromNumber,
                        'contact_name' => $contactName,
                    ]);
                    throw $e;
                }
            }

            // Save message to database
            $message = \Modules\WhatsApp\app\Models\WhatsAppMessage::create([
                'whatsapp_session_id' => $session->id,
                'driver_id' => $driver->id,
                'from_number' => $cleanFromNumber,
                'to_number' => $cleanToNumber,
                'message_id' => $messageId,
                'body' => $body,
                'type' => $type,
                'direction' => 'incoming',
                'timestamp' => $timestamp ? \Carbon\Carbon::createFromTimestamp($timestamp) : now(),
                'is_read' => false,
            ]);

            \Log::info('WhatsApp message saved', [
                'message_id' => $message->id,
                'driver_id' => $driver->id,
                'driver_created' => $driver->wasRecentlyCreated,
            ]);

            return response()->json([
                'success' => true,
                'message_id' => $message->id,
                'driver_id' => $driver->id,
                'driver_created' => $driver->wasRecentlyCreated,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error in WhatsApp webhook', [
                'errors' => $e->errors(),
                'request_data' => $request->all(),
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error processing WhatsApp webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
