<?php

namespace Modules\RidingCarCompanies\app\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FacebookService
{
    private ?string $appId;
    private ?string $appSecret;
    private ?string $redirectUri;

    public function __construct()
    {
        // Try config first, then env, with fallbacks
        $this->appId = config('services.facebook.app_id');
        if (empty($this->appId)) {
            $this->appId = env('FACEBOOK_APP_ID', '');
        }
        
        $this->appSecret = config('services.facebook.app_secret');
        if (empty($this->appSecret)) {
            $this->appSecret = env('FACEBOOK_APP_SECRET', '');
        }
        
        $this->redirectUri = config('services.facebook.redirect_uri');
        if (empty($this->redirectUri)) {
            $this->redirectUri = env('FACEBOOK_REDIRECT_URI');
        }
        
        // If still empty, construct from APP_URL
        if (empty($this->redirectUri)) {
            $appUrl = env('APP_URL', 'http://127.0.0.1:8000');
            $this->redirectUri = rtrim($appUrl, '/') . '/ridingcarcompanies/facebook/callback';
        }
    }

    /**
     * Get Facebook OAuth URL
     */
    public function getOAuthUrl(string $state = null): string
    {
        if (empty($this->appId) || empty($this->redirectUri)) {
            throw new \Exception('Facebook App ID and Redirect URI must be configured. Please set FACEBOOK_APP_ID and FACEBOOK_REDIRECT_URI in your .env file.');
        }

        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $this->redirectUri,
            'state' => $state ?? bin2hex(random_bytes(16)),
            // User Delegated Access - المستخدم يوافق على إعطاء صلاحيات لصفحاته
            // Updated to use valid Facebook permissions (manage_pages and read_insights are deprecated)
            // Note: Some permissions may require App Review for production use
            // ads_read is needed to access ad accounts and campaigns, but requires App Review
            'scope' => 'pages_show_list,pages_read_engagement,leads_retrieval,ads_read',
            'response_type' => 'code',
            'auth_type' => 'rerequest', // لإعادة طلب الصلاحيات إذا لزم الأمر
        ];

