<?php

namespace Modules\Core\database\seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Permission;
use Modules\Core\app\Models\Role;

class DemoCompaniesSeeder extends Seeder
{
    /**
     * Seed demo companies with correct hierarchical roles.
     * 
     * Hierarchy numbering is sequential across entire company (H1, H2, H3...),
     * not per level. Each company has independent numbering.
     */
    public function run(): void
    {
        // Company 2: Retail Solutions
        $this->seedCompany2();
        
        $this->command->info('✅ Demo companies seeded successfully!');
        $this->command->newLine();
        $this->command->info('Login Credentials:');
        $this->command->info('-------------------');
        $this->command->info('Company 1 Admin: admin@techcorp.local / password');
        $this->command->info('Company 2 Admin: admin@retailsolutions.local / password');
    }

    /**
     * Seed Company 1: Tech Corp
     * 
     * Hierarchy:
     * H1 (CEO)
     */
    private function seedCompany1(): void
    {
        $company = Company::firstOrCreate(
            ['email' => 'tradeway@tradeway.local'],
            [
                'name' => 'Tradeway',
                'slug' => 'tradeway',
                'phone' => '+1-555-0100',
                'address' => '123 Tradeway Street, Silicon Valley, CA 94000',
                'is_active' => true,
            ]
        );

        // Create Company Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@tradeway.local'],
            [
                'name' => 'Tradeway Admin',
                'password' => Hash::make('password'),
                'company_id' => $company->id,
                'is_super_admin' => false,
                'is_company_admin' => true,
                'is_active' => true,
            ]
        );

        // Enable all modules for this company
        $company->activateModule('Core');
        $company->activateModule('Marketing');
        $company->activateModule('RidingCarCompanies');
        $company->activateModule('Drivers');

        // Create roles with CORRECT hierarchy numbering
        // Numbers are sequential across the ENTIRE company (H1, H2, H3...)
        
        // Root: CEO (H1)
        $ceo = Role::firstOrCreate(
            ['name' => 'CEO', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => null,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Assign all module permissions to CEO role
        $this->assignAllModulePermissionsToRole($ceo, $company);

        // Assign CEO role to admin
        if (! $admin->hasRole($ceo->name, 'web')) {
            setPermissionsTeamId($company->id);
            $admin->assignRole($ceo);
        }

        $this->command->info("✅ Company 1 (Tech Corp) seeded with roles:");
        $this->showRoleHierarchy($company);
    }

    /**
     * Seed Company 2: Retail Solutions
     * 
     * Hierarchy:
     * H1 (CEO)
     */
    private function seedCompany2(): void
    {
        $company = Company::firstOrCreate(
            ['email' => 'info@captianmasr.local'],
            [
                'name' => 'Captain Masr',
                'slug' => 'captain-masr',
                'phone' => '+1-555-0200',
                'address' => '456 Retail Avenue, New York, NY 10001',
                'is_active' => true,
            ]
        );

        // Create Company Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@captainmasr.local'],
            [
                'name' => 'Captain Masr Admin',
                'password' => Hash::make('password'),
                'company_id' => $company->id,
                'is_super_admin' => false,
                'is_company_admin' => true,
                'is_active' => true,
            ]
        );

        // Enable all modules for this company
        $company->activateModule('Core');
        $company->activateModule('Marketing');
        $company->activateModule('RidingCarCompanies');
        $company->activateModule('Drivers');

        // Create roles with CORRECT hierarchy numbering
        // Company 2 starts at H1 (independent of Company 1)
        
        // Root: CEO (H1)
        $ceo = Role::firstOrCreate(
            ['name' => 'CEO', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => null,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Assign all module permissions to CEO role
        $this->assignAllModulePermissionsToRole($ceo, $company);

        // Assign CEO role to admin
        if (! $admin->hasRole($ceo->name, 'web')) {
            setPermissionsTeamId($company->id);
            $admin->assignRole($ceo);
        }

        $this->command->info("✅ Company 2 (Retail Solutions) seeded with roles:");
        $this->showRoleHierarchy($company);
    }

    /**
     * Assign all module permissions to a role
     */
    private function assignAllModulePermissionsToRole(Role $role, Company $company): void
    {
        setPermissionsTeamId($company->id);

        // Get permissions from all modules
        $modules = ['core', 'marketing', 'ridingcarcompanies', 'drivers'];
        $allPermissions = collect();

        foreach ($modules as $module) {
            $permissions = Permission::forModule($module)->get();
            $allPermissions = $allPermissions->merge($permissions);
        }

        // Sync all permissions to the role
        $role->syncPermissions($allPermissions);
    }

    /**
     * Display role hierarchy for a company
     */
    private function showRoleHierarchy(Company $company): void
    {
        $roles = Role::where('team_id', $company->id)
            ->orderBy('hierarchy_path')
            ->get();

        foreach ($roles as $role) {
            $indent = str_repeat('  ', $role->hierarchy_level - 1);
            $prefix = $role->is_root ? '' : '└── ';
            $this->command->info(sprintf(
                '%s%s%s (%s)',
                $indent,
                $prefix,
                $role->name,
                $role->hierarchy_path
            ));
        }
        $this->command->newLine();
    }
}

