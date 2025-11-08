<?php

namespace Modules\Marketing\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\app\Models\Company;

class CampaignMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'campaign_id',
        'metric_date',
        'impressions',
        'clicks',
        'conversions',
        'leads_generated',
        'spend',
        'revenue',
        'ctr',
        'cpc',
        'cpl',
        'roas',
    ];

    protected function casts(): array
    {
        return [
            'metric_date' => 'date',
            'spend' => 'decimal:2',
            'revenue' => 'decimal:2',
            'ctr' => 'decimal:2',
            'cpc' => 'decimal:2',
            'cpl' => 'decimal:2',
            'roas' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function calculateMetrics(): void
    {
        // CTR (Click-Through Rate)
        if ($this->impressions > 0) {
            $this->ctr = ($this->clicks / $this->impressions) * 100;
        }

        // CPC (Cost Per Click)
        if ($this->clicks > 0) {
            $this->cpc = $this->spend / $this->clicks;
        }

        // CPL (Cost Per Lead)
        if ($this->leads_generated > 0) {
            $this->cpl = $this->spend / $this->leads_generated;
        }

        // ROAS (Return on Ad Spend)
        if ($this->spend > 0) {
            $this->roas = ($this->revenue / $this->spend) * 100;
        }

        $this->save();
    }
}