        return 'https://www.facebook.com/v18.0/dialog/oauth?' . http_build_query($params);
    }

    /**
     * Exchange authorization code for access token
     */
    public function exchangeCodeForToken(string $code): array
    {
        try {
            $response = Http::get('https://graph.facebook.com/v18.0/oauth/access_token', [
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'redirect_uri' => $this->redirectUri,
                'code' => $code,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'access_token' => $data['access_token'] ?? null,
                    'token_type' => $data['token_type'] ?? 'bearer',
                    'expires_in' => $data['expires_in'] ?? null,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to exchange code for token',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook OAuth error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get long-lived access token
     */
    public function getLongLivedToken(string $shortLivedToken): array
    {
        try {
            $response = Http::get('https://graph.facebook.com/v18.0/oauth/access_token', [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'fb_exchange_token' => $shortLivedToken,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'access_token' => $data['access_token'] ?? null,
                    'expires_in' => $data['expires_in'] ?? null,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get long-lived token',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook long-lived token error', [
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get user info
     */
    public function getUserInfo(string $accessToken): array
    {
        try {
            $response = Http::get('https://graph.facebook.com/v18.0/me', [
                'access_token' => $accessToken,
                'fields' => 'id,name,email',
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get user info',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get user's pages
     */
    public function getPages(string $accessToken): array
    {
        try {
            $response = Http::get('https://graph.facebook.com/v18.0/me/accounts', [
                'access_token' => $accessToken,
                'fields' => 'id,name,access_token,category',
            ]);

            if ($response->successful()) {
                $pages = $response->json('data', []);
                return [
                    'success' => true,
                    'pages' => $pages,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get pages',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook get pages error', [
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get lead forms for a page
     */
    public function getLeadForms(string $pageId, string $pageAccessToken): array
    {
        try {
            $response = Http::get("https://graph.facebook.com/v18.0/{$pageId}/leadgen_forms", [
                'access_token' => $pageAccessToken,
                'fields' => 'id,name,status,leads_count,created_time',
            ]);

            if ($response->successful()) {
                $forms = $response->json('data', []);
                return [
                    'success' => true,
                    'forms' => $forms,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get lead forms',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook get lead forms error', [
                'error' => $e->getMessage(),
                'page_id' => $pageId,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get ad account for a page
     * Gets ad accounts associated with the page using user access token
     */
    public function getAdAccount(string $pageId, string $userAccessToken, ?string $pageAccessToken = null): array
    {
        try {
            // Method 1: Try to get ad accounts directly from the page (using page token if available)
            if ($pageAccessToken) {
                $response = Http::get("https://graph.facebook.com/v18.0/{$pageId}", [
                    'access_token' => $pageAccessToken,
                    'fields' => 'ad_accounts{id,name,account_id}',
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $adAccounts = $data['ad_accounts']['data'] ?? [];
                    
                    if (!empty($adAccounts)) {
                        // Return the first ad account
                        $adAccount = $adAccounts[0];
                        return [
                            'success' => true,
                            'ad_account_id' => $adAccount['id'] ?? null,
                            'ad_account_name' => $adAccount['name'] ?? null,
                        ];
                    }
                }
            }

            // Method 2: Get all user's ad accounts using user access token
            $response = Http::get('https://graph.facebook.com/v18.0/me/adaccounts', [
                'access_token' => $userAccessToken,
                'fields' => 'id,name,account_id',
            ]);

            if ($response->successful()) {
                $adAccounts = $response->json('data', []);
                
                if (!empty($adAccounts)) {
                    // Try to find ad account that has the page
                    foreach ($adAccounts as $adAccount) {
                        $adAccountId = $adAccount['id'] ?? null;
                        if ($adAccountId) {
                            // Check if this ad account has the page
                            try {
                                $pagesResponse = Http::get("https://graph.facebook.com/v18.0/{$adAccountId}/pages", [
                                    'access_token' => $userAccessToken,
                                    'fields' => 'id',
                                ]);

                                if ($pagesResponse->successful()) {
                                    $pages = $pagesResponse->json('data', []);
                                    $hasPage = collect($pages)->contains('id', $pageId);
                                    
                                    if ($hasPage) {
                                        return [
                                            'success' => true,
                                            'ad_account_id' => $adAccountId,
                                            'ad_account_name' => $adAccount['name'] ?? null,
                                        ];
                                    }
                                }
                            } catch (\Exception $e) {
                                // Continue to next ad account if this one fails
                                continue;
                            }
                        }
                    }

                    // If no ad account has the page, return the first ad account anyway
                    // (user might want to use it for campaigns)
                    $firstAccount = $adAccounts[0];
                    return [
                        'success' => true,
                        'ad_account_id' => $firstAccount['id'] ?? null,
                        'ad_account_name' => $firstAccount['name'] ?? null,
                    ];
                }
            } else {
                // Check if it's a permission error
                $errorData = $response->json();
                $errorMessage = $errorData['error']['message'] ?? 'Unknown error';
                $errorCode = $errorData['error']['code'] ?? null;
                
                // If it's a permission error, provide helpful message
                if (str_contains($errorMessage, 'permission') || str_contains($errorMessage, 'access') || $errorCode == 200) {
                    return [
                        'success' => false,
                        'error' => 'Unable to access ad accounts. The "ads_read" permission may require Facebook App Review. Please ensure your Facebook App has the necessary permissions approved, or contact your administrator.',
                    ];
                }
            }

            return [
                'success' => false,
                'error' => 'No ad accounts found. Please ensure your Facebook account has ad accounts and the necessary permissions (ads_read). Note: This permission may require Facebook App Review.',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook get ad account error', [
                'error' => $e->getMessage(),
                'page_id' => $pageId,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get campaigns for an ad account
     */
    public function getCampaigns(string $adAccountId, string $accessToken): array
    {
        try {
            $response = Http::get("https://graph.facebook.com/v18.0/{$adAccountId}/campaigns", [
                'access_token' => $accessToken,
                'fields' => 'id,name,status,objective,created_time',
                'effective_status' => ['ACTIVE', 'PAUSED'],
            ]);

            if ($response->successful()) {
                $campaigns = $response->json('data', []);
                return [
                    'success' => true,
                    'campaigns' => $campaigns,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get campaigns',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook get campaigns error', [
                'error' => $e->getMessage(),
                'ad_account_id' => $adAccountId,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get lead forms for a campaign
     */
    public function getLeadFormsByCampaign(string $campaignId, string $pageAccessToken): array
    {
        try {
            $response = Http::get("https://graph.facebook.com/v18.0/{$campaignId}/leadgen_forms", [
                'access_token' => $pageAccessToken,
                'fields' => 'id,name,status,leads_count,created_time',
            ]);

            if ($response->successful()) {
                $forms = $response->json('data', []);
                return [
                    'success' => true,
                    'forms' => $forms,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get lead forms for campaign',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook get lead forms by campaign error', [
                'error' => $e->getMessage(),
                'campaign_id' => $campaignId,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get form fields
     */
    public function getFormFields(string $formId, string $pageAccessToken): array
    {
        try {
            $response = Http::get("https://graph.facebook.com/v18.0/{$formId}", [
                'access_token' => $pageAccessToken,
                'fields' => 'id,name,questions',
            ]);

            if ($response->successful()) {
                $form = $response->json();
                $questions = $form['questions'] ?? [];
                
                // Extract field names from questions
                $fields = [];
                foreach ($questions as $question) {
                    $fields[] = [
                        'key' => $question['key'] ?? null,
                        'label' => $question['label'] ?? null,
                        'type' => $question['type'] ?? 'text',
                    ];
                }

                return [
                    'success' => true,
                    'fields' => $fields,
                    'form_name' => $form['name'] ?? null,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get form fields',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook get form fields error', [
                'error' => $e->getMessage(),
                'form_id' => $formId,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get leads from a form
     */
    public function getLeads(string $formId, string $pageAccessToken, ?string $after = null): array
    {
        try {
            $params = [
                'access_token' => $pageAccessToken,
                'fields' => 'id,created_time,field_data',
            ];

            if ($after) {
                $params['after'] = $after;
            }

            $response = Http::get("https://graph.facebook.com/v18.0/{$formId}/leads", $params);

            if ($response->successful()) {
                $data = $response->json();
                $leads = $data['data'] ?? [];
                $paging = $data['paging'] ?? null;

                return [
                    'success' => true,
                    'leads' => $leads,
                    'next_cursor' => $paging['cursors']['after'] ?? null,
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to get leads',
            ];
        } catch (\Exception $e) {
            Log::error('Facebook get leads error', [
                'error' => $e->getMessage(),
                'form_id' => $formId,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Validate access token
     */
    public function validateToken(string $accessToken): bool
    {
        try {
            $response = Http::get('https://graph.facebook.com/v18.0/me', [
                'access_token' => $accessToken,
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }
}

