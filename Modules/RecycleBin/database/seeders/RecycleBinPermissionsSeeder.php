<?php

namespace Modules\RecycleBin\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Permission;

class RecycleBinPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $entities = [
            'recyclebin' => ['read', 'restore', 'delete', 'view-all'],
        ];

        $createdPermissions = [];

        foreach ($entities as $entity => $actions) {
            foreach ($actions as $action) {
                $permission = Permission::firstOrCreate(
                    [
                        'name' => "recyclebin.{$entity}.{$action}",
                        'guard_name' => 'web',
                    ],
                    [
                        'module_name' => 'recyclebin',
                        'entity_name' => $entity,
                        'action' => $action,
                    ]
                );
                
                $createdPermissions[] = $permission->name;
            }
        }

        $this->command->info('RecycleBin module permissions created:');
        $this->command->info('Total: ' . count($createdPermissions) . ' permissions');
        $this->command->newLine();
        
        foreach ($entities as $entity => $actions) {
            $this->command->info("  {$entity}: " . implode(', ', $actions));
        }
    }
}

