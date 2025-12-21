<?php

namespace Modules\RidingCarCompanies\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class RidingCompanyIntegrationSetting extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'riding_company_integration_settings';

    protected $fillable = [
        'riding_company_id',
        'type',
        'config',
        'active',
        'facebook_access_token',
        'facebook_user_id',
        'facebook_user_name',
        'facebook_page_id',
        'facebook_form_id',
        'facebook_field_mapping',
        'facebook_token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'active' => 'boolean',
            'facebook_field_mapping' => 'array',
            'facebook_token_expires_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            // Set active to true by default if not set
            if (! isset($model->active)) {
                $model->active = true;
            }
        });
    }

    protected static function newFactory()
    {
        return \Modules\RidingCarCompanies\database\factories\RidingCompanyIntegrationSettingFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['type', 'config', 'active'])
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

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeWebhooks($query)
    {
        return $query->where('type', 'webhook');
    }

    public function scopeApi($query)
    {
        return $query->where('type', 'api');
    }

    public function scopeCsv($query)
    {
        return $query->where('type', 'csv');
    }
}

