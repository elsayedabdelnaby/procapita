<?php

namespace Modules\Drivers\app\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Core\app\Models\Company;

class DriverList extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'company_id',
        'created_by',
        'columns',
        'all_conditions',
        'any_conditions',
        'shared_with_users',
        'shared_with_groups',
        'is_shared',
        'is_default',
        'show_in_metrics',
        'default_sort_column',
        'default_sort_order',
    ];

    protected function casts(): array
    {
        return [
            'columns' => 'array',
            'all_conditions' => 'array',
            'any_conditions' => 'array',
            'shared_with_users' => 'array',
            'shared_with_groups' => 'array',
            'is_shared' => 'boolean',
            'is_default' => 'boolean',
            'show_in_metrics' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if list is accessible by user
     */
    public function isAccessibleBy(User $user): bool
    {
        // Creator can always access
        if ($this->created_by === $user->id) {
            return true;
        }

        // If not shared, only creator can access
        if (! $this->is_shared) {
            return false;
        }

        // Check if shared with all users
        if ($this->is_shared && empty($this->shared_with_users) && empty($this->shared_with_groups)) {
            return true;
        }

        // Check if shared with user
        if (is_array($this->shared_with_users) && in_array($user->id, $this->shared_with_users)) {
            return true;
        }

        // TODO: Check if shared with user's groups (if groups are implemented)
        // if (is_array($this->shared_with_groups) && $user->hasGroup($this->shared_with_groups)) {
        //     return true;
        // }

        return false;
    }
}
