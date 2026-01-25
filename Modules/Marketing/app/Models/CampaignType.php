<?php

namespace Modules\Marketing\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Traits\HasSlug;

class CampaignType extends Model
{
    use HasFactory, HasSlug;

    protected $fillable = [
        'company_id',
        'riding_company_id',
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            // Set is_active to true by default if not set
            if (! isset($model->is_active)) {
                $model->is_active = true;
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(\Modules\RidingCarCompanies\app\Models\RidingCompany::class);
    }

    public function channels(): HasMany
    {
        return $this->hasMany(CampaignChannel::class);
    }

    public function activeChannels(): HasMany
    {
        return $this->hasMany(CampaignChannel::class)->where('is_active', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeForRidingCompany($query, int $ridingCompanyId)
    {
        return $query->where('riding_company_id', $ridingCompanyId);
    }
}

