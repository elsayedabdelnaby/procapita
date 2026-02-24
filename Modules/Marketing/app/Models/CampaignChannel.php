<?php

namespace Modules\Marketing\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;
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

    /**
     * Resolve fillable to include riding_company_id only when the column exists (e.g. before remove_riding_company migration).
     */
    public function getFillable(): array
    {
        $fillable = parent::getFillable();
        if (Schema::hasColumn($this->getTable(), 'riding_company_id')) {
            $fillable = array_merge(array_slice($fillable, 0, 1), ['riding_company_id'], array_slice($fillable, 1));
        }

        return $fillable;
    }

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            $ridingCompanyId = Schema::hasColumn($model->getTable(), 'riding_company_id') ? $model->riding_company_id : null;
            // Override HasSlug trait behavior to check uniqueness with campaign_type_id (and riding_company_id when column exists)
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlugForChannel($model->name, $ridingCompanyId, $model->campaign_type_id);
            } else {
                // Normalize slug (trim and convert to lowercase slug format)
                $providedSlug = trim($model->slug);
                $normalizedSlug = \Illuminate\Support\Str::slug($providedSlug);
                $model->slug = static::generateUniqueSlugForChannel($normalizedSlug, $ridingCompanyId, $model->campaign_type_id);
            }
            
            // Set is_active to true by default if not set
            if (! isset($model->is_active)) {
                $model->is_active = true;
            }
        });
    }

    /**
     * Generate unique slug for CampaignChannel considering campaign_type_id (and riding_company_id when column exists).
     */
    public static function generateUniqueSlugForChannel(string $name, ?int $ridingCompanyId, int $campaignTypeId): string
    {
        $slug = \Illuminate\Support\Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;
        $table = (new static)->getTable();
        $hasRidingCompanyColumn = Schema::hasColumn($table, 'riding_company_id');

        while (static::query()
            ->when($hasRidingCompanyColumn, function ($query) use ($ridingCompanyId) {
                if ($ridingCompanyId !== null) {
                    $query->where('riding_company_id', $ridingCompanyId);
                } else {
                    $query->whereNull('riding_company_id');
                }
            })
            ->where('campaign_type_id', $campaignTypeId)
            ->where('slug', $slug)
            ->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(\Modules\RidingCarCompanies\app\Models\RidingCompany::class);
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

    public function scopeForRidingCompany($query, int $ridingCompanyId)
    {
        $table = $query->getModel()->getTable();
        if (! Schema::hasColumn($table, 'riding_company_id')) {
            return $query;
        }

        return $query->where('riding_company_id', $ridingCompanyId);
    }

    public function scopeForType($query, int $campaignTypeId)
    {
        return $query->where('campaign_type_id', $campaignTypeId);
    }
}

