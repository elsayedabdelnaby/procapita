<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\RoleStoreRequest;
use Modules\Core\app\Http\Requests\RoleUpdateRequest;
use Modules\Core\app\Services\PermissionService;
use Modules\Core\app\Services\RoleService;

class RoleController extends Controller
{
    public function __construct(
        protected RoleService $roleService,
        protected PermissionService $permissionService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = $request->user()->isSuperAdmin()
            ? $request->input('company_id')
            : $request->user()->company_id;

        $roles = $this->roleService->getAllRoles($companyId);

        return Inertia::render('Core/Roles/Index', [
            'roles' => $roles,
        ]);
    }

    public function create(Request $request): Response
    {
        $companyId = $request->user()->company_id;
        $roles = $this->roleService->getAllRoles($companyId);
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Roles/Create', [
            'availableRoles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function store(RoleStoreRequest $request): RedirectResponse
    {
        try {
            $this->roleService->createRole($request->validated());

            return redirect()
                ->route('core.roles.index')
                ->with('success', 'Role created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $role = $this->roleService->getRoleById($id);

        if (! $role) {
            abort(404, 'Role not found.');
        }

        return Inertia::render('Core/Roles/Show', [
            'role' => $role,
        ]);
    }

    public function edit(int $id, Request $request): Response
    {
        $role = $this->roleService->getRoleById($id);

        if (! $role) {
            abort(404, 'Role not found.');
        }

        $companyId = $request->user()->company_id;
        $availableRoles = $this->roleService->getAllRoles($companyId);
        $permissions = $this->permissionService->getGroupedPermissions();

        return Inertia::render('Core/Roles/Edit', [
            'role' => $role,
            'availableRoles' => $availableRoles,
            'permissions' => $permissions,
        ]);
    }

    public function update(RoleUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $this->roleService->updateRole($id, $request->validated());

            return redirect()
                ->route('core.roles.show', $id)
                ->with('success', 'Role updated successfully.');
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
            $this->roleService->deleteRole($id);

            return redirect()
                ->route('core.roles.index')
                ->with('success', 'Role deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function hierarchy(Request $request): Response
    {
        $companyId = $request->user()->isSuperAdmin()
            ? $request->input('company_id')
            : $request->user()->company_id;

        $hierarchy = $this->roleService->getRoleHierarchy($companyId);

        return Inertia::render('Core/Roles/Hierarchy', [
            'hierarchy' => $hierarchy,
        ]);
    }
}

