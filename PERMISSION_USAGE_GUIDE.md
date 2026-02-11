# Permission Usage Guide

This guide explains how to use the permission validation system throughout your React components.

## 📋 Table of Contents
1. [Available Permissions](#available-permissions)
2. [How the Sidebar Works](#how-the-sidebar-works)
3. [Where to Use Permission Checks](#where-to-use-permission-checks)
4. [Practical Examples](#practical-examples)
5. [Common Patterns](#common-patterns)

---

## 🔑 Available Permissions

Based on your seeders, here are all available permissions:

### Core Module
- `core.companies.create`, `core.companies.read`, `core.companies.update`, `core.companies.delete`
- `core.roles.create`, `core.roles.read`, `core.roles.update`, `core.roles.delete`
- `core.users.create`, `core.users.read`, `core.users.update`, `core.users.delete`
- `core.permissions.create`, `core.permissions.read`, `core.permissions.update`, `core.permissions.delete`

### Marketing Module
- `marketing.campaigns.*` (create, read, update, delete, export, pause, activate, report)
- `marketing.campaign_metrics.*` (create, read, update, delete, export)
- `marketing.campaign_types.*` (create, read, update, delete)
- `marketing.campaign_statuses.*` (create, read, update, delete)
- `marketing.campaign_channels.*` (create, read, update, delete)
- `marketing.marketing_lists.*` (create, read, update, delete, export)
- `marketing.marketing_templates.*` (create, read, update, delete)

### Drivers Module
- `drivers.drivers.*` (create, read, update, delete, assign, view-stages, view-documents, export, import, mass-edit, mass-delete, delete-all)
- `drivers.leadsources.*` (create, read, update, delete, toggle-active, export, import)
- `drivers.leadstatuses.*` (create, read, update, delete, toggle-active, export, import)
- `drivers.driverstages.*` (create, read, update, delete, complete, reject, export)
- `drivers.driverdocuments.*` (create, read, update, delete, upload, approve, reject, download, export, set-pending, set-approved, set-rejected, view, replace, delete-file)

### Riding Car Companies Module
- `ridingcarcompanies.ridingcompanies.*` (create, read, update, delete, toggle-active, upload-logo)
- `ridingcarcompanies.companyrides.*` (create, read, update, delete)
- `ridingcarcompanies.stagetemplates.*` (create, read, update, delete, toggle-active)
- `ridingcarcompanies.documentrequirements.*` (create, read, update, delete, toggle-active)
- `ridingcarcompanies.integrations.*` (create, read, update, delete, toggle-active, test-connection)
- `ridingcarcompanies.integrationsettings.*` (create, read, update, delete, toggle-active, test-access)

---

## 🎯 How the Sidebar Works

**The sidebar navigation is ALREADY configured!** It automatically shows/hides links based on permissions.

### How It Works:
1. **Backend** (`app/Http/Middleware/HandleInertiaRequests.php`):
   - Each navigation item has `permission_module` and `permission_entity` metadata
   - Example: `'permission_module' => 'core', 'permission_entity' => 'companies'`

2. **Frontend** (`resources/js/components/nav-main.tsx`):
   - Uses `usePermissions()` hook
   - Automatically filters navigation items using `hasEntityPermission()`
   - If user has ANY of (create, read, update, delete) for that entity → shows the link
   - If user has NO permissions → hides the link

### Example:
```typescript
// In HandleInertiaRequests.php - Backend defines:
$coreItems[] = [
    'title' => 'Companies',
    'href' => '/core/companies',
    'icon' => 'Building2',
    'permission_module' => 'core',      // ← This tells the system
    'permission_entity' => 'companies', // ← to check these permissions
];

// In nav-main.tsx - Frontend automatically filters:
// If user has core.companies.create OR read OR update OR delete → Shows "Companies" link
// If user has NONE → Hides "Companies" link
```

**You don't need to do anything for the sidebar - it's already working!**

---

## 📍 Where to Use Permission Checks

Use permission checks in these places:

### 1. **Action Buttons** (Create, Edit, Delete)
```typescript
// Show "Create" button only if user has create permission
{can('core', 'companies', 'create') && (
    <Button>Create Company</Button>
)}
```

### 2. **Table Row Actions** (Edit, Delete, View)
```typescript
// Show edit/delete buttons in data table rows
{can('drivers', 'drivers', 'update') && (
    <Button variant="ghost" size="sm">Edit</Button>
)}
{can('drivers', 'drivers', 'delete') && (
    <Button variant="ghost" size="sm">Delete</Button>
)}
```

### 3. **Page Headers** (Create button in page header)
```typescript
// In page header, show create button
<div className="flex justify-between items-center">
    <h1>Companies</h1>
    {can('core', 'companies', 'create') && (
        <Link href="/core/companies/create">
            <Button>Create Company</Button>
        </Link>
    )}
</div>
```

### 4. **Form Submit Buttons** (Enable/disable based on permission)
```typescript
// Disable submit if user doesn't have permission
<Button 
    type="submit" 
    disabled={!can('core', 'companies', 'create') || processing}
>
    Create Company
</Button>
```

### 5. **Navigation Links** (Already done in sidebar, but can use in breadcrumbs)
```typescript
// In breadcrumbs or other navigation
{hasEntityPermission('drivers', 'drivers') && (
    <Link href="/leads/leads">Drivers</Link>
)}
```

### 6. **Conditional Rendering** (Show/hide entire sections)
```typescript
// Show entire section only if user has read permission
{can('marketing', 'campaigns', 'read') && (
    <div>
        <h2>Campaigns</h2>
        {/* Campaign content */}
    </div>
)}
```

### 7. **Special Actions** (Export, Import, Custom actions)
```typescript
// Show export button only if user has export permission
{can('drivers', 'drivers', 'export') && (
    <Button onClick={handleExport}>Export</Button>
)}

// Show pause button only if user has pause permission
{can('marketing', 'campaigns', 'pause') && (
    <Button onClick={handlePause}>Pause Campaign</Button>
)}
```

---

## 💡 Practical Examples

### Example 1: Index Page with Create Button

```typescript
import { usePermissions } from '@/hooks/use-permissions';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

export default function CompaniesIndex({ companies }) {
    const { can } = usePermissions();

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1>Companies</h1>
                {/* Only show create button if user has permission */}
                {can('core', 'companies', 'create') && (
                    <Link href="/core/companies/create">
                        <Button>Create Company</Button>
                    </Link>
                )}
            </div>

            {/* Table content */}
        </div>
    );
}
```

### Example 2: Data Table with Row Actions

```typescript
import { usePermissions } from '@/hooks/use-permissions';
import { Link } from '@inertiajs/react';

export default function DriversTable({ drivers }) {
    const { can } = usePermissions();

    return (
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {drivers.map((driver) => (
                    <tr key={driver.id}>
                        <td>{driver.name}</td>
                        <td>{driver.email}</td>
                        <td>
                            <div className="flex gap-2">
                                {/* Show edit only if user has update permission */}
                                {can('drivers', 'drivers', 'update') && (
                                    <Link href={`/leads/leads/${driver.id}/edit`}>
                                        <Button variant="ghost" size="sm">Edit</Button>
                                    </Link>
                                )}
                                
                                {/* Show delete only if user has delete permission */}
                                {can('drivers', 'drivers', 'delete') && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleDelete(driver.id)}
                                    >
                                        Delete
                                    </Button>
                                )}
                                
                                {/* Show view stages only if user has view-stages permission */}
                                {can('drivers', 'drivers', 'view-stages') && (
                                    <Link href={`/leads/leads/${driver.id}/stages`}>
                                        <Button variant="ghost" size="sm">View Stages</Button>
                                    </Link>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
```

### Example 3: Form Page with Conditional Fields

```typescript
import { usePermissions } from '@/hooks/use-permissions';
import { Form } from '@inertiajs/react';

export default function CampaignEdit({ campaign }) {
    const { can } = usePermissions();

    return (
        <Form>
            {/* Form fields */}
            
            <div className="flex gap-4">
                {/* Show pause button only if user has pause permission */}
                {can('marketing', 'campaigns', 'pause') && (
                    <Button type="button" variant="outline" onClick={handlePause}>
                        Pause Campaign
                    </Button>
                )}
                
                {/* Show activate button only if user has activate permission */}
                {can('marketing', 'campaigns', 'activate') && (
                    <Button type="button" variant="outline" onClick={handleActivate}>
                        Activate Campaign
                    </Button>
                )}
                
                {/* Show update button only if user has update permission */}
                {can('marketing', 'campaigns', 'update') && (
                    <Button type="submit">
                        Update Campaign
                    </Button>
                )}
            </div>
        </Form>
    );
}
```

### Example 4: Multiple Actions in Header

```typescript
import { usePermissions } from '@/hooks/use-permissions';

export default function DriversIndex({ drivers }) {
    const { can } = usePermissions();

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1>Drivers</h1>
                <div className="flex gap-2">
                    {/* Show create button */}
                    {can('drivers', 'drivers', 'create') && (
                        <Link href="/leads/leads/create">
                            <Button>Create Driver</Button>
                        </Link>
                    )}
                    
                    {/* Show import button */}
                    {can('drivers', 'drivers', 'import') && (
                        <Button variant="outline" onClick={handleImport}>
                            Import
                        </Button>
                    )}
                    
                    {/* Show export button */}
                    {can('drivers', 'drivers', 'export') && (
                        <Button variant="outline" onClick={handleExport}>
                            Export
                        </Button>
                    )}
                    
                    {/* Show mass delete button */}
                    {can('drivers', 'drivers', 'mass-delete') && (
                        <Button variant="destructive" onClick={handleMassDelete}>
                            Delete Selected
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Table content */}
        </div>
    );
}
```

### Example 5: Conditional Sections

```typescript
import { usePermissions } from '@/hooks/use-permissions';

export default function DriverShow({ driver }) {
    const { can } = usePermissions();

    return (
        <div>
            <h1>{driver.name}</h1>
            
            {/* Basic info - always visible if user can read */}
            {can('drivers', 'drivers', 'read') && (
                <div>
                    <p>Email: {driver.email}</p>
                    <p>Phone: {driver.phone}</p>
                </div>
            )}
            
            {/* Stages section - only if user can view stages */}
            {can('drivers', 'drivers', 'view-stages') && (
                <div>
                    <h2>Stages</h2>
                    {/* Stages content */}
                </div>
            )}
            
            {/* Documents section - only if user can view documents */}
            {can('drivers', 'drivers', 'view-documents') && (
                <div>
                    <h2>Documents</h2>
                    {/* Documents content */}
                </div>
            )}
        </div>
    );
}
```

---

## 🎨 Common Patterns

### Pattern 1: Check Multiple Permissions
```typescript
const { can, hasAnyPermission } = usePermissions();

// Check if user has ANY of these permissions
if (hasAnyPermission([
    'drivers.drivers.export',
    'drivers.drivers.import'
])) {
    // Show import/export section
}

// Check if user has ALL permissions
if (can('drivers', 'drivers', 'read') && 
    can('drivers', 'drivers', 'update')) {
    // Show editable view
}
```

### Pattern 2: Check Entity Access (Any CRUD)
```typescript
const { hasEntityPermission } = usePermissions();

// Check if user has ANY CRUD permission for drivers
if (hasEntityPermission('drivers', 'drivers')) {
    // Show drivers section
}
```

### Pattern 3: Check Module Access
```typescript
const { canAccessModule } = usePermissions();

// Check if user has access to entire module
if (canAccessModule('marketing')) {
    // Show marketing module content
}
```

### Pattern 4: Super Admin Check
```typescript
const { isSuperAdmin } = usePermissions();

// Super admins see everything
if (isSuperAdmin) {
    // Show admin-only features
}
```

---

## ✅ Quick Reference

### Import the Hook
```typescript
import { usePermissions } from '@/hooks/use-permissions';
```

### Available Functions
```typescript
const {
    // User info
    isSuperAdmin,
    isCompanyAdmin,
    userPermissions,
    
    // Permission checks
    can(module, entity, action),              // Check specific permission
    hasPermission(permissionName),            // Check by full name
    hasAnyPermission(permissionNames[]),      // Check if has any
    hasAllPermissions(permissionNames[]),      // Check if has all
    hasEntityPermission(module, entity),       // Check any CRUD
    canAccessModule(moduleName),              // Check module access
    
    // Get permissions
    getModulePermissions(moduleName),
    getEntityPermissions(module, entity),
} = usePermissions();
```

### Permission Format
```
{module}.{entity}.{action}

Examples:
- core.companies.create
- drivers.drivers.export
- marketing.campaigns.pause
```

---

## 🚀 Next Steps

1. **Review your existing pages** - Add permission checks to buttons and actions
2. **Start with Index pages** - Add permission checks to "Create" buttons
3. **Then Edit pages** - Add permission checks to "Update" buttons
4. **Then Delete actions** - Add permission checks to delete buttons
5. **Special actions** - Add checks for export, import, pause, etc.

Remember: **The sidebar is already working automatically!** You only need to add permission checks to buttons, links, and actions within your pages.

