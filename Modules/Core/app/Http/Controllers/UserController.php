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

    public function index(Request $request): Response
    {
        $companyId = $request->user()->isSuperAdmin()
            ? $request->input('company_id')
            : $request->user()->company_id;

        $users = $this->userService->getAllUsers($companyId);

        return Inertia::render('Core/Users/Index', [
            'users' => $users,
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        $companyId = $user->company_id;

        $companies = $user->isSuperAdmin()
            ? $this->companyService->getAllCompanies(true)
            : collect([$user->company]);

        $roles = $this->roleService->getAllRoles($companyId);
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Users/Create', [
            'companies' => $companies,
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function store(UserStoreRequest $request): RedirectResponse
    {
        try {
            $this->userService->createUser($request->validated());

            return redirect()
                ->route('core.users.index')
                ->with('success', 'User created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $user = $this->userService->getUserById($id);

        if (! $user) {
            abort(404, 'User not found.');
        }

        $permissions = $this->userService->getUserPermissions($id);

        return Inertia::render('Core/Users/Show', [
            'user' => $user,
            'userPermissions' => $permissions,
        ]);
    }

    public function edit(int $id, Request $request): Response
    {
        $user = $this->userService->getUserById($id);

        if (! $user) {
            abort(404, 'User not found.');
        }

        $authUser = $request->user();
        $companyId = $authUser->company_id;

        $companies = $authUser->isSuperAdmin()
            ? $this->companyService->getAllCompanies(true)
            : collect([$authUser->company]);

        $roles = $this->roleService->getAllRoles($companyId);
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Users/Edit', [
            'user' => $user,
            'companies' => $companies,
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function update(UserUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $this->userService->updateUser($id, $request->validated());

            return redirect()
                ->route('core.users.show', $id)
                ->with('success', 'User updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $id): RedirectResponse
    {
        try {
            $this->userService->deleteUser($id);

            return redirect()
                ->route('core.users.index')
                ->with('success', 'User deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function activate(int $id): RedirectResponse
    {
        try {
            $this->userService->activateUser($id);

            return redirect()
                ->back()
                ->with('success', 'User activated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function deactivate(int $id): RedirectResponse
    {
        try {
            $this->userService->deactivateUser($id);

            return redirect()
                ->back()
                ->with('success', 'User deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

