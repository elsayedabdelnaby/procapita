<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Modules\Core\app\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        // Create quick-edit permission if it doesn't exist
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

        // Create edit permission if it doesn't exist (separate from update)
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

        // Update existing permissions to ensure they have correct metadata
        if (!$quickEditPermission->wasRecentlyCreated) {
            $quickEditPermission->update([
                'module_name' => 'drivers',
                'entity_name' => 'drivers',
                'action' => 'quick-edit',
            ]);
        }

        if (!$editPermission->wasRecentlyCreated) {
            $editPermission->update([
                'module_name' => 'drivers',
                'entity_name' => 'drivers',
                'action' => 'edit',
            ]);
        }
    }

    public function down(): void
    {
        // Optionally remove permissions (but we'll keep them for safety)
        // Permission::where('name', 'drivers.drivers.quick-edit')->delete();
        // Permission::where('name', 'drivers.drivers.edit')->delete();
    }
};
