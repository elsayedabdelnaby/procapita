<?php

namespace Modules\Core\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Permission;
use Modules\Core\app\Models\Role;

class CompanyService
{
    public function __construct(
        protected RoleService $roleService
    ) {}

    public function getAllCompanies(bool $activeOnly = false): Collection
    {
        $query = Company::query()->with(['users', 'modules']);

        if ($activeOnly) {
            $query->active();
        }

        return $query->orderBy('name')->get();
    }

    public function getCompanyById(int $id): ?Company
    {
        return Company::with(['users', 'modules', 'roles'])->find($id);
    }

    public function createCompany(array $data): array
    {
        // Reset slug change info before creation
        Company::$slugChangeInfo = null;
        
        // Slug will be generated automatically in Model boot if not provided
        // Model will ensure uniqueness automatically
        $company = Company::create($data);

        // Get slug change info from Model static property
        $slugChangeInfo = Company::$slugChangeInfo ?? null;

        // Create default CEO role (root role) for the company
        $ceoRole = $this->roleService->createRootRole($company);

        // Seed default data for the company
        $this->seedDefaultDataForCompany($company);

        // Create reseller role (child of CEO) named after the company
        $resellerRole = $this->roleService->createRole([
            'name' => $company->name,
            'guard_name' => 'web',
            'team_id' => $company->id,
            'parent_id' => $ceoRole->id,
            'is_root' => false,
        ]);

        // Give reseller role full permissions inside the company (same as CEO)
        $this->assignAllModulePermissionsToRole($resellerRole, $company);

        // Create reseller admin user: {slug}-admin display, admin@{slug}.com, role = reseller role
        $resellerAdminResult = $this->createResellerAdminUser($company, $resellerRole);

        // If admin user data is provided and has required fields, create the admin user (CEO)
        if (isset($data['admin_user']) && is_array($data['admin_user'])) {
            // Only create admin user if name and email are provided and not empty
            $adminName = trim($data['admin_user']['name'] ?? '');
            $adminEmail = trim($data['admin_user']['email'] ?? '');
            
            if (!empty($adminName) && !empty($adminEmail)) {
                $this->createCompanyAdmin($company, $data['admin_user']);
            }
        }

        return [
            'company' => $company->fresh(['users', 'roles', 'modules']),
            'slug_was_duplicate' => $slugChangeInfo['was_duplicate'] ?? false,
            'original_slug' => $slugChangeInfo['original_slug'] ?? null,
            'new_slug' => $slugChangeInfo['new_slug'] ?? null,
            'reseller_admin_email' => $resellerAdminResult['email'] ?? null,
            'reseller_admin_password' => $resellerAdminResult['password'] ?? null,
        ];
    }

    public function updateCompany(int $id, array $data): Company
    {
        $company = Company::findOrFail($id);

        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        // Handle logo upload
        if (isset($data['logo']) && $data['logo'] instanceof \Illuminate\Http\UploadedFile) {
            // Delete old logo if exists
            if ($company->logo && \Illuminate\Support\Facades\Storage::disk('public')->exists($company->logo)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($company->logo);
            }

            // Store new logo
            $logoPath = $data['logo']->store('companies/logos', 'public');
            $data['logo'] = $logoPath;
        }

        $company->update($data);

        return $company->fresh(['users', 'modules']);
    }

