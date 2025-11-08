<?php

namespace Modules\Marketing\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Traits\HasSlug;

class CampaignStatus extends Model
{
    use HasFactory, HasSlug;

    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'description',
        'color',
        'is_active',
        'is_final',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_final' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeFinal($query)
    {
        return $query->where('is_final', true);
    }
}

