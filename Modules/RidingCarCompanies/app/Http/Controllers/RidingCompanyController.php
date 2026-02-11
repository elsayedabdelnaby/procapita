<?php

namespace Modules\RidingCarCompanies\app\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Role;
use Modules\Core\app\Services\RoleService;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyStoreRequest;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyUpdateRequest;
use Modules\RidingCarCompanies\app\Services\RidingCompanyService;

class RidingCompanyController extends Controller
{
    public function __construct(
        protected RidingCompanyService $ridingCompanyService
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        // Filter riding companies based on user access
        if ($user->isSuperAdmin() || $user->is_company_admin) {
            $ridingCompanies = $this->ridingCompanyService->getAllRidingCompanies($companyId);
            $ridingCompanies->load('company');
        } elseif ($user->riding_company_id) {
            // Regular user sees only their riding company
            $ridingCompany = $this->ridingCompanyService->getRidingCompanyById($user->riding_company_id);
            if ($ridingCompany) {
                $ridingCompany->load('company');
                $ridingCompanies = collect([$ridingCompany]);
            } else {
                $ridingCompanies = collect();
            }
        } else {
            $ridingCompanies = collect();
        }

        // Get all riding companies for the same company (for transfer dropdown)
        $availableRidingCompanies = collect();
        if ($companyId) {
            $availableRidingCompanies = $this->ridingCompanyService->getAllRidingCompanies($companyId);
        } elseif ($user->isSuperAdmin()) {
            $availableRidingCompanies = $this->ridingCompanyService->getAllRidingCompanies();
        }
        
        // Ensure it's always a collection (not null)
        if (!$availableRidingCompanies) {
            $availableRidingCompanies = collect();
        }

        // Get users count for each riding company
        $usersCounts = [];
        foreach ($ridingCompanies as $rc) {
            $usersCounts[$rc->id] = \App\Models\User::where('riding_company_id', $rc->id)->count();
        }

        return Inertia::render('RidingCarCompanies/RidingCompanies/Index', [
            'ridingCompanies' => $ridingCompanies->map(fn ($company) => [
                'id' => $company->id,
                'uuid' => $company->uuid,
                'company_id' => $company->company_id,
                'company' => $company->company ? [
                    'id' => $company->company->id,
                    'name' => $company->company->name,
                ] : null,
                'name' => $company->name,
                'slug' => $company->slug,
                'description' => $company->description,
                'country' => $company->country,
                'city' => $company->city,
                'logo_path' => $company->logo_path,
                'logo_url' => $company->logo_url,
                'contact_email' => $company->contact_email,
                'contact_phone' => $company->contact_phone,
                'active' => $company->active,
                'created_at' => $company->created_at,
                'updated_at' => $company->updated_at,
            ]),
            'availableRidingCompanies' => ($availableRidingCompanies ?: collect())->map(fn ($rc) => [
                'id' => $rc->id,
                'name' => $rc->name,
                'company_id' => $rc->company_id,
            ])->toArray(),
            'usersCounts' => $usersCounts,
        ]);
    }

    public function recycleBin(): RedirectResponse
    {
        // Riding Companies recycle bin is hidden for all users (including admin)
        return redirect()->route('recyclebin.index');
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companies = null;

        if ($user->isSuperAdmin()) {
            $companies = Company::active()->orderBy('name')->get();
        }

        return Inertia::render('RidingCarCompanies/RidingCompanies/Create', [
            'companies' => $companies,
        ]);
    }

