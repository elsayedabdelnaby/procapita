# Navigation & Flash Messages - Implementation Guide

## What Was Implemented

### 1. Dynamic Sidebar Navigation Based on User Permissions

The sidebar now automatically shows menu items based on:
- User role (Super Admin, Company Admin, Regular User)
- User permissions
- Activated modules for the company

#### Structure:
```
Dashboard (always visible)
Core (module group)
  ├── Companies (Super Admin only)
  ├── Roles (if has access)
  ├── Role Hierarchy (if has access)
  └── Users (if has access)
```

### 2. Flash Messages System

Toast-style notifications for:
- ✅ Success messages (green, auto-dismiss after 5s)
- ❌ Error messages (red, manual dismiss)
- ℹ️ Info messages (blue, auto-dismiss after 5s)

## Files Modified

### Backend

**`app/Http/Middleware/HandleInertiaRequests.php`**
- Added `navigation` array to shared props
- Added `flash` messages to shared props
- Implemented `getNavigationItems()` method with permission checks

### Frontend

**`resources/js/components/app-sidebar.tsx`**
- Updated to use dynamic navigation from props
- Removed hardcoded menu items

**`resources/js/components/nav-main.tsx`**
- Complete rewrite to support grouped navigation
- Dynamic icon loading from Lucide Icons
- Support for both single items and grouped items

**`resources/js/types/index.d.ts`**
- Added `NavigationItem` interface
- Added `navigation` and `flash` to `SharedData`

**`resources/js/components/flash-messages.tsx`** _(NEW)_
- Toast-style notification component
- Auto-dismiss for success/info
- Manual dismiss with X button

**`resources/js/layouts/app-layout.tsx`**
- Added `<FlashMessages />` component

## How Navigation Works

### Backend Permission Checks

```php
// In HandleInertiaRequests.php
protected function getNavigationItems($user): array
{
    $navigation = [];
    
    // Dashboard - always visible
    $navigation[] = [
        'title' => 'Dashboard',
        'href' => '/dashboard',
        'icon' => 'LayoutGrid',
    ];
    
    // Core Module Items
    $coreItems = [];
    
    // Companies - Super Admin only
    if ($user->isSuperAdmin()) {
        $coreItems[] = [
            'title' => 'Companies',
            'href' => '/core/companies',
            'icon' => 'Building2',
        ];
    }
    
    // Roles - if has permission
    if ($user->isSuperAdmin() || $user->isCompanyAdmin() || $user->can('core.roles.read')) {
        $coreItems[] = [
            'title' => 'Roles',
            'href' => '/core/roles',
            'icon' => 'ShieldCheck',
        ];
    }
    
    // Users - if has permission
    if ($user->isSuperAdmin() || $user->isCompanyAdmin() || $user->can('core.users.read')) {
        $coreItems[] = [
            'title' => 'Users',
            'href' => '/core/users',
            'icon' => 'Users',
        ];
    }
    
    // Add Core group if it has items
    if (!empty($coreItems)) {
        $navigation[] = [
            'title' => 'Core',
            'items' => $coreItems,
        ];
    }
    
    return $navigation;
}
```

### Frontend Rendering

The `NavMain` component handles two types of navigation items:

1. **Single Items** (with `href`):
```typescript
{
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutGrid'
}
```

2. **Grouped Items** (with `items` array):
```typescript
{
    title: 'Core',
    items: [
        { title: 'Companies', href: '/core/companies', icon: 'Building2' },
        { title: 'Roles', href: '/core/roles', icon: 'ShieldCheck' }
    ]
}
```

## How Flash Messages Work

### Backend - Setting Flash Messages

```php
// Success
return redirect()
    ->route('core.companies.index')
    ->with('success', 'Company created successfully.');

// Error
return redirect()
    ->back()
    ->with('error', 'An error occurred.');

// Info
return redirect()
    ->back()
    ->with('info', 'Information message.');
```

### Frontend - Displaying Flash Messages

The `FlashMessages` component:
1. Reads `flash` prop from Inertia page props
2. Displays appropriate styled alerts
3. Auto-dismisses success/info after 5 seconds
4. Allows manual dismiss with X button

