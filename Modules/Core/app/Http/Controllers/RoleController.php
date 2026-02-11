<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\RoleStoreRequest;
use Modules\Core\app\Http\Requests\RoleUpdateRequest;
use Modules\Core\app\Models\Permission;
use Modules\Core\app\Services\CompanyService;
use Modules\Core\app\Services\PermissionService;
use Modules\Core\app\Services\RoleService;

class RoleController extends Controller
{
    public function __construct(
        protected RoleService $roleService,
        protected PermissionService $permissionService,
        protected CompanyService $companyService
    ) {}

    public function index(int $company): Response
    {
        $companyModel = $this->companyService->getCompanyById($company);

        if (! $companyModel) {
            abort(404, 'Company not found.');
        }

        $user = \Illuminate\Support\Facades\Auth::user();
        $roles = $this->roleService->getVisibleRolesForUser($user, $company);

        return Inertia::render('Core/Roles/Index', [
            'company' => $companyModel,
            'roles' => $roles,
        ]);
    }

    public function create(int $company): Response
    {
        $companyModel = $this->companyService->getCompanyById($company);
        
        if (! $companyModel) {
            abort(404, 'Company not found.');
        }

        // Auto-create driver field permissions if they don't exist
        $this->ensureDriverFieldPermissionsExist();

        // Auto-create quick-edit and edit permissions if they don't exist
        $this->ensureDriverPermissionsExist();

        $user = \Illuminate\Support\Facades\Auth::user();
        $roles = $this->roleService->getVisibleRolesForUser($user, $company);
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Roles/Create', [
            'company' => $companyModel,
            'availableRoles' => $roles,
            'permissions' => $permissions,
            'demo_reseller' => config('app.demo_reseller', false),
        ]);
    }

    public function store(int $company, RoleStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['team_id'] = $company;
            
            $this->roleService->createRole($data);

            return redirect()
                ->route('core.companies.show', $company)
                ->with('success', 'Role created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $company, int $role): Response
    {
        $roleModel = $this->roleService->getRoleById($role);

        if (! $roleModel || $roleModel->team_id !== $company) {
            abort(404, 'Role not found.');
        }

        $user = \Illuminate\Support\Facades\Auth::user();
        $visibleRoles = $this->roleService->getVisibleRolesForUser($user, $company);
        if (! $user?->isSuperAdmin() && $visibleRoles->pluck('id')->doesntContain($role)) {
            abort(404, 'Role not found.');
        }

        return Inertia::render('Core/Roles/Show', [
            'company' => $roleModel->company,
            'role' => $roleModel,
        ]);
    }

    public function edit(int $company, int $role): Response
    {
        $roleModel = $this->roleService->getRoleById($role);

        if (! $roleModel || $roleModel->team_id !== $company) {
            abort(404, 'Role not found.');
        }

        $user = \Illuminate\Support\Facades\Auth::user();
        $visibleRoles = $this->roleService->getVisibleRolesForUser($user, $company);
        if (! $user?->isSuperAdmin() && $visibleRoles->pluck('id')->doesntContain($role)) {
            abort(404, 'Role not found.');
        }

        // Auto-create driver field permissions if they don't exist
        $this->ensureDriverFieldPermissionsExist();

        // Auto-create quick-edit and edit permissions if they don't exist
        $this->ensureDriverPermissionsExist();

        $companyModel = $this->companyService->getCompanyById($company);
        $availableRoles = $visibleRoles;
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Roles/Edit', [
            'company' => $companyModel,
            'role' => $roleModel,
            'availableRoles' => $availableRoles,
            'permissions' => $permissions,
            'demo_reseller' => config('app.demo_reseller', false),
        ]);
    }

    protected function ensureDriverFieldPermissionsExist(): void
    {
        $fields = [
            'assigned_to',
            'campaign',
            'cancel_reason',
            'car_or_scooter',
            'city',
            'current_stage',
            'email',
            'lead_status_comment',
            'has_worked_before',
            'lead_source',
            'lead_stage',
            'lead_status',
            'full_name',
            'next_follow_up',
            'phone',
            'vehicle_type',
            'vehicle_type_and_year',
            'whatsapp_phone',
            'worked_with_us_before',
            'duplicate',
            'confirm_duplicate',
        ];

        foreach ($fields as $field) {
            foreach (['invisible', 'read', 'write'] as $type) {
                $action = "{$type}-{$field}";
                $name = "drivers.driverfields.{$action}";

                Permission::firstOrCreate(
                    [
                        'name' => $name,
                        'guard_name' => 'web',
                    ],
                    [
                        'module_name' => 'drivers',
                        'entity_name' => 'driverfields',
                        'action' => $action,
                    ]
                );
            }
        }
    }

    protected function ensureDriverPermissionsExist(): void
    {
        // Ensure quick-edit permission exists
        Permission::firstOrCreate(
            [
                'name' => 'drivers.drivers.quick-edit',
                'guard_name' => 'web',
            ],
            [
                'module_name' => 'drivers',
                'entity_name' => 'drivers',
                'action' => 'quick-edit',
            ]
        );

        // Ensure edit permission exists (separate from update)
        Permission::firstOrCreate(
            [
                'name' => 'drivers.drivers.edit',
                'guard_name' => 'web',
            ],
            [
                'module_name' => 'drivers',
                'entity_name' => 'drivers',
                'action' => 'edit',
            ]
        );
    }

    public function update(int $company, int $role, RoleUpdateRequest $request): RedirectResponse
    {
        try {
            $roleModel = $this->roleService->getRoleById($role);
            
            if (! $roleModel || $roleModel->team_id !== $company) {
                abort(404, 'Role not found.');
            }

            $this->roleService->updateRole($role, $request->validated());

            return redirect()
                ->route('core.companies.show', $company)
                ->with('success', 'Role updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $company, int $role): RedirectResponse
    {
        try {
            $roleModel = $this->roleService->getRoleById($role);

            if (! $roleModel || $roleModel->team_id !== $company) {
                abort(404, 'Role not found.');
            }

            $user = \Illuminate\Support\Facades\Auth::user();
            $visibleRoles = $this->roleService->getVisibleRolesForUser($user, $company);
            if (! $user?->isSuperAdmin() && $visibleRoles->pluck('id')->doesntContain($role)) {
                abort(404, 'Role not found.');
            }

            $this->roleService->deleteRole($role);

            return redirect()
                ->route('core.companies.show', $company)
                ->with('success', 'Role deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function hierarchy(int $company): Response
    {
        $companyModel = $this->companyService->getCompanyById($company);

        if (! $companyModel) {
            abort(404, 'Company not found.');
        }

        $user = \Illuminate\Support\Facades\Auth::user();
        $hierarchy = $this->roleService->getVisibleRoleHierarchyForUser($user, $company);

        return Inertia::render('Core/Roles/Hierarchy', [
            'company' => $companyModel,
            'hierarchy' => $hierarchy,
        ]);
    }

    public function move(int $company, int $role, Request $request)
    {
        try {
            $roleModel = $this->roleService->getRoleById($role);

            if (! $roleModel || $roleModel->team_id !== $company) {
                return response()->json(['error' => 'Role not found.'], 404);
            }

            $user = \Illuminate\Support\Facades\Auth::user();
            $visibleRoles = $this->roleService->getVisibleRolesForUser($user, $company);
            if (! $user?->isSuperAdmin() && $visibleRoles->pluck('id')->doesntContain($role)) {
                return response()->json(['error' => 'Role not found.'], 404);
            }

            $request->validate([
                'parent_id' => ['nullable', 'integer', 'exists:roles,id'],
            ]);

            $newParentId = $request->input('parent_id');

            // Validate that parent belongs to same company and is visible to user if provided
            if ($newParentId) {
                $parentRole = $this->roleService->getRoleById($newParentId);
                if (! $parentRole || $parentRole->team_id !== $company) {
                    return response()->json(['error' => 'Parent role must belong to the same company.'], 400);
                }
                if (! $user?->isSuperAdmin() && $visibleRoles->pluck('id')->doesntContain($newParentId)) {
                    return response()->json(['error' => 'Parent role is not available.'], 400);
                }
            }

            $this->roleService->moveRole($role, $newParentId);

            return response()->json([
                'success' => true,
                'message' => 'Role moved successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}

