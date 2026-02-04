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

class LeadStatus extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
        'order',
        'active',
        'duration_value',
        'duration_unit',
        'change_to_lead_status_id',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'active' => 'boolean',
            'duration_value' => 'integer',
        ];
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
        return \Modules\Drivers\database\factories\LeadStatusFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'slug', 'color', 'order', 'active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function drivers(): HasMany
    {
        return $this->hasMany(Driver::class);
    }

    public function changeToLeadStatus(): BelongsTo
    {
        return $this->belongsTo(LeadStatus::class, 'change_to_lead_status_id');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }
}

