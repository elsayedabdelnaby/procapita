<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
    use CausesActivity, HasFactory, HasRoles, LogsActivity, Notifiable, TwoFactorAuthenticatable;

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
     * This includes the current user and all users in subordinate roles
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
            // If user has no roles, they can only see themselves
            return [$this->id];
        }

        // Get all subordinate roles (roles below user's roles in hierarchy)
        $subordinateRoleIds = \Modules\Core\app\Models\Role::whereIn('id', $userRoleIds)
            ->get()
            ->flatMap(function ($role) {
                return $this->getDescendantRoleIds($role);
            })
            ->unique()
            ->toArray();

        // Include user's own roles
        $allRoleIds = array_unique(array_merge($userRoleIds, $subordinateRoleIds));

        // Get all users with these roles (including current user)
        $subordinateUserIds = User::whereHas('roles', function ($query) use ($allRoleIds) {
            $query->whereIn('roles.id', $allRoleIds);
        })
        ->where('company_id', $this->company_id)
        ->pluck('id')
        ->toArray();

        // Always include current user
        if (!in_array($this->id, $subordinateUserIds)) {
            $subordinateUserIds[] = $this->id;
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
