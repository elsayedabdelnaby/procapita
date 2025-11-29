<?php

namespace Modules\RidingCarCompanies\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class RidingCompanyDocumentRequirement extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'riding_company_document_requirements';

    protected $fillable = [
        'riding_company_id',
        'name',
        'type',
        'required',
        'instructions',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'active' => 'boolean',
        ];
    }

    protected static function newFactory()
    {
        return \Modules\RidingCarCompanies\database\factories\RidingCompanyDocumentRequirementFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'type', 'required', 'instructions', 'active'])
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

    public function scopeRequired($query)
    {
        return $query->where('required', true);
    }

    public function scopeOptional($query)
    {
        return $query->where('required', false);
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeFileType($query)
    {
        return $query->where('type', 'file');
    }

    public function scopeTextType($query)
    {
        return $query->where('type', 'text');
    }

    public function scopePdfType($query)
    {
        return $query->where('type', 'pdf');
    }

    public function isFile(): bool
    {
        return $this->type === 'file';
    }

    public function isPdf(): bool
    {
        return $this->type === 'pdf';
    }

    public function isText(): bool
    {
        return $this->type === 'text';
    }

    protected static function boot(): void
    {
        parent::boot();

        // Helper method to create driver documents for a document requirement
        $createDriverDocuments = function ($documentRequirement) {
            // Only create documents if the requirement is active
            if (! $documentRequirement->active) {
                return;
            }

            // Get all drivers with the same riding company
            $drivers = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $documentRequirement->riding_company_id)
                ->whereNull('deleted_at')
                ->get(['id']);

            if ($drivers->isEmpty()) {
                return;
            }

            // Check which drivers already have this document requirement
            $existingDocuments = \Modules\Drivers\app\Models\DriverDocument::where('document_template_id', $documentRequirement->id)
                ->whereIn('driver_id', $drivers->pluck('id'))
                ->pluck('driver_id')
                ->toArray();

            // Create driver documents only for drivers who don't have this document yet
            $documents = [];
            foreach ($drivers as $driver) {
                if (! in_array($driver->id, $existingDocuments)) {
                    $documents[] = [
                        'driver_id' => $driver->id,
                        'document_template_id' => $documentRequirement->id,
                        'status' => 'pending',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            if (! empty($documents)) {
                \Modules\Drivers\app\Models\DriverDocument::insert($documents);
            }
        };

        // When a new document requirement is created, create driver documents for all existing drivers
        // Note: This is now controlled by the add_to_existing_drivers flag in the controller
        // static::created($createDriverDocuments);

        // When a document requirement is updated and becomes active, create documents for drivers who don't have it
        static::updated(function ($documentRequirement) use ($createDriverDocuments) {
            // Only create documents if the requirement was just activated (was inactive, now active)
            if ($documentRequirement->wasChanged('active') && $documentRequirement->active) {
                $createDriverDocuments($documentRequirement);
            }
        });
    }
}

