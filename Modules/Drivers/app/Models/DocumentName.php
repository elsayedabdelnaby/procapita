<?php

namespace Modules\Drivers\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentName extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'riding_company_ids',
        'type',
        'required',
        'notes',
        'status',
        'active',
    ];

    protected $casts = [
        'riding_company_ids' => 'array',
        'required' => 'boolean',
        'active' => 'boolean',
    ];

    // Relationships
    public function driverDocuments(): HasMany
    {
        return $this->hasMany(DriverDocument::class);
    }

    // Helper methods
    public function getRidingCompaniesAttribute()
    {
        if (empty($this->riding_company_ids)) {
            return collect();
        }

        return \Modules\RidingCarCompanies\app\Models\RidingCompany::whereIn('id', $this->riding_company_ids)->get();
    }

    protected static function boot(): void
    {
        parent::boot();

        // Cascade delete all related driver documents when document name is deleted
        static::deleting(function ($documentName) {
            // Delete all related driver documents
            \Modules\Drivers\app\Models\DriverDocument::where('document_name_id', $documentName->id)->delete();
        });
    }
}
