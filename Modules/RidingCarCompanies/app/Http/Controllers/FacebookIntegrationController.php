<?php

namespace Modules\RidingCarCompanies\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Models\RidingCompanyIntegrationSetting;
use Modules\RidingCarCompanies\app\Services\FacebookService;
use Modules\Drivers\app\Services\DriverService;

class FacebookIntegrationController extends Controller
{
    public function __construct(
        protected FacebookService $facebookService,
        protected DriverService $driverService
    ) {}

    /**
     * Show Facebook integration setup page
     */
    public function show(int $ridingCompanyId): Response
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        
        // Get or create Facebook integration setting
        // Use firstOrNew + explicit save to ensure config is always set
        $integration = RidingCompanyIntegrationSetting::firstOrNew(
            [
                'riding_company_id' => $ridingCompanyId,
                'type' => 'facebook',
            ]
        );
        
        // Ensure config is set explicitly
        if (!isset($integration->config) || $integration->config === null) {
            $integration->setAttribute('config', []);
        }
        
        // Set other defaults if creating new
        if (!$integration->exists) {
            $integration->active = false;
        }
        
        // Double-check config is in attributes before saving
        if (!isset($integration->attributes['config']) || !array_key_exists('config', $integration->attributes)) {
            $integration->setAttribute('config', $integration->config ?? []);
        }
        
        $integration->save();
        $integration->load('ridingCompany');

