<?php

namespace Modules\Drivers\app\Services;

use App\Models\User;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\DriverList;

class DriverListService
{
    /**
     * Get all lists accessible by the user
     */
    public function getAccessibleLists(User $user, ?int $companyId = null): array
    {
        $query = DriverList::query();

        // For non-super admins, get lists from the same company (or null company_id)
        // But also include shared lists - we'll filter by isAccessibleBy which handles the access logic
        if (! $user->isSuperAdmin() && $companyId) {
            // Get lists from same company OR lists that are shared (might be from different companies)
            $query->where(function ($q) use ($companyId) {
                $q->where(function ($subQ) use ($companyId) {
                    $subQ->where('company_id', $companyId)
                        ->orWhereNull('company_id');
                })
                // Also include all shared lists - isAccessibleBy will check if user has access
                ->orWhere('is_shared', true);
            });
        }

        $lists = $query->with('creator')
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get();

        // Log the lists found before filtering
        \Log::info('Lists found before filtering', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'total_lists' => $lists->count(),
            'list_ids' => $lists->pluck('id')->toArray(),
            'list_details' => $lists->map(function ($list) {
                return [
                    'id' => $list->id,
                    'name' => $list->name,
                    'company_id' => $list->company_id,
                    'is_shared' => $list->is_shared,
                    'shared_with_users' => $list->shared_with_users,
                    'created_by' => $list->created_by,
                ];
            })->toArray(),
        ]);

        // Filter by access
        $accessibleLists = $lists->filter(function ($list) use ($user) {
            $isAccessible = $list->isAccessibleBy($user);
            
            // Log for debugging
            \Log::info('Checking list access', [
                'list_id' => $list->id,
                'list_name' => $list->name,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'is_shared' => $list->is_shared,
                'shared_with_users' => $list->shared_with_users,
                'created_by' => $list->created_by,
                'is_accessible' => $isAccessible,
            ]);
            
            return $isAccessible;
        })->values()->map(function ($list) {
            return [
                'id' => $list->id,
                'name' => $list->name,
                'is_default' => $list->is_default,
                'is_shared' => $list->is_shared,
                'created_by' => $list->created_by,
                'creator_name' => $list->creator?->name,
                'all_conditions' => $list->all_conditions ?? [],
                'any_conditions' => $list->any_conditions ?? [],
            ];
        })->toArray();

