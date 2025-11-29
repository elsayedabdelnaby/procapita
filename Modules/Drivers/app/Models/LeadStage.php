<?php

namespace Modules\Drivers\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class LeadStage extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'riding_company_id',
        'name',
        'slug',
        'description',
        'color',
        'order',
        'active',
        'requires_all_documents_approved',
        'commission_value',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'active' => 'boolean',
            'requires_all_documents_approved' => 'boolean',
            'commission_value' => 'decimal:2',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name, $model->riding_company_id);
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name')) {
                // If slug is empty or name changed, regenerate slug
                if (empty($model->slug) || $model->isDirty('name')) {
                    $model->slug = static::generateUniqueSlug($model->name, $model->riding_company_id, $model->id);
                }
            }
        });
    }

    public static function generateUniqueSlug(string $name, ?int $ridingCompanyId = null, ?int $excludeId = null): string
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        $query = static::where('slug', $slug);
        if ($ridingCompanyId) {
            $query->where('riding_company_id', $ridingCompanyId);
        }
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        while ($query->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $query = static::where('slug', $slug);
            if ($ridingCompanyId) {
                $query->where('riding_company_id', $ridingCompanyId);
            }
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

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(RidingCompany::class);
    }

    public function drivers(): HasMany
    {
        return $this->hasMany(Driver::class, 'lead_stage_id');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeForRidingCompany($query, int $ridingCompanyId)
    {
        return $query->where('riding_company_id', $ridingCompanyId);
    }

    public function scopeRequiresDocumentsApproval($query)
    {
        return $query->where('requires_all_documents_approved', true);
    }
}

