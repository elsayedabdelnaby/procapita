# Core Module

The Core module is the foundation of the multi-tenant ERP system. It handles companies, users, roles, and permissions with a hierarchical role structure.

## Features

### 1. Multi-Tenant Company Management
- **Super Admin** can manage multiple companies
- Each company operates independently within the same database
- Companies can be activated/deactivated
- Each company has its own admin user(s)

### 2. Hierarchical Role System
- Roles organized in a tree structure (e.g., CEO → Manager → Team Lead → Agent)
- Each role has a hierarchy path (e.g., H1:H3:H4)
- Root role (CEO) created automatically for each company
- Prevent circular references in hierarchy
- Visual hierarchy representation in the UI

### 3. Module & Entity Level Permissions
- Permissions structured as: `module.entity.action`
- Example: `core.users.create`, `crm.leads.update`
- Permissions can be assigned to roles or directly to users
- Module-specific permissions automatically available to company admins

### 4. User Management
- Three user types:
  - **Super Admin**: Full system access, manages all companies
  - **Company Admin**: Full access to their company's data and modules
  - **Regular User**: Access based on assigned roles and permissions
- Users can have multiple roles
- Direct permission assignments override role permissions

## Database Structure

### Companies Table
- `id`, `name`, `slug`, `email`, `phone`, `address`
- `logo`, `is_active`, `settings`

### Users Table (Extended)
- `company_id` - Links user to company
- `is_super_admin` - Super admin flag
- `is_company_admin` - Company admin flag
- `is_active` - Active status

### Roles Table (Extended)
- `team_id` - Company ID (using Spatie's teams feature)
- `parent_id` - Parent role for hierarchy
- `hierarchy_path` - Colon-separated path (e.g., "H1:H3:H4")
- `hierarchy_level` - Depth in hierarchy
- `is_root` - Root role flag
- `module_name`, `entity_name` - Module/entity association

### Permissions Table (Extended)
- `module_name` - Module identifier
- `entity_name` - Entity/resource name
- `action` - Permission action (create, read, update, delete)

### Company Modules Table
- Links companies to activated modules
- `company_id`, `module_name`, `is_active`, `settings`

## Architecture

### Service Layer Pattern
Business logic is handled by service classes:
- `CompanyService` - Company management
- `RoleService` - Role hierarchy and management
- `PermissionService` - Permission management
- `UserService` - User management

### Middleware
- `SuperAdminOnly` - Restrict to super admins
- `CheckCompanyAccess` - Ensure user can access company
- `CheckModuleAccess` - Verify module access
- `CheckPermission` - Verify specific permission

## Usage Examples

### Creating a Company
```php
$companyService->createCompany([
    'name' => 'Acme Corp',
    'email' => 'info@acme.com',
    'admin_user' => [
        'name' => 'John Doe',
        'email' => 'john@acme.com',
        'password' => 'password123'
    ]
]);
```

### Creating a Role Hierarchy
```php
// Root role (CEO) is created automatically
$ceo = Role::where('name', 'CEO')->first();

// Create HR role under CEO
$hr = $roleService->createRole([
    'name' => 'HR Manager',
    'team_id' => $companyId,
    'parent_id' => $ceo->id
]);

// Create subordinate role
$recruiter = $roleService->createRole([
    'name' => 'Recruiter',
    'team_id' => $companyId,
    'parent_id' => $hr->id
]);
```

### Checking Permissions
```php
// In middleware
if (!$user->canAccessModule('crm')) {
    abort(403);
}

// In controller
if ($user->hasPermissionTo('core.users.create')) {
    // Allow user creation
}

// Super admin bypass
if ($user->isSuperAdmin()) {
    // Full access
}
```

### Adding Module to Company
```php
$companyService->assignModule($companyId, 'crm', [
    'max_leads' => 10000,
    'features' => ['email_integration', 'reports']
]);
```

## Routes

### Companies (Super Admin Only)
- `GET /core/companies` - List all companies
- `GET /core/companies/create` - Create company form
- `POST /core/companies` - Store company
- `GET /core/companies/{id}` - View company
- `GET /core/companies/{id}/edit` - Edit form
- `PUT /core/companies/{id}` - Update company
- `DELETE /core/companies/{id}` - Delete company
- `POST /core/companies/{id}/activate` - Activate
- `POST /core/companies/{id}/deactivate` - Deactivate

### Roles
- `GET /core/roles` - List roles
- `GET /core/roles/hierarchy` - View hierarchy tree
- `GET /core/roles/create` - Create role form
- `POST /core/roles` - Store role
- `GET /core/roles/{id}` - View role
- `GET /core/roles/{id}/edit` - Edit form
- `PUT /core/roles/{id}` - Update role
- `DELETE /core/roles/{id}` - Delete role

### Users
- `GET /core/users` - List users
- `GET /core/users/create` - Create user form
- `POST /core/users` - Store user
- `GET /core/users/{id}` - View user
- `GET /core/users/{id}/edit` - Edit form
- `PUT /core/users/{id}` - Update user
- `DELETE /core/users/{id}` - Delete user
- `POST /core/users/{id}/activate` - Activate
- `POST /core/users/{id}/deactivate` - Deactivate

## Setup

### 1. Run Migrations
```bash
php artisan migrate
```

### 2. Seed Initial Data
```bash
php artisan db:seed --class="Modules\Core\Database\Seeders\CoreDatabaseSeeder"
```

This creates:
- Core module permissions
- Super admin user (superadmin@erp.local / password)

### 3. Create Your First Company
Login as super admin and navigate to `/core/companies/create`

## Frontend Components

### Reusable Components
- `DataTable` - Generic data table with sorting
- `FormField` - Form input with label and error
- `RoleTree` - Hierarchical role visualization

### Pages
- `Companies/Index` - Company listing
- `Companies/Create` - Create company
- `Roles/Index` - Role listing
- `Roles/Hierarchy` - Role tree view
- `Users/Index` - User listing

## Security Features

1. **Multi-level Access Control**
   - Super admin → Company admin → Regular user
   - Role-based permissions
   - Direct permission assignments

2. **Company Isolation**
   - Users scoped to their company
   - Cross-company access prevented (except super admin)

3. **Module-based Access**
   - Companies only access activated modules
   - Permissions automatically created per module

4. **Audit Trail**
   - Activity logging via Spatie Activity Log
   - Track all changes to companies, users, roles

## Future Enhancements

- [ ] Role templates for common hierarchies
- [ ] Permission groups/bundles
- [ ] Company settings management UI
- [ ] Bulk user import
- [ ] Advanced role delegation
- [ ] Module marketplace

