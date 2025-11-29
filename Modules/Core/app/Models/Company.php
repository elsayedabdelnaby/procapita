<?php

namespace Modules\Core\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Company extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected static function newFactory()
    {
        return \Modules\Core\database\factories\CompanyFactory::new();
    }

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'logo',
        'is_active',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'slug', 'email', 'phone', 'address', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function users(): HasMany
    {
        return $this->hasMany(\App\Models\User::class);
    }

    public function admins(): HasMany
    {
        return $this->hasMany(\App\Models\User::class)
            ->where('is_company_admin', true);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(CompanyModule::class);
    }

    public function activeModules(): HasMany
    {
        return $this->hasMany(CompanyModule::class)
            ->where('is_active', true);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class, 'team_id');
    }

    public function permissions(): HasManyThrough
    {
        return $this->hasManyThrough(
            Permission::class,
            Role::class,
            'team_id',
            'id',
            'id',
            'id'
        );
    }

    public function hasModule(string $moduleName): bool
    {
        return $this->activeModules()
            ->where('module_name', $moduleName)
            ->exists();
    }

    public function activateModule(string $moduleName, ?array $settings = null): CompanyModule
    {
        return $this->modules()->updateOrCreate(
            ['module_name' => $moduleName],
            [
                'is_active' => true,
                'settings' => $settings,
            ]
        );
    }

    public function deactivateModule(string $moduleName): bool
    {
        return $this->modules()
            ->where('module_name', $moduleName)
            ->update(['is_active' => false]) > 0;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the logo URL.
     */
    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo) {
            return null;
        }

        // If logo is already a full URL, return it
        if (filter_var($this->logo, FILTER_VALIDATE_URL)) {
            return $this->logo;
        }

        // Otherwise, return storage URL
        return \Illuminate\Support\Facades\Storage::url($this->logo);
    }
}

