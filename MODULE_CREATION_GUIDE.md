# Module Creation Guide - Adding New Modules with Entities & Permissions

## Overview

Modules in your system are **code-based** (not database-stored), but their **permissions** and **company activations** are stored in the database.

---

## Database Tables

### 1. `permissions` Table
Stores all permissions across all modules:
- `module_name` - Module identifier (core, crm, inventory)
- `entity_name` - Entity/resource name (leads, products, users)
- `action` - Permission action (create, read, update, delete)

### 2. `company_modules` Table
Tracks which modules are activated for each company:
- `company_id` - Which company
- `module_name` - Module name
- `is_active` - Active status
- `settings` - Module-specific settings (JSON)

---

## Creating a New Module - Example: CRM

### Step 1: Generate Module Structure

```bash
php artisan module:make CRM
```

This creates:
```
Modules/CRM/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Requests/
│   │   └── Middleware/
│   ├── Models/
│   ├── Services/
│   └── Providers/
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── resources/
│   ├── views/
│   └── assets/
└── routes/
    ├── web.php
    └── api.php
```

---

### Step 2: Create Entities (Models)

```bash
php artisan module:make-model Lead CRM
php artisan module:make-model Contact CRM
php artisan module:make-model Deal CRM
```

---

### Step 3: Create Migrations for Entities

```bash
php artisan module:make-migration create_leads_table CRM
php artisan module:make-migration create_contacts_table CRM
php artisan module:make-migration create_deals_table CRM
```

**Example: `create_leads_table.php`**
```php
Schema::create('leads', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained()->onDelete('cascade');
    $table->string('name');
    $table->string('email')->nullable();
    $table->string('phone')->nullable();
    $table->string('status')->default('new');
    $table->foreignId('assigned_to')->nullable()->constrained('users');
    $table->timestamps();
    
    $table->index('company_id');
    $table->index('status');
});
```

---

### Step 4: Create Permissions for Module

Create a seeder for module permissions:

**File:** `Modules/CRM/database/seeders/CRMPermissionsSeeder.php`

```php
<?php

namespace Modules\CRM\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Permission;

class CRMPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $entities = [
            'leads' => ['create', 'read', 'update', 'delete', 'export', 'assign'],
            'contacts' => ['create', 'read', 'update', 'delete', 'export'],
            'deals' => ['create', 'read', 'update', 'delete', 'approve', 'close'],
        ];

        foreach ($entities as $entity => $actions) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(
                    [
                        'name' => "crm.{$entity}.{$action}",
                        'guard_name' => 'web',
                    ],
                    [
                        'module_name' => 'crm',
                        'entity_name' => $entity,
                        'action' => $action,
                    ]
                );
            }
        }

        $this->command->info('CRM permissions seeded successfully.');
    }
}
```

**Run the seeder:**
```bash
php artisan db:seed --class=Modules\\CRM\\database\\seeders\\CRMPermissionsSeeder
```

---

### Step 5: Activate Module for a Company

**Programmatically:**
```php
use Modules\Core\app\Services\CompanyService;

$companyService = app(CompanyService::class);

$companyService->assignModule(1, 'crm', [
    'max_leads' => 10000,
    'features' => ['email_integration', 'reports'],
]);
```

**Or via UI** (future enhancement):
- Super admin goes to Company view
- Click "Modules" tab (to be created)
- Toggle "CRM" module on/off

---

## Current System Structure

### Existing Permissions

You can query the database to see current permissions:

```sql
SELECT module_name, entity_name, action, name
FROM permissions
ORDER BY module_name, entity_name, action;
```

**Current permissions (Core module):**
```
module_name | entity_name | action | name
------------|-------------|--------|---------------------
core        | companies   | create | core.companies.create
core        | companies   | read   | core.companies.read
core        | companies   | update | core.companies.update
core        | companies   | delete | core.companies.delete
core        | users       | create | core.users.create
core        | users       | read   | core.users.read
core        | users       | update | core.users.update
core        | users       | delete | core.users.delete
core        | roles       | create | core.roles.create
core        | roles       | read   | core.roles.read
core        | roles       | update | core.roles.update
core        | roles       | delete | core.roles.delete
core        | permissions | create | core.permissions.create
core        | permissions | read   | core.permissions.read
core        | permissions | update | core.permissions.update
core        | permissions | delete | core.permissions.delete
```

---

### Viewing Permissions Programmatically

```php
use Modules\Core\app\Services\PermissionService;

$permissionService = app(PermissionService::class);

// Get all permissions grouped by module and entity
$grouped = $permissionService->getGroupedPermissions();

/*
Result:
[
    'core' => [
        'companies' => [Permission, Permission, ...],
        'users' => [Permission, Permission, ...],
        'roles' => [Permission, Permission, ...],
    ],
    'crm' => [
        'leads' => [Permission, Permission, ...],
        'contacts' => [Permission, Permission, ...],
    ],
]
*/
```

---

## Example: Complete CRM Module Setup

### 1. Create Module
```bash
php artisan module:make CRM
```

### 2. Create Models
```bash
php artisan module:make-model Lead CRM
php artisan module:make-model Contact CRM
php artisan module:make-model Deal CRM
```

### 3. Create Migrations
```bash
php artisan module:make-migration create_leads_table CRM
php artisan module:make-migration create_contacts_table CRM
php artisan module:make-migration create_deals_table CRM
```

### 4. Create Permissions Seeder
```php
// Modules/CRM/database/seeders/CRMPermissionsSeeder.php
Permission::createForModule('crm', 'leads', ['create', 'read', 'update', 'delete']);
Permission::createForModule('crm', 'contacts', ['create', 'read', 'update', 'delete']);
Permission::createForModule('crm', 'deals', ['create', 'read', 'update', 'delete']);
```

### 5. Run Migrations & Seeders
```bash
php artisan migrate
php artisan db:seed --class=Modules\\CRM\\database\\seeders\\CRMPermissionsSeeder
```

### 6. Activate for Company
```php
$companyService->assignModule(1, 'CRM');
```

---

## Checking Current System

### See All Modules (Code-based):
```bash
php artisan module:list
```

**Current output:**
```
+--------+---------+---------+
| Name   | Status  | Priority|
+--------+---------+---------+
| Core   | Enabled | 0       |
+--------+---------+---------+
```

---

### See All Permissions (Database):
```bash
php artisan tinker

>>> Modules\Core\app\Models\Permission::all()->pluck('name');
```

**Current output:**
```
[
    "core.companies.create",
    "core.companies.read",
    "core.companies.update",
    "core.companies.delete",
    "core.users.create",
    "core.users.read",
    ...
]
```

---

### See Permissions Grouped by Module:
```bash
php artisan tinker

>>> Modules\Core\app\Models\Permission::select('module_name', 'entity_name')
    ->distinct()
    ->orderBy('module_name')
    ->orderBy('entity_name')
    ->get();
```

**Current output:**
```
module: core, entity: companies
module: core, entity: users
module: core, entity: roles
module: core, entity: permissions
```

---

## Summary

**Modules:** Code-based in `Modules/` directory  
**Entities:** Models within each module  
**Permissions:** Database table with module_name, entity_name, action columns  
**Company Activation:** `company_modules` table tracks active modules per company  

Your current system has:
- ✅ **1 Module:** Core
- ✅ **4 Entities:** companies, users, roles, permissions  
- ✅ **16 Permissions:** CRUD for each entity

To add more modules (CRM, Inventory, etc.), follow the pattern above!

