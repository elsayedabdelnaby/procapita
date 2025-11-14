# Migration Error Fix Guide

## Problem

You have a migration file `2025_01_01_000001_modify_spatie_roles_table.php` that's failing with:
```
Undefined variable $tableNames
```

## Solution Options

### Option 1: Fresh Start (Recommended for Development)

If you're in development and can afford to lose current data:

```bash
# Drop all tables and re-run migrations
php artisan migrate:fresh

# Then seed
php artisan db:seed
```

This will use our clean migrations from `Modules/Core/database/migrations/` which are properly structured.

###Option 2: Fix the Problematic Migration

Find the file (it's likely in `database/migrations/` or published somewhere) and fix it:

**BEFORE (Broken):**
```php
public function up(): void
{
    $tableNames = config('permission.table_names');
    
    Schema::table($tableNames['roles'], function (Blueprint $table) {
        $table->foreignId('parent_id')->nullable()->constrained($tableNames['roles']); // ❌ Error here
    });
}
```

**AFTER (Fixed):**
```php
public function up(): void
{
    $tableNames = config('permission.table_names');
    
    Schema::table($tableNames['roles'], function (Blueprint $table) use ($tableNames) { // ✅ Add 'use'
        $table->foreignId('parent_id')->nullable()->constrained($tableNames['roles']);
    });
}
```

### Option 3: Delete Published Migrations

If migrations were published from the module, delete them and use module migrations directly:

1. Delete any migrations in `database/migrations/` that start with `2025_01_01_*`
2. The module will automatically load migrations from `Modules/Core/database/migrations/`

## Finding the Problem File

Search for files containing "modify_spatie_roles_table":

```bash
# Windows PowerShell
Get-ChildItem -Path . -Recurse -Filter "*modify_spatie_roles_table.php"

# Windows CMD
dir /s *modify_spatie_roles_table.php

# Git Bash / WSL
find . -name "*modify_spatie_roles_table.php"
```

## Our Clean Migration Structure

The migrations we created are in `Modules/Core/database/migrations/` with these file names:

1. `2025_11_03_000001_create_companies_table.php`
2. `2025_11_03_000002_create_company_modules_table.php`
3. `2025_11_03_000003_add_company_id_to_users_table.php`
4. `2025_11_03_000004_add_hierarchy_to_roles_table.php`
5. `2025_11_03_000005_add_module_entity_to_permissions_table.php`

These migrations are properly structured and will work correctly.

## After Fixing

```bash
# If you fixed the migration
php artisan migrate

# If you did fresh start
php artisan migrate:fresh
php artisan db:seed

# Verify super admin was created
# Email: superadmin@dopave.local
# Password: password
```

## Important Notes

- The namespace for our migrations should be `Modules\Core\database\migrations` (lowercase 'database')
- Make sure you're not mixing published migrations with module migrations
- Module migrations auto-load, you don't need to publish them

## Need More Help?

If the migration file is hard to find, you can check what Laravel sees:

```bash
php artisan migrate:status
```

This will show all registered migrations and their status.

