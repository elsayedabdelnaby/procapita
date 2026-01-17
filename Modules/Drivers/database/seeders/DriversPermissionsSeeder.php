<?php

namespace Modules\Drivers\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Permission;

class DriversPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $entities = [
            'drivers' => ['create', 'read', 'update', 'delete', 'assign', 'view-stages', 'view-documents', 'view-document', 'upload-document', 'delete-document', 'reject-document', 'approve-document', 'pending-document', 'export', 'import', 'mass-edit', 'mass-delete', 'delete-all'],
            'leadsources' => ['create', 'read', 'update', 'delete', 'toggle-active', 'export', 'import'],
            'leadstatuses' => ['create', 'read', 'update', 'delete', 'toggle-active', 'export', 'import'],
            'leadstages' => ['create', 'read', 'update', 'delete', 'toggle-active', 'export', 'import'],
            'driverstages' => ['create', 'read', 'update', 'delete', 'complete', 'reject', 'export'],
            'driverdocuments' => ['create', 'read', 'update', 'delete', 'upload', 'approve', 'reject', 'download', 'export', 'set-pending', 'set-approved', 'set-rejected', 'view', 'replace', 'delete-file'],
            'driverfollowups' => ['create', 'read', 'update', 'delete'],
            // Field-level permissions for drivers - 3 states per field: invisible, read, write
            'driverfields' => [
                // Keep old view- permissions for backward compatibility
                'view-id',
                'view-driver_num',
                'view-duplicate',
                'view-full_name',
                'view-phone',
                'view-whatsapp_phone',
                'view-email',
                'view-company_id',
                'view-riding_company',
                'view-riding_company_id',
                'view-campaign',
                'view-campaign_id',
                'view-lead_source',
                'view-lead_source_id',
                'view-lead_status',
                'view-lead_status_id',
                'view-lead_status_comment',
                'view-lead_stage',
                'view-lead_stage_id',
                'view-current_stage',
                'view-current_stage_id',
                'view-assigned_to',
                'view-last_assigned_time',
                'view-last_assigned_date',
                'view-last_assigned_by',
                'view-next_follow_up',
                'view-next_time',
                'view-last_follow_up',
                'view-notes',
                'view-cancel_reason',
                'view-vehicle_type',
                'view-has_worked_before',
                'view-city',
                'view-feedback_count',
                'view-uuid',
                'view-created_at',
                'view-updated_at',
                // New field permissions with 3 states
                'invisible-assigned_to',
                'read-assigned_to',
                'write-assigned_to',
                'invisible-campaign',
                'read-campaign',
                'write-campaign',
                'invisible-cancel_reason',
                'read-cancel_reason',
                'write-cancel_reason',
                'invisible-car_or_scooter',
                'read-car_or_scooter',
                'write-car_or_scooter',
                'invisible-city',
                'read-city',
                'write-city',
                'invisible-current_stage',
                'read-current_stage',
                'write-current_stage',
                'invisible-email',
                'read-email',
                'write-email',
                'invisible-lead_status_comment',
                'read-lead_status_comment',
                'write-lead_status_comment',
                'invisible-has_worked_before',
                'read-has_worked_before',
                'write-has_worked_before',
                'invisible-lead_source',
                'read-lead_source',
                'write-lead_source',
                'invisible-lead_stage',
                'read-lead_stage',
                'write-lead_stage',
                'invisible-lead_status',
                'read-lead_status',
                'write-lead_status',
                'invisible-full_name',
                'read-full_name',
                'write-full_name',
                'invisible-next_follow_up',
                'read-next_follow_up',
                'write-next_follow_up',
                'invisible-phone',
                'read-phone',
                'write-phone',
                'invisible-vehicle_type',
                'read-vehicle_type',
                'write-vehicle_type',
                'invisible-vehicle_type_and_year',
                'read-vehicle_type_and_year',
                'write-vehicle_type_and_year',
                'invisible-whatsapp_phone',
                'read-whatsapp_phone',
                'write-whatsapp_phone',
                'invisible-worked_with_us_before',
                'read-worked_with_us_before',
                'write-worked_with_us_before',
            ],
        ];

        $createdPermissions = [];

        foreach ($entities as $entity => $actions) {
            foreach ($actions as $action) {
                $permission = Permission::firstOrCreate(
                    [
                        'name' => "drivers.{$entity}.{$action}",
                        'guard_name' => 'web',
                    ],
                    [
                        'module_name' => 'drivers',
                        'entity_name' => $entity,
                        'action' => $action,
                    ]
                );

                $createdPermissions[] = $permission->name;
            }
        }

        $this->command->info('Drivers module permissions created:');
        $this->command->info('Total: '.count($createdPermissions).' permissions');
        $this->command->newLine();

        foreach ($entities as $entity => $actions) {
            $this->command->info("  {$entity}: ".implode(', ', $actions));
        }
    }
}
