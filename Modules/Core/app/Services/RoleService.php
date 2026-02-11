<?php

namespace Modules\Core\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Permission;
use Modules\Core\app\Models\Role;

class RoleService
{
    public function getAllRoles(?int $companyId = null): Collection
    {
        $query = Role::query()->with(['parent', 'children', 'permissions']);

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('hierarchy_level')->orderBy('name')->get();
    }

    /**
     * Get roles visible to the current user in a company. Reseller admins (users whose
     * roles all have a parent, e.g. company-named role under CEO) see only their role(s)
     * and descendants. Super admin and users with a root role (CEO) see all roles.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Role>
     */
    public function getVisibleRolesForUser(?\App\Models\User $user, int $companyId): Collection
    {
        $all = $this->getAllRoles($companyId);
        if (! $user) {
            return $all;
        }
        if ($user->isSuperAdmin()) {
            return $all;
        }
        setPermissionsTeamId($companyId);
        $userRoles = $user->roles()->where('roles.team_id', $companyId)->get();
        if ($userRoles->isEmpty()) {
            return $all;
        }
        $hasRootRole = $userRoles->contains(fn (Role $r) => $r->parent_id === null);
        if ($hasRootRole) {
            return $all;
        }
        $visibleIds = $this->collectRoleAndDescendantIds($userRoles);
        return $all->filter(fn (Role $r) => in_array($r->id, $visibleIds))->values();
    }

    /**
     * Collect role IDs: the given roles plus all their descendants (same company).
     *
     * @param  \Illuminate\Support\Collection<int, Role>  $roles
     * @return array<int, int>
     */
    public function collectRoleAndDescendantIds($roles): array
    {
        $ids = [];
        foreach ($roles as $role) {
            $ids[] = $role->id;
            $children = Role::where('parent_id', $role->id)->where('team_id', $role->team_id)->get();
            if ($children->isNotEmpty()) {
                $ids = array_merge($ids, $this->collectRoleAndDescendantIds($children));
            }
        }
        return array_values(array_unique($ids));
    }

    public function getRoleById(int $id): ?Role
    {
        return Role::with(['parent', 'children', 'permissions', 'company'])->find($id);
    }

    public function createRole(array $data): Role
    {
        $role = Role::create($data);

        if (isset($data['permissions'])) {
            $this->syncPermissions($role, $data['permissions']);
        }

        return $role->fresh(['parent', 'children', 'permissions']);
    }

    public function createRootRole(Company $company, string $name = 'CEO'): Role
    {
        return Role::create([
            'name' => $name,
            'guard_name' => 'web',
            'team_id' => $company->id,
            'parent_id' => null,
            'is_root' => true,
        ]);
    }

    public function updateRole(int $id, array $data): Role
    {
        $role = Role::findOrFail($id);

        // If role is root, keep is_root = true even if parent is assigned
        if ($role->is_root && isset($data['parent_id'])) {
            $data['is_root'] = true; // Keep root status
        }

        // Only prevent self-reference, allow moving to descendants (like VtigerCRM)
        if (isset($data['parent_id']) && $data['parent_id'] === $role->id) {
            throw new \Exception('A role cannot be its own parent.');
        }

        // If moving to a descendant, first move the descendant's children to the role's current parent
        if (isset($data['parent_id']) && $data['parent_id'] !== null) {
            $newParent = Role::find($data['parent_id']);
            
            if ($newParent && $newParent->isDescendantOf($role)) {
                // Move the new parent's children to the role's current parent before moving the role
                $newParentChildren = $newParent->children;
                $currentParentId = $role->parent_id;
                
                foreach ($newParentChildren as $child) {
                    $child->update(['parent_id' => $currentParentId]);
                    $child->updateHierarchy();
                }
            }
        }

        $role->update($data);

        if (isset($data['permissions'])) {
            $this->syncPermissions($role, $data['permissions']);
        }

        return $role->fresh(['parent', 'children', 'permissions']);
    }

    public function deleteRole(int $id): bool
    {
        $role = Role::findOrFail($id);

        if ($role->is_root) {
            throw new \Exception('Cannot delete a root role.');
        }

        // Reassign children to parent or delete them
        if ($role->children()->count() > 0) {
            if ($role->parent_id) {
                $role->children()->update(['parent_id' => $role->parent_id]);
            } else {
                throw new \Exception('Cannot delete role with children. Please reassign children first.');
            }
        }

        return $role->delete();
    }

    public function syncPermissions(Role $role, array $permissionIds): void
    {
        // Check if new driverfield permissions (invisible/read/write) are being set
        $newDriverFieldPerms = Permission::whereIn('id', $permissionIds)
            ->where('module_name', 'drivers')
            ->where('entity_name', 'driverfields')
            ->where(function ($query) {
                $query->where('action', 'like', 'invisible-%')
                      ->orWhere('action', 'like', 'read-%')
                      ->orWhere('action', 'like', 'write-%')
                      ->orWhere('name', 'like', 'drivers.driverfields.invisible-%')
                      ->orWhere('name', 'like', 'drivers.driverfields.read-%')
                      ->orWhere('name', 'like', 'drivers.driverfields.write-%');
            })
            ->pluck('id')
            ->toArray();

        // If new permissions exist, remove old view- permissions for driverfields
        if (!empty($newDriverFieldPerms)) {
            $oldViewPerms = Permission::where('module_name', 'drivers')
                ->where('entity_name', 'driverfields')
                ->where(function ($query) {
                    $query->where('action', 'like', 'view-%')
                          ->orWhere('name', 'like', 'drivers.driverfields.view-%');
                })
                ->pluck('id')
                ->toArray();

            // Remove old view- permissions from the role
            if (!empty($oldViewPerms)) {
                $role->permissions()->detach($oldViewPerms);
            }
        }

        // Sync the new permissions
        $role->syncPermissions($permissionIds);
    }

