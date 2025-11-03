<?php

namespace Modules\Core\app\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function getAllUsers(?int $companyId = null, bool $activeOnly = false): Collection
    {
        $query = User::with(['company', 'roles.permissions']);

        if ($companyId) {
            $query->forCompany($companyId);
        }

        if ($activeOnly) {
            $query->active();
        }

        return $query->orderBy('name')->get();
    }

    public function getUserById(int $id): ?User
    {
        return User::with(['company', 'roles.permissions'])->find($id);
    }

    public function createUser(array $data): User
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user = User::create($data);

        if (isset($data['roles'])) {
            $this->syncRoles($user, $data['roles']);
        }

        if (isset($data['permissions'])) {
            $this->syncPermissions($user, $data['permissions']);
        }

        return $user->fresh(['company', 'roles', 'permissions']);
    }

    public function updateUser(int $id, array $data): User
    {
        $user = User::findOrFail($id);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        if (isset($data['roles'])) {
            $this->syncRoles($user, $data['roles']);
        }

        if (isset($data['permissions'])) {
            $this->syncPermissions($user, $data['permissions']);
        }

        return $user->fresh(['company', 'roles', 'permissions']);
    }

    public function deleteUser(int $id): bool
    {
        $user = User::findOrFail($id);

        if ($user->is_super_admin) {
            throw new \Exception('Cannot delete super admin user.');
        }

        return $user->delete();
    }

    public function activateUser(int $id): User
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => true]);

        return $user;
    }

    public function deactivateUser(int $id): User
    {
        $user = User::findOrFail($id);

        if ($user->is_super_admin) {
            throw new \Exception('Cannot deactivate super admin user.');
        }

        $user->update(['is_active' => false]);

        return $user;
    }

    public function syncRoles(User $user, array $roleIds): void
    {
        $user->syncRoles($roleIds);
    }

    public function syncPermissions(User $user, array $permissionIds): void
    {
        $user->syncPermissions($permissionIds);
    }

    public function assignRole(int $userId, int $roleId): void
    {
        $user = User::findOrFail($userId);
        $role = \Modules\Core\app\Models\Role::findOrFail($roleId);

        $user->assignRole($role);
    }

    public function removeRole(int $userId, int $roleId): void
    {
        $user = User::findOrFail($userId);
        $role = \Modules\Core\app\Models\Role::findOrFail($roleId);

        $user->removeRole($role);
    }

    public function changePassword(int $userId, string $newPassword): User
    {
        $user = User::findOrFail($userId);
        $user->update(['password' => Hash::make($newPassword)]);

        return $user;
    }

    public function getUsersByRole(int $roleId, ?int $companyId = null): Collection
    {
        $query = User::role($roleId)->with(['company', 'roles']);

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('name')->get();
    }

    public function getUserPermissions(int $userId): array
    {
        $user = User::with(['roles.permissions', 'permissions'])->findOrFail($userId);

        $directPermissions = $user->permissions->pluck('name')->toArray();
        $rolePermissions = $user->roles->flatMap->permissions->pluck('name')->unique()->toArray();

        return [
            'direct_permissions' => $directPermissions,
            'role_permissions' => $rolePermissions,
            'all_permissions' => array_unique(array_merge($directPermissions, $rolePermissions)),
        ];
    }
}

