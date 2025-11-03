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

        // Core Module
        $coreItems = [];

        // Companies (Super Admin Only)
        if ($user->isSuperAdmin()) {
            $coreItems[] = [
                'title' => 'Companies',
                'href' => '/core/companies',
                'icon' => 'Building2',
            ];
        }

        // Roles (if user has access)
        if ($user->isSuperAdmin() || $user->isCompanyAdmin() || $user->can('core.roles.read')) {
            $coreItems[] = [
                'title' => 'Roles',
                'href' => '/core/roles',
                'icon' => 'ShieldCheck',
            ];

            $coreItems[] = [
                'title' => 'Role Hierarchy',
                'href' => '/core/roles/hierarchy',
                'icon' => 'Network',
            ];
        }

        // Users (if user has access)
        if ($user->isSuperAdmin() || $user->isCompanyAdmin() || $user->can('core.users.read')) {
            $coreItems[] = [
                'title' => 'Users',
                'href' => '/core/users',
                'icon' => 'Users',
            ];
        }

        if (! empty($coreItems)) {
            $navigation[] = [
                'title' => 'Core',
                'items' => $coreItems,
            ];
        }

        return $navigation;
    }
}
