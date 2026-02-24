<?php

namespace Modules\Core\app\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyDocumentRequirement extends Model
{
    protected $table = 'company_document_requirements';

    protected $fillable = [
        'company_id',
        'name',
        'type',
        'required',
        'instructions',
        'active',
        'default_status',
    ];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeRequired($query)
    {
        return $query->where('required', true);
    }
}