    public function store(RidingCompanyStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $currentUser = Auth::user();

            // Set company_id if not super admin
            if (! $currentUser->isSuperAdmin()) {
                $data['company_id'] = $currentUser->company_id;
            }

            $data['created_by'] = $currentUser->id;

            // Only set active if it's explicitly true, otherwise let Model boot method set it to true by default
            if (isset($data['active']) && $data['active'] === true) {
                // Keep it as true
            } else {
                // Remove active from data to let Model boot method set it to true
                unset($data['active']);
            }

            $ridingCompany = $this->ridingCompanyService->createRidingCompany($data);

            // Auto-create Role and User for this Riding Company
            $this->createRoleAndUserForRidingCompany($ridingCompany, $data['company_id'] ?? $currentUser->company_id);

            return redirect()
                ->route('ridingcarcompanies.ridingcompanies.index')
                ->with('success', 'Riding company created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * Auto-create Role and User when a new Riding Company is created
     */
    protected function createRoleAndUserForRidingCompany($ridingCompany, $companyId): void
    {
        $roleService = app(RoleService::class);

        // Find CEO role to use as parent
        $ceoRole = Role::where('name', 'CEO')->where('team_id', $companyId)->first();

        // Create role with riding company name using RoleService
        $roleName = $ridingCompany->name;
        $role = $roleService->createRole([
            'name' => $roleName,
            'guard_name' => 'web',
            'team_id' => $companyId,
            'parent_id' => $ceoRole?->id,
        ]);

        // Create user with fresh-Leads-{RidingCompanyName}
        $nameWithDots = str_replace(' ', '.', $ridingCompany->name);
        $userName = "fresh-Leads-{$nameWithDots}";
        $mobile1 = $nameWithDots;
        $password = Str::random(12); // Generate random password

        $newUser = User::create([
            'name' => $userName,
            'email' => Str::slug($userName).'@'.Str::slug($ridingCompany->name).'.local',
            'mobile1' => $mobile1,
            'password' => Hash::make($password),
            'company_id' => $companyId,
            'riding_company_id' => $ridingCompany->id,
            'is_active' => true,
        ]);

        // Assign the role to the user (with team_id for Spatie permissions)
        $newUser->roles()->attach($role->id, ['team_id' => $companyId]);

        // Set this user as default driver user for the riding company automatically
        $ridingCompany->update(['default_driver_user_id' => $newUser->id]);

        // Log the generated password (you might want to show this to admin or send via email)
        \Log::info("Auto-created user for Riding Company: {$ridingCompany->name}", [
            'user_name' => $userName,
            'password' => $password, // In production, send this securely
            'role' => $roleName,
        ]);
    }

    public function show(int $id): Response
    {
        $ridingCompany = $this->ridingCompanyService->getRidingCompanyById($id);

        if (! $ridingCompany) {
            abort(404, 'Riding company not found.');
        }

        // Refresh to ensure we have the latest data, especially distribution_scenarios
        $ridingCompany->refresh();

        $ridingCompany->load(['company', 'creator', 'defaultDriverUser', 'stageTemplates', 'documentRequirements', 'integrations', 'integrationSettings']);

        // Load users for this riding company (for Users tab)
        $usersQuery = \App\Models\User::query()->where('company_id', $ridingCompany->company_id);
        if (Schema::hasColumn('users', 'riding_company_id')) {
            $usersQuery->where('riding_company_id', $ridingCompany->id);
        }

        $users = $usersQuery
            ->with('roles', 'company')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'mobile1' => $user->mobile1,
                    'mobile2' => $user->mobile2,
                    'is_active' => $user->is_active,
                    'is_super_admin' => $user->is_super_admin,
                    'is_company_admin' => $user->is_company_admin,
                    'company_id' => $user->company_id,
                    'company' => $user->company ? [
                        'id' => $user->company->id,
                        'name' => $user->company->name,
                    ] : null,
                    'riding_company_id' => Schema::hasColumn('users', 'riding_company_id') ? $user->riding_company_id : null,
                    'ridingCompany' => null,
                    'roles' => $user->roles->map(fn ($role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                    ])->toArray(),
                ];
            });

