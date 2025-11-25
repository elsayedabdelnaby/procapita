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
            'driverstages' => ['create', 'read', 'update', 'delete', 'complete', 'reject', 'export'],
            'driverdocuments' => ['create', 'read', 'update', 'delete', 'upload', 'approve', 'reject', 'download', 'export', 'set-pending', 'set-approved', 'set-rejected', 'view', 'replace', 'delete-file'],
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

