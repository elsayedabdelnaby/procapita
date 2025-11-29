<?php

namespace Modules\Marketing\app\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Traits\HasSlug;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Campaign extends Model
{
    use HasFactory, HasSlug, LogsActivity, SoftDeletes;

    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'description',
        'campaign_type_id',
        'campaign_status_id',
        'budget_type',
        'daily_budget',
        'campaign_channel_id',
        'expected_budget',
        'actual_spend',
        'expected_roi',
        'actual_roi',
        'expected_leads',
        'actual_leads',
        'expected_conversions',
        'actual_conversions',
        'expected_conversion_rate',
        'actual_conversion_rate',
        'expected_reach',
        'actual_reach',
        'expected_impressions',
        'actual_impressions',
        'expected_clicks',
        'actual_clicks',
        'expected_ctr',
        'actual_ctr',
        'expected_revenue',
        'actual_revenue',
        'start_date',
        'end_date',
        'assigned_to',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'daily_budget' => 'decimal:2',
            'expected_budget' => 'decimal:2',
            'actual_spend' => 'decimal:2',
            'expected_roi' => 'decimal:2',
            'actual_roi' => 'decimal:2',
            'expected_conversion_rate' => 'decimal:2',
            'actual_conversion_rate' => 'decimal:2',
            'expected_ctr' => 'decimal:2',
            'actual_ctr' => 'decimal:2',
            'expected_revenue' => 'decimal:2',
            'actual_revenue' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'status', 'budget_type', 'daily_budget', 'expected_budget', 'actual_spend', 'expected_leads', 'actual_leads'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(CampaignType::class, 'campaign_type_id');
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(CampaignStatus::class, 'campaign_status_id');
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(CampaignChannel::class, 'campaign_channel_id');
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(CampaignMetric::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updateActualMetrics(array $data): void
    {
        // Update actual metrics manually or from external integrations
        $this->fill($data);
        
        // Recalculate conversion rate
        if ($this->actual_leads > 0) {
            $this->actual_conversion_rate = ($this->actual_conversions / $this->actual_leads) * 100;
        }
        
        // Recalculate ROI
        if ($this->actual_spend > 0) {
            $this->actual_roi = (($this->actual_revenue - $this->actual_spend) / $this->actual_spend) * 100;
        }
        
        // Recalculate CTR
        if ($this->actual_impressions > 0) {
            $this->actual_ctr = ($this->actual_clicks / $this->actual_impressions) * 100;
        }
        
        $this->save();
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function getBudgetVariance(): float
    {
        return $this->actual_spend - $this->expected_budget;
    }

    public function getLeadVariance(): int
    {
        return $this->actual_leads - $this->expected_leads;
    }

    public function getPerformanceScore(): float
    {
        $score = 0;
        $factors = 0;

        // Budget performance (weight: 30%)
        if ($this->expected_budget > 0) {
            $budgetScore = 100 - (abs($this->getBudgetVariance()) / $this->expected_budget * 100);
            $score += max(0, $budgetScore) * 0.3;
            $factors += 0.3;
        }

        // Lead performance (weight: 40%)
        if ($this->expected_leads > 0) {
            $leadScore = ($this->actual_leads / $this->expected_leads) * 100;
            $score += min(100, $leadScore) * 0.4;
            $factors += 0.4;
        }

        // ROI performance (weight: 30%)
        if ($this->expected_roi > 0) {
            $roiScore = ($this->actual_roi / $this->expected_roi) * 100;
            $score += min(100, $roiScore) * 0.3;
            $factors += 0.3;
        }

        return $factors > 0 ? round($score / $factors, 2) : 0;
    }
}