        // Log final result
        \Log::info('Accessible lists for user', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'total_lists' => $lists->count(),
            'accessible_lists' => count($accessibleLists),
            'list_ids' => array_column($accessibleLists, 'id'),
        ]);

        return $accessibleLists;
    }

    /**
     * Create a new list
     */
    public function createList(array $data, User $user, ?int $companyId = null): DriverList
    {
        // If only one default list should exist, unset others
        if (isset($data['is_default']) && $data['is_default']) {
            DriverList::where('company_id', $companyId)
                ->orWhereNull('company_id')
                ->update(['is_default' => false]);
        }

        // Ensure shared_with_users is an array of integers
        $sharedWithUsers = $data['shared_with_users'] ?? [];
        if (! is_array($sharedWithUsers)) {
            $sharedWithUsers = [];
        }
        $sharedWithUsers = array_map('intval', array_filter($sharedWithUsers));

        return DriverList::create([
            'name' => $data['name'],
            'company_id' => $user->isSuperAdmin() ? ($companyId ?? null) : $user->company_id,
            'created_by' => $user->id,
            'columns' => $data['columns'] ?? [],
            'all_conditions' => $data['all_conditions'] ?? [],
            'any_conditions' => $data['any_conditions'] ?? [],
            'shared_with_users' => $sharedWithUsers,
            'shared_with_groups' => $data['shared_with_groups'] ?? [],
            'is_shared' => $data['is_shared'] ?? false,
            'is_default' => $data['is_default'] ?? false,
            'show_in_metrics' => $data['show_in_metrics'] ?? false,
            'default_sort_column' => $data['default_sort_column'] ?? null,
            'default_sort_order' => $data['default_sort_order'] ?? 'asc',
        ]);
    }

    /**
     * Update an existing list
     */
    public function updateList(DriverList $list, array $data): void
    {
        // If setting as default, unset others
        if (isset($data['is_default']) && $data['is_default']) {
            DriverList::where('id', '!=', $list->id)
                ->where(function ($q) use ($list) {
                    $q->where('company_id', $list->company_id)
                        ->orWhereNull('company_id');
                })
                ->update(['is_default' => false]);
        }

        // Ensure shared_with_users is an array of integers
        $sharedWithUsers = $data['shared_with_users'] ?? [];
        if (! is_array($sharedWithUsers)) {
            $sharedWithUsers = [];
        }
        // Filter out null/empty values and convert to integers
        $sharedWithUsers = array_values(array_map('intval', array_filter($sharedWithUsers, fn($id) => !empty($id))));

        // Log for debugging (remove in production)
        \Log::info('Updating list shared_with_users', [
            'list_id' => $list->id,
            'is_shared' => $data['is_shared'] ?? false,
            'shared_with_users' => $sharedWithUsers,
            'raw_data' => $data['shared_with_users'] ?? null,
        ]);

        $list->update([
            'name' => $data['name'] ?? $list->name,
            'columns' => $data['columns'] ?? $list->columns ?? [],
            'all_conditions' => $data['all_conditions'] ?? $list->all_conditions ?? [],
            'any_conditions' => $data['any_conditions'] ?? $list->any_conditions ?? [],
            'shared_with_users' => $sharedWithUsers,
            'shared_with_groups' => $data['shared_with_groups'] ?? $list->shared_with_groups ?? [],
            'is_shared' => $data['is_shared'] ?? $list->is_shared ?? false,
            'is_default' => $data['is_default'] ?? $list->is_default ?? false,
            'show_in_metrics' => $data['show_in_metrics'] ?? $list->show_in_metrics ?? false,
            'default_sort_column' => $data['default_sort_column'] ?? $list->default_sort_column ?? null,
            'default_sort_order' => $data['default_sort_order'] ?? $list->default_sort_order ?? 'asc',
        ]);

        // Refresh the model to ensure it has the latest data
        $list->refresh();

        // Log after refresh to verify data was saved correctly
        \Log::info('List updated and refreshed', [
            'list_id' => $list->id,
            'list_name' => $list->name,
            'is_shared' => $list->is_shared,
            'shared_with_users' => $list->shared_with_users,
            'raw_shared_with_users' => $list->getAttributes()['shared_with_users'] ?? null,
        ]);
    }

    /**
     * Get available fields for columns
     */
    public function getAvailableFields(): array
    {
        return [
            ['value' => 'id', 'label' => 'ID', 'type' => 'number'],
            ['value' => 'driver_num', 'label' => 'Driver Number', 'type' => 'text'],
            ['value' => 'duplicate', 'label' => 'Duplicate Count', 'type' => 'number'],
            ['value' => 'full_name', 'label' => 'Full Name', 'type' => 'text'],
            ['value' => 'phone', 'label' => 'Phone', 'type' => 'text'],
            ['value' => 'whatsapp_phone', 'label' => 'WhatsApp Phone', 'type' => 'text'],
            ['value' => 'email', 'label' => 'Email', 'type' => 'email'],
            ['value' => 'company_id', 'label' => 'Company', 'type' => 'picklist'],
            ['value' => 'riding_company_id', 'label' => 'Reseller', 'type' => 'picklist'],
            ['value' => 'campaign_id', 'label' => 'Campaign', 'type' => 'picklist'],
            ['value' => 'lead_source_id', 'label' => 'Lead Source', 'type' => 'picklist'],
            ['value' => 'lead_status_id', 'label' => 'Lead Status', 'type' => 'picklist'],
            ['value' => 'lead_status_comment', 'label' => 'Feedback Comment', 'type' => 'textarea'],
            ['value' => 'lead_stage_id', 'label' => 'Lead Stage', 'type' => 'picklist'],
            ['value' => 'current_stage_id', 'label' => 'Current Stage', 'type' => 'picklist'],
            ['value' => 'assigned_to', 'label' => 'Assigned To', 'type' => 'picklist'],
            ['value' => 'assigned_time', 'label' => 'Assigned Time', 'type' => 'datetime'],
            ['value' => 'team_leader_id', 'label' => 'Team Leader', 'type' => 'picklist'],
            ['value' => 'account_manager_id', 'label' => 'Account Manager', 'type' => 'picklist'],
            ['value' => 'resigned_leads', 'label' => 'Resigned Leads', 'type' => 'text'],
            ['value' => 'last_assigned_time', 'label' => 'Last Assigned Time', 'type' => 'datetime'],
            ['value' => 'last_assigned_date', 'label' => 'Last Assigned Date', 'type' => 'date'],
            ['value' => 'last_assigned_by', 'label' => 'Last Assigned By', 'type' => 'picklist'],
            ['value' => 'next_follow_up', 'label' => 'Next Follow-up', 'type' => 'datetime'],
            ['value' => 'next_time', 'label' => 'Next Time', 'type' => 'time'],
            ['value' => 'last_follow_up', 'label' => 'Last Follow-up', 'type' => 'datetime'],
            ['value' => 'notes', 'label' => 'Notes', 'type' => 'textarea'],
            ['value' => 'cancel_reason', 'label' => 'Cancel Reasons', 'type' => 'text'],
            ['value' => 'vehicle_type', 'label' => 'Vehicle Type', 'type' => 'text'],
            ['value' => 'car_or_scooter', 'label' => 'Car or Scooter', 'type' => 'picklist'],
            ['value' => 'vehicle_type_and_year', 'label' => 'Vehicle Type and Year', 'type' => 'text'],
            ['value' => 'has_worked_before', 'label' => 'Has the driver worked before?', 'type' => 'text'],
            ['value' => 'worked_with_us_before', 'label' => 'Worked with us before', 'type' => 'text'],
            ['value' => 'city', 'label' => 'City', 'type' => 'text'],
            ['value' => 'governorate', 'label' => 'Governorate', 'type' => 'text'],
            ['value' => 'feedback_count', 'label' => 'Feedback Count', 'type' => 'number'],
            ['value' => 'uuid', 'label' => 'UUID', 'type' => 'text'],
            ['value' => 'created_at', 'label' => 'Created At', 'type' => 'datetime'],
            ['value' => 'updated_at', 'label' => 'Updated At', 'type' => 'datetime'],
            ['value' => 'allow_duplicate', 'label' => 'Allow Duplicate', 'type' => 'checkbox'],
            ['value' => 'confirm_duplicate', 'label' => 'Confirm Duplicate', 'type' => 'checkbox'],
        ];
    }

    /**
     * Get users available for sharing
     */
    public function getUsersForSharing(User $user, ?int $companyId = null): array
    {
        if ($user->isSuperAdmin()) {
            $users = \App\Models\User::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email']);
        } else {
            $subordinateUserIds = $user->getSubordinateUserIds() ?? [];
            if (empty($subordinateUserIds)) {
                $subordinateUserIds = [$user->id];
            }
            $users = \App\Models\User::whereIn('id', $subordinateUserIds)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email']);
        }

        return $users->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
        ])->toArray();
    }

    /**
     * Apply list conditions to driver query
     */
    public function applyListConditions($query, DriverList $list): void
    {
        // Apply all conditions (AND)
        if (! empty($list->all_conditions) && is_array($list->all_conditions)) {
            foreach ($list->all_conditions as $condition) {
                $this->applyCondition($query, $condition, 'and');
            }
        }

        // Apply any conditions (OR)
        if (! empty($list->any_conditions) && is_array($list->any_conditions)) {
            $query->where(function ($q) use ($list) {
                $firstCondition = true;
                foreach ($list->any_conditions as $condition) {
                    // First condition in OR group should use 'where', rest use 'or'
                    $this->applyCondition($q, $condition, $firstCondition ? 'and' : 'or');
                    $firstCondition = false;
                }
            });
        }
    }

    /**
     * Apply a single condition to query
     */
    protected function applyCondition($query, array $condition, string $logic = 'and'): void
    {
        $field = $condition['field'] ?? null;
        $operator = $condition['operator'] ?? null;
        $value = $condition['value'] ?? null;

        if (! $field || ! $operator) {
            return;
        }

        // Skip virtual fields that don't exist in database
        // Note: confirm_duplicate is now a real field in database, so we don't skip it
        if ($field === 'allow_duplicate') {
            // This is a UI-only field, not stored in database
            // Return without applying condition
            return;
        }

        $method = $logic === 'or' ? 'orWhere' : 'where';

        switch ($operator) {
            case 'equals':
                $query->{$method}($field, $value);
                break;
            case 'not_equal_to':
                $query->{$method}($field, '!=', $value);
                break;
            case 'starts_with':
                $query->{$method}($field, 'like', $value.'%');
                break;
            case 'ends_with':
                $query->{$method}($field, 'like', '%'.$value);
                break;
            case 'contains':
                $query->{$method}($field, 'like', '%'.$value.'%');
                break;
            case 'does_not_contain':
                $query->{$method}($field, 'not like', '%'.$value.'%');
                break;
            case 'is_empty':
                $query->{$method}(function ($q) use ($field) {
                    $q->whereNull($field)->orWhere($field, '');
                });
                break;
            case 'is_not_empty':
                $query->{$method}(function ($q) use ($field) {
                    $q->whereNotNull($field)->where($field, '!=', '');
                });
                break;
                // Date operators
            case 'before':
                $query->{$method}($field, '<', $value);
                break;
            case 'after':
                $query->{$method}($field, '>', $value);
                break;
            case 'between':
                if (is_array($value) && count($value) === 2) {
                    if ($method === 'where') {
                        $query->whereBetween($field, $value);
                    } else {
                        $query->orWhereBetween($field, $value);
                    }
                }
                break;
                // Date relative operators
            case 'less_than_days_ago':
                if ($value) {
                    $query->{$method}($field, '<', now()->subDays((int) $value)->toDateString());
                }
                break;
            case 'more_than_days_ago':
                if ($value) {
                    // More than X days ago means the date is before (now - X days)
                    $query->{$method}($field, '<', now()->subDays((int) $value)->toDateString());
                }
                break;
            case 'in_less_than':
                if ($value) {
                    $startDate = now()->toDateString();
                    $endDate = now()->addDays((int) $value)->toDateString();
                    $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                        $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                    });
                }
                break;
            case 'in_more_than':
                if ($value) {
                    $query->{$method}($field, '>', now()->addDays((int) $value)->toDateString());
                }
                break;
            case 'days_ago':
                if ($value) {
                    $query->{$method}($field, '=', now()->subDays((int) $value)->toDateString());
                }
                break;
            case 'days_later':
                if ($value) {
                    $query->{$method}($field, '=', now()->addDays((int) $value)->toDateString());
                }
                break;
                // Date period operators
            case 'previous_week':
                $startDate = now()->startOfWeek()->subWeek()->toDateString();
                $endDate = now()->endOfWeek()->subWeek()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'current_week':
                $startDate = now()->startOfWeek()->toDateString();
                $endDate = now()->endOfWeek()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'next_week':
                $startDate = now()->startOfWeek()->addWeek()->toDateString();
                $endDate = now()->endOfWeek()->addWeek()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'previous_month':
                $startDate = now()->startOfMonth()->subMonth()->toDateString();
                $endDate = now()->endOfMonth()->subMonth()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'current_month':
                $startDate = now()->startOfMonth()->toDateString();
                $endDate = now()->endOfMonth()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'next_month':
                $startDate = now()->startOfMonth()->addMonth()->toDateString();
                $endDate = now()->endOfMonth()->addMonth()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'last_7_days':
                $query->{$method}($field, '>=', now()->subDays(7)->toDateString());
                break;
            case 'last_14_days':
                $query->{$method}($field, '>=', now()->subDays(14)->toDateString());
                break;
            case 'last_30_days':
                $query->{$method}($field, '>=', now()->subDays(30)->toDateString());
                break;
            case 'last_60_days':
                $query->{$method}($field, '>=', now()->subDays(60)->toDateString());
                break;
            case 'last_90_days':
                $query->{$method}($field, '>=', now()->subDays(90)->toDateString());
                break;
            case 'last_120_days':
                $query->{$method}($field, '>=', now()->subDays(120)->toDateString());
                break;
            case 'next_30_days':
                $startDate = now()->toDateString();
                $endDate = now()->addDays(30)->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'next_60_days':
                $startDate = now()->toDateString();
                $endDate = now()->addDays(60)->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'yesterday':
                $query->{$method}($field, '=', now()->yesterday()->toDateString());
                break;
            case 'today':
                $query->{$method}($field, '=', now()->toDateString());
                break;
            case 'tomorrow':
                $query->{$method}($field, '=', now()->tomorrow()->toDateString());
                break;
                // Fiscal Year and Quarter operators (assuming calendar year/quarter)
            case 'previous_fy':
                $startDate = now()->startOfYear()->subYear()->toDateString();
                $endDate = now()->endOfYear()->subYear()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'current_fy':
                $startDate = now()->startOfYear()->toDateString();
                $endDate = now()->endOfYear()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'next_fy':
                $startDate = now()->startOfYear()->addYear()->toDateString();
                $endDate = now()->endOfYear()->addYear()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'previous_fq':
                $now = now();
                $currentQuarter = ceil($now->month / 3);
                $previousQuarter = $currentQuarter - 1;
                $year = $now->year;
                if ($previousQuarter <= 0) {
                    $previousQuarter = 4;
                    $year = $year - 1;
                }
                $startMonth = ($previousQuarter - 1) * 3 + 1;
                $endMonth = $previousQuarter * 3;
                $startDate = \Carbon\Carbon::create($year, $startMonth, 1)->startOfMonth()->toDateString();
                $endDate = \Carbon\Carbon::create($year, $endMonth, 1)->endOfMonth()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'current_fq':
                $now = now();
                $currentQuarter = ceil($now->month / 3);
                $startMonth = ($currentQuarter - 1) * 3 + 1;
                $endMonth = $currentQuarter * 3;
                $startDate = \Carbon\Carbon::create($now->year, $startMonth, 1)->startOfMonth()->toDateString();
                $endDate = \Carbon\Carbon::create($now->year, $endMonth, 1)->endOfMonth()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
            case 'next_fq':
                $now = now();
                $currentQuarter = ceil($now->month / 3);
                $nextQuarter = $currentQuarter + 1;
                $year = $now->year;
                if ($nextQuarter > 4) {
                    $nextQuarter = 1;
                    $year = $year + 1;
                }
                $startMonth = ($nextQuarter - 1) * 3 + 1;
                $endMonth = $nextQuarter * 3;
                $startDate = \Carbon\Carbon::create($year, $startMonth, 1)->startOfMonth()->toDateString();
                $endDate = \Carbon\Carbon::create($year, $endMonth, 1)->endOfMonth()->toDateString();
                $query->{$method}(function ($q) use ($field, $startDate, $endDate) {
                    $q->where($field, '>=', $startDate)->where($field, '<=', $endDate);
                });
                break;
                // Time operators
            case 'less_than':
                $query->{$method}($field, '<', $value);
                break;
            case 'greater_than':
                $query->{$method}($field, '>', $value);
                break;
            case 'less_or_equal':
                $query->{$method}($field, '<=', $value);
                break;
            case 'greater_or_equal':
                $query->{$method}($field, '>=', $value);
                break;
                // Checkbox operators
            case 'is_enabled':
                $query->{$method}($field, true);
                break;
            case 'is_disabled':
                $query->{$method}($field, false);
                break;
        }
    }
}
