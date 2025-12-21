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
                'view-full_name',
                'view-phone',
                'view-whatsapp_phone',
                'view-email',
                'view-riding_company',
                'view-campaign',
                'view-lead_source',
                'view-assigned_to',
                'view-assigned_users',
                'view-last_assigned_time',
                'view-last_assigned_by',
                'view-lead_status',
                'view-lead_status_comment',
                'view-next_follow_up',
                'view-next_time',
                'view-last_follow_up',
                'view-lead_stage',
                'view-current_stage',
                'view-notes',
                'view-driver_num',
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
        $this->command->info('Total: ' . count($createdPermissions) . ' permissions');
        $this->command->newLine();
        
        foreach ($entities as $entity => $actions) {
            $this->command->info("  {$entity}: " . implode(', ', $actions));
        }
    }
}

