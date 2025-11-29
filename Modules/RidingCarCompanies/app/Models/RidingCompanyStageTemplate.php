<?php

namespace Modules\RidingCarCompanies\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class RidingCompanyStageTemplate extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'riding_company_stage_templates';

    protected $fillable = [
        'riding_company_id',
        'name',
        'order',
        'target_value',
        'target_unit',
        'duration_days',
        'strict_sequence',
        'allow_cumulative',
        'description',
        'active',
        'commission_value',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'target_value' => 'integer',
            'duration_days' => 'integer',
            'strict_sequence' => 'boolean',
            'allow_cumulative' => 'boolean',
            'active' => 'boolean',
            'commission_value' => 'decimal:2',
        ];
    }

    protected static function newFactory()
    {
        return \Modules\RidingCarCompanies\database\factories\RidingCompanyStageTemplateFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'order', 'target_value', 'target_unit', 'duration_days', 'strict_sequence', 'allow_cumulative', 'active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(RidingCompany::class);
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeForCompany($query, int $ridingCompanyId)
    {
        return $query->where('riding_company_id', $ridingCompanyId);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeStrictSequence($query)
    {
        return $query->where('strict_sequence', true);
    }

    public function scopeAllowCumulative($query)
    {
        return $query->where('allow_cumulative', true);
    }
}

