<?php

namespace Modules\Drivers\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Permission;

class DriversPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $entities = [
            'drivers' => ['create', 'read', 'update', 'delete', 'assign', 'view-stages', 'view-documents', 'export', 'import', 'mass-edit', 'mass-delete', 'delete-all'],
            'leadsources' => ['create', 'read', 'update', 'delete', 'toggle-active', 'export', 'import'],
            'leadstatuses' => ['create', 'read', 'update', 'delete', 'toggle-active', 'export', 'import'],
            'leadstages' => ['create', 'read', 'update', 'delete', 'toggle-active', 'export', 'import'],
            'driverstages' => ['create', 'read', 'update', 'delete', 'complete', 'reject', 'export'],
            'driverdocuments' => ['create', 'read', 'update', 'delete', 'upload', 'approve', 'reject', 'download', 'export', 'set-pending', 'set-approved', 'set-rejected', 'view', 'replace', 'delete-file'],
            'driverfollowups' => ['create', 'read', 'update', 'delete'],
            // Field-level permissions for drivers
            'driverfields' => [
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
