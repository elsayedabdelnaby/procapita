# Quick Reference Guide

## Common Commands

### Development
```bash
# Start all services (server, queue, vite)
composer run dev

# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Fresh install (WARNING: deletes all data)
php artisan migrate:fresh --seed

# Clear cache
php artisan optimize:clear
php artisan permission:cache-reset
```

### Testing
```bash
# Run all tests
php artisan test

# Run specific test
php artisan test --filter=TestName

# Run tests in a file
php artisan test tests/Feature/ExampleTest.php
```

## Default Credentials

**Super Admin**
- Email: `superadmin@dopave.local`
- Password: `password`

## Key URLs

- Login: `/login`
- Dashboard: `/dashboard`
- Companies: `/core/companies`
- Roles: `/core/roles`
- Role Hierarchy: `/core/roles/hierarchy`
- Users: `/core/users`

## Permission Format

```
module.entity.action

Examples:
- core.companies.create
- core.users.read
- crm.leads.update
- inventory.products.delete
```

## Code Snippets

### Check if User is Super Admin
```php
if (auth()->user()->isSuperAdmin()) {
    // Super admin logic
}
```

### Check if User is Company Admin
```php
if (auth()->user()->isCompanyAdmin()) {
    // Company admin logic
}
```

### Check Permission
```php
if (auth()->user()->can('core.users.create')) {
    // User can create users
}
```

### Check Module Access
```php
if (auth()->user()->canAccessModule('crm')) {
    // User can access CRM module
}
```

### Create Company with Admin
```php
use Modules\Core\app\Services\CompanyService;

$companyService = app(CompanyService::class);

$company = $companyService->createCompany([
    'name' => 'Acme Corp',
    'email' => 'info@acme.com',
    'is_active' => true,
    'admin_user' => [
        'name' => 'John Doe',
        'email' => 'john@acme.com',
        'password' => 'password123',
    ],
]);
```

### Create Role in Hierarchy
```php
use Modules\Core\app\Services\RoleService;

$roleService = app(RoleService::class);

$role = $roleService->createRole([
    'name' => 'Sales Manager',
    'team_id' => $companyId,
    'parent_id' => $parentRoleId, // CEO role
    'permissions' => [1, 2, 3], // Permission IDs
]);
```

### Assign Module to Company
```php
$companyService->assignModule($companyId, 'crm', [
    'max_leads' => 10000,
    'features' => ['email', 'reports'],
]);
```

### Create User with Roles
```php
use Modules\Core\app\Services\UserService;

$userService = app(UserService::class);

$user = $userService->createUser([
    'name' => 'Jane Smith',
    'email' => 'jane@company.com',
    'password' => 'password123',
    'company_id' => $companyId,
    'is_company_admin' => false,
    'roles' => [$roleId1, $roleId2],
    'permissions' => [$permissionId],
]);
```

### Create Permissions for Module
```php
use Modules\Core\app\Models\Permission;

Permission::createForModule(
    'crm',
    'leads',
    ['create', 'read', 'update', 'delete', 'export']
);
```

## Middleware Usage

### In Routes
```php
// Super admin only
Route::middleware(['super.admin'])->group(function () {
    Route::get('/admin/settings', [AdminController::class, 'settings']);
});

// Company access required
Route::middleware(['company.access'])->group(function () {
    Route::get('/company/dashboard', [CompanyController::class, 'dashboard']);
});

// Module access required
Route::middleware(['module.access:crm'])->group(function () {
    Route::get('/crm/leads', [LeadController::class, 'index']);
});

// Specific permission required
Route::middleware(['permission:core.users.create'])->group(function () {
    Route::get('/users/create', [UserController::class, 'create']);
});
```

### In Controllers
```php
public function __construct()
{
    $this->middleware('super.admin')->only(['destroy']);
    $this->middleware('company.access');
    $this->middleware('permission:core.users.create')->only(['create', 'store']);
}
```

## Service Layer

All business logic should go through services:

