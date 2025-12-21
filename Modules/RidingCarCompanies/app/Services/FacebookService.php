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
            'scope' => 'pages_show_list,pages_read_engagement,leads_retrieval',
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

