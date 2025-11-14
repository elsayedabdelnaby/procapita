# Multi-Tenant ERP System - Setup Guide

This guide will help you set up and run your multi-tenant ERP system with the Core module.

## Prerequisites

- PHP 8.2 or higher
- Composer
- Node.js and npm
- Database (MySQL, PostgreSQL, or SQLite)

## Initial Setup

### 1. Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install JavaScript dependencies
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure your database:

```bash
cp .env.example .env
```

Update these values in `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

Generate application key:
```bash
php artisan key:generate
```

### 3. Run Migrations

```bash
php artisan migrate
```

This will create all necessary tables including:
- Companies
- Company Modules
- Users (with multi-tenant fields)
- Roles (with hierarchy)
- Permissions (with module/entity structure)
- Activity log tables

### 4. Seed Initial Data

```bash
php artisan db:seed
```

This creates:
- **Super Admin User**
  - Email: `superadmin@dopave.local`
  - Password: `password`
- Core module permissions

### 5. Build Frontend Assets

```bash
# Development
npm run dev

# Production
npm run build
```

## Running the Application

### Development

Run all services concurrently (server, queue, and vite):
```bash
composer run dev
```

Or run separately:
```bash
# Terminal 1 - Laravel server
php artisan serve

# Terminal 2 - Queue worker
php artisan queue:listen

# Terminal 3 - Vite dev server
npm run dev
```

### Production

```bash
composer run setup
```

## First Steps

### 1. Login as Super Admin

Navigate to `/login` and use:
- Email: `superadmin@dopave.local`
- Password: `password`

### 2. Create Your First Company

1. Go to `/core/companies`
2. Click "Create Company"
3. Fill in company details:
   - Company Name: Required
   - Slug: Auto-generated if empty
   - Email, Phone, Address: Optional
   - Active: Check to activate immediately

4. Fill in Admin User details:
   - Admin Name
   - Admin Email
   - Admin Password

5. Click "Create Company"

This will:
- Create the company
- Create the company admin user
- Create a default CEO role (root role) for the company
- Assign the CEO role to the admin user

### 3. Add Modules to Company

Once a company is created, you can assign modules:

```php
// Via Service
$companyService->assignModule($companyId, 'crm', [
    'settings' => ['feature_x' => true]
]);
```

The company admin will automatically get full access to assigned modules.

### 4. Create Role Hierarchy

1. Login as company admin or super admin
2. Go to `/core/roles/hierarchy` to see the tree view
3. Click "Create Role"
4. Fill in role details:
   - Name: Role name
   - Parent Role: Select parent (or leave empty for root)
   - Module: Optional module association
   - Permissions: Select permissions

Example hierarchy:
```
CEO (H1) [Root]
├── HR Manager (H1:H2)
│   └── Recruiter (H1:H2:H3)
└── Sales Manager (H1:H4)
    ├── Team Lead 1 (H1:H4:H5)
    └── Team Lead 2 (H1:H4:H6)
```

### 5. Create Users

1. Go to `/core/users`
2. Click "Create User"
3. Fill in user details:
   - Name, Email, Password: Required
   - Company: Select company
   - Company Admin: Check if user should be company admin
   - Roles: Select one or more roles
   - Direct Permissions: Optional

## Permission System

### Permission Structure

Permissions follow the pattern: `module.entity.action`

Examples:
- `core.companies.create`
- `core.users.read`
- `crm.leads.update`
- `inventory.products.delete`

### Permission Hierarchy

1. **Super Admin**: Full access to everything (bypasses all checks)
2. **Company Admin**: Full access to their company's activated modules
3. **Role Permissions**: Permissions assigned to user's roles
4. **Direct Permissions**: Permissions directly assigned to user

### Checking Permissions in Code

#### Middleware
```php
// In routes
Route::middleware(['permission:core.users.create'])->group(function () {
    // Routes that require permission
});

Route::middleware(['super.admin'])->group(function () {
    // Super admin only routes
});

Route::middleware(['company.access'])->group(function () {
    // Company-scoped routes
});

Route::middleware(['module.access:crm'])->group(function () {
    // Module-specific routes
});
```

#### In Controllers
```php
// Check permission
if (! auth()->user()->can('core.users.create')) {
    abort(403);
}

// Check super admin
if (auth()->user()->isSuperAdmin()) {
    // Super admin logic
}

// Check company admin
if (auth()->user()->isCompanyAdmin()) {
    // Company admin logic
}

// Check module access
if (! auth()->user()->canAccessModule('crm')) {
    abort(403);
}
```

#### In Blade/Inertia
```php
@can('core.users.create')
    <!-- Show create button -->
@endcan
```

## Creating New Modules

### 1. Generate Module

```bash
php artisan module:make YourModule
```

### 2. Create Module Permissions

```php
use Modules\Core\app\Models\Permission;

Permission::createForModule('yourmodule', 'leads', ['create', 'read', 'update', 'delete']);
Permission::createForModule('yourmodule', 'contacts', ['create', 'read', 'update', 'delete']);
```

### 3. Protect Module Routes

```php
// In your module's routes file
Route::middleware(['auth', 'module.access:yourmodule'])->group(function () {
    Route::get('/yourmodule/leads', [LeadController::class, 'index'])
        ->middleware('permission:yourmodule.leads.read');
});
```

## Best Practices

### 1. Role Hierarchy Design

- Keep hierarchy shallow (max 4-5 levels)
- Use clear, descriptive names
- Document reporting structure
- Avoid circular references

### 2. Permission Naming

- Use lowercase
- Follow format: `module.entity.action`
- Use standard actions: create, read, update, delete
- Add custom actions as needed (e.g., approve, export)

### 3. Company Isolation

- Always filter queries by company_id (except super admin)
- Use middleware to enforce company access
- Test cross-company access scenarios

### 4. Module Management

- Activate modules before allowing access
- Check module availability in controllers
- Handle module deactivation gracefully

## Troubleshooting

### Permission Cache

Clear permission cache if permissions don't update:
```bash
php artisan permission:cache-reset
```

### Migration Issues

Reset database (WARNING: loses all data):
```bash
php artisan migrate:fresh --seed
```

### Frontend Build Issues

```bash
# Clear cache
npm run build
php artisan optimize:clear

# Reinstall node modules
rm -rf node_modules package-lock.json
npm install
```

## Testing

### Create Test Data

```php
use Modules\Core\app\Models\Company;
use App\Models\User;

// Create company
$company = Company::factory()->create();

// Create users
$admin = User::factory()->create([
    'company_id' => $company->id,
    'is_company_admin' => true,
]);

$user = User::factory()->create([
    'company_id' => $company->id,
]);

// Assign role
$role = $company->roles()->first();
$user->assignRole($role);
```

## Next Steps

1. ✅ Create your first company
2. ✅ Set up role hierarchy
3. ✅ Add users with appropriate roles
4. 📝 Create additional modules (CRM, Inventory, etc.)
5. 📝 Configure company-specific settings
6. 📝 Set up module permissions
7. 📝 Customize UI/branding

## Support & Documentation

- Core Module README: `Modules/Core/README.md`
- Laravel Documentation: https://laravel.com/docs
- Spatie Permission: https://spatie.be/docs/laravel-permission
- Inertia.js: https://inertiajs.com/

## Security Notes

- Change default super admin password immediately
- Use strong passwords for all users
- Enable 2FA for admin accounts
- Regular backups recommended
- Keep dependencies updated
- Review audit logs regularly

## Default Credentials

**Super Admin**
- Email: `superadmin@dopave.local`
- Password: `password`

⚠️ **IMPORTANT**: Change this password immediately in production!