## Adding New Modules to Navigation

### Step 1: Add Module Navigation in Backend

Edit `app/Http/Middleware/HandleInertiaRequests.php`:

```php
protected function getNavigationItems($user): array
{
    // ... existing code ...
    
    // CRM Module
    $crmItems = [];
    
    if ($user->canAccessModule('crm')) {
        if ($user->can('crm.leads.read')) {
            $crmItems[] = [
                'title' => 'Leads',
                'href' => '/crm/leads',
                'icon' => 'Target',
            ];
        }
        
        if ($user->can('crm.contacts.read')) {
            $crmItems[] = [
                'title' => 'Contacts',
                'href' => '/crm/contacts',
                'icon' => 'Users',
            ];
        }
    }
    
    if (!empty($crmItems)) {
        $navigation[] = [
            'title' => 'CRM',
            'items' => $crmItems,
        ];
    }
    
    return $navigation;
}
```

### Step 2: Available Lucide Icons

Use any icon from [Lucide Icons](https://lucide.dev/icons/):
- `Building2` - Companies
- `ShieldCheck` - Roles
- `Network` - Hierarchy
- `Users` - Users
- `LayoutGrid` - Dashboard
- `Target` - Leads
- `FileText` - Documents
- `Package` - Products
- `TrendingUp` - Sales
- `Calendar` - Calendar
- `Mail` - Email
- `Settings` - Settings

Just use the PascalCase name (e.g., `'icon' => 'Building2'`)

## Testing

### Test Navigation

1. **As Super Admin**:
   - Should see: Dashboard, Companies, Roles, Role Hierarchy, Users

2. **As Company Admin**:
   - Should see: Dashboard, Roles, Role Hierarchy, Users
   - Should NOT see: Companies

3. **As Regular User** (with permissions):
   - Should see only items they have permission for

### Test Flash Messages

1. Create a company → Should see green success message
2. Try to create with errors → Should see red error message
3. Messages should auto-dismiss (success/info) or have X button (error)

## Troubleshooting

### Navigation not showing?
- Clear cache: `php artisan optimize:clear`
- Check user permissions: `dd(auth()->user()->getAllPermissions())`
- Verify module is activated for company

### Flash messages not showing?
- Check session is working
- Verify redirect is using `->with('success', 'message')`
- Check browser console for errors

### Icons not showing?
- Verify icon name is correct PascalCase
- Check Lucide Icons documentation
- Icon must exist in `lucide-react` package

## Next Steps

1. **Add more modules** - Follow the pattern in `getNavigationItems()`
2. **Add sub-menus** - Use nested `items` arrays
3. **Add badges** - Add `badge` property to show counts
4. **Add custom icons** - Import custom SVG components

## Example: Complete Module Navigation

```php
// Inventory Module Example
$inventoryItems = [];

if ($user->canAccessModule('inventory')) {
    if ($user->can('inventory.products.read')) {
        $inventoryItems[] = [
            'title' => 'Products',
            'href' => '/inventory/products',
            'icon' => 'Package',
        ];
    }
    
    if ($user->can('inventory.warehouses.read')) {
        $inventoryItems[] = [
            'title' => 'Warehouses',
            'href' => '/inventory/warehouses',
            'icon' => 'Warehouse',
        ];
    }
    
    if ($user->can('inventory.stock.read')) {
        $inventoryItems[] = [
            'title' => 'Stock Movements',
            'href' => '/inventory/stock',
            'icon' => 'TrendingUp',
        ];
    }
}

if (!empty($inventoryItems)) {
    $navigation[] = [
        'title' => 'Inventory',
        'items' => $inventoryItems,
    ];
}
```

## Benefits

✅ **Dynamic** - Menu updates based on permissions automatically
✅ **Secure** - Backend permission checks ensure data safety
✅ **Scalable** - Easy to add new modules
✅ **User-Friendly** - Only shows what users can access
✅ **Clean UI** - Grouped navigation with icons
✅ **Feedback** - Flash messages for all actions

