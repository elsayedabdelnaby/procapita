<?php

namespace Modules\Marketing\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Permission;

class MarketingPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $entities = [
            'campaigns' => ['create', 'read', 'update', 'delete', 'export', 'pause', 'activate', 'report'],
            'campaign_metrics' => ['create', 'read', 'update', 'delete', 'export'],
            'campaign_types' => ['create', 'read', 'update', 'delete'],
            'campaign_statuses' => ['create', 'read', 'update', 'delete'],
            'campaign_channels' => ['create', 'read', 'update', 'delete'],
            'marketing_lists' => ['create', 'read', 'update', 'delete', 'export'],
            'marketing_templates' => ['create', 'read', 'update', 'delete'],
        ];

        $createdPermissions = [];

        foreach ($entities as $entity => $actions) {
            foreach ($actions as $action) {
                $permission = Permission::firstOrCreate(
                    [
                        'name' => "marketing.{$entity}.{$action}",
                        'guard_name' => 'web',
                    ],
                    [
                        'module_name' => 'marketing',
                        'entity_name' => $entity,
                        'action' => $action,
                    ]
                );
                
                $createdPermissions[] = $permission->name;
            }
        }

        $this->command->info('Marketing module permissions created:');
        $this->command->info('Total: ' . count($createdPermissions) . ' permissions');
        $this->command->newLine();
        
        foreach ($entities as $entity => $actions) {
            $this->command->info("  {$entity}: " . implode(', ', $actions));
        }
    }
}

