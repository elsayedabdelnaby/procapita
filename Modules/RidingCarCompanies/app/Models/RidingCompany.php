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
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'api_settings' => 'array',
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
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name);
            }
            // Set active to true by default if not set
            // If active is not in the attributes array, set it to true
            $attributes = $model->getAttributes();
            if (! array_key_exists('active', $attributes)) {
                $model->active = true;
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name') && empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name);
            }
        });
    }

    public static function generateUniqueSlug(string $name): string
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        while (static::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
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
}

