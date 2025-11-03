<?php

namespace Modules\Core\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Modules\Core\app\Models\Company;
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

    public function createCompany(array $data): Company
    {
        if (! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $company = Company::create($data);

        // Create default CEO role (root role) for the company
        $this->roleService->createRootRole($company);

        // If admin user data is provided, create the admin user
        if (isset($data['admin_user'])) {
            $this->createCompanyAdmin($company, $data['admin_user']);
        }

        return $company->fresh(['users', 'roles', 'modules']);
    }

    public function updateCompany(int $id, array $data): Company
    {
        $company = Company::findOrFail($id);

        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $company->update($data);

        return $company->fresh(['users', 'modules']);
    }

    public function deleteCompany(int $id): bool
    {
        $company = Company::findOrFail($id);

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

    public function createCompanyAdmin(Company $company, array $userData): \App\Models\User
    {
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
}