        $availableUsers = collect();
        if ($ridingCompany->company_id) {
            $availableUsersQuery = \App\Models\User::query()
                ->where('company_id', $ridingCompany->company_id)
                ->where('is_active', true);
            if (Schema::hasColumn('users', 'riding_company_id')) {
                $availableUsersQuery->where(function ($query) use ($ridingCompany) {
                    $query->whereNull('riding_company_id')
                        ->orWhere('riding_company_id', $ridingCompany->id);
                });
            }
            $availableUsers = $availableUsersQuery
                ->with('roles', 'company')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ];
                });
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($ridingCompany)
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

        // Get all riding companies for the same company (for transfer dropdown)
        $availableRidingCompanies = collect();
        if ($ridingCompany->company_id) {
            $availableRidingCompanies = $this->ridingCompanyService->getAllRidingCompanies($ridingCompany->company_id)
                ->filter(fn ($rc) => $rc->id !== $ridingCompany->id);
        }
        
        // Ensure it's always a collection (not null)
        if (!$availableRidingCompanies) {
            $availableRidingCompanies = collect();
        }

        $usersCount = 0;
        if (Schema::hasColumn('users', 'riding_company_id')) {
            $usersCount = \App\Models\User::where('riding_company_id', $ridingCompany->id)->count();
        } else {
            $usersCount = \App\Models\User::where('company_id', $ridingCompany->company_id)->count();
        }

        return Inertia::render('RidingCarCompanies/RidingCompanies/Show', [
            'ridingCompany' => [
                'id' => $ridingCompany->id,
                'uuid' => $ridingCompany->uuid,
                'name' => $ridingCompany->name,
                'slug' => $ridingCompany->slug,
                'description' => $ridingCompany->description,
                'country' => $ridingCompany->country,
                'city' => $ridingCompany->city,
                'logo_path' => $ridingCompany->logo_path,
                'contact_email' => $ridingCompany->contact_email,
                'contact_phone' => $ridingCompany->contact_phone,
                'active' => $ridingCompany->active,
                'default_driver_user_id' => $ridingCompany->default_driver_user_id,
                'default_driver_user' => $ridingCompany->defaultDriverUser ? [
                    'id' => $ridingCompany->defaultDriverUser->id,
                    'name' => $ridingCompany->defaultDriverUser->name,
                    'email' => $ridingCompany->defaultDriverUser->email,
                ] : null,
                'distribution_type' => $ridingCompany->distribution_type,
                'max_drivers_per_day' => $ridingCompany->max_drivers_per_day ?? 50,
                'distribution_users' => $this->extractUserIdsFromDistributionUsers($ridingCompany->distribution_users ?? []),
                'distribution_scenarios' => $ridingCompany->distribution_scenarios ? (is_array($ridingCompany->distribution_scenarios) ? $ridingCompany->distribution_scenarios : json_decode($ridingCompany->distribution_scenarios, true) ?? []) : [],
                'last_distribution_date' => $ridingCompany->last_distribution_date,
                'created_at' => $ridingCompany->created_at,
                'updated_at' => $ridingCompany->updated_at,
                'company' => $ridingCompany->company ? [
                    'id' => $ridingCompany->company->id,
                    'name' => $ridingCompany->company->name,
                ] : null,
                'creator' => $ridingCompany->creator ? [
                    'id' => $ridingCompany->creator->id,
                    'name' => $ridingCompany->creator->name,
                    'email' => $ridingCompany->creator->email,
                ] : null,
                'stage_templates' => $ridingCompany->stageTemplates->map(fn ($template) => [
                    'id' => $template->id,
                    'name' => $template->name,
                    'order' => $template->order,
                    'target_value' => $template->target_value,
                    'target_unit' => $template->target_unit,
                    'duration_days' => $template->duration_days,
                    'strict_sequence' => $template->strict_sequence,
                    'allow_cumulative' => $template->allow_cumulative,
                    'active' => $template->active,
                ])->toArray(),
                'document_requirements' => $ridingCompany->documentRequirements->map(fn ($req) => [
                    'id' => $req->id,
                    'name' => $req->name,
                    'type' => $req->type,
                    'required' => $req->required,
                    'active' => $req->active,
                ])->toArray(),
                'document_names' => $this->getDocumentNamesForRidingCompany($ridingCompany->id),
                'integrations' => $ridingCompany->integrations->map(fn ($integration) => [
                    'id' => $integration->id,
                    'type' => $integration->type,
                    'active' => $integration->active,
                ])->toArray(),
                'integration_settings' => $ridingCompany->integrationSettings->map(fn ($setting) => [
                    'id' => $setting->id,
                    'type' => $setting->type,
                    'active' => $setting->active,
                ])->toArray(),
            ],
            'users' => $users,
            'availableUsers' => $availableUsers->toArray(),
            'leadSources' => LeadSource::active()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($source) => [
                    'id' => $source->id,
                    'name' => $source->name,
                ])->toArray(),
            'campaigns' => $ridingCompany->company_id ? Campaign::where('company_id', $ridingCompany->company_id)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($campaign) => [
                    'id' => $campaign->id,
                    'name' => $campaign->name,
                ])->toArray() : [],
            'roles' => $ridingCompany->company_id ? Role::where('team_id', $ridingCompany->company_id)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                ])->toArray() : [],
            'activities' => $activities,
            'availableRidingCompanies' => ($availableRidingCompanies ?: collect())->map(fn ($rc) => [
                'id' => $rc->id,
                'name' => $rc->name,
                'company_id' => $rc->company_id,
            ])->toArray(),
            'usersCount' => $usersCount,
        ]);
    }

    public function edit(int $id): Response
    {
        $ridingCompany = $this->ridingCompanyService->getRidingCompanyById($id);

        if (! $ridingCompany) {
            abort(404, 'Riding company not found.');
        }

        $user = Auth::user();
        $companies = null;

        if ($user->isSuperAdmin()) {
            $companies = Company::active()->orderBy('name')->get();
        }

        // Refresh to ensure we have the latest data
        $ridingCompany->refresh();

        $ridingCompanyData = $ridingCompany->load('company')->toArray();
        // Ensure logo_url is included (accessor may not be in toArray())
        $ridingCompanyData['logo_url'] = $ridingCompany->logo_url;

        return Inertia::render('RidingCarCompanies/RidingCompanies/Edit', [
            'ridingCompany' => $ridingCompanyData,
            'companies' => $companies,
        ]);
    }

    public function update(RidingCompanyUpdateRequest $request, int $id): RedirectResponse|Response
    {
        try {
            $this->ridingCompanyService->updateRidingCompany($id, $request->validated());

            // If default_driver_user_id was updated, get the user name for the success message
            $successMessage = 'Riding company updated successfully.';
            if ($request->has('default_driver_user_id')) {
                $userId = $request->input('default_driver_user_id');
                if ($userId) {
                    $user = \App\Models\User::find($userId);
                    if ($user) {
                        $successMessage = "User has been changed to {$user->name}";
                    }
                } else {
                    $successMessage = 'Default user has been removed';
                }
            }

            // If this is an Inertia request (from show page), redirect back to show page
            if ($request->header('X-Inertia')) {
                return redirect()
                    ->route('ridingcarcompanies.ridingcompanies.show', $id)
                    ->with('success', $successMessage);
            }

            // Otherwise redirect to edit page (for traditional form submissions)
            return redirect()
                ->route('ridingcarcompanies.ridingcompanies.edit', $id)
                ->with('success', $successMessage);
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function getLogo(int $id): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Symfony\Component\HttpFoundation\Response
    {
        $ridingCompany = $this->ridingCompanyService->getRidingCompanyById($id);

        if (! $ridingCompany || ! $ridingCompany->logo_path) {
            abort(404, 'Logo not found.');
        }

        // Check if file exists
        if (! Storage::disk('public')->exists($ridingCompany->logo_path)) {
            abort(404, 'Logo file not found.');
        }

        $filePath = Storage::disk('public')->path($ridingCompany->logo_path);
        $mimeType = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($ridingCompany->logo_path) ?? 'image/png';

        return response()->file($filePath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="'.basename($ridingCompany->logo_path).'"',
        ]);
    }

    public function destroy(Request $request, int $id): RedirectResponse
    {
        try {
            $ridingCompany = $this->ridingCompanyService->getRidingCompanyById($id);

            if (! $ridingCompany) {
                abort(404, 'Riding company not found.');
            }

            // Check if riding company has users
            $usersCount = \App\Models\User::where('riding_company_id', $id)->count();

            $transferRidingCompanyId = $request->input('transfer_riding_company_id') ? (int) $request->input('transfer_riding_company_id') : null;

            // If riding company has users, transfer riding company is required
            if ($usersCount > 0 && $transferRidingCompanyId === null) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot delete riding company with users. Please select a riding company to transfer them to.');
            }

            // Validate transfer riding company if provided
            if ($transferRidingCompanyId !== null) {
                $request->validate([
                    'transfer_riding_company_id' => ['required', 'integer', 'exists:riding_companies,id'],
                ]);

                // Ensure transfer riding company is not the same as the riding company being deleted
                if ($transferRidingCompanyId === $id) {
                    return redirect()
                        ->back()
                        ->with('error', 'Cannot transfer to the same riding company.');
                }

                // Ensure transfer riding company is in the same company
                $transferRidingCompany = \Modules\RidingCarCompanies\app\Models\RidingCompany::findOrFail($transferRidingCompanyId);
                if ($transferRidingCompany->company_id !== $ridingCompany->company_id) {
                    return redirect()
                        ->back()
                        ->with('error', 'Cannot transfer to a riding company from a different company.');
                }
            }

            $this->ridingCompanyService->deleteRidingCompany($id, $transferRidingCompanyId);

            return redirect()
                ->route('ridingcarcompanies.ridingcompanies.index')
                ->with('success', 'Riding company deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $id): RedirectResponse
    {
        try {
            $this->ridingCompanyService->toggleActive($id);

            return redirect()
                ->back()
                ->with('success', 'Riding company status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function uploadLogo(Request $request, int $id): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'], // 2MB max
        ]);

        try {
            $path = $this->ridingCompanyService->uploadLogo($id, $request->file('logo'));

            return redirect()
                ->back()
                ->with('success', 'Logo uploaded successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * Select a riding company (for admins to filter data)
     */
    public function select(Request $request): RedirectResponse
    {
        $request->validate([
            'riding_company_id' => ['required', 'integer'],
        ]);

        $ridingCompanyId = $request->input('riding_company_id');

        // Store in session (0 means "All Riding Companies")
        if ($ridingCompanyId == 0) {
            $request->session()->forget('selected_riding_company_id');
        } else {
            $request->session()->put('selected_riding_company_id', $ridingCompanyId);
        }

        return redirect()->back();
    }

    /**
     * Clear riding company selection
     */
    public function clearSelection(Request $request): RedirectResponse
    {
        $request->session()->forget('selected_riding_company_id');

        return redirect()->back();
    }

    /**
     * Extract user IDs from distribution_users array
     * Handles both array of IDs and array of objects with user_id
     */
    private function getDocumentNamesForRidingCompany(int $ridingCompanyId): array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('document_names')) {
            return [];
        }

        $query = \Modules\Drivers\app\Models\DocumentName::query();
        if (\Illuminate\Support\Facades\Schema::hasColumn('document_names', 'riding_company_ids')) {
            $query->where(function ($q) use ($ridingCompanyId) {
                $q->whereJsonContains('riding_company_ids', $ridingCompanyId)
                  ->orWhereJsonContains('riding_company_ids', (string) $ridingCompanyId);
            });
        }
        $documentNames = $query->orderBy('name')->get();

        return $documentNames->map(function ($docName) {
            return [
                'id' => $docName->id,
                'name' => $docName->name,
                'type' => $docName->type ?? 'file',
                'required' => $docName->required ?? false,
                'active' => $docName->active ?? true,
                'status' => $docName->status ?? 'pending',
            ];
        })->toArray();
    }

    private function extractUserIdsFromDistributionUsers(array $distributionUsers): array
    {
        if (empty($distributionUsers)) {
            return [];
        }

        // Check if it's array of objects with user_id
        if (is_array($distributionUsers[0]) && isset($distributionUsers[0]['user_id'])) {
            return array_column($distributionUsers, 'user_id');
        }

        // Otherwise, it's already array of IDs
        return $distributionUsers;
    }

    /**
     * Distribute drivers from fresh-Leads user to assigned users
     */
    public function distributeDrivers(int $id): \Illuminate\Http\JsonResponse
    {
        try {
            $result = $this->ridingCompanyService->distributeDrivers($id);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'distributed' => $result['distributed'],
                    'daily_counts' => $result['daily_counts'] ?? [],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Error distributing drivers', [
                'riding_company_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to distribute drivers: '.$e->getMessage(),
            ], 500);
        }
    }

    protected function getCompanyId(): ?int
    {
        $user = Auth::user();
        if ($user && $user->is_super_admin) {
            return session('selected_company_id');
        }
        return $user?->company_id;
    }
}
