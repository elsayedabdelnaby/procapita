<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\UserStoreRequest;
use Modules\Core\app\Http\Requests\UserUpdateRequest;
use Modules\Core\app\Services\CompanyService;
use Modules\Core\app\Services\PermissionService;
use Modules\Core\app\Services\RoleService;
use Modules\Core\app\Services\UserService;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService,
        protected RoleService $roleService,
        protected PermissionService $permissionService,
        protected CompanyService $companyService
    ) {}

    public function index(int $company, Request $request): Response
    {
        $companyModel = $this->companyService->getCompanyById($company);

        if (! $companyModel) {
            abort(404, 'Company not found.');
        }

        $currentUser = $request->user();

        // Check access: Super admin can see all, Company admin can see only their company
        if ($currentUser && ! $currentUser->isSuperAdmin() && $companyModel->id !== $currentUser->company_id) {
            abort(403, 'You do not have access to this company.');
        }

        // Set team context for Spatie Permission to load roles correctly
        setPermissionsTeamId($company);

        $users = $this->userService->getAllUsers($company);
        $deletedUsers = $this->userService->getDeletedUsers($company);

        return Inertia::render('Core/Users/Index', [
            'company' => $companyModel,
            'users' => $users,
            'deletedUsers' => $deletedUsers,
        ]);
    }

    public function create(int $company, Request $request): Response
    {
        $companyModel = $this->companyService->getCompanyById($company);

        if (! $companyModel) {
            abort(404, 'Company not found.');
        }

        $currentUser = $request->user();

        // Check access: Super admin can see all, Company admin can see only their company
        if ($currentUser && ! $currentUser->isSuperAdmin() && $companyModel->id !== $currentUser->company_id) {
            abort(403, 'You do not have access to this company.');
        }

        // Set team context for Spatie Permission to load roles correctly
        setPermissionsTeamId($company);

        // Get roles that are below the current user in hierarchy
        $roles = $this->roleService->getSubordinateRolesForUser($currentUser, $company);

        // Get permissions that the current user has
        $permissions = $this->permissionService->getGroupedPermissionsForUser($currentUser);

        $ridingCompanies = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $company)
            ->active()
            ->orderBy('name')
            ->get();

        // Get riding_company_id from query parameter if present
        $ridingCompanyId = $request->query('riding_company_id');

        return Inertia::render('Core/Users/Create', [
            'company' => $companyModel,
            'roles' => $roles,
            'permissions' => $permissions,
            'ridingCompanies' => $ridingCompanies,
            'defaultRidingCompanyId' => $ridingCompanyId,
        ]);
    }

    public function store(int $company, UserStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['company_id'] = $company;

            $this->userService->createUser($data);

            return redirect()
                ->route('core.companies.show', $company)
                ->with('success', 'User created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $company, int $user): Response
    {
        $userModel = $this->userService->getUserById($user);

        if (! $userModel || $userModel->company_id !== $company) {
            abort(404, 'User not found.');
        }

        $permissions = $this->userService->getUserPermissions($user);

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($userModel)
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

        return Inertia::render('Core/Users/Show', [
            'company' => $userModel->company,
            'user' => $userModel,
            'userPermissions' => $permissions,
            'activities' => $activities,
        ]);
    }

    public function edit(int $company, int $user, Request $request): Response
    {
        $userModel = $this->userService->getUserById($user);

        if (! $userModel || $userModel->company_id !== $company) {
            abort(404, 'User not found.');
        }

        $companyModel = $this->companyService->getCompanyById($company);
        $currentUser = $request->user();

        // Check access: Super admin can see all, Company admin can see only their company
        if ($currentUser && ! $currentUser->isSuperAdmin() && $companyModel->id !== $currentUser->company_id) {
            abort(403, 'You do not have access to this company.');
        }

        // Set team context for Spatie Permission to load roles correctly
        setPermissionsTeamId($company);

        // Get roles that are below the current user in hierarchy
        $roles = $this->roleService->getSubordinateRolesForUser($currentUser, $company);

        // Get permissions that the current user has
        $permissions = $this->permissionService->getGroupedPermissionsForUser($currentUser);

        $ridingCompanies = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $company)
            ->active()
            ->orderBy('name')
            ->get();

        // Reload the user's roles and permissions in the correct team context
        $userModel->load('roles', 'permissions');

        // Get user's current role IDs
        $userRoles = $userModel->roles->pluck('id')->toArray();

        // Get user's current permission IDs
        $userPermissionIds = $userModel->permissions->pluck('id')->toArray();

        return Inertia::render('Core/Users/Edit', [
            'company' => $companyModel,
            'user' => $userModel->load('permissions'),
            'roles' => $roles,
            'permissions' => $permissions,
            'userRoles' => $userRoles,
            'userPermissionIds' => $userPermissionIds,
            'ridingCompanies' => $ridingCompanies,
        ]);
    }

    public function update(int $company, int $user, UserUpdateRequest $request): RedirectResponse
    {
        try {
            $userModel = $this->userService->getUserById($user);

            if (! $userModel || $userModel->company_id !== $company) {
                abort(404, 'User not found.');
            }

            $this->userService->updateUser($user, $request->validated());

            return redirect()
                ->route('core.companies.show', $company)
                ->with('success', 'User updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $company, int $user, Request $request): RedirectResponse
    {
        try {
            $userModel = $this->userService->getUserById($user);

            if (! $userModel || $userModel->company_id !== $company) {
                abort(404, 'User not found.');
            }

            // Get reassign user ID from request
            $reassignToUserId = $request->input('reassign_to_user_id');

            if (! $reassignToUserId) {
                // Check if user has any assigned drivers
                $hasAssignedDrivers = \Modules\Drivers\app\Models\Driver::where('assigned_to', $user)
                    ->orWhereHas('assignedUsers', function ($q) use ($user) {
                        $q->where('users.id', $user);
                    })
                    ->exists();

                if ($hasAssignedDrivers) {
                    return redirect()
                        ->back()
                        ->with('error', 'This user has assigned drivers. Please select a user to reassign the data to before deleting.');
                }
            }

            $this->userService->deleteUser($user, $reassignToUserId);

            return redirect()
                ->route('core.companies.show', $company)
                ->with('success', 'User deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function activate(int $company, int $user): RedirectResponse
    {
        try {
            $userModel = $this->userService->getUserById($user);

            if (! $userModel || $userModel->company_id !== $company) {
                abort(404, 'User not found.');
            }

            $this->userService->activateUser($user);

            return redirect()
                ->back()
                ->with('success', 'User activated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function deactivate(int $company, int $user): RedirectResponse
    {
        try {
            $userModel = $this->userService->getUserById($user);

            if (! $userModel || $userModel->company_id !== $company) {
                abort(404, 'User not found.');
            }

            $this->userService->deactivateUser($user);

            return redirect()
                ->back()
                ->with('success', 'User deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * Get users by riding company ID (for Team Leader selection)
     */
    public function getUsersByRidingCompany(Request $request)
    {
        $ridingCompanyId = $request->input('riding_company_id');
        $currentUserId = $request->user()?->id;

        if (! $ridingCompanyId) {
            return response()->json(['users' => []]);
        }

        $users = \App\Models\User::where('riding_company_id', $ridingCompanyId)
            ->where('is_active', true)
            ->where('id', '!=', $currentUserId) // Exclude current user
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * Get users without riding company (for Account Manager selection)
     */
    public function getUsersWithoutRidingCompany(Request $request)
    {
        $currentUserId = $request->user()?->id;

        $users = \App\Models\User::whereNull('riding_company_id')
            ->where('is_active', true)
            ->where('id', '!=', $currentUserId) // Exclude current user
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json(['users' => $users]);
    }

    public function restore(int $company, int $user): RedirectResponse
    {
        try {
            $userModel = \App\Models\User::onlyTrashed()->findOrFail($user);

            if ($userModel->company_id !== $company) {
                abort(404, 'User not found.');
            }

            $userModel->restore();

            return redirect()
                ->back()
                ->with('success', 'User restored successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function forceDelete(int $company, int $user): RedirectResponse
    {
        try {
            $userModel = \App\Models\User::onlyTrashed()->findOrFail($user);

            if ($userModel->company_id !== $company) {
                abort(404, 'User not found.');
            }

            if ($userModel->is_super_admin) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot permanently delete super admin user.');
            }

            $userModel->forceDelete();

            return redirect()
                ->back()
                ->with('success', 'User permanently deleted.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}
