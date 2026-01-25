<?php

/**
 * Script to create quick-edit and edit permissions for drivers
 * 
 * Run this script using: php create_quick_edit_permission.php
 * Or via artisan: php artisan tinker < create_quick_edit_permission.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Modules\Core\app\Models\Permission;

echo "Creating drivers permissions...\n\n";

// Create quick-edit permission
$quickEditPermission = Permission::firstOrCreate(
    [
        'name' => 'drivers.drivers.quick-edit',
        'guard_name' => 'web',
    ],
    [
        'module_name' => 'drivers',
        'entity_name' => 'drivers',
        'action' => 'quick-edit',
    ]
);

if ($quickEditPermission->wasRecentlyCreated) {
    echo "  ✓ Created: drivers.drivers.quick-edit\n";
} else {
    echo "  - Already exists: drivers.drivers.quick-edit\n";
    // Update metadata to ensure it's correct
    $quickEditPermission->update([
        'module_name' => 'drivers',
        'entity_name' => 'drivers',
        'action' => 'quick-edit',
    ]);
    echo "  ✓ Updated metadata for: drivers.drivers.quick-edit\n";
}

// Create edit permission (separate from update)
$editPermission = Permission::firstOrCreate(
    [
        'name' => 'drivers.drivers.edit',
        'guard_name' => 'web',
    ],
    [
        'module_name' => 'drivers',
        'entity_name' => 'drivers',
        'action' => 'edit',
    ]
);

if ($editPermission->wasRecentlyCreated) {
    echo "  ✓ Created: drivers.drivers.edit\n";
} else {
    echo "  - Already exists: drivers.drivers.edit\n";
    // Update metadata to ensure it's correct
    $editPermission->update([
        'module_name' => 'drivers',
        'entity_name' => 'drivers',
        'action' => 'edit',
    ]);
    echo "  ✓ Updated metadata for: drivers.drivers.edit\n";
}

echo "\nDone!\n";
echo "\nNow refresh the Edit Role page to see 'Quick Edit' permission.\n";
