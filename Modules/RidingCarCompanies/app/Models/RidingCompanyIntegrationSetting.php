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
        'facebook_forms',
        'facebook_token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'active' => 'boolean',
            'facebook_field_mapping' => 'array',
            'facebook_forms' => 'array',
            'facebook_token_expires_at' => 'datetime',
        ];
    }

    /**
     * Get all configured Facebook forms
     */
    public function getFacebookFormsAttribute($value): array
    {
        if (empty($value)) {
            return [];
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }

        return is_array($value) ? $value : [];
    }

    /**
     * Get form IDs from facebook_forms array
     */
    public function getFacebookFormIds(): array
    {
        $forms = $this->facebook_forms ?? [];
        return array_column($forms, 'form_id');
    }

    /**
     * Get field mapping for a specific form
     */
    public function getFieldMappingForForm(string $formId): array
    {
        $forms = $this->facebook_forms ?? [];
        foreach ($forms as $form) {
            if (isset($form['form_id']) && $form['form_id'] === $formId) {
                return $form['field_mapping'] ?? [];
            }
        }
        return [];
    }

    /**
     * Add or update a form in the facebook_forms array
     */
    public function addOrUpdateForm(array $formData): void
    {
        $forms = $this->facebook_forms ?? [];
        $formId = $formData['form_id'] ?? null;

        if (!$formId) {
            return;
        }

        // Find existing form index
        $existingIndex = null;
        foreach ($forms as $index => $form) {
            if (isset($form['form_id']) && $form['form_id'] === $formId) {
                $existingIndex = $index;
                break;
            }
        }

        // Prepare form data
        $form = [
            'form_id' => $formId,
            'campaign_id' => $formData['campaign_id'] ?? null,
            'field_mapping' => $formData['field_mapping'] ?? [],
            'name' => $formData['name'] ?? null,
            'status' => $formData['status'] ?? null,
        ];

        if ($existingIndex !== null) {
            // Update existing form
            $forms[$existingIndex] = array_merge($forms[$existingIndex], $form);
        } else {
            // Add new form
            $forms[] = $form;
        }

        $this->facebook_forms = $forms;
    }

    /**
     * Remove a form from the facebook_forms array
     */
    public function removeForm(string $formId): bool
    {
        $forms = $this->facebook_forms ?? [];
        $updated = false;

        foreach ($forms as $index => $form) {
            if (isset($form['form_id']) && $form['form_id'] === $formId) {
                unset($forms[$index]);
                $updated = true;
                break;
            }
        }

        if ($updated) {
            $this->facebook_forms = array_values($forms); // Re-index array
        }

        return $updated;
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            // Set active to true by default if not set
            if (! isset($model->active)) {
                $model->active = true;
            }
            // Set config to empty array if not set (required field - MySQL doesn't allow default for JSON)
            if (! isset($model->config) || $model->config === null) {
                $model->config = [];
            }
        });
        
        static::saving(function ($model) {
            // Ensure config is always set before saving (safety check)
            if (! isset($model->config) || $model->config === null) {
                $model->config = [];
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

