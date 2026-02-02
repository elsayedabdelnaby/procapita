<?php

namespace Modules\Drivers\app\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DriverFollowUp extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'driver_id',
        'assigned_to',
        'user_name',
        'sales_sign_2',
        'team_leader',
        'account_manager',
        'created_time',
        'lead_stage',
        'lead_status',
        'lead_status_comment',
        'driver_stage',
        'notes',
        'driver_num',
    ];

    protected function casts(): array
    {
        return [
            'created_time' => 'datetime',
        ];
    }

    protected static function newFactory()
    {
        return \Modules\Drivers\database\factories\DriverFollowUpFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['assigned_to', 'user_name', 'sales_sign_2', 'team_leader', 'account_manager', 'lead_stage', 'lead_status', 'lead_status_comment', 'driver_stage', 'notes', 'driver_num'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // Relationships
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // Scopes
    public function scopeForDriver($query, int $driverId)
    {
        return $query->where('driver_id', $driverId);
    }

    public function scopeForAssignedUser($query, int $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    public function scopeRecent($query)
    {
        return $query->orderBy('created_time', 'desc');
    }
}
