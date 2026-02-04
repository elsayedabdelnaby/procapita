<?php

namespace Modules\RidingCarCompanies\app\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class RidingCompany extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'uuid',
        'company_id',
        'name',
        'slug',
        'description',
        'country',
        'city',
        'logo_path',
        'contact_email',
        'contact_phone',
        'api_settings',
        'active',
        'created_by',
        'default_driver_user_id',
        'distribution_type',
        'max_drivers_per_day',
        'distribution_users',
        'distribution_scenarios',
        'last_distribution_date',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'api_settings' => 'array',
            'distribution_users' => 'array',
            'distribution_scenarios' => 'array',
            'last_distribution_date' => 'date',
        ];
    }

    protected static function newFactory()
    {
        return \Modules\RidingCarCompanies\database\factories\RidingCompanyFactory::new();
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            
            // Generate slug from name if not provided
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name, $model->company_id);
            } else {
                // Normalize slug (trim and convert to lowercase slug format)
                $providedSlug = trim($model->slug);
                $normalizedSlug = Str::slug($providedSlug);
                
                // Always ensure slug is unique within company, even if provided
                $model->slug = static::generateUniqueSlug($normalizedSlug, $model->company_id);
            }
            
            // Set active to true by default if not set
            // If active is not in the attributes array, set it to true
            $attributes = $model->getAttributes();
            if (! array_key_exists('active', $attributes)) {
                $model->active = true;
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name')) {
                // If slug is empty or name changed, regenerate slug
                if (empty($model->slug) || $model->isDirty('name')) {
                    $model->slug = static::generateUniqueSlug($model->name, $model->company_id, $model->id);
                }
            }
        });
    }

    public static function generateUniqueSlug(string $name, ?int $companyId = null, ?int $excludeId = null): string
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        // Check if table exists before querying
        if (!\Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
            return $slug;
        }

        // Check for existing slug within company (including soft deleted because RidingCompany uses SoftDeletes)
        $query = static::withTrashed()->where('slug', $slug);
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        while ($query->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $query = static::withTrashed()->where('slug', $slug);
            if ($companyId) {
                $query->where('company_id', $companyId);
            }
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            $counter++;
        }

        return $slug;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'slug', 'country', 'city', 'contact_email', 'contact_phone', 'active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(\Modules\Core\app\Models\Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function defaultDriverUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_driver_user_id');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeForCountry($query, string $country)
    {
        return $query->where('country', $country);
    }

    public function scopeForCity($query, string $city)
    {
        return $query->where('city', $city);
    }

    public function stageTemplates(): HasMany
    {
        return $this->hasMany(RidingCompanyStageTemplate::class)->ordered();
    }

    public function activeStageTemplates(): HasMany
    {
        return $this->hasMany(RidingCompanyStageTemplate::class)
            ->where('active', true)
            ->ordered();
    }

    public function integrations(): HasMany
    {
        return $this->hasMany(RidingCompanyIntegration::class);
    }

    public function activeIntegrations(): HasMany
    {
        return $this->hasMany(RidingCompanyIntegration::class)
            ->where('active', true);
    }

    public function documentRequirements(): HasMany
    {
        return $this->hasMany(RidingCompanyDocumentRequirement::class);
    }

    public function activeDocumentRequirements(): HasMany
    {
        return $this->hasMany(RidingCompanyDocumentRequirement::class)
            ->where('active', true);
    }

    public function requiredDocumentRequirements(): HasMany
    {
        return $this->hasMany(RidingCompanyDocumentRequirement::class)
            ->where('active', true)
            ->where('required', true);
    }

    public function integrationSettings(): HasMany
    {
        return $this->hasMany(RidingCompanyIntegrationSetting::class);
    }

    public function activeIntegrationSettings(): HasMany
    {
        return $this->hasMany(RidingCompanyIntegrationSetting::class)
            ->where('active', true);
    }

    /**
     * Get the logo URL.
     */
    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) {
            return null;
        }

        // If logo_path is already a full URL, return it
        if (filter_var($this->logo_path, FILTER_VALIDATE_URL)) {
            return $this->logo_path;
        }

        // Otherwise, return route URL for logo
        return route('ridingcarcompanies.ridingcompanies.logo', $this->id);
    }
}

