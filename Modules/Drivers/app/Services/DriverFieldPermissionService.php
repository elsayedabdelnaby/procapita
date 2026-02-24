<?php

namespace Modules\Drivers\app\Services;

use App\Models\User;

class DriverFieldPermissionService
{
    /**
     * Check if user can view a driver field
     */
    public function canViewField(User $user, string $fieldName): bool
    {
        // Super admin can view all fields
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Get all user permissions
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check for invisible permission
        $invisiblePerm = "drivers.driverfields.invisible-{$fieldName}";
        if (in_array($invisiblePerm, $permissions)) {
            return false;
        }

        // Check for read or write permission
        $readPerm = "drivers.driverfields.read-{$fieldName}";
        $writePerm = "drivers.driverfields.write-{$fieldName}";
        
        if (in_array($readPerm, $permissions) || in_array($writePerm, $permissions)) {
            return true;
        }

        // Check if user has any new driver field permissions (strict mode)
        $hasNewPermissions = collect($permissions)->some(function ($perm) {
            return str_contains($perm, 'drivers.driverfields') && 
                   (str_contains($perm, 'invisible-') || str_contains($perm, 'read-') || str_contains($perm, 'write-'));
        });

        if ($hasNewPermissions) {
            // In strict mode, fields without explicit permission are invisible
            return false;
        }

        // Fallback to old view- permission system
        $oldViewPerm = "drivers.driverfields.view-{$fieldName}";
        return in_array($oldViewPerm, $permissions);
    }

    /**
     * Check if user can edit a driver field
     */
    public function canEditField(User $user, string $fieldName): bool
    {
        // Super admin can edit all fields
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Get all user permissions
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check for invisible permission
        $invisiblePerm = "drivers.driverfields.invisible-{$fieldName}";
        if (in_array($invisiblePerm, $permissions)) {
            return false;
        }

        // Check for write permission
        $writePerm = "drivers.driverfields.write-{$fieldName}";
        if (in_array($writePerm, $permissions)) {
            return true;
        }

        // Check for read permission (read-only)
        $readPerm = "drivers.driverfields.read-{$fieldName}";
        if (in_array($readPerm, $permissions)) {
            return false; // Read-only
        }

        // Check if user has any new driver field permissions (strict mode)
        $hasNewPermissions = collect($permissions)->some(function ($perm) {
            return str_contains($perm, 'drivers.driverfields') && 
                   (str_contains($perm, 'invisible-') || str_contains($perm, 'read-') || str_contains($perm, 'write-'));
        });

        if ($hasNewPermissions) {
            // In strict mode, fields without explicit permission are not editable
            return false;
        }

        // Default: allow for backward compatibility
        return true;
    }

    /**
     * Filter data to only include fields user can edit
     */
    public function filterEditableFields(User $user, array $data): array
    {
        $filtered = [];

        foreach ($data as $fieldName => $value) {
            // Skip non-driver fields
            if (! $this->isDriverField($fieldName)) {
                $filtered[$fieldName] = $value;
                continue;
            }

            // Only include if user can edit
            if ($this->canEditField($user, $fieldName)) {
                $filtered[$fieldName] = $value;
            }
        }

        return $filtered;
    }

    /**
     * Check if field is a driver field (needs permission check)
     */
    protected function isDriverField(string $fieldName): bool
    {
        $driverFields = [
            'full_name', 'phone', 'whatsapp_phone', 'email',
            'campaign', 'lead_source', 'lead_status', 'lead_status_comment',
            'next_follow_up', 'last_follow_up', 'assigned_to',
            'cancel_reason', 'current_stage', 'last_assigned_by',
            'notes', 'has_worked_before',
            'worked_with_us_before', 'city', 'feedback_count',
            'driver_num', 'duplicate', 'confirm_duplicate',
            'lead_stage', 'team_leader',
            'account_manager', 'resigned_leads', 'last_assigned_time',
        ];

        return in_array($fieldName, $driverFields);
    }
}
