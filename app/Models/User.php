<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Modules\Core\app\Models\Company;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\CausesActivity;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use CausesActivity, HasFactory, HasRoles, LogsActivity, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'mobile1',
        'mobile2',
        'company_id',
        'riding_company_id',
        'team_leader_id',
        'account_manager_id',
        'is_super_admin',
        'is_company_admin',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_super_admin' => 'boolean',
            'is_company_admin' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'company_id', 'riding_company_id', 'is_super_admin', 'is_company_admin', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(RidingCompany::class);
    }

    public function teamLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_leader_id');
    }

    public function teamMembers(): HasMany
    {
        return $this->hasMany(User::class, 'team_leader_id');
    }

    public function accountManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function accountManagedUsers(): HasMany
    {
        return $this->hasMany(User::class, 'account_manager_id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin === true;
    }

    public function isCompanyAdmin(): bool
    {
        return $this->is_company_admin === true;
    }

    public function canAccessCompany(int $companyId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->company_id === $companyId;
    }

    public function canAccessModule(string $moduleName): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->isCompanyAdmin()) {
            // Company Admin has access to RidingCarCompanies module by default
            if ($moduleName === 'ridingcarcompanies') {
                return true;
            }

            return $this->company?->hasModule($moduleName) ?? false;
        }

        // Check if user has any permission for this module
        // Use try-catch to handle non-existent permissions gracefully
        try {
            if ($this->hasPermissionTo("{$moduleName}.*")) {
                return true;
            }
        } catch (\Spatie\Permission\Exceptions\PermissionDoesNotExist $e) {
            // Permission doesn't exist, continue checking
        }

        // Check for specific module permissions
        $modulePermissions = [
            "{$moduleName}.*.create",
            "{$moduleName}.*.read",
            "{$moduleName}.*.update",
            "{$moduleName}.*.delete",
        ];

        foreach ($modulePermissions as $permission) {
            try {
                if ($this->hasPermissionTo($permission)) {
                    return true;
                }
            } catch (\Spatie\Permission\Exceptions\PermissionDoesNotExist $e) {
                // Permission doesn't exist, continue checking
            }
        }

        // Check if user has any permission that starts with the module name
        $userPermissions = $this->getAllPermissions();
        foreach ($userPermissions as $permission) {
            if (str_starts_with($permission->name, "{$moduleName}.")) {
                return true;
            }
        }

        return false;
    }

    public function scopeSuperAdmins($query)
    {
        return $query->where('is_super_admin', true);
    }

    public function scopeCompanyAdmins($query)
    {
        return $query->where('is_company_admin', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Get all users that are below the current user in the role hierarchy
     * Excludes users in the same roles, higher roles, and the current user
     * Only includes users in subordinate (descendant) roles
     */
    public function getSubordinateUserIds(): array
    {
        if ($this->isSuperAdmin()) {
            // Super admin can see all users
            return User::where('company_id', $this->company_id)
                ->pluck('id')
                ->toArray();
        }

        $userRoleIds = $this->roles()->pluck('id')->toArray();

        if (empty($userRoleIds)) {
            // If user has no roles, they can't see any other users
            return [];
        }

        // Get all user's roles with hierarchy information
        $userRoles = \Modules\Core\app\Models\Role::whereIn('id', $userRoleIds)
            ->where('team_id', $this->company_id)
            ->get();

        if ($userRoles->isEmpty()) {
            return [];
        }

        // Get all subordinate roles (roles below user's roles in hierarchy)
        // Only descendant roles, NOT same level or higher
        $subordinateRoleIds = [];
        foreach ($userRoles as $role) {
            if ($role->hierarchy_path) {
                // Get all roles that are descendants (using hierarchy_path)
                // Roles with hierarchy_path that starts with user's hierarchy_path + ':'
                $descendants = \Modules\Core\app\Models\Role::where('hierarchy_path', 'like', $role->hierarchy_path . ':%')
                    ->where('team_id', $role->team_id)
                    ->pluck('id')
                    ->toArray();
                $subordinateRoleIds = array_merge($subordinateRoleIds, $descendants);
            }
        }

        // Remove duplicates
        $subordinateRoleIds = array_unique($subordinateRoleIds);

        // If no subordinate roles, return empty array
        if (empty($subordinateRoleIds)) {
            return [];
        }

        // Get user's minimum hierarchy level (to exclude same or higher levels)
        $minHierarchyLevel = $userRoles->min('hierarchy_level');

        // First, explicitly exclude users who have the same role(s) as current user
        // This is critical: users in the same role should NOT see each other's data
        $excludedUserIds = User::where('company_id', $this->company_id)
            ->where('id', '!=', $this->id)
            ->whereHas('roles', function ($query) use ($userRoleIds) {
                $query->whereIn('roles.id', $userRoleIds);
            })
            ->pluck('id')
            ->toArray();

        // Also exclude users who have roles at same or higher hierarchy level
        $userHierarchyLevels = $userRoles->pluck('hierarchy_level')->toArray();
        $minUserHierarchyLevel = !empty($userHierarchyLevels) ? min($userHierarchyLevels) : null;
        
        $excludedByLevelUserIds = [];
        if ($minUserHierarchyLevel !== null) {
            $excludedByLevelUserIds = User::where('company_id', $this->company_id)
                ->where('id', '!=', $this->id)
                ->whereHas('roles', function ($query) use ($minUserHierarchyLevel) {
                    $query->where('roles.hierarchy_level', '<=', $minUserHierarchyLevel);
                })
                ->pluck('id')
                ->toArray();
        }

        // Combine all excluded user IDs
        $allExcludedUserIds = array_unique(array_merge($excludedUserIds, $excludedByLevelUserIds));

        // Get all users who have ONLY subordinate roles (below current user's roles)
        // Exclude users who have same role, same level, or higher level
        $candidateUsers = User::where('company_id', $this->company_id)
            ->where('id', '!=', $this->id)
            ->whereNotIn('id', $allExcludedUserIds) // Explicitly exclude same role users
            ->whereHas('roles', function ($query) use ($subordinateRoleIds) {
                // User must have at least one subordinate role
                $query->whereIn('roles.id', $subordinateRoleIds);
            })
            ->with(['roles' => function ($query) {
                $query->where('roles.team_id', $this->company_id);
            }])
            ->get();

        // Final filter: exclude users who have ANY role at same level or higher, or same role
        $subordinateUserIds = [];
        foreach ($candidateUsers as $candidateUser) {
            $hasSameOrHigherRole = false;

            foreach ($candidateUser->roles as $candidateRole) {
                // Check against all current user's roles
                foreach ($userRoles as $userRole) {
                    // Same role - CRITICAL: users in same role should NOT see each other
                    if ($candidateRole->id === $userRole->id) {
                        $hasSameOrHigherRole = true;
                        break 2;
                    }

                    // Same or higher hierarchy level
                    if ($candidateRole->hierarchy_level <= $userRole->hierarchy_level) {
                        $hasSameOrHigherRole = true;
                        break 2;
                    }

                    // Ancestor role (higher in hierarchy)
                    // If candidate's hierarchy_path is a prefix of user's hierarchy_path, it's an ancestor
                    if ($candidateRole->hierarchy_path && $userRole->hierarchy_path) {
                        if ($candidateRole->hierarchy_path !== $userRole->hierarchy_path &&
                            str_contains($userRole->hierarchy_path, $candidateRole->hierarchy_path)) {
                            $hasSameOrHigherRole = true;
                            break 2;
                        }
                    }
                }
            }

            // Only include if user has NO same or higher roles
            if (!$hasSameOrHigherRole) {
                $subordinateUserIds[] = $candidateUser->id;
            }
        }

        return $subordinateUserIds;
    }

    /**
     * Get all descendant role IDs for a given role
     */
    protected function getDescendantRoleIds(\Modules\Core\app\Models\Role $role): array
    {
        $roleIds = [];

        // Get direct children
        $children = \Modules\Core\app\Models\Role::where('parent_id', $role->id)
            ->where('team_id', $role->team_id)
            ->get();

        foreach ($children as $child) {
            $roleIds[] = $child->id;
            // Recursively get descendants
            $roleIds = array_merge($roleIds, $this->getDescendantRoleIds($child));
        }

        return $roleIds;
    }

    /**
     * Check if a user ID is a subordinate of the current user
     */
    public function isSubordinate(int $userId): bool
    {
        $subordinateIds = $this->getSubordinateUserIds();

        return in_array($userId, $subordinateIds);
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (User $user) {
            if (! isset($user->is_active)) {
                $user->is_active = true;
            }
        });
    }
}
