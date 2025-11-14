<?php

namespace Modules\Core\database\seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Core\app\Models\Company;
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
        // Company 1: Tech Corp
        $this->seedCompany1();
        
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
     * ├── H1:H2 (HR Manager)
     * │   ├── H1:H2:H3 (HR Specialist)
     * │   └── H1:H2:H4 (Recruiter)
     * ├── H1:H5 (CTO)
     * │   ├── H1:H5:H6 (Tech Lead)
     * │   └── H1:H5:H7 (Senior Developer)
     * └── H1:H8 (Sales Manager)
     *     ├── H1:H8:H9 (Team Lead)
     *     └── H1:H8:H10 (Sales Agent)
     */
    private function seedCompany1(): void
    {
        $company = Company::firstOrCreate(
            ['email' => 'info@techcorp.local'],
            [
                'name' => 'Tech Corp',
                'slug' => 'tech-corp',
                'phone' => '+1-555-0100',
                'address' => '123 Tech Street, Silicon Valley, CA 94000',
                'is_active' => true,
            ]
        );

        // Create Company Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@techcorp.local'],
            [
                'name' => 'Tech Corp Admin',
                'password' => Hash::make('password'),
                'company_id' => $company->id,
                'is_super_admin' => false,
                'is_company_admin' => true,
                'is_active' => true,
            ]
        );

        // Enable all modules for this company
        $company->activateModule('Core');

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

        // Level 2: HR Manager (H2)
        $hrManager = Role::firstOrCreate(
            ['name' => 'HR Manager', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $ceo->id,
                'module_name' => 'core',
                'entity_name' => 'users',
            ]
        );

        // Level 3: HR Specialist (H3)
        Role::firstOrCreate(
            ['name' => 'HR Specialist', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $hrManager->id,
                'module_name' => 'core',
                'entity_name' => 'users',
            ]
        );

        // Level 3: Recruiter (H4)
        Role::firstOrCreate(
            ['name' => 'Recruiter', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $hrManager->id,
                'module_name' => 'core',
                'entity_name' => 'users',
            ]
        );

        // Level 2: CTO (H5)
        $cto = Role::firstOrCreate(
            ['name' => 'CTO', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $ceo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Tech Lead (H6)
        Role::firstOrCreate(
            ['name' => 'Tech Lead', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $cto->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Senior Developer (H7)
        Role::firstOrCreate(
            ['name' => 'Senior Developer', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $cto->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 2: Sales Manager (H8)
        $salesManager = Role::firstOrCreate(
            ['name' => 'Sales Manager', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $ceo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Team Lead (H9)
        Role::firstOrCreate(
            ['name' => 'Team Lead', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $salesManager->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Sales Agent (H10)
        Role::firstOrCreate(
            ['name' => 'Sales Agent', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $salesManager->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

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
     * ├── H2 (CFO)
     * │   ├── H2:H3 (Accountant)
     * │   └── H2:H4 (Financial Analyst)
     * ├── H5 (COO)
     * │   └── H5:H6 (Operations Manager)
     * └── H7 (Sales Director)
     *     ├── H7:H8 (Regional Manager)
     *     └── H7:H9 (Sales Representative)
     */
    private function seedCompany2(): void
    {
        $company = Company::firstOrCreate(
            ['email' => 'info@retailsolutions.local'],
            [
                'name' => 'Retail Solutions',
                'slug' => 'retail-solutions',
                'phone' => '+1-555-0200',
                'address' => '456 Retail Avenue, New York, NY 10001',
                'is_active' => true,
            ]
        );

        // Create Company Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@retailsolutions.local'],
            [
                'name' => 'Retail Solutions Admin',
                'password' => Hash::make('password'),
                'company_id' => $company->id,
                'is_super_admin' => false,
                'is_company_admin' => true,
                'is_active' => true,
            ]
        );

        // Enable all modules for this company
        $company->activateModule('Core');

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

        // Level 2: CFO (H2)
        $cfo = Role::firstOrCreate(
            ['name' => 'CFO', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $ceo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Accountant (H3)
        Role::firstOrCreate(
            ['name' => 'Accountant', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $cfo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Financial Analyst (H4)
        Role::firstOrCreate(
            ['name' => 'Financial Analyst', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $cfo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 2: COO (H5)
        $coo = Role::firstOrCreate(
            ['name' => 'COO', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $ceo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Operations Manager (H6)
        Role::firstOrCreate(
            ['name' => 'Operations Manager', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $coo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 2: Sales Director (H7)
        $salesDirector = Role::firstOrCreate(
            ['name' => 'Sales Director', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $ceo->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Regional Manager (H8)
        Role::firstOrCreate(
            ['name' => 'Regional Manager', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $salesDirector->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Level 3: Sales Representative (H9)
        Role::firstOrCreate(
            ['name' => 'Sales Representative', 'team_id' => $company->id],
            [
                'guard_name' => 'web',
                'parent_id' => $salesDirector->id,
                'module_name' => 'core',
                'entity_name' => null,
            ]
        );

        // Assign CEO role to admin
        if (! $admin->hasRole($ceo->name, 'web')) {
            setPermissionsTeamId($company->id);
            $admin->assignRole($ceo);
        }

        $this->command->info("✅ Company 2 (Retail Solutions) seeded with roles:");
        $this->showRoleHierarchy($company);
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

