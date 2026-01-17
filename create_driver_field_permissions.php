<?php

/**
 * Script to create driver field permissions (invisible, read, write)
 * Run: php create_driver_field_permissions.php
 * Or use Laragon Terminal
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Modules\Core\app\Models\Permission;

$fields = [
    'assigned_to',
    'campaign',
    'cancel_reason',
    'car_or_scooter',
    'city',
    'current_stage',
    'email',
    'lead_status_comment',
    'has_worked_before',
    'lead_source',
    'lead_stage',
    'lead_status',
    'full_name',
    'next_follow_up',
    'phone',
    'vehicle_type',
    'vehicle_type_and_year',
    'whatsapp_phone',
    'worked_with_us_before',
];

$created = 0;
$skipped = 0;

foreach ($fields as $field) {
    foreach (['invisible', 'read', 'write'] as $type) {
        $action = "{$type}-{$field}";
        $name = "drivers.driverfields.{$action}";
        
        $permission = Permission::firstOrCreate(
            [
                'name' => $name,
                'guard_name' => 'web',
            ],
            [
                'module_name' => 'drivers',
                'entity_name' => 'driverfields',
                'action' => $action,
            ]
        );
        
        if ($permission->wasRecentlyCreated) {
            $created++;
            echo "Created: {$name}\n";
        } else {
            $skipped++;
        }
    }
}

echo "\n";
echo "Total created: {$created}\n";
echo "Total skipped (already exist): {$skipped}\n";
echo "Done!\n";
