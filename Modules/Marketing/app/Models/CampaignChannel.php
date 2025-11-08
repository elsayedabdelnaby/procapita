<?php

namespace Modules\Marketing\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Traits\HasSlug;

class CampaignChannel extends Model
{
    use HasFactory, HasSlug;

    protected $fillable = [
        'company_id',
        'campaign_type_id',
        'name',
        'slug',
        'description',
        'icon',
        'settings',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function campaignType(): BelongsTo
    {
        return $this->belongsTo(CampaignType::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeForType($query, int $campaignTypeId)
    {
        return $query->where('campaign_type_id', $campaignTypeId);
    }
}

