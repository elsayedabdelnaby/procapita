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

        return parent::shouldHandle($request);
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
            $selectedCompanyId = $request->session()->get('selected_company_id');
            if ($selectedCompanyId) {
                $selectedCompany = \Modules\Core\app\Models\Company::find($selectedCompanyId);
            }
            $companies = \Modules\Core\app\Models\Company::active()->orderBy('name')->get(['id', 'name']);
        }

        // Load user permissions if user exists
        if ($user) {
            $user->load('permissions');
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
                    'permissions' => $user->permissions->map(fn($p) => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'module_name' => $p->module_name,
                        'entity_name' => $p->entity_name,
                        'action' => $p->action,
                    ])->toArray(),
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
            ] : null,
            'companies' => $companies->map(fn($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
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
        ];

        // Core Module - Companies group for Super Admin
        // Roles, Users, and Hierarchy are now accessed from the Company view
        if ($user->isSuperAdmin()) {
            $coreItems = [];
            
            $coreItems[] = [
                'title' => 'Companies',
                'href' => '/core/companies',
                'icon' => 'Building2',
            ];
            
            // Lead Sources - accessible to super admin
            if ($user->hasPermissionTo('drivers.leadsources.read') || $user->isSuperAdmin()) {
                $coreItems[] = [
                    'title' => 'Lead Sources',
                    'href' => '/drivers/lead-sources',
                    'icon' => 'Target',
                ];
            }
            
            // Lead Statuses - accessible to super admin
            if ($user->hasPermissionTo('drivers.leadstatuses.read') || $user->isSuperAdmin()) {
                $coreItems[] = [
                    'title' => 'Lead Statuses',
                    'href' => '/drivers/lead-statuses',
                    'icon' => 'Flag',
                ];
            }
            
            // Riding Companies - accessible to super admin
            if ($user->hasPermissionTo('ridingcarcompanies.ridingcompanies.read') || $user->isSuperAdmin()) {
                $coreItems[] = [
                    'title' => 'Riding Companies',
                    'href' => '/ridingcarcompanies/riding-companies',
                    'icon' => 'Car',
                ];
            }
            
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
            if ($user->hasPermissionTo('marketing.campaigns.read') || $user->isSuperAdmin()) {
                $marketingItems[] = [
                    'title' => 'Campaigns',
                    'href' => '/marketing/campaigns',
                    'icon' => 'Megaphone',
                ];
            }

            // Marketing Lists
            // if ($user->hasPermissionTo('marketing.marketing_lists.read') || $user->isSuperAdmin()) {
            //     $marketingItems[] = [
            //         'title' => 'Marketing Lists',
            //         'href' => '/marketing/marketing-lists',
            //         'icon' => 'Users',
            //     ];
            // }

            // Templates
            // if ($user->hasPermissionTo('marketing.marketing_templates.read') || $user->isSuperAdmin()) {
            //     $marketingItems[] = [
            //         'title' => 'Templates',
            //         'href' => '/marketing/templates',
            //         'icon' => 'FileText',
            //     ];
            // }

            // Settings submenu (with permission checks)
            if ($user->hasPermissionTo('marketing.campaign_types.read') || $user->isSuperAdmin()) {
                $marketingItems[] = [
                    'title' => 'Campaign Types',
                    'href' => '/marketing/campaign-types',
                    'icon' => 'Tag',
                ];
            }
            
            if ($user->hasPermissionTo('marketing.campaign_statuses.read') || $user->isSuperAdmin()) {
                $marketingItems[] = [
                    'title' => 'Campaign Statuses',
                    'href' => '/marketing/campaign-statuses',
                    'icon' => 'Flag',
                ];
            }
            
            if ($user->hasPermissionTo('marketing.campaign_channels.read') || $user->isSuperAdmin()) {
                $marketingItems[] = [
                    'title' => 'Campaign Channels',
                    'href' => '/marketing/campaign-channels',
                    'icon' => 'Radio',
                ];
            }

            // Only add Marketing group if there are items
            if (! empty($marketingItems)) {
                $navigation[] = [
                    'title' => 'Marketing',
                    'icon' => 'TrendingUp',
                    'items' => $marketingItems,
                ];
            }
        }

        // Riding Car Companies Module - Only for non-super admin users
        // Super admin sees Riding Companies under Core group
        if (! $user->isSuperAdmin() && ($user->canAccessModule('ridingcarcompanies') || $user->isSuperAdmin())) {
            $ridingCarItems = [];

            // Riding Companies
            if ($user->hasPermissionTo('ridingcarcompanies.ridingcompanies.read') || $user->isSuperAdmin()) {
                $ridingCarItems[] = [
                    'title' => 'Riding Companies',
                    'href' => '/ridingcarcompanies/riding-companies',
                    'icon' => 'Car',
                ];
            }

            // Only add Riding Car Companies group if there are items
            if (! empty($ridingCarItems)) {
                $navigation[] = [
                    'title' => 'Riding Companies',
                    'icon' => 'Car',
                    'items' => $ridingCarItems,
                ];
            }
        }

        // Drivers Module
        if ($user->canAccessModule('drivers') || $user->isSuperAdmin()) {
            $driversItems = [];

            // Drivers
            if ($user->hasPermissionTo('drivers.drivers.read') || $user->isSuperAdmin()) {
                $driversItems[] = [
                    'title' => 'Drivers',
                    'href' => '/drivers/drivers',
                    'icon' => 'User',
                ];
            }

            // Lead Sources - only show for non-super admin (super admin sees it under Core)
            if (! $user->isSuperAdmin() && ($user->hasPermissionTo('drivers.leadsources.read') || $user->isSuperAdmin())) {
                $driversItems[] = [
                    'title' => 'Lead Sources',
                    'href' => '/drivers/lead-sources',
                    'icon' => 'Target',
                ];
            }

            // Lead Statuses - only show for non-super admin (super admin sees it under Core)
            if (! $user->isSuperAdmin() && ($user->hasPermissionTo('drivers.leadstatuses.read') || $user->isSuperAdmin())) {
                $driversItems[] = [
                    'title' => 'Lead Statuses',
                    'href' => '/drivers/lead-statuses',
                    'icon' => 'Flag',
                ];
            }

            // Driver Stages
            if ($user->hasPermissionTo('drivers.driverstages.read') || $user->isSuperAdmin()) {
                $driversItems[] = [
                    'title' => 'Driver Stages',
                    'href' => '/drivers/driver-stages',
                    'icon' => 'ListChecks',
                ];
            }

            // Driver Documents
            if ($user->hasPermissionTo('drivers.driverdocuments.read') || $user->isSuperAdmin()) {
                $driversItems[] = [
                    'title' => 'Driver Documents',
                    'href' => '/drivers/driver-documents',
                    'icon' => 'FileText',
                ];
            }

            // Only add Drivers group if there are items
            if (! empty($driversItems)) {
                $navigation[] = [
                    'title' => 'Drivers',
                    'icon' => 'Users',
                    'items' => $driversItems,
                ];
            }
        }

        return $navigation;
    }
}
