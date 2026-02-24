<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\CompanyStoreRequest;
use Modules\Core\app\Http\Requests\CompanyUpdateRequest;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Role;
use Modules\Core\app\Services\CompanyService;
use Modules\Core\app\Services\RoleService;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompanyIntegrationSetting;

class CompanyController extends Controller
{
    public function __construct(
        protected CompanyService $companyService,
        protected RoleService $roleService
    ) {}

    public function index(): Response
    {
        $companies = $this->companyService->getAllCompanies();

        // Add riding companies count for each company
        $companiesWithCounts = $companies->map(function ($company) {
            $ridingCompaniesCount = 0;
            if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)
                && \Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
                $ridingCompaniesCount = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $company->id)->count();
            }

            return [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'email' => $company->email,
                'phone' => $company->phone,
                'address' => $company->address,
                'logo' => $company->logo,
                'logo_url' => $company->logo_url,
                'is_active' => $company->is_active,
                'settings' => $company->settings,
                'created_at' => $company->created_at?->toISOString(),
                'updated_at' => $company->updated_at?->toISOString(),
                'riding_companies_count' => $ridingCompaniesCount,
            ];
        });

        return Inertia::render('Core/Companies/Index', [
            'companies' => $companiesWithCounts,
        ]);
    }

    public function recycleBin(): Response
    {
        $companies = Company::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(function ($company) {
                $ridingCompaniesCount = 0;
                if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class) 
                    && \Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
                    $ridingCompaniesCount = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $company->id)->count();
                }

                return [
                    'id' => $company->id,
                    'name' => $company->name,
                    'slug' => $company->slug,
                    'email' => $company->email,
                    'phone' => $company->phone,
                    'address' => $company->address,
                    'logo' => $company->logo,
                    'logo_url' => $company->logo_url,
                    'is_active' => $company->is_active,
                    'settings' => $company->settings,
                    'created_at' => $company->created_at?->toISOString(),
                    'updated_at' => $company->updated_at?->toISOString(),
                    'deleted_at' => $company->deleted_at?->toISOString(),
                    'riding_companies_count' => $ridingCompaniesCount,
                ];
            });

        return Inertia::render('Core/Companies/RecycleBin', [
            'companies' => $companies,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Core/Companies/Create');
    }

    public function store(CompanyStoreRequest $request): RedirectResponse
    {
        try {
            $result = $this->companyService->createCompany($request->validated());

            $message = 'Company created successfully.';
            
            // If slug was duplicate, add warning message
            if ($result['slug_was_duplicate']) {
                $message = 'Company created successfully. The slug "' . $result['original_slug'] . '" was already taken, so it was automatically changed to "' . $result['new_slug'] . '".';
            }

            // Append reseller admin credentials (one-time display)
            if (! empty($result['reseller_admin_email']) && ! empty($result['reseller_admin_password'])) {
                $message .= ' Reseller admin user: ' . $result['reseller_admin_email'] . ' / Password: ' . $result['reseller_admin_password'] . ' (save this password; it will not be shown again).';
            }

            return redirect()
                ->route('core.companies.index')
                ->with('success', $message);
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $company = $this->companyService->getCompanyById($id);

        if (! $company) {
            abort(404, 'Company not found.');
        }

        // Company admin can only view their own company; super admin can view any
        $user = \Illuminate\Support\Facades\Auth::user();
        if ($user && ! $user->isSuperAdmin() && (int) $user->company_id !== (int) $id) {
            abort(403, 'You can only view your own company.');
        }

        $statistics = $this->companyService->getCompanyStatistics($id);

        // Set team context for Spatie Permission to load roles correctly
        setPermissionsTeamId($id);

        // Load company users with roles
        $users = $company->users()->with('roles')->get();

        // Load deleted users
        $deletedUsers = \App\Models\User::onlyTrashed()
            ->where('company_id', $id)
            ->with('roles')
            ->orderBy('deleted_at', 'desc')
            ->get();

        // Load company roles with hierarchy, ordered by level (lowest first)
        $roles = $company->roles()
            ->with('parent', 'children')
            ->orderBy('hierarchy_level', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        // Reseller admin: show only their role(s) and descendants (no CEO, no roles above)
        $roles = $this->roleService->getVisibleRolesForUser($user, $id);

        // Build role hierarchy tree: for reseller admin start from their role(s); else from root (CEO)
        $rootRoles = $company->roles()
            ->where('is_root', true)
            ->whereNull('parent_id')
            ->orderBy('hierarchy_level')
            ->orderBy('name')
            ->get();

        setPermissionsTeamId($id);
        $userRoleIds = $user ? $user->roles()->where('roles.team_id', $id)->pluck('id')->toArray() : [];
        $userRoles = $user && ! empty($userRoleIds)
            ? Role::whereIn('id', $userRoleIds)->with('parent', 'children')->orderBy('hierarchy_level')->orderBy('name')->get()
            : collect();
        $hasRootRole = $userRoles->contains(fn (Role $r) => $r->parent_id === null);

        if ($user && ! $user->isSuperAdmin() && ! $hasRootRole && $userRoles->isNotEmpty()) {
            $roleHierarchy = $userRoles->map(fn (Role $role) => $this->buildRoleHierarchyTree($role))->values()->toArray();
        } else {
            $roleHierarchy = $rootRoles->map(function ($role) {
                return $this->buildRoleHierarchyTree($role);
            })->values()->toArray();
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($company)
            ->with('causer:id,name,email')
            ->latest()
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'properties' => $activity->properties,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'created_at' => $activity->created_at->toISOString(),
                ];
            });

        // Load riding companies for this company (skip if table does not exist)
        $ridingCompanies = [];
        if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)
            && \Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
            $ridingCompanies = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $id)
                ->orderBy('name')
                ->get()
                ->map(function ($ridingCompany) {
                    return [
                        'id' => $ridingCompany->id,
                        'name' => $ridingCompany->name,
                    ];
                });
        }

        // Load document requirements for this reseller (company): from document_names and company_document_requirements
        $documentRequirements = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('document_names') && \Illuminate\Support\Facades\Schema::hasColumn('document_names', 'company_ids')) {
            $documentNames = \Modules\Drivers\app\Models\DocumentName::query()
                ->where(function ($q) use ($id) {
                    $q->whereJsonContains('company_ids', $id)
                        ->orWhereJsonContains('company_ids', (string) $id);
                })
                ->orderBy('name')
                ->get();

            $documentRequirements = $documentNames->map(fn ($docName) => [
                'id' => $docName->id,
                'name' => $docName->name,
                'type' => $docName->type,
                'required' => $docName->required,
                'active' => $docName->active,
                'status' => $docName->status,
                'source' => 'document_names',
            ])->toArray();
        }
        if (\Illuminate\Support\Facades\Schema::hasTable('company_document_requirements')) {
            $companyReqs = \Modules\Core\app\Models\CompanyDocumentRequirement::where('company_id', $id)
                ->orderBy('name')
                ->get();
            foreach ($companyReqs as $req) {
                $documentRequirements[] = [
                    'id' => $req->id,
                    'name' => $req->name,
                    'type' => $req->type,
                    'required' => $req->required,
                    'active' => $req->active,
                    'status' => $req->default_status ?? 'pending',
                    'source' => 'company_document_requirements',
                ];
            }
        }

        // Get all available companies for transfer (exclude current company)
        $availableCompanies = Company::where('id', '!=', $id)
            ->orderBy('name')
            ->get(['id', 'name']);

        // For Integration/WhatsApp/Distribution/Rotation: use first riding company of this reseller (company from URL; sidebar switch changes company so whole page updates)
        $selectedRidingCompanyId = request()->integer('selected_riding_company_id', 0);
        $ridingCompaniesCollection = collect($ridingCompanies);
        if (! $selectedRidingCompanyId && $ridingCompaniesCollection->isNotEmpty()) {
            $selectedRidingCompanyId = $ridingCompaniesCollection->first()['id'];
        }
        $selectedRidingCompanyData = null;
        if ($selectedRidingCompanyId && class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)
            && \Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
            $ridingCompany = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $id)
                ->where('id', $selectedRidingCompanyId)
                ->with('defaultDriverUser')
                ->first();
            if ($ridingCompany) {
                // Facebook integration (same shape as FacebookIntegrationController@show)
                $integration = RidingCompanyIntegrationSetting::firstOrNew(
                    [
                        'riding_company_id' => $ridingCompany->id,
                        'type' => 'facebook',
                    ]
                );
                if (! isset($integration->config) || $integration->config === null) {
                    $integration->setAttribute('config', []);
                }
                if (! $integration->exists) {
                    $integration->active = false;
                }
                if (! isset($integration->attributes['config']) || ! array_key_exists('config', $integration->attributes)) {
                    $integration->setAttribute('config', $integration->config ?? []);
                }
                $integration->save();

                $forms = $integration->facebook_forms ?? [];
                if (empty($forms) && $integration->facebook_form_id) {
                    $config = $integration->config ?? [];
                    $forms = [
                        [
                            'form_id' => $integration->facebook_form_id,
                            'campaign_id' => $config['facebook_campaign_id'] ?? null,
                            'field_mapping' => $integration->facebook_field_mapping ?? [],
                            'name' => null,
                            'status' => null,
                        ],
                    ];
                }

                $integrationPayload = [
                    'id' => $integration->id,
                    'type' => $integration->type,
                    'active' => $integration->active,
                    'facebook_user_id' => $integration->facebook_user_id,
                    'facebook_user_name' => $integration->facebook_user_name,
                    'facebook_page_id' => $integration->facebook_page_id,
                    'facebook_form_id' => $integration->facebook_form_id,
                    'facebook_field_mapping' => $integration->facebook_field_mapping ?? [],
                    'facebook_forms' => $forms,
                    'has_access_token' => ! empty($integration->facebook_access_token),
                ];

                // Distribution: extract user IDs from distribution_users
                $distributionUsers = $ridingCompany->distribution_users ?? [];
                $distributionUserIds = $this->extractUserIdsFromDistributionUsers(is_array($distributionUsers) ? $distributionUsers : []);

                $distributionScenarios = $ridingCompany->distribution_scenarios;
                if ($distributionScenarios !== null && ! is_array($distributionScenarios)) {
                    $distributionScenarios = json_decode($distributionScenarios, true) ?? [];
                }
                $distributionScenarios = $distributionScenarios ?? [];

                // Lead sources, campaigns, roles, available users for Distribution tab
                $leadSources = LeadSource::active()
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn ($source) => ['id' => $source->id, 'name' => $source->name])
                    ->toArray();

                $campaigns = $ridingCompany->company_id
                    ? Campaign::where('company_id', $ridingCompany->company_id)
                        ->orderBy('name')
                        ->get(['id', 'name'])
                        ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])
                        ->toArray()
                    : [];

                $rolesForDistribution = $ridingCompany->company_id
                    ? Role::where('team_id', $ridingCompany->company_id)
                        ->orderBy('name')
                        ->get(['id', 'name'])
                        ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])
                        ->toArray()
                    : [];

                $availableUsersForRc = \App\Models\User::query()
                    ->where('company_id', $ridingCompany->company_id)
                    ->where('is_active', true);
                if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'riding_company_id')) {
                    $availableUsersForRc->where(function ($q) use ($ridingCompany) {
                        $q->whereNull('riding_company_id')
                            ->orWhere('riding_company_id', $ridingCompany->id);
                    });
                }
                $availableUsersForRc = $availableUsersForRc->orderBy('name')
                    ->get(['id', 'name', 'email'])
                    ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email])
                    ->toArray();

                $selectedRidingCompanyData = [
                    'id' => $ridingCompany->id,
                    'name' => $ridingCompany->name,
                    'default_driver_user_id' => $ridingCompany->default_driver_user_id,
                    'default_driver_user' => $ridingCompany->defaultDriverUser ? [
                        'id' => $ridingCompany->defaultDriverUser->id,
                        'name' => $ridingCompany->defaultDriverUser->name,
                        'email' => $ridingCompany->defaultDriverUser->email,
                    ] : null,
                    'integration' => $integrationPayload,
                    'distribution_type' => $ridingCompany->distribution_type,
                    'max_drivers_per_day' => $ridingCompany->max_drivers_per_day ?? 50,
                    'distribution_users' => $distributionUserIds,
                    'distribution_scenarios' => $distributionScenarios,
                    'last_distribution_date' => $ridingCompany->last_distribution_date,
                    'leadSources' => $leadSources,
                    'campaigns' => $campaigns,
                    'roles' => $rolesForDistribution,
                    'availableUsers' => $availableUsersForRc,
                ];
            }
        }

        // Riding Companies (small reseller entities) are hidden; Reseller = main Company only
        return Inertia::render('Core/Companies/Show', [
            'company' => $company->load('users', 'roles'),
            'statistics' => $statistics,
            'users' => $users,
            'deletedUsers' => $deletedUsers,
            'roles' => $roles,
            'roleHierarchy' => $roleHierarchy,
            'activities' => $activities,
            'ridingCompanies' => [],
            'hideRidingCompanies' => true,
            'availableCompanies' => $availableCompanies,
            'documentRequirements' => $documentRequirements,
            'selected_riding_company_id' => null,
            'selectedRidingCompanyData' => null,
        ]);
    }

    public function edit(int $id): Response
    {
        $company = $this->companyService->getCompanyById($id);

        if (! $company) {
            abort(404, 'Company not found.');
        }

        return Inertia::render('Core/Companies/Edit', [
            'company' => $company,
        ]);
    }

    public function update(CompanyUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $this->companyService->updateCompany($id, $request->validated());

            return redirect()
                ->route('core.companies.show', $id)
                ->with('success', 'Company updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(Request $request, int $id): RedirectResponse
    {
        try {
            $company = $this->companyService->getCompanyById($id);

            if (! $company) {
                abort(404, 'Company not found.');
            }

            // Check if company has riding companies
            $ridingCompaniesCount = 0;
            if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)
                && \Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
                $ridingCompaniesCount = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $id)->count();
            }

            $transferCompanyId = $request->input('transfer_company_id') ? (int) $request->input('transfer_company_id') : null;

            // If company has riding companies, transfer company is required
            if ($ridingCompaniesCount > 0 && $transferCompanyId === null) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot delete company with reseller companies. Please select a company to transfer them to.');
            }

            // Validate transfer company if provided
            if ($transferCompanyId !== null) {
                $request->validate([
                    'transfer_company_id' => ['required', 'integer', 'exists:companies,id'],
                ]);

                // Ensure transfer company is not the same as the company being deleted
                if ($transferCompanyId === $id) {
                    return redirect()
                        ->back()
                        ->with('error', 'Cannot transfer to the same company.');
                }
            }

            $this->companyService->deleteCompany($id, $transferCompanyId);

            return redirect()
                ->route('core.companies.index')
                ->with('success', 'Company deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function activate(int $id): RedirectResponse
    {
        try {
            $this->companyService->activateCompany($id);

            return redirect()
                ->back()
                ->with('success', 'Company activated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function deactivate(int $id): RedirectResponse
    {
        try {
            $this->companyService->deactivateCompany($id);

            return redirect()
                ->back()
                ->with('success', 'Company deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function select(Request $request): RedirectResponse|JsonResponse
    {
        $request->validate([
            'company_id' => ['required', 'integer', 'exists:companies,id'],
        ]);

        // Lightweight fetch: only id and name (avoid loading users, modules, roles)
        $company = Company::where('id', $request->company_id)->first(['id', 'name']);

        if (! $company) {
            if ($this->wantsJsonResponse($request)) {
                return response()->json(['success' => false, 'error' => 'Company not found.'], 404);
            }
            return redirect()
                ->back()
                ->with('error', 'Company not found.');
        }

        session(['selected_company_id' => $request->company_id]);

        // Return JSON only for our axios call (not Inertia); Inertia sends X-Inertia header
        if ($this->wantsJsonResponse($request)) {
            return response()->json(['success' => true, 'company' => ['id' => $company->id, 'name' => $company->name]]);
        }

        return redirect()
            ->back()
            ->with('success', "Now viewing data for: {$company->name}");
    }

    public function clearSelection(Request $request): RedirectResponse|JsonResponse
    {
        session()->forget('selected_company_id');

        if ($this->wantsJsonResponse($request)) {
            return response()->json(['success' => true]);
        }

        return redirect()
            ->back()
            ->with('success', 'Company filter cleared. Showing all companies.');
    }

    /**
     * True only for our axios company-select requests (custom header); Inertia requests must get redirect.
     */
    private function wantsJsonResponse(Request $request): bool
    {
        return $request->header('X-Ajax-Company-Select') === '1';
    }

    /**
     * Extract user IDs from distribution_users array (handles array of IDs or array of objects with user_id).
     */
    private function extractUserIdsFromDistributionUsers(array $distributionUsers): array
    {
        if (empty($distributionUsers)) {
            return [];
        }
        if (is_array($distributionUsers[0]) && isset($distributionUsers[0]['user_id'])) {
            return array_column($distributionUsers, 'user_id');
        }

        return $distributionUsers;
    }

    /**
     * Build role hierarchy tree recursively
     */
    protected function buildRoleHierarchyTree(Role $role): array
    {
        // Load children recursively - only for the same company
        $children = Role::where('parent_id', $role->id)
            ->where('team_id', $role->team_id)
            ->orderBy('hierarchy_level')
            ->orderBy('name')
            ->get();

        return [
            'id' => $role->id,
            'name' => $role->name,
            'guard_name' => $role->guard_name,
            'team_id' => $role->team_id,
            'parent_id' => $role->parent_id,
            'hierarchy_path' => $role->hierarchy_path,
            'hierarchy_level' => $role->hierarchy_level,
            'is_root' => $role->is_root,
            'module_name' => $role->module_name,
            'entity_name' => $role->entity_name,
            'created_at' => $role->created_at?->toISOString(),
            'updated_at' => $role->updated_at?->toISOString(),
            'children' => $children->map(function ($child) {
                return $this->buildRoleHierarchyTree($child);
            })->toArray(),
            'all_children' => $children->map(function ($child) {
                return $this->buildRoleHierarchyTree($child);
            })->toArray(),
        ];
    }
}

