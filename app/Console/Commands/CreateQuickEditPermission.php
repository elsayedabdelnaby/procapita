<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\Core\app\Models\Permission;

class CreateQuickEditPermission extends Command
{
    protected $signature = 'permissions:create-quick-edit';

    protected $description = 'Create quick-edit and edit permissions for drivers if they don\'t exist';

    public function handle(): int
    {
        $this->info('Creating drivers permissions...');
        $this->newLine();

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
            $this->line('  ✓ Created: drivers.drivers.quick-edit');
        } else {
            $this->line('  - Already exists: drivers.drivers.quick-edit');
            // Update metadata to ensure it's correct
            $quickEditPermission->update([
                'module_name' => 'drivers',
                'entity_name' => 'drivers',
                'action' => 'quick-edit',
            ]);
            $this->line('  ✓ Updated metadata for: drivers.drivers.quick-edit');
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
            $this->line('  ✓ Created: drivers.drivers.edit');
        } else {
            $this->line('  - Already exists: drivers.drivers.edit');
            // Update metadata to ensure it's correct
            $editPermission->update([
                'module_name' => 'drivers',
                'entity_name' => 'drivers',
                'action' => 'edit',
            ]);
            $this->line('  ✓ Updated metadata for: drivers.drivers.edit');
        }

        $this->newLine();
        $this->info('Done!');

        return Command::SUCCESS;
    }
}
