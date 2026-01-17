<?php

/**
 * Script to create missing Drivers permissions
 * Run this file directly: php create_drivers_permissions.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Modules\Core\app\Models\Permission;

$entities = [
    'drivers' => ['create', 'read', 'update', 'delete', 'assign', 'view-stages', 'view-documents', 'view-document', 'upload-document', 'delete-document', 'reject-document', 'approve-document', 'pending-document', 'export', 'import', 'mass-edit', 'mass-delete', 'delete-all'],
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

echo "Drivers module permissions created:\n";
echo "Total: " . count($createdPermissions) . " permissions\n\n";

foreach ($entities as $entity => $actions) {
    echo "  {$entity}: " . implode(', ', $actions) . "\n";
}

echo "\nDone!\n";