```php
// Good ✅
$companyService->createCompany($data);
$roleService->updateRole($id, $data);
$userService->assignRole($userId, $roleId);

// Avoid ❌
Company::create($data);
Role::find($id)->update($data);
$user->assignRole($roleId);
```

## Model Relationships

### Company
```php
$company->users            // All users
$company->admins           // Company admins only
$company->modules          // All modules
$company->activeModules    // Active modules only
$company->roles            // All roles
```

### Role
```php
$role->company             // Parent company
$role->parent              // Parent role
$role->children            // Child roles
$role->descendants         // All descendants (recursive)
$role->permissions         // Assigned permissions
```

### User
```php
$user->company             // User's company
$user->roles               // Assigned roles
$user->permissions         // Direct permissions
```

## Common Queries

### Get Company Users
```php
User::forCompany($companyId)->active()->get();
```

### Get Role Hierarchy
```php
$roleService->getRoleHierarchy($companyId);
```

### Get Subordinate Roles
```php
$roleService->getSubordinateRoles($roleId);
```

### Get User Permissions
```php
$userService->getUserPermissions($userId);
```

### Get Module Permissions
```php
$permissionService->getPermissionsByModule('crm');
```

### Check if Role is Ancestor
```php
$role->isAncestorOf($otherRole);
```

## Database Queries

### Filter by Company
```php
// Models automatically scope to user's company
User::query()->get(); // Returns only user's company users

// For super admin, use forCompany scope
User::forCompany($companyId)->get();
```

### Active Records Only
```php
Company::active()->get();
User::active()->get();
CompanyModule::active()->get();
```

### Root Roles
```php
Role::rootRoles()->forCompany($companyId)->get();
```

## React Components

### DataTable
```tsx
<DataTable
    data={items}
    columns={[
        { header: 'Name', accessor: 'name' },
        { header: 'Email', accessor: 'email' },
        { header: 'Status', accessor: (row) => <Badge>{row.status}</Badge> },
    ]}
    actions={(row) => (
        <>
            <Button onClick={() => edit(row.id)}>Edit</Button>
            <Button onClick={() => delete(row.id)}>Delete</Button>
        </>
    )}
/>
```

### FormField
```tsx
<FormField
    label="Company Name"
    name="name"
    value={data.name}
    onChange={(e) => setData('name', e.target.value)}
    error={errors.name}
    required
/>
```

### RoleTree
```tsx
<RoleTree roles={hierarchyData} />
```

## Debugging

### View Current User Permissions
```php
dd(auth()->user()->getAllPermissions());
```

### View Role Hierarchy Path
```php
dd($role->hierarchy_path);
dd($role->getHierarchyPathArray());
```

### View User Roles
```php
dd(auth()->user()->roles);
```

### Check Permission Cache
```bash
php artisan permission:cache-reset
php artisan permission:show
```

## Troubleshooting

### Permissions not working?
```bash
php artisan permission:cache-reset
php artisan optimize:clear
```

### Frontend not updating?
```bash
npm run build
php artisan optimize:clear
```

### Database changes not applied?
```bash
php artisan migrate:fresh --seed
```

### Role hierarchy not calculating?
```php
$role->updateHierarchy();
```

## File Locations

### Backend
- Models: `Modules/Core/app/Models/`
- Services: `Modules/Core/app/Services/`
- Controllers: `Modules/Core/app/Http/Controllers/`
- Middleware: `Modules/Core/app/Middleware/`
- Migrations: `Modules/Core/database/migrations/`
- Seeders: `Modules/Core/database/seeders/`

### Frontend
- Components: `resources/js/components/core/`
- Pages: `resources/js/pages/Core/`
- Types: `resources/js/types/core.d.ts`

### Config
- Permissions: `config/permission.php`
- Modules: `config/modules.php`
- App: `bootstrap/app.php`

## Support

- Core Module README: `Modules/Core/README.md`
- Setup Guide: `SETUP_GUIDE.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`