    public function deleteCompany(int $id, ?int $transferCompanyId = null): bool
    {
        $company = Company::findOrFail($id);

        // If transfer company is provided, transfer all riding companies and related data
        if ($transferCompanyId !== null) {
            $transferCompany = Company::findOrFail($transferCompanyId);

            // Get all user IDs that belong to this company BEFORE updating them
            // (needed for transferring drivers assigned to these users)
            $companyUserIds = \App\Models\User::where('company_id', $id)->pluck('id')->toArray();

            // Step 1: Transfer all riding companies (if table exists)
            if (class_exists(\Modules\RidingCarCompanies\app\Models\RidingCompany::class)
                && \Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
                \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $id)
                    ->update(['company_id' => $transferCompanyId]);
            }

            // Step 2: Transfer all users in the company (including those not in riding companies)
            \App\Models\User::where('company_id', $id)
                ->update(['company_id' => $transferCompanyId]);

            // Step 3: Transfer all drivers (leads) in the company
            if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
                // Transfer all drivers that belong to this company
                \Modules\Drivers\app\Models\Driver::where('company_id', $id)
                    ->update(['company_id' => $transferCompanyId]);

                // Transfer all drivers assigned to users in this company
                if (!empty($companyUserIds)) {
                    \Modules\Drivers\app\Models\Driver::whereIn('assigned_to', $companyUserIds)
                        ->update(['company_id' => $transferCompanyId]);
                }

                // Note: DriverFollowUps, DriverStages, and DriverDocuments are linked via driver_id,
                // so they will automatically stay with the transferred drivers. No need to update them separately.
            }
        }

        return $company->delete();
    }

    public function activateCompany(int $id): Company
    {
        $company = Company::findOrFail($id);
        $company->update(['is_active' => true]);

        return $company;
    }

    public function deactivateCompany(int $id): Company
    {
        $company = Company::findOrFail($id);
        $company->update(['is_active' => false]);

        return $company;
    }

    public function assignModule(int $companyId, string $moduleName, ?array $settings = null): Company
    {
        $company = Company::findOrFail($companyId);
        $company->activateModule($moduleName, $settings);

        // Grant permissions to company admin for the new module
        $this->grantModulePermissionsToAdmin($company, $moduleName);

        return $company->fresh(['modules']);
    }

    public function removeModule(int $companyId, string $moduleName): Company
    {
        $company = Company::findOrFail($companyId);
        $company->deactivateModule($moduleName);

        return $company->fresh(['modules']);
    }

    public function createCompanyAdmin(Company $company, array $userData): ?\App\Models\User
    {
        // Only create admin user if name and email are provided and not empty
        $name = trim($userData['name'] ?? '');
        $email = trim($userData['email'] ?? '');
        
        if (empty($name) || empty($email)) {
            return null;
        }
        
        // Use trimmed values
        $userData['name'] = $name;
        $userData['email'] = $email;

        $userData['company_id'] = $company->id;
        $userData['is_company_admin'] = true;
        $userData['is_active'] = true;

        if (! isset($userData['password'])) {
            $userData['password'] = bcrypt('password');
        }

        $user = \App\Models\User::create($userData);

        // Set the team context for Spatie Permission
        setPermissionsTeamId($company->id);

        // Assign CEO role to the admin
        $ceoRole = $company->roles()->rootRoles()->first();
        if ($ceoRole) {
            $user->assignRole($ceoRole);
        }

        return $user;
    }

    /**
     * Create the reseller admin user for a new company: name "{Company} Admin", email admin@{slug}.com,
     * role = the company-named role (child of CEO). Returns email and plain password for one-time display.
     *
     * @return array{email: string, password: string}
     */
    protected function createResellerAdminUser(Company $company, Role $resellerRole): array
    {
        $slug = $company->slug ?? Str::slug($company->name);
        $baseEmail = 'admin@'.$slug.'.com';
        $email = $baseEmail;
        $suffix = 0;
        while (\App\Models\User::where('email', $email)->exists()) {
            $suffix++;
            $email = 'admin@'.$slug.'-'.$suffix.'.com';
        }

        $plainPassword = Str::password(12);
        $user = \App\Models\User::create([
            'name' => $company->name.' Admin',
            'email' => $email,
            'password' => bcrypt($plainPassword),
            'company_id' => $company->id,
            'is_company_admin' => true,
            'is_active' => true,
        ]);

        setPermissionsTeamId($company->id);
        $user->assignRole($resellerRole);

        return [
            'email' => $email,
            'password' => $plainPassword,
        ];
    }

    /**
     * Assign all module permissions to a role (e.g. reseller role = full access inside company).
     */
    protected function assignAllModulePermissionsToRole(Role $role, Company $company): void
    {
        setPermissionsTeamId($company->id);

        $modules = ['core', 'marketing', 'ridingcarcompanies', 'drivers'];
        $allPermissions = collect();
        foreach ($modules as $module) {
            $permissions = Permission::forModule($module)->get();
            $allPermissions = $allPermissions->merge($permissions);
        }
        $role->syncPermissions($allPermissions);
    }

    protected function grantModulePermissionsToAdmin(Company $company, string $moduleName): void
    {
        $adminUsers = $company->users()
            ->where('is_company_admin', true)
            ->get();

        $permissions = \Modules\Core\app\Models\Permission::forModule($moduleName)->get();

        foreach ($adminUsers as $admin) {
            foreach ($permissions as $permission) {
                $admin->givePermissionTo($permission);
            }
        }
    }

    public function getCompanyStatistics(int $companyId): array
    {
        $company = Company::with(['users', 'modules', 'roles'])->findOrFail($companyId);

        return [
            'total_users' => $company->users()->count(),
            'active_users' => $company->users()->active()->count(),
            'total_roles' => $company->roles()->count(),
            'total_modules' => $company->modules()->count(),
            'active_modules' => $company->activeModules()->count(),
            'company' => $company,
        ];
    }

    protected function seedDefaultDataForCompany(Company $company): void
    {
        // Seed Marketing module default data (Campaign Types, Statuses, Channels)
        if (class_exists(\Modules\Marketing\database\seeders\CampaignTypesSeeder::class)) {
            $marketingSeeder = new \Modules\Marketing\database\seeders\CampaignTypesSeeder();
            $marketingSeeder->seedForCompany($company);
        }

        // Seed Drivers module default data (Lead Sources, Lead Statuses)
        if (class_exists(\Modules\Drivers\database\seeders\DriversDefaultDataSeeder::class)) {
            $driversSeeder = new \Modules\Drivers\database\seeders\DriversDefaultDataSeeder();
            $driversSeeder->seedForCompany($company);
        }
    }
}

