<?php

namespace Modules\RidingCarCompanies\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Permission;

class RidingCarCompaniesPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $entities = [
            'ridingcompanies' => ['create', 'read', 'update', 'delete', 'toggle-active', 'upload-logo'],
            'companyrides' => ['create', 'read', 'update', 'delete'],
            'stagetemplates' => ['create', 'read', 'update', 'delete', 'toggle-active'],
            'documentrequirements' => ['create', 'read', 'update', 'delete', 'toggle-active'],
            'integrations' => ['create', 'read', 'update', 'delete', 'toggle-active', 'test-connection'],
            'integrationsettings' => ['create', 'read', 'update', 'delete', 'toggle-active', 'test-access'],
        ];

        $createdPermissions = [];

        foreach ($entities as $entity => $actions) {
            foreach ($actions as $action) {
                $permission = Permission::firstOrCreate(
                    [
                        'name' => "ridingcarcompanies.{$entity}.{$action}",
                        'guard_name' => 'web',
                    ],
                    [
                        'module_name' => 'ridingcarcompanies',
                        'entity_name' => $entity,
                        'action' => $action,
                    ]
                );
                
                $createdPermissions[] = $permission->name;
            }
        }

        $this->command->info('Riding Car Companies module permissions created:');
        $this->command->info('Total: ' . count($createdPermissions) . ' permissions');
        $this->command->newLine();
        
        foreach ($entities as $entity => $actions) {
            $this->command->info("  {$entity}: " . implode(', ', $actions));
        }
    }
}

