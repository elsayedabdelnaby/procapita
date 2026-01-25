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

    /**
     * Track if slug was changed due to duplication during creation
     */
    public static ?array $slugChangeInfo = null;

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

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            // Set is_active to true by default if not set
            if (! isset($model->is_active)) {
                $model->is_active = true;
            }
            
            // Store original name and slug to check if they were changed
            $originalName = $model->name ?? null;
            $originalSlug = $model->slug ?? null;
            
            // Generate unique name if duplicate exists
            $model->name = static::generateUniqueName($model->name);
            
            // Generate slug from name if not provided
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name);
            } else {
                // Normalize slug (trim and convert to lowercase slug format)
                $providedSlug = trim($model->slug);
                $normalizedSlug = \Illuminate\Support\Str::slug($providedSlug);
                
                // Always ensure slug is unique, even if provided
                $uniqueSlug = static::generateUniqueSlug($normalizedSlug);
                
                // Check if slug was changed due to duplication
                if ($uniqueSlug !== $normalizedSlug) {
                    // Store info that slug was changed due to duplication
                    static::$slugChangeInfo = [
                        'was_duplicate' => true,
                        'original_slug' => $originalSlug,
                        'new_slug' => $uniqueSlug,
                    ];
                } else {
                    // Reset slug change info if slug is unique
                    static::$slugChangeInfo = null;
                }
                
                $model->slug = $uniqueSlug;
            }
        });
    }
    
    public static function generateUniqueName(string $name): string
    {
        $uniqueName = $name;
        $originalName = $name;
        $counter = 1;

        // Check for existing name (including soft deleted)
        while (static::withTrashed()->where('name', $uniqueName)->exists()) {
            $uniqueName = $originalName . $counter;
            $counter++;
        }

        return $uniqueName;
    }

    public static function generateUniqueSlug(string $name): string
    {
        $slug = \Illuminate\Support\Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        // Check for existing slug (including soft deleted)
        while (static::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
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

