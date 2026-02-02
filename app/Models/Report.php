<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\app\Models\Company;

class Report extends Model
{
    protected $fillable = [
        'report_folder_id',
        'report_type',
        'report_name',
        'primary_module',
        'related_modules',
        'description',
        'share_report',
        'settings',
        'user_id',
        'company_id',
    ];

    protected function casts(): array
    {
        return [
            'related_modules' => 'array',
            'share_report' => 'array',
            'settings' => 'array',
        ];
    }

    public function reportFolder(): BelongsTo
    {
        return $this->belongsTo(ReportFolder::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
