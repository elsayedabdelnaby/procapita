<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\RoleStoreRequest;
use Modules\Core\app\Http\Requests\RoleUpdateRequest;
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

        $roles = $this->roleService->getAllRoles($company);

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

        $roles = $this->roleService->getAllRoles($company);
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Roles/Create', [
            'company' => $companyModel,
            'availableRoles' => $roles,
            'permissions' => $permissions,
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

        $companyModel = $this->companyService->getCompanyById($company);
        $availableRoles = $this->roleService->getAllRoles($company);
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Roles/Edit', [
            'company' => $companyModel,
            'role' => $roleModel,
            'availableRoles' => $availableRoles,
            'permissions' => $permissions,
        ]);
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

        $hierarchy = $this->roleService->getRoleHierarchy($company);

        return Inertia::render('Core/Roles/Hierarchy', [
            'company' => $companyModel,
            'hierarchy' => $hierarchy,
        ]);
    }
}

