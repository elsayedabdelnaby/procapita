<?php

namespace Modules\Core\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Permission;

class CorePermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Company Permissions
            ['name' => 'core.companies.create', 'module_name' => 'core', 'entity_name' => 'companies', 'action' => 'create'],
            ['name' => 'core.companies.read', 'module_name' => 'core', 'entity_name' => 'companies', 'action' => 'read'],
            ['name' => 'core.companies.update', 'module_name' => 'core', 'entity_name' => 'companies', 'action' => 'update'],
            ['name' => 'core.companies.delete', 'module_name' => 'core', 'entity_name' => 'companies', 'action' => 'delete'],

            // Role Permissions
            ['name' => 'core.roles.create', 'module_name' => 'core', 'entity_name' => 'roles', 'action' => 'create'],
            ['name' => 'core.roles.read', 'module_name' => 'core', 'entity_name' => 'roles', 'action' => 'read'],
            ['name' => 'core.roles.update', 'module_name' => 'core', 'entity_name' => 'roles', 'action' => 'update'],
            ['name' => 'core.roles.delete', 'module_name' => 'core', 'entity_name' => 'roles', 'action' => 'delete'],

            // User Permissions
            ['name' => 'core.users.create', 'module_name' => 'core', 'entity_name' => 'users', 'action' => 'create'],
            ['name' => 'core.users.read', 'module_name' => 'core', 'entity_name' => 'users', 'action' => 'read'],
            ['name' => 'core.users.update', 'module_name' => 'core', 'entity_name' => 'users', 'action' => 'update'],
            ['name' => 'core.users.delete', 'module_name' => 'core', 'entity_name' => 'users', 'action' => 'delete'],

            // Permission Permissions
            ['name' => 'core.permissions.create', 'module_name' => 'core', 'entity_name' => 'permissions', 'action' => 'create'],
            ['name' => 'core.permissions.read', 'module_name' => 'core', 'entity_name' => 'permissions', 'action' => 'read'],
            ['name' => 'core.permissions.update', 'module_name' => 'core', 'entity_name' => 'permissions', 'action' => 'update'],
            ['name' => 'core.permissions.delete', 'module_name' => 'core', 'entity_name' => 'permissions', 'action' => 'delete'],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name'], 'guard_name' => 'web'],
                $permission
            );
        }

        $this->command->info('Core permissions seeded successfully.');
    }
}

