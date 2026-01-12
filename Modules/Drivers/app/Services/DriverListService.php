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

        // Filter by company if not super admin
        if (! $user->isSuperAdmin() && $companyId) {
            $query->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)
                    ->orWhereNull('company_id');
            });
        }

        $lists = $query->with('creator')
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get();

        // Filter by access
        return $lists->filter(function ($list) use ($user) {
            return $list->isAccessibleBy($user);
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

        return DriverList::create([
            'name' => $data['name'],
            'company_id' => $user->isSuperAdmin() ? ($companyId ?? null) : $user->company_id,
            'created_by' => $user->id,
            'columns' => $data['columns'] ?? [],
            'all_conditions' => $data['all_conditions'] ?? [],
            'any_conditions' => $data['any_conditions'] ?? [],
            'shared_with_users' => $data['shared_with_users'] ?? [],
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

        $list->update([
            'name' => $data['name'],
            'columns' => $data['columns'] ?? [],
            'all_conditions' => $data['all_conditions'] ?? [],
            'any_conditions' => $data['any_conditions'] ?? [],
            'shared_with_users' => $data['shared_with_users'] ?? [],
            'shared_with_groups' => $data['shared_with_groups'] ?? [],
            'is_shared' => $data['is_shared'] ?? false,
            'is_default' => $data['is_default'] ?? false,
            'show_in_metrics' => $data['show_in_metrics'] ?? false,
            'default_sort_column' => $data['default_sort_column'] ?? null,
            'default_sort_order' => $data['default_sort_order'] ?? 'asc',
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
            ['value' => 'duplicate', 'label' => 'Duplicate', 'type' => 'number'],
            ['value' => 'duplicate', 'label' => 'Duplicate Count', 'type' => 'number'],
            ['value' => 'full_name', 'label' => 'Full Name', 'type' => 'text'],
            ['value' => 'phone', 'label' => 'Phone', 'type' => 'text'],
            ['value' => 'whatsapp_phone', 'label' => 'WhatsApp Phone', 'type' => 'text'],
            ['value' => 'email', 'label' => 'Email', 'type' => 'email'],
            ['value' => 'company_id', 'label' => 'Company', 'type' => 'picklist'],
            ['value' => 'riding_company_id', 'label' => 'Riding Company', 'type' => 'picklist'],
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
            ['value' => 'vehicle_type_and_year', 'label' => 'Vehicle Type and Year', 'type' => 'text'],
            ['value' => 'has_worked_before', 'label' => 'Has the driver worked before?', 'type' => 'text'],
            ['value' => 'worked_with_us_before', 'label' => 'Worked with us before', 'type' => 'text'],
            ['value' => 'city', 'label' => 'City', 'type' => 'text'],
            ['value' => 'governorate', 'label' => 'Governorate', 'type' => 'text'],
            ['value' => 'feedback_count', 'label' => 'Feedback Count', 'type' => 'number'],
            ['value' => 'uuid', 'label' => 'UUID', 'type' => 'text'],
            ['value' => 'created_at', 'label' => 'Created At', 'type' => 'datetime'],
            ['value' => 'updated_at', 'label' => 'Updated At', 'type' => 'datetime'],
            ['value' => 'confirm_duplicate', 'label' => 'Confirm Duplicate', 'type' => 'text'],
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
                foreach ($list->any_conditions as $condition) {
                    $this->applyCondition($q, $condition, 'or');
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
        if ($field === 'confirm_duplicate') {
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
                    $query->{$method}($field, '<', now()->subDays((int) $value)->toDateString());
                }
                break;
            case 'in_less_than':
                if ($value) {
                    $query->{$method}($field, '<=', now()->addDays((int) $value)->toDateString())
                        ->{$method}($field, '>=', now()->toDateString());
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
                $query->{$method}($field, '>=', now()->startOfWeek()->subWeek()->toDateString())
                    ->{$method}($field, '<=', now()->endOfWeek()->subWeek()->toDateString());
                break;
            case 'current_week':
                $query->{$method}($field, '>=', now()->startOfWeek()->toDateString())
                    ->{$method}($field, '<=', now()->endOfWeek()->toDateString());
                break;
            case 'next_week':
                $query->{$method}($field, '>=', now()->startOfWeek()->addWeek()->toDateString())
                    ->{$method}($field, '<=', now()->endOfWeek()->addWeek()->toDateString());
                break;
            case 'previous_month':
                $query->{$method}($field, '>=', now()->startOfMonth()->subMonth()->toDateString())
                    ->{$method}($field, '<=', now()->endOfMonth()->subMonth()->toDateString());
                break;
            case 'current_month':
                $query->{$method}($field, '>=', now()->startOfMonth()->toDateString())
                    ->{$method}($field, '<=', now()->endOfMonth()->toDateString());
                break;
            case 'next_month':
                $query->{$method}($field, '>=', now()->startOfMonth()->addMonth()->toDateString())
                    ->{$method}($field, '<=', now()->endOfMonth()->addMonth()->toDateString());
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
                $query->{$method}($field, '>=', now()->toDateString())
                    ->{$method}($field, '<=', now()->addDays(30)->toDateString());
                break;
            case 'next_60_days':
                $query->{$method}($field, '>=', now()->toDateString())
                    ->{$method}($field, '<=', now()->addDays(60)->toDateString());
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
                $query->{$method}($field, '>=', now()->startOfYear()->subYear()->toDateString())
                    ->{$method}($field, '<=', now()->endOfYear()->subYear()->toDateString());
                break;
            case 'current_fy':
                $query->{$method}($field, '>=', now()->startOfYear()->toDateString())
                    ->{$method}($field, '<=', now()->endOfYear()->toDateString());
                break;
            case 'next_fy':
                $query->{$method}($field, '>=', now()->startOfYear()->addYear()->toDateString())
                    ->{$method}($field, '<=', now()->endOfYear()->addYear()->toDateString());
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
                $query->{$method}($field, '>=', $startDate)
                    ->{$method}($field, '<=', $endDate);
                break;
            case 'current_fq':
                $now = now();
                $currentQuarter = ceil($now->month / 3);
                $startMonth = ($currentQuarter - 1) * 3 + 1;
                $endMonth = $currentQuarter * 3;
                $startDate = \Carbon\Carbon::create($now->year, $startMonth, 1)->startOfMonth()->toDateString();
                $endDate = \Carbon\Carbon::create($now->year, $endMonth, 1)->endOfMonth()->toDateString();
                $query->{$method}($field, '>=', $startDate)
                    ->{$method}($field, '<=', $endDate);
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
                $query->{$method}($field, '>=', $startDate)
                    ->{$method}($field, '<=', $endDate);
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
