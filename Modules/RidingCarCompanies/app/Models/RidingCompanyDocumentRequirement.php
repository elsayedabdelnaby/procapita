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
}

