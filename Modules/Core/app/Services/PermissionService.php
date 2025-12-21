<?php

namespace Modules\Core\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Core\app\Models\Permission;

class PermissionService
{
    public function getAllPermissions(?string $moduleName = null, ?string $entityName = null): Collection
    {
        $query = Permission::query();

        if ($moduleName) {
            $query->forModule($moduleName);
        }

        if ($entityName) {
            $query->forEntity($entityName);
        }

        return $query->orderBy('module_name')
            ->orderBy('entity_name')
            ->orderBy('action')
            ->get();
    }

    public function getPermissionById(int $id): ?Permission
    {
        return Permission::find($id);
    }

    public function createPermission(array $data): Permission
    {
        return Permission::create($data);
    }

    public function updatePermission(int $id, array $data): Permission
    {
        $permission = Permission::findOrFail($id);
        $permission->update($data);

        return $permission;
    }

    public function deletePermission(int $id): bool
    {
        $permission = Permission::findOrFail($id);

        return $permission->delete();
    }

    public function createModulePermissions(
        string $moduleName,
        array $entities,
        array $actions = ['create', 'read', 'update', 'delete']
    ): array {
        $permissions = [];

        foreach ($entities as $entity) {
            $entityPermissions = Permission::createForModule($moduleName, $entity, $actions);
            $permissions = array_merge($permissions, $entityPermissions);
        }

        return $permissions;
    }

    public function getPermissionsByModule(string $moduleName): Collection
    {
        return Permission::forModule($moduleName)
            ->orderBy('entity_name')
            ->orderBy('action')
            ->get();
    }

    public function getPermissionsByEntity(string $moduleName, string $entityName): Collection
    {
        return Permission::forModule($moduleName)
            ->forEntity($entityName)
            ->orderBy('action')
            ->get();
    }

    public function getGroupedPermissions(): array
    {
        $permissions = Permission::orderBy('module_name')
            ->orderBy('entity_name')
            ->orderBy('action')
            ->get();

        $grouped = [];
        $seenIds = [];

        foreach ($permissions as $permission) {
            if (in_array($permission->id, $seenIds)) {
                continue;
            }

            $module = $permission->module_name ?? 'system';
            $entity = $permission->entity_name ?? 'general';

            if (! isset($grouped[$module])) {
                $grouped[$module] = [];
            }

            if (! isset($grouped[$module][$entity])) {
                $grouped[$module][$entity] = [];
            }

            $grouped[$module][$entity][] = $permission;
            $seenIds[] = $permission->id;
        }

        return $grouped;
    }

    public function syncPermissionsForRole(int $roleId, array $permissionIds): void
    {
        $role = \Modules\Core\app\Models\Role::findOrFail($roleId);
        $role->syncPermissions($permissionIds);
    }

    public function syncPermissionsForUser(int $userId, array $permissionIds): void
    {
        $user = \App\Models\User::findOrFail($userId);
        $user->syncPermissions($permissionIds);
    }

    public function grantPermissionToRole(int $roleId, int $permissionId): void
    {
        $role = \Modules\Core\app\Models\Role::findOrFail($roleId);
        $permission = Permission::findOrFail($permissionId);

        $role->givePermissionTo($permission);
    }

    public function revokePermissionFromRole(int $roleId, int $permissionId): void
    {
        $role = \Modules\Core\app\Models\Role::findOrFail($roleId);
        $permission = Permission::findOrFail($permissionId);

        $role->revokePermissionTo($permission);
    }

    public function bulkCreatePermissions(array $permissions): array
    {
        $created = [];

        foreach ($permissions as $permissionData) {
            $created[] = Permission::firstOrCreate(
                [
                    'name' => $permissionData['name'],
                    'guard_name' => $permissionData['guard_name'] ?? 'web',
                ],
                $permissionData
            );
        }

        return $created;
    }

    public function getGroupedPermissionsForUser(\App\Models\User $user): array
    {
        if ($user->isSuperAdmin() || $user->isCompanyAdmin()) {
            return $this->getGroupedPermissions();
        }

        $userPermissions = $user->getAllPermissions();
        $userPermissionNames = $userPermissions->pluck('name')->toArray();

        $permissions = Permission::whereIn('name', $userPermissionNames)
            ->orderBy('module_name')
            ->orderBy('entity_name')
            ->orderBy('action')
            ->get();

        $grouped = [];
        $seenIds = [];

        foreach ($permissions as $permission) {
            if (in_array($permission->id, $seenIds)) {
                continue;
            }

            $module = $permission->module_name ?? 'system';
            $entity = $permission->entity_name ?? 'general';

            if (! isset($grouped[$module])) {
                $grouped[$module] = [];
            }

            if (! isset($grouped[$module][$entity])) {
                $grouped[$module][$entity] = [];
            }

            $grouped[$module][$entity][] = $permission;
            $seenIds[] = $permission->id;
        }

        return $grouped;
    }
}
