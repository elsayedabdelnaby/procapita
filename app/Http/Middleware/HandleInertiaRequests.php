<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip Inertia completely for export routes
        if ($this->isExportRoute($request)) {
            // Remove Inertia headers from request to prevent processing
            $request->headers->remove('X-Inertia');
            $request->headers->remove('X-Inertia-Version');
            $request->headers->remove('X-Requested-With');

            $response = $next($request);

            // Ensure response headers are correct for file download
            if ($response instanceof \Symfony\Component\HttpFoundation\StreamedResponse) {
                $response->headers->remove('X-Inertia');
                $response->headers->set('X-Inertia', 'false');
                $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
                $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
                $response->headers->set('Pragma', 'no-cache');
                $response->headers->set('Expires', '0');
            }

            return $response;
        }

        return parent::handle($request, $next);
    }

    /**
     * Determine if Inertia should handle the request.
     */
    public function shouldHandle(Request $request): bool
    {
        // Skip Inertia for export routes
        if ($this->isExportRoute($request)) {
            return false;
        }

        // Default to true - parent class handles Inertia detection
        return true;
    }

    /**
     * Check if the request is for an export route.
     */
    protected function isExportRoute(Request $request): bool
    {
        // Check route name first (most reliable)
        $route = $request->route();
        $routeName = $route?->getName() ?? '';

        if (str_ends_with($routeName, '.export') || str_contains($routeName, '.import.download')) {
            return true;
        }

        // Check route name pattern
        if ($request->routeIs('*.export') || $request->routeIs('*.import.download')) {
            return true;
        }

        // Check if path ends with /export
        $path = $request->path();
        if (str_ends_with($path, '/export')) {
            return true;
        }

        // Check if path contains /import/download
        if (str_contains($path, '/import/download/')) {
            return true;
        }

        // Check full URI
        $uri = $request->getRequestUri();
        $parsedUri = parse_url($uri, PHP_URL_PATH);
        if ($parsedUri) {
            if (str_ends_with($parsedUri, '/export')) {
                return true;
            }
            if (str_contains($parsedUri, '/import/download/')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();

        // Get selected company for super admin
        $selectedCompany = null;
        $companies = collect([]);

        if ($user && $user->isSuperAdmin()) {
            $companies = \Modules\Core\app\Models\Company::active()->orderBy('name')->get(['id', 'name', 'logo']);
            
            $selectedCompanyId = $request->session()->get('selected_company_id');
            if ($selectedCompanyId) {
                $selectedCompany = \Modules\Core\app\Models\Company::find($selectedCompanyId);
                // If selected company doesn't exist or is not active, clear it
                if (! $selectedCompany || ! $selectedCompany->is_active) {
                    $selectedCompany = null;
                    $request->session()->forget('selected_company_id');
                }
            }
            
            // If no company is selected, try to select one
            if (! $selectedCompany) {
                if ($companies->isNotEmpty()) {
                    // Select the first active company
                    $selectedCompany = $companies->first();
                    $request->session()->put('selected_company_id', $selectedCompany->id);
                }
            }
        }

        // Load user permissions if user exists (both direct and through roles)
        $allPermissions = collect([]);
        if ($user) {
            // Set team context for proper permission loading
            if ($user->company_id) {
                setPermissionsTeamId($user->company_id);
            }

            // Load permissions through roles and direct permissions
            $user->load(['roles.permissions', 'permissions', 'company']);

            // Get all permissions (from roles + direct)
            $allPermissions = $user->getAllPermissions();
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'is_super_admin' => $user->is_super_admin ?? false,
                    'is_company_admin' => $user->is_company_admin ?? false,
                    'company_id' => $user->company_id,
                    'company' => $user->company ? [
                        'id' => $user->company->id,
                        'name' => $user->company->name,
                        'logo' => $user->company->logo,
                        'logo_url' => $user->company->logo_url,
                    ] : null,
                    'permissions' => $allPermissions->map(fn ($p) => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'module_name' => $p->module_name,
                        'entity_name' => $p->entity_name,
                        'action' => $p->action,
                    ])->unique('id')->values()->toArray(),
                    'roles' => $user->roles ? $user->roles->map(fn ($role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                        'permissions' => $role->permissions ? $role->permissions->map(fn ($p) => [
                            'id' => $p->id,
                            'name' => $p->name,
                            'module_name' => $p->module_name,
                            'entity_name' => $p->entity_name,
                            'action' => $p->action,
                        ])->toArray() : [],
                    ])->toArray() : [],
                ] : null,
            ],
            'navigation' => $user ? $this->getNavigationItems($user) : [],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'info' => $request->session()->get('info'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'selectedCompany' => $selectedCompany ? [
                'id' => $selectedCompany->id,
                'name' => $selectedCompany->name,
                'slug' => $selectedCompany->slug,
                'logo' => $selectedCompany->logo,
                'logo_url' => $selectedCompany->logo_url,
            ] : null,
            'companies' => $companies->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'logo' => $c->logo,
                'logo_url' => $c->logo_url,
            ])->toArray(),
        ];
    }

    protected function getNavigationItems($user): array
    {
        $navigation = [];

        // Dashboard is always visible
        $navigation[] = [
            'title' => 'Dashboard',
            'href' => '/dashboard',
            'icon' => 'LayoutGrid',
            'permission_module' => null,
            'permission_entity' => null,
        ];

        // Core Module - Resellers (Companies) group for Super Admin
        // Roles, Users, and Hierarchy are now accessed from the Company view
        if ($user->isSuperAdmin()) {
            $coreItems = [];

            $coreItems[] = [
                'title' => 'Resellers',
                'href' => '/core/companies',
                'icon' => 'Building2',
                'permission_module' => 'core',
                'permission_entity' => 'companies',
            ];

            // Lead Sources - accessible to super admin
            $coreItems[] = [
                'title' => 'Lead Sources',
                'href' => '/drivers/lead-sources',
                'icon' => 'Target',
                'permission_module' => 'drivers',
                'permission_entity' => 'leadsources',
            ];

            // Lead Statuses - accessible to super admin
            $coreItems[] = [
                'title' => 'Lead Statuses',
                'href' => '/drivers/lead-statuses',
                'icon' => 'Flag',
                'permission_module' => 'drivers',
                'permission_entity' => 'leadstatuses',
            ];

            // Only add Core group if there are items
            if (! empty($coreItems)) {
                $navigation[] = [
                    'title' => 'Core',
                    'icon' => 'Building2',
                    'items' => $coreItems,
                ];
            }
        }

        // Marketing Module
        if ($user->canAccessModule('marketing') || $user->isSuperAdmin()) {
            $marketingItems = [];

            // Campaigns
            $marketingItems[] = [
                'title' => 'Campaigns',
                'href' => '/marketing/campaigns',
                'icon' => 'Megaphone',
                'permission_module' => 'marketing',
                'permission_entity' => 'campaigns',
            ];

            // Marketing Lists
            // $marketingItems[] = [
            //     'title' => 'Marketing Lists',
            //     'href' => '/marketing/marketing-lists',
            //     'icon' => 'Users',
            //     'permission_module' => 'marketing',
            //     'permission_entity' => 'marketing_lists',
            // ];

            // Templates
            // $marketingItems[] = [
            //     'title' => 'Templates',
            //     'href' => '/marketing/templates',
            //     'icon' => 'FileText',
            //     'permission_module' => 'marketing',
            //     'permission_entity' => 'marketing_templates',
            // ];

            // Settings submenu
            $marketingItems[] = [
                'title' => 'Campaign Types',
                'href' => '/marketing/campaign-types',
                'icon' => 'Tag',
                'permission_module' => 'marketing',
                'permission_entity' => 'campaign_types',
            ];

            $marketingItems[] = [
                'title' => 'Campaign Statuses',
                'href' => '/marketing/campaign-statuses',
                'icon' => 'Flag',
                'permission_module' => 'marketing',
                'permission_entity' => 'campaign_statuses',
            ];

            $marketingItems[] = [
                'title' => 'Campaign Channels',
                'href' => '/marketing/campaign-channels',
                'icon' => 'Radio',
                'permission_module' => 'marketing',
                'permission_entity' => 'campaign_channels',
            ];

            // Only add Marketing group if there are items
            if (! empty($marketingItems)) {
                $navigation[] = [
                    'title' => 'Marketing',
                    'icon' => 'TrendingUp',
                    'items' => $marketingItems,
                ];
            }
        }

        // Leads Module
        if ($user->canAccessModule('drivers') || $user->isSuperAdmin()) {
            $driversItems = [];

            // Leads
            $driversItems[] = [
                'title' => 'Leads',
                'href' => '/drivers/drivers',
                'icon' => 'User',
                'permission_module' => 'drivers',
                'permission_entity' => 'drivers',
            ];

            // Lead Sources - only show for non-super admin (super admin sees it under Core)
            if (! $user->isSuperAdmin()) {
                $driversItems[] = [
                    'title' => 'Lead Sources',
                    'href' => '/drivers/lead-sources',
                    'icon' => 'Target',
                    'permission_module' => 'drivers',
                    'permission_entity' => 'leadsources',
                ];
            }

            // Lead Statuses - only show for non-super admin (super admin sees it under Core)
            if (! $user->isSuperAdmin()) {
                $driversItems[] = [
                    'title' => 'Lead Statuses',
                    'href' => '/drivers/lead-statuses',
                    'icon' => 'Flag',
                    'permission_module' => 'drivers',
                    'permission_entity' => 'leadstatuses',
                ];
            }

            // Lead Stages
            $driversItems[] = [
                'title' => 'Lead Stages',
                'href' => '/drivers/lead-stages',
                'icon' => 'ArrowRightCircle',
                'permission_module' => 'drivers',
                'permission_entity' => 'leadstages',
            ];

            // Lead Documents
            $driversItems[] = [
                'title' => 'Lead Documents',
                'href' => '/drivers/driver-documents',
                'icon' => 'FileText',
                'permission_module' => 'drivers',
                'permission_entity' => 'driverdocuments',
            ];

            // Lead Follow-ups
            $driversItems[] = [
                'title' => 'Lead Follow-ups',
                'href' => '/drivers/driver-follow-ups',
                'icon' => 'History',
                'permission_module' => 'drivers',
                'permission_entity' => 'driverfollowups',
            ];

            // Only add Leads group if there are items
            if (! empty($driversItems)) {
                $navigation[] = [
                    'title' => 'Leads',
                    'icon' => 'Users',
                    'items' => $driversItems,
                ];
            }
        }

        // Reports Module - accessible to all authenticated users
        $navigation[] = [
            'title' => 'Reports',
            'href' => '/reports',
            'icon' => 'BarChart3',
            'permission_module' => null,
            'permission_entity' => null,
        ];

        // Recycle Bin Module - accessible to all authenticated users with permission
        if ($user && ($user->canAccessModule('recyclebin') || $user->isSuperAdmin() || $user->isCompanyAdmin())) {
            $navigation[] = [
                'title' => 'Recycle Bin',
                'href' => '/recyclebin',
                'icon' => 'Trash2',
                'permission_module' => 'recyclebin',
                'permission_entity' => 'recyclebin',
            ];
        }

        return $navigation;
    }
}
