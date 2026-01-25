<?php

namespace Modules\Drivers\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DriverStage extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'driver_id',
        'name',
        'riding_company_id',
        'riding_company_ids',
        'stage_order',
        'status',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'stage_order' => 'integer',
            'completed_at' => 'datetime',
            'riding_company_ids' => 'array',
        ];
    }

    protected static function newFactory()
    {
        return \Modules\Drivers\database\factories\DriverStageFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'completed_at', 'notes'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // Relationships
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(RidingCompany::class);
    }

    // Helper methods
    public function getRidingCompaniesAttribute()
    {
        if (empty($this->riding_company_ids)) {
            // Fallback to single riding_company_id if riding_company_ids is empty
            if ($this->riding_company_id) {
                return collect([$this->ridingCompany]);
            }
            return collect();
        }

        return \Modules\RidingCarCompanies\app\Models\RidingCompany::whereIn('id', $this->riding_company_ids)->get();
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('stage_order');
    }

    // Helper methods
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }
}
