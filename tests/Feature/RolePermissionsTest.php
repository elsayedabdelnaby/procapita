<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Permission;
use Modules\Core\app\Models\Role;
use Tests\TestCase;

class RolePermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Modules\Core\database\seeders\CorePermissionsSeeder::class);
    }

    public function test_user_with_role_receives_role_permissions_in_shared_data(): void
    {
        $company = Company::factory()->create(['is_active' => true]);
        $permission = Permission::where('name', 'core.companies.read')->where('guard_name', 'web')->first();
        $this->assertNotNull($permission, 'Core permission core.companies.read should exist after seeding.');

        $role = Role::create([
            'name' => 'Viewer',
            'guard_name' => 'web',
            'team_id' => $company->id,
        ]);
        $role->givePermissionTo($permission);

        $user = User::factory()->create([
            'company_id' => $company->id,
            'is_super_admin' => false,
            'is_company_admin' => false,
        ]);
        setPermissionsTeamId($company->id);
        $user->assignRole($role);

        $response = $this->actingAs($user)->get(route('dashboard'));
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('auth.user.permissions')
            ->where('auth.user.permissions', fn ($permissions) => collect($permissions)->contains('name', 'core.companies.read'))
        );
    }

    public function test_user_without_permission_cannot_access_permission_protected_route(): void
    {
        $company = Company::factory()->create(['is_active' => true]);
        $role = Role::create([
            'name' => 'NoLeads',
            'guard_name' => 'web',
            'team_id' => $company->id,
        ]);
        // Role has no drivers.drivers.read

        $user = User::factory()->create([
            'company_id' => $company->id,
            'is_super_admin' => false,
            'is_company_admin' => false,
        ]);
        setPermissionsTeamId($company->id);
        $user->assignRole($role);

        $response = $this->actingAs($user)->get('/leads/leads');
        $response->assertForbidden();
    }

    public function test_user_with_role_permission_can_access_protected_route(): void
    {
        $company = Company::factory()->create(['is_active' => true]);
        $permission = Permission::firstOrCreate(
            ['name' => 'drivers.drivers.read', 'guard_name' => 'web'],
            ['module_name' => 'drivers', 'entity_name' => 'drivers', 'action' => 'read']
        );
        $role = Role::create([
            'name' => 'Leads Viewer',
            'guard_name' => 'web',
            'team_id' => $company->id,
        ]);
        $role->givePermissionTo($permission);

        $user = User::factory()->create([
            'company_id' => $company->id,
            'is_super_admin' => false,
            'is_company_admin' => false,
        ]);
        setPermissionsTeamId($company->id);
        $user->assignRole($role);

        $response = $this->actingAs($user)->get('/leads/leads');
        $response->assertOk();
    }
}
