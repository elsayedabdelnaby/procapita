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

        // Set team context for Spatie Permission to load roles correctly
        setPermissionsTeamId($company);

        $users = $this->userService->getAllUsers($company);

        return Inertia::render('Core/Users/Index', [
            'company' => $companyModel,
            'users' => $users,
        ]);
    }

    public function create(int $company, Request $request): Response
    {
        $companyModel = $this->companyService->getCompanyById($company);
        
        if (! $companyModel) {
            abort(404, 'Company not found.');
        }

        $roles = $this->roleService->getAllRoles($company);

        return Inertia::render('Core/Users/Create', [
            'company' => $companyModel,
            'roles' => $roles,
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

        return Inertia::render('Core/Users/Show', [
            'company' => $userModel->company,
            'user' => $userModel,
            'userPermissions' => $permissions,
        ]);
    }

    public function edit(int $company, int $user, Request $request): Response
    {
        $userModel = $this->userService->getUserById($user);

        if (! $userModel || $userModel->company_id !== $company) {
            abort(404, 'User not found.');
        }

        $companyModel = $this->companyService->getCompanyById($company);
        
        // Set team context for Spatie Permission to load roles correctly
        setPermissionsTeamId($company);
        
        $roles = $this->roleService->getAllRoles($company);
        
        // Reload the user's roles in the correct team context
        $userModel->load('roles');
        
        // Get user's current role IDs
        $userRoles = $userModel->roles->pluck('id')->toArray();

        return Inertia::render('Core/Users/Edit', [
            'company' => $companyModel,
            'user' => $userModel,
            'roles' => $roles,
            'userRoles' => $userRoles,
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

    public function destroy(int $company, int $user): RedirectResponse
    {
        try {
            $userModel = $this->userService->getUserById($user);
            
            if (! $userModel || $userModel->company_id !== $company) {
                abort(404, 'User not found.');
            }

            $this->userService->deleteUser($user);

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
}