    public function getRoleHierarchy(int $companyId): array
    {
        $roles = Role::forCompany($companyId)
            ->with(['children' => function ($query) {
                $query->orderBy('name');
            }])
            ->rootRoles()
            ->orderBy('name')
            ->get();

        return $roles->map(function ($role) {
            return $this->buildRoleTree($role);
        })->toArray();
    }

    /**
     * Get role hierarchy visible to the user. Reseller admins see only their role(s) and descendants.
     */
    public function getVisibleRoleHierarchyForUser(?\App\Models\User $user, int $companyId): array
    {
        $allRoles = $this->getAllRoles($companyId);
        if (! $user || $user->isSuperAdmin()) {
            return $this->getRoleHierarchy($companyId);
        }
        setPermissionsTeamId($companyId);
        $userRoles = $user->roles()->where('roles.team_id', $companyId)->get();
        if ($userRoles->isEmpty()) {
            return $this->getRoleHierarchy($companyId);
        }
        $hasRootRole = $userRoles->contains(fn (Role $r) => $r->parent_id === null);
        if ($hasRootRole) {
            return $this->getRoleHierarchy($companyId);
        }
        $userRoles->load(['children' => function ($q) {
            $q->orderBy('name');
        }]);
        return $userRoles->map(fn (Role $role) => $this->buildRoleTree($role))->toArray();
    }

    protected function buildRoleTree(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'hierarchy_path' => $role->hierarchy_path,
            'hierarchy_level' => $role->hierarchy_level,
            'is_root' => $role->is_root,
            'module_name' => $role->module_name,
            'entity_name' => $role->entity_name,
            'permissions_count' => $role->permissions->count(),
            'children' => $role->children->map(function ($child) {
                return $this->buildRoleTree($child);
            })->toArray(),
        ];
    }

    public function moveRole(int $roleId, ?int $newParentId): Role
    {
        $role = Role::findOrFail($roleId);

        // If role is root, keep is_root = true even if moved under another role
        $keepRootStatus = $role->is_root;

        // Only prevent self-reference, allow moving to descendants
        if ($newParentId !== null && $newParentId === $role->id) {
            throw new \Exception('A role cannot be its own parent.');
        }

        // If moving to a descendant, first move the descendant's children to the role's current parent
        if ($newParentId !== null) {
            $newParent = Role::findOrFail($newParentId);
            
            // Check if new parent is a descendant of the role being moved
            if ($newParent->isDescendantOf($role)) {
                // Move the new parent's children to the role's current parent before moving the role
                $newParentChildren = $newParent->children;
                $currentParentId = $role->parent_id;
                
                foreach ($newParentChildren as $child) {
                    $child->update(['parent_id' => $currentParentId]);
                    $child->updateHierarchy();
        }
            }
        }

        // Update parent_id, but keep is_root = true if it was root
        $updateData = ['parent_id' => $newParentId];
        if ($keepRootStatus) {
            $updateData['is_root'] = true;
        }
        
        $role->update($updateData);

        return $role->fresh(['parent', 'children']);
    }

    public function getSubordinateRoles(int $roleId): Collection
    {
        $role = Role::findOrFail($roleId);

        return Role::where('hierarchy_path', 'like', $role->hierarchy_path . ':%')
            ->orderBy('hierarchy_level')
            ->orderBy('name')
            ->get();
    }

    public function duplicateRole(int $roleId, string $newName, ?int $companyId = null): Role
    {
        $originalRole = Role::with('permissions')->findOrFail($roleId);

        $newRole = Role::create([
            'name' => $newName,
            'guard_name' => $originalRole->guard_name,
            'team_id' => $companyId ?? $originalRole->team_id,
            'parent_id' => $originalRole->parent_id,
            'module_name' => $originalRole->module_name,
            'entity_name' => $originalRole->entity_name,
        ]);

        // Copy permissions
        $permissionIds = $originalRole->permissions->pluck('id')->toArray();
        $newRole->syncPermissions($permissionIds);

        return $newRole->fresh(['permissions']);
    }

    /**
     * Get roles that are below the current user in the hierarchy
     * Returns only roles that are descendants of the user's roles
     */
    public function getSubordinateRolesForUser(\App\Models\User $user, ?int $companyId = null): Collection
    {
        if ($user->isSuperAdmin() || $user->isCompanyAdmin()) {
            // Super admin and company admin can see all roles
            return $this->getAllRoles($companyId);
        }

        $userRoleIds = $user->roles()->pluck('id')->toArray();
        
        if (empty($userRoleIds)) {
            // If user has no roles, return empty collection
            return collect();
        }

        // Get all user's roles
        $userRoles = Role::whereIn('id', $userRoleIds)->get();
        
        // Get all descendant role IDs
        $subordinateRoleIds = [];
        foreach ($userRoles as $role) {
            // Get all roles that are descendants of this role
            $descendants = Role::where('hierarchy_path', 'like', $role->hierarchy_path . ':%')
                ->where('team_id', $role->team_id)
                ->pluck('id')
                ->toArray();
            $subordinateRoleIds = array_merge($subordinateRoleIds, $descendants);
        }

        // Include user's own roles
        $allRoleIds = array_unique(array_merge($userRoleIds, $subordinateRoleIds));

        // Get all roles with these IDs
        $query = Role::whereIn('id', $allRoleIds)->with(['parent', 'children', 'permissions']);

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('hierarchy_level')->orderBy('name')->get();
    }
}

