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
        'company_ids',
        'type',
        'required',
        'notes',
        'status',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'active' => 'boolean',
            'company_ids' => 'array',
        ];
    }


    // Relationships
    public function driverDocuments(): HasMany
    {
        return $this->hasMany(DriverDocument::class);
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
