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

    /**
     * Accessor to ensure shared_with_users is always an array
     */
    public function getSharedWithUsersAttribute($value)
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
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
            \Log::info('List accessible by creator', [
                'list_id' => $this->id,
                'list_name' => $this->name,
                'user_id' => $user->id,
                'user_name' => $user->name,
            ]);
            return true;
        }

        // If not shared, only creator can access
        if (! $this->is_shared) {
            \Log::info('List not shared', [
                'list_id' => $this->id,
                'list_name' => $this->name,
                'user_id' => $user->id,
                'user_name' => $user->name,
            ]);
            return false;
        }

        // Get shared_with_users - use accessor which handles JSON decoding
        $sharedWithUsers = $this->shared_with_users;
        
        // Ensure it's an array
        if (! is_array($sharedWithUsers)) {
            $sharedWithUsers = [];
        }

        // Get shared_with_groups - handle JSON string or array
        $sharedWithGroups = $this->shared_with_groups;
        if (is_string($sharedWithGroups)) {
            $sharedWithGroups = json_decode($sharedWithGroups, true) ?? [];
        }
        if (! is_array($sharedWithGroups)) {
            $sharedWithGroups = [];
        }

        // Check if shared with all users (empty arrays means shared with all)
        if (empty($sharedWithUsers) && empty($sharedWithGroups)) {
            \Log::info('List shared with all users', [
                'list_id' => $this->id,
                'list_name' => $this->name,
                'user_id' => $user->id,
                'user_name' => $user->name,
            ]);
            return true;
        }

        // Check if shared with user
        // Convert user IDs to integers for comparison
        $sharedWithUsers = array_map('intval', array_filter($sharedWithUsers, fn($id) => !empty($id)));
        $userId = (int) $user->id;
        
        // Log for debugging
        \Log::info('Checking list access', [
            'list_id' => $this->id,
            'list_name' => $this->name,
            'user_id' => $userId,
            'user_name' => $user->name,
            'is_shared' => $this->is_shared,
            'shared_with_users' => $sharedWithUsers,
            'user_in_list' => in_array($userId, $sharedWithUsers, true),
            'raw_shared_with_users' => $this->getAttributes()['shared_with_users'] ?? null,
        ]);
        
        if (in_array($userId, $sharedWithUsers, true)) {
            \Log::info('User found in shared_with_users', [
                'list_id' => $this->id,
                'list_name' => $this->name,
                'user_id' => $userId,
                'user_name' => $user->name,
            ]);
            return true;
        }

        // TODO: Check if shared with user's groups (if groups are implemented)
        // if (is_array($sharedWithGroups) && $user->hasGroup($sharedWithGroups)) {
        //     return true;
        // }

        \Log::info('List not accessible - user not in shared list', [
            'list_id' => $this->id,
            'list_name' => $this->name,
            'user_id' => $userId,
            'user_name' => $user->name,
            'shared_with_users' => $sharedWithUsers,
        ]);
        return false;
    }
}
