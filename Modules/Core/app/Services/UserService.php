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
        // Don't eager-load roles here - let controllers load them with proper team context
        return User::with('company')->find($id);
    }

    public function createUser(array $data): User
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user = User::create($data);

        // Set team context for Spatie Permission before assigning roles
        if ($user->company_id) {
            setPermissionsTeamId($user->company_id);
        }

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

        // Set team context for Spatie Permission before syncing roles
        if ($user->company_id) {
            setPermissionsTeamId($user->company_id);
        }

        if (isset($data['roles'])) {
            $this->syncRoles($user, $data['roles']);
        }

        if (isset($data['permissions'])) {
            $this->syncPermissions($user, $data['permissions']);
        }

        return $user->fresh(['company', 'roles', 'permissions']);
    }

    public function deleteUser(int $id, ?int $reassignToUserId = null): bool
    {
        $user = User::findOrFail($id);

        if ($user->is_super_admin) {
            throw new \Exception('Cannot delete super admin user.');
        }

        // If reassign user is provided, transfer all data
        if ($reassignToUserId) {
            $reassignToUser = User::findOrFail($reassignToUserId);
            $userName = $user->name;

            // Transfer drivers assigned to this user
            \Modules\Drivers\app\Models\Driver::where('assigned_to', $user->id)
                ->update([
                    'assigned_to' => $reassignToUserId,
                    'resigned_leads' => $userName,
                    'team_leader_id' => $reassignToUser->team_leader_id,
                    'account_manager_id' => $reassignToUser->account_manager_id,
                    'riding_company_id' => $reassignToUser->riding_company_id,
                ]);

            // Transfer follow-ups assigned to this user
            $oldRidingCompanyId = $user->riding_company_id;
            $newRidingCompanyId = $reassignToUser->riding_company_id;

            // Get all follow-ups assigned to old user
            $followUps = \Modules\Drivers\app\Models\DriverFollowUp::where('assigned_to', $user->id)->get();

            // Determine who should receive the follow-ups
            $reassignFollowUpsToUserId = null;
            if ($oldRidingCompanyId && $newRidingCompanyId && $oldRidingCompanyId == $newRidingCompanyId) {
                // Same riding company - assign to new user's team leader
                $reassignFollowUpsToUserId = $reassignToUser->team_leader_id;
            } else {
                // Different riding company - assign to new user's account manager
                $reassignFollowUpsToUserId = $reassignToUser->account_manager_id;
            }

            // Reassign follow-ups if we have a valid user
            if ($reassignFollowUpsToUserId) {
                $reassignFollowUpsToUser = User::find($reassignFollowUpsToUserId);
                if ($reassignFollowUpsToUser) {
                    \Modules\Drivers\app\Models\DriverFollowUp::where('assigned_to', $user->id)
                        ->update([
                            'assigned_to' => $reassignFollowUpsToUserId,
                            'user_name' => $reassignFollowUpsToUser->name,
                        ]);
                }
            }

            // Transfer drivers where user is in assigned_users
            $driversWithUser = \Modules\Drivers\app\Models\Driver::whereHas('assignedUsers', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            })->get();

            foreach ($driversWithUser as $driver) {
                $assignedUserIds = $driver->assignedUsers->pluck('id')->toArray();
                $newAssignedUserIds = array_filter($assignedUserIds, fn ($uid) => $uid != $user->id);

                // If user was the only assigned user, add reassign user
                if (empty($newAssignedUserIds)) {
                    $newAssignedUserIds = [$reassignToUserId];
                    $driver->update([
                        'assigned_to' => $reassignToUserId,
                        'resigned_leads' => $userName,
                        'team_leader_id' => $reassignToUser->team_leader_id,
                        'account_manager_id' => $reassignToUser->account_manager_id,
                        'riding_company_id' => $reassignToUser->riding_company_id,
                    ]);
                } else {
                    // Add reassign user if not already in list
                    if (! in_array($reassignToUserId, $newAssignedUserIds)) {
                        $newAssignedUserIds[] = $reassignToUserId;
                    }
                }

                $driver->assignedUsers()->sync($newAssignedUserIds);

                // Update assigned_to if it was the deleted user
                if ($driver->assigned_to == $user->id) {
                    $driver->update([
                        'assigned_to' => $newAssignedUserIds[0],
                        'resigned_leads' => $userName,
                    ]);
                }
            }
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
