<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\CompanyStoreRequest;
use Modules\Core\app\Http\Requests\CompanyUpdateRequest;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Role;
use Modules\Core\app\Services\CompanyService;

class CompanyController extends Controller
{
    public function __construct(
        protected CompanyService $companyService
    ) {}

    public function index(): Response
    {
        $companies = $this->companyService->getAllCompanies();

        // Add riding companies count for each company
        $companiesWithCounts = $companies->map(function ($company) {
            $ridingCompaniesCount = 0;
            if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)) {
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
                if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)) {
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

        // Build role hierarchy tree - load all roles with recursive children
        // Get root roles (is_root = true AND parent_id is null)
        // Roles with is_root = true but parent_id != null should appear as children, not roots
        $rootRoles = $company->roles()
            ->where('is_root', true)
            ->whereNull('parent_id')
            ->orderBy('hierarchy_level')
            ->orderBy('name')
            ->get();
        
        // Build complete hierarchy tree recursively
        $roleHierarchy = $rootRoles->map(function ($role) {
            return $this->buildRoleHierarchyTree($role);
        })->values()->toArray();

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

        // Load riding companies for this company
        $ridingCompanies = [];
        if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)) {
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

        // Load document names (document requirements) for this company
        $documentRequirements = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('document_names')) {
            $documentNamesQuery = \Modules\Drivers\app\Models\DocumentName::query();
            $hasRidingCompanyIdsColumn = \Illuminate\Support\Facades\Schema::hasColumn('document_names', 'riding_company_ids');

            if ($hasRidingCompanyIdsColumn && ! empty($ridingCompanies->all())) {
                $ridingCompanyIds = $ridingCompanies->pluck('id')->toArray();
                $documentNamesQuery->where(function ($q) use ($ridingCompanyIds) {
                    foreach ($ridingCompanyIds as $ridingCompanyId) {
                        $q->orWhereJsonContains('riding_company_ids', $ridingCompanyId)
                          ->orWhereJsonContains('riding_company_ids', (string) $ridingCompanyId);
                    }
                });
            }

            $documentNames = $documentNamesQuery->orderBy('name')->get();

            $documentRequirements = $documentNames->map(function ($docName) use ($hasRidingCompanyIdsColumn) {
                $ridingCompanyIds = ($hasRidingCompanyIdsColumn ? ($docName->riding_company_ids ?? []) : []);
                $ridingCompanies = ! empty($ridingCompanyIds)
                    ? \Modules\RidingCarCompanies\app\Models\RidingCompany::whereIn('id', $ridingCompanyIds)
                        ->get(['id', 'name'])
                        ->map(fn ($rc) => ['id' => $rc->id, 'name' => $rc->name])
                        ->toArray()
                    : [];

                return [
                    'id' => $docName->id,
                    'name' => $docName->name,
                    'type' => $docName->type,
                    'required' => $docName->required,
                    'active' => $docName->active,
                    'status' => $docName->status,
                    'riding_companies' => $ridingCompanies,
                ];
            })->toArray();
        }

        // Get all available companies for transfer (exclude current company)
        $availableCompanies = Company::where('id', '!=', $id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Core/Companies/Show', [
            'company' => $company->load('users', 'roles'),
            'statistics' => $statistics,
            'users' => $users,
            'deletedUsers' => $deletedUsers,
            'roles' => $roles,
            'roleHierarchy' => $roleHierarchy,
            'activities' => $activities,
            'ridingCompanies' => $ridingCompanies,
            'availableCompanies' => $availableCompanies,
            'documentRequirements' => $documentRequirements,
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
            if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)) {
                $ridingCompaniesCount = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $id)->count();
            }

            $transferCompanyId = $request->input('transfer_company_id') ? (int) $request->input('transfer_company_id') : null;

            // If company has riding companies, transfer company is required
            if ($ridingCompaniesCount > 0 && $transferCompanyId === null) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot delete company with riding companies. Please select a company to transfer them to.');
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

    public function select(Request $request): RedirectResponse
    {
        $request->validate([
            'company_id' => ['required', 'integer', 'exists:companies,id'],
        ]);

        $company = $this->companyService->getCompanyById($request->company_id);
        
        if (! $company) {
            return redirect()
                ->back()
                ->with('error', 'Company not found.');
        }

        session(['selected_company_id' => $request->company_id]);

        return redirect()
            ->back()
            ->with('success', "Now viewing data for: {$company->name}");
    }

    public function clearSelection(): RedirectResponse
    {
        session()->forget('selected_company_id');

        return redirect()
            ->back()
            ->with('success', 'Company filter cleared. Showing all companies.');
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

