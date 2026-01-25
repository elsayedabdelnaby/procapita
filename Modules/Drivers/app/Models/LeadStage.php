<?php

namespace Modules\Drivers\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class LeadStage extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
        'order',
        'active',
        'requires_all_documents_approved',
        'commission_value',
        'riding_company_id',
        'riding_company_ids',
    ];

    protected function casts(): array
    {
        $casts = [
            'order' => 'integer',
            'active' => 'boolean',
            'requires_all_documents_approved' => 'boolean',
            'commission_value' => 'decimal:2',
        ];
        
        // Only add riding_company_ids cast if column exists
        if (\Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids')) {
            $casts['riding_company_ids'] = 'array';
        }
        
        return $casts;
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            // Generate slug from name if not provided
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name);
            } else {
                // Normalize slug (trim and convert to lowercase slug format)
                $providedSlug = trim($model->slug);
                $normalizedSlug = Str::slug($providedSlug);
                
                // Always ensure slug is unique, even if provided
                $model->slug = static::generateUniqueSlug($normalizedSlug);
            }
            // Set active to true by default if not set
            if (! isset($model->active)) {
                $model->active = true;
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name')) {
                // If slug is empty or name changed, regenerate slug
                if (empty($model->slug) || $model->isDirty('name')) {
                    $model->slug = static::generateUniqueSlug($model->name, $model->id);
                }
            }
        });
    }

    public static function generateUniqueSlug(string $name, ?int $excludeId = null): string
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        $query = static::where('slug', $slug);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        while ($query->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $query = static::where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            $counter++;
        }

        return $slug;
    }

    protected static function newFactory()
    {
        return \Modules\Drivers\database\factories\LeadStageFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'slug', 'color', 'order', 'active', 'requires_all_documents_approved', 'commission_value'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function drivers(): HasMany
    {
        return $this->hasMany(Driver::class, 'lead_stage_id');
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(\Modules\RidingCarCompanies\app\Models\RidingCompany::class);
    }

    public function getRidingCompaniesAttribute()
    {
        $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids');
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_id');
        
        if ($hasRidingCompanyIds && !empty($this->riding_company_ids)) {
            return \Modules\RidingCarCompanies\app\Models\RidingCompany::whereIn('id', $this->riding_company_ids)->get();
        }
        
        // Fallback to single riding_company_id if riding_company_ids is empty or doesn't exist
        if ($hasRidingCompanyId && $this->riding_company_id) {
            return collect([$this->ridingCompany])->filter();
        }
        
        return collect();
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeRequiresDocumentsApproval($query)
    {
        return $query->where('requires_all_documents_approved', true);
    }
}