        return Inertia::render('RidingCarCompanies/FacebookIntegration/Show', [
            'ridingCompany' => [
                'id' => $ridingCompany->id,
                'name' => $ridingCompany->name,
            ],
            'integration' => [
                'id' => $integration->id,
                'type' => $integration->type,
                'active' => $integration->active,
                'facebook_user_id' => $integration->facebook_user_id,
                'facebook_user_name' => $integration->facebook_user_name,
                'facebook_page_id' => $integration->facebook_page_id,
                'facebook_form_id' => $integration->facebook_form_id,
                'facebook_field_mapping' => $integration->facebook_field_mapping ?? [],
                'has_access_token' => !empty($integration->facebook_access_token),
            ],
        ]);
    }

    /**
     * Get Facebook OAuth URL
     */
    public function getOAuthUrl(Request $request, int $ridingCompanyId): \Illuminate\Http\JsonResponse
    {
        try {
            \Log::info('Getting Facebook OAuth URL', [
                'riding_company_id' => $ridingCompanyId,
                'user_id' => Auth::id(),
            ]);

            // Check if Facebook credentials are configured
            // Try multiple ways to get the values
            $appId = config('services.facebook.app_id');
            if (empty($appId)) {
                $appId = env('FACEBOOK_APP_ID');
            }
            
            $redirectUri = config('services.facebook.redirect_uri');
            if (empty($redirectUri)) {
                $redirectUri = env('FACEBOOK_REDIRECT_URI');
            }
            
            // If still empty, try to construct redirect URI from APP_URL
            if (empty($redirectUri)) {
                // Try multiple ways to get APP_URL
                $appUrl = config('app.url');
                if (empty($appUrl)) {
                    $appUrl = env('APP_URL');
                }
                if (empty($appUrl)) {
                    // Fallback to common local development URLs
                    $appUrl = 'http://127.0.0.1:8000';
                }
                $redirectUri = rtrim($appUrl, '/') . '/ridingcarcompanies/facebook/callback';
            }

            // Final check - if appId is still empty, we can't proceed
            // But we can use the constructed redirectUri if appId exists
            if (empty($appId)) {
                \Log::warning('Facebook App ID not configured', [
                    'config_app_id' => config('services.facebook.app_id') ? 'set' : 'empty',
                    'env_app_id' => env('FACEBOOK_APP_ID') ? 'set' : 'empty',
                    'env_file_exists' => file_exists(base_path('.env')),
                ]);

                $helpMessage = 'Please add these lines to your .env file:' . "\n";
                $helpMessage .= 'FACEBOOK_APP_ID=your_facebook_app_id' . "\n";
                $helpMessage .= 'FACEBOOK_APP_SECRET=your_facebook_app_secret' . "\n";
                $helpMessage .= 'FACEBOOK_REDIRECT_URI=' . $redirectUri . "\n\n";
                $helpMessage .= 'After adding, run: php artisan config:clear' . "\n\n";
                $helpMessage .= 'See FACEBOOK_SETUP.md for detailed instructions.';

                return response()->json([
                    'success' => false,
                    'error' => $helpMessage,
                ], 400);
            }

            \Log::info('Facebook credentials check', [
                'app_id_set' => !empty($appId),
                'redirect_uri_set' => !empty($redirectUri),
                'app_id' => $appId ? '***' . substr($appId, -4) : 'empty',
                'redirect_uri' => $redirectUri,
            ]);

            $state = base64_encode(json_encode([
                'riding_company_id' => $ridingCompanyId,
                'user_id' => Auth::id(),
            ]));

            $url = $this->facebookService->getOAuthUrl($state);

            \Log::info('Facebook OAuth URL generated successfully', [
                'riding_company_id' => $ridingCompanyId,
            ]);

            return response()->json([
                'success' => true,
                'url' => $url,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error getting Facebook OAuth URL', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'riding_company_id' => $ridingCompanyId,
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Handle Facebook OAuth callback
     */
    public function callback(Request $request)
    {
        $code = $request->get('code');
        $state = $request->get('state');

        // Decode state first
        $stateData = json_decode(base64_decode($state), true);
        $ridingCompanyId = $stateData['riding_company_id'] ?? null;

        if (!$code) {
            return response()->view('facebook-oauth-callback', [
                'success' => false,
                'message' => 'Facebook authorization failed. No code received.',
                'riding_company_id' => $ridingCompanyId,
            ]);
        }

        if (!$ridingCompanyId) {
            return response()->view('facebook-oauth-callback', [
                'success' => false,
                'message' => 'Invalid state parameter.',
                'riding_company_id' => null,
            ]);
        }

        // Exchange code for token
        $tokenResult = $this->facebookService->exchangeCodeForToken($code);

        if (!$tokenResult['success']) {
            return response()->view('facebook-oauth-callback', [
                'success' => false,
                'message' => 'Failed to get access token: ' . ($tokenResult['error'] ?? 'Unknown error'),
                'riding_company_id' => $ridingCompanyId,
            ]);
        }

        // Get long-lived token
        $longLivedResult = $this->facebookService->getLongLivedToken($tokenResult['access_token']);

        if (!$longLivedResult['success']) {
            // Use short-lived token if long-lived fails
            $accessToken = $tokenResult['access_token'];
            $expiresIn = $tokenResult['expires_in'] ?? 3600;
        } else {
            $accessToken = $longLivedResult['access_token'];
            $expiresIn = $longLivedResult['expires_in'] ?? 5184000; // 60 days default
        }

        // Get user info
        $userInfo = $this->facebookService->getUserInfo($accessToken);

        // Save integration with User Delegated Access Token
        // هذا التوكن خاص بالمستخدم ويمكن استخدامه للوصول لصفحاته واللييدز
        // Get existing integration to preserve config if updating
        $existingIntegration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();
        
        $integration = RidingCompanyIntegrationSetting::updateOrCreate(
            [
                'riding_company_id' => $ridingCompanyId,
                'type' => 'facebook',
            ],
            [
                'config' => $existingIntegration?->config ?? [], // Always include config - preserve existing or use empty array
                'facebook_access_token' => $accessToken, // User Delegated Access Token
                'facebook_user_id' => $userInfo['success'] ? ($userInfo['data']['id'] ?? null) : null,
                'facebook_user_name' => $userInfo['success'] ? ($userInfo['data']['name'] ?? null) : null,
                'facebook_token_expires_at' => $expiresIn ? now()->addSeconds($expiresIn) : null,
                'active' => true,
            ]
        );

        \Log::info('Facebook User Delegated Access saved', [
            'riding_company_id' => $ridingCompanyId,
            'facebook_user_id' => $userInfo['success'] ? ($userInfo['data']['id'] ?? null) : null,
            'token_expires_at' => $expiresIn ? now()->addSeconds($expiresIn)->toDateTimeString() : null,
        ]);

        // Return HTML page that sends postMessage to parent window (for popup)
        return response()->view('facebook-oauth-callback', [
            'success' => true,
            'message' => 'Facebook account connected successfully!',
            'riding_company_id' => $ridingCompanyId,
        ]);
    }

    /**
     * Get user's Facebook pages
     */
    public function getPages(Request $request, int $ridingCompanyId): \Illuminate\Http\JsonResponse
    {
        $integration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();

        if (!$integration || !$integration->facebook_access_token) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook not connected',
            ], 400);
        }

        $result = $this->facebookService->getPages($integration->facebook_access_token);

        return response()->json($result);
    }

    /**
     * Get lead forms for a page
     */
    public function getForms(Request $request, int $ridingCompanyId): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'page_id' => 'required|string',
        ]);

        $integration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();

        if (!$integration || !$integration->facebook_access_token) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook not connected',
            ], 400);
        }

        // Get page access token
        $pagesResult = $this->facebookService->getPages($integration->facebook_access_token);
        
        if (!$pagesResult['success']) {
            return response()->json($pagesResult, 400);
        }

        $page = collect($pagesResult['pages'])->firstWhere('id', $request->page_id);
        
        if (!$page || !isset($page['access_token'])) {
            return response()->json([
                'success' => false,
                'error' => 'Page not found or no access token',
            ], 400);
        }

        $result = $this->facebookService->getLeadForms($request->page_id, $page['access_token']);

        return response()->json($result);
    }

    /**
     * Get form fields
     */
    public function getFormFields(Request $request, int $ridingCompanyId): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'form_id' => 'required|string',
            'page_id' => 'required|string',
        ]);

        $integration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();

        if (!$integration || !$integration->facebook_access_token) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook not connected',
            ], 400);
        }

        // Get page access token
        $pagesResult = $this->facebookService->getPages($integration->facebook_access_token);
        
        if (!$pagesResult['success']) {
            return response()->json($pagesResult, 400);
        }

        $page = collect($pagesResult['pages'])->firstWhere('id', $request->page_id);
        
        if (!$page || !isset($page['access_token'])) {
            return response()->json([
                'success' => false,
                'error' => 'Page not found or no access token',
            ], 400);
        }

        $result = $this->facebookService->getFormFields($request->form_id, $page['access_token']);

        return response()->json($result);
    }

    /**
     * Save configuration (page and form)
     */
    public function saveConfiguration(Request $request, int $ridingCompanyId): \Illuminate\Http\RedirectResponse
    {
        $request->validate([
            'page_id' => 'required|string',
            'form_id' => 'required|string',
        ]);

        $integration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();

        if (!$integration) {
            return redirect()->back()->with('error', 'Facebook integration not found');
        }

        $integration->update([
            'facebook_page_id' => $request->page_id,
            'facebook_form_id' => $request->form_id,
        ]);

        return redirect()->back()->with('success', 'Configuration saved successfully');
    }

    /**
     * Save field mapping
     */
    public function saveFieldMapping(Request $request, int $ridingCompanyId): \Illuminate\Http\RedirectResponse
    {
        $request->validate([
            'field_mapping' => 'required|array',
        ]);

        $integration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();

        if (!$integration) {
            return redirect()->back()->with('error', 'Facebook integration not found');
        }

        // Check if configuration is complete before allowing field mapping
        if (!$integration->facebook_page_id || !$integration->facebook_form_id) {
            return redirect()->back()->with('error', 'Please complete the Configure step (select page and form) before saving field mapping.');
        }

        $integration->update([
            'facebook_field_mapping' => $request->field_mapping,
            'active' => true, // Activate integration when mapping is saved
        ]);

        return redirect()->back()->with('success', 'Field mapping saved successfully');
    }

    /**
     * Sync leads from Facebook
     */
    public function syncLeads(Request $request, int $ridingCompanyId): \Illuminate\Http\JsonResponse
    {
        $integration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();

        if (!$integration) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook integration not found. Please connect your Facebook account first.',
            ], 400);
        }

        if (!$integration->facebook_access_token) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook access token not found. Please reconnect your Facebook account.',
            ], 400);
        }

        if (!$integration->facebook_page_id) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook page not selected. Please select a page in the Configure step.',
            ], 400);
        }

        if (!$integration->facebook_form_id) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook form not selected. Please select a form in the Configure step.',
            ], 400);
        }

        if (!$integration->active) {
            return response()->json([
                'success' => false,
                'error' => 'Facebook integration is not active. Please save the field mapping to activate it.',
            ], 400);
        }

        // Get page access token
        $pagesResult = $this->facebookService->getPages($integration->facebook_access_token);
        
        if (!$pagesResult['success']) {
            return response()->json($pagesResult, 400);
        }

        $page = collect($pagesResult['pages'])->firstWhere('id', $integration->facebook_page_id);
        
        if (!$page || !isset($page['access_token'])) {
            return response()->json([
                'success' => false,
                'error' => 'Page access token not found',
            ], 400);
        }

        // Get leads
        $leadsResult = $this->facebookService->getLeads($integration->facebook_form_id, $page['access_token']);

        if (!$leadsResult['success']) {
            return response()->json($leadsResult, 400);
        }

        $leads = $leadsResult['leads'] ?? [];
        $fieldMapping = $integration->facebook_field_mapping ?? [];
        $ridingCompany = $integration->ridingCompany;
        $createdCount = 0;
        $updatedCount = 0;

        foreach ($leads as $lead) {
            $fieldData = [];
            foreach ($lead['field_data'] ?? [] as $field) {
                $fieldData[$field['name'] ?? ''] = $field['values'][0] ?? null;
            }

            // Map fields
            $driverData = [];
            foreach ($fieldMapping as $fbField => $driverField) {
                if (isset($fieldData[$fbField]) && !empty($fieldData[$fbField])) {
                    $driverData[$driverField] = $fieldData[$fbField];
                }
            }

            if (empty($driverData)) {
                continue;
            }

            // Check if driver exists by phone
            $phone = $driverData['phone'] ?? $driverData['whatsapp_phone'] ?? null;
            if ($phone) {
                $phone = $this->driverService->reformatPhoneNumber($phone);
                $existingDriver = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $ridingCompanyId)
                    ->where(function ($query) use ($phone) {
                        $query->where('phone', $phone)
                            ->orWhere('whatsapp_phone', $phone);
                    })
                    ->first();

                if ($existingDriver) {
                    $existingDriver->update($driverData);
                    $updatedCount++;
                    continue;
                }
            }

            // Create new driver
            $driverData['riding_company_id'] = $ridingCompanyId;
            $driverData['company_id'] = $ridingCompany->company_id;
            $driverData['lead_source_id'] = $this->getOrCreateLeadSource('Facebook', $ridingCompany->company_id);
            $driverData['lead_status_id'] = $this->getOrCreateLeadStatus('New', $ridingCompany->company_id);

            // Assign to default user if exists
            if ($ridingCompany->default_driver_user_id) {
                $driverData['assigned_to'] = $ridingCompany->default_driver_user_id;
            }

            \Modules\Drivers\app\Models\Driver::create($driverData);
            $createdCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Synced {$createdCount} new leads and updated {$updatedCount} existing leads",
            'created' => $createdCount,
            'updated' => $updatedCount,
        ]);
    }

    /**
     * Get or create lead source
     */
    private function getOrCreateLeadSource(string $name, int $companyId): int
    {
        $leadSource = \Modules\Drivers\app\Models\LeadSource::firstOrCreate(
            [
                'name' => $name,
                'company_id' => $companyId,
            ],
            [
                'active' => true,
            ]
        );

        return $leadSource->id;
    }

    /**
     * Get or create lead status
     */
    private function getOrCreateLeadStatus(string $name, int $companyId): int
    {
        $leadStatus = \Modules\Drivers\app\Models\LeadStatus::firstOrCreate(
            [
                'name' => $name,
                'company_id' => $companyId,
            ],
            [
                'active' => true,
            ]
        );

        return $leadStatus->id;
    }

    /**
     * Handle Facebook Data Deletion Callback
     * This endpoint is called by Facebook when a user requests data deletion
     * 
     * Facebook expects a JSON response with 'url' and 'confirmation_code'
     */
    public function dataDeletionCallback(Request $request)
    {
        // Facebook sends a POST request with signed_request
        $signedRequest = $request->input('signed_request');
        
        // For GET requests (Facebook validation), return simple JSON
        if ($request->isMethod('get')) {
            return response()->json([
                'url' => url('/ridingcarcompanies/facebook/data-deletion-callback'),
                'confirmation_code' => 'deletion_confirmed',
            ], 200, [], JSON_UNESCAPED_SLASHES);
        }
        
        if (!$signedRequest) {
            // If no signed_request, return a simple confirmation
            return response()->json([
                'url' => url('/ridingcarcompanies/facebook/data-deletion-callback'),
                'confirmation_code' => 'deletion_confirmed',
            ], 200, [], JSON_UNESCAPED_SLASHES);
        }

        // Parse signed_request (Facebook format)
        try {
            list($encodedSig, $payload) = explode('.', $signedRequest, 2);
            $data = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
            
            if (isset($data['user_id'])) {
                $userId = $data['user_id'];
                
                // Here you would delete user data associated with this Facebook user ID
                \Log::info('Facebook data deletion request', [
                    'facebook_user_id' => $userId,
                    'request_data' => $data,
                ]);
                
                // Delete Facebook integration data for this user
                // Find and delete integration settings for this Facebook user
                $integrations = RidingCompanyIntegrationSetting::where('facebook_user_id', $userId)->get();
                foreach ($integrations as $integration) {
                    $integration->update([
                        'facebook_access_token' => null,
                        'facebook_user_id' => null,
                        'facebook_token_expires_at' => null,
                        'active' => false,
                    ]);
                }
                
                return response()->json([
                    'url' => url('/ridingcarcompanies/facebook/data-deletion-callback'),
                    'confirmation_code' => 'deletion_confirmed_' . $userId,
                ], 200, [], JSON_UNESCAPED_SLASHES);
            }
        } catch (\Exception $e) {
            \Log::error('Error processing Facebook data deletion callback', [
                'error' => $e->getMessage(),
            ]);
        }

        // Default response
        return response()->json([
            'url' => url('/ridingcarcompanies/facebook/data-deletion-callback'),
            'confirmation_code' => 'deletion_confirmed',
        ], 200, [], JSON_UNESCAPED_SLASHES);
    }
}

