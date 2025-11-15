<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

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

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
            ],
            'navigation' => $user ? $this->getNavigationItems($user) : [],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'info' => $request->session()->get('info'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
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

        // Core Module - Only show Companies for Super Admin
        // Roles, Users, and Hierarchy are now accessed from the Company view
        if ($user->isSuperAdmin()) {
            $navigation[] = [
                'title' => 'Companies',
                'href' => '/core/companies',
                'icon' => 'Building2',
            ];
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
            if ($user->hasPermissionTo('marketing.marketing_lists.read') || $user->isSuperAdmin()) {
                $marketingItems[] = [
                    'title' => 'Marketing Lists',
                    'href' => '/marketing/marketing-lists',
                    'icon' => 'Users',
                ];
            }

            // Templates
            if ($user->hasPermissionTo('marketing.marketing_templates.read') || $user->isSuperAdmin()) {
                $marketingItems[] = [
                    'title' => 'Templates',
                    'href' => '/marketing/templates',
                    'icon' => 'FileText',
                ];
            }

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

        // Riding Car Companies Module
        if ($user->canAccessModule('ridingcarcompanies') || $user->isSuperAdmin()) {
            $ridingCarItems = [];

            // Riding Companies
            if ($user->hasPermissionTo('ridingcarcompanies.ridingcompanies.read') || $user->isSuperAdmin()) {
                $ridingCarItems[] = [
                    'title' => 'Riding Companies',
                    'href' => '/ridingcarcompanies/riding-companies',
                    'icon' => 'Car',
                ];
            }

            // Company Rides
            if ($user->hasPermissionTo('ridingcarcompanies.companyrides.read') || $user->isSuperAdmin()) {
                $ridingCarItems[] = [
                    'title' => 'Company Rides',
                    'href' => '/ridingcarcompanies/company-rides',
                    'icon' => 'Navigation',
                ];
            }

            // Only add Riding Car Companies group if there are items
            if (! empty($ridingCarItems)) {
                $navigation[] = [
                    'title' => 'Riding Car Companies',
                    'icon' => 'Car',
                    'items' => $ridingCarItems,
                ];
            }
        }

        return $navigation;
    }
}
